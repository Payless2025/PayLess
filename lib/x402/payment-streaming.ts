/**
 * Payment Streaming System
 * Pay-per-second/minute for metered services
 * Perfect for AI APIs, compute time, streaming media
 */

import { SupportedChain } from '../chains/config';

export enum StreamStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  INSUFFICIENT_FUNDS = 'insufficient_funds',
}

export enum BillingInterval {
  PER_SECOND = 'per_second',
  PER_MINUTE = 'per_minute',
  PER_HOUR = 'per_hour',
}

export interface StreamConfig {
  // Pricing
  ratePerInterval: number; // Amount charged per interval (in tokens)
  billingInterval: BillingInterval;
  chain: SupportedChain;
  
  // Limits
  minBalance?: number; // Minimum balance to keep stream active
  maxDuration?: number; // Maximum stream duration in seconds
  
  // Metadata
  serviceName: string;
  description?: string;
}

export interface PaymentStream {
  id: string;
  walletAddress: string;
  config: StreamConfig;
  
  // Status
  status: StreamStatus;
  createdAt: number;
  startedAt?: number;
  pausedAt?: number;
  completedAt?: number;
  
  // Billing
  totalDuration: number; // Total active seconds
  totalCharged: number; // Total amount charged
  lastBilledAt: number; // Last billing timestamp
  
  // Balance tracking
  estimatedBalance: number; // User's estimated remaining balance
  
  // History
  events: StreamEvent[];
}

export interface StreamEvent {
  type: 'started' | 'paused' | 'resumed' | 'completed' | 'cancelled' | 'billed' | 'insufficient_funds';
  timestamp: number;
  amount?: number;
  balance?: number;
  reason?: string;
}

export interface StreamMetrics {
  activeStreams: number;
  totalRevenue: number;
  averageStreamDuration: number;
  totalStreamsSessions: number;
}

// In-memory stream storage (use database in production)
const streamStore = new Map<string, PaymentStream>();

/**
 * Generate unique stream ID
 */
function generateStreamId(): string {
  return Math.random().toString(36).substring(2, 15);
}

/**
 * Get interval duration in seconds
 */
function getIntervalSeconds(interval: BillingInterval): number {
  switch (interval) {
    case BillingInterval.PER_SECOND:
      return 1;
    case BillingInterval.PER_MINUTE:
      return 60;
    case BillingInterval.PER_HOUR:
      return 3600;
  }
}

/**
 * Calculate cost for a duration
 */
export function calculateStreamCost(
  duration: number, // in seconds
  ratePerInterval: number,
  billingInterval: BillingInterval
): number {
  const intervalSeconds = getIntervalSeconds(billingInterval);
  const intervals = duration / intervalSeconds;
  return intervals * ratePerInterval;
}

/**
 * Create a new payment stream
 */
export function createStream(
  walletAddress: string,
  config: StreamConfig,
  initialBalance: number = 0
): PaymentStream {
  const stream: PaymentStream = {
    id: generateStreamId(),
    walletAddress,
    config,
    status: StreamStatus.ACTIVE,
    createdAt: Date.now(),
    startedAt: Date.now(),
    totalDuration: 0,
    totalCharged: 0,
    lastBilledAt: Date.now(),
    estimatedBalance: initialBalance,
    events: [
      {
        type: 'started',
        timestamp: Date.now(),
        balance: initialBalance,
      },
    ],
  };

  streamStore.set(stream.id, stream);
  return stream;
}

/**
 * Get stream by ID
 */
export function getStream(streamId: string): PaymentStream | null {
  return streamStore.get(streamId) || null;
}

/**
 * Get all streams for a wallet
 */
