import { SolanaPaymentPayload } from './types';
import bs58 from 'bs58';

/**
 * Client-side payment utilities for Solana
 */

export interface SolanaWalletProvider {
  publicKey: string; // base58 encoded public key
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
}

/**
 * Create payment message to sign
 */
export function createPaymentMessage(
  from: string,
  to: string,
  amount: string,
  token: string,
  tokenMint: string,
  nonce: string,
  timestamp: number
): string {
  return JSON.stringify({
    from,
    to,
    amount,
    token,
    tokenMint,
    nonce,
    timestamp,
    protocol: 'x402-solana',
  });
}

/**
 * Create payment payload (to be signed)
 */
export function createPaymentPayload(
  from: string,
  to: string,
  amount: string,
  tokenMint: string,
  token: string = 'USDC'
): Omit<SolanaPaymentPayload, 'signature'> {
  const nonce = Math.random().toString(36).substring(7);
  const timestamp = Date.now();
  const message = createPaymentMessage(from, to, amount, token, tokenMint, nonce, timestamp);

  return {
    from,
    to,
    amount,
    token,
    tokenMint,
    nonce,
    timestamp,
    message,
  };
}

/**
 * Sign payment payload with Solana wallet
 */
export async function signPaymentPayload(
  payload: Omit<SolanaPaymentPayload, 'signature'>,
  wallet?: SolanaWalletProvider
): Promise<SolanaPaymentPayload> {
  // In production, use Phantom or other Solana wallet to sign
  // For demo purposes, create a mock signature
  if (!wallet || process.env.NODE_ENV !== 'production') {
    const mockSignature = bs58.encode(Buffer.from(Array(64).fill(0).map(() => Math.floor(Math.random() * 256))));
    return {
      ...payload,
      signature: mockSignature,
    };
  }

  try {
    const messageBytes = new TextEncoder().encode(payload.message);
    const signatureBytes = await wallet.signMessage(messageBytes);
    const signature = bs58.encode(signatureBytes);

    return {
      ...payload,
      signature,
    };
  } catch (error) {
    throw new Error('Failed to sign payment: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

/**
 * Make payment request to API
 */
export async function makePaymentRequest(
  url: string,
  options: RequestInit = {},
  walletAddress?: string,
  recipientAddress?: string,
  amount?: string,
  tokenMint?: string
): Promise<Response> {
  // First request without payment to get 402 response
  const initialResponse = await fetch(url, options);

  if (initialResponse.status !== 402) {
    return initialResponse;
  }

  // Parse payment requirements
  const paymentInfo = await initialResponse.json();
  const { payment } = paymentInfo;

  // Create and sign payment
  const paymentPayload = createPaymentPayload(
    walletAddress || '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
    recipientAddress || payment.recipient,
    amount || payment.amount,
    tokenMint || payment.tokenMint,
    payment.currency
  );

  const signedPayment = await signPaymentPayload(paymentPayload);

  // Retry request with payment
  const paymentResponse = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'X-Payment': JSON.stringify(signedPayment),
    },
  });

  return paymentResponse;
}

/**
 * Test mode: Create mock payment header for Solana
 */
export function createMockPayment(
  from: string,
  to: string,
  amount: string,
  tokenMint: string = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
): string {
  const nonce = Math.random().toString(36).substring(7);
  const timestamp = Date.now();
  const message = createPaymentMessage(from, to, amount, 'USDC', tokenMint, nonce, timestamp);
  
  const payload: SolanaPaymentPayload = {
    from,
    to,
    amount,
    token: 'USDC',
    tokenMint,
    nonce,
    signature: bs58.encode(Buffer.from(Array(64).fill(0).map(() => Math.floor(Math.random() * 256)))),
    timestamp,
    message,
  };

  return JSON.stringify(payload);
}

/**
 * Create real payment with connected Solana wallet
 */
