/**
 * The buying loop.
 *
 * This is the only code here that spends money without a human watching, so
 * the tests are about refusing rather than about succeeding. A buyer that
 * occasionally fails to buy costs a retry. A buyer that occasionally buys
 * something it should not have costs whatever was in the wallet.
 *
 * The property that matters most: the ceiling is checked against the price the
 * seller quotes at payment time, not the one advertised in a manifest. Those
 * can disagree, and only one of them is what gets charged.
 */

process.env.PAYLESS_POLICY_WALLET = '0xE8f98Abe2Aaca504de0Eb1B033F6B0318a8C237B';
process.env.PAYLESS_SESSION_KEY =
  '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';

import assert from 'node:assert/strict';
import { setKeyedStore, MemoryKeyedStore } from '../lib/x402/keyed-store';
import { purchase, fetchByNeed, buyerConfigured } from '../lib/agent/buyer';
import type { RegisteredSeller } from '../lib/chains/seller-registry';
import type { SellerTotal } from '../lib/chains/x402-stats';

let passed = 0;
async function test(name: string, fn: () => Promise<void>) {
  try { await fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.log(`  ✗ ${name}\n    ${(e as Error).message}`); process.exitCode = 1; }
}

const SELLER = '0xbB818E97Cf7A0d0cD8BD0B1e21fe0ce6D8C0b9A1';
const CHEAP = '0xAaAaAa1111111111111111111111111111111111';
const RESOURCE = 'https://seller.example/api/holdings';
const USDG = '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168';
const FACILITATOR = '0x4fD46Ce55eA3E51b771F663bd56b3910D9f39746';
const SPENDER = '0x4020A4f3b7b90ccA423B9fabCc0CE57C6C240002';

const realFetch = globalThis.fetch;
let calls: Array<{ url: string; paid: boolean }> = [];
let quoteAmount = '0.02';
let payOutcome: 'ok' | 'settlement-failed' | 'error' = 'ok';
let manifests: Record<string, unknown> = {};

function challenge(amount: string) {
  return {
    payment: {
      accepts: [
        {
          scheme: 'upto',
          network: 'eip155:4663',
          amount,
          asset: USDG,
          payTo: SELLER,
          extra: { assetTransferMethod: 'permit2', settlement: 'live', spender: SPENDER, facilitator: FACILITATOR },
        },
      ],
    },
  };
}

function stubFetch() {
  globalThis.fetch = (async (input: any, init?: any) => {
    const url = typeof input === 'string' ? input : input.url;
    const paid = Boolean(init?.headers?.['X-Payment']);
    calls.push({ url, paid });

    if (manifests[url] !== undefined) return new Response(JSON.stringify(manifests[url]), { status: 200 });

    if (!paid) return new Response(JSON.stringify(challenge(quoteAmount)), { status: 402 });

    if (payOutcome === 'error') {
      return new Response(JSON.stringify({ error: 'seller exploded' }), { status: 500 });
    }
    if (payOutcome === 'settlement-failed') {
      return new Response(JSON.stringify({ rows: [] }), {
        status: 200,
        headers: { 'x-payment-settlement': 'failed' },
      });
    }
    return new Response(JSON.stringify({ rows: [1, 2, 3] }), {
      status: 200,
      headers: {
        'x-payment-settled-amount': '0.012',
        'x-payment-confirmed': '0x' + 'ab'.repeat(32),
      },
    });
  }) as typeof fetch;
}

function seedRouter(sellers: Array<{ address: string; url: string; amount: string; payments: number }>) {
  const reg = new MemoryKeyedStore<RegisteredSeller>();
  const tot = new MemoryKeyedStore<SellerTotal>();
  manifests = {};
  for (const s of sellers) {
    reg.put(s.address.toLowerCase(), {
      address: s.address,
      manifestUrl: s.url,
      name: null,
      registeredAt: '2026-09-01T00:00:00.000Z',
      lastCheck: { at: '2026-09-08T00:00:00.000Z', ok: true, reachable: true, reason: 'ok', itemCount: 1 },
    });
    tot.put(s.address.toLowerCase(), {
      address: s.address,
      payments: s.payments,
      volumeBase: '1000000',
      firstSeen: '2026-09-01T00:00:00.000Z',
      lastSeen: '2026-09-08T00:00:00.000Z',
    });
    manifests[s.url] = {
      payTo: s.address,
      items: [
        {
          resource: RESOURCE,
          accepts: [{ scheme: 'upto', network: 'eip155:4663', payTo: s.address, amount: s.amount }],
          metadata: { description: 'AAPL holdings', pricing: 'metered' },
        },
      ],
    };
  }
  setKeyedStore('seller-registry', reg);
  setKeyedStore('x402-sellers', tot);
}

