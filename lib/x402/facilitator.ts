/**
 * The facilitator.
 *
 * A facilitator exists so that selling something for a cent does not require
 * becoming a blockchain company. The seller advertises a price, forwards what
 * the buyer presented, and gets back a yes or a no. RPC access, log decoding,
 * token decimals, freshness and replay all live here instead of in their code.
 *
 * Three endpoints, and the order they are called in matters:
 *
 *   /supported  what this facilitator can settle, asked once
 *   /verify     before serving the resource: is this payment good?
 *   /settle     after serving it: consume the payment so it cannot be reused
 *
 * Verifying before and settling after is deliberate. Settling first would take
 * the payment for a response that might still fail to render; serving without
 * verifying would give the resource away. Between the two there is a window
 * where a buyer could present the same payment twice, which is exactly what the
 * replay ledger closes.
 *
 * On scheme names: `receipt` is ours, not canonical. The canonical `exact`
 * scheme has the buyer sign an EIP-3009 authorization, and USDG on Robinhood
 * Chain implements no such function (verified by scanning the dispatch table of
 * the implementation behind its proxy). Advertising `exact` while settling
 * something else would be worse than advertising a name of our own.
 */

import { getAddress, isAddress, parseUnits, formatEther } from 'viem';
import { verifySettlement, SETTLEMENT_MAX_AGE_MS } from '../chains/settlement';
import { claimSettlement, getSpentStore } from './spent-store';
import { ROBINHOOD_CHAIN_ID, ROBINHOOD_CONFIG } from '../chains/config';
import {
  verifyPermit2Exact,
  verifyPermit2Upto,
  EXACT_PROXY_ADDRESS,
  UPTO_PROXY_ADDRESS,
  PERMIT2_ADDRESS,
  type Permit2Payload,
  type UptoPayload,
} from './permit2';
import { signerFromEnv } from './facilitator-signer';

/** CAIP-2, the identifier form x402 v2 uses for networks. */
export const NETWORK = `eip155:${ROBINHOOD_CHAIN_ID}`;

export const X402_VERSION = 2;

/** What the seller advertised in its 402. */
export interface PaymentRequirements {
  scheme: string;
  network: string;
  /** Whole tokens, as a decimal string. */
  amount: string;
  /** Where the money must land. */
  payTo: string;
  /** The ERC-20 it must be paid in. */
  asset?: string;
  /** What is being sold, recorded with the claim for the seller's own accounting. */
  resource?: string;
  /** Overrides the default freshness window, downward only. */
  maxAgeMs?: number;
  /**
   * upto only: what the work actually cost, decided after doing it. Must not
   * exceed `amount`, which is the ceiling the buyer signed. Defaults to the
   * ceiling, which makes upto behave like exact.
   */
  settlementAmount?: string;
}

/** What the buyer presented, from the X-Payment header. */
export interface PaymentPayload {
  scheme?: string;
  network?: string;
  /** receipt scheme: the transaction the buyer already sent. */
  transactionHash?: string;
  payer?: string;
  /** exact scheme: the Permit2 authorisation the buyer signed. */
  owner?: string;
  permitted?: { token: string; amount: string };
  nonce?: string;
  deadline?: string;
  witness?: { to: string; validAfter: string; facilitator?: string };
  signature?: string;
}

export interface VerifyResponse {
  isValid: boolean;
  invalidReason?: string;
  /** True when the transaction is simply unmined; the buyer should retry. */
  retryable?: boolean;
  payer?: string;
  /** What the chain actually says was paid, so the seller can log it. */
  settlement?: {
    txHash: string;
    from: string;
    to: string;
    asset: string;
    assetSymbol: string;
    amount: string;
    blockNumber: string;
  };
}

export interface SettleResponse {
  success: boolean;
  errorReason?: string;
  retryable?: boolean;
  transaction?: string;
  network?: string;
  payer?: string;
}

