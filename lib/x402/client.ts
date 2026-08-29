import { RobinhoodPaymentPayload } from './types';
import { ROBINHOOD_CHAIN_ID, USDG_ADDRESS } from '../chains/config';

/**
 * Client-side payment utilities for Robinhood Chain
 */

export type SignMessage = (message: string) => Promise<string>;

export interface RobinhoodWalletProvider {
  address: string; // Checksummed 0x address
  signMessage: SignMessage;
}

/**
 * Create the payment message to sign
 */
export function createPaymentMessage(
  from: string,
  to: string,
  amount: string,
  token: string,
  tokenAddress: string,
  nonce: string,
  timestamp: number
): string {
  return JSON.stringify({
    from,
    to,
    amount,
    token,
    tokenAddress,
    chainId: ROBINHOOD_CHAIN_ID,
    nonce,
    timestamp,
    protocol: 'x402-robinhood',
  });
}

/**
 * Create payment payload (to be signed)
 */
export function createPaymentPayload(
  from: string,
  to: string,
  amount: string,
  tokenAddress: string = USDG_ADDRESS,
  token: string = 'USDG'
): Omit<RobinhoodPaymentPayload, 'signature'> {
  const nonce = Math.random().toString(36).substring(7);
  const timestamp = Date.now();
  const message = createPaymentMessage(from, to, amount, token, tokenAddress, nonce, timestamp);

  return {
    from,
    to,
    amount,
    token,
    tokenAddress,
    chainId: ROBINHOOD_CHAIN_ID,
    nonce,
    timestamp,
    message,
  };
}

/**
 * Generate a syntactically valid but meaningless 65-byte signature.
 * Only used in demo mode, where the server skips signature recovery.
 */
function mockSignature(): string {
  const bytes = Array.from({ length: 65 }, () =>
    Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, '0')
  );
  return `0x${bytes.join('')}`;
}

/**
 * Sign payment payload with a connected Robinhood Chain wallet
 */
export async function signPaymentPayload(
  payload: Omit<RobinhoodPaymentPayload, 'signature'>,
  signMessage?: SignMessage
): Promise<RobinhoodPaymentPayload> {
  if (!signMessage) {
    return {
      ...payload,
      signature: mockSignature(),
    };
  }

  try {
    const signature = await signMessage(payload.message);
    return {
      ...payload,
      signature,
    };
  } catch (error) {
    throw new Error(
      'Failed to sign payment: ' + (error instanceof Error ? error.message : 'Unknown error')
    );
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
  tokenAddress?: string,
  signMessage?: SignMessage
): Promise<Response> {
  // First request without payment to get 402 response
  const initialResponse = await fetch(url, options);

  if (initialResponse.status !== 402) {
    return initialResponse;
  }

  // Parse payment requirements
  const paymentInfo = await initialResponse.json();
  const { payment } = paymentInfo;

  if (!walletAddress) {
    throw new Error('A connected Robinhood Chain wallet address is required to pay');
  }

  // Create and sign payment
  const paymentPayload = createPaymentPayload(
    walletAddress,
    recipientAddress || payment.recipient,
    amount || payment.amount,
    tokenAddress || payment.tokenAddress,
    payment.currency
  );

  const signedPayment = await signPaymentPayload(paymentPayload, signMessage);

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
 * Demo mode: create a mock payment header for Robinhood Chain
 */
export function createMockPayment(
  from: string,
  to: string,
  amount: string,
  tokenAddress: string = USDG_ADDRESS
): string {
  const payload: RobinhoodPaymentPayload = {
    ...createPaymentPayload(from, to, amount, tokenAddress),
    signature: mockSignature(),
  };

  return JSON.stringify(payload);
}

/**
 * Create a real payment with a connected Robinhood Chain wallet
 */
export async function createRealPayment(
  from: string,
  to: string,
  amount: string,
  tokenAddress: string = USDG_ADDRESS,
  signMessage: SignMessage
): Promise<string> {
  const payload = createPaymentPayload(from, to, amount, tokenAddress);

  try {
    // Request signature from wallet (this triggers the wallet popup)
    console.log('[Payment] Requesting signature from wallet...');
    const signature = await signMessage(payload.message);
    console.log('[Payment] Signature received:', signature.substring(0, 20) + '...');

    return JSON.stringify({ ...payload, signature });
  } catch (error) {
    console.error('[Payment] Signature error:', error);
    throw new Error(
      `Failed to sign payment: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Validate a Robinhood Chain wallet address
 */
export function isValidRobinhoodAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(address);
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
