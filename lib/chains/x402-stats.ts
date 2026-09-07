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
async function foldIntoDays(settlements: Settlement[]): Promise<number> {
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

    await days().put(date, {
      date,
      settlements: count,
      volumeBase: volume.toString(),
      sellers: Array.from(sellers),
      facilitators: Array.from(facilitators),
      schemes,
    });
  }

  return touched.size;
}

// ---------------------------------------------------------------------------
// Passes
// ---------------------------------------------------------------------------

export interface PassResult {
  direction: 'backfill' | 'catch-up';
  chunksScanned: number;
  settlementsFound: number;
  daysTouched: number;
  fromBlock: string;
  toBlock: string;
  complete: boolean;
}

/**
 * Walk further back into history.
 *
 * Bounded by chunk count rather than by "until done", so a pass has a
 * predictable cost and can be run on a schedule. History gets closed one pass
 * at a time and the cursor remembers where to resume.
 */
export async function backfill(options: { maxChunks?: number } = {}): Promise<PassResult> {
  const maxChunks = options.maxChunks ?? 10;
  const rpc = chainClient();
  const head = await withRpcRetry(() => rpc.getBlockNumber());

  const cursor = await cursors().get(CURSOR_ID);
  let low = cursor ? BigInt(cursor.low) : head;
  const high = cursor ? BigInt(cursor.high) : head;

  let found = 0;
  let touched = 0;
  let chunks = 0;
  let complete = cursor?.complete ?? false;
  const startedAt = low;

  for (let i = 0; i < maxChunks && low > BigInt(0); i++) {
    const to = low > BigInt(0) ? low - BigInt(1) : BigInt(0);
    const from = to > CHUNK ? to - CHUNK : BigInt(0);
    const settlements = await scanRange(from, to);
    found += settlements.length;
    touched += await foldIntoDays(settlements);
    chunks += 1;
    low = from;
    if (from === BigInt(0)) complete = true;
  }

  await cursors().put(CURSOR_ID, {
    low: low.toString(),
    high: high.toString(),
    complete,
    updatedAt: new Date().toISOString(),
  });

  return {
    direction: 'backfill',
    chunksScanned: chunks,
    settlementsFound: found,
    daysTouched: touched,
    fromBlock: low.toString(),
    toBlock: startedAt.toString(),
    complete,
  };
}

/** Pick up everything that has settled since the last pass. */
export async function catchUp(): Promise<PassResult> {
  const rpc = chainClient();
  const head = await withRpcRetry(() => rpc.getBlockNumber());
  const cursor = await cursors().get(CURSOR_ID);

  // With no cursor there is no history yet, so the first window is simply the
  // most recent one and backfill takes it from there.
  const from = cursor ? BigInt(cursor.high) + BigInt(1) : head > CHUNK ? head - CHUNK : BigInt(0);
  const low = cursor ? BigInt(cursor.low) : from;

  let found = 0;
  let touched = 0;
  let chunks = 0;
  let at = from;

  while (at <= head && chunks < 20) {
    const to = at + CHUNK > head ? head : at + CHUNK;
    const settlements = await scanRange(at, to);
    found += settlements.length;
    touched += await foldIntoDays(settlements);
    chunks += 1;
    at = to + BigInt(1);
  }

  await cursors().put(CURSOR_ID, {
    low: low.toString(),
    high: head.toString(),
    complete: cursor?.complete ?? false,
    updatedAt: new Date().toISOString(),
  });

  return {
    direction: 'catch-up',
    chunksScanned: chunks,
    settlementsFound: found,
    daysTouched: touched,
    fromBlock: from.toString(),
    toBlock: head.toString(),
    complete: cursor?.complete ?? false,
  };
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
      lowestBlockScanned: cursor?.low ?? null,
      highestBlockScanned: cursor?.high ?? null,
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
