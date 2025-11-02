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

interface AnalyticsMetrics {
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

interface Transaction {
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
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending' | 'failed'>('all');

  useEffect(() => {
    fetchAnalytics();
    fetchTransactions();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/analytics');
      const data = await response.json();
      if (data.success) {
        setMetrics(data.metrics);
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
      case 'solana': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'bsc': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'ethereum': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'pending': return <Clock className="w-4 h-4 text-orange-600" />;
      default: return null;
    }
  };

  const getExplorerUrl = (chain: string, hash: string) => {
    switch (chain) {
      case 'solana': return `https://solscan.io/tx/${hash}`;
      case 'bsc': return `https://bscscan.com/tx/${hash}`;
      case 'ethereum': return `https://etherscan.io/tx/${hash}`;
      default: return '';
    }
  };

  const filteredTransactions = filter === 'all' 
    ? transactions 
    : transactions.filter(tx => tx.status === filter);

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-white pt-20 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-white pt-20">
        <div className="container mx-auto px-4 py-16 max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
            <p className="text-gray-600">Real-time transaction metrics and payment insights</p>
          </div>

          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Transactions */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Activity className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <h3 className="text-gray-600 text-sm font-medium mb-1">Total Transactions</h3>
              <p className="text-3xl font-bold text-gray-900">{metrics?.totalTransactions || 0}</p>
            </div>

            {/* Total Revenue */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <h3 className="text-gray-600 text-sm font-medium mb-1">Total Revenue</h3>
              <p className="text-3xl font-bold text-gray-900">${metrics?.totalRevenue || '0.00'}</p>
            </div>

            {/* Success Rate */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <h3 className="text-gray-600 text-sm font-medium mb-1">Success Rate</h3>
              <p className="text-3xl font-bold text-gray-900">{metrics?.successRate || 0}%</p>
            </div>

            {/* Average Value */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-orange-600" />
                </div>
              </div>
              <h3 className="text-gray-600 text-sm font-medium mb-1">Avg Transaction</h3>
              <p className="text-3xl font-bold text-gray-900">${metrics?.averageTransactionValue || '0.00'}</p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Revenue Chart */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Revenue (Last 7 Days)</h3>
              <div className="space-y-2">
                {metrics?.revenueByDay.map((day, index) => {
                  const maxAmount = Math.max(...(metrics?.revenueByDay.map(d => d.amount) || [1]));
                  const percentage = (day.amount / maxAmount) * 100;
                  return (
                    <div key={index} className="flex items-center gap-3">
                      <span className="text-xs text-gray-600 w-20">
                        {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                      <div className="flex-1 bg-gray-100 rounded-full h-8 relative overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-purple-600 to-blue-600 h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                          style={{ width: `${percentage}%` }}
                        >
                          {day.amount > 0 && (
                            <span className="text-xs font-semibold text-white">${day.amount.toFixed(2)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chain Distribution */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Transactions by Chain</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <img src="/assets/sol-logo.png" alt="Solana" className="w-5 h-5" />
                      <span className="text-sm font-medium text-gray-700">Solana</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{metrics?.transactionsByChain.solana || 0}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full transition-all"
                      style={{ 
                        width: `${((metrics?.transactionsByChain.solana || 0) / (metrics?.totalTransactions || 1)) * 100}%` 
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <img src="/assets/bsc-logo.png" alt="BSC" className="w-5 h-5" />
                      <span className="text-sm font-medium text-gray-700">BSC</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{metrics?.transactionsByChain.bsc || 0}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div 
                      className="bg-yellow-600 h-2 rounded-full transition-all"
                      style={{ 
                        width: `${((metrics?.transactionsByChain.bsc || 0) / (metrics?.totalTransactions || 1)) * 100}%` 
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <img src="/assets/eth-logo.png" alt="Ethereum" className="w-5 h-5" />
                      <span className="text-sm font-medium text-gray-700">Ethereum</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{metrics?.transactionsByChain.ethereum || 0}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ 
                        width: `${((metrics?.transactionsByChain.ethereum || 0) / (metrics?.totalTransactions || 1)) * 100}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Transaction History */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">Payment History</h3>
              
              {/* Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Amount</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Chain</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Description</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Date</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Tx Hash</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-gray-500">
                        No transactions found
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx) => (
                      <tr key={tx.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(tx.status)}
                            <span className="text-sm capitalize text-gray-700">{tx.status}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm font-semibold text-gray-900">
                            ${tx.amount}
                          </span>
                          <span className="text-xs text-gray-500 ml-1">{tx.currency}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium border ${getChainColor(tx.chain)}`}>
                            {tx.chain}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-gray-700">{tx.description || '-'}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-gray-600">
                            {new Date(tx.timestamp).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {tx.transactionHash ? (
                            <a
                              href={getExplorerUrl(tx.chain, tx.transactionHash)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-purple-600 hover:text-purple-700 text-sm"
                            >
                              <span className="font-mono">{tx.transactionHash.slice(0, 6)}...</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
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

