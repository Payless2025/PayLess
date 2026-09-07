import { NextRequest, NextResponse } from 'next/server';
import { catchUp, backfill, resetStats } from '@/lib/chains/x402-stats';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * One pass of the settlement scanner.
 *
 * Catch-up first, then a walk further back. Catch-up wins the tie because
 * recent activity is what a reader notices missing; history filling in behind
 * it is invisible by comparison.
 *
 * The window budget is small on purpose. This function is killed at sixty
 * seconds, and the scanner is built so that being killed costs the window in
 * flight and nothing else, but a pass that never finishes also never makes
 * progress worth having. Small and repeated beats ambitious and truncated.
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

  const params = new URL(req.url).searchParams;
  const windows = Math.max(1, Math.min(Number(params.get('windows') || 3), 8));

  try {
    // Destructive, so it is never the default and never implicit.
    if (params.get('reset') === '1') {
      const cleared = await resetStats();
      return NextResponse.json({ success: true, reset: cleared });
    }

    // Leave headroom under the function ceiling so the response is written by
    // us rather than replaced by a gateway timeout. A pass that reports three
    // folded windows is worth more than a 504 that reports nothing, even when
    // both did the same work.
    const deadline = Date.now() + 45_000;
    const forward = await catchUp({ maxWindows: 2, deadline });
    const backward = await backfill({ maxWindows: windows, deadline });
    return NextResponse.json({ success: true, passes: [forward, backward] });
  } catch (error) {
    console.error('[cron/x402-stats]', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 502 }
    );
  }
}