async function run() {
  console.log('\nbuying loop\n');
  stubFetch();

  await test('a key and a wallet are required before anything can be bought', async () => {
    assert.equal(buyerConfigured(), true);
  });

  await test('a quote above the stated ceiling is refused before signing', async () => {
    // The property this whole file exists for. The ceiling is checked against
    // what the seller quotes at payment time, because that is what gets
    // charged, and nothing is signed until it passes.
    calls = [];
    quoteAmount = '0.50';
    const r = await purchase(RESOURCE, { maxSpendBase: BigInt(20_000) });
    assert.equal(r.ok, false);
    assert.equal(r.step, 'refused');
    assert.match(r.detail, /above the/);
    assert.equal(calls.filter((c) => c.paid).length, 0, 'it signed and paid despite refusing');
  });

  await test('a quote at exactly the ceiling is allowed', async () => {
    calls = [];
    quoteAmount = '0.02';
    payOutcome = 'ok';
    const r = await purchase(RESOURCE, { maxSpendBase: BigInt(20_000) });
    assert.equal(r.ok, true, r.detail);
    assert.equal(r.receipt?.ceilingUSDG, '0.02');
  });

  await test('the receipt carries the transaction, not just a claim of success', async () => {
    calls = [];
    quoteAmount = '0.02';
    payOutcome = 'ok';
    const r = await purchase(RESOURCE, { maxSpendBase: BigInt(50_000) });
    assert.ok(r.receipt?.txHash, 'a purchase with no transaction hash is unverifiable');
    assert.match(r.receipt!.explorer!, /\/tx\/0x/);
    assert.equal(r.receipt?.chargedUSDG, '0.012', 'the metered charge, not the ceiling');
    assert.deepEqual((r.data as any).rows, [1, 2, 3]);
  });

  await test('a failed settlement is never reported as a success', async () => {
    // The seller served the data but nothing was paid. Reporting ok here would
    // teach an agent that free data is normal and hide a broken facilitator.
    calls = [];
    quoteAmount = '0.02';
    payOutcome = 'settlement-failed';
    const r = await purchase(RESOURCE, { maxSpendBase: BigInt(50_000) });
    assert.equal(r.ok, false);
    assert.equal(r.step, 'pay');
    assert.match(r.detail, /settlement failed/);
    payOutcome = 'ok';
  });

  await test('a seller error is surfaced with its reason', async () => {
    calls = [];
    payOutcome = 'error';
    const r = await purchase(RESOURCE, { maxSpendBase: BigInt(50_000) });
    assert.equal(r.ok, false);
    assert.match(r.detail, /seller exploded/);
    payOutcome = 'ok';
  });

  // -------------------------------------------------------------------------
  // Need in, data out
  // -------------------------------------------------------------------------

  await test('the router top pick is what gets bought', async () => {
    // If this bought anything else, the ranking would be decoration and there
    // would be no way to tell a bad ranking from a bad purchase.
    calls = [];
    quoteAmount = '0.02';
    seedRouter([
      { address: SELLER, url: 'https://a.example/x402', amount: '20000', payments: 23 },
      { address: CHEAP, url: 'https://b.example/x402', amount: '1', payments: 0 },
    ]);
    const r = await fetchByNeed('aapl holdings', { maxSpendBase: BigInt(50_000) });
    assert.equal(r.ok, true, r.detail);
    assert.equal(r.chosen?.seller, SELLER, 'it bought from the cheaper unproven seller');
    assert.equal(r.alternativesConsidered, 2);
    assert.match(r.chosen!.why, /settlements observed/);
  });

  await test('nothing matching the need means a refusal, not a guess', async () => {
    calls = [];
    seedRouter([{ address: SELLER, url: 'https://a.example/x402', amount: '20000', payments: 5 }]);
    const r = await fetchByNeed('weather in reykjavik', { maxSpendBase: BigInt(50_000) });
    assert.equal(r.ok, false);
    assert.equal(r.step, 'refused');
    assert.match(r.detail, /Nobody registered/);
    assert.equal(calls.filter((c) => c.paid).length, 0, 'it paid for something it could not match');
  });

  await test('everything too expensive means a refusal, not the cheapest anyway', async () => {
    calls = [];
    seedRouter([{ address: SELLER, url: 'https://a.example/x402', amount: '90000', payments: 5 }]);
    const r = await fetchByNeed('aapl holdings', { maxSpendBase: BigInt(1_000) });
    assert.equal(r.ok, false);
    assert.equal(r.step, 'refused');
    assert.match(r.detail, /above the limit/);
    assert.equal(calls.filter((c) => c.paid).length, 0);
  });

  await test('every result discloses that we run the router and sell in it', async () => {
    calls = [];
    seedRouter([{ address: SELLER, url: 'https://a.example/x402', amount: '20000', payments: 5 }]);
    const r = await fetchByNeed('aapl holdings', { maxSpendBase: BigInt(50_000) });
    assert.match(r.disclosure, /also sells here/);
    assert.equal(typeof r.chosen?.operatedByRouter, 'boolean');
  });

  await test('the endpoint refuses to spend without a stated ceiling', async () => {
    // Read from the route source: spending somebody's money because they did
    // not say how much is not a default, it is a bug with a fallback value.
    const fs = await import('node:fs/promises');
    const src = await fs.readFile('app/api/agent/fetch/route.ts', 'utf8');
    assert.match(src, /maxSpendUSDG[\s\S]*required|required[\s\S]*maxSpendUSDG/, 'no ceiling is demanded');
    assert.match(src, /status: 400/, 'a missing ceiling must be refused');
    assert.ok(!/maxSpendUSDG\s*\|\|\s*['"]0\.\d/.test(src), 'the route defaults a spend ceiling');
  });

  globalThis.fetch = realFetch;
  console.log(`\n${passed} passed${process.exitCode ? ', FAILURES ABOVE' : ''}\n`);
}

run();
