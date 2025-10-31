import { PublicKey, Keypair } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { PaymentProof } from './types';

/**
 * Create a payment proof for x402 protocol
 */
export async function createPaymentProof(
  fromAddress: string,
  toAddress: string,
  amount: string,
  tokenMint: string,
  signMessage: (message: Uint8Array) => Promise<Uint8Array>
): Promise<PaymentProof> {
  const timestamp = Date.now();
  const message = `Payless Payment: ${amount} USDC from ${fromAddress} to ${toAddress} at ${timestamp}`;
  
  const messageBytes = new TextEncoder().encode(message);
  const signatureBytes = await signMessage(messageBytes);
  const signature = bs58.encode(signatureBytes);

  return {
    from: fromAddress,
    to: toAddress,
    amount,
    tokenMint,
    timestamp,
    message,
    signature,
  };
}

/**
 * Create a mock payment proof for testing (without real wallet)
 */
export function createMockPaymentProof(
  fromAddress: string,
  toAddress: string,
  amount: string,
  tokenMint: string
): PaymentProof {
  const timestamp = Date.now();
  const message = `Payless Payment: ${amount} USDC from ${fromAddress} to ${toAddress} at ${timestamp}`;
  
  // Create a mock signature (DO NOT use in production)
  const mockKeypair = Keypair.generate();
  const messageBytes = new TextEncoder().encode(message);
  const signatureBytes = nacl.sign.detached(messageBytes, mockKeypair.secretKey);
  const signature = bs58.encode(signatureBytes);

  return {
    from: fromAddress,
    to: toAddress,
    amount,
    tokenMint,
    timestamp,
    message,
    signature,
  };
}

/**
 * Verify a payment proof signature
 */
export function verifyPaymentProof(proof: PaymentProof): boolean {
  try {
    const messageBytes = new TextEncoder().encode(proof.message);
    const signatureBytes = bs58.decode(proof.signature);
    const publicKey = new PublicKey(proof.from);

    return nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKey.toBytes()
    );
  } catch (error) {
    return false;
  }
}

/**
 * Convert payment proof to x402 header format
 */
export function paymentProofToHeader(proof: PaymentProof): string {
  return JSON.stringify(proof);
}

