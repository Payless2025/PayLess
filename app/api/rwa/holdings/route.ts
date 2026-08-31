import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { withX402Payment } from '@/lib/x402/middleware';
import { STOCK_TOKENS, findStockToken, readStockHoldings } from '@/lib/chains/rwa';
import { requireAddress, BadRequest } from '@/lib/chains/reader';
import { ROBINHOOD_CHAIN_ID, ROBINHOOD_EXPLORER_URL } from '@/lib/chains/config';

/**
 * An address's tokenised equity position on Robinhood Chain.
 * Empty holdings are dropped unless ?all=true, so the common case stays small.
 */
async function handler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const owner = requireAddress(searchParams.get('address'), 'address');
    const wanted = searchParams.getAll('symbol');
    const includeEmpty = searchParams.get('all') === 'true';

    const tokens = wanted.length
      ? wanted.map((s) => {
          const t = findStockToken(s);
          if (!t) throw new BadRequest(`Unknown stock token "${s}"`);
          return t;
        })
      : STOCK_TOKENS;

    const all = await readStockHoldings(owner, tokens);
    const held = includeEmpty ? all : all.filter((h) => h.raw !== '0');

    return NextResponse.json({
      success: true,
      chainId: ROBINHOOD_CHAIN_ID,
      data: {
        address: owner,
        positions: held,
        scanned: tokens.length,
        explorer: `${ROBINHOOD_EXPLORER_URL}/address/${owner}`,
      },
      source: 'Robinhood Chain RPC (live balance reads)',
      retrievedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof BadRequest) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    console.error('[rwa/holdings]', error);
    return NextResponse.json(
      { success: false, error: 'Could not read holdings from Robinhood Chain' },
      { status: 502 }
    );
  }
}

export const GET = withX402Payment(handler, undefined, {
  validate: (req) => {
    const a = new URL(req.url).searchParams.get('address');
    if (!a) return 'Missing "address" parameter — nothing was charged.';
    if (!isAddress(a)) return '"address" is not a valid address — nothing was charged.';
    return null;
  },
});
