/**
 * The buyer side.
 *
 * Two properties carry the whole thing, and both are about not being gameable.
 *
 * The first is that evidence outranks price. Prices live in manifests, which
 * sellers write and could write anything into; settlement counts live on the
 * chain, which nobody writes. If price won the tie, the way to top this list
 * would be to advertise a number you never honour.
 *
 * The second is that an item paying somebody else is not yours to offer. Without
 * that check a seller could paste a competitor's catalogue into their own
 * manifest and inherit their ranking.
 *
 * Everything else here is about surviving a stranger's JSON, because that is
 * exactly what a manifest is.
 */

import assert from 'node:assert/strict';
import { setKeyedStore, MemoryKeyedStore } from '../lib/x402/keyed-store';
import { route, collectOffers } from '../lib/x402/router';
import { PAYMENT_CONFIG } from '../lib/x402/config';
import type { RegisteredSeller } from '../lib/chains/seller-registry';
import type { SellerTotal } from '../lib/chains/x402-stats';

let passed = 0;
async function test(name: string, fn: () => Promise<void>) {
  try { await fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.log(`  ✗ ${name}\n    ${(e as Error).message}`); process.exitCode = 1; }
}

const PROVEN = '0xbB818E97Cf7A0d0cD8BD0B1e21fe0ce6D8C0b9A1';
const UNPROVEN = '0xAaAaAa1111111111111111111111111111111111';
const OURS = PAYMENT_CONFIG.walletAddress;
const OTHER = '0xBbBbBb2222222222222222222222222222222222';

const realFetch = globalThis.fetch;
let manifests: Record<string, unknown> = {};

function stubFetch() {
  globalThis.fetch = (async (input: any) => {
    const url = typeof input === 'string' ? input : input.url;
    const body = manifests[url];
    if (body === undefined) return new Response('', { status: 404 });
    return new Response(JSON.stringify(body), { status: 200 });
  }) as typeof fetch;
}

function manifest(payTo: string, items: Array<{ path: string; amount: string; desc: string; payTo?: string }>) {
  return {
    x402Version: 1,
    payTo,
    items: items.map((i) => ({
      resource: `https://seller.example${i.path}`,
      method: 'GET',
      accepts: [
        { scheme: 'exact', network: 'eip155:4663', payTo: i.payTo ?? payTo, amount: i.amount },
      ],
      metadata: { description: i.desc, mimeType: 'application/json' },
    })),
  };
}

function seed(registrations: RegisteredSeller[], totals: SellerTotal[]) {
  const reg = new MemoryKeyedStore<RegisteredSeller>();
  for (const r of registrations) reg.put(r.address.toLowerCase(), r);
  setKeyedStore('seller-registry', reg);

  const tot = new MemoryKeyedStore<SellerTotal>();
  for (const t of totals) tot.put(t.address.toLowerCase(), t);
  setKeyedStore('x402-sellers', tot);
}

function reg(address: string, url: string, name: string | null): RegisteredSeller {
  return {
    address,
    manifestUrl: url,
    name,
    registeredAt: '2026-09-01T00:00:00.000Z',
    lastCheck: { at: '2026-09-07T00:00:00.000Z', ok: true, reachable: true, reason: 'ok', itemCount: 1 },
  };
}

function total(address: string, payments: number, volumeBase = '1000000'): SellerTotal {
  return {
    address,
    payments,
    volumeBase,
    firstSeen: '2026-09-01T00:00:00.000Z',
    lastSeen: '2026-09-07T00:00:00.000Z',
  };
}

