'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  TrendingUp, 
  DollarSign, 
  Activity, 
  Users, 
  Download,
  Filter,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  PieChart as PieChartIcon
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

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
  revenueByDay: Array<{
    date: string;
    amount: number;
  }>;
  recentTransactions: Array<{
    id: string;
    amount: string;
    chain: string;
    status: string;
    timestamp: number;
    fromAddress: string;
  }>;
}

const CHAIN_COLORS = {
  robinhood: '#00C805',
};

const STATUS_COLORS = {
  completed: '#10B981',
  pending: '#F59E0B',
  failed: '#EF4444',
};

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/analytics');
      const result = await response.json();
      
      if (result.success) {
        setMetrics(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchAnalytics, 10000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  // Prepare chart data
  const chainDistributionData = metrics ? [
    { name: 'Robinhood Chain', value: metrics.transactionsByChain.robinhood, color: CHAIN_COLORS.robinhood },
  ] : [];

  const statusDistributionData = metrics ? [
    { name: 'Completed', value: metrics.transactionsByStatus.completed, color: STATUS_COLORS.completed },
    { name: 'Pending', value: metrics.transactionsByStatus.pending, color: STATUS_COLORS.pending },
    { name: 'Failed', value: metrics.transactionsByStatus.failed, color: STATUS_COLORS.failed },
  ] : [];

  const revenueData = metrics?.revenueByDay.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    revenue: item.amount,
  })) || [];

  return (
    <div className="min-h-screen bg-bg">
      <Header />
      <div className="pt-14" />
      {/* Page header */}
      <header className="border-b border-line bg-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="flex items-center gap-2 text-text hover:text-accent transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Home</span>
              </Link>
              <h1 className="text-2xl font-bold text-text">Analytics Dashboard</h1>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`flex items-center gap-2 px-4 py-2 rounded transition-colors ${
                  autoRefresh 
                    ? 'bg-green-600 hover:bg-green-700 text-text' 
                    : 'bg-surface-raised hover:bg-white/20 text-text'
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && !metrics ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-accent animate-spin" />
          </div>
        ) : metrics ? (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <MetricCard
                icon={<Activity className="w-6 h-6" />}
                label="Total Transactions"
                value={metrics.totalTransactions}
                subtitle={`${metrics.successRate}% success rate`}
                color="blue"
              />
              <MetricCard
                icon={<DollarSign className="w-6 h-6" />}
                label="Total Revenue"
                value={`$${metrics.totalRevenue}`}
                subtitle={`Avg: $${metrics.averageTransactionValue}`}
                color="green"
              />
              <MetricCard
                icon={<CheckCircle className="w-6 h-6" />}
                label="Completed"
                value={metrics.transactionsByStatus.completed}
                subtitle={`${metrics.transactionsByStatus.failed} failed`}
                color="purple"
              />
              <MetricCard
                icon={<Clock className="w-6 h-6" />}
                label="Pending"
                value={metrics.transactionsByStatus.pending}
                subtitle="Awaiting confirmation"
                color="orange"
              />
            </div>

            {/* Charts Row 1: Revenue Timeline */}
            <div className="rounded border border-line bg-surface p-6 mb-8">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="w-5 h-5 text-green-400" />
                <h2 className="text-xl font-semibold text-text">Revenue Timeline (Last 7 Days)</h2>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                  <XAxis dataKey="date" stroke="#ffffff80" />
                  <YAxis stroke="#ffffff80" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #ffffff20',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                    formatter={(value: any) => `$${value.toFixed(2)}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#8B5CF6"
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Charts Row 2: Distribution Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Chain Distribution */}
              <div className="rounded border border-line bg-surface p-6">
                <div className="flex items-center gap-2 mb-6">
                  <PieChartIcon className="w-5 h-5 text-accent" />
                  <h2 className="text-xl font-semibold text-text">Transactions by Chain</h2>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chainDistributionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chainDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #ffffff20',
                        borderRadius: '8px',
                        color: '#fff',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Status Distribution */}
              <div className="rounded border border-line bg-surface p-6">
                <div className="flex items-center gap-2 mb-6">
                  <BarChart3 className="w-5 h-5 text-blue-400" />
                  <h2 className="text-xl font-semibold text-text">Transaction Status</h2>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={statusDistributionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                    <XAxis dataKey="name" stroke="#ffffff80" />
                    <YAxis stroke="#ffffff80" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #ffffff20',
                        borderRadius: '8px',
                        color: '#fff',
                      }}
                    />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {statusDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="rounded border border-line bg-surface p-6">
              <h2 className="text-xl font-semibold text-text mb-4">Recent Transactions</h2>
              <div className="space-y-2">
                {metrics.recentTransactions.slice(0, 10).map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center gap-4 p-4 rounded bg-surface hover:bg-surface-raised transition-colors"
                  >
                    <div className="flex-shrink-0">
                      {tx.status === 'completed' ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : tx.status === 'pending' ? (
                        <Clock className="w-5 h-5 text-orange-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm text-accent">${tx.amount}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                          {tx.chain}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          tx.status === 'completed'
                            ? 'bg-green-500/20 text-green-300'
                            : tx.status === 'pending'
                            ? 'bg-orange-500/20 text-orange-300'
                            : 'bg-red-500/20 text-red-300'
                        }`}>
                          {tx.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-text-muted">
                        <span>{new Date(tx.timestamp).toLocaleString()}</span>
                        <span className="font-mono truncate max-w-[150px]">
                          From: {tx.fromAddress}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-20 text-text-muted">
            No analytics data available
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtitle: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

function MetricCard({ icon, label, value, subtitle, color }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-surface-raised text-text-faint',
    green: 'bg-surface-raised text-text-faint',
    purple: 'bg-purple-500/20 text-accent',
    orange: 'bg-surface-raised text-text-faint',
  };

  return (
    <div className="rounded border border-line bg-surface p-6">
      <div className={`w-12 h-12 rounded ${colorClasses[color]} flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <div className="text-sm text-text-muted mb-1">{label}</div>
      <div className="font-mono text-2xl tnum text-text mb-1">{value}</div>
      <div className="text-xs text-text-faint">{subtitle}</div>
    </div>
  );
}
