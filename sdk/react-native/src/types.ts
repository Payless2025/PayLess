/**
 * Payless React Native SDK Types
 */

export type BlockchainNetwork = 'solana' | 'ethereum' | 'bsc';

export interface PaylessConfig {
  /** Your wallet address to receive payments */
  walletAddress: string;
  /** Blockchain network */
  network?: BlockchainNetwork;
  /** Custom RPC URL (optional) */
  rpcUrl?: string;
  /** Token mint/contract address */
  tokenAddress?: string;
  /** x402 facilitator URL */
  facilitatorUrl?: string;
  /** WalletConnect Project ID (for WalletConnect) */
  walletConnectProjectId?: string;
}

export interface PaymentProof {
  /** Sender's wallet address */
  from: string;
  /** Recipient's wallet address */
  to: string;
  /** Payment amount */
  amount: string;
  /** Token mint/contract address */
  tokenAddress: string;
  /** Blockchain network */
  network: BlockchainNetwork;
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
  signMessage: (message: Uint8Array | string) => Promise<Uint8Array | string>;
  network: BlockchainNetwork;
  disconnect?: () => Promise<void>;
}

export interface EndpointInfo {
  path: string;
  price: string;
  method: string;
  description?: string;
}

export interface PaymentStreamConfig {
  /** Stream recipient address */
  recipient: string;
  /** Amount per interval */
  amountPerInterval: string;
  /** Interval in seconds */
  interval: number;
  /** Total duration in seconds (optional) */
  duration?: number;
  /** Token address */
  tokenAddress?: string;
}

export interface PaymentStream {
  /** Unique stream ID */
  id: string;
  /** Stream sender */
  sender: string;
  /** Stream recipient */
  recipient: string;
  /** Amount per interval */
  amountPerInterval: string;
  /** Interval in seconds */
  interval: number;
  /** Start timestamp */
  startTime: number;
  /** End timestamp (optional) */
  endTime?: number;
  /** Last payment timestamp */
  lastPayment: number;
  /** Total amount paid */
  totalPaid: string;
  /** Stream status */
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  /** Token address */
  tokenAddress: string;
  /** Network */
  network: BlockchainNetwork;
}

export interface PhantomProvider {
  publicKey: { toBase58: () => string };
  signMessage: (message: Uint8Array, display?: 'hex' | 'utf8') => Promise<{ signature: Uint8Array }>;
  connect: () => Promise<{ publicKey: { toBase58: () => string } }>;
  disconnect: () => Promise<void>;
  isPhantom: boolean;
}

export interface WalletConnectConfig {
  projectId: string;
  metadata: {
    name: string;
    description: string;
    url: string;
    icons: string[];
  };
  relayUrl?: string;
}

