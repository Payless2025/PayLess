import { NextRequest, NextResponse } from 'next/server';
import { isAddress, getAddress } from 'viem';
import { PLANS } from '@/lib/x402/plans';
import {
  getSubscriptionStore,
  periodIndex,
  periodWindow,
  periodsRemaining,
} from '@/lib/x402/subscriptions';
import { hasCollector } from '@/lib/x402/collector';
import { readAllowance } from '@/lib/chains/allowance';
import { PAYMENT_CONFIG } from '@/lib/x402/config';
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
      spender: PAYMENT_CONFIG.walletAddress,
      collector: hasCollector() ? 'configured' : 'unconfigured',
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
        `approve(${PAYMENT_CONFIG.walletAddress}, amount) on the plan token, then send ` +
        `X-Subscription: {"planId":"…","payer":"0x…"}. Revoke with approve(spender, 0) — ` +
        'the approval is yours, so cancelling needs nobody’s permission.',
    });
  }

  if (!isAddress(payerParam)) {
    return NextResponse.json({ success: false, error: '"payer" must be a valid address' }, { status: 400 });
  }

  const payer = getAddress(payerParam);
  const spender = PAYMENT_CONFIG.walletAddress;
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
    subscriptions: rows,
    source: 'Robinhood Chain RPC (live allowance read)',
    retrievedAt: new Date().toISOString(),
  });
}
