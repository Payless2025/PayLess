/**
 * x402 on this chain, over time.
 *
 * The seller index answers "who is being paid right now". This answers "what
 * has been happening", which is a different question and a much more expensive
 * one: the chain is at 56.7 million blocks, settlements are sparse, and the
 * public RPC answers a 50,000 block window but rate-limits anything wider. A
 * full sweep is roughly eleven hundred calls, so it cannot happen inside a
 * request no matter how patient the caller is.
 *
 * So the scan and the read are separated. A background pass walks history in
 * bounded steps and folds what it finds into day buckets; the endpoint only
 * ever reads those buckets. That makes the read fast and, more importantly,
 * makes coverage an explicit fact rather than a side effect of how long
 * somebody was willing to wait.
 *
 * Coverage is reported with every answer for the same reason the seller index
 * reports what it scanned. A chart that silently covers three days looks
 * exactly like a chart of a chain that is three days old, and only one of those
 * is true. Every response says which blocks it has seen and whether it has
 * reached the beginning.
 */

import { formatUnits, getAddress, decodeEventLog } from 'viem';
import { chainClient, withRpcRetry } from './reader';
import { USDG_ADDRESS } from './config';
import { X402_PROXIES } from './sellers';
import { keyedStore } from '../x402/keyed-store';

const TRANSFER_EVENT = {
  name: 'Transfer',
  type: 'event',
  inputs: [
    { name: 'from', type: 'address', indexed: true },
    { name: 'to', type: 'address', indexed: true },
    { name: 'value', type: 'uint256', indexed: false },
  ],
} as const;

const SETTLED_EVENT = { name: 'Settled', type: 'event', inputs: [] } as const;

/** The widest window the public RPC answers without rate-limiting. Measured. */
const CHUNK = BigInt(50_000);

/** A day of activity, stored already aggregated so a read never recomputes. */
export interface DayBucket {
  date: string;
  settlements: number;
  /** Base units, kept as a string because JSON has no bigint. */
  volumeBase: string;
  /** Distinct addresses paid that day. Stored as a list so days can be merged. */
  sellers: string[];
  facilitators: string[];
  schemes: Record<string, number>;
}

interface Cursor {
  /** Lowest block folded in. Backfill walks down from here. */
  low: string;
  /** Highest block folded in. Catch-up walks up from here. */
  high: string;
  /** True once a backfill pass found nothing older, so history is complete. */
  complete: boolean;
  updatedAt: string;
}

const days = () => keyedStore<DayBucket>('x402-days');

/**
 * Per-seller running totals, kept alongside the day buckets.
 *
 * The day buckets can answer "how many sellers" but not "how much has this one
 * address been paid", and that second question is the one worth answering:
 * anybody can advertise a price, nobody can fake a settlement count. Folding it
 * here rather than recomputing it means a reader gets it from Redis instead of
 * from a scan of the chain.
 */
export interface SellerTotal {
  address: string;
  payments: number;
  volumeBase: string;
  firstSeen: string;
  lastSeen: string;
}
const sellerTotals = () => keyedStore<SellerTotal>('x402-sellers');
const cursors = () => keyedStore<Cursor>('x402-cursor');
const CURSOR_ID = 'settlements';

// ---------------------------------------------------------------------------
// Scanning
// ---------------------------------------------------------------------------

interface Settlement {
  block: bigint;
  timestamp: number;
  scheme: string;
  seller: string;
  facilitator: string;
  value: bigint;
}

/**
 * Every settlement in one block range, with the money it moved.
 *
 * The seller and the amount come from the USDG transfer inside the settlement
 * transaction rather than from the event, because the event carries no
 * arguments. The block timestamp is fetched per settlement, which is only
 * affordable because settlements are sparse: eight in fifty thousand blocks,
 * measured, so this is eight calls and not fifty thousand.
 */
