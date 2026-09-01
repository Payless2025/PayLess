import { NextRequest, NextResponse } from 'next/server';
import { verify, NETWORK, X402_VERSION } from '@/lib/x402/facilitator';

export const dynamic = 'force-dynamic';

/**
 * Is this payment good?
 *
 * Consumes nothing, so it is safe to call twice. Sellers should call it before
 * serving the resource, and /settle after.
 */
export async function POST(req: NextRequest) {
  let body: { paymentRequirements?: any; paymentPayload?: any };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { isValid: false, invalidReason: 'Body must be JSON: { paymentRequirements, paymentPayload }' },
      { status: 400 }
    );
  }

  const result = await verify(body.paymentRequirements, body.paymentPayload);

  // 200 even when invalid: the question was answered. A non-2xx would be
  // reserved for this facilitator failing, not for the payment being bad.
  return NextResponse.json({ ...result, network: NETWORK, x402Version: X402_VERSION });
}
