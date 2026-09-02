import { NextRequest, NextResponse } from 'next/server';
import { buildChallenge, proofConfigured, CHALLENGE_TTL_MS } from '@/lib/x402/wallet-proof';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/challenge {address} — a message to sign.
 *
 * Free, unauthenticated by nature (it is how you become authenticated), and
 * harmless to request for any address: the challenge only becomes worth
 * anything once that address's key signs it.
 */
export async function POST(req: NextRequest) {
  if (!proofConfigured()) {
    return NextResponse.json(
      { error: 'Wallet proof is not configured on this server (PAYLESS_AUTH_SECRET missing).' },
      { status: 503 }
    );
  }

  let address: string | undefined;
  try {
    address = (await req.json())?.address;
  } catch {
    /* handled below */
  }
  if (!address) {
    return NextResponse.json({ error: 'Body must be JSON: {"address":"0x…"}' }, { status: 400 });
  }

  try {
    const challenge = buildChallenge(address);
    return NextResponse.json({
      success: true,
      ...challenge,
      ttlSeconds: CHALLENGE_TTL_MS / 1000,
      howTo:
        'Sign this message with personal_sign (EIP-191), then POST {message, signature} to /api/auth/verify. Signing costs nothing and authorises nothing.',
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not build a challenge' },
      { status: 400 }
    );
  }
}
