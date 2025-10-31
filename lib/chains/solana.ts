/**
 * Solana payment verification (extracted from middleware)
 */

import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

export interface SolanaPaymentPayload {
  from: string;
  to: string;
  amount: string;
  tokenMint: string;
  timestamp: number;
  message: string;
  signature: string;
}

/**
 * Verify Solana payment signature
 */
export async function verifySolanaPayment(
  payment: SolanaPaymentPayload,
  expectedAmount: string,
  expectedRecipient: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    // Verify recipient
    if (payment.to !== expectedRecipient) {
      return { valid: false, error: 'Invalid recipient address' };
    }

    // Verify amount
    if (parseFloat(payment.amount) < parseFloat(expectedAmount)) {
      return { valid: false, error: 'Insufficient payment amount' };
    }

    // Verify timestamp (within 5 minutes)
    const now = Date.now();
    if (now - payment.timestamp > 5 * 60 * 1000) {
      return { valid: false, error: 'Payment expired' };
    }

    // Verify signature
    const messageBytes = new TextEncoder().encode(payment.message);
    const signatureBytes = bs58.decode(payment.signature);
    const publicKey = new PublicKey(payment.from);

    const isValid = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKey.toBytes()
    );

    if (!isValid) {
      return { valid: false, error: 'Invalid signature' };
    }

    return { valid: true };
  } catch (error) {
    console.error('Solana payment verification error:', error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Verification failed',
    };
  }
}

/**
 * Format Solana address
 */
export function formatSolanaAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

/**
 * Get Solana transaction link
 */
export function getSolanaTransactionLink(signature: string): string {
  return `https://solscan.io/tx/${signature}`;
}

/**
 * Get Solana address link
 */
export function getSolanaAddressLink(address: string): string {
  return `https://solscan.io/account/${address}`;
}

