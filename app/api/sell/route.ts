import { NextRequest, NextResponse } from 'next/server';
import { provenAddress, proofConfigured } from '@/lib/x402/wallet-proof';
import {
  createListing,
  listingsOwnedBy,
  deleteListing,
  publicView,
  VERIFY_PATH,
} from '@/lib/x402/listings';
import { consume, callerKey, rateHeaders } from '@/lib/x402/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * Turn an API you already run into one that charges.
 *
 * Free to list, because charging for the right to be paid would make this a
 * toll rather than a tool.
 *
 * A listing starts inert. Anyone can type anyone else's URL into a form, so the
 * form is not what activates it: the origin has to serve a token we generated,
 * which only somebody who controls that origin can do.
 */

const HOW_TO = {
  '1': 'POST /api/auth/challenge {"address":"0x…"}, sign it, POST /api/auth/verify to get a bearer token.',
  '2': 'POST here with that token and {"originUrl":"https://your.api/endpoint","priceUSDG":"0.02"}.',
  '3': `Serve the returned token as the body of ${VERIFY_PATH} on the same origin.`,
  '4': 'POST /api/sell/verify {"id":"…"} to activate it.',
  note: 'Payments go straight from the buyer to your address. The proxy takes the destination from the signed witness, so nothing in the path can redirect it.',
};

function unauthorised(reason: string, headers: Record<string, string>) {
  return NextResponse.json(
    {
      success: false,
      error: reason,
      howTo: proofConfigured() ? HOW_TO : { error: 'Wallet proof is not configured on this server.' },
    },
    { status: 401, headers }
  );
}

export async function GET(req: NextRequest) {
  const verdict = await consume(callerKey(req.headers, 'sell'), 60, 3600);
  const headers = rateHeaders(verdict);
  if (!verdict.allowed) {
    return NextResponse.json({ success: false, error: 'Too many requests.' }, { status: 429, headers });
  }

  const proven = provenAddress(req.headers);
  const origin = new URL(req.url).origin;
  const mine = proven.address ? await listingsOwnedBy(proven.address) : [];

  return NextResponse.json(
    {
      success: true,
      howTo: HOW_TO,
      provenAddress: proven.address ?? null,
      listings: mine.map((l) => ({
        ...publicView(l, origin),
        // Only the owner sees why their own listing is inert.
        verification: l.verification,
      })),
    },
    { headers }
  );
}

export async function POST(req: NextRequest) {
  const verdict = await consume(callerKey(req.headers, 'sell'), 60, 3600);
  const headers = rateHeaders(verdict);
  if (!verdict.allowed) {
    return NextResponse.json({ success: false, error: 'Too many requests.' }, { status: 429, headers });
  }

  const proven = provenAddress(req.headers);
  if (proven.address === null) return unauthorised(proven.reason, headers);

  let body: { originUrl?: string; priceUSDG?: string; name?: string; description?: string; payTo?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Body must be JSON.', howTo: HOW_TO },
      { status: 400, headers }
    );
  }

  if (!body.originUrl || !body.priceUSDG) {
    return NextResponse.json(
      { success: false, error: 'Both "originUrl" and "priceUSDG" are required.', howTo: HOW_TO },
      { status: 400, headers }
    );
  }

  // The owner comes from the proven token and never from the body, so nobody
  // can create a listing in somebody else's name.
  const result = await createListing(proven.address, {
    originUrl: body.originUrl,
    priceUSDG: body.priceUSDG,
    name: body.name,
    description: body.description,
    payTo: body.payTo,
  });

  if (!result.ok || !result.listing) {
    return NextResponse.json({ success: false, error: result.reason, howTo: HOW_TO }, { status: 400, headers });
  }

  return NextResponse.json(
    {
      success: true,
      listing: publicView(result.listing, new URL(req.url).origin),
      next: result.next,
      note: result.reason,
    },
    { headers }
  );
}

export async function DELETE(req: NextRequest) {
  const verdict = await consume(callerKey(req.headers, 'sell'), 60, 3600);
  const headers = rateHeaders(verdict);
  const proven = provenAddress(req.headers);
  if (proven.address === null) return unauthorised(proven.reason, headers);

  const id = new URL(req.url).searchParams.get('id');
  if (!id) {
    return NextResponse.json({ success: false, error: 'An "id" is required.' }, { status: 400, headers });
  }

  const removed = await deleteListing(id, proven.address);
  return NextResponse.json(
    {
      success: true,
      removed,
      note: removed
        ? 'Listing removed. Payments already made stay on the chain; they were never ours to undo.'
        : 'No listing with that id belongs to this address.',
    },
    { headers }
  );
}
