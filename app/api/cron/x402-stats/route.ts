import { NextRequest, NextResponse } from 'next/server';
import { catchUp, backfill } from '@/lib/chains/x402-stats';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * One pass of the settlement scanner.
 *
 * Catch-up first, then a bounded walk further back. Catch-up wins the tie
 * because recent activity is what a reader notices missing; history filling in
 * slowly behind it is invisible by comparison.
 *
 * Bounded on purpose. The pass has to finish inside a function timeout, so it
 * takes a fixed bite and records where it stopped rather than trying to close
 * 56 million blocks in one go and being killed halfway with nothing written.
 */
function authorised(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  // With no secret configured the route refuses rather than running open. An
  // unauthenticated scanner is a way for anyone to spend our RPC budget.
  if (!secret) return false;
  const header = req.headers.get('authorization');
  return header === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!authorised(req)) {
    return NextResponse.json(
      {
        success: false,
        error: process.env.CRON_SECRET
          ? 'Unauthorised.'
          : 'CRON_SECRET is not configured on this server, so scanning is disabled.',
      },
      { status: 401 }
    );
  }

  const chunks = Math.max(1, Math.min(Number(new URL(req.url).searchParams.get('chunks') || 4), 12));

  try {
    const forward = await catchUp();
    const backward = await backfill({ maxChunks: chunks });
    return NextResponse.json({ success: true, passes: [forward, backward] });
  } catch (error) {
    console.error('[cron/x402-stats]', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 502 }
    );
  }
}
