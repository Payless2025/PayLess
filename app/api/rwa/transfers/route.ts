import { NextRequest, NextResponse } from 'next/server';
import { withX402Payment } from '@/lib/x402/middleware';
import {
  findStockToken,
  readStockTransfers,
  STOCK_TOKENS,
  MAX_TRANSFER_RANGE,
} from '@/lib/chains/rwa';
import { chainClient, withRpcRetry } from '@/lib/chains/reader';
import { ROBINHOOD_CHAIN_ID } from '@/lib/chains/config';

/**
 * Transfer history for one tokenised equity.
 *
 * The first endpoint here whose price is honest about not being knowable in
 * advance. A quiet range returns nothing; an active one returns hundreds of
 * rows, each read from the chain. So it is metered: a base fee for the scan
 * plus a per-row rate, reported to the payment layer through the
 * `x-payment-cost` header. Under the `upto` scheme the buyer signs a ceiling
 * and pays what the result actually cost; a fixed-price payment simply pays
 * the advertised maximum, which is the same bargain every other endpoint
 * already makes.
 */

/** The scan itself, paid even when the range turns out to be empty. */
export const BASE_FEE = 0.002;
/** Each transfer row that comes back. */
export const PER_ROW_FEE = 0.001;
/** The advertised price, which is also the metering cap. */
export const CEILING = 0.05;

export function meteredCost(rows: number): string {
  const cost = BASE_FEE + rows * PER_ROW_FEE;
  return Math.min(cost, CEILING).toFixed(6);
}

async function handler(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('symbol') || searchParams.get('token');
  const token = findStockToken(query || '');
  if (!token) {
    return NextResponse.json(
      { success: false, error: `Unknown stock token "${query}"`, available: STOCK_TOKENS.map((t) => t.ticker) },
      { status: 400 }
    );
  }

  try {
    const head = await withRpcRetry(() => chainClient().getBlockNumber());
    const since = searchParams.get('since');
    const toBlock = head;
    const fromBlock = since ? BigInt(since) : head - BigInt(MAX_TRANSFER_RANGE - 1);
    if (fromBlock > toBlock) {
      return NextResponse.json(
        { success: false, error: `"since" (${fromBlock}) is beyond the chain head (${toBlock}).` },
        { status: 400 }
      );
    }

    const reading = await readStockTransfers(token, fromBlock, toBlock);

    const limit = Math.max(1, Math.min(Number(searchParams.get('limit') || 500), 500));
    const transfers = reading.transfers.slice(-limit);

    const response = NextResponse.json({
      success: true,
      chainId: ROBINHOOD_CHAIN_ID,
      data: {
        token: reading.token,
        canonical: reading.canonical,
        fromBlock: reading.fromBlock,
        toBlock: reading.toBlock,
        count: transfers.length,
        totalInRange: reading.transfers.length,
        transfers,
      },
      pricing: {
        model: 'metered',
        baseFee: BASE_FEE,
        perRow: PER_ROW_FEE,
        ceiling: CEILING,
        charged: meteredCost(transfers.length),
        note: 'Under the upto scheme you pay this metered cost. Under receipt or exact you pay the advertised maximum.',
      },
      nextSince: (BigInt(reading.toBlock) + BigInt(1)).toString(),
      source: 'Robinhood Chain RPC (live getLogs)',
      retrievedAt: new Date().toISOString(),
    });

    // What this response actually cost, for the payment layer to settle. Rows
    // that were scanned but trimmed by `limit` are not billed: the buyer pays
    // for what they received, not for what the server looked at.
    response.headers.set('x-payment-cost', meteredCost(transfers.length));
    return response;
  } catch (error) {
    console.error('[rwa/transfers]', error);
    return NextResponse.json(
      { success: false, error: 'Could not read transfers from Robinhood Chain' },
      { status: 502 }
    );
  }
}

export const GET = withX402Payment(handler, undefined, {
  validate: (req) => {
    const q = new URL(req.url).searchParams;
    const v = q.get('symbol') || q.get('token');
    if (!v) return 'Missing "symbol" parameter — nothing was charged.';
    if (!findStockToken(v)) return `Unknown stock token "${v}" — nothing was charged.`;
    const since = q.get('since');
    if (since && !/^\d+$/.test(since)) return '"since" must be a block number — nothing was charged.';
    return null;
  },
});
