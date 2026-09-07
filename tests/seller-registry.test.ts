/**
 * The seller registry, and the one property that makes it worth having.
 *
 * The chain index proves an address gets paid. The registry says what it sells.
 * The second is a claim, and the tests here exist to pin the two locks that
 * stop it being only a claim: the address holder has to sign, and the manifest
 * they point at has to name that address back. Break either lock and this
 * becomes a signup form with extra steps.
 *
 * The other half is separation. A registered seller with no settlements is a
 * claim with no receipt behind it, and it must never appear in the same array,
 * under the same shape, as a row the chain produced.
 */

import assert from 'node:assert/strict';
import { getAddress } from 'viem';
import { setKeyedStore, MemoryKeyedStore } from '../lib/x402/keyed-store';
import {
  registerSeller,
  unregisterSeller,
  getRegistration,
  checkManifest,
  declaredPayTo,
  joinRegistry,
  refreshStale,
  RECHECK_AFTER_MS,
  type RegisteredSeller,
} from '../lib/chains/seller-registry';
import type { SellerIndex } from '../lib/chains/sellers';

let passed = 0;
async function test(name: string, fn: () => Promise<void>) {
  try { await fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.log(`  ✗ ${name}\n    ${(e as Error).message}`); process.exitCode = 1; }
}

// Canonicalised here rather than pasted, because the module stores checksummed
// addresses and a hand-typed constant that differs only in case would fail for
// a reason that has nothing to do with what is under test.
const SELLER = getAddress('0xbb818e97cf7a0d0cd8bd0b1e21fe0ce6d8c0b9a1');
const OTHER = getAddress('0x426f8846b5011d5acf659fe5bfbc5fda6123f759');
const MANIFEST = 'https://seller.example/.well-known/x402';

function manifest(payTo: string, items = 2) {
  return {
    x402Version: 1,
    payTo,
    items: Array.from({ length: items }, (_, i) => ({
      resource: `https://seller.example/api/thing/${i}`,
      accepts: [{ scheme: 'exact', payTo, amount: '1000' }],
    })),
  };
}

/** Swap in a fetch that answers from a script, so no test touches the network. */
type Reply = { status?: number; body?: unknown; headers?: Record<string, string>; text?: string };
let script: (url: string) => Reply = () => ({ status: 404 });
const realFetch = globalThis.fetch;

function stubFetch() {
  globalThis.fetch = (async (input: any) => {
    const url = typeof input === 'string' ? input : input.url;
    const r = script(url);
    const body = r.text ?? (r.body === undefined ? '' : JSON.stringify(r.body));
    return new Response(body, { status: r.status ?? 200, headers: r.headers });
  }) as typeof fetch;
}

function freshStore() {
  setKeyedStore('seller-registry', new MemoryKeyedStore<RegisteredSeller>());
}

function chainIndex(addresses: string[]): SellerIndex {
  return {
    sellers: addresses.map((address, i) => ({
      address,
      payments: 23 - i,
      volumeUSDG: '0.165',
      firstSeenBlock: '1',
      lastSeenBlock: '2',
      schemes: ['exact'],
      facilitators: ['0xc231248d0000000000000000000000000000dEaD'],
      explorer: `https://x.example/address/${address}`,
    })),
    settlementsScanned: 30,
    facilitatorsSeen: 3,
    blocksScanned: '50000',
    scannedFrom: '1',
    scannedTo: '2',
    source: 'Settled events',
    limits: 'A sample, not a census.',
    retrievedAt: new Date().toISOString(),
  };
}