async function scanRange(fromBlock: bigint, toBlock: bigint): Promise<Settlement[]> {
  const rpc = chainClient();
  const usdg = getAddress(USDG_ADDRESS as `0x${string}`);
  const out: Settlement[] = [];
  const blockTimes = new Map<string, number>();

  for (const [scheme, proxy] of Object.entries(X402_PROXIES)) {
    let logs;
    try {
      logs = await withRpcRetry(() =>
        rpc.getLogs({
          address: proxy as `0x${string}`,
          event: SETTLED_EVENT,
          fromBlock,
          toBlock,
        })
      );
    } catch {
      // A window the node refuses is skipped rather than failing the pass. The
      // cursor still moves, so a permanently bad range cannot wedge the scan.
      continue;
    }

    for (const log of logs) {
      let receipt;
      try {
        receipt = await withRpcRetry(() =>
          rpc.getTransactionReceipt({ hash: log.transactionHash as `0x${string}` })
        );
      } catch {
        continue;
      }

      const blockKey = receipt.blockNumber.toString();
      if (!blockTimes.has(blockKey)) {
        try {
          const block = await withRpcRetry(() =>
            rpc.getBlock({ blockNumber: receipt.blockNumber })
          );
          blockTimes.set(blockKey, Number(block.timestamp));
        } catch {
          continue;
        }
      }
      const timestamp = blockTimes.get(blockKey)!;
      const facilitator = receipt.from ? getAddress(receipt.from) : '';

      for (const entry of receipt.logs) {
        let token: `0x${string}`;
        try {
          token = getAddress(entry.address);
        } catch {
          continue;
        }
        if (token !== usdg) continue;

        let decoded;
        try {
          decoded = decodeEventLog({ abi: [TRANSFER_EVENT], data: entry.data, topics: entry.topics });
        } catch {
          continue;
        }
        const args = decoded.args as unknown as { to: string; value: bigint };
        out.push({
          block: receipt.blockNumber,
          timestamp,
          scheme,
          seller: getAddress(args.to),
          facilitator,
          value: args.value,
        });
      }
    }
  }

  return out;
}

// ---------------------------------------------------------------------------
// Folding into days
// ---------------------------------------------------------------------------

function dayOf(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString().slice(0, 10);
}

/**
 * Fold settlements into stored day buckets.
 *
 * Merging rather than replacing, because a day is filled in by several passes
 * arriving in no particular order: the catch-up pass adds to today while a
 * backfill pass is still working through last month. Seller and facilitator
 * lists are unioned for the same reason, which is also why they are stored as
 * lists rather than counts. A count cannot be merged without double-counting
 * whoever appears in both passes.
 */
async function foldIntoDays(settlements: Settlement[]): Promise<string[]> {
  const touched = new Map<string, Settlement[]>();
  for (const s of settlements) {
    const d = dayOf(s.timestamp);
    const list = touched.get(d) ?? [];
    list.push(s);
    touched.set(d, list);
  }

  for (const [date, list] of Array.from(touched.entries())) {
    const existing = await days().get(date);
    const sellers = new Set(existing?.sellers ?? []);
    const facilitators = new Set(existing?.facilitators ?? []);
    const schemes: Record<string, number> = { ...(existing?.schemes ?? {}) };
    let volume = BigInt(existing?.volumeBase ?? '0');
    let count = existing?.settlements ?? 0;

    for (const s of list) {
      count += 1;
      volume += s.value;
      sellers.add(s.seller);
      if (s.facilitator) facilitators.add(s.facilitator);
      schemes[s.scheme] = (schemes[s.scheme] ?? 0) + 1;
    }

    // Per-seller totals ride along with the same fold, so they inherit the
    // window guard that makes the fold safe to repeat.
    for (const s of list) {
      const id = s.seller.toLowerCase();
      const prev = await sellerTotals().get(id);
      const iso = new Date(s.timestamp * 1000).toISOString();
      await sellerTotals().put(id, {
        address: s.seller,
        payments: (prev?.payments ?? 0) + 1,
        volumeBase: (BigInt(prev?.volumeBase ?? '0') + s.value).toString(),
        firstSeen: prev && prev.firstSeen < iso ? prev.firstSeen : iso,
        lastSeen: prev && prev.lastSeen > iso ? prev.lastSeen : iso,
      });
    }

    await days().put(date, {
      date,
      settlements: count,
      volumeBase: volume.toString(),
      sellers: Array.from(sellers),
      facilitators: Array.from(facilitators),
      schemes,
    });
  }

  return Array.from(touched.keys());
}
// ---------------------------------------------------------------------------
// Passes
// ---------------------------------------------------------------------------

