import { NextRequest, NextResponse } from 'next/server';
import { withX402Payment } from '@/lib/x402/middleware';
import { readErc20, resolveToken, BadRequest } from '@/lib/chains/reader';
import { ROBINHOOD_CHAIN_ID, ROBINHOOD_EXPLORER_URL } from '@/lib/chains/config';

/**
 * Live ERC-20 metadata from Robinhood Chain. Real contract reads — the numbers
 * here come off chain 4663, not from a fixture.
 */
async function handler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = resolveToken(searchParams.get('token'));
    const info = await readErc20(token);

    return NextResponse.json({
      success: true,
      chainId: ROBINHOOD_CHAIN_ID,
      data: {
        ...info,
        explorer: `${ROBINHOOD_EXPLORER_URL}/token/${info.address}`,
      },
      source: 'Robinhood Chain RPC (live contract read)',
      retrievedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof BadRequest) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    console.error('[chain/token]', error);
    return NextResponse.json(
      { success: false, error: 'Could not read the token from Robinhood Chain' },
      { status: 502 }
    );
  }
}

export const GET = withX402Payment(handler, undefined, {
  validate: (req) =>
    new URL(req.url).searchParams.get('token')
      ? null
      : 'Missing "token" parameter — nothing was charged.',
});