export const SUPPORTED_KINDS = [
  {
    x402Version: X402_VERSION,
    scheme: 'receipt',
    network: NETWORK,
    extra: {
      /**
       * Named explicitly because at least one facilitator elsewhere advertises
       * EIP-3009 for this token. A client that builds a 3009 payload here is
       * rejected at verify rather than discovering it at settle.
       */
      assetTransferMethod: 'receipt',
      description:
        'The buyer sends the ERC-20 transfer themselves and presents its hash. The facilitator verifies the receipt on chain. Costs the buyer gas and one confirmation, and requires the least trust of any scheme.',
      // Present on every kind, so a client can read extra.settlement uniformly
      // instead of treating "absent" as a third state it has to guess about.
      settlement: 'live',
      assets: ROBINHOOD_CONFIG.paymentTokens.map((t) => ({
        address: t.address,
        symbol: t.symbol,
        decimals: t.decimals,
      })),
      maxAgeMs: SETTLEMENT_MAX_AGE_MS,
    },
  },
  {
    x402Version: X402_VERSION,
    scheme: 'exact',
    network: NETWORK,
    extra: {
      assetTransferMethod: 'permit2',
      /**
       * Pinned, and not a suggestion. This proxy takes the transfer destination
       * from the signed witness itself, so a facilitator cannot redirect the
       * money. Sign for any other spender and that guarantee is gone.
       */
      spender: EXACT_PROXY_ADDRESS,
      permit2: PERMIT2_ADDRESS,
      witnessTypeString: 'Witness(address to,uint256 validAfter)',
      description:
        'The buyer signs a Permit2 authorisation and never sends a transaction. Requires one prior approve(Permit2) on the token. USDG here implements neither EIP-3009 nor EIP-2612, so this is the gasless path on this chain.',
      settlement: 'reported at runtime',
      assets: ROBINHOOD_CONFIG.paymentTokens.map((t) => ({
        address: t.address, symbol: t.symbol, decimals: t.decimals,
      })),
    },
  },
  {
    x402Version: X402_VERSION,
    scheme: 'upto',
    network: NETWORK,
    extra: {
      assetTransferMethod: 'permit2',
      spender: UPTO_PROXY_ADDRESS,
      permit2: PERMIT2_ADDRESS,
      witnessTypeString: 'Witness(address to,address facilitator,uint256 validAfter)',
      description:
        'The buyer signs a ceiling and the seller settles what the work actually cost, within it. For anything whose price is not knowable before it runs, such as a model call billed by tokens.',
      settlement: 'reported at runtime',
      assets: ROBINHOOD_CONFIG.paymentTokens.map((t) => ({
        address: t.address, symbol: t.symbol, decimals: t.decimals,
      })),
    },
  },
] as const;

/**
 * The advertised list, with the one field that cannot be a constant.
 *
 * Whether `exact` can actually settle depends on a key being present in this
 * process. Advertising `live` from a constant would make the discovery document
 * lie the moment the key is missing, which is the failure a client can least
 * afford to discover at settle time.
 */
export async function supportedKinds() {
  const signer = signerFromEnv();
  // A key with no gas cannot settle. Reporting `live` off the key alone is the
  // same lie as reporting a shared ledger off credentials alone: true about
  // configuration, false about capability, and only discovered by a client at
  // the one moment it cannot recover.
  let canBroadcast = signer !== null;
  let gas: string | null = null;
  if (signer) {
    try {
      const balance = await signer.gasBalance();
      gas = formatEther(balance);
      // Roughly a dozen settlements' worth. Below that, say so rather than
      // letting a seller discover it mid-request.
      canBroadcast = balance > BigInt(3e14);
    } catch {
      // A balance read failing is not proof of empty; keep the key's answer.
    }
  }
  return SUPPORTED_KINDS.map((kind) => {
    if (kind.scheme === 'exact') {
      return {
        ...kind,
        extra: {
          ...kind.extra,
          settlement: canBroadcast ? 'live' : signer ? 'out-of-gas' : 'unconfigured',
          ...(gas ? { facilitatorGasETH: gas } : {}),
        },
      };
    }
    if (kind.scheme === 'upto') {
      return {
        ...kind,
        extra: {
          ...kind.extra,
          settlement: canBroadcast ? 'live' : signer ? 'out-of-gas' : 'unconfigured',
          ...(gas ? { facilitatorGasETH: gas } : {}),
          // Must be advertised, because the proxy rejects any settle whose
          // caller is not the facilitator named inside the signature. A buyer
          // who signs the wrong one has produced an authorisation nobody can use.
          facilitator: signer?.address ?? null,
        },
      };
    }
    return kind;
  });
}

const KNOWN_SCHEMES: Set<string> = new Set(SUPPORTED_KINDS.map((k) => k.scheme));

