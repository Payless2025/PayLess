/**
 * The other half of the seller index: what an address actually sells.
 *
 * The chain index proves that an address gets paid through x402. It cannot
 * prove what it sells, because a settlement carries a recipient and an amount
 * and nothing else. So the index has rows nobody can fake and no names, which
 * is exactly half of a useful directory.
 *
 * This closes the join, and the ordering of the two facts is the whole point:
 *
 *   the chain says   an address was paid, repeatedly            (receipt)
 *   a signature says that address belongs to whoever registered (proof)
 *   a manifest says  what it sells, at a URL you can go read    (claim)
 *
 * The third one is a claim and always will be. What keeps it honest is that it
 * is bound to the first two: to attach a name to an address you must sign with
 * that address's key, and the manifest you point at must itself name that
 * address as a payment recipient. Both directions have to agree, so a seller
 * cannot list themselves against someone else's receipts, and cannot point at
 * a manifest that does not claim them back.
 *
 * Note which way the dependency runs. This module imports the chain index; the
 * chain index does not import this. Registration can be empty, stale, or down
 * without changing a single thing the chain says. A directory that could
 * corrupt its own evidence would not be worth having.
 */

import { getAddress, isAddress } from 'viem';
import { keyedStore, isKeyedStoreShared } from '../x402/keyed-store';
import { checkWebhookTarget } from '../x402/webhook-target';
import type { SellerIndex, Seller } from './sellers';

const COLLECTION = 'seller-registry';

/** How long a manifest check is trusted before the answer is re-fetched. */
export const RECHECK_AFTER_MS = 6 * 60 * 60 * 1000;

/** Caps on reading a stranger's server. Both are security bounds, not tuning. */
const FETCH_TIMEOUT_MS = 5_000;
const MAX_MANIFEST_BYTES = 256 * 1024;
const MAX_REDIRECTS = 3;

export interface ManifestCheck {
  at: string;
  ok: boolean;
  reason: string;
  /**
   * Whether we actually got a manifest back and could read it.
   *
   * The distinction this draws is the difference between an entry that should
   * be dropped and one that should be left alone. "Your manifest no longer
   * names you" disqualifies a seller. "We could not reach your server" says
   * nothing about the seller at all, and treating the two the same would let
   * one slow minute delete a legitimate registration permanently.
   */
  reachable: boolean;
  itemCount?: number;
  declaredPayTo?: string[];
}

export interface RegisteredSeller {
  /** Checksummed, and proven by a signature before this record was written. */
  address: string;
  manifestUrl: string;
  name: string | null;
  registeredAt: string;
  lastCheck: ManifestCheck;
}

function store() {
  return keyedStore<RegisteredSeller>(COLLECTION);
}

export function registryIsShared(): boolean {
  return isKeyedStoreShared(COLLECTION);
}

// ---------------------------------------------------------------------------
// Reading a stranger's manifest
// ---------------------------------------------------------------------------

/**
 * Fetch a manifest under every bound that applies to a URL a stranger chose.
 *
 * Redirects are followed by hand rather than by fetch, because the check that
 * makes the first URL safe says nothing about where it points. One hop to a
 * link-local address is the whole SSRF bug, and `redirect: 'follow'` would take
 * it silently.
 */
export async function fetchManifest(rawUrl: string): Promise<{ ok: true; body: unknown } | { ok: false; reason: string }> {
  let url = rawUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const allowed = checkWebhookTarget(url);
    if (!allowed.ok) return { ok: false, reason: allowed.reason ?? 'Destination is not allowed.' };

    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), FETCH_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(url, {
        redirect: 'manual',
        signal: abort.signal,
        headers: { accept: 'application/json' },
      });
    } catch (error) {
      return {
        ok: false,
        reason: abort.signal.aborted
          ? `No response within ${FETCH_TIMEOUT_MS / 1000}s.`
          : `Could not reach ${url}: ${(error as Error).message}`,
      };
    } finally {
      clearTimeout(timer);
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (!location) return { ok: false, reason: `Redirect with no destination (${res.status}).` };
      url = new URL(location, url).toString();
      continue;
    }

    if (!res.ok) return { ok: false, reason: `Manifest returned HTTP ${res.status}.` };

    // Read with a cap rather than res.json(), so a manifest that never ends
    // cannot hold a serverless function open until it is killed.
    const text = await readCapped(res);
    if (text === null) return { ok: false, reason: `Manifest is larger than ${MAX_MANIFEST_BYTES / 1024}KB.` };

    try {
      return { ok: true, body: JSON.parse(text) };
    } catch {
      return { ok: false, reason: 'Manifest is not valid JSON.' };
    }
  }

  return { ok: false, reason: `More than ${MAX_REDIRECTS} redirects.` };
}

