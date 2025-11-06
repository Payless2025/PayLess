/**
 * Premium Holder-Only Content API
 * Example endpoint demonstrating token-gating
 * Requires Basic tier (100K $PAYLESS tokens)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withBasicTier } from '@/lib/x402/token-gated-middleware';

async function handler(req: NextRequest) {
  try {
    const walletAddress = req.headers.get('x-wallet-address');
    
    // This content is only accessible to $PAYLESS holders
    const holderContent = {
      message: '🎉 Welcome, $PAYLESS Holder!',
      content: {
        exclusiveData: 'This is premium content only available to token holders',
        insights: [
          'Real-time analytics dashboard access',
          'Advanced API features',
          'Early access to new chains',
          'Priority customer support',
        ],
        benefits: {
          trading: 'Lower fees on all transactions',
          governance: 'Vote on protocol upgrades',
          rewards: 'Earn revenue share from protocol fees',
        },
      },
      holder: {
        wallet: walletAddress,
        accessLevel: 'Verified Holder',
      },
      timestamp: new Date().toISOString(),
    };
    
    return NextResponse.json(holderContent);
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to fetch holder content',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export const POST = withBasicTier(handler);
export const GET = withBasicTier(handler);

