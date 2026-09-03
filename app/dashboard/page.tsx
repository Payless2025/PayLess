'use client';

import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Activity, 
  CheckCircle, 
  XCircle, 
  Clock,
  BarChart3,
  ExternalLink,
  Filter
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getRobinhoodTransactionLink } from '@/lib/chains/robinhood';

interface AnalyticsMetrics {
  totalTransactions: number;
  totalRevenue: string;
  successRate: number;
  averageTransactionValue: string;
  transactionsByChain: {
    robinhood: number;
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

interface Transaction {
  id: string;
  amount: string;
  currency: string;
  chain: 'robinhood';
  status: 'pending' | 'completed' | 'failed';
  fromAddress: string;
  toAddress: string;
  transactionHash?: string;
  timestamp: number;
  description?: string;
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [chain, setChain] = useState<{
    paymentsReceived: number; uniquePayers: number; volumeUSDG: string;
    atLeast: boolean; explorer: string;
  } | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending' | 'failed'>('all');

  useEffect(() => {
    fetchAnalytics();
    fetchTransactions();
  }, []);

  const fetchAnalytics = async () => {
    try {
      fetch('/api/metrics')
        .then((r) => r.json())
        .then((m) => m.success && setChain(m))
        .catch(() => {});
      const response = await fetch('/api/analytics');
      const data = await response.json();
      if (data.success) {
        setMetrics(data.data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await fetch('/api/transactions?limit=100');
      const data = await response.json();
      if (data.success) {
        setTransactions(data.transactions);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const getChainColor = (chain: string) => {
    switch (chain) {
      case 'robinhood': return 'bg-ok/10 text-ok border-ok/30';
      default: return 'bg-surface-raised text-text-muted border-line';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-ok" />;
      case 'failed': return <XCircle className="w-4 h-4 text-err" />;
      case 'pending': return <Clock className="w-4 h-4 text-warn" />;
      default: return null;
    }
  };

  const getExplorerUrl = (chain: string, hash: string) =>
    getRobinhoodTransactionLink(hash);

  const filteredTransactions = filter === 'all' 
    ? transactions 
    : transactions.filter(tx => tx.status === filter);

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-bg pt-20 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-bg pt-20">
        <div className="container mx-auto px-4 py-16 max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-text">Dashboard</h1>
            <p className="mt-2 text-sm text-text-muted">Every request that hit a priced endpoint, and what it settled for.</p>
          </div>

          {/* On-chain truth: read from the explorer index, never invented.
              The dashboard used to seed fifty fake rows when empty; these three
              numbers with a proof link replaced that. */}
          <div className="bg-surface border border-line rounded p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-mono text-xs uppercase tracking-widest text-text-faint">On-chain · USDG into the treasury</h3>
              {chain && (
                <a href={chain.explorer} target="_blank" rel="noopener noreferrer"
                   className="font-mono text-xs text-accent hover:underline">verify on Blockscout →</a>
              )}
            </div>
            {chain ? (
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <p className="font-mono text-3xl tnum text-text">{chain.atLeast ? '≥' : ''}{chain.paymentsReceived}</p>
                  <p className="mt-1 text-xs text-text-muted">payments received</p>
                </div>
                <div>
                  <p className="font-mono text-3xl tnum text-text">{chain.uniquePayers}</p>
                  <p className="mt-1 text-xs text-text-muted">unique payers</p>
                </div>
                <div>
                  <p className="font-mono text-3xl tnum text-text">{chain.volumeUSDG}</p>
                  <p className="mt-1 text-xs text-text-muted">USDG volume</p>
                </div>
              </div>
            ) : (
              <p className="font-mono text-sm text-text-faint">chain index unreachable — no numbers beat made-up numbers</p>
            )}
          </div>

          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Transactions */}
            <div className="bg-surface border border-line rounded p-6 hover: transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-surface-raised rounded">
                  <Activity className="w-4 h-4 text-text-faint" />
                </div>
              </div>
              <h3 className="font-mono text-xs uppercase tracking-widest text-text-faint mb-2">Total Transactions</h3>
              <p className="font-mono text-3xl tnum text-text">{metrics?.totalTransactions || 0}</p>
            </div>

            {/* Total Revenue */}
            <div className="bg-surface border border-line rounded p-6 hover: transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-surface-raised rounded">
                  <DollarSign className="w-4 h-4 text-text-faint" />
                </div>
              </div>
              <h3 className="font-mono text-xs uppercase tracking-widest text-text-faint mb-2">Total Revenue</h3>
              <p className="font-mono text-3xl tnum text-text">${metrics?.totalRevenue || '0.00'}</p>
            </div>

            {/* Success Rate */}
            <div className="bg-surface border border-line rounded p-6 hover: transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-surface-raised rounded">
                  <TrendingUp className="w-4 h-4 text-text-faint" />
                </div>
              </div>
              <h3 className="font-mono text-xs uppercase tracking-widest text-text-faint mb-2">Success Rate</h3>
              <p className="font-mono text-3xl tnum text-text">{metrics?.successRate || 0}%</p>
            </div>

            {/* Average Value */}
            <div className="bg-surface border border-line rounded p-6 hover: transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-surface-raised rounded">
                  <BarChart3 className="w-4 h-4 text-text-faint" />
                </div>
              </div>
              <h3 className="font-mono text-xs uppercase tracking-widest text-text-faint mb-2">Avg Transaction</h3>
              <p className="font-mono text-3xl tnum text-text">${metrics?.averageTransactionValue || '0.00'}</p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Revenue Chart */}
            <div className="bg-surface border border-line rounded p-6">
              <h3 className="font-mono text-xs uppercase tracking-widest text-text-faint mb-5">Revenue (Last 7 Days)</h3>
              <div className="space-y-2">
                {metrics?.revenueByDay.map((day, index) => {
                  const maxAmount = Math.max(...(metrics?.revenueByDay.map(d => d.amount) || [1]));
                  const percentage = (day.amount / maxAmount) * 100;
                  return (
                    <div key={index} className="flex items-center gap-3">
                      <span className="text-xs text-text-muted w-20">
                        {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                      <div className="flex-1 bg-surface-raised rounded h-7 relative overflow-hidden">
                        <div 
                          className="bg-accent h-full rounded transition-all duration-500 flex items-center justify-end pr-2"
                          style={{ width: `${percentage}%` }}
                        >
                          {day.amount > 0 && (
                            <span className="font-mono text-xs tnum text-bg">${day.amount.toFixed(2)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chain Distribution */}
            <div className="bg-surface border border-line rounded p-6">
              <h3 className="font-mono text-xs uppercase tracking-widest text-text-faint mb-5">Transactions by Chain</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <img src="/assets/robinhood-logo.svg" alt="Robinhood Chain" className="w-5 h-5" />
                      <span className="text-sm font-medium text-text-muted">Robinhood Chain</span>
                    </div>
                    <span className="text-sm font-bold text-text">{metrics?.transactionsByChain.robinhood || 0}</span>
                  </div>
                  <div className="w-full bg-surface-raised rounded-full h-2">
                    <div
                      className="bg-ok h-2 rounded-full transition-all"
                      style={{
                        width: `${((metrics?.transactionsByChain.robinhood || 0) / (metrics?.totalTransactions || 1)) * 100}%`
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Transaction History */}
          <div className="bg-surface border border-line rounded p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-mono text-xs uppercase tracking-widest text-text-faint">Payment History</h3>
              
              {/* Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-text-faint" />
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as any)}
                  className="px-3 py-2 border border-line rounded text-sm focus:outline-none focus:ring-2 focus:border-accent"
                >
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-line">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-text-muted uppercase">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-text-muted uppercase">Amount</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-text-muted uppercase">Chain</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-text-muted uppercase">Description</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-text-muted uppercase">Date</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-text-muted uppercase">Tx Hash</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-text-faint">
                        No transactions found
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx) => (
                      <tr key={tx.id} className="border-b border-line hover:bg-surface-raised transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(tx.status)}
                            <span className="text-sm capitalize text-text-muted">{tx.status}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm font-semibold text-text">
                            ${tx.amount}
                          </span>
                          <span className="text-xs text-text-faint ml-1">{tx.currency}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium border ${getChainColor(tx.chain)}`}>
                            Robinhood
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-text-muted">{tx.description || '-'}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-text-muted">
                            {new Date(tx.timestamp).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {tx.transactionHash ? (
                            <a
                              href={getExplorerUrl(tx.chain, tx.transactionHash)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-accent hover:text-accent text-sm"
                            >
                              <span className="font-mono">{tx.transactionHash.slice(0, 6)}...</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-text-faint text-sm">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

