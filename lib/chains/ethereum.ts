/**
 * Ethereum payment verification
 */

import { ethers } from 'ethers';

export interface EthereumPaymentPayload {
  from: string; // Sender's wallet address
  to: string; // Recipient's wallet address
  amount: string; // Payment amount
  token: string; // Token contract address (USDT/USDC)
  chainId: string; // Chain ID (1 for Ethereum mainnet)
  timestamp: number;
  message: string;
  signature: string;
}

/**
 * Verify Ethereum payment signature
 */
export async function verifyEthereumPayment(
  payment: EthereumPaymentPayload,
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
    if (payment.chainId !== '1') {
      return { valid: false, error: 'Invalid chain ID' };
    }

    // Verify signature
    const recoveredAddress = ethers.utils.verifyMessage(
      payment.message,
      payment.signature
    );

    if (recoveredAddress.toLowerCase() !== payment.from.toLowerCase()) {
      return { valid: false, error: 'Invalid signature' };
    }

    return { valid: true };
  } catch (error) {
    console.error('Ethereum payment verification error:', error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Verification failed',
    };
  }
}

/**
 * Create Ethereum payment message to sign
 */
export function createEthereumPaymentMessage(
  from: string,
  to: string,
  amount: string,
  token: string,
  timestamp: number
): string {
  return `Payless Payment:\nFrom: ${from}\nTo: ${to}\nAmount: ${amount}\nToken: ${token}\nTimestamp: ${timestamp}`;
}

/**
 * Format Ethereum address
 */
export function formatEthereumAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Validate Ethereum address
 */
export function isValidEthereumAddress(address: string): boolean {
  return ethers.utils.isAddress(address);
}

/**
 * Get Ethereum transaction link
 */
export function getEthereumTransactionLink(txHash: string): string {
  return `https://etherscan.io/tx/${txHash}`;
}

/**
 * Get Ethereum address link
 */
export function getEthereumAddressLink(address: string): string {
  return `https://etherscan.io/address/${address}`;
}

/**
 * Get recommended gas price for Ethereum
 */
export async function getEthereumGasPrice(): Promise<{ 
  low: string; 
  medium: string; 
  high: string; 
}> {
  try {
    const provider = new ethers.providers.JsonRpcProvider(
      process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com'
    );
    
    const gasPrice = await provider.getGasPrice();
    const gasPriceGwei = ethers.utils.formatUnits(gasPrice, 'gwei');
    
    return {
      low: (parseFloat(gasPriceGwei) * 0.9).toFixed(2),
      medium: gasPriceGwei,
      high: (parseFloat(gasPriceGwei) * 1.2).toFixed(2),
    };
  } catch (error) {
    console.error('Failed to fetch gas price:', error);
    // Return default values if fetch fails
    return {
      low: '20',
      medium: '30',
      high: '40',
    };
  }
}

