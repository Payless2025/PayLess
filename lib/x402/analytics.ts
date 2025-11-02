/**
 * Analytics and transaction tracking for Payless
 */

export interface Transaction {
  id: string;
  amount: string;
  currency: string;
  chain: 'solana' | 'bsc' | 'ethereum';
  status: 'pending' | 'completed' | 'failed';
  fromAddress: string;
  toAddress: string;
  transactionHash?: string;
  timestamp: number;
  description?: string;
  paymentLinkId?: string;
}

export interface AnalyticsMetrics {
  totalTransactions: number;
  totalRevenue: string;
  successRate: number;
  averageTransactionValue: string;
  transactionsByChain: {
    solana: number;
    bsc: number;
    ethereum: number;
  };
  transactionsByStatus: {
    pending: number;
    completed: number;
    failed: number;
  };
  recentTransactions: Transaction[];
  revenueByDay: Array<{
    date: string;
    amount: number;
  }>;
}

// In-memory storage for transactions
const transactionStore = new Map<string, Transaction>();
let transactionIdCounter = 1;

/**
 * Generate unique transaction ID
 */
export function generateTransactionId(): string {
  return `tx_${Date.now()}_${transactionIdCounter++}`;
}

/**
 * Record a new transaction
 */
export function recordTransaction(transaction: Omit<Transaction, 'id'>): Transaction {
  const id = generateTransactionId();
  const newTransaction: Transaction = {
    id,
    ...transaction,
  };
  
  transactionStore.set(id, newTransaction);
  return newTransaction;
}

/**
 * Get transaction by ID
 */
export function getTransaction(id: string): Transaction | undefined {
  return transactionStore.get(id);
}

/**
 * Get all transactions
 */
export function getAllTransactions(): Transaction[] {
  return Array.from(transactionStore.values()).sort(
    (a, b) => b.timestamp - a.timestamp
  );
}

/**
 * Get transactions with filters
 */
export function getTransactions(filters?: {
  status?: Transaction['status'];
  chain?: Transaction['chain'];
  fromAddress?: string;
  toAddress?: string;
  limit?: number;
  offset?: number;
}): Transaction[] {
  let transactions = getAllTransactions();

  if (filters?.status) {
    transactions = transactions.filter(tx => tx.status === filters.status);
  }

  if (filters?.chain) {
    transactions = transactions.filter(tx => tx.chain === filters.chain);
  }

  if (filters?.fromAddress) {
    transactions = transactions.filter(tx => 
      tx.fromAddress.toLowerCase() === filters.fromAddress?.toLowerCase()
    );
  }

  if (filters?.toAddress) {
    transactions = transactions.filter(tx => 
      tx.toAddress.toLowerCase() === filters.toAddress?.toLowerCase()
    );
  }

  const offset = filters?.offset || 0;
  const limit = filters?.limit || 50;

  return transactions.slice(offset, offset + limit);
}

/**
 * Update transaction status
 */
export function updateTransactionStatus(
  id: string,
  status: Transaction['status'],
  transactionHash?: string
): Transaction | null {
  const transaction = transactionStore.get(id);
  if (!transaction) return null;

  transaction.status = status;
  if (transactionHash) {
    transaction.transactionHash = transactionHash;
  }

  transactionStore.set(id, transaction);
  return transaction;
}

/**
 * Get analytics metrics
 */
