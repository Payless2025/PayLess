/**
 * Replay protection.
 *
 * Settlement verification answers "did this transaction pay me?". It cannot
 * answer "have I already served a response for it?" — a receipt stays valid on
 * chain forever, so without a ledger one payment buys unlimited requests.
 *
 * The default store is in-memory: correct for one long-lived server, wrong the
 * moment a serverless deployment scales out, because each instance keeps its
 * own map. Pass your own `store` (Redis, KV, Postgres — anything atomic) before
 * taking real volume.
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
   * Returns the existing record if already spent, or null on success.
   * Implementations MUST be atomic (e.g. Redis `SET NX`) or the check is racy.
   */
  claim(txHash: string, record: Omit<SpentRecord, 'txHash'>): Promise<SpentRecord | null>;
  get(txHash: string): Promise<SpentRecord | null>;
}

const RETENTION_MS = 24 * 60 * 60 * 1000;

export class MemorySpentStore implements SpentStore {
  private spent = new Map<string, SpentRecord>();

  private prune() {
    const cutoff = Date.now() - RETENTION_MS;
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
    this.spent.set(key, { txHash: key, ...record });
    return null;
  }

  async get(txHash: string) {
    return this.spent.get(txHash.toLowerCase()) ?? null;
  }
}
