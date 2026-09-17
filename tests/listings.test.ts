/**
 * Listing somebody else's API.
 *
 * The dangerous property here is not payment, it is authority. A form where you
 * type a URL and an address you want paid is, without one more step, a way to
 * monetise an endpoint you do not own. So a listing starts inert and only the
 * origin itself can activate it, by serving a token it could not have unless it
 * controls that host.
 *
 * The second property is about whose money is at risk. We are in the request
 * path, so a seller's outage costs us bandwidth and a buyer a retry. We are not
 * in the payment path, so nothing here can send a payment anywhere except the
 * address the buyer signed for.
 */

import assert from 'node:assert/strict';
import { getAddress } from 'viem';
import { setKeyedStore, MemoryKeyedStore } from '../lib/x402/keyed-store';
import {
  createListing,
  verifyListing,
  getListing,
  deleteListing,
  listingsOwnedBy,
  parsePrice,
  relay,
  publicView,
  VERIFY_PATH,
  type Listing,
} from '../lib/x402/listings';

let passed = 0;
async function test(name: string, fn: () => Promise<void>) {
  try { await fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.log(`  ✗ ${name}\n    ${(e as Error).message}`); process.exitCode = 1; }
}

// Canonicalised rather than pasted: the module stores checksummed addresses,
// and a hand-typed constant differing only in case fails for a reason that has
// nothing to do with what is under test.
const OWNER = getAddress('0x426f8846b5011d5acf659fe5bfbc5fda6123f759');
const STRANGER = getAddress('0xbb818e97cf7a0d0cd8bd0b1e21fe0ce6d8c0b9a1');
const ORIGIN = 'https://seller.example/api/quotes';

const realFetch = globalThis.fetch;
let served: Record<string, { status?: number; body?: string; type?: string }> = {};
let calls: string[] = [];

function stubFetch() {
  globalThis.fetch = (async (input: any) => {
    const url = typeof input === 'string' ? input : input.url;
    calls.push(url);
    const hit = served[url];
    if (!hit) return new Response('not found', { status: 404 });
    return new Response(hit.body ?? '', {
      status: hit.status ?? 200,
      headers: { 'content-type': hit.type ?? 'application/json' },
    });
  }) as typeof fetch;
}

function fresh() {
  setKeyedStore('listings', new MemoryKeyedStore<Listing>());
  served = {};
  calls = [];
}

async function make(overrides: Partial<{ originUrl: string; priceUSDG: string; payTo: string }> = {}) {
  const r = await createListing(OWNER, {
    originUrl: overrides.originUrl ?? ORIGIN,
    priceUSDG: overrides.priceUSDG ?? '0.02',
    name: 'Quotes',
    description: 'Live quotes',
    payTo: overrides.payTo,
  });
  return r;
}

