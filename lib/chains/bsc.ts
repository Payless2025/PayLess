/**
 * BSC (Binance Smart Chain) payment verification
 */

import { ethers } from 'ethers';

export interface BSCPaymentPayload {
  from: string; // Sender's wallet address
  to: string; // Recipient's wallet address
  amount: string; // Payment amount
  token: string; // Token contract address (USDT/BUSD/USDC)
  chainId: string; // Chain ID (56 for BSC mainnet)
  timestamp: number;
  message: string;
  signature: string;
}

/**
 * Verify BSC payment signature
 */
export async function verifyBSCPayment(
  payment: BSCPaymentPayload,
  expectedAmount: string,
  expectedRecipient: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    // Verify recipient
    if (payment.to.toLowerCase() !== expectedRecipient.toLowerCase()) {
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
    if (payment.chainId !== '56') {
      return { valid: false, error: 'Invalid chain ID' };
    }

    // Verify signature
    const messageHash = ethers.utils.solidityKeccak256(
      ['string'],
      [payment.message]
    );

    const recoveredAddress = ethers.utils.verifyMessage(
      payment.message,
      payment.signature
    );

    if (recoveredAddress.toLowerCase() !== payment.from.toLowerCase()) {
      return { valid: false, error: 'Invalid signature' };
    }

    return { valid: true };
  } catch (error) {
    console.error('BSC payment verification error:', error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Verification failed',
    };
  }
}

/**
 * Create BSC payment message to sign
 */
export function createBSCPaymentMessage(
  from: string,
  to: string,
  amount: string,
  token: string,
  timestamp: number
): string {
  return `Payless Payment:\nFrom: ${from}\nTo: ${to}\nAmount: ${amount}\nToken: ${token}\nTimestamp: ${timestamp}`;
}

/**
 * Format BSC address
 */
export function formatBSCAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Validate BSC address
 */
export function isValidBSCAddress(address: string): boolean {
  return ethers.utils.isAddress(address);
}

/**
 * Get BSC transaction link
 */
export function getBSCTransactionLink(txHash: string): string {
  return `https://bscscan.com/tx/${txHash}`;
}

/**
 * Get BSC address link
 */
export function getBSCAddressLink(address: string): string {
  return `https://bscscan.com/address/${address}`;
}

