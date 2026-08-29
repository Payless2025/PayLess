export interface PaymentConfig {
  amount: string;
  currency: string;
  recipient: string;
  facilitator?: string;
  network?: string;
  tokenAddress?: string; // ERC-20 contract address on Robinhood Chain
}

export interface PaymentVerificationResult {
  valid: boolean;
  /** Settled payments report the on-chain transaction hash here. */
  signature?: string;
  error?: string;
  /** The transfer is not mined yet — the caller should retry rather than re-pay. */
  pending?: boolean;
  settlement?: {
    txHash: string;
    from: string;
    to: string;
    token: string;
    tokenSymbol: string;
    amount: string;
    blockNumber: string;
  };
}

export interface ChainPaymentInfo {
  chain: string;
  recipient: string;
  network: string; // Chain ID
  tokens: string[];
}

export interface X402Response {
  status: 402;
  message: string;
  payment: {
    amount: string;
    currency: string;
    recipient?: string;
    facilitator: string;
    network?: string; // Chain ID
    tokenAddress?: string;
    chains?: ChainPaymentInfo[];
  };
}

export interface EndpointConfig {
  [endpoint: string]: string;
}

export interface RobinhoodPaymentPayload {
  from: string; // Payer's wallet address (0x…)
  to: string; // Recipient's wallet address (0x…)
  amount: string; // Amount in whole tokens (e.g. "0.05"), not base units
  token: string; // Token symbol (e.g. "USDG")
  tokenAddress: string; // ERC-20 contract address
  chainId: string; // Chain ID (4663 for Robinhood Chain mainnet)
  /**
   * Hash of the on-chain USDG transfer that pays for this request. Required
   * outside demo mode — this, not the signature, is what proves payment. It
   * also doubles as the replay key.
   */
  transactionHash?: string;
  nonce: string; // Unique identifier (demo mode only; settled payments key off transactionHash)
  signature: string; // EIP-191 personal_sign signature
  timestamp: number; // Unix timestamp
  message: string; // Message that was signed
}

export interface PaymentConfirmation {
  id: string; // Unique confirmation ID
  paymentSignature: string; // Payment signature (transaction hash)
  nonce: string; // Nonce from the original payment
  walletAddress: string; // Payer's wallet address
  recipient: string; // Recipient's wallet address
  amount: string; // Payment amount
  token: string; // Token symbol
  tokenAddress: string; // ERC-20 contract address
  endpoint: string; // API endpoint that was accessed
  confirmedAt: number; // Timestamp of confirmation
  status: 'confirmed' | 'pending' | 'failed'; // Confirmation status
  metadata?: {
    userAgent?: string;
    method?: string;
    responseTime?: number;
  };
}

export interface PaymentConfirmationQuery {
  signature?: string; // Query by payment signature
  nonce?: string; // Query by nonce
  walletAddress?: string; // Query by wallet address
  startDate?: number; // Filter by date range
  endDate?: number;
  status?: 'confirmed' | 'pending' | 'failed';
  limit?: number;
}

export interface PaymentConfirmationResponse {
  confirmations: PaymentConfirmation[];
  total: number;
  hasMore: boolean;
}

// Webhook Types
export interface WebhookEvent {
  id: string; // Unique event ID
  type: WebhookEventType;
  timestamp: number;
  data: PaymentWebhookData;
}

export enum WebhookEventType {
  PAYMENT_CONFIRMED = 'payment.confirmed',
  PAYMENT_PENDING = 'payment.pending',
  PAYMENT_FAILED = 'payment.failed',
}

export interface PaymentWebhookData {
  paymentId: string;
  signature: string; // Transaction signature
  chain: string; // robinhood
  from: string; // Payer wallet address
  to: string; // Recipient wallet address
  amount: string;
  token: string;
  endpoint: string; // API endpoint that was accessed
  timestamp: number;
  status: 'confirmed' | 'pending' | 'failed';
  metadata?: {
    userAgent?: string;
    method?: string;
    responseTime?: number;
  };
}

export interface WebhookConfig {
  url: string; // Webhook endpoint URL
  secret: string; // Secret for signature verification
  events: WebhookEventType[]; // Events to subscribe to
  enabled: boolean;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  eventId: string;
  url: string;
  status: 'pending' | 'success' | 'failed';
  attempts: number;
  maxAttempts: number;
  lastAttemptAt?: number;
  nextRetryAt?: number;
  response?: {
    statusCode?: number;
    error?: string;
  };
}
