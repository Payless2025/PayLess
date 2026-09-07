import { NextRequest, NextResponse } from 'next/server';
import { route } from '@/lib/x402/router';
import { ROBINHOOD_CHAIN_ID } from '@/lib/chains/config';

export const dynamic = 'force-dynamic';

/**
 * Where should an agent buy this?
 *
 * Free, because a router that charged to tell you where to spend would be
 * choosing between your interest and its own on every request.
 *
 *   GET /api/route?need=aapl holdings&max=50000&limit=5
 *
 * Ranked by match, then by settlements observed on chain, then by price.
 * Evidence sits above price deliberately: the cheapest offer from an address
 * that has never settled anything is an untested claim, not a bargain.
 */
export async function GET(req: NextRequest) {
  const params = new URL(req.url).searchParams;

  try {
    const quote = await route({
      need: params.get('need'),
      limit: Number(params.get('limit') || 10),
      maxAmountBase: params.get('max'),
    });

    return NextResponse.json({
      success: true,
      chainId: ROBINHOOD_CHAIN_ID,
      ...quote,
      howTo:
        'Each offer names a resource, a scheme and an amount. Pay it the way its scheme says and call the resource; nothing is bought here.',
    });
  } catch (error) {
    console.error('[route]', error);
    return NextResponse.json(
      { success: false, error: 'Could not build a quote.' },
      { status: 502 }
    );
  }
}
