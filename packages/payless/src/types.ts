import type { PaymentToken } from './chain.js';
import type { SpentStore } from './store.js';

export interface PaylessOptions {
  /** The address that receives payments. Required — a 402 has to name it. */
  recipient: string;
  /** Override the RPC endpoint. The public one rate-limits. */
  rpcUrl?: string;
  /** Tokens you accept. Defaults to USDG and WETH. */
  tokens?: PaymentToken[];
  /** Replay ledger. Defaults to in-memory — replace it on serverless. */
  store?: SpentStore;
  /** How old a settlement may be. Defaults to 30 minutes. */
  maxAgeMs?: number;
}

/** What the caller puts in the `X-Payment` header. */
export interface PaymentPayload {
  /** Hash of the on-chain transfer that pays for this request */
  transactionHash: string;
  from?: string;
  to?: string;
  amount?: string;
  token?: string;
  tokenAddress?: string;
  chainId?: string;
}

export interface Challenge {
  status: 402;
  message: string;
  payment: {
    amount: string;
    currency: string;
    recipient: string;
    network: string;
    tokenAddress: string;
    acceptedTokens: Array<{ symbol: string; address: string; decimals: number }>;
  };
}
