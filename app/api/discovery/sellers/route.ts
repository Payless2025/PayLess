import { NextRequest, NextResponse } from 'next/server';
import { readSellers } from '@/lib/chains/sellers';
import { ROBINHOOD_CHAIN_ID } from '@/lib/chains/config';

export const dynamic = 'force-dynamic';

/**
 * Who is actually being paid through x402 on this chain.
 *
 * Free, and derived rather than registered. A directory entry is a claim that
 * somebody filled in a form; a row here is a receipt that somebody was paid,
 * which is a stronger fact and one nobody can list themselves into.
 *
 * It also finds sellers who have never heard of us, because it reads the
 * canonical proxies rather than our own traffic.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const depth = Math.max(1, Math.min(Number(searchParams.get('scan') || 100), 200));

  try {
    const index = await readSellers({ chunks: depth, maxReceipts: 30 });
    return NextResponse.json({
      success: true,
      chainId: ROBINHOOD_CHAIN_ID,
      ...index,
    });
  } catch (error) {
    console.error('[discovery/sellers]', error);
    return NextResponse.json(
      { success: false, error: 'Could not read settlements from Robinhood Chain.' },
      { status: 502 }
    );
  }
}
