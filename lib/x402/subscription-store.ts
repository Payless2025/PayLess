/**
 * Where subscriptions and the period ledger actually live.
 *
 * The in-memory store in `subscriptions.ts` is correct for one long-lived
 * process and wrong everywhere we deploy. Two consequences, of very different
 * severity:
 *
 *   - Losing a `Subscription` costs an accurate start date. Annoying.
 *   - Losing the period ledger means a period can be claimed twice, and the
 *     payer is charged twice. Unacceptable.
 *
 * So the period ledger is claimed with `SET NX`, which Redis decides on the
 * server with no read-then-write gap for two instances to race through — the
 * same mechanism the spent-transaction ledger uses, for the same reason.
 */

import {
  MemorySubscriptionStore,
  periodKey,
  type CollectionRecord,
  type PeriodClaim,
  type Subscription,
  type SubscriptionStore,
} from './subscriptions';

/** A collected period must outlive any plausible retry. Periods never repeat. */
const PERIOD_TTL_SECONDS = 90 * 24 * 60 * 60;

export class UpstashSubscriptionStore implements SubscriptionStore {
  private url: string;
  private token: string;
  private prefix: string;

  constructor(options: { url: string; token: string; prefix?: string }) {
    if (!options?.url || !options?.token) {
      throw new Error('payless: Upstash subscription store needs both `url` and `token`.');
    }
    this.url = options.url.replace(/\/+$/, '');
    this.token = options.token;
    this.prefix = options.prefix ?? 'payless';
  }

  private async command(args: (string | number)[]): Promise<any> {
    const res = await fetch(this.url, {
      method: 'POST',
      headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' },
      body: JSON.stringify(args),
    });
    if (!res.ok) throw new Error(`payless: Upstash returned ${res.status} for ${args[0]}`);
    const body = (await res.json()) as { result?: unknown; error?: string };
    if (body.error) throw new Error(`payless: Upstash error — ${body.error}`);
    return body.result;
  }

  private subKey = (planId: string, payer: string) =>
    `${this.prefix}:sub:${planId}:${payer.toLowerCase()}`;
  private periodK = (planId: string, payer: string, period: number) =>
    `${this.prefix}:period:${periodKey(planId, payer, period)}`;
  private get indexKey() {
    return `${this.prefix}:sub:index`;
  }

  async get(planId: string, payer: string): Promise<Subscription | null> {
    const raw = await this.command(['GET', this.subKey(planId, payer)]);
    if (raw == null) return null;
    try {
      return JSON.parse(typeof raw === 'string' ? raw : String(raw)) as Subscription;
    } catch {
      return null;
    }
  }

  async put(sub: Subscription): Promise<void> {
    const key = this.subKey(sub.planId, sub.payer);
    await this.command(['SET', key, JSON.stringify(sub)]);
    // A set of keys, so `all()` does not have to SCAN the database.
    await this.command(['SADD', this.indexKey, key]);
  }

  private async readMany(keys: string[]): Promise<Subscription[]> {
    if (!keys.length) return [];
    const rows = (await this.command(['MGET', ...keys])) as (string | null)[];
    return rows
      .map((r) => {
        if (r == null) return null;
        try {
          return JSON.parse(r) as Subscription;
        } catch {
          return null;
        }
      })
      .filter((s): s is Subscription => s !== null);
  }

  async listByPayer(payer: string): Promise<Subscription[]> {
    const all = await this.all();
    return all.filter((s) => s.payer.toLowerCase() === payer.toLowerCase());
  }

  async all(): Promise<Subscription[]> {
    const keys = ((await this.command(['SMEMBERS', this.indexKey])) as string[]) || [];
    return this.readMany(keys);
  }

  /** Atomic. `SET NX` either claims the period or tells us somebody already has. */
  async claimPeriod(planId: string, payer: string, period: number): Promise<PeriodClaim> {
    const key = this.periodK(planId, payer, period);
    const pending: CollectionRecord = { status: 'pending', at: Date.now() };

    const set = await this.command([
      'SET', key, JSON.stringify(pending), 'NX', 'EX', PERIOD_TTL_SECONDS,
    ]);
    if (set === 'OK') return { won: true };

    const existing = await this.getPeriod(planId, payer, period);
    return {
      won: false,
      // The key vanished between SET and GET. Treat the period as taken rather
      // than sending a second transfer on a technicality.
      existing: existing ?? { status: 'pending', at: Date.now() },
    };
  }

  async recordPeriod(planId: string, payer: string, period: number, record: CollectionRecord) {
    await this.command([
      'SET', this.periodK(planId, payer, period), JSON.stringify(record), 'EX', PERIOD_TTL_SECONDS,
    ]);
  }

  async getPeriod(planId: string, payer: string, period: number): Promise<CollectionRecord | null> {
    const raw = await this.command(['GET', this.periodK(planId, payer, period)]);
    if (raw == null) return null;
    try {
      return JSON.parse(typeof raw === 'string' ? raw : String(raw)) as CollectionRecord;
    } catch {
      return null;
    }
  }

  async releasePeriod(planId: string, payer: string, period: number) {
    await this.command(['DEL', this.periodK(planId, payer, period)]);
  }

  async ping(): Promise<boolean> {
    return (await this.command(['PING'])) === 'PONG';
  }
}

// ---------------------------------------------------------------------------
// Resolution
//
// Built lazily in whichever process is asking, for the reason spelled out in
// spent-store.ts: `next start` forks a worker, so anything installed at startup
// lands in a different process from the one serving requests.
// ---------------------------------------------------------------------------

interface StoreGlobal {
  store: SubscriptionStore;
  shared: boolean;
}

const KEY = Symbol.for('payless.subscriptionStore');
const g = globalThis as unknown as Record<symbol, StoreGlobal | undefined>;

function build(): StoreGlobal {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (url && token) {
    try {
      return { store: new UpstashSubscriptionStore({ url, token }), shared: true };
    } catch (error) {
      console.error('[payless] Upstash subscription store could not be created:', error);
    }
  }
  return { store: new MemorySubscriptionStore(), shared: false };
}

function resolved(): StoreGlobal {
  if (!g[KEY]) g[KEY] = build();
  return g[KEY]!;
}

export function setSubscriptionStore(next: SubscriptionStore, isShared = true) {
  g[KEY] = { store: next, shared: isShared };
}

export function getSubscriptionStore(): SubscriptionStore {
  return resolved().store;
}

/** True when the period ledger survives a scale-out — i.e. when collecting is safe. */
export function isSubscriptionStoreShared(): boolean {
  return resolved().shared;
}
