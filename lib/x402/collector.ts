/**
 * Collecting a subscription period.
 *
 * Everything else in Payless verifies money that has already moved. This is the
 * one place that would move it: `transferFrom(payer, recipient, amount)` against
 * the allowance the payer granted.
 *
 * That requires a key that can pull from every subscriber — the most dangerous
 * thing this codebase could hold. So it is not held here. `setCollector()` takes
 * an implementation; without one, collection reports `unconfigured` and nothing
 * is charged. The intended shape is a separate worker process holding the key
 * (see `scripts/collect.mjs`), or a signer service such as KMS or Turnkey
 * behind the same interface.
 *
 * Three rules govern this file, in order of importance:
 *
 *   1. Never charge a period twice. The period is claimed atomically before any
 *      transaction is signed, and a claim is never given back once something
 *      might be in flight.
 *   2. Never re-send against an unknown outcome. If a previous attempt has a
 *      transaction hash, verify that hash on chain rather than sending again.
 *   3. Failing to collect is better than collecting wrongly. Access is granted
 *      on a verified allowance, so a refusal here becomes arrears for us, not
 *      downtime for a paying subscriber.
 */

import { amountInBaseUnits, type Plan, type Subscription } from './subscriptions';
import { getSubscriptionStore, isSubscriptionStoreShared } from './subscription-store';
import { chainClient, withRpcRetry } from '../chains/reader';

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
  /**
   * Called the instant a transaction is broadcast, before its receipt is known.
   *
   * This is not a progress notification — it is what makes a crash survivable.
   * A hash persisted here lets the next run check the chain instead of sending
   * a second transfer.
   */
  onBroadcast?: (txHash: string) => Promise<void>;
}

export interface CollectResult {
  status: 'collected' | 'failed' | 'unconfigured' | 'blocked' | 'in-flight';
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

/** Did this hash actually land? Asked of the chain, never assumed. */
async function receiptStatus(txHash: `0x${string}`): Promise<'success' | 'reverted' | 'unknown'> {
  try {
    const receipt = await withRpcRetry(() =>
      chainClient().getTransactionReceipt({ hash: txHash })
    );
    return receipt.status === 'success' ? 'success' : 'reverted';
  } catch {
    // Not mined yet, or the RPC is unhappy. Either way we do not know, and
    // "do not know" must never become "send another one".
    return 'unknown';
  }
}

/**
 * Pull one period, at most once, ever.
 *
 * Safe to call when no collector is configured — it reports that plainly
 * instead of pretending the money moved.
 */
export async function collectPeriod(params: {
  plan: Plan;
  sub: Subscription;
  recipient: `0x${string}`;
  period: number;
}): Promise<CollectResult> {
  const { plan, sub, recipient, period } = params;
  const store = getSubscriptionStore();

  // 1. Has this period already been dealt with? The ledger is the authority;
  //    `sub.collected` is only a mirror of it.
  const existing = await store.getPeriod(plan.id, sub.payer, period);

  if (existing?.status === 'collected') {
    sub.collected[period] = { txHash: existing.txHash, at: existing.at };
    return { status: 'collected', txHash: existing.txHash };
  }

  if (existing?.status === 'pending') {
    if (!existing.txHash) {
      // Another run holds the claim and has not broadcast yet.
      return { status: 'in-flight', error: 'Another collection attempt is already running for this period.' };
    }
    // A transfer was broadcast and we never learned the outcome. Settle it from
    // the chain rather than sending a second one.
    const status = await receiptStatus(existing.txHash as `0x${string}`);
    if (status === 'success') {
      const record = { status: 'collected' as const, txHash: existing.txHash, at: Date.now() };
      await store.recordPeriod(plan.id, sub.payer, period, record);
      sub.collected[period] = { txHash: existing.txHash, at: record.at };
      return { status: 'collected', txHash: existing.txHash };
    }
    if (status === 'reverted') {
      // A reverted transfer moved nothing, so the period is genuinely unpaid.
      // Release the claim so a later run can try again cleanly.
      await store.releasePeriod(plan.id, sub.payer, period);
      return { status: 'failed', txHash: existing.txHash, error: 'Previous transfer reverted; period released for retry.' };
    }
    return { status: 'in-flight', txHash: existing.txHash, error: 'A transfer is broadcast but not yet mined.' };
  }

  if (existing?.status === 'failed') {
    return { status: 'failed', txHash: existing.txHash, error: existing.error };
  }

  // 2. Nothing to collect with. Claim nothing — a claim taken now would make
  //    every period look attempted to a collector configured later.
  if (!collector) {
    return {
      status: 'unconfigured',
      error:
        'No collector configured. Subscriptions are tracked and access is granted on a verified allowance, but no funds are pulled until setCollector() is wired to a signer.',
    };
  }

  // 3. Refuse to move money when the ledger cannot promise this happens once.
  //    On an in-memory store every instance has its own idea of what has been
  //    collected, which is exactly how a payer gets charged per instance.
  if (!isSubscriptionStoreShared()) {
    return {
      status: 'blocked',
      error:
        'The period ledger is in-memory, so a second instance could collect this period again. Configure UPSTASH_REDIS_REST_URL/TOKEN before charging anyone.',
    };
  }

  // 4. Claim the period. Whoever wins this may send exactly one transfer.
  const claim = await store.claimPeriod(plan.id, sub.payer, period);
  if (!claim.won) {
    const other = claim.existing;
    if (other?.status === 'collected') {
      sub.collected[period] = { txHash: other.txHash, at: other.at };
      return { status: 'collected', txHash: other.txHash };
    }
    return { status: 'in-flight', txHash: other?.txHash, error: 'Another collection attempt holds this period.' };
  }

  let broadcast: string | undefined;
  try {
    const result = await collector.collect({
      plan,
      payer: sub.payer,
      recipient,
      value: amountInBaseUnits(plan),
      period,
      onBroadcast: async (txHash) => {
        broadcast = txHash;
        // Persisted before the receipt is awaited, so a crash here is
        // recoverable by rule 2 instead of causing a double charge.
        await store.recordPeriod(plan.id, sub.payer, period, {
          status: 'pending',
          txHash,
          at: Date.now(),
        });
      },
    });

    if (result.status === 'collected') {
      const at = Date.now();
      await store.recordPeriod(plan.id, sub.payer, period, {
        status: 'collected',
        txHash: result.txHash,
        at,
      });
      sub.collected[period] = { txHash: result.txHash, at };
      return result;
    }

    if (broadcast || result.txHash) {
      // Something went out. Keep the claim and leave it pending: the next run
      // resolves it from the chain. Releasing here is how double charges happen.
      await store.recordPeriod(plan.id, sub.payer, period, {
        status: 'pending',
        txHash: result.txHash || broadcast,
        at: Date.now(),
      });
      return { status: 'in-flight', txHash: result.txHash || broadcast, error: result.error };
    }

    // Nothing was broadcast, so nothing can be in flight — safe to hand back.
    await store.releasePeriod(plan.id, sub.payer, period);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Collection failed';

    if (broadcast) {
      await store.recordPeriod(plan.id, sub.payer, period, {
        status: 'pending',
        txHash: broadcast,
        at: Date.now(),
      });
      return { status: 'in-flight', txHash: broadcast, error: message };
    }

    await store.releasePeriod(plan.id, sub.payer, period);
    return { status: 'failed', error: message };
  }
}
