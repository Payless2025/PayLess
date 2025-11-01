/**
 * Payment Links - Generate shareable crypto payment URLs
 */

import crypto from 'crypto';

export interface PaymentLink {
  id: string;
  amount: string;
  currency: string;
  description?: string;
  chains: string[]; // solana, bsc, ethereum
  recipientAddress: string;
  createdAt: number;
  expiresAt?: number;
  metadata?: Record<string, any>;
  status: 'active' | 'completed' | 'expired';
  completedAt?: number;
  transactionSignature?: string;
  paidBy?: string;
  paidChain?: string;
}

export interface CreatePaymentLinkParams {
  amount: string;
  description?: string;
  chains?: string[];
  recipientAddress: string;
  expiresIn?: number; // milliseconds
  metadata?: Record<string, any>;
}

// In-memory storage (replace with database in production)
const paymentLinks: Map<string, PaymentLink> = new Map();

/**
 * Generate a unique payment link ID
 */
function generateLinkId(): string {
  return crypto.randomBytes(8).toString('hex');
}

/**
 * Create a new payment link
 */
export function createPaymentLink(params: CreatePaymentLinkParams): PaymentLink {
  const id = generateLinkId();
  const now = Date.now();
  
  const link: PaymentLink = {
    id,
    amount: params.amount,
    currency: 'USDC/USDT',
    description: params.description,
    chains: params.chains || ['solana', 'bsc', 'ethereum'],
    recipientAddress: params.recipientAddress,
    createdAt: now,
    expiresAt: params.expiresIn ? now + params.expiresIn : undefined,
    metadata: params.metadata,
    status: 'active',
  };

  paymentLinks.set(id, link);
  return link;
}

/**
 * Get payment link by ID
 */
export function getPaymentLink(id: string): PaymentLink | null {
  const link = paymentLinks.get(id);
  
  if (!link) {
    return null;
  }

  // Check if expired
  if (link.expiresAt && Date.now() > link.expiresAt) {
    link.status = 'expired';
    paymentLinks.set(id, link);
  }

  return link;
}

/**
 * Mark payment link as completed
 */
export function completePaymentLink(
  id: string,
  transactionSignature: string,
  paidBy: string,
  paidChain: string
): boolean {
  const link = paymentLinks.get(id);
  
  if (!link || link.status !== 'active') {
    return false;
  }

  link.status = 'completed';
  link.completedAt = Date.now();
  link.transactionSignature = transactionSignature;
  link.paidBy = paidBy;
  link.paidChain = paidChain;
  
  paymentLinks.set(id, link);
  return true;
}

/**
 * List all payment links (for dashboard)
 */
export function listPaymentLinks(recipientAddress?: string): PaymentLink[] {
  const links = Array.from(paymentLinks.values());
  
  if (recipientAddress) {
    return links.filter(link => link.recipientAddress === recipientAddress);
  }
  
  return links;
}

/**
 * Delete payment link
 */
export function deletePaymentLink(id: string): boolean {
  return paymentLinks.delete(id);
}

/**
 * Get payment link statistics
 */
export function getPaymentLinkStats(recipientAddress?: string): {
  total: number;
  active: number;
  completed: number;
  expired: number;
  totalAmount: string;
} {
  const links = recipientAddress 
    ? listPaymentLinks(recipientAddress)
    : Array.from(paymentLinks.values());

  const stats = {
    total: links.length,
    active: links.filter(l => l.status === 'active').length,
    completed: links.filter(l => l.status === 'completed').length,
    expired: links.filter(l => l.status === 'expired').length,
    totalAmount: '0',
  };

  const completedLinks = links.filter(l => l.status === 'completed');
  if (completedLinks.length > 0) {
    const total = completedLinks.reduce((sum, link) => sum + parseFloat(link.amount), 0);
    stats.totalAmount = total.toFixed(2);
  }

  return stats;
}

/**
 * Generate full payment link URL
 */
export function generatePaymentLinkUrl(id: string, baseUrl?: string): string {
  // Auto-detect base URL based on environment
  if (!baseUrl) {
    if (typeof window !== 'undefined') {
      // Client-side: use current origin
      baseUrl = window.location.origin;
    } else {
      // Server-side: check environment
      baseUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3000' 
        : process.env.NEXT_PUBLIC_BASE_URL || 'https://payless.network';
    }
  }
  return `${baseUrl}/pay/${id}`;
}

