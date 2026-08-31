/**
 * Robinhood Chain — the network Payless settles on.
 * https://robinhood.com/us/en/support/articles/robinhood-chain-mainnet/
 */

import { createPublicClient, http, type PublicClient } from 'viem';

export const ROBINHOOD_CHAIN_ID = 4663;
export const ROBINHOOD_RPC_URL = 'https://rpc.mainnet.chain.robinhood.com';
export const ROBINHOOD_EXPLORER_URL = 'https://robinhoodchain.blockscout.com';

/**
 * Tokens Payless accepts by default.
 * Canonical addresses: https://docs.robinhood.com/chain/contracts/
 */
export const USDG = {
  symbol: 'USDG',
  address: '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168' as const,
  decimals: 6,
};

export const WETH = {
  symbol: 'WETH',
  address: '0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73' as const,
  decimals: 18,
};

export interface PaymentToken {
  symbol: string;
  address: `0x${string}`;
  decimals: number;
}

export const DEFAULT_TOKENS: PaymentToken[] = [USDG, WETH];

/**
 * The public RPC rate-limits under light load. Pass your own endpoint for
 * anything beyond development — settlement costs two reads per paid request.
 */
export function createChainClient(rpcUrl: string = ROBINHOOD_RPC_URL): PublicClient {
  return createPublicClient({ transport: http(rpcUrl) });
}

/** Retry only on rate limiting; surface everything else immediately. */
export async function withRpcRetry<T>(fn: () => Promise<T>, tries = 4): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const status = (error as { status?: number })?.status;
      const rateLimited =
        status === 429 || /429|rate limit/i.test(String((error as Error)?.message));
      if (!rateLimited) throw error;
      await new Promise((r) => setTimeout(r, 400 * (i + 1)));
    }
  }
  throw lastError;
}

export const explorerTx = (hash: string) => `${ROBINHOOD_EXPLORER_URL}/tx/${hash}`;
export const explorerAddress = (address: string) => `${ROBINHOOD_EXPLORER_URL}/address/${address}`;
