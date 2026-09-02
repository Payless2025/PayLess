/**
 * The `exact` scheme, on Permit2.
 *
 * Why not EIP-3009, which is what canonical x402 uses: USDG on Robinhood Chain
 * implements neither EIP-3009 nor EIP-2612. Verified by scanning the dispatch
 * table of the implementation behind its proxy. A settle path built on
 * `transferWithAuthorization` reverts here.
 *
 * Permit2 is the way through, and the canonical x402 proxies are already
 * deployed on this chain:
 *
 *   exact  0x402085c248EeA27D92E8b30b2C58ed07f9E20001
 *   upto   0x4020A4f3b7b90ccA423B9fabCc0CE57C6C240002
 *
 * The proxy matters more than it looks. Permit2 alone does not bind the
 * destination: the spender picks `transferDetails.to` at call time, so a
 * facilitator could sign for one recipient and deliver to another. The proxy
 * closes that by taking the destination *from the witness itself*:
 *
 *   transferDetails = SignatureTransferDetails({to: witness.to, ...})
 *
 * So with the canonical proxy as spender, "the facilitator cannot redirect your
 * money" is a property of the contract rather than a promise from us. That is
 * also why the spender in a signature must be pinned to this exact address, and
 * why we check it rather than accepting whatever the payload claims.
 *
 * Nothing here moves money. This module answers "would this settle?", which is
 * the whole of /verify. Broadcasting lives elsewhere and needs a funded key.
 */

import {
  keccak256,
  stringToHex,
  encodeAbiParameters,
  concatHex,
  recoverAddress,
  getAddress,
  isAddress,
  parseUnits,
  formatUnits,
  type Hex,
} from 'viem';
import { chainClient, withRpcRetry } from '../chains/reader';
import { ROBINHOOD_CHAIN_ID } from '../chains/config';

export const PERMIT2_ADDRESS = '0x000000000022D473030F116dDEE9F6B43aC78BA3' as const;
export const EXACT_PROXY_ADDRESS = '0x402085c248EeA27D92E8b30b2C58ed07f9E20001' as const;
export const UPTO_PROXY_ADDRESS = '0x4020A4f3b7b90ccA423B9fabCc0CE57C6C240002' as const;

/**
 * Read from the deployed proxy's WITNESS_TYPE_STRING(), not invented here.
 * A test asserts it still matches the chain, because a silent divergence would
 * produce a digest that verifies for us and reverts for everyone else.
 */
export const WITNESS_TYPE_STRING =
  'Witness witness)TokenPermissions(address token,uint256 amount)Witness(address to,uint256 validAfter)';

/**
 * The `upto` witness, read from the deployed proxy. It carries one field the
 * exact witness does not: the facilitator.
 *
 * That is not decoration. In `upto` the facilitator chooses the final amount
 * within the signed ceiling, so the payer has to be able to say *which*
 * facilitator they are trusting with that discretion. The proxy enforces it and
 * reverts with UnauthorizedFacilitator() for anyone else, which means an
 * authorisation signed for us is useless to another facilitator.
 */
export const UPTO_WITNESS_TYPE_STRING =
  'Witness witness)TokenPermissions(address token,uint256 amount)Witness(address to,address facilitator,uint256 validAfter)';

const UPTO_WITNESS_TYPEHASH = keccak256(
  stringToHex('Witness(address to,address facilitator,uint256 validAfter)')
);

const UPTO_PERMIT_WITNESS_TYPEHASH = keccak256(
  stringToHex(
    'PermitWitnessTransferFrom(TokenPermissions permitted,address spender,uint256 nonce,uint256 deadline,' +
      UPTO_WITNESS_TYPE_STRING
  )
);

const PERMIT_WITNESS_TYPE_STRING =
  'PermitWitnessTransferFrom(TokenPermissions permitted,address spender,uint256 nonce,uint256 deadline,' +
  WITNESS_TYPE_STRING;

const PERMIT_WITNESS_TYPEHASH = keccak256(stringToHex(PERMIT_WITNESS_TYPE_STRING));
const TOKEN_PERMISSIONS_TYPEHASH = keccak256(stringToHex('TokenPermissions(address token,uint256 amount)'));
const WITNESS_TYPEHASH = keccak256(stringToHex('Witness(address to,uint256 validAfter)'));

