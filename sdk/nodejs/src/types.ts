/**
 * Payless SDK Types
 */

export interface PaylessConfig {
  /** Your wallet address to receive payments */
  walletAddress: string;
  /** Solana network (mainnet-beta, devnet, testnet) */
  network?: 'mainnet-beta' | 'devnet' | 'testnet';
  /** Custom RPC URL (optional) */
  rpcUrl?: string;
  /** USDC token mint address */
  usdcMint?: string;
  /** x402 facilitator URL */
  facilitatorUrl?: string;
}

export interface PaymentProof {
  /** Sender's wallet address */
  from: string;
  /** Recipient's wallet address */
  to: string;
  /** Payment amount in USDC */
  amount: string;
  /** Token mint address (USDC) */
  tokenMint: string;
  /** Timestamp of payment creation */
  timestamp: number;
  /** Payment message */
  message: string;
  /** Cryptographic signature */
  signature: string;
}

export interface ApiRequestOptions {
  /** HTTP method */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  /** Request headers */
  headers?: Record<string, string>;
  /** Request body */
  body?: any;
  /** Payment amount (if different from endpoint default) */
  paymentAmount?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  status: number;
}

export interface WalletAdapter {
  publicKey: string;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
}

export interface EndpointInfo {
  path: string;
  price: string;
  method: string;
  description?: string;
}

