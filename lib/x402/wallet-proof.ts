/**
 * Proof that a caller controls a wallet.
 *
 * The hole this closes: token gating trusted an `x-wallet-address` header,
 * which is a claim, not a proof. Anyone could write a known whale's address
 * into a header and inherit their tier, their rate limit, and their access.
 * An address is an identity only when a signature backs it.
 *
 * The flow is a challenge and a signature:
 *
 *   1. POST /api/auth/challenge {address}    -> a message to sign
 *   2. wallet signs it (EIP-191 personal_sign, costs nothing, moves nothing)
 *   3. POST /api/auth/verify {message, sig}  -> a short-lived bearer token
 *   4. the token goes in `Authorization: Bearer ...` on gated requests
 *
 * Deliberately stateless. The challenge carries its own HMAC and timestamp, so
 * no nonce table has to be shared across serverless instances — the same class
 * of cross-instance bug we have already fixed twice elsewhere is designed out
 * instead of stored around. The cost of statelessness is that a signed
 * challenge can be redeemed more than once within its five-minute window; each
 * redemption yields a token for the same address, which is what the caller
 * already had, so nothing is gained by replaying it.
 *
 * Everything here needs PAYLESS_AUTH_SECRET. Without it the module refuses
 * loudly rather than issuing tokens any instance could forge.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import { getAddress, isAddress, recoverMessageAddress } from 'viem';

/** How long a challenge stays signable, and a token stays valid. */
export const CHALLENGE_TTL_MS = 5 * 60 * 1000;
export const TOKEN_TTL_MS = 60 * 60 * 1000;

function secret(): string | null {
  return process.env.PAYLESS_AUTH_SECRET || null;
}

export function proofConfigured(): boolean {
  return secret() !== null;
}

function mac(...parts: string[]): string {
  const key = secret();
  if (!key) throw new Error('PAYLESS_AUTH_SECRET is not configured.');
  return createHmac('sha256', key).update(parts.join('|')).digest('hex');
}

function macEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

// ---------------------------------------------------------------------------
// Challenge
// ---------------------------------------------------------------------------

export interface Challenge {
  message: string;
  address: string;
  expiresAt: string;
}

/**
 * The text a wallet is asked to sign.
 *
 * Written for the human reading it in their wallet popup, because that is who
 * it is actually for. The MAC line is what lets the server trust its own
 * timestamp when the message comes back.
 */
export function buildChallenge(rawAddress: string, now = Date.now()): Challenge {
  if (!isAddress(rawAddress)) throw new Error('A valid address is required.');
  const address = getAddress(rawAddress);
  const issued = new Date(now).toISOString();
  const nonce = mac('challenge', address, issued).slice(0, 32);

  const message = [
    'Payless wallet ownership proof',
    '',
    `Wallet: ${address}`,
    `Issued: ${issued}`,
    `Nonce: ${nonce}`,
    '',
    'Signing proves you control this wallet. It authorises no payment and moves nothing.',
  ].join('\n');

  return { message, address, expiresAt: new Date(now + CHALLENGE_TTL_MS).toISOString() };
}

export interface ProofResult {
  ok: boolean;
  address?: string;
  reason?: string;
}

/** Did this wallet sign our challenge, recently? */
export async function verifyChallenge(
  message: string,
  signature: string,
  now = Date.now()
): Promise<ProofResult> {
  const wallet = /^Wallet: (0x[0-9a-fA-F]{40})$/m.exec(message)?.[1];
  const issued = /^Issued: (\S+)$/m.exec(message)?.[1];
  const nonce = /^Nonce: ([0-9a-f]{32})$/m.exec(message)?.[1];

  if (!wallet || !issued || !nonce || !isAddress(wallet)) {
    return { ok: false, reason: 'This is not a Payless ownership challenge.' };
  }

  const address = getAddress(wallet);

  // The nonce is our own MAC over the address and timestamp, so a message we
  // never issued — or one whose timestamp was edited — fails right here.
  if (!macEqual(nonce, mac('challenge', address, issued).slice(0, 32))) {
    return { ok: false, reason: 'Challenge was not issued by this server.' };
  }

  const age = now - Date.parse(issued);
  if (!Number.isFinite(age) || age < 0 || age > CHALLENGE_TTL_MS) {
    return { ok: false, reason: 'Challenge has expired. Request a new one and sign again.' };
  }

  let recovered: string;
  try {
    recovered = await recoverMessageAddress({ message, signature: signature as `0x${string}` });
  } catch {
    return { ok: false, reason: 'Signature could not be recovered.' };
  }
  if (getAddress(recovered) !== address) {
    return { ok: false, reason: `Signature recovers to ${recovered}, not ${address}.` };
  }

  return { ok: true, address };
}

// ---------------------------------------------------------------------------
// Token
// ---------------------------------------------------------------------------

const TOKEN_PREFIX = 'plx1';

export function issueToken(address: string, now = Date.now()): { token: string; expiresAt: string } {
  const checked = getAddress(address);
  const exp = now + TOKEN_TTL_MS;
  const body = Buffer.from(JSON.stringify({ a: checked, e: exp })).toString('base64url');
  return {
    token: `${TOKEN_PREFIX}.${body}.${mac('token', body)}`,
    expiresAt: new Date(exp).toISOString(),
  };
}

/** The address a bearer token proves, or null with the reason it does not. */
export function checkToken(
  token: string | null | undefined,
  now = Date.now()
): { address: string } | { address: null; reason: string } {
  if (!token) return { address: null, reason: 'No token presented.' };
  if (!proofConfigured()) {
    return { address: null, reason: 'Wallet proof is not configured on this server (PAYLESS_AUTH_SECRET missing).' };
  }

  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== TOKEN_PREFIX) {
    return { address: null, reason: 'Malformed token.' };
  }
  const [, body, sig] = parts;
  if (!macEqual(sig, mac('token', body))) {
    return { address: null, reason: 'Token signature does not verify.' };
  }

  let payload: { a?: string; e?: number };
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return { address: null, reason: 'Malformed token payload.' };
  }
  if (!payload.a || !isAddress(payload.a) || typeof payload.e !== 'number') {
    return { address: null, reason: 'Malformed token payload.' };
  }
  if (now > payload.e) {
    return { address: null, reason: 'Token has expired. Sign a fresh challenge.' };
  }
  return { address: getAddress(payload.a) };
}

/** Pull the proven address off a request, if it carries one. */
export function provenAddress(headers: Headers): { address: string } | { address: null; reason: string } {
  const auth = headers.get('authorization');
  const bearer = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : headers.get('x-wallet-proof');
  return checkToken(bearer);
}
