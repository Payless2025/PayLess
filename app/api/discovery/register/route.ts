import { NextRequest, NextResponse } from 'next/server';
import { provenAddress } from '@/lib/x402/wallet-proof';
import { describeKeyedStore } from '@/lib/x402/keyed-store';
import {
  registerSeller,
  unregisterSeller,
  getRegistration,
  registryIsShared,
  allRegistrations,
} from '@/lib/chains/seller-registry';

export const dynamic = 'force-dynamic';

/**
 * Where a seller attaches a name to the address the chain already knows.
 *
 * Free, because charging to be listed would make the list about who paid
 * rather than about who sells. The cost of an entry is a signature and a
 * manifest that agrees with it, which is the only currency that keeps a
 * directory honest.
 */

const HOW_TO = {
  '1': 'POST /api/auth/challenge {"address":"0x…"} to get a message.',
  '2': 'Sign it with personal_sign. It costs nothing and moves nothing.',
  '3': 'POST /api/auth/verify {message, signature} to get a bearer token.',
  '4': 'POST here with that token and {"manifestUrl":"https://your.host/.well-known/x402"}.',
  rule: 'The manifest must name the address you signed with as a payTo recipient. Both directions have to agree.',
};

function unauthorised(reason: string) {
  return NextResponse.json(
    { success: false, error: reason, howTo: HOW_TO },
    { status: 401 }
  );
}

/** What this endpoint is, plus your own entry if you present a token. */
export async function GET(req: NextRequest) {
  const proven = provenAddress(req.headers);
  const entry = proven.address ? await getRegistration(proven.address) : null;

  // How many rows this function can see, next to the one it was asked for.
  // The two answers come from different store operations, and when they
  // disagree the disagreement is the bug rather than a detail to log.
  let visible: number | string;
  try {
    visible = (await allRegistrations()).length;
  } catch (error) {
    visible = `unreadable: ${(error as Error).message}`;
  }

  return NextResponse.json({
    success: true,
    howTo: HOW_TO,
    registrationsVisible: visible,
    registryStore: await describeKeyedStore('seller-registry'),
    // Stated rather than assumed: without a shared store this deployment's
    // registrations do not survive a scale-out, and a caller should know that
    // before relying on one.
    durable: registryIsShared(),
    provenAddress: proven.address ?? null,
    registration: entry,
  });
}

export async function POST(req: NextRequest) {
  const proven = provenAddress(req.headers);
  if (proven.address === null) return unauthorised(proven.reason);

  let body: { manifestUrl?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Body must be JSON: {"manifestUrl":"https://…"}', howTo: HOW_TO },
      { status: 400 }
    );
  }

  if (!body.manifestUrl) {
    return NextResponse.json(
      { success: false, error: 'manifestUrl is required.', howTo: HOW_TO },
      { status: 400 }
    );
  }

  // The address is taken from the proven token and never from the body, so the
  // key holder is the only party who can write a row for their own address.
  const result = await registerSeller(proven.address, body.manifestUrl, body.name);
  if (!result.ok) {
    return NextResponse.json({ success: false, error: result.reason, howTo: HOW_TO }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    registration: result.entry,
    note: 'Your entry appears alongside your settlements at /api/discovery/sellers. The manifest is re-checked periodically and the entry is dropped if it stops naming you.',
  });
}

export async function DELETE(req: NextRequest) {
  const proven = provenAddress(req.headers);
  if (proven.address === null) return unauthorised(proven.reason);

  const removed = await unregisterSeller(proven.address);
  return NextResponse.json({
    success: true,
    removed,
    // Said plainly, because it is the question someone deleting an entry is
    // actually asking.
    note: removed
      ? 'Entry removed. Your settlements stay in the index; the chain is not ours to edit.'
      : 'No entry was registered for this address.',
  });
}
