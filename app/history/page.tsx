'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Download, 
  Filter, 
  RefreshCw, 
  ExternalLink,
  CheckCircle2,
  Clock,
  XCircle,
  TrendingUp,
  Calendar,
  ChevronDown,
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

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

interface HistoryResponse {
  success: boolean;
  count: number;
  total: string;
  transactions: Transaction[];
}

export default function PaymentHistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    chain: '',
    startDate: '',
    endDate: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [totalAmount, setTotalAmount] = useState('0');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      
      if (search) params.append('search', search);
      if (filters.status) params.append('status', filters.status);
      if (filters.chain) params.append('chain', filters.chain);
      if (filters.startDate) params.append('startDate', new Date(filters.startDate).getTime().toString());
      if (filters.endDate) params.append('endDate', new Date(filters.endDate).getTime().toString());
      
      const response = await fetch(`/api/history?${params.toString()}`);
      const data: HistoryResponse = await response.json();
      
      if (data.success) {
        setTransactions(data.transactions);
        setTotalAmount(data.total);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, filters]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshing(true);
      fetchHistory();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchHistory]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const response = await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format, filters }),
      });

      if (format === 'csv') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `payless-history-${Date.now()}.csv`;
        a.click();
      } else {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `payless-history-${Date.now()}.json`;
        a.click();
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const getChainExplorerUrl = (tx: Transaction) => {
    if (!tx.transactionHash) return null;
    
    const explorers = {
      solana: `https://solscan.io/tx/${tx.transactionHash}`,
      ethereum: `https://etherscan.io/tx/${tx.transactionHash}`,
      bsc: `https://bscscan.com/tx/${tx.transactionHash}`,
    };
    
    return explorers[tx.chain];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500 animate-pulse" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getChainColor = (chain: string) => {
    const colors = {
      solana: 'bg-purple-100 text-purple-800 border-purple-300',
      ethereum: 'bg-blue-100 text-blue-800 border-blue-300',
      bsc: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    };
    return colors[chain as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      chain: '',
      startDate: '',
      endDate: '',
    });
    setSearch('');
  };

  const activeFiltersCount = Object.values(filters).filter(Boolean).length + (search ? 1 : 0);

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gradient-to-br from-payless-dark-bg via-payless-dark to-payless-dark-bg pt-20">
          <div className="container mx-auto px-4 py-16">
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="w-8 h-8 text-payless-cyan animate-spin" />
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-payless-dark-bg via-payless-dark to-payless-dark-bg pt-20">
        <div className="container mx-auto px-4 py-12 max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">
              Payment History
            </h1>
            <p className="text-gray-400">
              Track all your transactions with real-time updates
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-br from-payless-purple/20 to-payless-blue/20 backdrop-blur-sm border border-payless-purple/30 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-5 h-5 text-payless-cyan" />
                <span className="text-gray-400">Total Volume</span>
              </div>
              <p className="text-3xl font-bold text-white">${totalAmount}</p>
            </div>

            <div className="bg-gradient-to-br from-payless-purple/20 to-payless-blue/20 backdrop-blur-sm border border-payless-purple/30 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <span className="text-gray-400">Total Transactions</span>
              </div>
              <p className="text-3xl font-bold text-white">{transactions.length}</p>
            </div>

            <div className="bg-gradient-to-br from-payless-purple/20 to-payless-blue/20 backdrop-blur-sm border border-payless-purple/30 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <RefreshCw className={`w-5 h-5 text-payless-cyan ${refreshing ? 'animate-spin' : ''}`} />
                <span className="text-gray-400">Auto-refresh</span>
              </div>
              <p className="text-lg text-white">Every 30s</p>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by ID, hash, address..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-payless-cyan"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white hover:border-payless-cyan transition-all flex items-center gap-2"
                >
                  <Filter className="w-5 h-5" />
                  Filters
                  {activeFiltersCount > 0 && (
                    <span className="px-2 py-0.5 bg-payless-cyan text-payless-dark text-xs rounded-full">
                      {activeFiltersCount}
                    </span>
                  )}
                  <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                </button>

                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white hover:border-payless-cyan transition-all"
                >
                  <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                </button>

                <div className="relative group">
                  <button className="px-4 py-3 bg-gradient-to-r from-payless-cyan to-payless-blue text-payless-dark font-semibold rounded-lg hover:opacity-90 transition-all flex items-center gap-2">
                    <Download className="w-5 h-5" />
                    Export
                  </button>
                  <div className="absolute right-0 mt-2 w-32 bg-gray-900 border border-gray-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                    <button
                      onClick={() => handleExport('json')}
                      className="w-full px-4 py-2 text-left text-white hover:bg-gray-800 rounded-t-lg"
                    >
                      JSON
                    </button>
                    <button
                      onClick={() => handleExport('csv')}
                      className="w-full px-4 py-2 text-left text-white hover:bg-gray-800 rounded-b-lg"
                    >
                      CSV
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Filter Panel */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-gray-700 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-payless-cyan"
                  >
                    <option value="">All</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Chain</label>
                  <select
                    value={filters.chain}
                    onChange={(e) => setFilters({ ...filters, chain: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-payless-cyan"
                  >
                    <option value="">All</option>
                    <option value="solana">Solana</option>
                    <option value="ethereum">Ethereum</option>
                    <option value="bsc">BSC</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-payless-cyan"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">End Date</label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-payless-cyan"
                  />
                </div>

                {activeFiltersCount > 0 && (
                  <div className="md:col-span-4">
                    <button
                      onClick={clearFilters}
                      className="text-sm text-payless-cyan hover:text-payless-blue transition-colors"
                    >
                      Clear all filters
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Transactions List */}
          {transactions.length === 0 ? (
            <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700 rounded-xl p-12 text-center">
              <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">No transactions found</p>
              <p className="text-gray-500 text-sm mt-2">
                {activeFiltersCount > 0 ? 'Try adjusting your filters' : 'Your payment history will appear here'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  onClick={() => setSelectedTx(selectedTx?.id === tx.id ? null : tx)}
                  className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 hover:border-payless-cyan transition-all cursor-pointer"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      {getStatusIcon(tx.status)}
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-white font-mono text-sm">{tx.id}</span>
                          <span className={`px-2 py-1 rounded-md text-xs border ${getChainColor(tx.chain)}`}>
                            {tx.chain.toUpperCase()}
                          </span>
                        </div>
                        
                        <p className="text-gray-400 text-sm mb-1">
                          {tx.description || 'Payment transaction'}
                        </p>
                        
                        <p className="text-gray-500 text-xs font-mono">
                          {new Date(tx.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-white">
                          ${tx.amount}
                        </p>
                        <p className="text-sm text-gray-400">{tx.currency}</p>
                      </div>

                      {tx.transactionHash && (
                        <a
                          href={getChainExplorerUrl(tx) || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 bg-payless-cyan/10 border border-payless-cyan/30 rounded-lg text-payless-cyan hover:bg-payless-cyan/20 transition-all"
                        >
                          <ExternalLink className="w-5 h-5" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {selectedTx?.id === tx.id && (
                    <div className="mt-4 pt-4 border-t border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">From:</span>
                        <p className="text-white font-mono text-xs mt-1 break-all">
                          {tx.fromAddress}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-400">To:</span>
                        <p className="text-white font-mono text-xs mt-1 break-all">
                          {tx.toAddress}
                        </p>
                      </div>
                      {tx.transactionHash && (
                        <div className="md:col-span-2">
                          <span className="text-gray-400">Transaction Hash:</span>
                          <p className="text-white font-mono text-xs mt-1 break-all">
                            {tx.transactionHash}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}

