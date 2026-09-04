import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { withX402Payment } from '@/lib/x402/middleware';
import { checkEligibility } from '@/lib/chains/corporate-actions';
import { findStockToken, STOCK_TOKENS } from '@/lib/chains/rwa';
import { ROBINHOOD_CHAIN_ID } from '@/lib/chains/config';

/**
 * Whether an address can receive a tokenised equity, as far as the chain knows.
 *
 * This is the question every builder on a chain with transfer-gated assets ends
 * up needing, and nobody wants to implement twice. It reads the access registry
 * every stock token defers to, plus that token's own pause flags.
 *
 * The answer is bounded on purpose: `canReceive: true` means nothing on chain
 * forbids the transfer. Off-chain eligibility, jurisdiction and anything the
 * issuer enforces outside these contracts are not visible from here, and
 * claiming otherwise would be the kind of assurance that gets someone hurt.
 */
async function handler(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get('address')!;
  const symbol = searchParams.get('symbol') || searchParams.get('token');

  try {
    const result = await checkEligibility(address, symbol ? findStockToken(symbol) : undefined);
    return NextResponse.json({
      success: true,
      chainId: ROBINHOOD_CHAIN_ID,
      data: result,
      scope:
        'On-chain state only: the access registry and the token pause flags. Off-chain eligibility rules are not visible here.',
      source: 'Robinhood Chain RPC',
      retrievedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[rwa/eligibility]', error);
    return NextResponse.json(
      { success: false, error: 'Could not read eligibility from Robinhood Chain' },
      { status: 502 }
    );
  }
}

export const GET = withX402Payment(handler, undefined, {
  validate: (req) => {
    const q = new URL(req.url).searchParams;
    const a = q.get('address');
    if (!a) return 'Missing "address" parameter — nothing was charged.';
    if (!isAddress(a)) return '"address" is not a valid address — nothing was charged.';
    const s = q.get('symbol') || q.get('token');
    if (s && !findStockToken(s)) return `Unknown stock token "${s}" — nothing was charged.`;
    return null;
  },
});
