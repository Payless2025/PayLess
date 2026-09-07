/**
 * The settlement history behind the chart.
 *
 * The aggregation here has one failure mode that matters more than the rest:
 * a seller who trades on two days is one seller, not two. Getting that wrong
 * inflates every headline number on a public chart, in the flattering
 * direction, which is exactly the kind of error nobody reports as a bug.
 *
 * The second thing under test is coverage. A chart of three scanned days and a
 * chart of a three day old chain are the same picture, and only one of them is
 * true. Every answer has to say which one it is.
 */

import assert from 'node:assert/strict';
import { setKeyedStore, MemoryKeyedStore } from '../lib/x402/keyed-store';
import { readStats, foldWindow, windowOf, type DayBucket } from '../lib/chains/x402-stats';

let passed = 0;
async function test(name: string, fn: () => Promise<void>) {
  try { await fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.log(`  ✗ ${name}\n    ${(e as Error).message}`); process.exitCode = 1; }
}

const ALICE = '0xbB818E97E2000000000000000000000000000001';
const BOB = '0x426f8846B5000000000000000000000000000002';
const FAC = '0xc231248d00000000000000000000000000000003';

function seed(buckets: DayBucket[], cursor?: Record<string, unknown>) {
  const dayStore = new MemoryKeyedStore<DayBucket>();
  for (const b of buckets) dayStore.put(b.date, b);
  setKeyedStore('x402-days', dayStore);

  const cursorStore = new MemoryKeyedStore<any>();
  if (cursor) cursorStore.put('settlements', cursor);
  setKeyedStore('x402-cursor', cursorStore);
}

function day(date: string, over: Partial<DayBucket> = {}): DayBucket {
  return {
    date,
    settlements: 1,
    volumeBase: '1000000',
    sellers: [ALICE],
    facilitators: [FAC],
    schemes: { exact: 1 },
    ...over,
  };
}

