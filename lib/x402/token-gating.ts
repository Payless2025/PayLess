/**
 * Token-Gating System for $PAYLESS Holders
 * Total Supply: 1,000,000,000 tokens
 */

import { Connection, PublicKey } from '@solana/web3.js';

// Token Configuration
export const PAYLESS_TOKEN_CONFIG = {
  TOTAL_SUPPLY: 1_000_000_000, // 1 billion tokens
  TOKEN_MINT: 'FDgSegoxrdpsct21YVeAbC9dWeTwTxA8Cceeh8BPpump', // $PAYLESS token mint 
  SOLANA_RPC: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
};

// Token Tiers based on holdings
export enum TokenTier {
  NONE = 'none',
  BASIC = 'basic',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
}

// Tier Requirements (% of total supply)
export const TIER_REQUIREMENTS = {
  [TokenTier.BASIC]: 100_000, // 0.01% of supply
  [TokenTier.PRO]: 500_000, // 0.05% of supply
  [TokenTier.ENTERPRISE]: 1_000_000, // 0.1% of supply
};

// Rate Limits per tier (requests per hour)
export const TIER_RATE_LIMITS = {
  [TokenTier.NONE]: 10, // Free tier
  [TokenTier.BASIC]: 100,
  [TokenTier.PRO]: 500,
  [TokenTier.ENTERPRISE]: -1, // Unlimited
};

// Benefits per tier
export const TIER_BENEFITS = {
  [TokenTier.NONE]: [
    'Limited API access (10 requests/hour)',
    'Basic endpoints only',
  ],
  [TokenTier.BASIC]: [
    '100 requests/hour',
    'All AI APIs (Chat, Image, TTS, Translate)',
    'Data APIs (Crypto, Stock, Weather, News)',
    'Basic support',
  ],
  [TokenTier.PRO]: [
    '500 requests/hour',
    'All Basic tier features',
    'Premium tools (QR codes, Analytics)',
    'Priority support',
    'Early access to new features',
  ],
  [TokenTier.ENTERPRISE]: [
    'Unlimited requests',
    'All Pro tier features',
    'Dedicated support',
    'Custom integrations',
    'Beta feature access',
  ],
};

export interface TokenHolding {
  wallet: string;
  balance: number;
  tier: TokenTier;
  percentage: number; // % of total supply
}

export interface TierCheckResult {
  wallet: string;
  balance: number;
  tier: TokenTier;
  percentage: number;
  rateLimit: number;
  benefits: string[];
  nextTier?: {
    tier: TokenTier;
    tokensNeeded: number;
  };
}

/**
 * Get wallet's $PAYLESS token balance
 */
export async function getTokenBalance(walletAddress: string): Promise<number> {
  try {
    // For development/testing, return mock balance if no RPC configured
    if (!PAYLESS_TOKEN_CONFIG.SOLANA_RPC || !PAYLESS_TOKEN_CONFIG.TOKEN_MINT) {
      console.warn('Token gating: Using mock balance for development');
      return 0;
    }

    const connection = new Connection(PAYLESS_TOKEN_CONFIG.SOLANA_RPC, 'confirmed');
    const walletPublicKey = new PublicKey(walletAddress);

    // Get token accounts for this wallet
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      walletPublicKey,
      { mint: new PublicKey(PAYLESS_TOKEN_CONFIG.TOKEN_MINT) }
    );

    if (tokenAccounts.value.length === 0) {
      return 0;
    }

    // Sum all token balances (in case of multiple accounts)
    const totalBalance = tokenAccounts.value.reduce((sum, account) => {
      const amount = account.account.data.parsed.info.tokenAmount.uiAmount || 0;
      return sum + amount;
    }, 0);

    return totalBalance;
  } catch (error) {
    console.error('Error fetching token balance:', error);
    return 0;
  }
}

/**
 * Determine tier based on token balance
 */
export function determineTier(balance: number): TokenTier {
  if (balance >= TIER_REQUIREMENTS.enterprise) {
    return TokenTier.ENTERPRISE;
  }
  if (balance >= TIER_REQUIREMENTS.pro) {
    return TokenTier.PRO;
  }
  if (balance >= TIER_REQUIREMENTS.basic) {
    return TokenTier.BASIC;
  }
  return TokenTier.NONE;
}

/**
 * Get next tier information
 */
export function getNextTier(currentTier: TokenTier, balance: number): { tier: TokenTier; tokensNeeded: number } | undefined {
  const tiers = [TokenTier.BASIC, TokenTier.PRO, TokenTier.ENTERPRISE];
  const currentIndex = tiers.indexOf(currentTier);
  
  if (currentIndex === -1) {
    // User has no tier, next is BASIC
    return {
      tier: TokenTier.BASIC,
      tokensNeeded: TIER_REQUIREMENTS.basic - balance,
    };
  }
  
  if (currentIndex === tiers.length - 1) {
    // Already at highest tier
    return undefined;
  }
  
  const nextTier = tiers[currentIndex + 1];
  const tierKey = nextTier as 'basic' | 'pro' | 'enterprise';
  return {
    tier: nextTier,
    tokensNeeded: TIER_REQUIREMENTS[tierKey] - balance,
  };
}

