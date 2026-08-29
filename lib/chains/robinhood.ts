/**
 * Robinhood Chain payment verification
 */

import { ethers } from 'ethers';
import { ROBINHOOD_CHAIN_ID, ROBINHOOD_EXPLORER_URL } from './config';

export interface RobinhoodPaymentPayload {
  from: string; // Payer's wallet address (0x…)
  to: string; // Recipient's wallet address (0x…)
  amount: string; // Payment amount in whole tokens (e.g. "0.05")
  token: string; // Token symbol (e.g. "USDG")
  tokenAddress: string; // ERC-20 contract address
  chainId: string; // Chain ID (4663 for Robinhood Chain mainnet)
  nonce: string; // Unique identifier
  timestamp: number;
  message: string; // Message that was signed
  signature: string; // EIP-191 personal_sign signature
}

/**
 * Create the Robinhood Chain payment message to sign
 */
export function createRobinhoodPaymentMessage(
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
 * Verify Robinhood Chain payment signature
 */
export async function verifyRobinhoodPayment(
  payment: RobinhoodPaymentPayload,
  expectedAmount: string,
  expectedRecipient: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    // Verify recipient
    if (
      !expectedRecipient ||
      payment.to.toLowerCase() !== expectedRecipient.toLowerCase()
    ) {
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

    // Verify chain ID
    if (String(payment.chainId) !== ROBINHOOD_CHAIN_ID) {
      return {
        valid: false,
        error: `Invalid chain ID. Expected ${ROBINHOOD_CHAIN_ID} (Robinhood Chain).`,
      };
    }

    // Verify signature — recovers the signer from the EIP-191 signed message
    const recoveredAddress = ethers.utils.verifyMessage(
      payment.message,
      payment.signature
    );

    if (recoveredAddress.toLowerCase() !== payment.from.toLowerCase()) {
      return { valid: false, error: 'Invalid signature' };
    }

    return { valid: true };
  } catch (error) {
    console.error('Robinhood Chain payment verification error:', error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Verification failed',
    };
  }
}

/**
 * Format a Robinhood Chain address for display
 */
export function formatRobinhoodAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Validate a Robinhood Chain address
 */
export function isValidRobinhoodAddress(address: string): boolean {
  return ethers.utils.isAddress(address);
}

/**
 * Get a Robinhood Chain transaction link
 */
export function getRobinhoodTransactionLink(txHash: string): string {
  return `${ROBINHOOD_EXPLORER_URL}/tx/${txHash}`;
}

/**
 * Get a Robinhood Chain address link
 */
export function getRobinhoodAddressLink(address: string): string {
  return `${ROBINHOOD_EXPLORER_URL}/address/${address}`;
}

/**
 * Get a Robinhood Chain token link
 */
export function getRobinhoodTokenLink(tokenAddress: string): string {
  return `${ROBINHOOD_EXPLORER_URL}/token/${tokenAddress}`;
}