/**
 * Scanning is organised around fixed windows, and every window is folded at
 * most once.
 *
 * The first version of this walked from a cursor and wrote that cursor only
 * after the whole pass finished. On a serverless function with a sixty second
 * ceiling that is a data corruption bug waiting for a slow RPC: the pass folds
 * three windows, gets killed, never records progress, and the next pass folds
 * those same three windows again. The buckets add rather than replace, so the
 * numbers grow every time. Measured against the chain it reported eleven times
 * the real settlement count.
 *
 * So progress is not a position any more, it is a set of completed windows.
 * Windows are aligned to fixed block boundaries rather than to wherever the
 * last pass happened to stop, which is what makes "have I already done this
 * one" a question with an answer. Re-running a pass, running two at once, or
 * being killed halfway now costs time and nothing else.
 */

/** A pass that did nothing because its budget was already spent. */
function outOfTime(direction: 'backfill' | 'catch-up'): PassResult {
  return {
    direction,
    windowsScanned: 0,
    windowsSkipped: 0,
    settlementsFound: 0,
    daysTouched: 0,
    fromBlock: '0',
    toBlock: '0',
    complete: false,
  };
}

/** Window W covers blocks [W * CHUNK, W * CHUNK + CHUNK - 1]. */
export function windowOf(block: bigint): bigint {
  return block / CHUNK;
}

interface WindowMark {
  at: string;
  settlements: number;
}

const windows = () => keyedStore<WindowMark>('x402-windows');

export interface PassResult {
  direction: 'backfill' | 'catch-up';
  windowsScanned: number;
  windowsSkipped: number;
  settlementsFound: number;
  daysTouched: number;
  fromBlock: string;
  toBlock: string;
  complete: boolean;
}

/**
 * Fold one window, unless it has already been folded.
 *
 * The marker is written after the fold, not before. A crash between the two
 * leaves the window unmarked and it gets folded again, which is the one case
 * this design still double counts. Marking first would instead lose a window
 * silently, and a gap in a chart is harder to notice than a spike.
 */
export async function foldWindow(index: bigint): Promise<{ folded: boolean; found: number; days: string[] }> {
  const id = index.toString();
  if (await windows().get(id)) return { folded: false, found: 0, days: [] };

  const from = index * CHUNK;
  const to = from + CHUNK - BigInt(1);
  const settlements = await scanRange(from, to);
  const days = await foldIntoDays(settlements);
  await windows().put(id, { at: new Date().toISOString(), settlements: settlements.length });
  return { folded: true, found: settlements.length, days };
}

async function readCursor(): Promise<Cursor | null> {
  return cursors().get(CURSOR_ID);
}

