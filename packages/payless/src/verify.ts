/**
 * Settlement verification.
 *
 * A signature proves someone *authorized* an amount. Signing is free and
 * off-chain, so it proves nothing about money moving. This reads the receipt
 * and confirms an ERC-20 Transfer of the expected token, to the expected
 * address, for at least the expected amount.
 *
 * The transaction hash doubles as the replay key — unique, already on chain,
 * and no client-generated nonce to trust.
 */

import {
  decodeEventLog,
  formatUnits,
  getAddress,
  isAddress,
  parseUnits,
  type PublicClient,
} from 'viem';
import { DEFAULT_TOKENS, explorerTx, withRpcRetry, type PaymentToken } from './chain.js';

const TRANSFER_EVENT = {
  name: 'Transfer',
  type: 'event',
  inputs: [
    { name: 'from', type: 'address', indexed: true },
    { name: 'to', type: 'address', indexed: true },
    { name: 'value', type: 'uint256', indexed: false },
  ],
} as const;

const ERC20_META_ABI = [
  { name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint8' }] },
  { name: 'symbol', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'string' }] },
] as const;

/** A settlement older than this cannot pay for a new request. */
export const DEFAULT_MAX_AGE_MS = 30 * 60 * 1000;

export interface SettlementDetails {
  txHash: string;
  from: string;
  to: string;
  token: string;
  tokenSymbol: string;
  amount: string;
  blockNumber: string;
  explorer: string;
}

export interface SettlementResult {
  valid: boolean;
  /** The transfer is not mined yet — the caller should retry, not pay again. */
  pending?: boolean;
  error?: string;
  details?: SettlementDetails;
}

export interface VerifyParams {
  client: PublicClient;
  txHash: string;
  expectedAmount: string;
  expectedRecipient: string;
  /** Restrict to one token; defaults to the accepted list. */
  expectedToken?: string;
  acceptedTokens?: PaymentToken[];
  maxAgeMs?: number;
}

export async function verifySettlement(params: VerifyParams): Promise<SettlementResult> {
  const {
    client,
    txHash,
    expectedAmount,
    expectedRecipient,
    expectedToken,
    acceptedTokens = DEFAULT_TOKENS,
    maxAgeMs = DEFAULT_MAX_AGE_MS,
  } = params;

  if (!txHash || !/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    return { valid: false, error: 'Missing or malformed transaction hash' };
  }
  if (!expectedRecipient || !isAddress(expectedRecipient)) {
    return { valid: false, error: 'No valid recipient address configured' };
  }

  let receipt;
  try {
    receipt = await withRpcRetry(() =>
      client.getTransactionReceipt({ hash: txHash as `0x${string}` })
    );
  } catch (error) {
    if (/NotFound/.test((error as { name?: string })?.name || '')) {
      return {
        valid: false,
        pending: true,
        error: 'Payment transaction is not confirmed yet. Retry in a moment.',
      };
    }
    return { valid: false, error: 'Could not read the transaction from the chain' };
  }

  if (receipt.status !== 'success') {
    return { valid: false, error: 'Payment transaction reverted on chain' };
  }

  try {
    const block = await withRpcRetry(() =>
      client.getBlock({ blockNumber: receipt.blockNumber })
    );
    const ageMs = Date.now() - Number(block.timestamp) * 1000;
    if (ageMs > maxAgeMs) {
      return {
        valid: false,
        error: `Payment transaction is too old (${Math.round(ageMs / 60000)} minutes)`,
      };
    }
  } catch {
    return { valid: false, error: 'Could not establish the age of the payment' };
  }

  const recipient = getAddress(expectedRecipient);
  const accepted = expectedToken
    ? [getAddress(expectedToken)]
    : acceptedTokens.map((t) => getAddress(t.address));

  for (const log of receipt.logs) {
    let tokenAddress: `0x${string}`;
    try {
      tokenAddress = getAddress(log.address);
    } catch {
      continue;
    }
    if (!accepted.includes(tokenAddress)) continue;

    let decoded;
    try {
      decoded = decodeEventLog({ abi: [TRANSFER_EVENT], data: log.data, topics: log.topics });
    } catch {
      continue;
    }

    const args = decoded.args as unknown as { from: string; to: string; value: bigint };
    if (getAddress(args.to) !== recipient) continue;

    const known = acceptedTokens.find((t) => getAddress(t.address) === tokenAddress);

    // A caller may name any token. Assuming 18 decimals for an unknown one would
    // misread the amount by orders of magnitude, so read the contract instead.
    let decimals = known?.decimals;
    let symbol = known?.symbol;
    if (decimals === undefined || symbol === undefined) {
      try {
        const [d, s] = await Promise.all([
          withRpcRetry(() =>
            client.readContract({ address: tokenAddress, abi: ERC20_META_ABI, functionName: 'decimals' })
          ),
          withRpcRetry(() =>
            client.readContract({ address: tokenAddress, abi: ERC20_META_ABI, functionName: 'symbol' })
          ),
        ]);
        decimals = Number(d);
        symbol = s as string;
      } catch {
        return {
          valid: false,
          error: `Could not read decimals for token ${tokenAddress}; refusing to guess the amount`,
        };
      }
    }

    let required: bigint;
    try {
      required = parseUnits(expectedAmount as `${number}`, decimals);
    } catch {
      return { valid: false, error: `Unparseable price "${expectedAmount}"` };
    }

    if (args.value < required) {
      return {
        valid: false,
        error: `Underpaid: sent ${formatUnits(args.value, decimals)} ${symbol}, needed ${expectedAmount}`,
      };
    }

    return {
      valid: true,
      details: {
        txHash,
        from: getAddress(args.from),
        to: recipient,
        token: tokenAddress,
        tokenSymbol: symbol,
        amount: formatUnits(args.value, decimals),
        blockNumber: receipt.blockNumber.toString(),
        explorer: explorerTx(txHash),
      },
    };
  }

  const looked = expectedToken
    ? getAddress(expectedToken)
    : acceptedTokens.map((t) => t.symbol).join(' or ');
  return { valid: false, error: `No ${looked} transfer to ${recipient} found in that transaction` };
}
