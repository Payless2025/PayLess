/**
 * Metered pricing for the transfers endpoint, and the clamp between what a
 * handler reports and what an upto settlement takes.
 *
 * The scenario that motivates all of it: "how many transfers in the last 1000
 * blocks" costs nothing to answer on a quiet day and real work on a busy one.
 * A fixed price is wrong in both directions. The buyer signs a ceiling; these
 * are the rules for what actually gets taken under it.
 */

import assert from 'node:assert/strict';
import { meteredSettlement } from '../lib/x402/middleware';
import { meteredTransferCost as meteredCost, TRANSFERS_BASE_FEE as BASE_FEE, TRANSFERS_PER_ROW_FEE as PER_ROW_FEE, TRANSFERS_CEILING as CEILING } from '../lib/x402/metering';
import { readStockTransfers, findStockToken, pageTransfers, type StockTransfer } from '../lib/chains/rwa';
import { chainClient, withRpcRetry } from '../lib/chains/reader';

let passed = 0;
async function test(name: string, fn: () => Promise<void> | void) {
  try { await fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.log(`  ✗ ${name}\n    ${(e as Error).message}`); process.exitCode = 1; }
}

async function run() {
  console.log('\nmetered pricing\n');

  await test('an empty range costs the base fee, not nothing', async () => {
    // The scan itself was work: the chain was queried whether or not anything
    // came back. Free empty results would invite scanning as a hobby.
    assert.equal(meteredCost(0), BASE_FEE.toFixed(6));
  });

  await test('rows are billed linearly under the ceiling', async () => {
    assert.equal(meteredCost(10), (BASE_FEE + 10 * PER_ROW_FEE).toFixed(6));
    assert.equal(meteredCost(1), (BASE_FEE + PER_ROW_FEE).toFixed(6));
  });

  await test('300 rows computes 0.302 and is clamped to the 0.05 ceiling', async () => {
    // The advertised price is a promise. However the metering comes out, the
    // buyer cannot be charged past what the 402 said.
    assert.equal(meteredCost(300), CEILING.toFixed(6));
  });

  await test('the settlement clamp enforces the same promise middleware-side', async () => {
    assert.equal(meteredSettlement('0.3', '0.05'), '0.050000');
    assert.equal(meteredSettlement('0.002', '0.05'), '0.002000');
    assert.equal(meteredSettlement('0.05', '0.05'), '0.050000');
  });

  await test('a broken cost header falls back to the full price, never to zero', async () => {
    // A buggy handler should cost us revenue, not honesty: undefined means
    // "settle the advertised amount", exactly what happens with no metering.
    for (const bad of [null, '', 'free', '-1', '0', 'NaN']) {
      assert.equal(meteredSettlement(bad as any, '0.05'), undefined, `accepted ${JSON.stringify(bad)}`);
    }
  });

  await test('an inverted block range is refused before any RPC call', async () => {
    const nvda = findStockToken('NVDA')!;
    await assert.rejects(
      () => readStockTransfers(nvda, BigInt(100), BigInt(50)),
      /inverted/
    );
  });

  await test('live: reads real NVDA transfers from chain 4663', async () => {
    const nvda = findStockToken('NVDA')!;
    const head = await withRpcRetry(() => chainClient().getBlockNumber());
    const reading = await readStockTransfers(nvda, head - BigInt(199), head);
    assert.equal(reading.canonical, true, 'NVDA should carry the Robinhood Token marker');
    assert.equal(reading.toBlock, head.toString());
    // Transfers may well be zero in a 200-block window; the shape matters.
    for (const t of reading.transfers) {
      assert.match(t.txHash, /^0x[0-9a-f]{64}$/);
      assert.ok(t.explorer.includes(t.txHash));
    }
    console.log(`    (${reading.transfers.length} transfers in the last 200 blocks)`);
  });

  await test('live: a range wider than the cap is clamped and says so', async () => {
    const nvda = findStockToken('NVDA')!;
    const head = await withRpcRetry(() => chainClient().getBlockNumber());
    const reading = await readStockTransfers(nvda, head - BigInt(20000), head);
    const span = BigInt(reading.toBlock) - BigInt(reading.fromBlock) + BigInt(1);
    assert.equal(span, BigInt(5000), `span ${span} — the response must state the range it actually covered`);
  });

  const row = (block: number, i = 0): StockTransfer => ({
    from: '0xA', to: '0xB', amount: '1', amountRaw: '1',
    blockNumber: String(block), txHash: '0x' + String(i).padStart(64, '0'),
    logIndex: i, explorer: 'x',
  });

  await test('pagination advances without losing rows', async () => {
    // The bug this pins: the route used to keep the newest rows and advance
    // `since` past the whole range, so trimmed older rows were paid for,
    // scanned, and unreachable forever.
    const all = [row(10), row(11), row(12), row(13)];
    const page = pageTransfers(all, 2, BigInt(100));
    assert.equal(page.rows.length, 2);
    assert.equal(page.rows[1].blockNumber, '11');
    assert.equal(page.truncated, true);
    assert.equal(page.nextSince, BigInt(12), 'next page must start at the first unseen block');
  });

  await test('a page never splits a block silently', async () => {
    const all = [row(10, 1), row(11, 2), row(11, 3), row(11, 4)];
    const page = pageTransfers(all, 2, BigInt(100));
    // Cutting at 2 would hand over half of block 11; retreat to the boundary.
    assert.deepEqual(page.rows.map((r) => r.blockNumber), ['10']);
    assert.equal(page.nextSince, BigInt(11));
    assert.equal(page.overlap, false);
  });

  await test('a block bigger than the limit overlaps instead of losing rows', async () => {
    const all = [row(11, 1), row(11, 2), row(11, 3)];
    const page = pageTransfers(all, 2, BigInt(100));
    assert.equal(page.rows.length, 2);
    assert.equal(page.overlap, true, 'must admit the next page revisits this block');
    assert.equal(page.nextSince, BigInt(11), 'pointing past it would lose the third row');
  });

  await test('an untruncated page advances past the scanned range', async () => {
    const page = pageTransfers([row(10)], 5, BigInt(100));
    assert.equal(page.truncated, false);
    assert.equal(page.nextSince, BigInt(101));
  });

  console.log(`\n${passed} passed${process.exitCode ? ', FAILURES ABOVE' : ''}\n`);
}

run();
