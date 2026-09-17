import { NextRequest, NextResponse } from 'next/server';
import { provenAddress } from '@/lib/x402/wallet-proof';
import { verifyListing, getListing, publicView, VERIFY_PATH } from '@/lib/x402/listings';
import { consume, callerKey, rateHeaders } from '@/lib/x402/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * Ask a listing's origin whether it wants to be listed.
 *
 * This is the step that makes the difference between a claim and a listing.
 * Until the origin serves the token, nothing about the listing is live, because
 * typing a URL into a form says nothing about who controls it.
 *
 * Rate limited separately and tightly: each call sends a request to somebody
 * else's server, and an unbounded verify endpoint is a way to point our traffic
 * at a stranger.
 */
export async function POST(req: NextRequest) {
  const verdict = await consume(callerKey(req.headers, 'sell-verify'), 20, 3600);
  const headers = rateHeaders(verdict);
  if (!verdict.allowed) {
    return NextResponse.json(
      { success: false, error: `Verification is capped at ${verdict.limit} an hour. Try again in ${verdict.resetIn}s.` },
      { status: 429, headers }
    );
  }

  const proven = provenAddress(req.headers);
  if (proven.address === null) {
    return NextResponse.json({ success: false, error: proven.reason }, { status: 401, headers });
  }

  let id: string | undefined;
  try {
    id = (await req.json())?.id;
  } catch {
    /* handled below */
  }
  if (!id) {
    return NextResponse.json({ success: false, error: 'An "id" is required.' }, { status: 400, headers });
  }

  const listing = await getListing(id);
  if (!listing) {
    return NextResponse.json({ success: false, error: 'No such listing.' }, { status: 404, headers });
  }
  // Only the owner may trigger a verification, so this cannot be used to make
  // us call arbitrary origins on somebody else's behalf.
  if (listing.owner.toLowerCase() !== proven.address.toLowerCase()) {
    return NextResponse.json(
      { success: false, error: 'That listing belongs to a different address.' },
      { status: 403, headers }
    );
  }

  const result = await verifyListing(id);
  return NextResponse.json(
    {
      success: result.ok,
      reason: result.reason,
      listing: result.listing ? publicView(result.listing, new URL(req.url).origin) : null,
      ...(result.ok
        ? {}
        : { retry: `Serve the token as the body of ${VERIFY_PATH} on the same origin, then call this again.` }),
    },
    { status: result.ok ? 200 : 400, headers }
  );
}
