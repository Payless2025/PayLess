import { NextRequest, NextResponse } from 'next/server';
import { withX402Payment } from '@/lib/x402/middleware';
import { requireHash, BadRequest } from '@/lib/chains/reader';
import { verifySettlement } from '@/lib/chains/settlement';
import { chainClient, withRpcRetry } from '@/lib/chains/reader';
import { ROBINHOOD_CHAIN_ID, ROBINHOOD_EXPLORER_URL } from '@/lib/chains/config';

/**
 * Payment verification as a service.
 *
 * This is the check Payless runs on itself, exposed for anyone else settling on
 * Robinhood Chain: given a transaction hash, did it actually pay the address you
 * expected, in the token you expected, for at least the amount you expected?
 *
 *   /api/chain/receipt?hash=0x…&to=0x…&amount=0.01&token=USDG
 *
 * With `to` and `amount` it answers a yes/no. Without them it just reports what
 * the transaction did.
 */
async function handler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const hash = requireHash(searchParams.get('hash'), 'hash');
    const to = searchParams.get('to');
    const amount = searchParams.get('amount');
    const token = searchParams.get('token') || undefined;

    // Asked to check a specific payment
    if (to && amount) {
      const result = await verifySettlement({
        txHash: hash,
        expectedRecipient: to,
        expectedAmount: amount,
        expectedToken: token,
        // Reporting on an old transfer is fine here; this endpoint is not
        // gating access, it is answering a question about the past.
        maxAgeMs: Number.MAX_SAFE_INTEGER,
      });

      return NextResponse.json({
        success: true,
        chainId: ROBINHOOD_CHAIN_ID,
        data: {
          hash,
          settled: result.valid,
          pending: result.pending ?? false,
          reason: result.valid ? null : result.error,
          transfer: result.details ?? null,
          explorer: `${ROBINHOOD_EXPLORER_URL}/tx/${hash}`,
        },
        source: 'Robinhood Chain RPC (receipt + log decode)',
        retrievedAt: new Date().toISOString(),
      });
    }

    // Otherwise just describe the transaction
    const rpc = chainClient();
    let receipt;
    try {
      receipt = await withRpcRetry(() => rpc.getTransactionReceipt({ hash }));
    } catch (error) {
      if (/NotFound/.test((error as { name?: string })?.name || '')) {
        return NextResponse.json({
          success: true,
          chainId: ROBINHOOD_CHAIN_ID,
          data: { hash, found: false, pending: true, explorer: `${ROBINHOOD_EXPLORER_URL}/tx/${hash}` },
          source: 'Robinhood Chain RPC',
          retrievedAt: new Date().toISOString(),
        });
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      chainId: ROBINHOOD_CHAIN_ID,
      data: {
        hash,
        found: true,
        status: receipt.status,
        blockNumber: receipt.blockNumber.toString(),
        from: receipt.from,
        to: receipt.to,
        gasUsed: receipt.gasUsed.toString(),
        logCount: receipt.logs.length,
        explorer: `${ROBINHOOD_EXPLORER_URL}/tx/${hash}`,
      },
      source: 'Robinhood Chain RPC (receipt)',
      retrievedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof BadRequest) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    console.error('[chain/receipt]', error);
    return NextResponse.json(
      { success: false, error: 'Could not read the transaction from Robinhood Chain' },
      { status: 502 }
    );
  }
}

export const GET = withX402Payment(handler);
