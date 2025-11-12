import { PaymentProof, BlockchainNetwork } from './types';
import * as nacl from 'tweetnacl';
import bs58 from 'bs58';

/**
 * Create a payment proof for Solana
 */
export async function createSolanaPaymentProof(
  fromPublicKey: string,
  toAddress: string,
  amount: string,
  tokenMint: string,
  signMessage: (message: Uint8Array) => Promise<Uint8Array>
): Promise<PaymentProof> {
  const timestamp = Date.now();
  const message = `Payless Payment\nFrom: ${fromPublicKey}\nTo: ${toAddress}\nAmount: ${amount} USDC\nToken: ${tokenMint}\nTimestamp: ${timestamp}`;
  
  const messageBytes = new TextEncoder().encode(message);
  const signatureBytes = await signMessage(messageBytes);
  const signature = bs58.encode(signatureBytes);

  return {
    from: fromPublicKey,
    to: toAddress,
    amount,
    tokenAddress: tokenMint,
    network: 'solana',
    timestamp,
    message,
    signature,
  };
}

/**
 * Create a payment proof for EVM chains (Ethereum, BSC)
 */
export async function createEvmPaymentProof(
  fromAddress: string,
  toAddress: string,
  amount: string,
  tokenAddress: string,
  network: 'ethereum' | 'bsc',
  signMessage: (message: string) => Promise<string>
): Promise<PaymentProof> {
  const timestamp = Date.now();
  const message = `Payless Payment\nFrom: ${fromAddress}\nTo: ${toAddress}\nAmount: ${amount}\nToken: ${tokenAddress}\nNetwork: ${network}\nTimestamp: ${timestamp}`;
  
  const signature = await signMessage(message);

  return {
    from: fromAddress,
    to: toAddress,
    amount,
    tokenAddress,
    network,
    timestamp,
    message,
    signature,
  };
}

/**
 * Create a mock payment proof for testing (no wallet required)
 */
export function createMockPaymentProof(
  fromAddress: string,
  toAddress: string,
  amount: string,
  tokenAddress: string,
  network: BlockchainNetwork = 'solana'
): PaymentProof {
  const timestamp = Date.now();
  const message = `Payless Payment (MOCK)\nFrom: ${fromAddress}\nTo: ${toAddress}\nAmount: ${amount}\nToken: ${tokenAddress}\nNetwork: ${network}\nTimestamp: ${timestamp}`;
  
  // Generate a mock signature
  const keypair = nacl.sign.keyPair();
  const messageBytes = new TextEncoder().encode(message);
  const signatureBytes = nacl.sign.detached(messageBytes, keypair.secretKey);
  const signature = bs58.encode(signatureBytes);

  return {
    from: fromAddress,
    to: toAddress,
    amount,
    tokenAddress,
    network,
    timestamp,
    message,
    signature: `MOCK_${signature}`,
  };
}

/**
 * Convert payment proof to HTTP header value
 */
export function paymentProofToHeader(proof: PaymentProof): string {
  return Buffer.from(JSON.stringify(proof)).toString('base64');
}

/**
 * Parse payment proof from HTTP header
 */
export function parsePaymentProofFromHeader(header: string): PaymentProof {
  return JSON.parse(Buffer.from(header, 'base64').toString('utf-8'));
}

/**
 * Verify payment proof signature (Solana)
 */
export function verifySolanaPaymentProof(proof: PaymentProof): boolean {
  try {
    if (proof.signature.startsWith('MOCK_')) {
      // Skip verification for mock payments
      return true;
    }

    const messageBytes = new TextEncoder().encode(proof.message);
    const signatureBytes = bs58.decode(proof.signature);
    const publicKeyBytes = bs58.decode(proof.from);

    return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
  } catch (error) {
    console.error('Payment proof verification failed:', error);
    return false;
  }
}

