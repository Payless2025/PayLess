import { NextRequest, NextResponse } from 'next/server';
import { withX402Payment } from '@/lib/x402/middleware';
import {
  findStockToken,
  readStockTransfers,
  pageTransfers,
  STOCK_TOKENS,
  MAX_TRANSFER_RANGE,
} from '@/lib/chains/rwa';
import { chainClient, withRpcRetry } from '@/lib/chains/reader';
import { ROBINHOOD_CHAIN_ID } from '@/lib/chains/config';
import {
  meteredTransferCost,
  TRANSFERS_BASE_FEE,
  TRANSFERS_PER_ROW_FEE,
  TRANSFERS_CEILING,
} from '@/lib/x402/metering';

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
    // Default window is 1000 blocks, not the 5000 cap: at NVDA's observed rate
    // a 5000-block default hit the price ceiling on nearly every first query,
    // which made the metering invisible exactly where it should show.
    const fromBlock = since ? BigInt(since) : head - BigInt(999);
    if (fromBlock > toBlock) {
      return NextResponse.json(
        { success: false, error: `"since" (${fromBlock}) is beyond the chain head (${toBlock}).` },
        { status: 400 }
      );
    }

    const reading = await readStockTransfers(token, fromBlock, toBlock);

    const limit = Math.max(1, Math.min(Number(searchParams.get('limit') || 500), 500));
    const page = pageTransfers(reading.transfers, limit, BigInt(reading.toBlock));
    const transfers = page.rows;

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
        baseFee: TRANSFERS_BASE_FEE,
        perRow: TRANSFERS_PER_ROW_FEE,
        ceiling: TRANSFERS_CEILING,
        charged: meteredTransferCost(transfers.length),
        note: 'Under the upto scheme you pay this metered cost. Under receipt or exact you pay the advertised maximum.',
      },
      truncated: page.truncated,
      ...(page.overlap
        ? { overlap: true, note: 'One block held more rows than the limit; the next page revisits it rather than losing rows.' }
        : {}),
      nextSince: page.nextSince.toString(),
      source: 'Robinhood Chain RPC (live getLogs)',
      retrievedAt: new Date().toISOString(),
    });

    // What this response actually cost, for the payment layer to settle. Rows
    // that were scanned but trimmed by `limit` are not billed: the buyer pays
    // for what they received, not for what the server looked at.
    response.headers.set('x-payment-cost', meteredTransferCost(transfers.length));
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
