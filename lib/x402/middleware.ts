import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { PaymentVerificationResult, X402Response, SolanaPaymentPayload } from './types';
import { PAYMENT_CONFIG, ENDPOINT_PRICING, FREE_ENDPOINTS } from './config';

/**
 * Verify Solana payment signature
 */
export async function verifyPayment(
  paymentHeader: string | null,
  expectedAmount: string
): Promise<PaymentVerificationResult> {
  if (!paymentHeader) {
    return {
      valid: false,
      error: 'No payment provided',
    };
  }

  try {
    // Parse payment payload
    const payment: SolanaPaymentPayload = JSON.parse(paymentHeader);

    // Basic validation
    if (payment.to !== PAYMENT_CONFIG.walletAddress) {
      return {
        valid: false,
        error: 'Invalid recipient address',
      };
    }

    if (parseFloat(payment.amount) < parseFloat(expectedAmount)) {
      return {
        valid: false,
        error: 'Insufficient payment amount',
      };
    }

    // Verify timestamp (payment should be recent, within 5 minutes)
    const now = Date.now();
    const paymentAge = now - payment.timestamp;
    if (paymentAge > 5 * 60 * 1000) {
      return {
        valid: false,
        error: 'Payment expired',
      };
    }

    // Verify token mint
    if (payment.tokenMint !== PAYMENT_CONFIG.usdcMint) {
      return {
        valid: false,
        error: 'Invalid token. Only USDC is accepted.',
      };
    }

    // In production, verify signature
    const isTestMode = process.env.NODE_ENV !== 'production';
    
    if (!isTestMode) {
      try {
        // Verify Solana signature
        const message = payment.message;
        const signature = bs58.decode(payment.signature);
        const publicKey = new PublicKey(payment.from);
        const messageBytes = new TextEncoder().encode(message);

        const isValid = nacl.sign.detached.verify(
          messageBytes,
          signature,
          publicKey.toBytes()
        );

        if (!isValid) {
          return {
            valid: false,
            error: 'Invalid signature',
          };
        }

        // In a real implementation, you would also:
        // 1. Check on-chain that the transaction exists
        // 2. Verify the transaction transfers the correct amount
        // 3. Check that the transaction hasn't been used before (nonce check)
        
        // For now, if signature is valid, we accept it
        return {
          valid: true,
          signature: payment.signature,
        };
      } catch (error) {
        return {
          valid: false,
          error: error instanceof Error ? error.message : 'Signature verification failed',
        };
      }
    }

    // Test mode - simulate successful verification
    return {
      valid: true,
      signature: payment.signature || bs58.encode(Buffer.from(Array(64).fill(0))),
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Payment verification failed',
    };
  }
}

/**
 * Create 402 Payment Required response
 */
export function create402Response(amount: string): NextResponse<X402Response> {
  const response: X402Response = {
    status: 402,
    message: 'Payment Required',
    payment: {
      amount,
      currency: PAYMENT_CONFIG.currency,
      recipient: PAYMENT_CONFIG.walletAddress,
      facilitator: PAYMENT_CONFIG.facilitatorUrl,
      network: PAYMENT_CONFIG.network,
      tokenMint: PAYMENT_CONFIG.usdcMint,
    },
  };

  return NextResponse.json(response, { status: 402 });
}

/**
 * x402 Middleware wrapper for API routes
 */
export function withX402Payment(
  handler: (req: NextRequest) => Promise<NextResponse>,
  price?: string
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const pathname = new URL(req.url).pathname;

    // Check if endpoint is free
    if (FREE_ENDPOINTS.includes(pathname)) {
      return handler(req);
    }

    // Get price for endpoint
    const endpointPrice = price || ENDPOINT_PRICING[pathname];
    
    if (!endpointPrice) {
      return NextResponse.json(
        { error: 'Endpoint not configured' },
        { status: 500 }
      );
    }

    // Check for payment header
    const paymentHeader = req.headers.get('x-payment');

    if (!paymentHeader) {
      return create402Response(endpointPrice);
    }

    // Verify payment
    const verification = await verifyPayment(paymentHeader, endpointPrice);

    if (!verification.valid) {
      return NextResponse.json(
        { error: verification.error || 'Payment verification failed' },
        { status: 402 }
      );
    }

    // Payment valid - proceed with request
    const response = await handler(req);
    
    // Add payment confirmation header
    if (verification.signature) {
      response.headers.set('x-payment-confirmed', verification.signature);
    }

    return response;
  };
}

/**
 * Helper to get pricing for an endpoint
 */
export function getEndpointPrice(endpoint: string): string | null {
  return ENDPOINT_PRICING[endpoint] || null;
}