async function readCapped(res: Response): Promise<string | null> {
  const reader = res.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_MANIFEST_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('utf8');
}

/**
 * Every address this manifest names as a payment recipient.
 *
 * A manifest may sell several things to several addresses, so the test is
 * membership rather than equality: the registering address has to appear
 * somewhere as somebody who gets paid.
 */
export function declaredPayTo(manifest: unknown): string[] {
  const found = new Set<string>();
  const push = (v: unknown) => {
    if (typeof v === 'string' && isAddress(v)) found.add(getAddress(v));
  };

  const m = manifest as Record<string, unknown> | null;
  if (!m || typeof m !== 'object') return [];

  push(m.payTo);
  const items = Array.isArray(m.items) ? m.items : [];
  for (const item of items) {
    const accepts = (item as Record<string, unknown>)?.accepts;
    if (!Array.isArray(accepts)) continue;
    for (const accept of accepts) push((accept as Record<string, unknown>)?.payTo);
  }
  return Array.from(found);
}

function countItems(manifest: unknown): number {
  const items = (manifest as Record<string, unknown>)?.items;
  return Array.isArray(items) ? items.length : 0;
}

/** Does the manifest at this URL claim this address back? */
export async function checkManifest(address: string, manifestUrl: string): Promise<ManifestCheck> {
  const at = new Date().toISOString();
  const checked = getAddress(address);

  const fetched = await fetchManifest(manifestUrl);
  if (!fetched.ok) return { at, ok: false, reachable: false, reason: fetched.reason };

  const declared = declaredPayTo(fetched.body);
  if (declared.length === 0) {
    return { at, ok: false, reachable: true, reason: 'Manifest names no payment address, so it claims nobody.' };
  }
  if (!declared.includes(checked)) {
    return {
      at,
      ok: false,
      reachable: true,
      reason: `Manifest does not name ${checked} as a recipient. It names ${declared.join(', ')}.`,
      declaredPayTo: declared,
    };
  }

  return {
    at,
    ok: true,
    reachable: true,
    reason: `Manifest names ${checked} as a recipient.`,
    itemCount: countItems(fetched.body),
    declaredPayTo: declared,
  };
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export interface RegisterResult {
  ok: boolean;
  reason: string;
  entry?: RegisteredSeller;
}

/**
 * Record a seller, having already proven the address.
 *
 * `address` must come from a verified wallet-proof token, never from the body.
 * That is the entire access control: the key holder is the only party who can
 * write a row for their own address, and nobody can write one for anyone else.
 */
export async function registerSeller(
  address: string,
  manifestUrl: string,
  name?: string
): Promise<RegisterResult> {
  if (!isAddress(address)) return { ok: false, reason: 'A valid address is required.' };
  const checked = getAddress(address);

  const target = checkWebhookTarget(manifestUrl);
  if (!target.ok) return { ok: false, reason: target.reason ?? 'Manifest URL is not allowed.' };

  const check = await checkManifest(checked, manifestUrl);
  if (!check.ok) {
    // Refuse rather than store a failing row. A registry of entries that do not
    // verify is just a list, which is the thing this exists not to be.
    return { ok: false, reason: check.reason };
  }

  const existing = await store().get(checked.toLowerCase());
  const entry: RegisteredSeller = {
    address: checked,
    manifestUrl,
    name: name?.trim().slice(0, 64) || existing?.name || null,
    registeredAt: existing?.registeredAt ?? new Date().toISOString(),
    lastCheck: check,
  };
  await store().put(checked.toLowerCase(), entry);
  return { ok: true, reason: check.reason, entry };
}

/** Remove a row. Same rule: only the key holder for that address. */
export async function unregisterSeller(address: string): Promise<boolean> {
  if (!isAddress(address)) return false;
  return store().delete(getAddress(address).toLowerCase());
}

export async function getRegistration(address: string): Promise<RegisteredSeller | null> {
  if (!isAddress(address)) return null;
  return store().get(getAddress(address).toLowerCase());
}

export async function allRegistrations(): Promise<RegisteredSeller[]> {
  return store().all();
}

/**
 * Re-check any row whose last check has gone stale, and drop the ones that no
 * longer verify.
 *
 * A manifest can change or disappear after registration, and a row that was
 * true in March is not evidence in September. Re-checking keeps the registry
 * from quietly becoming a cache of things that used to be true.
 */
export async function refreshStale(
  options: { now?: number; limit?: number } = {}
): Promise<{ rechecked: number; dropped: string[]; unreachable: string[] }> {
  const now = options.now ?? Date.now();
  // Bounded, because this runs inside a request. Each recheck is a call to
  // somebody else's server, so an unbounded registry would turn a read of the
  // index into an arbitrarily long wait. Whatever is missed is rechecked on
  // the next read.
  const limit = options.limit ?? 5;
  const dropped: string[] = [];
  const unreachable: string[] = [];
  let rechecked = 0;

  for (const entry of await allRegistrations()) {
    if (rechecked >= limit) break;
    const age = now - Date.parse(entry.lastCheck?.at ?? '');
    if (Number.isFinite(age) && age < RECHECK_AFTER_MS) continue;

    rechecked += 1;
    const check = await checkManifest(entry.address, entry.manifestUrl);
    if (check.ok) {
      await store().put(entry.address.toLowerCase(), { ...entry, lastCheck: check });
    } else if (check.reachable) {
      // The manifest answered and no longer names this address. That is a
      // disqualification, so the entry goes.
      await store().delete(entry.address.toLowerCase());
      dropped.push(entry.address);
    } else {
      // We could not reach or parse it. That says nothing about the seller, so
      // the entry stays and the failure is recorded to be retried next time.
      // Deleting here would let one slow minute erase a valid registration.
      await store().put(entry.address.toLowerCase(), { ...entry, lastCheck: check });
      unreachable.push(entry.address);
    }
  }

  return { rechecked, dropped, unreachable };
}

// ---------------------------------------------------------------------------
// The join
// ---------------------------------------------------------------------------

export interface SellerProfile {
  name: string | null;
  manifestUrl: string;
  itemCount: number;
  verifiedAt: string;
  /** How this row's name got here, so a claim is never mistaken for a receipt. */
  evidence: 'signature + manifest';
}

export interface JoinedSeller extends Seller {
  profile: SellerProfile | null;
}

export interface JoinedIndex extends Omit<SellerIndex, 'sellers'> {
  sellers: JoinedSeller[];
  /**
   * Registered sellers with no settlement in the scanned window.
   *
   * Kept in a separate array on purpose. Merging them into `sellers` would put
   * a claim and a receipt in the same list under the same shape, and the whole
   * value of the index is that those two things stay told apart.
   */
  registeredWithoutSettlements: Array<{ address: string; profile: SellerProfile }>;
  registered: number;
  /**
   * Why the registry could not be read, when it could not be.
   *
   * Without this the response says "0 registered" for two very different
   * situations: nobody has registered, and the store did not answer. Those
   * read identically to a caller and only one of them is a fact, which is the
   * exact shape of silent failure the rest of this codebase refuses.
   */
  registryError: string | null;
  /** Whether registrations survive a scale-out here. Reported, not assumed. */
  registryDurable: boolean;
}

function toProfile(entry: RegisteredSeller): SellerProfile {
  return {
    name: entry.name,
    manifestUrl: entry.manifestUrl,
    itemCount: entry.lastCheck.itemCount ?? 0,
    verifiedAt: entry.lastCheck.at,
    evidence: 'signature + manifest',
  };
}

/** Attach names to the rows the chain produced, without changing any of them. */
export async function joinRegistry(index: SellerIndex): Promise<JoinedIndex> {
  let entries: RegisteredSeller[] = [];
  let registryError: string | null = null;
  try {
    entries = await allRegistrations();
  } catch (error) {
    // A registry that cannot be read costs names, not rows. The chain data is
    // already in hand and is returned unchanged, and the reason travels with
    // the response rather than only into a log nobody reads.
    registryError = (error as Error).message || 'Registry could not be read.';
    console.error('[seller-registry] could not read registrations:', error);
  }

  const byAddress = new Map(entries.map((e) => [e.address.toLowerCase(), e]));
  const paid = new Set(index.sellers.map((s) => s.address.toLowerCase()));

  const sellers: JoinedSeller[] = index.sellers.map((s) => {
    const entry = byAddress.get(s.address.toLowerCase());
    return { ...s, profile: entry ? toProfile(entry) : null };
  });

  const registeredWithoutSettlements = entries
    .filter((e) => !paid.has(e.address.toLowerCase()))
    .map((e) => ({ address: e.address, profile: toProfile(e) }));

  return {
    ...index,
    sellers,
    registeredWithoutSettlements,
    registered: entries.length,
    registryError,
    registryDurable: registryIsShared(),
    limits:
      `${index.limits} A name and a URL appear only where the address holder signed for them and the manifest names that address back; rows without a profile are unregistered, not unreal.`,
  };
}
