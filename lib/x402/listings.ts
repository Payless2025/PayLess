/**
 * Turning somebody else's API into an x402 seller.
 *
 * Everything built here so far helps a seller who is already an engineer. This
 * is for the ones who are not: you have an API, you want it to earn, and you do
 * not want to learn what a witness is. You give us its URL, a price, and where
 * to be paid. You get back a second URL that charges for it.
 *
 * Two properties decide whether this is safe to offer, and neither is a promise
 * from us.
 *
 * The money never passes through us. The canonical x402 proxy takes the payment
 * destination from the signed witness, so the buyer pays the seller directly and
 * nobody in the path can redirect it. We are in the request path, not the
 * payment path, and those are very different amounts of trust.
 *
 * And a listing is inert until its origin proves it wants to be listed. Anyone
 * can type anyone else's URL into a form, so the form is not what activates it:
 * the origin has to serve a token we generated, which only somebody who
 * controls that origin can do. Claiming is free; being listed is not.
 */

import { getAddress, isAddress, formatUnits } from 'viem';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { keyedStore } from './keyed-store';
import { checkWebhookTarget } from './webhook-target';

const COLLECTION = 'listings';
const listings = () => keyedStore<Listing>(COLLECTION);

/** Where an origin must serve its token for us to believe it. */
export const VERIFY_PATH = '/.well-known/payless-verification';

/** Caps on reading a stranger's server, and on relaying its answer. */
const FETCH_TIMEOUT_MS = 8_000;
const MAX_BODY_BYTES = 512 * 1024;

export interface Verification {
  at: string;
  ok: boolean;
  reason: string;
}

export interface Listing {
  id: string;
  /** The wallet that proved ownership when this was created. */
  owner: string;
  /** The seller's own API. Never shown to buyers, only called on their behalf. */
  originUrl: string;
  /** Where the buyer's payment goes. Defaults to the owner. */
  payTo: string;
  /** Base units of USDG, six decimals. */
  priceBase: string;
  name: string;
  description: string;
  createdAt: string;
  /** The token this origin has to serve. Generated once, never shown publicly. */
  verifyToken: string;
  verification: Verification | null;
  /** Only a verified listing is live, and only a live one can be paid for. */
  active: boolean;
}

/** What a buyer, or the catalogue, is allowed to see. */
export interface PublicListing {
  id: string;
  name: string;
  description: string;
  priceUSDG: string;
  payTo: string;
  resource: string;
  active: boolean;
  createdAt: string;
}

export function publicView(listing: Listing, origin: string): PublicListing {
  return {
    id: listing.id,
    name: listing.name,
    description: listing.description,
    priceUSDG: formatUnits(BigInt(listing.priceBase), 6),
    payTo: listing.payTo,
    resource: `${origin}/s/${listing.id}`,
    active: listing.active,
    createdAt: listing.createdAt,
  };
}

// ---------------------------------------------------------------------------
// Creating
// ---------------------------------------------------------------------------

function newId(): string {
  return randomBytes(6).toString('hex');
}

/** Parse a USDG amount into base units, or say why it is not one. */
export function parsePrice(raw: string): { base: bigint } | { error: string } {
  const value = (raw || '').trim();
  if (!/^\d+(\.\d{1,6})?$/.test(value)) {
    return { error: 'Price must be USDG with up to six decimals, for example "0.02".' };
  }
  const [whole, frac = ''] = value.split('.');
  const base = BigInt(whole) * BigInt(1_000_000) + BigInt((frac + '000000').slice(0, 6));
  if (base <= BigInt(0)) return { error: 'Price must be above zero. A free endpoint needs no payment layer.' };
  return { base };
}

export interface CreateResult {
  ok: boolean;
  reason: string;
  listing?: Listing;
  /** What the seller has to do next, since a listing starts inert. */
  next?: { path: string; token: string; instruction: string };
}

export async function createListing(
  owner: string,
  input: { originUrl: string; priceUSDG: string; name?: string; description?: string; payTo?: string }
): Promise<CreateResult> {
  if (!isAddress(owner)) return { ok: false, reason: 'A proven wallet is required.' };
  const ownerAddress = getAddress(owner);

  const target = checkWebhookTarget(input.originUrl);
  if (!target.ok) return { ok: false, reason: target.reason ?? 'That URL cannot be called from here.' };

  const price = parsePrice(input.priceUSDG);
  if ('error' in price) return { ok: false, reason: price.error };

  let payTo = ownerAddress;
  if (input.payTo) {
    if (!isAddress(input.payTo)) return { ok: false, reason: 'payTo is not a valid address.' };
    payTo = getAddress(input.payTo);
  }

  const listing: Listing = {
    id: newId(),
    owner: ownerAddress,
    originUrl: input.originUrl,
    payTo,
    priceBase: price.base.toString(),
    name: (input.name || '').trim().slice(0, 64) || 'Untitled endpoint',
    description: (input.description || '').trim().slice(0, 240),
    createdAt: new Date().toISOString(),
    verifyToken: randomBytes(16).toString('hex'),
    verification: null,
    active: false,
  };

  await listings().put(listing.id, listing);

  return {
    ok: true,
    reason: 'Listing created. It stays inert until the origin proves it wants to be listed.',
    listing,
    next: {
      path: VERIFY_PATH,
      token: listing.verifyToken,
      instruction:
        `Serve this token as the entire body of ${VERIFY_PATH} on the same origin, then call verify. ` +
        'Anyone can type a URL into a form; only whoever controls the origin can answer this.',
    },
  };
}

