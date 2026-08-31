/**
 * Recurring payments over x402.
 *
 * One request, one payment is the easy half. The hard half is a caller
 * committing to pay again tomorrow when there is no card on file and no account
 * to cancel.
 *
 * The commitment is an ERC-20 allowance. The payer approves this server as a
 * spender for `amount x periods`; we may collect at most `amount` once per
 * period, and never more than the allowance. Cancelling is `approve(0)` from
 * their own wallet — unilateral, immediate, and not something we can block.
 *
 * What this module owns: the plan terms, which period we are in, and which
 * periods have been collected. What it deliberately does not own: the payer's
 * money. Nothing here can move funds; collection is a separate, explicit step
 * (see `collector.ts`) that needs a signer.
 */

import { parseUnits } from 'viem';

export interface Plan {
  /** Stable id used in the 402 challenge and by the caller when subscribing */
  id: string;
  /** Human description of what the subscription buys */
  description: string;
  /** Whole tokens charged per period, e.g. "1.00" */
  amount: string;
  /** Length of a billing period in seconds */
  periodSeconds: number;
  /** ERC-20 the plan is billed in */
  token: `0x${string}`;
  decimals: number;
  symbol: string;
  /** Endpoints this plan grants access to */
  endpoints: string[];
}

export interface Subscription {
  planId: string;
  /** The wallet that approved us */
  payer: `0x${string}`;
  /** Unix ms when the subscription started — period boundaries derive from this */
  startedAt: number;
  /** Periods already collected, keyed by period index */
  collected: Record<number, { txHash?: string; at: number }>;
  /** Set when the payer walked away or the allowance ran dry */
  endedAt?: number;
  endedReason?: string;
}

export const PERIOD = {
  hour: 3600,
  day: 86_400,
  week: 604_800,
  month: 2_592_000, // 30 days — stated plainly rather than pretending calendars are simple
} as const;

/** Which period index `at` falls into, counting from the subscription start. */
export function periodIndex(sub: Subscription, plan: Plan, at: number = Date.now()): number {
  if (at < sub.startedAt) return -1;
  return Math.floor((at - sub.startedAt) / (plan.periodSeconds * 1000));
}

export function periodWindow(sub: Subscription, plan: Plan, index: number) {
  const start = sub.startedAt + index * plan.periodSeconds * 1000;
  return { start, end: start + plan.periodSeconds * 1000 };
}

export function amountInBaseUnits(plan: Plan): bigint {
  return parseUnits(plan.amount as `${number}`, plan.decimals);
}

export type AccessDecision =
  | { allowed: true; period: number; alreadyCollected: boolean }
  | { allowed: false; reason: string; code: 'ended' | 'not-started' | 'no-allowance' | 'insufficient' };

/**
 * Decide whether a subscriber may be served right now.
 *
 * `collectableRaw` is what the chain says we could actually take (the lesser of
 * allowance and balance). If it cannot cover this period, access stops — the
 * payer let the commitment lapse, which is exactly how they cancel.
 */
export function decideAccess(params: {
  sub: Subscription;
  plan: Plan;
  collectableRaw: string;
  at?: number;
}): AccessDecision {
  const { sub, plan, at = Date.now() } = params;

  if (sub.endedAt) {
    return { allowed: false, reason: sub.endedReason || 'Subscription ended', code: 'ended' };
  }

  const period = periodIndex(sub, plan, at);
  if (period < 0) {
    return { allowed: false, reason: 'Subscription has not started yet', code: 'not-started' };
  }

  const alreadyCollected = Boolean(sub.collected[period]);
  if (alreadyCollected) {
    return { allowed: true, period, alreadyCollected: true };
  }

  const needed = amountInBaseUnits(plan);
  const collectable = BigInt(params.collectableRaw);

  if (collectable === BigInt(0)) {
    return {
      allowed: false,
      code: 'no-allowance',
      reason: `No collectable ${plan.symbol}. Approve this server as a spender to resume, or leave it at zero to stay cancelled.`,
    };
  }
  if (collectable < needed) {
    return {
      allowed: false,
      code: 'insufficient',
      reason: `Approved balance covers ${collectable} of the ${needed} base units this period needs.`,
    };
  }

  return { allowed: true, period, alreadyCollected: false };
}

/** How many further periods the current approval can still cover. */
export function periodsRemaining(plan: Plan, collectableRaw: string): number {
  const needed = amountInBaseUnits(plan);
  if (needed === BigInt(0)) return 0;
  return Number(BigInt(collectableRaw) / needed);
}

// ---------------------------------------------------------------------------
// Storage
//
// In-memory, like the spent-transaction ledger, and with the same caveat: each
// serverless instance keeps its own copy. Swap it before charging real money.
// ---------------------------------------------------------------------------

export interface SubscriptionStore {
  get(planId: string, payer: string): Promise<Subscription | null>;
  put(sub: Subscription): Promise<void>;
  listByPayer(payer: string): Promise<Subscription[]>;
  all(): Promise<Subscription[]>;
}

class MemorySubscriptionStore implements SubscriptionStore {
  private subs = new Map<string, Subscription>();
  private key = (planId: string, payer: string) => `${planId}:${payer.toLowerCase()}`;

  async get(planId: string, payer: string) {
    return this.subs.get(this.key(planId, payer)) ?? null;
  }
  async put(sub: Subscription) {
    this.subs.set(this.key(sub.planId, sub.payer), sub);
  }
  async listByPayer(payer: string) {
    return Array.from(this.subs.values()).filter(
      (s) => s.payer.toLowerCase() === payer.toLowerCase()
    );
  }
  async all() {
    return Array.from(this.subs.values());
  }
}

let store: SubscriptionStore = new MemorySubscriptionStore();

export function setSubscriptionStore(next: SubscriptionStore) {
  store = next;
}
export function getSubscriptionStore() {
  return store;
}

export { MemorySubscriptionStore };
