/**
 * Shared ledgers for serverless.
 *
 * Two things in this codebase are per-instance and must not be: the spent
 * transaction ledger (replay protection) and subscription period accounting.
 * On Vercel each instance keeps its own copy, so a payment could be spent once
 * per warm instance and periods would drift apart.
 *
 * Both move behind Upstash Redis here. `SET NX` decides claims on the server,
 * so there is no read-then-write gap for two instances to race through.
 *
 * Wired up in instrumentation.ts. Without the environment variables the app
 * keeps the in-memory stores and says so loudly at boot rather than pretending.
 */

import { UpstashSpentStore, upstashStoreFromEnv } from 'payless';
import { setSpentStore, type SpentRecord, type SpentStore } from '../spent-store';
import {
  setSubscriptionStore,
  type Subscription,
  type SubscriptionStore,
} from '../subscriptions';

class RedisSubscriptionStore implements SubscriptionStore {
  constructor(
    private url: string,
    private token: string,
    private prefix = 'payless:sub'
  ) {}

  private async command(args: (string | number)[]): Promise<any> {
    const res = await fetch(this.url.replace(/\/+$/, ''), {
      method: 'POST',
      headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' },
      body: JSON.stringify(args),
    });
    if (!res.ok) throw new Error(`Upstash ${res.status} for ${args[0]}`);
    const body = (await res.json()) as { result?: unknown; error?: string };
    if (body.error) throw new Error(body.error);
    return body.result;
  }

  private key(planId: string, payer: string) {
    return `${this.prefix}:${planId}:${payer.toLowerCase()}`;
  }

  async get(planId: string, payer: string) {
    const raw = await this.command(['GET', this.key(planId, payer)]);
    if (raw == null) return null;
    try {
      return JSON.parse(String(raw)) as Subscription;
    } catch {
      return null;
    }
  }

  async put(sub: Subscription) {
    await this.command(['SET', this.key(sub.planId, sub.payer), JSON.stringify(sub)]);
    await this.command(['SADD', `${this.prefix}:payer:${sub.payer.toLowerCase()}`, sub.planId]);
  }

  async listByPayer(payer: string) {
    const planIds = (await this.command([
      'SMEMBERS',
      `${this.prefix}:payer:${payer.toLowerCase()}`,
    ])) as string[] | null;
    if (!planIds?.length) return [];
    const rows = await Promise.all(planIds.map((id) => this.get(id, payer)));
    return rows.filter((r): r is Subscription => r !== null);
  }

  async all(): Promise<Subscription[]> {
    // Deliberately unsupported: SCAN over a shared database is a footgun, and
    // nothing in the request path needs it.
    throw new Error('all() is not supported by the Redis subscription store');
  }
}

export interface SharedStoreStatus {
  configured: boolean;
  reachable: boolean;
  error?: string;
}

export async function installSharedStores(): Promise<SharedStoreStatus> {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    console.warn(
      '[payless] No UPSTASH_REDIS_REST_URL/TOKEN. Replay protection and subscription ' +
        'periods are per-instance — correct on one server, wrong on serverless. ' +
        'Set them before taking real volume.'
    );
    return { configured: false, reachable: false };
  }

  const spent = new UpstashSpentStore({ url, token });

  try {
    await spent.ping();
  } catch (error) {
    // Fail loudly. Silently falling back would leave the exact hole the store
    // exists to close, with nothing in the logs to say so.
    const message = error instanceof Error ? error.message : 'unreachable';
    console.error(`[payless] Upstash configured but unreachable: ${message}`);
    return { configured: true, reachable: false, error: message };
  }

  setSpentStore(spent as unknown as SpentStore);
  setSubscriptionStore(new RedisSubscriptionStore(url, token));
  console.log('[payless] Shared stores installed (Upstash Redis).');
  return { configured: true, reachable: true };
}

export type { SpentRecord };
