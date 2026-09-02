/**
 * Paying by signature instead of by transaction.
 *
 * The canonical x402 `exact` scheme has the buyer sign an EIP-3009
 * authorisation. USDG on Robinhood Chain implements neither EIP-3009 nor
 * EIP-2612, so on this chain the gasless path runs through Permit2 and the
 * canonical x402 proxies instead.
 *
 * What the proxy adds over Permit2 alone is the reason this is safe to hand to
 * a facilitator at all. Permit2 does not bind the destination: the spender
 * chooses `transferDetails.to` when it calls, so a facilitator could take a
 * signature meant for one recipient and deliver it to another. The proxy takes
 * the destination from the signed witness itself, which makes "the facilitator
 * cannot redirect your money" a property of the contract rather than a promise.
 *
 * This module builds the typed data. It never touches a key: you sign, exactly
 * as you would sign anything else, and hand the signature back.
 */

export const PERMIT2_ADDRESS = '0x000000000022D473030F116dDEE9F6B43aC78BA3';

/** One entry from a 402's `accepts` array. */
export interface AcceptedPayment {
  scheme: string;
  network: string;
  amount: string;
  payTo: string;
  asset?: string;
  resource?: string;
  extra?: {
    assetTransferMethod?: string;
    spender?: string;
    facilitator?: string;
    settlement?: string;
    /** 'metered' means the advertised amount is a ceiling, not the price. */
    pricing?: string;
    [k: string]: unknown;
  };
}

export interface Permit2TypedData {
  domain: { name: string; chainId: number; verifyingContract: string };
  types: Record<string, Array<{ name: string; type: string }>>;
  primaryType: 'PermitWitnessTransferFrom';
  message: {
    permitted: { token: string; amount: bigint };
    spender: string;
    nonce: bigint;
    deadline: bigint;
    witness: { to: string; validAfter: bigint; facilitator?: string };
  };
}

const BASE_TYPES = {
  PermitWitnessTransferFrom: [
    { name: 'permitted', type: 'TokenPermissions' },
    { name: 'spender', type: 'address' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
    { name: 'witness', type: 'Witness' },
  ],
  TokenPermissions: [
    { name: 'token', type: 'address' },
    { name: 'amount', type: 'uint256' },
  ],
};

/**
 * Which of the offered options is worth signing.
 *
 * `exact` beats `upto` because `upto` hands the seller discretion over the
 * final amount within your ceiling. That is a useful thing to grant when the
 * price genuinely is not knowable in advance, and not a thing to grant by
 * default.
 *
 * The exception is an endpoint that declares `pricing: 'metered'` — there the
 * advertised amount IS the ceiling, and `upto` is how you pay the real cost
 * instead of the maximum. Preferring `exact` on a metered endpoint means
 * volunteering to overpay on every call, which is what this client used to do.
 */
export function chooseGasless(accepts: AcceptedPayment[] | undefined): AcceptedPayment | null {
  const usable = (accepts ?? []).filter(
    (a) =>
      a.extra?.assetTransferMethod === 'permit2' &&
      a.extra?.settlement === 'live' &&
      typeof a.extra?.spender === 'string' &&
      typeof a.asset === 'string' &&
      (a.scheme !== 'upto' || typeof a.extra?.facilitator === 'string')
  );
  const metered = usable.find((a) => a.scheme === 'upto' && a.extra?.pricing === 'metered');
  if (metered) return metered;
  return usable.find((a) => a.scheme === 'exact') ?? usable[0] ?? null;
}

/**
 * Build the typed data for one payment.
 *
 * `amountBaseUnits` is in the token's own units, not whole tokens, because the
 * signature commits to an exact integer and rounding it here would be the kind
 * of quiet error that only shows up as a rejected signature.
 */
export function permit2TypedData(params: {
  accept: AcceptedPayment;
  owner: string;
  amountBaseUnits: bigint;
  chainId: number;
  /** Seconds the signature stays usable. Defaults to 10 minutes. */
  ttlSeconds?: number;
  nonce?: bigint;
  validAfter?: bigint;
}): Permit2TypedData {
  const { accept, amountBaseUnits, chainId } = params;
  const isUpto = accept.scheme === 'upto';

  if (!accept.asset || !accept.extra?.spender) {
    throw new Error('payless: this accept entry has no asset or spender to sign against.');
  }
  if (isUpto && !accept.extra.facilitator) {
    throw new Error('payless: an upto authorisation has to name the facilitator allowed to settle it.');
  }

  // Permit2 nonces are unordered, so any unused value works. A timestamp with a
  // random tail cannot collide with itself across process restarts the way a
  // counter kept in memory would.
  const nonce =
    params.nonce ?? BigInt(Date.now()) * BigInt(1000) + BigInt(Math.floor(Math.random() * 1000));
  const deadline = BigInt(Math.floor(Date.now() / 1000) + (params.ttlSeconds ?? 600));
  const validAfter = params.validAfter ?? BigInt(0);

  return {
    domain: { name: 'Permit2', chainId, verifyingContract: PERMIT2_ADDRESS },
    types: {
      ...BASE_TYPES,
      Witness: isUpto
        ? [
            { name: 'to', type: 'address' },
            { name: 'facilitator', type: 'address' },
            { name: 'validAfter', type: 'uint256' },
          ]
        : [
            { name: 'to', type: 'address' },
            { name: 'validAfter', type: 'uint256' },
          ],
    },
    primaryType: 'PermitWitnessTransferFrom',
    message: {
      permitted: { token: accept.asset, amount: amountBaseUnits },
      spender: accept.extra.spender,
      nonce,
      deadline,
      witness: {
        to: accept.payTo,
        validAfter,
        ...(isUpto ? { facilitator: accept.extra.facilitator } : {}),
      },
    },
  };
}

/** Turn signed typed data into the `X-Payment` header body. */
export function permitHeader(params: {
  typed: Permit2TypedData;
  scheme: string;
  /** The address that signed. The server recovers the signature and checks it. */
  owner: string;
  signature: string;
}) {
  const { typed, scheme, owner, signature } = params;
  const { message } = typed;
  return JSON.stringify({
    scheme,
    owner,
    permitted: { token: message.permitted.token, amount: message.permitted.amount.toString() },
    nonce: message.nonce.toString(),
    deadline: message.deadline.toString(),
    witness: {
      to: message.witness.to,
      validAfter: message.witness.validAfter.toString(),
      ...(message.witness.facilitator ? { facilitator: message.witness.facilitator } : {}),
    },
    signature,
  });
}
