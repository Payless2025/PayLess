/**
 * The catalogue an agent reads before spending anything.
 *
 * What it replaces: calling five endpoints to learn five prices. The shape is
 * not ours — it matches what production x402 facilitators already publish — so
 * these tests mostly pin conformance to somebody else's convention, which is
 * the point.
 */

import assert from 'node:assert/strict';
import { buildCatalog } from '../lib/x402/catalog';
import { ENDPOINT_PRICING, FREE_ENDPOINTS } from '../lib/x402/config';

let passed = 0;
async function test(name: string, fn: () => Promise<void>) {
  try { await fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.log(`  ✗ ${name}\n    ${(e as Error).message}`); process.exitCode = 1; }
}

async function run() {
  console.log('\ncatalog\n');
  const items = await buildCatalog();

  await test('lists every priced endpoint and nothing else', async () => {
    // Free endpoints are absent on purpose: an agent budgeting from this list
    // would otherwise reserve money for requests it never has to pay for.
    assert.equal(items.length, Object.keys(ENDPOINT_PRICING).length);
    const paths = items.map((i) => new URL(i.resource).pathname).sort();
    assert.deepEqual(paths, Object.keys(ENDPOINT_PRICING).sort());
    for (const free of FREE_ENDPOINTS ?? []) {
      assert.ok(!paths.includes(free), `free endpoint ${free} leaked into the catalogue`);
    }
  });

  await test('amounts are base units, converted without floating point', async () => {
    // 0.01 * 10 ** 6 is not reliably 10000, and a client signing 9999 fails for
    // reasons nobody can read off a revert.
    const token = items.find((i) => i.resource.endsWith('/api/chain/token'))!;
    assert.equal(token.accepts[0].amount, '10000');
    const receipt = items.find((i) => i.resource.endsWith('/api/chain/receipt'))!;
    assert.equal(receipt.accepts[0].amount, '20000');
    for (const item of items) {
      for (const a of item.accepts) {
        assert.match(a.amount, /^\d+$/, `${item.resource} amount is not an integer string`);
      }
    }
  });

  await test('a metered item says so, because its amount is a ceiling', async () => {
    const metered = items.find((i) => i.resource.endsWith('/api/rwa/transfers'))!;
    assert.equal(metered.metadata.pricing, 'metered');
    assert.equal(metered.accepts.find((a) => a.scheme === 'upto')?.extra?.pricing, 'metered');

    const fixed = items.find((i) => i.resource.endsWith('/api/chain/token'))!;
    assert.equal(fixed.metadata.pricing, 'fixed');
    assert.notEqual(fixed.accepts[0].extra?.pricing, 'metered');
  });

  await test('every item carries what a client needs to pay it', async () => {
    for (const item of items) {
      assert.ok(item.resource.startsWith('http'), 'resource must be a URL');
      assert.equal(item.type, 'http');
      assert.equal(item.x402Version, 2);
      assert.ok(item.accepts.length > 0, `${item.resource} has no way to pay it`);
      for (const a of item.accepts) {
        assert.match(a.network, /^eip155:\d+$/, 'network must be CAIP-2');
        assert.ok(a.payTo && a.asset, 'accepts needs payTo and asset');
        assert.ok(a.maxTimeoutSeconds > 0);
      }
    }
  });

  await test('every item describes what it returns, not which route serves it', async () => {
    // A catalogue entry with no honest description is worse than absent: it
    // invites an agent to buy something it cannot evaluate.
    for (const item of items) {
      const d = item.metadata.description;
      assert.ok(d && d.length > 20, `${item.resource} has no real description`);
      assert.ok(!d.includes('/api/'), `${item.resource} describes a route, not its data`);
    }
  });

  await test('the origin follows the request rather than being hardcoded', async () => {
    // So a self-hosted instance advertises itself, not us.
    const mine = await buildCatalog(new Request('https://seller.example/anything'));
    assert.ok(mine.every((i) => i.resource.startsWith('https://seller.example/')));
  });

  console.log(`\n${passed} passed${process.exitCode ? ', FAILURES ABOVE' : ''}\n`);
}

run();
