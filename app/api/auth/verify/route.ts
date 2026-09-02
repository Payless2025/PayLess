import { NextRequest, NextResponse } from 'next/server';
import { verifyChallenge, issueToken, proofConfigured } from '@/lib/x402/wallet-proof';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/verify {message, signature} — trade a signed challenge for a
 * short-lived bearer token. The token is what gated endpoints accept; the
 * signature is checked here once so they do not each have to.
 */
export async function POST(req: NextRequest) {
  if (!proofConfigured()) {
    return NextResponse.json(
      { error: 'Wallet proof is not configured on this server (PAYLESS_AUTH_SECRET missing).' },
      { status: 503 }
    );
  }

  let body: { message?: string; signature?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body must be JSON: {message, signature}' }, { status: 400 });
  }
  if (!body.message || !body.signature) {
    return NextResponse.json({ error: 'Both "message" and "signature" are required.' }, { status: 400 });
  }

  const proof = await verifyChallenge(body.message, body.signature);
  if (!proof.ok) {
    return NextResponse.json({ error: proof.reason }, { status: 401 });
  }

  const { token, expiresAt } = issueToken(proof.address!);
  return NextResponse.json({
    success: true,
    address: proof.address,
    token,
    expiresAt,
    howTo: 'Send it as "Authorization: Bearer <token>" on token-gated requests.',
  });
}
