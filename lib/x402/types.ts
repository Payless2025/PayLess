export interface PaymentConfig {
  amount: string;
  currency: string;
  recipient: string;
  facilitator?: string;
  network?: string;
  tokenMint?: string; // Solana SPL token mint address
}

export interface PaymentVerificationResult {
  valid: boolean;
  signature?: string; // Solana transaction signature
  error?: string;
}

export interface ChainPaymentInfo {
  chain: string;
  recipient: string;
  network: string;
  tokens: string[];
}

export interface X402Response {
  status: 402;
  message: string;
  payment: {
    amount: string;
    currency: string;
    recipient?: string; // For single-chain (backward compatibility)
    facilitator: string;
    network?: string; // For single-chain (backward compatibility)
    tokenMint?: string; // For single-chain (backward compatibility)
    chains?: ChainPaymentInfo[]; // For multi-chain support
  };
}

export interface EndpointConfig {
  [endpoint: string]: string;
}

export interface SolanaPaymentPayload {
  from: string; // Payer's Solana wallet address (base58)
  to: string; // Recipient's Solana wallet address (base58)
  amount: string; // Amount in USDC (not lamports)
  token: string; // Token symbol (e.g., "USDC")
  tokenMint: string; // SPL token mint address
  nonce: string; // Unique identifier
  signature: string; // Base58 encoded signature
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
  tokenMint: string; // Token mint address
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
  chain: string; // solana, bsc, ethereum
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