/**
 * The chain verifier, behind a seam.
 *
 * This is the only part of the facilitator that needs a network, and it is also
 * the part every other decision hangs off. Leaving it un-swappable would mean
 * the claim-once logic could only be exercised against a real, fresh, on-chain
 * payment, which is exactly the code you least want going untested.
 *
 * Production never touches this. Only tests call the setter.
 */
type Verifier = typeof verifySettlement;
let verifier: Verifier = verifySettlement;

export function __setVerifierForTests(next: Verifier | null) {
  verifier = next ?? verifySettlement;
}

/**
 * The replay key.
 *
 * Keyed by transaction *and* recipient, not by transaction alone. One transfer
 * can legitimately pay two different sellers in two different logs, and a
 * transaction-only key would let whichever seller asked first lock the other
 * one out of money genuinely sent to them.
 */
export function replayKey(txHash: string, payTo: string) {
  return `${txHash.toLowerCase()}:${payTo.toLowerCase()}`;
}

function checkShape(
  requirements: PaymentRequirements,
  payload: PaymentPayload
): string | null {
  if (!requirements) return 'Missing paymentRequirements.';
  if (!payload) return 'Missing paymentPayload.';

  if (!KNOWN_SCHEMES.has(requirements.scheme)) {
    return `Unsupported scheme "${requirements.scheme}". This facilitator settles: ${Array.from(KNOWN_SCHEMES).join(', ')}.`;
  }
  if (payload.scheme && payload.scheme !== requirements.scheme) {
    return `Payload scheme "${payload.scheme}" does not match the required "${requirements.scheme}".`;
  }
  if (requirements.network !== NETWORK) {
    return `Unsupported network "${requirements.network}". This facilitator settles ${NETWORK}.`;
  }
  if (payload.network && payload.network !== NETWORK) {
    return `Payload network "${payload.network}" does not match ${NETWORK}.`;
  }
  if (!requirements.payTo || !isAddress(requirements.payTo)) {
    return '"payTo" must be a valid address.';
  }
  if (requirements.asset && !isAddress(requirements.asset)) {
    return '"asset" must be a valid address.';
  }
  if (!requirements.amount || !/^\d+(\.\d+)?$/.test(requirements.amount)) {
    return '"amount" must be a decimal string in whole tokens, such as "0.01".';
  }
  if (requirements.scheme === 'receipt' && !payload.transactionHash) {
    return 'The receipt scheme needs "transactionHash" in the payload.';
  }
  if (requirements.scheme === 'upto') {
    if (!requirements.asset) {
      return 'The upto scheme needs "asset" in the requirements, because the signature names a specific token.';
    }
    for (const field of ['owner', 'permitted', 'nonce', 'deadline', 'witness', 'signature'] as const) {
      if (payload[field] === undefined) return `The upto scheme needs "${field}" in the payload.`;
    }
    if (!payload.witness?.facilitator) {
      return 'The upto scheme needs "witness.facilitator" — the signature has to name which facilitator may choose the amount.';
    }
  }
  if (requirements.scheme === 'exact') {
    if (!requirements.asset) {
      return 'The exact scheme needs "asset" in the requirements, because the signature names a specific token.';
    }
    for (const field of ['owner', 'permitted', 'nonce', 'deadline', 'witness', 'signature'] as const) {
      if (payload[field] === undefined) return `The exact scheme needs "${field}" in the payload.`;
    }
  }
  return null;
}

/**
 * Is this payment good? Asked before the resource is served, and it consumes
 * nothing: calling verify twice is free and changes no state.
 */
