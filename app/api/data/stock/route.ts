import { NextRequest, NextResponse } from 'next/server';
import { withX402Payment } from '@/lib/x402/middleware';
import { findStockToken, readStockToken, STOCK_TOKENS } from '@/lib/chains/rwa';
import { ROBINHOOD_CHAIN_ID } from '@/lib/chains/config';

/**
 * This endpoint used to return `Math.random()` dressed up as a stock quote.
 *
 * It now returns the on-chain state of the corresponding Robinhood stock token:
 * real, checkable against the explorer, and about an asset that actually lives
 * on the chain Payless settles on.
 *
 * Note what it is not: a market price feed. Supply is not a quote. If you need
 * last-trade prices, this is the wrong endpoint and we would rather say so than
 * invent a number.
 */
async function handler(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol') || 'NVDA';
  const token = findStockToken(symbol);

  if (!token) {
    return NextResponse.json(
      {
        success: false,
        error: `No Robinhood stock token for "${symbol}"`,
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
      data: {
        symbol: data.symbol,
        name: data.name,
        contract: data.address,
        tokenSupply: data.totalSupplyFormatted,
        decimals: data.decimals,
        canonical: data.canonical,
        explorer: data.explorer,
      },
      disclaimer: 'On-chain token supply, not a market quote.',
      source: 'Robinhood Chain RPC (live contract read)',
      retrievedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[data/stock]', error);
    return NextResponse.json(
      { success: false, error: 'Could not read that token from Robinhood Chain' },
      { status: 502 }
    );
  }
}

export const GET = withX402Payment(handler, undefined, {
  validate: (req) => {
    const sym = new URL(req.url).searchParams.get('symbol') || 'NVDA';
    return findStockToken(sym) ? null : `No Robinhood stock token for "${sym}" — nothing was charged.`;
  },
});
