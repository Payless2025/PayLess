import { NextRequest, NextResponse } from 'next/server';
import { isAddress, getAddress } from 'viem';
import { PLANS } from '@/lib/x402/plans';
import {
  periodIndex,
  periodWindow,
  periodsRemaining,
} from '@/lib/x402/subscriptions';
import { getSubscriptionStore, isSubscriptionStoreShared } from '@/lib/x402/subscription-store';
import { hasCollector } from '@/lib/x402/collector';
import { readAllowance } from '@/lib/chains/allowance';
import { PAYMENT_CONFIG, subscriptionSpender, subscriptionRecipient } from '@/lib/x402/config';
import { ROBINHOOD_CHAIN_ID } from '@/lib/chains/config';

/**
 * A subscriber's own standing, read from the chain. Free: asking what you owe
 * should never itself cost money, and it is the page a caller checks before
 * deciding whether to revoke.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const payerParam = searchParams.get('payer');

  if (!payerParam) {
    return NextResponse.json({
      success: true,
      chainId: ROBINHOOD_CHAIN_ID,
      spender: subscriptionSpender(),
      recipient: subscriptionRecipient(),
      collector: hasCollector() ? 'configured' : 'unconfigured',
      // Whether a period can be charged twice is a fact a subscriber is
      // entitled to, so it is reported rather than left to be discovered.
      periodLedger: isSubscriptionStoreShared() ? 'shared' : 'in-memory',
      collectionSafety: isSubscriptionStoreShared()
        ? 'Each billing period is claimed atomically before any transfer is signed.'
        : 'No shared ledger configured, so collection is refused entirely rather than risking a double charge.',
      plans: PLANS.map((p) => ({
        id: p.id,
        description: p.description,
        amount: p.amount,
        currency: p.symbol,
        periodSeconds: p.periodSeconds,
        token: p.token,
        endpoints: p.endpoints,
      })),
      howTo:
        `approve(${subscriptionSpender()}, amount) on the plan token, then send ` +
        `X-Subscription: {"planId":"…","payer":"0x…"}. Revoke with approve(spender, 0) — ` +
        'the approval is yours, so cancelling needs nobody’s permission.',
    });
  }

  if (!isAddress(payerParam)) {
    return NextResponse.json({ success: false, error: '"payer" must be a valid address' }, { status: 400 });
  }

  const payer = getAddress(payerParam);
  const spender = subscriptionSpender();
  const store = getSubscriptionStore();
  const now = Date.now();

  const rows = await Promise.all(
    PLANS.map(async (plan) => {
      let allowance = null;
      try {
        if (isAddress(spender)) {
          allowance = await readAllowance({ token: plan.token, owner: payer, spender: getAddress(spender) });
        }
      } catch {
        // Reported as null rather than failing the whole response
      }

      const sub = await store.get(plan.id, payer);
      const index = sub ? periodIndex(sub, plan, now) : null;

      return {
        planId: plan.id,
        amount: plan.amount,
        currency: plan.symbol,
        periodSeconds: plan.periodSeconds,
        subscribed: Boolean(sub),
        startedAt: sub ? new Date(sub.startedAt).toISOString() : null,
        currentPeriod: index,
        periodEnds:
          sub && index !== null && index >= 0
            ? new Date(periodWindow(sub, plan, index).end).toISOString()
            : null,
        collectedPeriods: sub ? Object.keys(sub.collected).length : 0,
        ended: sub?.endedAt ? new Date(sub.endedAt).toISOString() : null,
        allowance: allowance
          ? {
              approved: allowance.allowance,
              balance: allowance.balance,
              collectable: allowance.collectable,
              periodsRemaining: periodsRemaining(plan, allowance.collectableRaw),
            }
          : null,
      };
    })
  );

  return NextResponse.json({
    success: true,
    chainId: ROBINHOOD_CHAIN_ID,
    payer,
    spender,
    collector: hasCollector() ? 'configured' : 'unconfigured',
    periodLedger: isSubscriptionStoreShared() ? 'shared' : 'in-memory',
    subscriptions: rows,
    source: 'Robinhood Chain RPC (live allowance read)',
    retrievedAt: new Date().toISOString(),
  });
}
