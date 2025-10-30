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

export interface X402Response {
  status: 402;
  message: string;
  payment: {
    amount: string;
    currency: string;
    recipient: string; // Solana wallet address (base58)
    facilitator: string;
    network: string;
    tokenMint: string; // USDC SPL token mint
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
