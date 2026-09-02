import { NextRequest, NextResponse } from 'next/server';
import { PaymentVerificationResult, X402Response, RobinhoodPaymentPayload } from './types';
import { PAYMENT_CONFIG, ENDPOINT_PRICING, FREE_ENDPOINTS } from './config';
import { trackApiRequest, analyticsStore } from './analytics';
import { verifyRobinhoodPayment } from '../chains/robinhood';
import { verifySettlement } from '../chains/settlement';
import { claimSettlement } from './spent-store';
import { ROBINHOOD_CONFIG } from '../chains/config';
import { checkSubscription, subscriptionHeaders, offersFor } from './subscription-middleware';
import {
  supportedKinds,
  verify as facilitatorVerify,
  settle as facilitatorSettle,
  NETWORK as X402_NETWORK,
  replayKey,
  type PaymentRequirements,
} from './facilitator';

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
    const isTestMode = demoPaymentsEnabled();
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
 * What an upto settlement should charge, given what the handler reported.
 *
 * Clamped to the advertised price: a handler must never out-charge what the
 * 402 promised, however its metering came out. Anything unparseable or
 * non-positive is treated as "no report", falling back to the full price —
 * never to zero, because a buggy header should cost us revenue, not honesty.
 */
export function meteredSettlement(header: string | null, ceiling: string): string | undefined {
  const metered = Number(header);
  if (!header || !Number.isFinite(metered) || metered <= 0) return undefined;
  return Math.min(metered, Number(ceiling)).toFixed(6);
}

/**
 * Is this header a signed authorisation rather than a receipt?
 *
 * Told apart by shape rather than by a field the caller sets, so an older
 * client that only knows about transaction hashes keeps working untouched.
 */
function parsePermitPayload(header: string): (Record<string, any> & { scheme: string }) | null {
  let parsed: Record<string, any>;
  try {
    parsed = JSON.parse(header);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  if (parsed.transactionHash) return null;
  if (!parsed.signature || !parsed.permitted || !parsed.witness) return null;

  // upto authorisations name their facilitator; exact ones do not.
  const scheme = typeof parsed.scheme === 'string'
    ? parsed.scheme
    : parsed.witness?.facilitator
      ? 'upto'
      : 'exact';
  return { ...parsed, scheme };
}

/**
 * Serve a request paid for by signature.
 *
 * The order here is deliberate and the opposite of the receipt path: settling
 * is what actually moves the money, so the handler runs first. Charging before
 * knowing the response rendered would be charging for nothing.
 */
async function payViaFacilitator(args: {
  permitPayload: Record<string, any> & { scheme: string };
  price: string;
  pathname: string;
  req: NextRequest;
  handler: (req: NextRequest) => Promise<NextResponse>;
  startTime: number;
  method: string;
  userAgent?: string;
  paymentAmount?: string;
}): Promise<NextResponse> {
  const { permitPayload, price, pathname, req, handler } = args;

  const requirements: PaymentRequirements = {
    scheme: permitPayload.scheme,
    network: X402_NETWORK,
    amount: price,
    payTo: PAYMENT_CONFIG.walletAddress,
    asset: PAYMENT_CONFIG.tokenAddress,
    resource: pathname,
  };

  const check = await facilitatorVerify(requirements, permitPayload as any);
  if (!check.isValid) {
    trackApiRequest({
      endpoint: pathname, method: args.method, status: 402,
      paymentRequired: true, paymentProvided: true, paymentValid: false,
      amount: args.paymentAmount, walletAddress: permitPayload.owner,
      responseTime: Date.now() - args.startTime, userAgent: args.userAgent,
      error: check.invalidReason,
    });
    return NextResponse.json(
      { error: check.invalidReason, ...(check.retryable ? { retry: true } : {}) },
      { status: 402 }
    );
  }

  const response = await handler(req);

  // A metered endpoint reports what the response actually cost via the
  // x-payment-cost header. Only `upto` can act on it: that is the scheme where
  // the buyer signed a ceiling precisely so the final amount could be decided
  // after the work. It is clamped to the advertised price, because a handler
  // must never be able to out-charge what the 402 promised, and ignored on
  // fixed-amount schemes, where the signature commits to one exact figure.
  if (permitPayload.scheme === 'upto') {
    const metered = meteredSettlement(response.headers.get('x-payment-cost'), price);
    if (metered) requirements.settlementAmount = metered;
  }

  const settled = await facilitatorSettle(requirements, permitPayload as any);

  trackApiRequest({
    endpoint: pathname, method: args.method, status: response.status,
    paymentRequired: true, paymentProvided: true, paymentValid: settled.success,
    amount: args.paymentAmount, walletAddress: check.payer,
    responseTime: Date.now() - args.startTime, userAgent: args.userAgent,
    ...(settled.success ? {} : { error: settled.errorReason }),
  });

  if (!settled.success) {
    // The response is already made. Saying so on it is the only honest option
    // left, and hiding a failed settlement would be the dishonest one.
    response.headers.set('x-payment-settlement', 'failed');
    response.headers.set('x-payment-error', String(settled.errorReason ?? '').slice(0, 200));
    return response;
  }

  response.headers.set('x-payment-confirmed', settled.transaction ?? '');
  response.headers.set('x-payment-scheme', permitPayload.scheme);
  response.headers.set('x-payment-settled-amount', requirements.settlementAmount ?? requirements.amount);
  response.headers.set('x-payment-chain', 'robinhood');
  if (check.payer) response.headers.set('x-payment-payer', check.payer);
  return response;
}

/**
 * Is payment verification being skipped?
 *
 * Demo mode does not check the signature or the chain: it compares a recipient
 * and an amount out of a header the caller wrote. In production that is not a
 * setting, it is a way to give the whole API away for free, and it does not
 * even claim the transaction hash, so one header would work forever.
 *
 * So production ignores the flag outright. One environment variable should
 * never be the only thing standing between a paid endpoint and a free one.
 */
export function demoPaymentsEnabled(env = process.env): boolean {
  return env.NODE_ENV !== 'production' && env.ENABLE_DEMO_PAYMENTS === 'true';
}

/**
 * Create 402 Payment Required response
 */
export function create402Response(amount: string, pathname?: string): NextResponse<X402Response> {
  const subscribe = pathname ? offersFor(pathname) : [];
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
      // Every way this endpoint can be paid, in the x402 v2 shape.
      //
      // Without this a caller cannot know a gasless option exists, and will
      // send a transfer and wait for its receipt because that is the only
      // thing the challenge told them about.
      accepts: supportedKinds().map((kind) => ({
        scheme: kind.scheme,
        network: kind.network,
        amount,
        payTo: PAYMENT_CONFIG.walletAddress,
        asset: PAYMENT_CONFIG.tokenAddress,
        resource: pathname,
        extra: kind.extra,
      })),
      // One request, one payment is not the only shape. Where a plan covers this
      // endpoint, the caller can commit once and stop paying per call.
      ...(subscribe.length ? { subscribe } : {}),
    },
  };

  return NextResponse.json(response, { status: 402 });
}