export function getWalletStreams(walletAddress: string): PaymentStream[] {
  return Array.from(streamStore.values())
    .filter(stream => stream.walletAddress === walletAddress)
    .sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Get all active streams
 */
export function getActiveStreams(): PaymentStream[] {
  return Array.from(streamStore.values())
    .filter(stream => stream.status === StreamStatus.ACTIVE);
}

/**
 * Update stream billing
 */
export function updateStreamBilling(streamId: string): PaymentStream | null {
  const stream = streamStore.get(streamId);
  if (!stream || stream.status !== StreamStatus.ACTIVE) {
    return null;
  }

  const now = Date.now();
  const durationSinceLastBill = (now - stream.lastBilledAt) / 1000; // Convert to seconds
  
  // Calculate charges
  const charge = calculateStreamCost(
    durationSinceLastBill,
    stream.config.ratePerInterval,
    stream.config.billingInterval
  );

  // Update stream
  stream.totalDuration += durationSinceLastBill;
  stream.totalCharged += charge;
  stream.estimatedBalance -= charge;
  stream.lastBilledAt = now;

  // Add billing event
  stream.events.push({
    type: 'billed',
    timestamp: now,
    amount: charge,
    balance: stream.estimatedBalance,
  });

  // Check if balance is too low
  if (stream.config.minBalance && stream.estimatedBalance < stream.config.minBalance) {
    stream.status = StreamStatus.INSUFFICIENT_FUNDS;
    stream.events.push({
      type: 'insufficient_funds',
      timestamp: now,
      balance: stream.estimatedBalance,
      reason: `Balance below minimum (${stream.config.minBalance})`,
    });
  }

  // Check max duration
  if (stream.config.maxDuration && stream.totalDuration >= stream.config.maxDuration) {
    stream.status = StreamStatus.COMPLETED;
    stream.completedAt = now;
    stream.events.push({
      type: 'completed',
      timestamp: now,
      reason: 'Maximum duration reached',
    });
  }

  streamStore.set(streamId, stream);
  return stream;
}

/**
 * Pause a stream
 */
export function pauseStream(streamId: string): PaymentStream | null {
  const stream = streamStore.get(streamId);
  if (!stream || stream.status !== StreamStatus.ACTIVE) {
    return null;
  }

  // Bill up to this point
  updateStreamBilling(streamId);

  const now = Date.now();
  stream.status = StreamStatus.PAUSED;
  stream.pausedAt = now;
  stream.events.push({
    type: 'paused',
    timestamp: now,
    balance: stream.estimatedBalance,
  });

  streamStore.set(streamId, stream);
  return stream;
}

/**
 * Resume a paused stream
 */
export function resumeStream(streamId: string): PaymentStream | null {
  const stream = streamStore.get(streamId);
  if (!stream || stream.status !== StreamStatus.PAUSED) {
    return null;
  }

  const now = Date.now();
  stream.status = StreamStatus.ACTIVE;
  stream.lastBilledAt = now; // Reset billing clock
  stream.events.push({
    type: 'resumed',
    timestamp: now,
    balance: stream.estimatedBalance,
  });

  streamStore.set(streamId, stream);
  return stream;
}

/**
 * Complete a stream (normal end)
 */
export function completeStream(streamId: string): PaymentStream | null {
  const stream = streamStore.get(streamId);
  if (!stream) {
    return null;
  }

  // Bill final usage
  if (stream.status === StreamStatus.ACTIVE) {
    updateStreamBilling(streamId);
  }

  const now = Date.now();
  stream.status = StreamStatus.COMPLETED;
  stream.completedAt = now;
  stream.events.push({
    type: 'completed',
    timestamp: now,
    balance: stream.estimatedBalance,
  });

  streamStore.set(streamId, stream);
  return stream;
}

/**
 * Cancel a stream (user-initiated)
 */
export function cancelStream(streamId: string, reason?: string): PaymentStream | null {
  const stream = streamStore.get(streamId);
  if (!stream) {
    return null;
  }

  // Bill final usage
  if (stream.status === StreamStatus.ACTIVE) {
    updateStreamBilling(streamId);
  }

  const now = Date.now();
  stream.status = StreamStatus.CANCELLED;
  stream.completedAt = now;
  stream.events.push({
    type: 'cancelled',
    timestamp: now,
    balance: stream.estimatedBalance,
    reason: reason || 'User cancelled',
  });

  streamStore.set(streamId, stream);
  return stream;
}

/**
 * Add funds to a stream
 */
export function addStreamFunds(streamId: string, amount: number): PaymentStream | null {
  const stream = streamStore.get(streamId);
  if (!stream) {
    return null;
  }

  stream.estimatedBalance += amount;

  // If stream was stopped due to insufficient funds, reactivate it
  if (stream.status === StreamStatus.INSUFFICIENT_FUNDS) {
    const minBalance = stream.config.minBalance || 0;
    if (stream.estimatedBalance >= minBalance) {
      stream.status = StreamStatus.ACTIVE;
      stream.lastBilledAt = Date.now();
      stream.events.push({
        type: 'resumed',
        timestamp: Date.now(),
        amount,
        balance: stream.estimatedBalance,
      });
    }
  }

  streamStore.set(streamId, stream);
  return stream;
}

/**
 * Get stream metrics
 */
export function getStreamMetrics(): StreamMetrics {
  const streams = Array.from(streamStore.values());
  
  return {
    activeStreams: streams.filter(s => s.status === StreamStatus.ACTIVE).length,
    totalRevenue: streams.reduce((sum, s) => sum + s.totalCharged, 0),
    averageStreamDuration: streams.length > 0
      ? streams.reduce((sum, s) => sum + s.totalDuration, 0) / streams.length
      : 0,
    totalStreamsSessions: streams.length,
  };
}

/**
 * Background job to update all active streams
 * Call this periodically (e.g., every 10 seconds)
 */
export function updateAllActiveStreams(): void {
  const activeStreams = getActiveStreams();
  activeStreams.forEach(stream => {
    updateStreamBilling(stream.id);
  });
}

/**
 * Format stream duration for display
 */
export function formatStreamDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
}

/**
 * Format rate for display
 */
export function formatStreamRate(rate: number, interval: BillingInterval, chain: SupportedChain): string {
  const intervalStr = interval.replace('per_', '');
  const chainSymbol = chain === SupportedChain.SOLANA ? 'SOL' : 
                      chain === SupportedChain.BSC ? 'BNB' : 'ETH';
  
  return `${rate} ${chainSymbol}/${intervalStr}`;
}

// Export store for testing (remove in production with real database)
export const _streamStore = streamStore;
