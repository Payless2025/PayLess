/**
 * Analytics system for tracking API usage and payments
 */

import { PaymentConfirmation, PaymentConfirmationQuery } from './types';

export interface AnalyticsEvent {
  id: string;
  timestamp: number;
  endpoint: string;
  method: string;
  status: number;
  paymentRequired: boolean;
  paymentProvided: boolean;
  paymentValid: boolean;
  amount?: string;
  walletAddress?: string;
  responseTime: number;
  userAgent?: string;
  error?: string;
}

export interface AnalyticsMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  paymentRequests: number;
  successfulPayments: number;
  failedPayments: number;
  totalRevenue: number;
  averageResponseTime: number;
  uniqueWallets: number;
  endpointStats: Record<string, EndpointStats>;
  recentEvents: AnalyticsEvent[];
}

export interface EndpointStats {
  endpoint: string;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  revenue: number;
  averageResponseTime: number;
}

export interface AnalyticsFilter {
  startDate?: number;
  endDate?: number;
  endpoint?: string;
  status?: number;
  minAmount?: number;
  maxAmount?: number;
}

// In-memory analytics storage (would be replaced with database in production)
class AnalyticsStore {
  private events: AnalyticsEvent[] = [];
  private maxEvents = 10000; // Keep last 10k events
  private confirmations: PaymentConfirmation[] = [];
  private maxConfirmations = 10000; // Keep last 10k confirmations

  addEvent(event: Omit<AnalyticsEvent, 'id' | 'timestamp'>): AnalyticsEvent {
    const fullEvent: AnalyticsEvent = {
      id: this.generateId(),
      timestamp: Date.now(),
      ...event,
    };

    this.events.push(fullEvent);

    // Remove old events if exceeding max
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    return fullEvent;
  }

  getEvents(filter?: AnalyticsFilter): AnalyticsEvent[] {
    let filtered = [...this.events];

    if (filter) {
      if (filter.startDate) {
        filtered = filtered.filter(e => e.timestamp >= filter.startDate!);
      }
      if (filter.endDate) {
        filtered = filtered.filter(e => e.timestamp <= filter.endDate!);
      }
      if (filter.endpoint) {
        filtered = filtered.filter(e => e.endpoint === filter.endpoint);
      }
      if (filter.status) {
        filtered = filtered.filter(e => e.status === filter.status);
      }
      if (filter.minAmount !== undefined) {
        filtered = filtered.filter(e => e.amount && parseFloat(e.amount) >= filter.minAmount!);
      }
      if (filter.maxAmount !== undefined) {
        filtered = filtered.filter(e => e.amount && parseFloat(e.amount) <= filter.maxAmount!);
      }
    }

    return filtered;
  }

  getMetrics(filter?: AnalyticsFilter): AnalyticsMetrics {
    const events = this.getEvents(filter);

    const totalRequests = events.length;
    const successfulRequests = events.filter(e => e.status >= 200 && e.status < 300).length;
    const failedRequests = events.filter(e => e.status >= 400).length;
    const paymentRequests = events.filter(e => e.paymentRequired).length;
    const successfulPayments = events.filter(e => e.paymentValid).length;
    const failedPayments = events.filter(e => e.paymentProvided && !e.paymentValid).length;

    const totalRevenue = events
      .filter(e => e.paymentValid && e.amount)
      .reduce((sum, e) => sum + parseFloat(e.amount!), 0);

    const averageResponseTime = events.length > 0
      ? events.reduce((sum, e) => sum + e.responseTime, 0) / events.length
      : 0;

    const uniqueWallets = new Set(
      events.filter(e => e.walletAddress).map(e => e.walletAddress)
    ).size;

    // Calculate per-endpoint statistics
    const endpointStats: Record<string, EndpointStats> = {};
    events.forEach(event => {
      if (!endpointStats[event.endpoint]) {
        endpointStats[event.endpoint] = {
          endpoint: event.endpoint,
          totalCalls: 0,
          successfulCalls: 0,
          failedCalls: 0,
          revenue: 0,
          averageResponseTime: 0,
        };
      }

      const stats = endpointStats[event.endpoint];
      stats.totalCalls++;
      if (event.status >= 200 && event.status < 300) {
        stats.successfulCalls++;
      }
      if (event.status >= 400) {
        stats.failedCalls++;
      }
      if (event.paymentValid && event.amount) {
        stats.revenue += parseFloat(event.amount);
      }
    });

    // Calculate average response times for each endpoint
    Object.keys(endpointStats).forEach(endpoint => {
      const endpointEvents = events.filter(e => e.endpoint === endpoint);
      const totalTime = endpointEvents.reduce((sum, e) => sum + e.responseTime, 0);
      endpointStats[endpoint].averageResponseTime = 
        endpointEvents.length > 0 ? totalTime / endpointEvents.length : 0;
    });

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      paymentRequests,
      successfulPayments,
      failedPayments,
      totalRevenue,
      averageResponseTime,
      uniqueWallets,
      endpointStats,
      recentEvents: events.slice(-100).reverse(), // Last 100 events, most recent first
    };
  }

  clearEvents(): void {
    this.events = [];
  }

  // Payment Confirmation Methods
  addConfirmation(confirmation: Omit<PaymentConfirmation, 'id' | 'confirmedAt'>): PaymentConfirmation {
    const fullConfirmation: PaymentConfirmation = {
      id: this.generateId(),
      confirmedAt: Date.now(),
      ...confirmation,
    };

    this.confirmations.push(fullConfirmation);

    // Remove old confirmations if exceeding max
    if (this.confirmations.length > this.maxConfirmations) {
      this.confirmations.shift();
    }

    return fullConfirmation;
  }

  getConfirmations(query?: PaymentConfirmationQuery): PaymentConfirmation[] {
    let filtered = [...this.confirmations];

    if (query) {
      if (query.signature) {
        filtered = filtered.filter(c => c.paymentSignature === query.signature);
      }
      if (query.nonce) {
        filtered = filtered.filter(c => c.nonce === query.nonce);
      }
      if (query.walletAddress) {
        filtered = filtered.filter(c => c.walletAddress === query.walletAddress);
      }
      if (query.startDate) {
        filtered = filtered.filter(c => c.confirmedAt >= query.startDate!);
      }
      if (query.endDate) {
        filtered = filtered.filter(c => c.confirmedAt <= query.endDate!);
      }
      if (query.status) {
        filtered = filtered.filter(c => c.status === query.status);
      }
    }

    // Sort by most recent first
    filtered.sort((a, b) => b.confirmedAt - a.confirmedAt);

    // Apply limit if specified
    if (query?.limit) {
      filtered = filtered.slice(0, query.limit);
    }

    return filtered;
  }

  getConfirmationByNonce(nonce: string): PaymentConfirmation | null {
    return this.confirmations.find(c => c.nonce === nonce) || null;
  }

  getConfirmationBySignature(signature: string): PaymentConfirmation | null {
    return this.confirmations.find(c => c.paymentSignature === signature) || null;
  }

  getConfirmationsByWallet(walletAddress: string, limit?: number): PaymentConfirmation[] {
    return this.getConfirmations({ walletAddress, limit });
  }

  clearConfirmations(): void {
    this.confirmations = [];
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
export const analyticsStore = new AnalyticsStore();

// Helper function to track an API request
export function trackApiRequest(data: {
  endpoint: string;
  method: string;
  status: number;
  paymentRequired: boolean;
  paymentProvided: boolean;
  paymentValid: boolean;
  amount?: string;
  walletAddress?: string;
  responseTime: number;
  userAgent?: string;
  error?: string;
}): void {
  analyticsStore.addEvent(data);
}