/**
 * x402 Middleware wrapper for API routes
 */
export interface X402Options {
  /**
   * Runs before any payment is required. Return a message to reject the request
   * with 400 and charge nothing.
   *
   * Without this the order is wrong: the caller pays, then the handler discovers
   * a missing parameter and returns 400 — money taken for a request that was
   * never going to succeed.
   */
  validate?: (req: NextRequest) => string | null | undefined;
}

export function withX402Payment(
  handler: (req: NextRequest) => Promise<NextResponse>,
  price?: string,
  options: X402Options = {}
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

      // Reject a malformed request before asking for money. Charging first and
      // failing second would mean taking payment for an impossible request.
      const invalid = options.validate?.(req);
      if (invalid) {
        responseStatus = 400;
        trackApiRequest({
          endpoint: pathname,
          method,
          status: responseStatus,
          paymentRequired: true,
          paymentProvided: false,
          paymentValid: false,
          responseTime: Date.now() - startTime,
          userAgent,
          error: invalid,
        });
        return NextResponse.json({ error: invalid, charged: false }, { status: 400 });
      }

      // A standing subscription is checked first: a caller who already committed
      // should not be asked to pay again per request.
      const subHeader = req.headers.get('x-subscription');
      if (subHeader) {
        const check = await checkSubscription(subHeader, pathname);

        if (!check.ok && check.status) {
          trackApiRequest({
            endpoint: pathname,
            method,
            status: check.status,
            paymentRequired: true,
            paymentProvided: true,
            paymentValid: false,
            amount: paymentAmount,
            responseTime: Date.now() - startTime,
            userAgent,
            error: String(check.body?.error || 'Subscription rejected'),
          });
          return NextResponse.json(check.body || {}, { status: check.status });
        }

        if (check.ok) {
          const response = await handler(req);
          for (const [k, v] of Object.entries(subscriptionHeaders(check))) {
            response.headers.set(k, v);
          }
          trackApiRequest({
            endpoint: pathname,
            method,
            status: response.status,
            paymentRequired: true,
            paymentProvided: true,
            paymentValid: true,
            amount: paymentAmount,
            walletAddress: check.sub?.payer,
            responseTime: Date.now() - startTime,
            userAgent,
          });
          return response;
        }
      }

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

        return create402Response(endpointPrice, pathname);
      }

      paymentProvided = true;

      // Extract wallet address from payment
      try {
        const payment: RobinhoodPaymentPayload = JSON.parse(paymentHeader);
        walletAddress = payment.from;
      } catch (e) {
        // Ignore parsing errors for analytics
      }

      // A signed Permit2 authorisation rather than a transaction hash. The
      // buyer sent nothing and paid no gas; the facilitator broadcasts on their
      // behalf. Routed separately because there is no receipt to verify yet.
      const permitPayload = parsePermitPayload(paymentHeader);
      if (permitPayload) {
        return await payViaFacilitator({
          permitPayload,
          price: endpointPrice,
          pathname,
          req,
          handler,
          startTime,
          method,
          userAgent,
          paymentAmount,
        });
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
        // The same key the facilitator uses. Two key spaces over one store
        // meant a receipt consumed through /api/facilitator/settle was still
        // spendable here, and the other way round: one payment, two responses.
        const claim = await claimSettlement(
          replayKey(verification.settlement.txHash, PAYMENT_CONFIG.walletAddress),
          {
            endpoint: pathname,
            amount: verification.settlement.amount,
            spentAt: Date.now(),
          }
        );
        if (!claim.ok) {
          responseStatus = claim.error ? 503 : 402;
          errorMessage = claim.error
            ? claim.error
            : `Payment ${verification.settlement.txHash} was already spent on ${claim.previous?.endpoint}`;
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

          return NextResponse.json(
            { error: errorMessage, ...(claim.error ? { retry: true } : {}) },
            { status: responseStatus }
          );
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
