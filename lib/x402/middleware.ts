import { NextRequest, NextResponse } from 'next/server';
import { PaymentVerificationResult, X402Response, RobinhoodPaymentPayload } from './types';
import { PAYMENT_CONFIG, ENDPOINT_PRICING, FREE_ENDPOINTS } from './config';
import { trackApiRequest, analyticsStore } from './analytics';
import { verifyRobinhoodPayment } from '../chains/robinhood';
import { verifySettlement } from '../chains/settlement';
import { claimSettlement } from './spent-store';
import { ROBINHOOD_CONFIG } from '../chains/config';

/**
 * Verify a Robinhood Chain payment
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
    const payment: RobinhoodPaymentPayload = JSON.parse(paymentHeader);
    console.log('[x402] Payment payload:', {
      from: payment.from,
      to: payment.to,
      amount: payment.amount,
      expectedTo: PAYMENT_CONFIG.walletAddress,
    });

    // Verify the token is one Payless accepts on Robinhood Chain
    const acceptedToken = ROBINHOOD_CONFIG.paymentTokens.find(
      (token) => token.address.toLowerCase() === (payment.tokenAddress || '').toLowerCase()
    );

    if (!acceptedToken) {
      const accepted = ROBINHOOD_CONFIG.paymentTokens.map((t) => t.symbol).join(', ');
      return {
        valid: false,
        error: `Invalid token. Accepted tokens on Robinhood Chain: ${accepted}.`,
      };
    }

    // Test mode short-circuits signature verification so the playground and
    // local development work without a funded wallet.
    const isTestMode =
      process.env.NODE_ENV !== 'production' || process.env.ENABLE_DEMO_PAYMENTS === 'true';
    console.log(
      '[x402] Test mode:',
      isTestMode,
      '(NODE_ENV:',
      process.env.NODE_ENV,
      'ENABLE_DEMO_PAYMENTS:',
      process.env.ENABLE_DEMO_PAYMENTS,
      ')'
    );

    if (isTestMode) {
      // Still enforce the cheap, non-cryptographic checks in test mode
      if (
        PAYMENT_CONFIG.walletAddress &&
        payment.to.toLowerCase() !== PAYMENT_CONFIG.walletAddress.toLowerCase()
      ) {
        return { valid: false, error: 'Invalid recipient address' };
      }

      if (parseFloat(payment.amount) < parseFloat(expectedAmount)) {
        return { valid: false, error: 'Insufficient payment amount' };
      }

      console.log('[x402] Test mode - accepting payment');
      return {
        valid: true,
        signature: payment.signature,
      };
    }

    // The signature only proves intent. Settlement proves payment, so outside
    // demo mode an on-chain transaction hash is required.
    if (!payment.transactionHash) {
      return {
        valid: false,
        error:
          'Missing transactionHash. Send the USDG transfer on Robinhood Chain first, then retry with its hash.',
      };
    }

    // Signature is still checked when present: it binds the payer address to
    // the request, which the transfer alone does not.
    if (payment.signature && payment.message) {
      const signed = await verifyRobinhoodPayment(
        payment,
        expectedAmount,
        PAYMENT_CONFIG.walletAddress
      );
      if (!signed.valid) {
        return { valid: false, error: signed.error };
      }
    }

    const settlement = await verifySettlement({
      txHash: payment.transactionHash,
      expectedAmount,
      expectedRecipient: PAYMENT_CONFIG.walletAddress,
    });

    if (!settlement.valid) {
      return { valid: false, error: settlement.error, pending: settlement.pending };
    }

    return {
      valid: true,
      signature: payment.transactionHash,
      settlement: settlement.details,
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
      tokenAddress: PAYMENT_CONFIG.tokenAddress,
      chains: [
        {
          chain: 'robinhood',
          recipient: PAYMENT_CONFIG.walletAddress,
          network: PAYMENT_CONFIG.network,
          tokens: ROBINHOOD_CONFIG.paymentTokens.map((token) => token.symbol),
        },
      ],
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

        return NextResponse.json({ error: errorMessage }, { status: 500 });
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
        const payment: RobinhoodPaymentPayload = JSON.parse(paymentHeader);
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
          {
            error: verification.error || 'Payment verification failed',
            ...(verification.pending ? { pending: true, retry: true } : {}),
          },
          { status: 402 }
        );
      }

      console.log('[x402] Payment verified successfully!');

      // One settled transaction buys one response. Claim before doing any work.
      if (verification.settlement) {
        const claim = await claimSettlement(verification.settlement.txHash, {
          endpoint: pathname,
          amount: verification.settlement.amount,
          spentAt: Date.now(),
        });
        if (!claim.ok) {
          responseStatus = 402;
          errorMessage = `Payment ${verification.settlement.txHash} was already spent on ${claim.previous?.endpoint}`;
          console.log('[x402] Replay rejected:', errorMessage);

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

          return NextResponse.json({ error: errorMessage }, { status: 402 });
        }
      }

      paymentValid = true;

      // Store payment confirmation
      try {
        const payment: RobinhoodPaymentPayload = JSON.parse(paymentHeader);
        const confirmation = analyticsStore.addConfirmation({
          paymentSignature: verification.signature || payment.signature,
          nonce: payment.nonce,
          walletAddress: payment.from,
          recipient: payment.to,
          amount: payment.amount,
          token: payment.token,
          tokenAddress: payment.tokenAddress,
          endpoint: pathname,
          status: 'confirmed',
          metadata: {
            userAgent,
            method,
            responseTime: Date.now() - startTime,
          },
        });
        console.log('[x402] Payment confirmation stored:', confirmation.id);
      } catch (error) {
        console.error('[x402] Failed to store payment confirmation:', error);
      }

      // Payment valid - proceed with request
      const response = await handler(req);
      responseStatus = response.status;

      // Add payment confirmation header
      if (verification.signature) {
        response.headers.set('x-payment-confirmed', verification.signature);
        response.headers.set('x-payment-chain', 'robinhood');
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