/**
 * Check wallet's tier and benefits
 */
export async function checkWalletTier(walletAddress: string): Promise<TierCheckResult> {
  const balance = await getTokenBalance(walletAddress);
  const tier = determineTier(balance);
  const percentage = (balance / PAYLESS_TOKEN_CONFIG.TOTAL_SUPPLY) * 100;
  const rateLimit = TIER_RATE_LIMITS[tier];
  const benefits = TIER_BENEFITS[tier];
  const nextTier = getNextTier(tier, balance);

  return {
    wallet: walletAddress,
    balance,
    tier,
    percentage,
    rateLimit,
    benefits,
    nextTier,
  };
}

/**
 * Verify if wallet meets minimum tier requirement
 */
export async function verifyMinimumTier(
  walletAddress: string,
  requiredTier: TokenTier
): Promise<{ valid: boolean; currentTier: TokenTier; error?: string }> {
  try {
    const balance = await getTokenBalance(walletAddress);
    const currentTier = determineTier(balance);
    
    const tierOrder = [TokenTier.NONE, TokenTier.BASIC, TokenTier.PRO, TokenTier.ENTERPRISE];
    const currentTierIndex = tierOrder.indexOf(currentTier);
    const requiredTierIndex = tierOrder.indexOf(requiredTier);
    
    if (currentTierIndex >= requiredTierIndex) {
      return { valid: true, currentTier };
    }
    
    // Get requirement for required tier
    const tierKey = requiredTier as 'basic' | 'pro' | 'enterprise';
    const requirement = TIER_REQUIREMENTS[tierKey];
    const tokensNeeded = requirement ? requirement - balance : 0;
    
    return {
      valid: false,
      currentTier,
      error: `Insufficient token balance. Need ${tokensNeeded.toLocaleString()} more $PAYLESS tokens for ${requiredTier} tier.`,
    };
  } catch (error) {
    console.error('Error verifying tier:', error);
    return {
      valid: false,
      currentTier: TokenTier.NONE,
      error: 'Failed to verify token holdings',
    };
  }
}

// Rate limiting store (in-memory for now, use Redis in production)
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Check rate limit for wallet
 */
export async function checkRateLimit(walletAddress: string): Promise<{
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}> {
  const balance = await getTokenBalance(walletAddress);
  const tier = determineTier(balance);
  const limit = TIER_RATE_LIMITS[tier];
  
  // Unlimited for enterprise
  if (limit === -1) {
    return {
      allowed: true,
      limit: -1,
      remaining: -1,
      resetAt: 0,
    };
  }
  
  const now = Date.now();
  const hourInMs = 60 * 60 * 1000;
  
  const entry = rateLimitStore.get(walletAddress);
  
  if (!entry || now > entry.resetAt) {
    // First request or reset period passed
    const newEntry: RateLimitEntry = {
      count: 1,
      resetAt: now + hourInMs,
    };
    rateLimitStore.set(walletAddress, newEntry);
    
    return {
      allowed: true,
      limit,
      remaining: limit - 1,
      resetAt: newEntry.resetAt,
    };
  }
  
  if (entry.count >= limit) {
    // Rate limit exceeded
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }
  
  // Increment count
  entry.count++;
  rateLimitStore.set(walletAddress, entry);
  
  return {
    allowed: true,
    limit,
    remaining: limit - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Get formatted tier information
 */
export function getTierInfo(tier: TokenTier): {
  name: string;
  requirement: number;
  rateLimit: number;
  benefits: string[];
  color: string;
} {
  const colors = {
    [TokenTier.NONE]: '#6B7280',
    [TokenTier.BASIC]: '#10B981',
    [TokenTier.PRO]: '#3B82F6',
    [TokenTier.ENTERPRISE]: '#8B5CF6',
  };
  
  // Get requirement, handling NONE tier which doesn't have one
  let requirement = 0;
  if (tier === TokenTier.BASIC) requirement = TIER_REQUIREMENTS.basic;
  else if (tier === TokenTier.PRO) requirement = TIER_REQUIREMENTS.pro;
  else if (tier === TokenTier.ENTERPRISE) requirement = TIER_REQUIREMENTS.enterprise;
  
  return {
    name: tier.charAt(0).toUpperCase() + tier.slice(1),
    requirement,
    rateLimit: TIER_RATE_LIMITS[tier],
    benefits: TIER_BENEFITS[tier],
    color: colors[tier],
  };
}

