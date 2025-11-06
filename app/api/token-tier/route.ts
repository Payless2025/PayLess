/**
 * Token Tier Checker API
 * GET /api/token-tier - Check wallet's $PAYLESS tier and benefits
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkWalletTier, getTierInfo, TIER_REQUIREMENTS, PAYLESS_TOKEN_CONFIG } from '@/lib/x402/token-gating';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const walletAddress = searchParams.get('wallet');
    
    if (!walletAddress) {
      return NextResponse.json(
        {
          error: 'Wallet address is required',
          example: '/api/token-tier?wallet=YOUR_SOLANA_WALLET',
        },
        { status: 400 }
      );
    }
    
    // Check wallet tier
    const tierResult = await checkWalletTier(walletAddress);
    const tierInfo = getTierInfo(tierResult.tier);
    
    return NextResponse.json({
      success: true,
      wallet: tierResult.wallet,
      balance: {
        tokens: tierResult.balance,
        formatted: tierResult.balance.toLocaleString(),
        percentage: `${tierResult.percentage.toFixed(4)}%`,
      },
      tier: {
        current: tierResult.tier,
        name: tierInfo.name,
        color: tierInfo.color,
      },
      rateLimit: {
        limit: tierResult.rateLimit === -1 ? 'Unlimited' : `${tierResult.rateLimit} requests/hour`,
        value: tierResult.rateLimit,
      },
      benefits: tierResult.benefits,
      nextTier: tierResult.nextTier ? {
        tier: tierResult.nextTier.tier,
        tokensNeeded: tierResult.nextTier.tokensNeeded,
        formatted: tierResult.nextTier.tokensNeeded.toLocaleString(),
      } : null,
      allTiers: {
        basic: {
          requirement: TIER_REQUIREMENTS.basic.toLocaleString(),
          percentage: `${(TIER_REQUIREMENTS.basic / PAYLESS_TOKEN_CONFIG.TOTAL_SUPPLY * 100).toFixed(4)}%`,
        },
        pro: {
          requirement: TIER_REQUIREMENTS.pro.toLocaleString(),
          percentage: `${(TIER_REQUIREMENTS.pro / PAYLESS_TOKEN_CONFIG.TOTAL_SUPPLY * 100).toFixed(4)}%`,
        },
        enterprise: {
          requirement: TIER_REQUIREMENTS.enterprise.toLocaleString(),
          percentage: `${(TIER_REQUIREMENTS.enterprise / PAYLESS_TOKEN_CONFIG.TOTAL_SUPPLY * 100).toFixed(4)}%`,
        },
      },
    });
  } catch (error) {
    console.error('Token tier check error:', error);
    return NextResponse.json(
      {
        error: 'Failed to check token tier',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

