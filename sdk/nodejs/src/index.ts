/**
 * Payless SDK for Node.js
 * Official SDK for integrating Payless x402 payments
 */

export { PaylessClient, createClient } from './client';
export {
  createPaymentProof,
  createMockPaymentProof,
  verifyPaymentProof,
  paymentProofToHeader,
} from './payment';
export type {
  PaylessConfig,
  PaymentProof,
  ApiRequestOptions,
  ApiResponse,
  WalletAdapter,
  EndpointInfo,
} from './types';

// Re-export for convenience
export { PublicKey, Keypair } from '@solana/web3.js';