async function run() {
  console.log('\nx402 settlement history\n');

  await test('a seller trading on two days counts once in the totals', async () => {
    // The whole reason sellers are stored as lists rather than counts. Summing
    // per-day counts would report two sellers where the chain has one, and the
    // error only ever flatters the chart.
    seed([
      day('2026-09-01', { sellers: [ALICE] }),
      day('2026-09-02', { sellers: [ALICE] }),
    ]);
    const s = await readStats();
    assert.equal(s.totals.sellers, 1, 'the same address was counted twice');
    assert.equal(s.series.length, 2);
    assert.equal(s.series[0].sellers, 1, 'each day still reports its own count');
  });

  await test('distinct sellers across days are unioned, not dropped', async () => {
    seed([
      day('2026-09-01', { sellers: [ALICE] }),
      day('2026-09-02', { sellers: [BOB] }),
      day('2026-09-03', { sellers: [ALICE, BOB] }),
    ]);
    const s = await readStats();
    assert.equal(s.totals.sellers, 2);
  });

  await test('settlements and volume add up across days', async () => {
    seed([
      day('2026-09-01', { settlements: 3, volumeBase: '1500000' }),
      day('2026-09-02', { settlements: 5, volumeBase: '2500000' }),
    ]);
    const s = await readStats();
    assert.equal(s.totals.settlements, 8);
    // 4 USDG at six decimals, formatted rather than left in base units.
    assert.equal(s.totals.volumeUSDG, '4');
    assert.equal(s.series[0].volumeUSDG, '1.5');
  });

  await test('scheme counts merge per scheme', async () => {
    seed([
      day('2026-09-01', { schemes: { exact: 2, upto: 1 } }),
      day('2026-09-02', { schemes: { upto: 3, receipt: 1 } }),
    ]);
    const s = await readStats();
    assert.deepEqual(s.totals.schemes, { exact: 2, upto: 4, receipt: 1 });
  });

  await test('the series comes back in date order whatever order it was stored', async () => {
    // Buckets come out of a hash in no particular order, and a chart drawn from
    // an unsorted series is not wrong so much as unreadable.
    seed([day('2026-09-03'), day('2026-09-01'), day('2026-09-02')]);
    const s = await readStats();
    assert.deepEqual(s.series.map((d) => d.date), ['2026-09-01', '2026-09-02', '2026-09-03']);
  });

  await test('a partial scan says so instead of implying a short history', async () => {
    // The cursor holds window indices; coverage must report blocks. Window 1120
    // starts at block 56,000,000 and window 1136 ends at 56,849,999.
    seed([day('2026-09-01')], {
      low: '1120', high: '1136', complete: false, updatedAt: '2026-09-07T10:00:00.000Z',
    });
    const s = await readStats();
    assert.equal(s.coverage.reachedGenesis, false);
    assert.match(s.coverage.note, /scanned range only/);
    assert.equal(s.coverage.lowestBlockScanned, '56000000');
    assert.equal(s.coverage.highestBlockScanned, '56849999');
    assert.equal(s.coverage.lastPassAt, '2026-09-07T10:00:00.000Z');
  });

  await test('a completed scan claims completeness and only then', async () => {
    seed([day('2026-09-01')], {
      low: '0', high: '1136', complete: true, updatedAt: '2026-09-07T10:00:00.000Z',
    });
    const s = await readStats();
    assert.equal(s.coverage.reachedGenesis, true);
    assert.match(s.coverage.note, /every x402 settlement on this chain/);
  });

  await test('an empty history reports zeros and does not claim coverage', async () => {
    // The state on the very first deploy, before any pass has run. It must not
    // read as "this chain has no x402 activity".
    seed([]);
    const s = await readStats();
    assert.equal(s.totals.settlements, 0);
    assert.equal(s.totals.days, 0);
    assert.equal(s.coverage.reachedGenesis, false);
    assert.equal(s.coverage.lowestBlockScanned, null);
    assert.match(s.coverage.note, /still being walked/);
  });

  await test('volume is reported in USDG, never in base units', async () => {
    // Six decimals is the difference between a cent and ten thousand dollars.
    seed([day('2026-09-01', { volumeBase: '81000' })]);
    const s = await readStats();
    assert.equal(s.totals.volumeUSDG, '0.081');
    assert.ok(!s.totals.volumeUSDG.includes('81000'));
  });

  // -------------------------------------------------------------------------
  // Idempotency: the bug that shipped, pinned so it cannot ship twice
  // -------------------------------------------------------------------------

  await test('a window already folded is never folded again', async () => {
    // The first version folded windows and only recorded progress at the end of
    // a pass. On a function with a sixty second ceiling that means a timeout
    // writes data without writing progress, the next pass repeats the same
    // windows, and the buckets add. Measured against the chain it reported
    // eleven times the real settlement count.
    seed([]);
    const marks = new MemoryKeyedStore<any>();
    await marks.put('1000', { at: '2026-09-07T00:00:00.000Z', settlements: 7 });
    setKeyedStore('x402-windows', marks);

    // No chain client is reachable from a test, so this also proves the skip
    // happens before any RPC call rather than after it.
    const result = await foldWindow(BigInt(1000));
    assert.equal(result.folded, false, 'a marked window was scanned again');
    assert.equal(result.found, 0);
    assert.deepEqual(result.days, []);
  });

  await test('windows are aligned to fixed boundaries, not to where a pass stopped', async () => {
    // Alignment is what makes "have I done this one" answerable at all. Windows
    // that start wherever the last pass happened to stop can never be compared.
    assert.equal(windowOf(BigInt(0)).toString(), '0');
    assert.equal(windowOf(BigInt(49_999)).toString(), '0');
    assert.equal(windowOf(BigInt(50_000)).toString(), '1');
    assert.equal(windowOf(BigInt(56_815_136)).toString(), '1136');
    // Two different blocks in one window must agree, or a window can be folded
    // twice under two different names.
    assert.equal(windowOf(BigInt(56_800_000)).toString(), windowOf(BigInt(56_815_136)).toString());
  });

  console.log(`\n${passed} passed${process.exitCode ? ', FAILURES ABOVE' : ''}\n`);
}

run();