export async function createRealPayment(
  from: string,
  to: string,
  amount: string,
  tokenMint: string = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  signMessage: (message: Uint8Array) => Promise<Uint8Array>
): Promise<string> {
  const nonce = Math.random().toString(36).substring(7);
  const timestamp = Date.now();
  const message = createPaymentMessage(from, to, amount, 'USDC', tokenMint, nonce, timestamp);
  
  try {
    // Create message to sign
    const messageBytes = new TextEncoder().encode(message);
    
    // Request signature from wallet (this will trigger Phantom popup)
    console.log('[Payment] Requesting signature from wallet...');
    const signatureBytes = await signMessage(messageBytes);
    const signature = bs58.encode(signatureBytes);
    console.log('[Payment] Signature received:', signature.substring(0, 20) + '...');
    
    const payload: SolanaPaymentPayload = {
      from,
      to,
      amount,
      token: 'USDC',
      tokenMint,
      nonce,
      signature,
      timestamp,
      message,
    };

    return JSON.stringify(payload);
  } catch (error) {
    console.error('[Payment] Signature error:', error);
    throw new Error(`Failed to sign payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate Solana wallet address
 */
export function isValidSolanaAddress(address: string): boolean {
  try {
    const decoded = bs58.decode(address);
    return decoded.length === 32;
  } catch {
    return false;
  }
}

/**
 * Payment Confirmation Utilities
 */

export interface PaymentConfirmationStatus {
  confirmed: boolean;
  message: string;
  confirmation?: any;
}

/**
 * Check if a payment was confirmed by signature
 */
export async function checkPaymentConfirmation(
  signature: string,
  walletAddress?: string
): Promise<PaymentConfirmationStatus> {
  try {
    const response = await fetch('/api/payment/confirm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        signature,
        walletAddress,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to check payment confirmation');
    }

    return await response.json();
  } catch (error) {
    console.error('[Payment Confirmation] Error checking payment:', error);
    return {
      confirmed: false,
      message: 'Error checking payment confirmation',
    };
  }
}

/**
 * Check if a payment was confirmed by nonce
 */
export async function checkPaymentConfirmationByNonce(
  nonce: string,
  walletAddress?: string
): Promise<PaymentConfirmationStatus> {
  try {
    const response = await fetch('/api/payment/confirm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        nonce,
        walletAddress,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to check payment confirmation');
    }

    return await response.json();
  } catch (error) {
    console.error('[Payment Confirmation] Error checking payment:', error);
    return {
      confirmed: false,
      message: 'Error checking payment confirmation',
    };
  }
}

/**
 * Get payment history for a wallet
 */
export async function getPaymentHistory(
  walletAddress: string,
  options?: {
    startDate?: number;
    endDate?: number;
    limit?: number;
  }
): Promise<any> {
  try {
    const params = new URLSearchParams({
      walletAddress,
      ...(options?.startDate && { startDate: options.startDate.toString() }),
      ...(options?.endDate && { endDate: options.endDate.toString() }),
      ...(options?.limit && { limit: options.limit.toString() }),
    });

    const response = await fetch(`/api/payment/confirm?${params.toString()}`);

    if (!response.ok) {
      throw new Error('Failed to get payment history');
    }

    return await response.json();
  } catch (error) {
    console.error('[Payment History] Error:', error);
    return {
      confirmations: [],
      total: 0,
      hasMore: false,
      error: 'Failed to fetch payment history',
    };
  }
}

/**
 * Monitor payment confirmation with polling
 */
export async function monitorPaymentConfirmation(
  nonce: string,
  options?: {
    timeout?: number; // Maximum time to wait in ms (default: 60000 - 1 minute)
    interval?: number; // Polling interval in ms (default: 2000 - 2 seconds)
    onUpdate?: (confirmed: boolean, attempts: number) => void;
  }
): Promise<PaymentConfirmationStatus> {
  const timeout = options?.timeout || 60000; // 1 minute
  const interval = options?.interval || 2000; // 2 seconds
  const startTime = Date.now();
  let attempts = 0;

  return new Promise((resolve) => {
    const checkStatus = async () => {
      attempts++;
      const status = await checkPaymentConfirmationByNonce(nonce);

      if (options?.onUpdate) {
        options.onUpdate(status.confirmed, attempts);
      }

      if (status.confirmed) {
        resolve(status);
        return;
      }

      // Check if timeout reached
      if (Date.now() - startTime >= timeout) {
        resolve({
          confirmed: false,
          message: 'Payment confirmation timeout',
        });
        return;
      }

      // Continue polling
      setTimeout(checkStatus, interval);
    };

    checkStatus();
  });
}
