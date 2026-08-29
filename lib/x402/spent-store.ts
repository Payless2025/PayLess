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

let store: SpentStore = new MemorySpentStore();

/** Swap in a shared store. Call once at startup, before serving traffic. */
export function setSpentStore(next: SpentStore) {
  store = next;
}

export function getSpentStore(): SpentStore {
  return store;
}

/** True when the hash was already used; the payment must be rejected. */
export async function claimSettlement(
  txHash: string,
  record: Omit<SpentRecord, 'txHash'>
): Promise<{ ok: boolean; previous?: SpentRecord }> {
  const previous = await store.claim(txHash, record);
  return previous ? { ok: false, previous } : { ok: true };
}

/** Exposed for tests. */
export { MemorySpentStore };
