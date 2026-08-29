/**
 * On-chain settlement verification for Robinhood Chain.
 *
 * A signature proves the caller *authorized* an amount. It proves nothing about
 * money moving — signing is free and happens off-chain. This module closes that
 * gap: it reads the transaction receipt and confirms an ERC-20 Transfer of the
 * expected token, to the expected address, for at least the expected amount.
 *
 * viem is used rather than ethers because ethers v5's fetch layer sets
 * `referrer: "client"`, which Node's undici rejects inside Next.js route
 * handlers — every RPC call fails there with SERVER_ERROR.
 */

import {
  createPublicClient,
  http,
  decodeEventLog,
  parseUnits,
  formatUnits,
  getAddress,
  isAddress,
  type Hash,
} from 'viem';
import { ROBINHOOD_RPC_URL, ROBINHOOD_CONFIG, getPaymentToken } from './config';

const TRANSFER_EVENT = {
  name: 'Transfer',
  type: 'event',
  inputs: [
    { name: 'from', type: 'address', indexed: true },
    { name: 'to', type: 'address', indexed: true },
    { name: 'value', type: 'uint256', indexed: false },
  ],
} as const;

/** How old a settlement transaction may be and still pay for a request. */
export const SETTLEMENT_MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes

let client: ReturnType<typeof createPublicClient> | undefined;

function getClient() {
  if (!client) {
    client = createPublicClient({ transport: http(ROBINHOOD_RPC_URL) });
  }
  return client;
}

export interface SettlementResult {
  valid: boolean;
  /** true when the transaction simply is not mined yet — the caller may retry */
  pending?: boolean;
  error?: string;
  details?: {
    txHash: string;
    from: string;
    to: string;
    token: string;
    tokenSymbol: string;
    amount: string;
    blockNumber: string;
  };
}

function isHash(value: string): value is Hash {
  return /^0x[0-9a-fA-F]{64}$/.test(value);
}

/**
 * Confirm that `txHash` actually paid `expectedRecipient` at least
 * `expectedAmount` of an accepted token on Robinhood Chain.
 */
export async function verifySettlement(params: {
  txHash: string;
  expectedAmount: string;
  expectedRecipient: string;
  /** Restrict to one token; defaults to any token Payless accepts. */
  expectedToken?: string;
  /** Reject transactions older than this. Defaults to SETTLEMENT_MAX_AGE_MS. */
  maxAgeMs?: number;
}): Promise<SettlementResult> {
  const { txHash, expectedAmount, expectedRecipient, expectedToken } = params;
  const maxAgeMs = params.maxAgeMs ?? SETTLEMENT_MAX_AGE_MS;

  if (!txHash || !isHash(txHash)) {
    return { valid: false, error: 'Missing or malformed transaction hash' };
  }

  if (!expectedRecipient || !isAddress(expectedRecipient)) {
    return { valid: false, error: 'Server has no valid recipient address configured' };
  }

  const rpc = getClient();

  let receipt;
  try {
    receipt = await rpc.getTransactionReceipt({ hash: txHash });
  } catch (error) {
    // viem throws TransactionReceiptNotFoundError while the tx is unmined
    const name = (error as { name?: string })?.name || '';
    if (name.includes('NotFound')) {
      return {
        valid: false,
        pending: true,
        error: 'Payment transaction is not confirmed yet. Retry in a moment.',
      };
    }
    console.error('[settlement] receipt lookup failed:', error);
    return { valid: false, error: 'Could not read the transaction from Robinhood Chain' };
  }

  if (receipt.status !== 'success') {
    return { valid: false, error: 'Payment transaction reverted on chain' };
  }

  // Reject a stale transaction being replayed against a new request
  try {
    const block = await rpc.getBlock({ blockNumber: receipt.blockNumber });
    const ageMs = Date.now() - Number(block.timestamp) * 1000;
    if (ageMs > maxAgeMs) {
      return {
        valid: false,
        error: `Payment transaction is too old (${Math.round(ageMs / 60000)} minutes)`,
      };
    }
  } catch (error) {
    console.error('[settlement] block lookup failed:', error);
    return { valid: false, error: 'Could not establish the age of the payment' };
  }

  const recipient = getAddress(expectedRecipient);
  const accepted = expectedToken
    ? [getAddress(expectedToken)]
    : ROBINHOOD_CONFIG.paymentTokens.map((t) => getAddress(t.address));

  // Walk the receipt's logs for a Transfer that pays us
  for (const log of receipt.logs) {
    let tokenAddress: `0x${string}`;
    try {
      tokenAddress = getAddress(log.address);
    } catch {
      continue;
    }
    if (!accepted.includes(tokenAddress as `0x${string}`)) continue;

    let decoded;
    try {
      decoded = decodeEventLog({
        abi: [TRANSFER_EVENT],
        data: log.data,
        topics: log.topics,
      });
    } catch {
      continue; // not a Transfer, or a different event shape
    }

    const args = decoded.args as unknown as { from: string; to: string; value: bigint };
    if (getAddress(args.to) !== recipient) continue;

    const token = ROBINHOOD_CONFIG.paymentTokens.find(
      (t) => getAddress(t.address) === tokenAddress
    );
    const decimals = token?.decimals ?? 18;

    let required: bigint;
    try {
      required = parseUnits(expectedAmount as `${number}`, decimals);
    } catch {
      return { valid: false, error: 'Server has an unparseable price configured' };
    }

    if (args.value < required) {
      return {
        valid: false,
        error: `Underpaid: sent ${formatUnits(args.value, decimals)} ${
          token?.symbol ?? ''
        }, needed ${expectedAmount}`,
      };
    }

    return {
      valid: true,
      details: {
        txHash,
        from: getAddress(args.from),
        to: recipient,
        token: tokenAddress,
        tokenSymbol: token?.symbol ?? 'UNKNOWN',
        amount: formatUnits(args.value, decimals),
        blockNumber: receipt.blockNumber.toString(),
      },
    };
  }

  const symbols = ROBINHOOD_CONFIG.paymentTokens.map((t) => t.symbol).join(' or ');
  return {
    valid: false,
    error: `No ${symbols} transfer to ${recipient} found in that transaction`,
  };
}

/** Look up an accepted token by symbol, for callers building a payment. */
export { getPaymentToken };
