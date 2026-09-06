/**
 * The chain-wide seller index.
 *
 * The claim under test is not that any particular address appears. It is that
 * a row means what the docs say it means: somebody was paid through x402, read
 * off the canonical proxies rather than off our own traffic or a signup form.
 *
 * The distinction matters because the index is only worth anything if it can
 * find sellers who have never heard of us. If it silently degraded into "our
 * own customers", it would be a directory with extra steps.
 */

import assert from 'node:assert/strict';
import { LIVE, liveNote } from './live';
import { readSellers, X402_PROXIES, SETTLED_TOPIC } from '../lib/chains/sellers';

let passed = 0;
let skipped = 0;
async function test(name: string, fn: () => Promise<void>) {
  if (!LIVE && name.startsWith('live:')) { console.log(`  - ${name} (skipped)`); skipped++; return; }
  try { await fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.log(`  ✗ ${name}\n    ${(e as Error).message}`); process.exitCode = 1; }
}

const TREASURY = '0x426f8846B5011d5aCf659FE5bFBC5fdA6123f759';

async function run() {
  console.log('\nseller index\n');

  await test('watches the canonical proxies, not an address of ours', async () => {
    // If this ever pointed at our own wallet, the index would quietly become a
    // list of our own customers while still calling itself chain-wide.
    assert.equal(X402_PROXIES.exact, '0x402085c248EeA27D92E8b30b2C58ed07f9E20001');
    assert.equal(X402_PROXIES.upto, '0x4020A4f3b7b90ccA423B9fabCc0CE57C6C240002');
  });

  await test('the settled topic matches the proxy event signature', async () => {
    // Wrong topic means an empty index, which reads as "nobody sells here"
    // rather than as a bug.
    assert.equal(SETTLED_TOPIC, '0x97088ec3606cfe8cc112180570d03fcde05f9b8e1bfef8e27784eaf5dd5691b6');
  });

  await test('live: finds sellers, and at least one that is not us', async () => {
    const index = await readSellers({ chunks: 100, maxReceipts: 20 });
    assert.ok(index.sellers.length > 0, 'no sellers found at all');
    const others = index.sellers.filter((s) => s.address.toLowerCase() !== TREASURY.toLowerCase());
    assert.ok(others.length > 0, 'index found only ourselves, which defeats its purpose');
    console.log(`    (${index.sellers.length} sellers, ${index.facilitatorsSeen} facilitators, ${index.settlementsScanned} settlements)`);
  });

  await test('live: every row carries proof rather than a claim', async () => {
    const index = await readSellers({ chunks: 100, maxReceipts: 12 });
    for (const s of index.sellers) {
      assert.match(s.address, /^0x[0-9a-fA-F]{40}$/);
      assert.ok(s.payments > 0, 'a row with no payments is a claim, not a receipt');
      assert.ok(s.schemes.length > 0, 'every payment came through some scheme');
      assert.ok(s.explorer.includes(s.address), 'each row must be checkable');
      assert.ok(BigInt(s.firstSeenBlock) <= BigInt(s.lastSeenBlock));
    }
  });

  await test('live: reports what it scanned, so a sample is not read as a census', async () => {
    const index = await readSellers({ chunks: 20, maxReceipts: 5 });
    assert.ok(index.settlementsScanned > 0);
    assert.ok(Number(index.blocksScanned) > 0);
    assert.match(index.limits, /not a census/);
    // The bound that decides what the data may be used for.
    assert.match(index.limits, /does not say what it sells/);
  });

  console.log(`\n${passed} passed${skipped ? `, ${skipped} skipped` : ''}${process.exitCode ? ', FAILURES ABOVE' : ''}\n`);
}

run();
