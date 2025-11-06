/**
 * Token-Gated Middleware for API Protection
 * Requires $PAYLESS token holdings for access
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkWalletTier, verifyMinimumTier, checkRateLimit, TokenTier } from './token-gating';
import { trackApiRequest } from './analytics';

export interface TokenGatedConfig {
  minimumTier?: TokenTier; // Minimum tier required (default: BASIC)
  allowFree?: boolean; // Allow free tier with rate limits (default: false)
}

/**
 * Token-gated middleware for API routes
 */
export function withTokenGating(
  handler: (req: NextRequest) => Promise<NextResponse>,
  config: TokenGatedConfig = {}
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now();
    const endpoint = new URL(req.url).pathname;
    
    try {
      // Get wallet address from headers
      const walletAddress = req.headers.get('x-wallet-address');
      
      if (!walletAddress) {
        trackApiRequest({
          endpoint,
          method: req.method,
          status: 401,
          responseTime: Date.now() - startTime,
          error: 'Wallet address required',
        });
        
        return NextResponse.json(
          {
            error: 'Unauthorized',
            message: 'x-wallet-address header is required for token-gated access',
            code: 'WALLET_REQUIRED',
          },
          { status: 401 }
        );
      }
      
      // Check rate limit first
      const rateCheck = await checkRateLimit(walletAddress);
      
      if (!rateCheck.allowed) {
        const resetDate = new Date(rateCheck.resetAt);
        
        trackApiRequest({
          endpoint,
          method: req.method,
          status: 429,
          responseTime: Date.now() - startTime,
          walletAddress,
          error: 'Rate limit exceeded',
        });
        
        return NextResponse.json(
          {
            error: 'Rate Limit Exceeded',
            message: `You have exceeded your rate limit of ${rateCheck.limit} requests per hour`,
            code: 'RATE_LIMIT_EXCEEDED',
            rateLimit: {
              limit: rateCheck.limit,
              remaining: 0,
              resetAt: rateCheck.resetAt,
              resetIn: `${Math.ceil((rateCheck.resetAt - Date.now()) / 60000)} minutes`,
            },
            upgrade: rateCheck.limit === 10 ? 'Hold $PAYLESS tokens to increase your rate limit' : 'Upgrade to a higher tier for more requests',
          },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': rateCheck.limit.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': rateCheck.resetAt.toString(),
              'Retry-After': Math.ceil((rateCheck.resetAt - Date.now()) / 1000).toString(),
            },
          }
        );
      }
      
      // Check tier requirement
      const minimumTier = config.minimumTier || TokenTier.BASIC;
      const allowFree = config.allowFree || false;
      
      // If free tier is allowed and they passed rate limit, proceed
      if (allowFree && rateCheck.allowed) {
        const response = await handler(req);
        
        // Add rate limit headers
        response.headers.set('X-RateLimit-Limit', rateCheck.limit.toString());
        response.headers.set('X-RateLimit-Remaining', rateCheck.remaining.toString());
        response.headers.set('X-RateLimit-Reset', rateCheck.resetAt.toString());
        
        trackApiRequest({
          endpoint,
          method: req.method,
          status: response.status,
          responseTime: Date.now() - startTime,
          walletAddress,
        });
        
        return response;
      }
      
      // Verify minimum tier requirement
      const tierCheck = await verifyMinimumTier(walletAddress, minimumTier);
      
      if (!tierCheck.valid) {
        trackApiRequest({
          endpoint,
          method: req.method,
          status: 402,
          responseTime: Date.now() - startTime,
          walletAddress,
          error: 'Insufficient token holdings',
        });
        
        return NextResponse.json(
          {
            error: 'Payment Required',
            message: tierCheck.error,
            code: 'INSUFFICIENT_TOKEN_HOLDINGS',
            currentTier: tierCheck.currentTier,
            requiredTier: minimumTier,
            tokenInfo: {
              symbol: '$PAYLESS',
              message: 'Hold tokens to access this endpoint',
              website: 'https://payless.network',
            },
          },
          { status: 402 }
        );
      }
      
      // All checks passed, process request
      const response = await handler(req);
      
      // Add rate limit and tier headers
      response.headers.set('X-RateLimit-Limit', rateCheck.limit.toString());
      response.headers.set('X-RateLimit-Remaining', rateCheck.remaining.toString());
      response.headers.set('X-RateLimit-Reset', rateCheck.resetAt.toString());
      response.headers.set('X-Token-Tier', tierCheck.currentTier);
      
      trackApiRequest({
        endpoint,
        method: req.method,
        status: response.status,
        responseTime: Date.now() - startTime,
        walletAddress,
      });
      
      return response;
    } catch (error) {
      console.error('Token gating middleware error:', error);
      
      trackApiRequest({
        endpoint,
        method: req.method,
        status: 500,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      return NextResponse.json(
        {
          error: 'Internal Server Error',
          message: 'Token verification failed',
          code: 'VERIFICATION_ERROR',
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Helper to create tier-specific endpoints
 */
export const withBasicTier = (handler: (req: NextRequest) => Promise<NextResponse>) =>
  withTokenGating(handler, { minimumTier: TokenTier.BASIC });

export const withProTier = (handler: (req: NextRequest) => Promise<NextResponse>) =>
  withTokenGating(handler, { minimumTier: TokenTier.PRO });

export const withEnterpriseTier = (handler: (req: NextRequest) => Promise<NextResponse>) =>
  withTokenGating(handler, { minimumTier: TokenTier.ENTERPRISE });

export const withFreeTier = (handler: (req: NextRequest) => Promise<NextResponse>) =>
  withTokenGating(handler, { minimumTier: TokenTier.NONE, allowFree: true });

