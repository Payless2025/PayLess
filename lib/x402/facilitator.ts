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

import { getAddress, isAddress } from 'viem';
import { verifySettlement, SETTLEMENT_MAX_AGE_MS } from '../chains/settlement';
import { claimSettlement, getSpentStore } from './spent-store';
import { ROBINHOOD_CHAIN_ID, ROBINHOOD_CONFIG } from '../chains/config';

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
}

/** What the buyer presented, from the X-Payment header. */
export interface PaymentPayload {
  scheme?: string;
  network?: string;
  /** receipt scheme: the transaction the buyer already sent. */
  transactionHash?: string;
  payer?: string;
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
      assets: ROBINHOOD_CONFIG.paymentTokens.map((t) => ({
        address: t.address,
        symbol: t.symbol,
        decimals: t.decimals,
      })),
      maxAgeMs: SETTLEMENT_MAX_AGE_MS,
    },
  },
] as const;

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
function replayKey(txHash: string, payTo: string) {
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
  if (!payload.transactionHash) {
    return 'The receipt scheme needs "transactionHash" in the payload.';
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

/** Normalise an address for a response, or return it untouched if unparseable. */
export function tidy(address?: string) {
  if (!address || !isAddress(address)) return address;
  return getAddress(address);
}
