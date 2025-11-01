import { NextRequest, NextResponse } from 'next/server';
import { PaymentVerificationResult, X402Response } from './types';
import { ENDPOINT_PRICING, FREE_ENDPOINTS } from './config';
import { trackApiRequest } from './analytics';
import { verifySolanaPayment, type SolanaPaymentPayload } from '../chains/solana';
import { verifyBSCPayment, type BSCPaymentPayload } from '../chains/bsc';
import { verifyEthereumPayment, type EthereumPaymentPayload } from '../chains/ethereum';
import { SupportedChain, getChainConfig } from '../chains/config';

interface MultiChainPaymentPayload {
  chain: SupportedChain;
  payment: SolanaPaymentPayload | BSCPaymentPayload | EthereumPaymentPayload;
}

/**
 * Multi-chain payment verification
 */
export async function verifyMultiChainPayment(
  paymentHeader: string | null,
  expectedAmount: string,
  chain?: SupportedChain
): Promise<PaymentVerificationResult> {
  console.log('[x402] Verifying multi-chain payment...', { expectedAmount, chain });
  
  if (!paymentHeader) {
    console.log('[x402] No payment header provided');
    return {
      valid: false,
      error: 'No payment provided',
    };
  }

  try {
    const paymentData: MultiChainPaymentPayload = JSON.parse(paymentHeader);
    const paymentChain = chain || paymentData.chain;

    if (!paymentChain) {
      return {
        valid: false,
        error: 'No chain specified',
      };
    }

    const chainConfig = getChainConfig(paymentChain);

    console.log('[x402] Payment chain:', paymentChain);

    // Route to appropriate chain verification
    switch (paymentChain) {
      case SupportedChain.SOLANA:
        const solanaPayment = paymentData.payment as SolanaPaymentPayload;
        const solanaResult = await verifySolanaPayment(
          solanaPayment,
          expectedAmount,
          chainConfig.walletAddress
        );
        return {
          valid: solanaResult.valid,
          error: solanaResult.error,
          signature: solanaPayment.signature,
        };

      case SupportedChain.BSC:
        const bscPayment = paymentData.payment as BSCPaymentPayload;
        const bscResult = await verifyBSCPayment(
          bscPayment,
          expectedAmount,
          chainConfig.walletAddress
        );
        return {
          valid: bscResult.valid,
          error: bscResult.error,
          signature: bscPayment.signature,
        };

      case SupportedChain.ETHEREUM:
        const ethPayment = paymentData.payment as EthereumPaymentPayload;
        const ethResult = await verifyEthereumPayment(
          ethPayment,
          expectedAmount,
          chainConfig.walletAddress
        );
        return {
          valid: ethResult.valid,
          error: ethResult.error,
          signature: ethPayment.signature,
        };

      default:
        return {
          valid: false,
          error: `Unsupported chain: ${paymentChain}`,
        };
    }
  } catch (error) {
    console.log('[x402] Payment verification error:', error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Payment verification failed',
    };
  }
}

/**
 * Create 402 Payment Required response with multi-chain support
 */
export function createMultiChain402Response(amount: string): NextResponse<X402Response> {
  const response: X402Response = {
    status: 402,
    message: 'Payment Required',
    payment: {
      amount,
      currency: 'USDC/USDT',
      chains: [
        {
          chain: 'solana',
          recipient: process.env.SOLANA_WALLET_ADDRESS || process.env.WALLET_ADDRESS || '',
          network: 'mainnet-beta',
          tokens: ['USDC', 'USDT'],
        },
        {
          chain: 'bsc',
          recipient: process.env.BSC_WALLET_ADDRESS || process.env.WALLET_ADDRESS || '',
          network: '56',
          tokens: ['USDT', 'BUSD', 'USDC'],
        },
        {
          chain: 'ethereum',
          recipient: process.env.ETHEREUM_WALLET_ADDRESS || process.env.WALLET_ADDRESS || '',
          network: '1',
          tokens: ['USDC', 'USDT'],
        },
      ],
      facilitator: process.env.FACILITATOR_URL || 'https://facilitator.x402.org',
    },
  };

  return NextResponse.json(response, { status: 402 });
}

/**
 * Multi-chain x402 middleware wrapper
 */
export function withMultiChainPayment(
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
    let paymentChain: string | undefined;

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
        
        return createMultiChain402Response(endpointPrice);
      }

      paymentProvided = true;

      // Extract wallet address and chain from payment
      try {
        const paymentData: MultiChainPaymentPayload = JSON.parse(paymentHeader);
        paymentChain = paymentData.chain;
        
        if (paymentData.chain === SupportedChain.SOLANA) {
          const solanaPayment = paymentData.payment as SolanaPaymentPayload;
          walletAddress = solanaPayment.from;
        } else if (paymentData.chain === SupportedChain.BSC) {
          const bscPayment = paymentData.payment as BSCPaymentPayload;
          walletAddress = bscPayment.from;
        } else if (paymentData.chain === SupportedChain.ETHEREUM) {
          const ethPayment = paymentData.payment as EthereumPaymentPayload;
          walletAddress = ethPayment.from;
        }
      } catch (e) {
        // Ignore parsing errors for analytics
      }

      // Verify payment
      const verification = await verifyMultiChainPayment(paymentHeader, endpointPrice);
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
        response.headers.set('x-payment-chain', paymentChain || 'unknown');
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