export function getAnalyticsMetrics(): AnalyticsMetrics {
  const transactions = getAllTransactions();
  
  const totalTransactions = transactions.length;
  const completedTransactions = transactions.filter(tx => tx.status === 'completed');
  const successRate = totalTransactions > 0 
    ? (completedTransactions.length / totalTransactions) * 100 
    : 0;

  const totalRevenue = completedTransactions.reduce(
    (sum, tx) => sum + parseFloat(tx.amount),
    0
  );

  const averageTransactionValue = completedTransactions.length > 0
    ? totalRevenue / completedTransactions.length
    : 0;

  const transactionsByChain = {
    solana: transactions.filter(tx => tx.chain === 'solana').length,
    bsc: transactions.filter(tx => tx.chain === 'bsc').length,
    ethereum: transactions.filter(tx => tx.chain === 'ethereum').length,
  };

  const transactionsByStatus = {
    pending: transactions.filter(tx => tx.status === 'pending').length,
    completed: transactions.filter(tx => tx.status === 'completed').length,
    failed: transactions.filter(tx => tx.status === 'failed').length,
  };

  // Get revenue by day (last 7 days)
  const today = new Date();
  const revenueByDay = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (6 - i));
    const dateStr = date.toISOString().split('T')[0];
    
    const dayTransactions = completedTransactions.filter(tx => {
      const txDate = new Date(tx.timestamp).toISOString().split('T')[0];
      return txDate === dateStr;
    });

    const amount = dayTransactions.reduce(
      (sum, tx) => sum + parseFloat(tx.amount),
      0
    );

    return { date: dateStr, amount };
  });

  const recentTransactions = transactions.slice(0, 10);

  return {
    totalTransactions,
    totalRevenue: totalRevenue.toFixed(2),
    successRate: parseFloat(successRate.toFixed(2)),
    averageTransactionValue: averageTransactionValue.toFixed(2),
    transactionsByChain,
    transactionsByStatus,
    recentTransactions,
    revenueByDay,
  };
}

/**
 * Track API request (for middleware compatibility)
 */
export function trackApiRequest(data: {
  endpoint: string;
  method: string;
  status: number;
  paymentRequired?: boolean;
  paymentProvided?: boolean;
  paymentValid?: boolean;
  responseTime?: number;
  userAgent?: string;
}): void {
  // This is a compatibility function for the old middleware
  // In the future, this could be enhanced to track API usage metrics
  console.log('[Analytics] API request:', data.endpoint, data.status);
}

/**
 * Analytics store (for middleware compatibility)
 */
export const analyticsStore = {
  addConfirmation(data: any): any {
    // This is a compatibility function for the old middleware
    // Convert to transaction format
    recordTransaction({
      amount: data.amount || '0',
      currency: data.token || 'USDC',
      chain: 'solana',
      status: 'completed',
      fromAddress: data.walletAddress || '',
      toAddress: data.recipient || '',
      transactionHash: data.paymentSignature,
      timestamp: Date.now(),
      description: `Payment for ${data.endpoint}`,
    });
    return data;
  },
};

/**
 * Generate mock transactions for demo purposes
 */
export function generateMockTransactions(count: number = 20): void {
  const chains: Array<'solana' | 'bsc' | 'ethereum'> = ['solana', 'bsc', 'ethereum'];
  const statuses: Array<'pending' | 'completed' | 'failed'> = ['completed', 'completed', 'completed', 'completed', 'pending', 'failed'];
  const descriptions = [
    'AI API Chat Request',
    'Image Generation',
    'Premium Content Access',
    'Payment Link Payment',
    'Translation Service',
    'Text-to-Speech API',
  ];

  for (let i = 0; i < count; i++) {
    const daysAgo = Math.floor(Math.random() * 7);
    const timestamp = Date.now() - (daysAgo * 24 * 60 * 60 * 1000) - (Math.random() * 24 * 60 * 60 * 1000);
    const amount = (Math.random() * 50 + 0.5).toFixed(2);
    const chain = chains[Math.floor(Math.random() * chains.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    recordTransaction({
      amount,
      currency: 'USDC',
      chain,
      status,
      fromAddress: `0x${Math.random().toString(16).substr(2, 40)}`,
      toAddress: `0x${Math.random().toString(16).substr(2, 40)}`,
      transactionHash: status === 'completed' ? `0x${Math.random().toString(16).substr(2, 64)}` : undefined,
      timestamp,
      description: descriptions[Math.floor(Math.random() * descriptions.length)],
    });
  }
}
