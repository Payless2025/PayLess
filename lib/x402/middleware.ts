import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { PaymentVerificationResult, X402Response, SolanaPaymentPayload } from './types';
import { PAYMENT_CONFIG, ENDPOINT_PRICING, FREE_ENDPOINTS } from './config';
import { trackApiRequest } from './analytics';

/**
 * Verify Solana payment signature
 */
export async function verifyPayment(
  paymentHeader: string | null,
  expectedAmount: string
): Promise<PaymentVerificationResult> {
  console.log('[x402] Verifying payment...', { expectedAmount, nodeEnv: process.env.NODE_ENV });
  
  if (!paymentHeader) {
    console.log('[x402] No payment header provided');
    return {
      valid: false,
      error: 'No payment provided',
    };
  }

  try {
    // Parse payment payload
    const payment: SolanaPaymentPayload = JSON.parse(paymentHeader);
    console.log('[x402] Payment payload:', { 
      from: payment.from, 
      to: payment.to, 
      amount: payment.amount,
      expectedTo: PAYMENT_CONFIG.walletAddress 
    });

    // Basic validation
    if (payment.to !== PAYMENT_CONFIG.walletAddress) {
      console.log('[x402] Recipient mismatch:', { 
        received: payment.to, 
        expected: PAYMENT_CONFIG.walletAddress 
      });
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
    // Allow test mode to be enabled even in production for demo purposes
    const isTestMode = process.env.NODE_ENV !== 'production' || process.env.ENABLE_DEMO_PAYMENTS === 'true';
    console.log('[x402] Test mode:', isTestMode, '(NODE_ENV:', process.env.NODE_ENV, 'ENABLE_DEMO_PAYMENTS:', process.env.ENABLE_DEMO_PAYMENTS, ')');
    
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
    console.log('[x402] Test mode - accepting payment');
    return {
      valid: true,
      signature: payment.signature || bs58.encode(Buffer.from(Array(64).fill(0))),
    };
  } catch (error) {
    console.log('[x402] Payment verification error:', error);
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
    const startTime = Date.now();
    const pathname = new URL(req.url).pathname;
    const method = req.method;
    const userAgent = req.headers.get('user-agent') || undefined;

    let walletAddress: string | undefined;
    let paymentAmount: string | undefined;
    let paymentProvided = false;
    let paymentValid = false;
    let responseStatus = 200;
    let errorMessage: string | undefined;

    try {
      // Check if endpoint is free
      if (FREE_ENDPOINTS.includes(pathname)) {
        const response = await handler(req);
        responseStatus = response.status;
        
        // Track free endpoint usage
        trackApiRequest({
          endpoint: pathname,
          method,
          status: responseStatus,
          paymentRequired: false,
          paymentProvided: false,
          paymentValid: false,
          responseTime: Date.now() - startTime,
          userAgent,
        });
        
        return response;
      }

      // Get price for endpoint
      const endpointPrice = price || ENDPOINT_PRICING[pathname];
      
      if (!endpointPrice) {
        responseStatus = 500;
        errorMessage = 'Endpoint not configured';
        
        trackApiRequest({
          endpoint: pathname,
          method,
          status: responseStatus,
          paymentRequired: true,
          paymentProvided: false,
          paymentValid: false,
          responseTime: Date.now() - startTime,
          userAgent,
          error: errorMessage,
        });
        
        return NextResponse.json(
          { error: errorMessage },
          { status: 500 }
        );
      }

      paymentAmount = endpointPrice;

      // Check for payment header
      const paymentHeader = req.headers.get('x-payment');

      if (!paymentHeader) {
        responseStatus = 402;
        
        trackApiRequest({
          endpoint: pathname,
          method,
          status: responseStatus,
          paymentRequired: true,
          paymentProvided: false,
          paymentValid: false,
          amount: paymentAmount,
          responseTime: Date.now() - startTime,
          userAgent,
        });
        
        return create402Response(endpointPrice);
      }

      paymentProvided = true;

      // Extract wallet address from payment
      try {
        const payment: SolanaPaymentPayload = JSON.parse(paymentHeader);
        walletAddress = payment.from;
      } catch (e) {
        // Ignore parsing errors for analytics
      }

      // Verify payment
      const verification = await verifyPayment(paymentHeader, endpointPrice);
      console.log('[x402] Verification result:', verification);

      if (!verification.valid) {
        console.log('[x402] Payment verification failed:', verification.error);
        responseStatus = 402;
        errorMessage = verification.error;
        
        trackApiRequest({
          endpoint: pathname,
          method,
          status: responseStatus,
          paymentRequired: true,
          paymentProvided: true,
          paymentValid: false,
          amount: paymentAmount,
          walletAddress,
          responseTime: Date.now() - startTime,
          userAgent,
          error: errorMessage,
        });
        
        return NextResponse.json(
          { error: verification.error || 'Payment verification failed' },
          { status: 402 }
        );
      }

      console.log('[x402] Payment verified successfully!');
      paymentValid = true;

      // Payment valid - proceed with request
      const response = await handler(req);
      responseStatus = response.status;
      
      // Add payment confirmation header
      if (verification.signature) {
        response.headers.set('x-payment-confirmed', verification.signature);
      }

      // Track successful payment
      trackApiRequest({
        endpoint: pathname,
        method,
        status: responseStatus,
        paymentRequired: true,
        paymentProvided: true,
        paymentValid: true,
        amount: paymentAmount,
        walletAddress,
        responseTime: Date.now() - startTime,
        userAgent,
      });

      return response;
    } catch (error) {
      // Track unexpected errors
      responseStatus = 500;
      errorMessage = error instanceof Error ? error.message : 'Internal server error';
      
      trackApiRequest({
        endpoint: pathname,
        method,
        status: responseStatus,
        paymentRequired: true,
        paymentProvided,
        paymentValid,
        amount: paymentAmount,
        walletAddress,
        responseTime: Date.now() - startTime,
        userAgent,
        error: errorMessage,
      });
      
      throw error;
    }
  };
}

/**
 * Helper to get pricing for an endpoint
 */
export function getEndpointPrice(endpoint: string): string | null {
  return ENDPOINT_PRICING[endpoint] || null;
}