async function run() {
  console.log('\nseller registry\n');
  stubFetch();

  // -------------------------------------------------------------------------
  // The binding rule
  // -------------------------------------------------------------------------

  await test('a manifest that does not name the address is refused', async () => {
    // The lock that stops anyone listing themselves against somebody else's
    // receipts. Without it, "who sells here" becomes "who typed a URL".
    freshStore();
    script = () => ({ body: manifest(OTHER) });
    const r = await registerSeller(SELLER, MANIFEST);
    assert.equal(r.ok, false);
    assert.match(r.reason, /does not name/i);
    assert.equal(await getRegistration(SELLER), null, 'a refused registration must not be stored');
  });

  await test('a manifest naming several recipients is accepted if ours is one', async () => {
    // A real seller may sell several things to several addresses. The test is
    // membership, not equality.
    freshStore();
    script = () => ({
      body: {
        payTo: OTHER,
        items: [
          { accepts: [{ payTo: OTHER }] },
          { accepts: [{ payTo: SELLER }] },
        ],
      },
    });
    const r = await registerSeller(SELLER, MANIFEST);
    assert.equal(r.ok, true, r.reason);
  });

  await test('a manifest naming nobody claims nobody', async () => {
    freshStore();
    script = () => ({ body: { x402Version: 1, items: [] } });
    const r = await registerSeller(SELLER, MANIFEST);
    assert.equal(r.ok, false);
    assert.match(r.reason, /names no payment address/i);
  });

  await test('declaredPayTo survives junk without throwing', async () => {
    assert.deepEqual(declaredPayTo(null), []);
    assert.deepEqual(declaredPayTo('nope'), []);
    assert.deepEqual(declaredPayTo({ payTo: 'not-an-address', items: 'not-an-array' }), []);
    assert.deepEqual(declaredPayTo({ items: [{ accepts: [{ payTo: SELLER }] }] }), [SELLER]);
  });

  // -------------------------------------------------------------------------
  // Fetching a stranger's server
  // -------------------------------------------------------------------------

  await test('a manifest URL on a private host is refused', async () => {
    freshStore();
    for (const url of [
      'https://169.254.169.254/.well-known/x402',
      'https://127.0.0.1/.well-known/x402',
      'https://10.0.0.5/.well-known/x402',
      'http://seller.example/.well-known/x402',
    ]) {
      const r = await registerSeller(SELLER, url);
      assert.equal(r.ok, false, `${url} was accepted`);
    }
  });

  await test('a redirect into a private host is refused, not followed', async () => {
    // The check that made the first URL safe says nothing about where it
    // points. This is the whole SSRF bug, one hop later.
    freshStore();
    script = (url) =>
      url === MANIFEST
        ? { status: 302, headers: { location: 'https://169.254.169.254/latest/meta-data/' } }
        : { body: manifest(SELLER) };
    const r = await registerSeller(SELLER, MANIFEST);
    assert.equal(r.ok, false);
    assert.match(r.reason, /private or link-local/i);
  });

  await test('a manifest larger than the cap is refused', async () => {
    freshStore();
    script = () => ({ text: 'x'.repeat(300 * 1024) });
    const c = await checkManifest(SELLER, MANIFEST);
    assert.equal(c.ok, false);
    assert.match(c.reason, /larger than/i);
  });

  await test('an unreachable or broken manifest fails with a reason', async () => {
    freshStore();
    script = () => ({ status: 500 });
    assert.match((await checkManifest(SELLER, MANIFEST)).reason, /HTTP 500/);
    script = () => ({ text: 'not json' });
    assert.match((await checkManifest(SELLER, MANIFEST)).reason, /not valid JSON/);
  });

  // -------------------------------------------------------------------------
  // Claim and receipt stay apart
  // -------------------------------------------------------------------------

  await test('a registered seller with no settlements never enters the seller rows', async () => {
    // The property the whole index rests on. If a claim can sit in `sellers`
    // under the same shape as a receipt, nothing in the response means
    // anything any more.
    freshStore();
    script = () => ({ body: manifest(SELLER) });
    await registerSeller(SELLER, MANIFEST, 'Someone Else');

    const joined = await joinRegistry(chainIndex([OTHER]));
    assert.equal(joined.sellers.length, 1);
    assert.equal(joined.sellers[0].address, OTHER);
    assert.ok(
      !joined.sellers.some((s) => s.address === SELLER),
      'an unpaid registration appeared among rows the chain produced'
    );
    assert.equal(joined.registeredWithoutSettlements.length, 1);
    assert.equal(joined.registeredWithoutSettlements[0].address, SELLER);
  });

  await test('the join adds names and changes no chain figure', async () => {
    freshStore();
    script = () => ({ body: manifest(SELLER) });
    await registerSeller(SELLER, MANIFEST, 'Example Data Co');

    const index = chainIndex([SELLER, OTHER]);
    const joined = await joinRegistry(index);

    assert.equal(joined.sellers[0].profile?.name, 'Example Data Co');
    assert.equal(joined.sellers[0].profile?.itemCount, 2);
    assert.equal(joined.sellers[0].profile?.evidence, 'signature + manifest');
    assert.equal(joined.sellers[1].profile, null, 'an unregistered seller must still be listed');

    for (let i = 0; i < index.sellers.length; i++) {
      const { profile, ...chainPart } = joined.sellers[i];
      assert.deepEqual(chainPart, index.sellers[i], 'the join rewrote chain data');
    }
  });

  await test('a registry that cannot be read costs names, not rows', async () => {
    // The direction of the dependency, enforced: the chain answer must survive
    // the registry being broken.
    const broken = new MemoryKeyedStore<RegisteredSeller>();
    broken.all = async () => { throw new Error('redis is down'); };
    setKeyedStore('seller-registry', broken);

    const index = chainIndex([SELLER, OTHER]);
    const joined = await joinRegistry(index);
    assert.equal(joined.sellers.length, 2);
    assert.equal(joined.sellers[0].profile, null);
    assert.equal(joined.registered, 0);
  });

  await test('the response says where a name came from', async () => {
    freshStore();
    script = () => ({ body: manifest(SELLER) });
    await registerSeller(SELLER, MANIFEST, 'Example Data Co');
    const joined = await joinRegistry(chainIndex([SELLER]));
    assert.match(joined.limits, /signed for them/);
    assert.match(joined.limits, /unregistered, not unreal/);
  });

  // -------------------------------------------------------------------------
  // Staying true over time
  // -------------------------------------------------------------------------

  await test('an entry whose manifest stops naming it is dropped, not kept stale', async () => {
    freshStore();
    script = () => ({ body: manifest(SELLER) });
    await registerSeller(SELLER, MANIFEST, 'Example Data Co');

    // The seller changes their manifest to pay a different address.
    script = () => ({ body: manifest(OTHER) });
    const r = await refreshStale({ now: Date.now() + RECHECK_AFTER_MS + 1 });
    assert.equal(r.rechecked, 1);
    assert.deepEqual(r.dropped, [SELLER]);
    assert.equal(await getRegistration(SELLER), null);
  });

  await test('a manifest we cannot reach keeps the entry rather than deleting it', async () => {
    // The difference between "you no longer qualify" and "your server did not
    // answer". Treating them the same lets one slow minute permanently erase a
    // legitimate registration, and the seller would never learn why.
    freshStore();
    script = () => ({ body: manifest(SELLER) });
    await registerSeller(SELLER, MANIFEST, 'Example Data Co');

    script = () => ({ status: 503 });
    const r = await refreshStale({ now: Date.now() + RECHECK_AFTER_MS + 1 });
    assert.deepEqual(r.dropped, [], 'an unreachable host must not disqualify a seller');
    assert.deepEqual(r.unreachable, [SELLER]);

    const still = await getRegistration(SELLER);
    assert.ok(still, 'the entry was deleted because a fetch failed');
    assert.equal(still!.lastCheck.reachable, false);
    assert.equal(still!.name, 'Example Data Co', 'the entry survived intact');
  });

  await test('a check records whether the manifest was reachable at all', async () => {
    freshStore();
    script = () => ({ status: 500 });
    assert.equal((await checkManifest(SELLER, MANIFEST)).reachable, false);
    script = () => ({ text: 'not json' });
    assert.equal((await checkManifest(SELLER, MANIFEST)).reachable, false);
    script = () => ({ body: manifest(OTHER) });
    const answered = await checkManifest(SELLER, MANIFEST);
    assert.equal(answered.ok, false);
    assert.equal(answered.reachable, true, 'it answered, it just did not name us');
  });

  await test('a registry that cannot be read says so instead of reporting zero', async () => {
    // "0 registered" and "the store did not answer" must never look identical
    // to a caller. Only one of them is a fact.
    const broken = new MemoryKeyedStore<RegisteredSeller>();
    broken.all = async () => { throw new Error('redis is down'); };
    setKeyedStore('seller-registry', broken);

    const joined = await joinRegistry(chainIndex([SELLER]));
    assert.equal(joined.registered, 0);
    assert.match(joined.registryError ?? '', /redis is down/);
  });

  await test('a genuinely empty registry reports no error', async () => {
    freshStore();
    const joined = await joinRegistry(chainIndex([SELLER]));
    assert.equal(joined.registered, 0);
    assert.equal(joined.registryError, null, 'an empty registry is not a failure');
  });

  await test('a fresh entry is not re-fetched', async () => {
    freshStore();
    script = () => ({ body: manifest(SELLER) });
    await registerSeller(SELLER, MANIFEST);
    let calls = 0;
    script = () => { calls++; return { body: manifest(SELLER) }; };
    const r = await refreshStale();
    assert.equal(r.rechecked, 0);
    assert.equal(calls, 0, 'a fresh entry cost somebody else a request');
  });

  await test('refreshing is bounded so a read cannot hang on strangers', async () => {
    freshStore();
    script = () => ({ body: manifest(SELLER) });
    // Twelve stale entries, one request each if unbounded.
    for (let i = 0; i < 12; i++) {
      const addr = `0x${(i + 1).toString(16).padStart(40, '0')}`;
      script = () => ({ body: manifest(addr) });
      await registerSeller(addr, MANIFEST);
    }
    let calls = 0;
    script = (u) => { calls++; return { body: manifest(SELLER) }; };
    const r = await refreshStale({ now: Date.now() + RECHECK_AFTER_MS + 1, limit: 5 });
    assert.equal(r.rechecked, 5);
    assert.ok(calls <= 5, `refresh made ${calls} outbound requests in one read`);
  });

  // -------------------------------------------------------------------------
  // Who may write a row
  // -------------------------------------------------------------------------

  await test('the route takes the address from the proof, never from the body', async () => {
    // Read the route source, because this is the access control. If it ever
    // starts trusting a body field, anyone can register anyone.
    const src = await import('node:fs/promises').then((fs) =>
      fs.readFile('app/api/discovery/register/route.ts', 'utf8')
    );
    assert.match(src, /registerSeller\(\s*proven\.address/, 'register must be called with the proven address');
    assert.ok(!/body\.address/.test(src), 'the route reads an address out of the request body');
    assert.match(src, /proven\.address === null\) return unauthorised/, 'POST must refuse an unproven caller');
  });

  await test('only the address holder can remove their own row', async () => {
    freshStore();
    script = () => ({ body: manifest(SELLER) });
    await registerSeller(SELLER, MANIFEST);
    assert.equal(await unregisterSeller(OTHER), false, 'removed a row that was not theirs');
    assert.ok(await getRegistration(SELLER));
    assert.equal(await unregisterSeller(SELLER), true);
    assert.equal(await getRegistration(SELLER), null);
  });

  await test('re-registering keeps the original registration date', async () => {
    freshStore();
    script = () => ({ body: manifest(SELLER) });
    const first = await registerSeller(SELLER, MANIFEST, 'Example Data Co');
    const second = await registerSeller(SELLER, MANIFEST, 'Renamed Co');
    assert.equal(second.entry?.registeredAt, first.entry?.registeredAt);
    assert.equal(second.entry?.name, 'Renamed Co');
  });

  globalThis.fetch = realFetch;
  console.log(`\n${passed} passed${process.exitCode ? ', FAILURES ABOVE' : ''}\n`);
}

run();
