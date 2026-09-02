import { NextResponse } from 'next/server';
import { supportedKinds, NETWORK, X402_VERSION } from '@/lib/x402/facilitator';
import { isSpentStoreShared, getSpentStore } from '@/lib/x402/spent-store';

// Reports live runtime state, so it must not be answered from a build-time render.
export const dynamic = 'force-dynamic';

/**
 * Discovery. Free, and deliberately verbose about what this facilitator will
 * not do: a client that learns at settle time that the scheme was wrong has
 * already paid.
 */
export async function GET() {
  const shared = isSpentStoreShared();
  let ledgerReachable: boolean | null = null;
  if (shared) {
    const store = getSpentStore() as { ping?: () => Promise<boolean> };
    if (typeof store.ping === 'function') {
      ledgerReachable = await store.ping().catch(() => false);
    }
  }

  return NextResponse.json({
    kinds: supportedKinds(),
    x402Version: X402_VERSION,
    network: NETWORK,
    // Settling without an atomic ledger would let one payment buy a response
    // per warm instance, so the state of that ledger is part of the contract.
    replayLedger: shared ? 'shared' : 'in-memory',
    ledgerReachable,
    notes: {
      order:
        'Call /verify before serving the resource and /settle after. Verify consumes nothing; settle is what makes the payment unusable again.',
      eip3009:
        'USDG on this chain implements neither EIP-3009 nor EIP-2612. A payload built for the canonical exact scheme is rejected at verify rather than failing at settle.',
    },
  });
}
