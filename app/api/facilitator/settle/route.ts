import { NextRequest, NextResponse } from 'next/server';
import { settle, X402_VERSION } from '@/lib/x402/facilitator';

export const dynamic = 'force-dynamic';

/**
 * Consume the payment, after the resource has been served.
 *
 * In the receipt scheme nothing is broadcast here, because the buyer already
 * moved the money. What this does is claim it atomically, which is the part a
 * seller cannot do for themselves across more than one instance.
 */
export async function POST(req: NextRequest) {
  let body: { paymentRequirements?: any; paymentPayload?: any };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, errorReason: 'Body must be JSON: { paymentRequirements, paymentPayload }' },
      { status: 400 }
    );
  }

  const result = await settle(body.paymentRequirements, body.paymentPayload);
  return NextResponse.json({ ...result, x402Version: X402_VERSION });
}
