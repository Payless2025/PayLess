import { NextRequest, NextResponse } from 'next/server';
import { readStats } from '@/lib/chains/x402-stats';
import { ROBINHOOD_CHAIN_ID } from '@/lib/chains/config';

export const dynamic = 'force-dynamic';

/**
 * x402 on Robinhood Chain over time.
 *
 * Free, and read from folded buckets rather than from the chain, so it answers
 * in milliseconds instead of the twenty minutes a live sweep of 56 million
 * blocks would take.
 *
 * Every response carries its own coverage. A chart of three days and a chart of
 * a three day old chain look identical, and only one of them is true, so the
 * range that was actually scanned travels with the numbers.
 */
export async function GET(_req: NextRequest) {
  try {
    const stats = await readStats();
    return NextResponse.json({
      success: true,
      chainId: ROBINHOOD_CHAIN_ID,
      ...stats,
    });
  } catch (error) {
    console.error('[discovery/stats]', error);
    return NextResponse.json(
      { success: false, error: 'Could not read the settlement history.' },
      { status: 502 }
    );
  }
}
