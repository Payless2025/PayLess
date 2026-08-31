/**
 * Collecting a subscription period.
 *
 * Everything else in Payless verifies money that has already moved. This is the
 * one place that would move it: `transferFrom(payer, recipient, amount)` against
 * the allowance the payer granted.
 *
 * That requires a key that can sign transactions, and a key that can pull from
 * every subscriber is the most dangerous thing this codebase could hold. So it
 * is not held here. `setCollector()` takes an implementation; without one,
 * collection reports `unconfigured` and nothing is charged.
 *
 * Two deployment shapes make sense:
 *
 *   1. A separate worker with its own key, outside the web process, running the
 *      schedule. The web app then only ever reads.
 *   2. A signer service (KMS, Turnkey, Privy) that holds the key and exposes
 *      signing behind its own authorisation.
 *
 * Whichever you pick, note that access is granted on a *verified allowance*, not
 * on a completed collection — so a brief collector outage degrades to billing
 * arrears, not to a denial of service for paying subscribers.
 */

import { amountInBaseUnits, type Plan, type Subscription } from './subscriptions';

export const ERC20_TRANSFER_FROM_ABI = [
  {
    name: 'transferFrom',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

export interface CollectRequest {
  plan: Plan;
  payer: `0x${string}`;
  recipient: `0x${string}`;
  /** Base units to pull for this period */
  value: bigint;
  period: number;
}

export interface CollectResult {
  status: 'collected' | 'failed' | 'unconfigured';
  txHash?: string;
  error?: string;
}

export interface Collector {
  collect(req: CollectRequest): Promise<CollectResult>;
}

let collector: Collector | null = null;

export function setCollector(next: Collector | null) {
  collector = next;
}

export function hasCollector() {
  return collector !== null;
}

/**
 * Pull one period. Safe to call when no collector is configured — it reports
 * that plainly instead of pretending the money moved.
 */
export async function collectPeriod(params: {
  plan: Plan;
  sub: Subscription;
  recipient: `0x${string}`;
  period: number;
}): Promise<CollectResult> {
  const { plan, sub, recipient, period } = params;

  if (sub.collected[period]) {
    return { status: 'collected', txHash: sub.collected[period].txHash };
  }

  if (!collector) {
    return {
      status: 'unconfigured',
      error:
        'No collector configured. Subscriptions are tracked and access is granted on a verified allowance, but no funds are pulled until setCollector() is wired to a signer.',
    };
  }

  try {
    const result = await collector.collect({
      plan,
      payer: sub.payer,
      recipient,
      value: amountInBaseUnits(plan),
      period,
    });

    if (result.status === 'collected') {
      sub.collected[period] = { txHash: result.txHash, at: Date.now() };
    }
    return result;
  } catch (error) {
    return {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Collection failed',
    };
  }
}
