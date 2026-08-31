/**
 * A shared replay ledger backed by Upstash Redis.
 *
 * The in-memory store is correct on one long-lived server and wrong on
 * serverless: every instance keeps its own map, so a single payment can be
 * spent once per warm instance. This closes that.
 *
 * `SET key value NX EX ttl` is atomic in Redis — either we claimed the hash or
 * somebody else already did, decided by the server, with no read-then-write gap
 * for two instances to race through.
 *
 * No dependency: Upstash's REST API is plain HTTP, which also means this works
 * unchanged on edge runtimes where a TCP Redis client will not.
 */

import type { SpentRecord, SpentStore } from '../store.js';

export interface UpstashOptions {
  /** UPSTASH_REDIS_REST_URL */
  url: string;
  /** UPSTASH_REDIS_REST_TOKEN */
  token: string;
  /** Key prefix, so one database can hold several environments */
  prefix?: string;
  /**
   * How long a claim is remembered. Must comfortably exceed the settlement
   * freshness window, or an expired claim would let an old receipt be spent
   * again. Defaults to 24h against a 30m window.
   */
  ttlSeconds?: number;
}

export class UpstashSpentStore implements SpentStore {
  private url: string;
  private token: string;
  private prefix: string;
  private ttl: number;

  constructor(options: UpstashOptions) {
    if (!options?.url || !options?.token) {
      throw new Error('payless: Upstash store needs both `url` and `token`.');
    }
    this.url = options.url.replace(/\/+$/, '');
    this.token = options.token;
    this.prefix = options.prefix ?? 'payless:spent';
    this.ttl = options.ttlSeconds ?? 24 * 60 * 60;
  }

  private key(txHash: string) {
    return `${this.prefix}:${txHash.toLowerCase()}`;
  }

  private async command(args: (string | number)[]): Promise<any> {
    const res = await fetch(this.url, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(args),
    });

    if (!res.ok) {
      throw new Error(`payless: Upstash returned ${res.status} for ${args[0]}`);
    }
    const body = (await res.json()) as { result?: unknown; error?: string };
    if (body.error) throw new Error(`payless: Upstash error — ${body.error}`);
    return body.result;
  }

  async claim(txHash: string, record: Omit<SpentRecord, 'txHash'>) {
    const key = this.key(txHash);
    const value: SpentRecord = { txHash: txHash.toLowerCase(), ...record };

    // Atomic: only sets when the key is absent.
    const set = await this.command(['SET', key, JSON.stringify(value), 'NX', 'EX', this.ttl]);
    if (set === 'OK') return null; // we claimed it

    // Somebody already had it — report who and where.
    const existing = await this.get(txHash);
    return (
      existing ?? {
        // The key expired between SET and GET. Treat it as spent anyway rather
        // than handing out a second response on a technicality.
        txHash: txHash.toLowerCase(),
        endpoint: 'unknown',
        amount: record.amount,
        spentAt: Date.now(),
      }
    );
  }

  async get(txHash: string) {
    const raw = await this.command(['GET', this.key(txHash)]);
    if (raw == null) return null;
    try {
      return JSON.parse(typeof raw === 'string' ? raw : String(raw)) as SpentRecord;
    } catch {
      return null;
    }
  }

  /** Confirms the credentials work. Call it once at startup and fail loudly. */
  async ping(): Promise<boolean> {
    const res = await this.command(['PING']);
    return res === 'PONG';
  }
}

/**
 * Build a store from the standard Upstash environment variables.
 * Returns null when they are absent, so a caller can fall back deliberately
 * rather than silently running unprotected.
 */
export function upstashStoreFromEnv(env: Record<string, string | undefined> = process.env): UpstashSpentStore | null {
  const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new UpstashSpentStore({ url, token });
}

export function createUpstashStore(options: UpstashOptions) {
  return new UpstashSpentStore(options);
}