async function run() {
  console.log('\nlistings\n');
  stubFetch();

  // -------------------------------------------------------------------------
  // Authority
  // -------------------------------------------------------------------------

  await test('a new listing is inert until its origin proves itself', async () => {
    // Without this, the form alone would let anyone monetise an endpoint they
    // have never touched.
    fresh();
    const r = await make();
    assert.equal(r.ok, true, r.reason);
    assert.equal(r.listing!.active, false, 'a listing went live without proving anything');
    assert.equal(r.listing!.verification, null);
    assert.ok(r.next?.token, 'the seller was given nothing to prove with');
    assert.equal(r.next?.path, VERIFY_PATH);
  });

  await test('the origin has to serve the exact token', async () => {
    fresh();
    const r = await make();
    const id = r.listing!.id;
    const url = `https://seller.example${VERIFY_PATH}`;

    served[url] = { body: 'some other value' };
    const wrong = await verifyListing(id);
    assert.equal(wrong.ok, false, 'a wrong token activated a listing');
    assert.equal((await getListing(id))!.active, false);

    served[url] = { body: r.listing!.verifyToken };
    const right = await verifyListing(id);
    assert.equal(right.ok, true, right.reason);
    assert.equal((await getListing(id))!.active, true);
  });

  await test('verification asks the origin root, not the listed path', async () => {
    // Control of one endpoint is not control of a host, and it is the host we
    // are about to start sending traffic to.
    fresh();
    const r = await make({ originUrl: 'https://seller.example/deep/nested/thing' });
    served[`https://seller.example${VERIFY_PATH}`] = { body: r.listing!.verifyToken };
    const v = await verifyListing(r.listing!.id);
    assert.equal(v.ok, true, v.reason);
    assert.ok(
      calls.some((c) => c === `https://seller.example${VERIFY_PATH}`),
      'it checked somewhere other than the origin root'
    );
  });

  await test('a failed verification keeps the listing so it can be fixed', async () => {
    fresh();
    const r = await make();
    served[`https://seller.example${VERIFY_PATH}`] = { status: 500 };
    await verifyListing(r.listing!.id);
    const after = await getListing(r.listing!.id);
    assert.ok(after, 'a mistyped listing was deleted rather than left inert');
    assert.equal(after!.active, false);
    assert.equal(after!.verification?.ok, false);
    assert.match(after!.verification!.reason, /500/);
  });

  await test('a private or unroutable origin is refused outright', async () => {
    fresh();
    for (const url of [
      'https://169.254.169.254/meta',
      'https://127.0.0.1/api',
      'https://10.0.0.5/api',
      'http://seller.example/api',
    ]) {
      const r = await createListing(OWNER, { originUrl: url, priceUSDG: '0.01' });
      assert.equal(r.ok, false, `${url} was accepted`);
    }
  });

  await test('only the owner can remove a listing', async () => {
    fresh();
    const r = await make();
    assert.equal(await deleteListing(r.listing!.id, STRANGER), false, 'a stranger deleted somebody else listing');
    assert.ok(await getListing(r.listing!.id));
    assert.equal(await deleteListing(r.listing!.id, OWNER), true);
    assert.equal(await getListing(r.listing!.id), null);
  });

  await test('listings are owned, and one address cannot see another', async () => {
    fresh();
    await make();
    assert.equal((await listingsOwnedBy(OWNER)).length, 1);
    assert.equal((await listingsOwnedBy(STRANGER)).length, 0);
  });

  // -------------------------------------------------------------------------
  // Money
  // -------------------------------------------------------------------------

  await test('the payout defaults to the owner and can be pointed elsewhere', async () => {
    fresh();
    const mine = await make();
    assert.equal(mine.listing!.payTo, OWNER);
    const elsewhere = await make({ payTo: STRANGER });
    assert.equal(elsewhere.listing!.payTo, STRANGER);
  });

  await test('a price has to be a real amount', async () => {
    assert.ok('error' in parsePrice(''));
    assert.ok('error' in parsePrice('free'));
    assert.ok('error' in parsePrice('0'), 'a free endpoint needs no payment layer');
    assert.ok('error' in parsePrice('0.0000001'), 'USDG has six decimals');
    assert.equal((parsePrice('0.02') as { base: bigint }).base, BigInt(20_000));
    assert.equal((parsePrice('1') as { base: bigint }).base, BigInt(1_000_000));
  });

  await test('the public view never leaks the verification token', async () => {
    // It is the only thing standing between a listing and anyone who wants to
    // activate it.
    fresh();
    const r = await make();
    const view = publicView(r.listing!, 'https://www.payless.network');
    const blob = JSON.stringify(view);
    assert.ok(!blob.includes(r.listing!.verifyToken), 'the public view exposed the verification token');
    assert.ok(!blob.includes('seller.example'), 'the public view exposed the seller origin');
    assert.equal(view.priceUSDG, '0.02');
    assert.match(view.resource, /\/s\//);
  });

  // -------------------------------------------------------------------------
  // Relaying
  // -------------------------------------------------------------------------

  await test('the upstream status travels back rather than being flattened', async () => {
    // A buyer who paid for a 404 has to see the 404, and a seller debugging
    // their own API has to see their own errors rather than ours.
    fresh();
    const r = await make();
    served[`${ORIGIN}?x=1`] = { status: 404, body: '{"error":"no such symbol"}' };
    const out = await relay(r.listing!, '?x=1');
    assert.equal(out.status, 404);
    assert.equal(out.ok, false);
    assert.match(out.body, /no such symbol/);
  });

  await test('query parameters reach the origin', async () => {
    fresh();
    const r = await make();
    served[`${ORIGIN}?symbol=NVDA`] = { body: '{"ok":true}' };
    const out = await relay(r.listing!, '?symbol=NVDA');
    assert.equal(out.ok, true);
    assert.ok(calls.some((c) => c.includes('symbol=NVDA')), 'the parameter never reached the origin');
  });

  await test('an oversized response is refused rather than relayed', async () => {
    fresh();
    const r = await make();
    served[`${ORIGIN}?`] = { body: 'x'.repeat(600 * 1024) };
    const out = await relay(r.listing!, '');
    assert.equal(out.ok, false);
    assert.equal(out.status, 502);
    assert.match(out.reason!, /KB/);
  });

  // -------------------------------------------------------------------------
  // The paid route, read from source
  // -------------------------------------------------------------------------

  await test('the paid route refuses an inactive listing and charges nothing', async () => {
    const fs = await import('node:fs/promises');
    const src = await fs.readFile('app/s/[id]/route.ts', 'utf8');
    assert.match(src, /!listing\.active/, 'the paid route never checks whether a listing is active');
    assert.match(src, /charged: false/, 'it does not tell a caller nothing was charged');
  });

  await test('the paid route verifies against the seller payTo, never ours', async () => {
    // The single line that decides whose money this is.
    const fs = await import('node:fs/promises');
    const src = await fs.readFile('app/s/[id]/route.ts', 'utf8');
    assert.match(src, /payTo: listing\.payTo/, 'payment is not verified against the listing recipient');
    assert.ok(!/PAYMENT_CONFIG\.walletAddress/.test(src), 'the relay verifies against our own wallet');
  });

  await test('the paid route serves before it settles', async () => {
    // Settling is what moves the money. Taking a stranger's money before
    // knowing whether their seller answered would be charging for nothing.
    const fs = await import('node:fs/promises');
    const src = await fs.readFile('app/s/[id]/route.ts', 'utf8');
    assert.ok(src.indexOf('await relay(') < src.indexOf('settleUpto'), 'it settles before serving');
  });

  globalThis.fetch = realFetch;
  console.log(`\n${passed} passed${process.exitCode ? ', FAILURES ABOVE' : ''}\n`);
}

run();
