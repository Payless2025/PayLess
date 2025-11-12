/**
 * Payless React Native SDK
 * Official SDK for accepting crypto payments in React Native apps
 */

// Core Client
export { PaylessClient, createClient } from './client';

// Types
export type {
  PaylessConfig,
  PaymentProof,
  ApiRequestOptions,
  ApiResponse,
  WalletAdapter,
  EndpointInfo,
  PaymentStreamConfig,
  PaymentStream,
  BlockchainNetwork,
  PhantomProvider,
  WalletConnectConfig,
} from './types';

// Payment Utils
export {
  createSolanaPaymentProof,
  createEvmPaymentProof,
  createMockPaymentProof,
  paymentProofToHeader,
  parsePaymentProofFromHeader,
  verifySolanaPaymentProof,
} from './payment';

// Wallet Adapters
export { PhantomWalletAdapter, createPhantomWallet } from './wallets/phantom';
export { WalletConnectAdapter, createWalletConnectWallet } from './wallets/walletconnect';

// React Hooks
export { usePayless } from './hooks/usePayless';
export type { UsePaylessReturn } from './hooks/usePayless';
export { usePaymentStream } from './hooks/usePaymentStream';
export type { UsePaymentStreamReturn } from './hooks/usePaymentStream';

// React Native Components
export { PaymentButton } from './components/PaymentButton';
export type { PaymentButtonProps } from './components/PaymentButton';
export { WalletButton } from './components/WalletButton';
export type { WalletButtonProps } from './components/WalletButton';

