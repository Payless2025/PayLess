import { NextRequest, NextResponse } from 'next/server';
import { withX402Payment } from '@/lib/x402/middleware';
import { readBalances, requireAddress, resolveToken, KNOWN_TOKENS, BadRequest } from '@/lib/chains/reader';
import { ROBINHOOD_CHAIN_ID, ROBINHOOD_EXPLORER_URL } from '@/lib/chains/config';
import { getAddress, isAddress } from 'viem';

/**
 * ETH plus token balances for an address on Robinhood Chain.
 * Pass ?token=SYMBOL|0x… (repeatable) to narrow it; defaults to every token
 * Payless knows about.
 */
async function handler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const owner = requireAddress(searchParams.get('address'), 'address');

    const requested = searchParams.getAll('token');
    const tokens = requested.length
      ? requested.map((t) => resolveToken(t))
      : Object.values(KNOWN_TOKENS).map((a) => getAddress(a));

    const data = await readBalances(owner, tokens);

    return NextResponse.json({
      success: true,
      chainId: ROBINHOOD_CHAIN_ID,
      data: { ...data, explorer: `${ROBINHOOD_EXPLORER_URL}/address/${owner}` },
      source: 'Robinhood Chain RPC (live balance read)',
      retrievedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof BadRequest) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    console.error('[chain/balance]', error);
    return NextResponse.json(
      { success: false, error: 'Could not read balances from Robinhood Chain' },
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
