import { NextRequest, NextResponse } from 'next/server';
import { withX402Payment } from '@/lib/x402/middleware';
import { findStockToken, readStockToken, STOCK_TOKENS } from '@/lib/chains/rwa';
import { ROBINHOOD_CHAIN_ID } from '@/lib/chains/config';

/** One tokenised equity, read live. Accepts a ticker or a contract address. */
async function handler(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('symbol') || searchParams.get('token');

  if (!query) {
    return NextResponse.json(
      {
        success: false,
        error: 'Missing "symbol" parameter',
        available: STOCK_TOKENS.map((t) => t.ticker),
      },
      { status: 400 }
    );
  }

  const token = findStockToken(query);
  if (!token) {
    return NextResponse.json(
      {
        success: false,
        error: `Unknown stock token "${query}"`,
        available: STOCK_TOKENS.map((t) => t.ticker),
      },
      { status: 400 }
    );
  }

  try {
    const data = await readStockToken(token);
    return NextResponse.json({
      success: true,
      chainId: ROBINHOOD_CHAIN_ID,
      data,
      source: 'Robinhood Chain RPC (live contract read)',
      retrievedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[rwa/token]', error);
    return NextResponse.json(
      { success: false, error: 'Could not read that token from Robinhood Chain' },
      { status: 502 }
    );
  }
}

export const GET = withX402Payment(handler);
