import { NextRequest, NextResponse } from 'next/server';
import { withX402Payment } from '@/lib/x402/middleware';
import { STOCK_TOKENS, readStockToken } from '@/lib/chains/rwa';
import { ROBINHOOD_CHAIN_ID } from '@/lib/chains/config';

/**
 * Every Robinhood stock token Payless tracks, with supply read live from
 * chain 4663. No upstream API key, and every number is checkable against the
 * explorer link that comes back with it.
 */
async function handler(_req: NextRequest) {
  try {
    const rows = await Promise.all(STOCK_TOKENS.map(readStockToken));
    return NextResponse.json({
      success: true,
      chainId: ROBINHOOD_CHAIN_ID,
      count: rows.length,
      data: rows,
      note: 'Canonical list: https://docs.robinhood.com/chain/contracts/ — verify before trusting any ticker.',
      source: 'Robinhood Chain RPC (live contract reads)',
      retrievedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[rwa/tokens]', error);
    return NextResponse.json(
      { success: false, error: 'Could not read stock tokens from Robinhood Chain' },
      { status: 502 }
    );
  }
}

export const GET = withX402Payment(handler);