/**
 * Permit2's EIP-712 domain carries no `version` field. Confirmed against the
 * contract's own DOMAIN_SEPARATOR() on chain 4663; getting this wrong makes
 * every signature look invalid for reasons that are very hard to see.
 */
const DOMAIN_TYPEHASH = keccak256(
  stringToHex('EIP712Domain(string name,uint256 chainId,address verifyingContract)')
);

export function permit2DomainSeparator(chainId: number = Number(ROBINHOOD_CHAIN_ID)): Hex {
  return keccak256(
    encodeAbiParameters(
      [{ type: 'bytes32' }, { type: 'bytes32' }, { type: 'uint256' }, { type: 'address' }],
      [DOMAIN_TYPEHASH, keccak256(stringToHex('Permit2')), BigInt(chainId), PERMIT2_ADDRESS]
    )
  );
}

export interface Permit2Payload {
  /** The signer, and the wallet the tokens leave. */
  owner: string;
  permitted: { token: string; amount: string };
  /** Permit2's unordered nonce. */
  nonce: string;
  deadline: string;
  witness: { to: string; validAfter: string };
  signature: string;
}

/** The digest the payer signed, built from the exact strings the proxy uses. */
export function permitDigest(payload: Permit2Payload, chainId?: number): Hex {
  const tokenPermissions = keccak256(
    encodeAbiParameters(
      [{ type: 'bytes32' }, { type: 'address' }, { type: 'uint256' }],
      [TOKEN_PERMISSIONS_TYPEHASH, getAddress(payload.permitted.token), BigInt(payload.permitted.amount)]
    )
  );

  const witness = keccak256(
    encodeAbiParameters(
      [{ type: 'bytes32' }, { type: 'address' }, { type: 'uint256' }],
      [WITNESS_TYPEHASH, getAddress(payload.witness.to), BigInt(payload.witness.validAfter)]
    )
  );

  const structHash = keccak256(
    encodeAbiParameters(
      [
        { type: 'bytes32' }, { type: 'bytes32' }, { type: 'address' },
        { type: 'uint256' }, { type: 'uint256' }, { type: 'bytes32' },
      ],
      [
        PERMIT_WITNESS_TYPEHASH,
        tokenPermissions,
        // The spender is us-the-proxy, never whatever the payload asserts.
        EXACT_PROXY_ADDRESS,
        BigInt(payload.nonce),
        BigInt(payload.deadline),
        witness,
      ]
    )
  );

  return keccak256(concatHex(['0x1901', permit2DomainSeparator(chainId), structHash]));
}