async function writeCursor(low: bigint, high: bigint, complete: boolean) {
  await cursors().put(CURSOR_ID, {
    low: low.toString(),
    high: high.toString(),
    complete,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Walk further back into history, one window at a time.
 *
 * The cursor moves after every window rather than after the pass, so being
 * killed costs the window in flight and nothing behind it.
 */
export async function backfill(
  options: { maxWindows?: number; deadline?: number } = {}
): Promise<PassResult> {
  const maxWindows = options.maxWindows ?? 4;
  // A wall clock budget as well as a window budget. Window cost is wildly
  // uneven: a quiet window is two RPC calls and a busy one is several hundred,
  // so "three windows" can mean two seconds or two minutes. Without a deadline
  // the pass gets killed by the platform mid-window and reports nothing at all,
  // which is how this looked from outside: HTTP 504 and no progress. Stopping
  // early is safe precisely because the cursor moves per window.
  const deadline = options.deadline ?? Number.POSITIVE_INFINITY;
  // Checked before the first chain call, not only between windows. Arriving
  // here already out of time should cost nothing at all.
  if (Date.now() > deadline) return outOfTime('backfill');

  const rpc = chainClient();
  const head = await withRpcRetry(() => rpc.getBlockNumber());
  const headWindow = windowOf(head);

  const cursor = await readCursor();
  let low = cursor ? BigInt(cursor.low) : headWindow;
  const high = cursor ? BigInt(cursor.high) : headWindow;
  let complete = cursor?.complete ?? false;

  const startedAt = low;
  const touched = new Set<string>();
  let found = 0;
  let scanned = 0;
  let skipped = 0;

  for (let i = 0; i < maxWindows && low > BigInt(0); i++) {
    if (Date.now() > deadline) break;
    const next = low - BigInt(1);
    const result = await foldWindow(next);
    if (result.folded) {
      scanned += 1;
      found += result.found;
      result.days.forEach((d) => touched.add(d));
    } else {
      skipped += 1;
    }
    low = next;
    if (low === BigInt(0)) complete = true;
    await writeCursor(low, high, complete);
  }

  return {
    direction: 'backfill',
    windowsScanned: scanned,
    windowsSkipped: skipped,
    settlementsFound: found,
    daysTouched: touched.size,
    fromBlock: (low * CHUNK).toString(),
    toBlock: (startedAt * CHUNK).toString(),
    complete,
  };
}

/** Pick up whatever has settled since the last pass, same window rules. */
export async function catchUp(
  options: { maxWindows?: number; deadline?: number } = {}
): Promise<PassResult> {
  const maxWindows = options.maxWindows ?? 4;
  const deadline = options.deadline ?? Number.POSITIVE_INFINITY;
  if (Date.now() > deadline) return outOfTime('catch-up');

  const rpc = chainClient();
  const head = await withRpcRetry(() => rpc.getBlockNumber());
  const headWindow = windowOf(head);

  const cursor = await readCursor();
  // With no cursor there is no history yet. Starting at the head window means
  // the first answer is about now, and backfill fills in behind it.
  let high = cursor ? BigInt(cursor.high) : headWindow;
  const low = cursor ? BigInt(cursor.low) : headWindow;
  const complete = cursor?.complete ?? false;

  const startedAt = high;
  const touched = new Set<string>();
  let found = 0;
  let scanned = 0;
  let skipped = 0;

  // The head window is re-folded only if it was never marked, so a window that
  // was scanned while still filling is not silently frozen half done.
  for (let i = 0; i < maxWindows && high <= headWindow; i++) {
    if (Date.now() > deadline) break;
    const result = await foldWindow(high);
    if (result.folded) {
      scanned += 1;
      found += result.found;
      result.days.forEach((d) => touched.add(d));
    } else {
      skipped += 1;
    }
    if (high === headWindow) break;
    high += BigInt(1);
    await writeCursor(low, high, complete);
  }

  await writeCursor(low, high, complete);

  return {
    direction: 'catch-up',
    windowsScanned: scanned,
    windowsSkipped: skipped,
    settlementsFound: found,
    daysTouched: touched.size,
    fromBlock: (startedAt * CHUNK).toString(),
    toBlock: (high * CHUNK + CHUNK - BigInt(1)).toString(),
    complete,
  };
}

/**
 * Throw away everything folded so far.
 *
 * Needed because the buckets are sums: once a bad pass has added the same
 * window twice there is no way to subtract it, and the only honest repair is
 * to count again from nothing.
 */
export async function resetStats(): Promise<{
  daysCleared: number;
  windowsCleared: number;
  sellersCleared: number;
}> {
  const [dayIds, windowIds, sellerIds] = await Promise.all([
    days().entries(),
    windows().entries(),
    sellerTotals().entries(),
  ]);
  for (const [id] of dayIds) await days().delete(id);
  for (const [id] of windowIds) await windows().delete(id);
  for (const [id] of sellerIds) await sellerTotals().delete(id);
  await cursors().delete(CURSOR_ID);
  return {
    daysCleared: dayIds.length,
    windowsCleared: windowIds.length,
    sellersCleared: sellerIds.length,
  };
}

/** What the chain says about one address, read from folded totals. */
export async function readSellerTotal(address: string): Promise<SellerTotal | null> {
  return sellerTotals().get(address.toLowerCase());
}

export async function readAllSellerTotals(): Promise<SellerTotal[]> {
  return sellerTotals().all();
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

export interface StatsSeriesDay {
  date: string;
  settlements: number;
  volumeUSDG: string;
  sellers: number;
  facilitators: number;
  schemes: Record<string, number>;
}

export interface X402Stats {
  series: StatsSeriesDay[];
  totals: {
    settlements: number;
    volumeUSDG: string;
    sellers: number;
    facilitators: number;
    schemes: Record<string, number>;
    days: number;
  };
  coverage: {
    lowestBlockScanned: string | null;
    highestBlockScanned: string | null;
    reachedGenesis: boolean;
    lastPassAt: string | null;
    /** Said plainly, because a partial chart and a short history look alike. */
    note: string;
  };
  source: string;
  retrievedAt: string;
}

/** The series as stored. No chain calls: this is a read of folded buckets. */
export async function readStats(): Promise<X402Stats> {
  const [buckets, cursor] = await Promise.all([days().all(), cursors().get(CURSOR_ID)]);

  const series = buckets
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((b) => ({
      date: b.date,
      settlements: b.settlements,
      volumeUSDG: formatUnits(BigInt(b.volumeBase), 6),
      sellers: b.sellers.length,
      facilitators: b.facilitators.length,
      schemes: b.schemes,
    }));

  const allSellers = new Set<string>();
  const allFacilitators = new Set<string>();
  const schemes: Record<string, number> = {};
  let settlements = 0;
  let volume = BigInt(0);

  for (const b of buckets) {
    settlements += b.settlements;
    volume += BigInt(b.volumeBase);
    b.sellers.forEach((s) => allSellers.add(s));
    b.facilitators.forEach((f) => allFacilitators.add(f));
    for (const [k, v] of Object.entries(b.schemes)) schemes[k] = (schemes[k] ?? 0) + v;
  }

  return {
    series,
    totals: {
      settlements,
      volumeUSDG: formatUnits(volume, 6),
      sellers: allSellers.size,
      facilitators: allFacilitators.size,
      schemes,
      days: series.length,
    },
    coverage: {
      // The cursor stores window indices, because that is what "already done"
      // is tracked by. Callers care about blocks, so the conversion happens
      // here rather than leaking an internal unit into a public field.
      lowestBlockScanned: cursor ? (BigInt(cursor.low) * CHUNK).toString() : null,
      highestBlockScanned: cursor
        ? (BigInt(cursor.high) * CHUNK + CHUNK - BigInt(1)).toString()
        : null,
      reachedGenesis: cursor?.complete ?? false,
      lastPassAt: cursor?.updatedAt ?? null,
      note: cursor?.complete
        ? 'History has been scanned back to the first block, so this is every x402 settlement on this chain.'
        : 'History is still being walked backwards. This covers the scanned range only, and earlier activity is not missing from the chain, only from this index.',
    },
    source: 'Settled events on the canonical x402 proxies, and the USDG transfers inside those settlements',
    retrievedAt: new Date().toISOString(),
  };
}
