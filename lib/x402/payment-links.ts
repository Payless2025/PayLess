/**
 * Payment Links - Generate shareable crypto payment URLs
 */

import crypto from 'crypto';

export interface PaymentLink {
  id: string;
  amount: string;
  currency: string;
  description?: string;
  chains: string[]; // robinhood
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

// Shared when Upstash is configured, in-memory otherwise. It used to be a bare
// Map, which on serverless meant a link created by one instance was "not found"
// on the next — the link worked or did not depending on which machine answered.
import { keyedStore, isKeyedStoreShared } from './keyed-store';

const links = () => keyedStore<PaymentLink>('links');

/** True when links survive a scale-out. Reported so the API need not guess. */
export function linksArePersistent(): boolean {
  return isKeyedStoreShared('links');
}

/**
 * Generate a unique payment link ID
 */
function generateLinkId(): string {
  return crypto.randomBytes(8).toString('hex');
}

/**
 * Create a new payment link
 */
export async function createPaymentLink(params: CreatePaymentLinkParams): Promise<PaymentLink> {
  const id = generateLinkId();
  const now = Date.now();
  
  const link: PaymentLink = {
    id,
    amount: params.amount,
    currency: 'USDG',
    description: params.description,
    chains: params.chains || ['robinhood'],
    recipientAddress: params.recipientAddress,
    createdAt: now,
    expiresAt: params.expiresIn ? now + params.expiresIn : undefined,
    metadata: params.metadata,
    status: 'active',
  };

  await links().put(id, link);
  return link;
}

/**
 * Get payment link by ID
 */
export async function getPaymentLink(id: string): Promise<PaymentLink | null> {
  const link = await links().get(id);
  
  if (!link) {
    return null;
  }

  // Check if expired
  if (link.expiresAt && Date.now() > link.expiresAt) {
    link.status = 'expired';
    await links().put(id, link);
  }

  return link;
}

/**
 * Mark payment link as completed
 */
export async function completePaymentLink(
  id: string,
  transactionSignature: string,
  paidBy: string,
  paidChain: string
): Promise<boolean> {
  const link = await links().get(id);
  
  if (!link || link.status !== 'active') {
    return false;
  }

  link.status = 'completed';
  link.completedAt = Date.now();
  link.transactionSignature = transactionSignature;
  link.paidBy = paidBy;
  link.paidChain = paidChain;

  await links().put(id, link);
  return true;
}

/**
 * List all payment links (for dashboard)
 */
export async function listPaymentLinks(recipientAddress?: string): Promise<PaymentLink[]> {
  const all = await links().all();
  if (recipientAddress) {
    return all.filter((link) => link.recipientAddress === recipientAddress);
  }
  return all;
}

/**
 * Delete payment link
 */
export async function deletePaymentLink(id: string): Promise<boolean> {
  return links().delete(id);
}

/**
 * Get payment link statistics
 */
export async function getPaymentLinkStats(recipientAddress?: string): Promise<{
  total: number;
  active: number;
  completed: number;
  expired: number;
  totalAmount: string;
}> {
  const all = await listPaymentLinks(recipientAddress);

  const stats = {
    total: all.length,
    active: all.filter((l) => l.status === 'active').length,
    completed: all.filter((l) => l.status === 'completed').length,
    expired: all.filter((l) => l.status === 'expired').length,
    totalAmount: '0',
  };

  const completedLinks = all.filter((l) => l.status === 'completed');
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