const PERMIT2_ABI = [
  {
    name: 'nonceBitmap',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }, { name: 'word', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

const ERC20_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'o', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'allowance', type: 'function', stateMutability: 'view', inputs: [{ name: 'o', type: 'address' }, { name: 's', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint8' }] },
] as const;

/** Permit2 nonces are unordered: a 256-bit word index and a bit within it. */
export function noncePosition(nonce: bigint) {
  return { word: nonce >> BigInt(8), bit: nonce & BigInt(255) };
}

export async function isNonceUsed(owner: string, nonce: bigint): Promise<boolean> {
  const { word, bit } = noncePosition(nonce);
  const bitmap = (await withRpcRetry(() =>
    chainClient().readContract({
      address: PERMIT2_ADDRESS,
      abi: PERMIT2_ABI,
      functionName: 'nonceBitmap',
      args: [getAddress(owner), word],
    })
  )) as bigint;
  return ((bitmap >> bit) & BigInt(1)) === BigInt(1);
}

export interface Permit2Check {
  ok: boolean;
  reason?: string;
  /** True when the payer could fix this by waiting or topping up. */
  retryable?: boolean;
  payer?: string;
  amount?: string;
}

/**
 * Would this settle?
 *
 * Every check here mirrors something the proxy, Permit2 or the token would
 * enforce on chain. The point of doing it twice is that a revert costs gas and
 * tells the seller nothing useful, while this returns a sentence.
 */
export async function verifyPermit2Exact(params: {
  payload: Permit2Payload;
  requiredAmount: string;
  payTo: string;
  asset: string;
  now?: number;
}): Promise<Permit2Check> {
  const { payload, requiredAmount, payTo, asset } = params;
  const now = BigInt(Math.floor((params.now ?? Date.now()) / 1000));

  for (const [label, value] of [
    ['owner', payload?.owner], ['token', payload?.permitted?.token], ['witness.to', payload?.witness?.to],
  ] as const) {
    if (!value || !isAddress(value)) return { ok: false, reason: `"${label}" must be a valid address.` };
  }
  if (!payload.signature || !/^0x[0-9a-fA-F]{130}$/.test(payload.signature)) {
    return { ok: false, reason: 'Signature must be 65 bytes of hex.' };
  }

  // The binding the proxy enforces on chain. Checked here so a mismatch is a
  // sentence instead of an InvalidDestination revert nobody can read.
  if (getAddress(payload.witness.to) !== getAddress(payTo)) {
    return {
      ok: false,
      reason: `Signature authorises payment to ${getAddress(payload.witness.to)}, but this resource is paid to ${getAddress(payTo)}.`,
    };
  }

  if (getAddress(payload.permitted.token) !== getAddress(asset)) {
    return { ok: false, reason: `Signature is for token ${getAddress(payload.permitted.token)}, not ${getAddress(asset)}.` };
  }

  const validAfter = BigInt(payload.witness.validAfter);
  if (now < validAfter) {
    return { ok: false, reason: `Payment is not valid until ${new Date(Number(validAfter) * 1000).toISOString()}.`, retryable: true };
  }
  const deadline = BigInt(payload.deadline);
  if (deadline <= now) {
    return { ok: false, reason: `The signature expired at ${new Date(Number(deadline) * 1000).toISOString()}.` };
  }

  let recovered: string;
  try {
    recovered = await recoverAddress({
      hash: permitDigest(payload),
      signature: payload.signature as Hex,
    });
  } catch {
    return { ok: false, reason: 'Signature could not be recovered.' };
  }
  if (getAddress(recovered) !== getAddress(payload.owner)) {
    return { ok: false, reason: `Signature recovers to ${recovered}, not the stated owner ${getAddress(payload.owner)}.` };
  }

  // Everything above needs no network. Everything below does, so the cheap
  // checks and the pure-crypto one run first: a bad signature should not cost
  // four RPC round trips to discover.
  let decimals: number;
  try {
    decimals = Number(
      await withRpcRetry(() =>
        chainClient().readContract({ address: getAddress(asset), abi: ERC20_ABI, functionName: 'decimals' })
      )
    );
  } catch {
    return { ok: false, reason: `Could not read decimals for ${asset}; refusing to guess the amount.`, retryable: true };
  }

  let required: bigint;
  try {
    required = parseUnits(requiredAmount as `${number}`, decimals);
  } catch {
    return { ok: false, reason: 'The seller advertised an unparseable price.' };
  }

  // `exact` transfers permitted.amount, no more and no less, so it must equal
  // the price rather than merely cover it.
  const permitted = BigInt(payload.permitted.amount);
  if (permitted !== required) {
    return {
      ok: false,
      reason: `The exact scheme settles the permitted amount. Signature permits ${formatUnits(permitted, decimals)}, price is ${requiredAmount}.`,
    };
  }

  const nonce = BigInt(payload.nonce);
  try {
    if (await isNonceUsed(payload.owner, nonce)) {
      return { ok: false, reason: 'That Permit2 nonce has already been used.' };
    }
  } catch {
    return { ok: false, reason: 'Could not read the Permit2 nonce bitmap.', retryable: true };
  }

  // A valid signature over an empty wallet settles nothing, and finding that
  // out by reverting costs us the gas.
  try {
    const [balance, allowance] = await Promise.all([
      withRpcRetry(() => chainClient().readContract({ address: getAddress(asset), abi: ERC20_ABI, functionName: 'balanceOf', args: [getAddress(payload.owner)] })),
      withRpcRetry(() => chainClient().readContract({ address: getAddress(asset), abi: ERC20_ABI, functionName: 'allowance', args: [getAddress(payload.owner), PERMIT2_ADDRESS] })),
    ]);
    if ((balance as bigint) < required) {
      return { ok: false, reason: `Payer holds ${formatUnits(balance as bigint, decimals)}, needs ${requiredAmount}.`, retryable: true };
    }
    if ((allowance as bigint) < required) {
      return {
        ok: false,
        reason: `Payer has approved Permit2 for ${formatUnits(allowance as bigint, decimals)}, needs ${requiredAmount}. Call approve(${PERMIT2_ADDRESS}, amount) on the token once.`,
        retryable: true,
      };
    }
  } catch {
    return { ok: false, reason: 'Could not read the payer’s balance or Permit2 approval.', retryable: true };
  }

  return { ok: true, payer: getAddress(payload.owner), amount: formatUnits(required, decimals) };
}

// ---------------------------------------------------------------------------
// upto
//
// The exact scheme settles the permitted amount and nothing else, which is
// wrong for anything whose cost is not knowable before the work is done. An
// LLM call is the obvious case: you cannot price it until you have run it.
//
// `upto` splits the two. The payer signs a ceiling; the facilitator settles the
// real cost within it, and the difference is simply never taken. The proxy
// enforces both halves: settlementAmount may not exceed the ceiling, and only
// the facilitator named in the signature may choose it.
// ---------------------------------------------------------------------------

export interface UptoPayload extends Omit<Permit2Payload, 'witness'> {
  witness: { to: string; facilitator: string; validAfter: string };
}

export function uptoDigest(payload: UptoPayload, chainId?: number): Hex {
  const tokenPermissions = keccak256(
    encodeAbiParameters(
      [{ type: 'bytes32' }, { type: 'address' }, { type: 'uint256' }],
      [TOKEN_PERMISSIONS_TYPEHASH, getAddress(payload.permitted.token), BigInt(payload.permitted.amount)]
    )
  );

  const witness = keccak256(
    encodeAbiParameters(
      [{ type: 'bytes32' }, { type: 'address' }, { type: 'address' }, { type: 'uint256' }],
      [
        UPTO_WITNESS_TYPEHASH,
        getAddress(payload.witness.to),
        getAddress(payload.witness.facilitator),
        BigInt(payload.witness.validAfter),
      ]
    )
  );

  const structHash = keccak256(
    encodeAbiParameters(
      [
        { type: 'bytes32' }, { type: 'bytes32' }, { type: 'address' },
        { type: 'uint256' }, { type: 'uint256' }, { type: 'bytes32' },
      ],
      [
        UPTO_PERMIT_WITNESS_TYPEHASH,
        tokenPermissions,
        UPTO_PROXY_ADDRESS,
        BigInt(payload.nonce),
        BigInt(payload.deadline),
        witness,
      ]
    )
  );

  return keccak256(concatHex(['0x1901', permit2DomainSeparator(chainId), structHash]));
}

/**
 * Would this settle, at this amount?
 *
 * `settlementAmount` is what the seller decided the work actually cost. It is
 * checked against the signed ceiling here rather than left to revert with
 * AmountExceedsPermitted(), which tells nobody anything useful.
 */
export async function verifyPermit2Upto(params: {
  payload: UptoPayload;
  /** The ceiling the 402 advertised, in whole tokens. */
  maxAmount: string;
  /** What to actually charge, in whole tokens. Defaults to the ceiling. */
  settlementAmount?: string;
  payTo: string;
  asset: string;
  /** This facilitator's own address, which must be the one in the witness. */
  facilitator: string;
  now?: number;
}): Promise<Permit2Check> {
  const { payload, maxAmount, payTo, asset, facilitator } = params;
  const now = BigInt(Math.floor((params.now ?? Date.now()) / 1000));

  for (const [label, value] of [
    ['owner', payload?.owner], ['token', payload?.permitted?.token],
    ['witness.to', payload?.witness?.to], ['witness.facilitator', payload?.witness?.facilitator],
  ] as const) {
    if (!value || !isAddress(value)) return { ok: false, reason: `"${label}" must be a valid address.` };
  }
  if (!payload.signature || !/^0x[0-9a-fA-F]{130}$/.test(payload.signature)) {
    return { ok: false, reason: 'Signature must be 65 bytes of hex.' };
  }

  if (getAddress(payload.witness.to) !== getAddress(payTo)) {
    return {
      ok: false,
      reason: `Signature authorises payment to ${getAddress(payload.witness.to)}, but this resource is paid to ${getAddress(payTo)}.`,
    };
  }

  // Signed for a different facilitator. The proxy would revert with
  // UnauthorizedFacilitator(); saying so plainly is more use to the caller.
  if (getAddress(payload.witness.facilitator) !== getAddress(facilitator)) {
    return {
      ok: false,
      reason: `This authorisation names ${getAddress(payload.witness.facilitator)} as its facilitator, not ${getAddress(facilitator)}. An upto signature is only usable by the facilitator it trusts.`,
    };
  }

  if (getAddress(payload.permitted.token) !== getAddress(asset)) {
    return { ok: false, reason: `Signature is for token ${getAddress(payload.permitted.token)}, not ${getAddress(asset)}.` };
  }

  const validAfter = BigInt(payload.witness.validAfter);
  if (now < validAfter) {
    return { ok: false, reason: `Payment is not valid until ${new Date(Number(validAfter) * 1000).toISOString()}.`, retryable: true };
  }
  const deadline = BigInt(payload.deadline);
  if (deadline <= now) {
    return { ok: false, reason: `The signature expired at ${new Date(Number(deadline) * 1000).toISOString()}.` };
  }

  let recovered: string;
  try {
    recovered = await recoverAddress({ hash: uptoDigest(payload), signature: payload.signature as Hex });
  } catch {
    return { ok: false, reason: 'Signature could not be recovered.' };
  }
  if (getAddress(recovered) !== getAddress(payload.owner)) {
    return { ok: false, reason: `Signature recovers to ${recovered}, not the stated owner ${getAddress(payload.owner)}.` };
  }

  let decimals: number;
  try {
    decimals = Number(
      await withRpcRetry(() =>
        chainClient().readContract({ address: getAddress(asset), abi: ERC20_ABI, functionName: 'decimals' })
      )
    );
  } catch {
    return { ok: false, reason: `Could not read decimals for ${asset}; refusing to guess the amount.`, retryable: true };
  }

  let ceiling: bigint;
  let charge: bigint;
  try {
    ceiling = parseUnits(maxAmount as `${number}`, decimals);
    charge = params.settlementAmount
      ? parseUnits(params.settlementAmount as `${number}`, decimals)
      : ceiling;
  } catch {
    return { ok: false, reason: 'The seller advertised an unparseable price.' };
  }

  const permitted = BigInt(payload.permitted.amount);
  if (permitted < ceiling) {
    return {
      ok: false,
      reason: `Signature permits only ${formatUnits(permitted, decimals)}, and this resource may cost up to ${maxAmount}.`,
    };
  }
  if (charge > permitted) {
    return {
      ok: false,
      reason: `Cannot settle ${formatUnits(charge, decimals)} against a ceiling of ${formatUnits(permitted, decimals)}.`,
    };
  }
  if (charge === BigInt(0)) {
    return { ok: false, reason: 'Settlement amount is zero; nothing to collect.' };
  }

  const nonce = BigInt(payload.nonce);
  try {
    if (await isNonceUsed(payload.owner, nonce)) {
      return { ok: false, reason: 'That Permit2 nonce has already been used.' };
    }
  } catch {
    return { ok: false, reason: 'Could not read the Permit2 nonce bitmap.', retryable: true };
  }

  try {
    const [balance, allowance] = await Promise.all([
      withRpcRetry(() => chainClient().readContract({ address: getAddress(asset), abi: ERC20_ABI, functionName: 'balanceOf', args: [getAddress(payload.owner)] })),
      withRpcRetry(() => chainClient().readContract({ address: getAddress(asset), abi: ERC20_ABI, functionName: 'allowance', args: [getAddress(payload.owner), PERMIT2_ADDRESS] })),
    ]);
    if ((balance as bigint) < charge) {
      return { ok: false, reason: `Payer holds ${formatUnits(balance as bigint, decimals)}, needs ${formatUnits(charge, decimals)}.`, retryable: true };
    }
    if ((allowance as bigint) < charge) {
      return {
        ok: false,
        reason: `Payer has approved Permit2 for ${formatUnits(allowance as bigint, decimals)}, needs ${formatUnits(charge, decimals)}. Call approve(${PERMIT2_ADDRESS}, amount) on the token once.`,
        retryable: true,
      };
    }
  } catch {
    return { ok: false, reason: 'Could not read the payer\u2019s balance or Permit2 approval.', retryable: true };
  }

  return { ok: true, payer: getAddress(payload.owner), amount: formatUnits(charge, decimals) };
}
