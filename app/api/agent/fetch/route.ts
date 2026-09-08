import { NextRequest, NextResponse } from 'next/server';
import { fetchByNeed, buyerConfigured } from '@/lib/agent/buyer';
import { agentState } from '@/lib/agent/session-agent';
import { consume, callerKey, rateHeaders } from '@/lib/x402/rate-limit';
import { ROBINHOOD_CHAIN_ID } from '@/lib/chains/config';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Say what you need. Get the data and the transaction that paid for it.
 *
 *   POST /api/agent/fetch { "need": "aapl holdings", "maxSpendUSDG": "0.05" }
 *
 * This spends real money from a policy wallet, so it is the one endpoint here
 * that is rate limited hard and capped three separate ways: the caller's own
 * ceiling, the per-call cap the wallet enforces on chain, and the wallet's
 * float. Only the middle one is a guarantee, which is why it is the one written
 * into a contract rather than into this file.
 *
 * A demonstration rather than a service. The router currently lists one seller
 * and it is us, so today this mostly buys from ourselves and says so in every
 * response. What it demonstrates is not a marketplace, it is that the decision,
 * the payment and the delivery happen with nobody in the middle.
 */
export async function POST(req: NextRequest) {
  // Tighter than the read endpoints by an order of magnitude, because this one
  // moves money rather than reading it.
  const verdict = await consume(callerKey(req.headers, 'agent-fetch'), 5, 3600);
  if (!verdict.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: `This endpoint spends real USDG, so it is capped at ${verdict.limit} an hour. Try again in ${verdict.resetIn}s.`,
      },
      { status: 429, headers: rateHeaders(verdict) }
    );
  }

  if (!buyerConfigured()) {
    return NextResponse.json(
      { success: false, error: 'No policy wallet is configured on this server, so nothing can be bought.' },
      { status: 503, headers: rateHeaders(verdict) }
    );
  }

  let body: { need?: string; maxSpendUSDG?: string; params?: Record<string, string> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Body must be JSON: {"need":"aapl holdings","maxSpendUSDG":"0.05","params":{"address":"0x…"}}' },
      { status: 400, headers: rateHeaders(verdict) }
    );
  }

  const need = (body.need || '').trim();
  if (!need) {
    return NextResponse.json(
      { success: false, error: 'A "need" is required. It is matched against what sellers say they sell.' },
      { status: 400, headers: rateHeaders(verdict) }
    );
  }

  // A ceiling is required rather than defaulted. Spending somebody's money
  // because they did not say how much is not a default, it is a bug with a
  // fallback value.
  const raw = (body.maxSpendUSDG || '').trim();
  if (!/^\d+(\.\d{1,6})?$/.test(raw)) {
    return NextResponse.json(
      {
        success: false,
        error: 'A "maxSpendUSDG" is required, in USDG with up to six decimals. Nothing is bought without a stated ceiling.',
      },
      { status: 400, headers: rateHeaders(verdict) }
    );
  }
  const [whole, frac = ''] = raw.split('.');
  const maxSpendBase = BigInt(whole) * BigInt(1_000_000) + BigInt((frac + '000000').slice(0, 6));

  try {
    const [result, state] = await Promise.all([
      fetchByNeed(need, { maxSpendBase, params: body.params ?? {} }),
      agentState().catch(() => null),
    ]);

    return NextResponse.json(
      {
        success: result.ok,
        chainId: ROBINHOOD_CHAIN_ID,
        ...result,
        // The three ceilings, reported together so it is clear which one is a
        // promise and which one is enforced by the chain.
        limits: {
          requested: raw,
          walletPerCallCapUSDG: state?.capUSDG ?? null,
          walletFloatUSDG: state?.floatUSDG ?? null,
          enforcedBy:
            'The per-call cap and the float are enforced by the policy wallet contract. The requested ceiling is enforced by this server, which is the weaker of the two.',
        },
      },
      { status: result.ok ? 200 : 402, headers: rateHeaders(verdict) }
    );
  } catch (error) {
    console.error('[agent/fetch]', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 502, headers: rateHeaders(verdict) }
    );
  }
}
