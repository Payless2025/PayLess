/**
 * Subscription access for x402 endpoints.
 *
 * A caller presents `X-Subscription: {"planId":"…","payer":"0x…"}`. We read the
 * allowance they granted straight off Robinhood Chain and decide from that —
 * their approval is the source of truth, not a row in our database. If they
 * revoked it, the next request stops working, with no cancellation flow to
 * navigate and nobody to ask.
 */

import { NextRequest, NextResponse } from 'next/server';
import { PAYMENT_CONFIG } from './config';
import { getPlan, plansForEndpoint } from './plans';
import {
  decideAccess,
  getSubscriptionStore,
  periodsRemaining,
  periodWindow,
  type Plan,
  type Subscription,
} from './subscriptions';
import { collectPeriod, hasCollector } from './collector';
import { readAllowance } from '../chains/allowance';
import { ROBINHOOD_CHAIN_ID } from '../chains/config';
import { isAddress, getAddress } from 'viem';

export interface SubscriptionOffer {
  planId: string;
  description: string;
  amount: string;
  currency: string;
  periodSeconds: number;
  token: string;
  /** The address to approve as spender */
  spender: string;
  chainId: string;
  /** Exactly what the caller has to do */
  howTo: string;
}

export function offersFor(pathname: string): SubscriptionOffer[] {
  return plansForEndpoint(pathname).map((plan) => ({
    planId: plan.id,
    description: plan.description,
    amount: plan.amount,
    currency: plan.symbol,
    periodSeconds: plan.periodSeconds,
    token: plan.token,
    spender: PAYMENT_CONFIG.walletAddress,
    chainId: ROBINHOOD_CHAIN_ID,
    howTo: `approve(${PAYMENT_CONFIG.walletAddress}, amount) on ${plan.token}, then send X-Subscription: {"planId":"${plan.id}","payer":"<your address>"}. Cancel any time with approve(spender, 0).`,
  }));
}

export interface SubscriptionCheck {
  ok: boolean;
  status?: number;
  body?: Record<string, unknown>;
  plan?: Plan;
  sub?: Subscription;
  period?: number;
}

/**
 * Resolve an `X-Subscription` header into an access decision. Returns ok:false
 * with a ready-made response body when the caller cannot be served.
 */
export async function checkSubscription(
  header: string | null,
  pathname: string
): Promise<SubscriptionCheck> {
  if (!header) return { ok: false };

  let parsed: { planId?: string; payer?: string };
  try {
    parsed = JSON.parse(header);
  } catch {
    return {
      ok: false,
      status: 400,
      body: { error: 'X-Subscription must be JSON: {"planId":"…","payer":"0x…"}' },
    };
  }

  const plan = parsed.planId ? getPlan(parsed.planId) : undefined;
  if (!plan) {
    return { ok: false, status: 400, body: { error: `Unknown planId "${parsed.planId}"` } };
  }
  if (!plan.endpoints.includes(pathname)) {
    return {
      ok: false,
      status: 403,
      body: { error: `Plan "${plan.id}" does not cover ${pathname}` },
    };
  }
  if (!parsed.payer || !isAddress(parsed.payer)) {
    return { ok: false, status: 400, body: { error: '"payer" must be a valid address' } };
  }

  const payer = getAddress(parsed.payer);
  const spender = PAYMENT_CONFIG.walletAddress;
  if (!isAddress(spender)) {
    return {
      ok: false,
      status: 500,
      body: { error: 'Server has no valid recipient address configured' },
    };
  }

  // The chain, not our database, decides whether the commitment still stands.
  let reading;
  try {
    reading = await readAllowance({
      token: plan.token,
      owner: payer,
      spender: getAddress(spender),
    });
  } catch (error) {
    console.error('[subscription] allowance read failed:', error);
    return {
      ok: false,
      status: 502,
      body: { error: 'Could not read the allowance from Robinhood Chain' },
    };
  }

  const store = getSubscriptionStore();
  let sub = await store.get(plan.id, payer);

  // First sight of a payer who has already approved us starts the subscription.
  if (!sub) {
    if (BigInt(reading.collectableRaw) === BigInt(0)) {
      return {
        ok: false,
        status: 402,
        body: {
          error: 'No subscription and no allowance.',
          subscribe: offersFor(pathname),
        },
      };
    }
    sub = { planId: plan.id, payer, startedAt: Date.now(), collected: {} };
    await store.put(sub);
  }

  const decision = decideAccess({ sub, plan, collectableRaw: reading.collectableRaw });

  if (!decision.allowed) {
    return {
      ok: false,
      status: 402,
      body: {
        error: decision.reason,
        code: decision.code,
        allowance: {
          approved: reading.allowance,
          balance: reading.balance,
          collectable: reading.collectable,
          symbol: plan.symbol,
        },
        subscribe: offersFor(pathname),
      },
    };
  }

  // Access is granted on the verified allowance. Collection is separate, so a
  // collector outage becomes arrears rather than downtime for a paying caller.
  if (!decision.alreadyCollected) {
    const result = await collectPeriod({
      plan,
      sub,
      recipient: getAddress(spender),
      period: decision.period,
    });
    if (result.status === 'collected') {
      await store.put(sub);
    }
  }

  return { ok: true, plan, sub, period: decision.period };
}

/** Headers describing the subscription state, for the caller's own accounting. */
export function subscriptionHeaders(check: SubscriptionCheck, collectableRaw?: string) {
  const headers: Record<string, string> = {};
  if (!check.ok || !check.plan || check.period === undefined) return headers;

  const { plan, sub, period } = check;
  headers['x-subscription-plan'] = plan.id;
  headers['x-subscription-period'] = String(period);
  headers['x-subscription-collected'] = sub?.collected[period] ? 'yes' : 'pending';
  if (sub) {
    headers['x-subscription-period-ends'] = new Date(
      periodWindow(sub, plan, period).end
    ).toISOString();
  }
  if (collectableRaw) {
    headers['x-subscription-periods-remaining'] = String(periodsRemaining(plan, collectableRaw));
  }
  if (!hasCollector()) headers['x-subscription-collector'] = 'unconfigured';
  return headers;
}