export async function verify(
  requirements: PaymentRequirements,
  payload: PaymentPayload
): Promise<VerifyResponse> {
  const shapeError = checkShape(requirements, payload);
  if (shapeError) return { isValid: false, invalidReason: shapeError };

  if (requirements.scheme === 'exact') return verifyExact(requirements, payload);
  if (requirements.scheme === 'upto') return verifyUpto(requirements, payload);

  // A seller may tighten the freshness window but never widen it, or one
  // careless seller would make every old receipt spendable through us.
  const maxAgeMs = requirements.maxAgeMs
    ? Math.min(requirements.maxAgeMs, SETTLEMENT_MAX_AGE_MS)
    : SETTLEMENT_MAX_AGE_MS;

  const result = await verifier({
    txHash: payload.transactionHash!,
    expectedAmount: requirements.amount,
    expectedRecipient: requirements.payTo,
    expectedToken: requirements.asset,
    maxAgeMs,
  });

  if (!result.valid) {
    return {
      isValid: false,
      invalidReason: result.error,
      retryable: result.pending === true,
    };
  }

  // Already consumed? Report it here rather than letting the seller serve the
  // resource and only discover it at settle.
  const previous = await getSpentStore()
    .get(replayKey(payload.transactionHash!, requirements.payTo))
    .catch(() => null);
  if (previous) {
    return {
      isValid: false,
      invalidReason: `This payment was already settled for ${previous.endpoint}.`,
    };
  }

  return {
    isValid: true,
    payer: result.details!.from,
    settlement: {
      txHash: result.details!.txHash,
      from: result.details!.from,
      to: result.details!.to,
      asset: result.details!.token,
      assetSymbol: result.details!.tokenSymbol,
      amount: result.details!.amount,
      blockNumber: result.details!.blockNumber,
    },
  };
}

/**
 * The exact scheme, verified but not yet settled.
 *
 * Everything a settle would need is checked here, against the chain. What is
 * missing is the broadcasting, which needs a funded key, so this reports
 * validity honestly and refuses to imply the money has moved.
 */
async function verifyExact(
  requirements: PaymentRequirements,
  payload: PaymentPayload
): Promise<VerifyResponse> {
  const result = await verifyPermit2Exact({
    payload: payload as unknown as Permit2Payload,
    requiredAmount: requirements.amount,
    payTo: requirements.payTo,
    asset: requirements.asset!,
  });

  if (!result.ok) {
    return { isValid: false, invalidReason: result.reason, retryable: result.retryable };
  }
  return { isValid: true, payer: result.payer };
}

/** The upto scheme: verified against the ceiling and the chosen amount. */
async function verifyUpto(
  requirements: PaymentRequirements,
  payload: PaymentPayload
): Promise<VerifyResponse> {
  const signer = signerFromEnv();
  if (!signer) {
    return {
      isValid: false,
      invalidReason:
        'This facilitator has no signing key, so it cannot be named in an upto signature and cannot settle one.',
      retryable: true,
    };
  }

  const result = await verifyPermit2Upto({
    payload: payload as unknown as UptoPayload,
    maxAmount: requirements.amount,
    settlementAmount: requirements.settlementAmount,
    payTo: requirements.payTo,
    asset: requirements.asset!,
    facilitator: signer.address,
  });

  if (!result.ok) {
    return { isValid: false, invalidReason: result.reason, retryable: result.retryable };
  }
  return { isValid: true, payer: result.payer };
}

/**
 * Consume the payment. Called after the resource has been served.
 *
 * In the receipt scheme the money has already moved, so this broadcasts
 * nothing. What it does is claim the payment atomically, which is the part a
 * seller cannot do alone: two instances of their own server would each keep
 * their own idea of what had been spent.
 */
export async function settle(
  requirements: PaymentRequirements,
  payload: PaymentPayload
): Promise<SettleResponse> {
  if (requirements?.scheme === 'exact') return settleExact(requirements, payload);
  if (requirements?.scheme === 'upto') return settleUpto(requirements, payload);

  const check = await verify(requirements, payload);
  if (!check.isValid) {
    return {
      success: false,
      errorReason: check.invalidReason,
      retryable: check.retryable,
      network: NETWORK,
    };
  }

  const claim = await claimSettlement(replayKey(payload.transactionHash!, requirements.payTo), {
    endpoint: requirements.resource || 'unspecified',
    amount: requirements.amount,
    spentAt: Date.now(),
  });

  if (!claim.ok) {
    if (claim.error) {
      // The ledger is unreachable. We cannot tell a first use from a replay, so
      // we refuse and say it is worth retrying rather than guessing.
      return { success: false, errorReason: claim.error, retryable: true, network: NETWORK };
    }
    return {
      success: false,
      errorReason: `This payment was already settled for ${claim.previous?.endpoint ?? 'another request'}.`,
      network: NETWORK,
    };
  }

  return {
    success: true,
    transaction: payload.transactionHash,
    network: NETWORK,
    payer: check.payer,
  };
}