async function run() {
  console.log('\nbuyer side router\n');
  stubFetch();

  await test('a proven seller outranks a cheaper one with no settlements', async () => {
    // The property that makes this list expensive to game. Advertising 1 base
    // unit must not buy the top slot.
    manifests = {
      'https://a.example/x402': manifest(PROVEN, [{ path: '/aapl', amount: '20000', desc: 'AAPL holdings' }]),
      'https://b.example/x402': manifest(UNPROVEN, [{ path: '/aapl', amount: '1', desc: 'AAPL holdings' }]),
    };
    seed(
      [reg(PROVEN, 'https://a.example/x402', 'Proven Co'), reg(UNPROVEN, 'https://b.example/x402', 'New Co')],
      [total(PROVEN, 23)]
    );

    const q = await route({ need: 'aapl holdings' });
    assert.equal(q.offers.length, 2);
    assert.equal(q.offers[0].seller, PROVEN, 'the cheaper unproven offer took the top slot');
    assert.equal(q.offers[0].paymentsObserved, 23);
    assert.equal(q.offers[1].paymentsObserved, 0);
  });

  await test('among equally proven sellers the cheaper one wins', async () => {
    manifests = {
      'https://a.example/x402': manifest(PROVEN, [{ path: '/aapl', amount: '20000', desc: 'AAPL holdings' }]),
      'https://b.example/x402': manifest(UNPROVEN, [{ path: '/aapl', amount: '5000', desc: 'AAPL holdings' }]),
    };
    seed(
      [reg(PROVEN, 'https://a.example/x402', null), reg(UNPROVEN, 'https://b.example/x402', null)],
      [total(PROVEN, 5), total(UNPROVEN, 5)]
    );
    const q = await route({ need: 'aapl' });
    assert.equal(q.offers[0].amountBase, '5000');
  });

  await test('an item paying somebody else is not this seller offer', async () => {
    // Otherwise a seller pastes a competitor catalogue into their manifest and
    // inherits their ranking.
    manifests = {
      'https://a.example/x402': manifest(PROVEN, [
        { path: '/mine', amount: '10000', desc: 'AAPL holdings' },
        { path: '/theirs', amount: '1', desc: 'AAPL holdings', payTo: OTHER },
      ]),
    };
    seed([reg(PROVEN, 'https://a.example/x402', null)], [total(PROVEN, 9)]);

    const q = await route({ need: 'aapl' });
    assert.equal(q.offers.length, 1, 'an offer paying a third party was listed');
    assert.ok(q.offers[0].resource.endsWith('/mine'));
  });

  await test('our own offers are flagged rather than hidden', async () => {
    // We run the router and sell in it. That conflict is disclosed in the
    // result, not left for a caller to discover.
    manifests = {
      'https://us.example/x402': manifest(OURS, [{ path: '/aapl', amount: '10000', desc: 'AAPL holdings' }]),
      'https://a.example/x402': manifest(PROVEN, [{ path: '/aapl', amount: '10000', desc: 'AAPL holdings' }]),
    };
    seed(
      [reg(OURS, 'https://us.example/x402', 'Payless'), reg(PROVEN, 'https://a.example/x402', 'Proven Co')],
      [total(OURS, 6), total(PROVEN, 23)]
    );

    const q = await route({ need: 'aapl' });
    const mine = q.offers.find((o) => o.seller.toLowerCase() === OURS.toLowerCase());
    assert.ok(mine, 'our own offer vanished from the list');
    assert.equal(mine!.operatedByRouter, true);
    assert.equal(q.offers.find((o) => o.seller === PROVEN)!.operatedByRouter, false);
    assert.match(q.disclosure, /also sells here/);
  });

  await test('we do not rank ourselves above better evidence', async () => {
    manifests = {
      'https://us.example/x402': manifest(OURS, [{ path: '/aapl', amount: '1', desc: 'AAPL holdings' }]),
      'https://a.example/x402': manifest(PROVEN, [{ path: '/aapl', amount: '99999', desc: 'AAPL holdings' }]),
    };
    seed(
      [reg(OURS, 'https://us.example/x402', 'Payless'), reg(PROVEN, 'https://a.example/x402', 'Proven Co')],
      [total(OURS, 6), total(PROVEN, 23)]
    );
    const q = await route({ need: 'aapl' });
    assert.equal(q.offers[0].seller, PROVEN, 'we put ourselves first despite weaker evidence');
  });

  await test('a malformed manifest is skipped, not fatal', async () => {
    // A manifest is a stranger JSON. One bad seller must not be able to take
    // the router down for everyone.
    manifests = {
      'https://bad.example/x402': { items: 'not an array' },
      'https://worse.example/x402': { items: [null, { resource: 42 }, { resource: '/x', accepts: 'nope' }] },
      'https://a.example/x402': manifest(PROVEN, [{ path: '/aapl', amount: '10000', desc: 'AAPL holdings' }]),
    };
    seed(
      [
        reg(UNPROVEN, 'https://bad.example/x402', null),
        reg(OTHER, 'https://worse.example/x402', null),
        reg(PROVEN, 'https://a.example/x402', null),
      ],
      [total(PROVEN, 3)]
    );
    const q = await route({ need: 'aapl' });
    assert.equal(q.offers.length, 1);
    assert.equal(q.sellersConsidered, 3, 'the count must still report what was attempted');
  });

  await test('an unreachable manifest drops from the answer without failing it', async () => {
    manifests = {
      'https://a.example/x402': manifest(PROVEN, [{ path: '/aapl', amount: '10000', desc: 'AAPL holdings' }]),
    };
    seed(
      [reg(PROVEN, 'https://a.example/x402', null), reg(UNPROVEN, 'https://gone.example/x402', null)],
      [total(PROVEN, 3)]
    );
    const q = await route({ need: 'aapl' });
    assert.equal(q.offers.length, 1);
  });

  await test('a price cap excludes offers above it', async () => {
    manifests = {
      'https://a.example/x402': manifest(PROVEN, [
        { path: '/cheap', amount: '5000', desc: 'AAPL holdings' },
        { path: '/dear', amount: '50000', desc: 'AAPL holdings' },
      ]),
    };
    seed([reg(PROVEN, 'https://a.example/x402', null)], [total(PROVEN, 3)]);
    const q = await route({ need: 'aapl', maxAmountBase: '10000' });
    assert.equal(q.offers.length, 1);
    assert.ok(q.offers[0].resource.endsWith('/cheap'));
  });

  await test('an unmatched need returns nothing rather than everything', async () => {
    // Falling back to "here is the whole catalogue" would turn a no-match into
    // a recommendation, which is worse than an empty answer.
    manifests = {
      'https://a.example/x402': manifest(PROVEN, [{ path: '/aapl', amount: '5000', desc: 'AAPL holdings' }]),
    };
    seed([reg(PROVEN, 'https://a.example/x402', null)], [total(PROVEN, 3)]);
    const q = await route({ need: 'weather forecast reykjavik' });
    assert.equal(q.offers.length, 0);
    assert.equal(q.considered, 1, 'it still reports how many offers existed');
  });

  await test('every result says what it cannot tell you', async () => {
    manifests = {
      'https://a.example/x402': manifest(PROVEN, [{ path: '/aapl', amount: '5000', desc: 'AAPL holdings' }]),
    };
    seed([reg(PROVEN, 'https://a.example/x402', null)], [total(PROVEN, 3)]);
    const q = await route({ need: 'aapl' });
    assert.match(q.limits, /claims, not guarantees/);
    assert.match(q.limits, /being paid is not the same as being good/i);
    assert.match(q.limits, /not every seller on the chain/);
    assert.ok(q.offers[0].why.length > 0, 'a ranking with no explanation is a number to trust');
  });

  await test('one resource with several schemes is one offer, not several', async () => {
    // Our own manifest advertises every item under three schemes. Flattening
    // those into three rows told a buyer they had three sellers to choose from
    // when they had one, which is the opposite of what a router is for.
    manifests = {
      'https://a.example/x402': {
        x402Version: 1,
        payTo: PROVEN,
        items: [
          {
            resource: 'https://seller.example/aapl',
            accepts: [
              { scheme: 'receipt', network: 'eip155:4663', payTo: PROVEN, amount: '20000' },
              { scheme: 'exact', network: 'eip155:4663', payTo: PROVEN, amount: '20000' },
              { scheme: 'upto', network: 'eip155:4663', payTo: PROVEN, amount: '15000' },
            ],
            metadata: { description: 'AAPL holdings' },
          },
        ],
      },
    };
    seed([reg(PROVEN, 'https://a.example/x402', null)], [total(PROVEN, 3)]);
    const q = await route({ need: 'aapl' });
    assert.equal(q.offers.length, 1, 'one resource was listed more than once');
    assert.equal(q.offers[0].accepts.length, 3, 'the ways to pay were lost');
    // Ranking uses the cheapest way to pay, not whichever came first.
    assert.equal(q.offers[0].amountBase, '15000');
    assert.match(q.offers[0].why, /receipt\/exact\/upto/);
  });

  await test('metered items are labelled as ceilings, not prices', async () => {
    manifests = {
      'https://a.example/x402': {
        x402Version: 1,
        payTo: PROVEN,
        items: [
          {
            resource: 'https://seller.example/transfers',
            accepts: [{ scheme: 'upto', network: 'eip155:4663', payTo: PROVEN, amount: '50000' }],
            metadata: { description: 'AAPL transfer history', pricing: 'metered' },
          },
        ],
      },
    };
    seed([reg(PROVEN, 'https://a.example/x402', null)], [total(PROVEN, 3)]);
    const q = await route({ need: 'aapl transfer' });
    assert.equal(q.offers[0].pricing, 'metered');
    assert.match(q.offers[0].why, /ceiling/);
  });

  globalThis.fetch = realFetch;
  console.log(`\n${passed} passed${process.exitCode ? ', FAILURES ABOVE' : ''}\n`);
}

run();
