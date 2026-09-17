import { NextRequest, NextResponse } from 'next/server';
import { getAddress, formatUnits } from 'viem';
import { getListing, relay, type Listing } from '@/lib/x402/listings';
import { supportedKinds, NETWORK, X402_VERSION } from '@/lib/x402/facilitator';
import { verifyPermit2Upto, verifyPermit2Exact, UPTO_PROXY_ADDRESS, EXACT_PROXY_ADDRESS } from '@/lib/x402/permit2';
import { signerFromEnv } from '@/lib/x402/facilitator-signer';
import { USDG_ADDRESS, ROBINHOOD_EXPLORER_URL } from '@/lib/chains/config';
import { consume, callerKey, rateHeaders } from '@/lib/x402/rate-limit';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Somebody else's API, charged for.
 *
 * The seller registered an origin and a price. A buyer pays here, we call their
 * endpoint, and they get the money. We are in the request path and not in the
 * payment path, which are very different amounts of trust: the destination is
 * taken from the signed witness by the canonical x402 proxy, so the payment goes
 * from the buyer to the seller whatever this code does.
 *
 * Verify, serve, then settle. That order is the documented one for signature
 * schemes and it matters more here than anywhere else in this codebase: settling
 * is what moves the money, and taking a stranger's money before knowing whether
 * their seller answered would be charging for nothing.
 */

function facilitatorAddress(): string | null {
  const address = process.env.PAYLESS_FACILITATOR_ADDRESS;
  try {
    return address ? getAddress(address as `0x${string}`) : null;
  } catch {
    return null;
  }
}

/** The 402 for this listing, priced and addressed to its seller. */
async function challenge(listing: Listing, reason?: string) {
  const kinds = await supportedKinds();
  const live = new Set(
    kinds.filter((k: any) => k.extra?.settlement === 'live').map((k: any) => k.scheme)
  );
  const facilitator = facilitatorAddress();
  const amount = formatUnits(BigInt(listing.priceBase), 6);

  const accepts = [
    live.has('upto') && facilitator
      ? {
          scheme: 'upto',
          network: NETWORK,
          amount,
          asset: USDG_ADDRESS,
          payTo: listing.payTo,
          maxTimeoutSeconds: 600,
          extra: {
            assetTransferMethod: 'permit2',
            settlement: 'live',
            spender: UPTO_PROXY_ADDRESS,
            facilitator,
          },
        }
      : null,
    live.has('exact') && facilitator
      ? {
          scheme: 'exact',
          network: NETWORK,
          amount,
          asset: USDG_ADDRESS,
          payTo: listing.payTo,
          maxTimeoutSeconds: 600,
          extra: {
            assetTransferMethod: 'permit2',
            settlement: 'live',
            spender: EXACT_PROXY_ADDRESS,
            facilitator,
          },
        }
      : null,
  ].filter(Boolean);

  return NextResponse.json(
    {
      status: 402,
      message: 'Payment Required',
      // Said plainly, because a buyer paying a stranger's endpoint through us
      // deserves to know who actually receives the money.
      seller: { name: listing.name, payTo: listing.payTo, relayedBy: 'payless' },
      payment: { amount, asset: USDG_ADDRESS, network: NETWORK, accepts },
      x402Version: X402_VERSION,
      ...(reason ? { reason } : {}),
    },
    { status: 402 }
  );
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const verdict = await consume(callerKey(req.headers, `listing:${params.id}`), 120, 3600);
  if (!verdict.allowed) {
    return NextResponse.json(
      { error: `This listing is capped at ${verdict.limit} requests an hour. Try again in ${verdict.resetIn}s.` },
      { status: 429, headers: rateHeaders(verdict) }
    );
  }

  const listing = await getListing(params.id);
  if (!listing) {
    return NextResponse.json({ error: 'No such listing.' }, { status: 404, headers: rateHeaders(verdict) });
  }
  if (!listing.active) {
    // An unverified listing is inert rather than merely unpaid. Serving it would
    // let anyone monetise an origin they do not control.
    return NextResponse.json(
      {
        error: 'This listing is not active. Its origin has not proved that it wants to be listed.',
        charged: false,
      },
      { status: 409, headers: rateHeaders(verdict) }
    );
  }

  const header = req.headers.get('x-payment');
  if (!header) return challenge(listing);

  let payload: any;
  try {
    payload = JSON.parse(header);
  } catch {
    return challenge(listing, 'The X-Payment header was not valid JSON.');
  }

  const signer = signerFromEnv();
  const facilitator = facilitatorAddress();
  if (!signer || !facilitator) {
    return NextResponse.json(
      { error: 'This relay has no settlement signer configured, so it cannot take payments right now.', charged: false },
      { status: 503, headers: rateHeaders(verdict) }
    );
  }

  const amount = formatUnits(BigInt(listing.priceBase), 6);
  const scheme = payload?.scheme === 'exact' ? 'exact' : 'upto';

  // Verified against the listing's own payTo, never against ours. A signature
  // that pays anybody else is not payment for this listing.
  const check =
    scheme === 'exact'
      ? await verifyPermit2Exact({ payload, requiredAmount: amount, payTo: listing.payTo, asset: USDG_ADDRESS })
      : await verifyPermit2Upto({ payload, maxAmount: amount, payTo: listing.payTo, asset: USDG_ADDRESS, facilitator });

  if (!check.ok) {
    return NextResponse.json(
      { error: check.reason ?? 'Payment did not verify.', retryable: check.retryable ?? false, charged: false },
      { status: 402, headers: rateHeaders(verdict) }
    );
  }

  // Serve before settling. If the seller's origin fails, nothing is charged.
  const search = new URL(req.url).search;
  const served = await relay(listing, search);
  if (!served.ok && served.status >= 500) {
    return NextResponse.json(
      {
        error: served.reason ?? `The seller's endpoint answered ${served.status}.`,
        charged: false,
        seller: listing.payTo,
      },
      { status: 502, headers: rateHeaders(verdict) }
    );
  }

  let txHash: string | null = null;
  let settlementFailed = false;
  try {
    const result =
      scheme === 'exact'
        ? await signer.settleExact(payload)
        : await signer.settleUpto(payload, BigInt(listing.priceBase));
    txHash = result.txHash ?? null;
    // 'in-flight' is not success. Reporting it as settled would tell a buyer
    // their money moved when the chain has not said so yet.
    settlementFailed = result.status !== 'settled';
  } catch (error) {
    console.error('[listing settle]', error);
    settlementFailed = true;
  }

  const headers: Record<string, string> = {
    ...rateHeaders(verdict),
    'content-type': served.contentType,
    'x-payment-seller': listing.payTo,
    'x-payment-settlement': settlementFailed ? 'failed' : 'settled',
  };
  if (txHash) {
    headers['x-payment-confirmed'] = txHash;
    headers['x-payment-settled-amount'] = amount;
    headers['x-payment-explorer'] = `${ROBINHOOD_EXPLORER_URL}/tx/${txHash}`;
  }

  // The upstream status travels with the body. A buyer who paid for a 404 has
  // to see the 404, and a seller debugging their own API has to see their own
  // errors rather than ours.
  return new NextResponse(served.body, { status: served.status, headers });
}
