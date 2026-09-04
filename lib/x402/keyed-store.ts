/**
 * One store for everything that has to outlive a single request.
 *
 * Payment links, webhooks, streams and their delivery logs all lived in
 * `new Map()`. That is correct for one long-lived server and wrong here: on
 * serverless each instance keeps its own map, so a link created by one
 * instance is "not found" on the next, and a webhook registered on Monday
 * vanishes when the instance recycles. The replay ledger and the subscription
 * store were fixed for exactly this reason; these were the ones left behind.
 *
 * A Redis hash per collection maps onto Map semantics almost exactly: HSET is
 * put, HGET is get, HGETALL is entries, HDEL is delete. So one small class
 * covers every remaining case rather than five bespoke ones, and there is a
 * single place where the serialisation can be wrong.
 *
 * Note what this deliberately is NOT: it is not the replay ledger. Nothing here
 * is atomic, because nothing here needs to be. Losing a webhook registration
 * costs a redelivery; losing a spent-transaction claim costs money, which is
 * why that one has its own SET NX store and always will.
 */

export interface KeyedStore<T> {
  get(id: string): Promise<T | null>;
  put(id: string, value: T): Promise<void>;
  delete(id: string): Promise<boolean>;
  all(): Promise<T[]>;
  entries(): Promise<Array<[string, T]>>;
}

class MemoryKeyedStore<T> implements KeyedStore<T> {
  private map = new Map<string, T>();
  async get(id: string) {
    return this.map.get(id) ?? null;
  }
  async put(id: string, value: T) {
    this.map.set(id, value);
  }
  async delete(id: string) {
    return this.map.delete(id);
  }
  async all() {
    return Array.from(this.map.values());
  }
  async entries() {
    return Array.from(this.map.entries());
  }
}

class UpstashKeyedStore<T> implements KeyedStore<T> {
  constructor(
    private url: string,
    private token: string,
    private key: string
  ) {
    this.url = url.replace(/\/+$/, '');
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

  private parse(raw: unknown): T | null {
    if (raw == null) return null;
    try {
      return JSON.parse(typeof raw === 'string' ? raw : String(raw)) as T;
    } catch {
      return null;
    }
  }

  async get(id: string) {
    return this.parse(await this.command(['HGET', this.key, id]));
  }

  async put(id: string, value: T) {
    await this.command(['HSET', this.key, id, JSON.stringify(value)]);
  }

  async delete(id: string) {
    return (await this.command(['HDEL', this.key, id])) === 1;
  }

  async entries(): Promise<Array<[string, T]>> {
    // HGETALL comes back as a flat [field, value, field, value, ...] array.
    const flat = ((await this.command(['HGETALL', this.key])) as string[]) || [];
    const out: Array<[string, T]> = [];
    for (let i = 0; i + 1 < flat.length; i += 2) {
      const parsed = this.parse(flat[i + 1]);
      if (parsed !== null) out.push([flat[i], parsed]);
    }
    return out;
  }

  async all() {
    return (await this.entries()).map(([, v]) => v);
  }
}

/**
 * Built lazily in whichever process asks, and cached on globalThis.
 *
 * Both parts matter and both were learned the hard way: Next.js compiles
 * instrumentation into its own bundle so a module singleton exists twice, and
 * `next start` forks a worker so anything installed at startup lands in the
 * wrong process. A global key built on first use survives both.
 */
interface Entry {
  store: KeyedStore<any>;
  shared: boolean;
}
const REGISTRY = Symbol.for('payless.keyedStores');
const g = globalThis as unknown as Record<symbol, Map<string, Entry> | undefined>;

function registry(): Map<string, Entry> {
  if (!g[REGISTRY]) g[REGISTRY] = new Map();
  return g[REGISTRY]!;
}

export function keyedStore<T>(collection: string): KeyedStore<T> {
  const reg = registry();
  const found = reg.get(collection);
  if (found) return found.store as KeyedStore<T>;

  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  let entry: Entry;
  if (url && token) {
    try {
      entry = { store: new UpstashKeyedStore<T>(url, token, `payless:${collection}`), shared: true };
    } catch (error) {
      console.error(`[payless] Upstash store for ${collection} could not be created:`, error);
      entry = { store: new MemoryKeyedStore<T>(), shared: false };
    }
  } else {
    entry = { store: new MemoryKeyedStore<T>(), shared: false };
  }

  reg.set(collection, entry);
  return entry.store as KeyedStore<T>;
}

/** True when this collection survives a scale-out. Reported, not assumed. */
export function isKeyedStoreShared(collection: string): boolean {
  keyedStore(collection);
  return registry().get(collection)?.shared ?? false;
}

/** Swap a store in, for tests. */
export function setKeyedStore<T>(collection: string, store: KeyedStore<T>, shared = true) {
  registry().set(collection, { store, shared });
}

export { MemoryKeyedStore };
