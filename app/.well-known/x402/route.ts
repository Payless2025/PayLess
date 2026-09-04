import { NextRequest, NextResponse } from 'next/server';
import { buildCatalog } from '@/lib/x402/catalog';
import { PAYMENT_CONFIG } from '@/lib/x402/config';
import { NETWORK, X402_VERSION } from '@/lib/x402/facilitator';

export const dynamic = 'force-dynamic';

/**
 * This server's own manifest: what it sells and how to pay for it.
 *
 * A well-known path so an agent can ask one question of an origin it has never
 * seen, instead of guessing routes and reading 402s one at a time. Free, and
 * free on purpose: charging to find out what things cost would be an odd first
 * impression.
 */
export async function GET(req: NextRequest) {
  const items = await buildCatalog(req);
  return NextResponse.json({
    x402Version: X402_VERSION,
    network: NETWORK,
    payTo: PAYMENT_CONFIG.walletAddress,
    asset: PAYMENT_CONFIG.tokenAddress,
    facilitator: PAYMENT_CONFIG.facilitatorUrl,
    items,
    // Amounts are in base units, as x402 discovery publishes them. Where an
    // item says pricing: metered, that amount is a ceiling and the real charge
    // is decided after the work.
    notes: 'Amounts are base units. Metered items advertise a ceiling, not a price.',
    generatedAt: new Date().toISOString(),
  });
}
