import { NextResponse } from 'next/server';
import { readChainMetrics } from '@/lib/chains/metrics';

export const dynamic = 'force-dynamic';

/**
 * Three honest numbers. Free, because "what's your volume" should never cost
 * anything to ask, and unfakeable, because every figure links to the explorer
 * page that proves it.
 */
export async function GET() {
  try {
    const metrics = await readChainMetrics();
    return NextResponse.json({ success: true, ...metrics });
  } catch (error) {
    // An error is not a reason to show invented numbers. It is a reason to
    // say the index is unreachable.
    return NextResponse.json(
      { success: false, error: 'Chain index unreachable right now. No numbers beat made-up numbers.' },
      { status: 502 }
    );
  }
}