// ---------------------------------------------------------------------------
// Proving the origin
// ---------------------------------------------------------------------------

async function readCapped(res: Response): Promise<string | null> {
  const reader = res.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('utf8');
}

function tokensMatch(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/**
 * Ask the origin whether it wants to be listed.
 *
 * The check runs against the origin root rather than the listed path, because
 * control of one endpoint is not control of a host, and it is the host we are
 * about to start sending traffic to.
 */
export async function verifyListing(id: string): Promise<{ ok: boolean; reason: string; listing?: Listing }> {
  const listing = await listings().get(id);
  if (!listing) return { ok: false, reason: 'No such listing.' };

  let url: string;
  try {
    url = new URL(VERIFY_PATH, new URL(listing.originUrl).origin).toString();
  } catch {
    return { ok: false, reason: 'The listed URL cannot be parsed.' };
  }

  const allowed = checkWebhookTarget(url);
  if (!allowed.ok) return { ok: false, reason: allowed.reason ?? 'That origin cannot be called from here.' };

  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), FETCH_TIMEOUT_MS);
  let body: string | null = null;
  let reason = '';
  try {
    const res = await fetch(url, { signal: abort.signal, redirect: 'manual', cache: 'no-store' });
    if (!res.ok) {
      reason = `${url} answered ${res.status}.`;
    } else {
      body = await readCapped(res);
      if (body === null) reason = 'The verification file is larger than it has any reason to be.';
    }
  } catch (error) {
    reason = abort.signal.aborted
      ? `${url} did not answer within ${FETCH_TIMEOUT_MS / 1000}s.`
      : `Could not reach ${url}: ${(error as Error).message}`;
  } finally {
    clearTimeout(timer);
  }

  const ok = body !== null && tokensMatch(body.trim(), listing.verifyToken);
  const verification: Verification = {
    at: new Date().toISOString(),
    ok,
    reason: ok ? 'The origin served the token, so it controls this host.' : reason || 'The token did not match.',
  };

  // A listing that fails verification is kept rather than deleted, so a seller
  // who mistyped can fix it and try again. It simply stays inert.
  const updated: Listing = { ...listing, verification, active: ok };
  await listings().put(listing.id, updated);

  return { ok, reason: verification.reason, listing: updated };
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

export async function getListing(id: string): Promise<Listing | null> {
  return listings().get(id);
}

export async function allListings(): Promise<Listing[]> {
  return listings().all();
}

export async function activeListings(): Promise<Listing[]> {
  return (await allListings()).filter((l) => l.active);
}

export async function listingsOwnedBy(address: string): Promise<Listing[]> {
  if (!isAddress(address)) return [];
  const owner = getAddress(address);
  return (await allListings()).filter((l) => l.owner === owner);
}

/** Remove a listing. Only ever called with an owner already proven. */
export async function deleteListing(id: string, owner: string): Promise<boolean> {
  const listing = await listings().get(id);
  if (!listing) return false;
  if (!isAddress(owner) || listing.owner !== getAddress(owner)) return false;
  return listings().delete(id);
}

// ---------------------------------------------------------------------------
// Relaying
// ---------------------------------------------------------------------------

export interface Relayed {
  ok: boolean;
  status: number;
  body: string;
  contentType: string;
  reason?: string;
}

/**
 * Call the seller's origin and bring back what it said.
 *
 * Bounded on purpose and in three ways: a timeout, a body cap, and no redirect
 * following. We are spending our own bandwidth on somebody else's endpoint, and
 * an endpoint that answers slowly or endlessly should cost us a bounded amount
 * rather than an open one.
 *
 * The upstream status is passed through rather than flattened. A buyer who paid
 * for a 404 needs to see the 404, and a seller debugging their own API needs to
 * see their own errors rather than ours.
 */
export async function relay(listing: Listing, search: string): Promise<Relayed> {
  const url = `${listing.originUrl}${listing.originUrl.includes('?') ? '&' : '?'}${search.replace(/^\?/, '')}`;
  const allowed = checkWebhookTarget(url);
  if (!allowed.ok) {
    return { ok: false, status: 502, body: '', contentType: 'application/json', reason: allowed.reason };
  }

  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: abort.signal, redirect: 'manual', cache: 'no-store' });
    const body = await readCapped(res);
    if (body === null) {
      return {
        ok: false,
        status: 502,
        body: '',
        contentType: 'application/json',
        reason: `The origin returned more than ${MAX_BODY_BYTES / 1024}KB, which this relay does not carry.`,
      };
    }
    return {
      ok: res.status >= 200 && res.status < 300,
      status: res.status,
      body,
      contentType: res.headers.get('content-type') || 'application/json',
    };
  } catch (error) {
    return {
      ok: false,
      status: 504,
      body: '',
      contentType: 'application/json',
      reason: abort.signal.aborted
        ? `The origin did not answer within ${FETCH_TIMEOUT_MS / 1000}s.`
        : `Could not reach the origin: ${(error as Error).message}`,
    };
  } finally {
    clearTimeout(timer);
  }
}