/**
 * Broadcast an `exact` authorisation.
 *
 * Double-settling is prevented by Permit2 itself: the nonce bitmap is on chain
 * and a second settle of the same nonce cannot succeed. The simulation below
 * catches that before it costs gas, which is why the ledger claim here is an
 * optimisation rather than the safety mechanism. A ledger outage therefore does
 * not have to block settlement the way it does for the receipt scheme, where
 * nothing on chain distinguishes a first use from a replay.
 */
async function settleExact(
  requirements: PaymentRequirements,
  payload: PaymentPayload
): Promise<SettleResponse> {
  const check = await verify(requirements, payload);
  if (!check.isValid) {
    return { success: false, errorReason: check.invalidReason, retryable: check.retryable, network: NETWORK };
  }

  const signer = signerFromEnv();
  if (!signer) {
    return {
      success: false,
      errorReason:
        'This authorisation is valid, but the facilitator has no signing key configured, so it cannot be broadcast. The receipt scheme settles today.',
      retryable: true,
      network: NETWORK,
      payer: check.payer,
    };
  }

  // Refusing while out of gas beats a revert the seller has to interpret.
  try {
    if ((await signer.gasBalance()) === BigInt(0)) {
      return {
        success: false,
        errorReason: 'The facilitator is out of gas and cannot broadcast right now.',
        retryable: true,
        network: NETWORK,
        payer: check.payer,
      };
    }
  } catch {
    // A balance read failing is not a reason to refuse; the simulation will
    // catch anything that actually cannot be sent.
  }

  const result = await signer.settleExact(payload as unknown as Permit2Payload);

  if (result.status === 'settled') {
    return { success: true, transaction: result.txHash, network: NETWORK, payer: check.payer };
  }
  return {
    success: false,
    errorReason: result.error,
    // Broadcast but unconfirmed: asking again is safe, because Permit2 will
    // refuse a second settle of a nonce that landed.
    retryable: result.status === 'in-flight',
    transaction: result.txHash,
    network: NETWORK,
    payer: check.payer,
  };
}

/**
 * Broadcast an `upto` authorisation at the amount the seller decided on.
 *
 * The seller passes `settlementAmount` after doing the work. It cannot exceed
 * the ceiling the buyer signed, and the proxy enforces that rather than
 * trusting us, which is what makes handing a facilitator this discretion safe.
 */
async function settleUpto(
  requirements: PaymentRequirements,
  payload: PaymentPayload
): Promise<SettleResponse> {
  const check = await verify(requirements, payload);
  if (!check.isValid) {
    return { success: false, errorReason: check.invalidReason, retryable: check.retryable, network: NETWORK };
  }

  const signer = signerFromEnv();
  if (!signer) {
    return {
      success: false,
      errorReason: 'This facilitator has no signing key configured, so it cannot broadcast.',
      retryable: true,
      network: NETWORK,
      payer: check.payer,
    };
  }

  // verify has already checked this against the ceiling and the payer's
  // balance; here it only has to be turned into base units.
  const asset = getAddress(requirements.asset as `0x${string}`);
  let charge: bigint;
  try {
    const decimals = await tokenDecimals(asset);
    charge = parseUnits((requirements.settlementAmount ?? requirements.amount) as `${number}`, decimals);
  } catch {
    return {
      success: false,
      errorReason: 'Could not read the token decimals needed to settle.',
      retryable: true,
      network: NETWORK,
    };
  }

  const result = await signer.settleUpto(payload as unknown as UptoPayload, charge);
  if (result.status === 'settled') {
    return { success: true, transaction: result.txHash, network: NETWORK, payer: check.payer };
  }
  return {
    success: false,
    errorReason: result.error,
    retryable: result.status === 'in-flight',
    transaction: result.txHash,
    network: NETWORK,
    payer: check.payer,
  };
}

async function tokenDecimals(asset: `0x${string}`): Promise<number> {
  const known = ROBINHOOD_CONFIG.paymentTokens.find(
    (t) => getAddress(t.address as `0x${string}`) === asset
  );
  if (known) return known.decimals;
  const { chainClient, withRpcRetry } = await import('../chains/reader');
  return Number(
    await withRpcRetry(() =>
      chainClient().readContract({
        address: asset,
        abi: [{ name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint8' }] }],
        functionName: 'decimals',
      })
    )
  );
}

/** Normalise an address for a response, or return it untouched if unparseable. */
export function tidy(address?: string) {
  if (!address || !isAddress(address)) return address;
  return getAddress(address);
}
