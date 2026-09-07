import { NextRequest, NextResponse } from 'next/server';
import { readSellers } from '@/lib/chains/sellers';
import { joinRegistry, refreshStale } from '@/lib/chains/seller-registry';
import { ROBINHOOD_CHAIN_ID } from '@/lib/chains/config';

export const dynamic = 'force-dynamic';

/**
 * Who is actually being paid through x402 on this chain, and what they sell.
 *
 * Two kinds of fact, kept apart on purpose. Every row exists because the chain
 * recorded a settlement, which nobody can list themselves into. A `profile` is
 * present only where the address holder signed for it and pointed at a manifest
 * that names them back, so a name is a claim with two locks on it rather than
 * a form somebody filled in.
 *
 * It still finds sellers who have never heard of us, because it reads the
 * canonical proxies rather than our own traffic. Those simply have no profile.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const depth = Math.max(1, Math.min(Number(searchParams.get('scan') || 100), 200));

  try {
    const index = await readSellers({ chunks: depth, maxReceipts: 30 });

    // Drop entries whose manifest stopped naming them before answering, so a
    // stale claim is never served alongside a live receipt. Bounded per call,
    // and a failure here costs names rather than the whole index.
    let refreshed = { rechecked: 0, dropped: [] as string[], unreachable: [] as string[] };
    try {
      refreshed = await refreshStale();
    } catch (error) {
      console.error('[discovery/sellers] registry refresh failed:', error);
    }

    const joined = await joinRegistry(index);
    return NextResponse.json({
      success: true,
      chainId: ROBINHOOD_CHAIN_ID,
      ...joined,
      evidence: {
        row: 'A settlement on a canonical x402 proxy. Read from the chain, not from a signup.',
        profile: 'A signature from that address, plus a manifest at the given URL that names the address back.',
      },
      registryRefresh: refreshed,
      register: '/api/discovery/register',
    });
  } catch (error) {
    console.error('[discovery/sellers]', error);
    return NextResponse.json(
      { success: false, error: 'Could not read settlements from Robinhood Chain.' },
      { status: 502 }
    );
  }
}
