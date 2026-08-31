/**
 * Replay protection.
 *
 * Settlement verification answers "did this transaction pay me?". It cannot
 * answer "have I already served a response for it?" — a receipt stays valid on
 * chain forever, so without a ledger one payment buys unlimited requests.
 *
 * The transaction hash is the natural key: unique, already on chain, and no
 * client-generated nonce to trust.
 *
 * IMPORTANT — the default store is in-memory. That is correct for a single
 * long-lived server and for local development, but on serverless every instance
 * gets its own Map, so a payment could be spent once per warm instance. Before
 * taking real money on Vercel, call `setSpentStore()` at startup with a shared
 * backend (Vercel KV, Upstash Redis, Postgres — anything atomic).
 */

import { UpstashSpentStore } from 'payless';

export interface SpentRecord {
  txHash: string;
  endpoint: string;
  amount: string;
  spentAt: number;
}

export interface SpentStore {
  /**
   * Atomically claim a transaction hash.
   * Returns the existing record if it was already spent, or null on success.
   * Implementations MUST be atomic (e.g. Redis SET NX) or the check is racy.
   */
  claim(txHash: string, record: Omit<SpentRecord, 'txHash'>): Promise<SpentRecord | null>;
  get(txHash: string): Promise<SpentRecord | null>;
  size?(): Promise<number>;
}

/** Entries older than this are dropped — a settlement that old is rejected anyway. */
const RETENTION_MS = 24 * 60 * 60 * 1000;

class MemorySpentStore implements SpentStore {
  private spent = new Map<string, SpentRecord>();

  private prune() {
    const cutoff = Date.now() - RETENTION_MS;
    // Map preserves insertion order, so stop at the first entry still in window
    for (const [hash, record] of Array.from(this.spent.entries())) {
      if (record.spentAt >= cutoff) break;
      this.spent.delete(hash);
    }
  }

  async claim(txHash: string, record: Omit<SpentRecord, 'txHash'>) {
    const key = txHash.toLowerCase();
    this.prune();

    const existing = this.spent.get(key);
    if (existing) return existing;

    // Single-threaded event loop: nothing interleaves between get and set here,
    // so this is atomic within one instance.
    this.spent.set(key, { txHash: key, ...record });
    return null;
  }

  async get(txHash: string) {
    return this.spent.get(txHash.toLowerCase()) ?? null;
  }

  async size() {
    return this.spent.size;
  }
}

/**
 * The ledger lives on globalThis, not in module scope.
 *
 * Next.js compiles instrumentation.ts into its own bundle, so a module-level
 * singleton exists twice: once where startup installs it and once where request
 * handlers read it. Installing the shared store then had no effect on real
 * traffic while still logging success — the worst kind of failure, because it
 * looked fixed.
 *
 * A global key is shared across bundles in the same process, so both halves see
 * the same object.
 */
interface LedgerGlobal {
  store: SpentStore;
  shared: boolean;
}

const KEY = Symbol.for('payless.spentLedger');
const g = globalThis as unknown as Record<symbol, LedgerGlobal | undefined>;

/**
 * Build the ledger from the environment, in whichever process is asking.
 *
 * Installing it from instrumentation.ts does not work: `next start` forks a
 * worker for requests, so startup ran in pid A while every request ran in pid
 * B. Neither module scope nor globalThis crosses that boundary — and the log
 * still said "installed", which made it look solved when it was not.
 *
 * Building lazily on first use puts the shared store in the process that
 * actually needs it, with no startup hook required.
 */
function build(): LedgerGlobal {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (url && token) {
    try {
      return { store: new UpstashSpentStore({ url, token }) as unknown as SpentStore, shared: true };
    } catch (error) {
      console.error('[payless] Upstash store could not be created:', error);
    }
  }
  return { store: new MemorySpentStore(), shared: false };
}

function ledger(): LedgerGlobal {
  if (!g[KEY]) g[KEY] = build();
  return g[KEY]!;
}

/** Swap in a shared store explicitly. Overrides whatever the environment gave. */
export function setSpentStore(next: SpentStore, isShared = true) {
  g[KEY] = { store: next, shared: isShared };
}

/** True when replay protection survives a scale-out. */
export function isSpentStoreShared() {
  return ledger().shared;
}

export function getSpentStore(): SpentStore {
  return ledger().store;
}

/** True when the hash was already used; the payment must be rejected. */
export async function claimSettlement(
  txHash: string,
  record: Omit<SpentRecord, 'txHash'>
): Promise<{ ok: boolean; previous?: SpentRecord; error?: string }> {
  try {
    const previous = await getSpentStore().claim(txHash, record);
    return previous ? { ok: false, previous } : { ok: true };
  } catch (error) {
    // Fail closed. If the ledger is unreachable we cannot tell a first use from
    // a replay, and serving anyway would hand out free responses to whoever
    // noticed. Refusing is the smaller harm.
    console.error('[payless] Spent ledger unavailable:', error);
    return {
      ok: false,
      error: 'Payment ledger is temporarily unavailable, so this payment cannot be checked for reuse. Nothing was consumed — retry shortly.',
    };
  }
}

/** Exposed for tests. */
export { MemorySpentStore };
