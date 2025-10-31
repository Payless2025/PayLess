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
  Clock
} from 'lucide-react';

interface AnalyticsMetrics {
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

interface EndpointStats {
  endpoint: string;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  revenue: number;
  averageResponseTime: number;
}

interface AnalyticsEvent {
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
  error?: string;
}

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterEndpoint, setFilterEndpoint] = useState<string>('');
  const [filterDays, setFilterDays] = useState<number>(7);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (filterEndpoint) {
        params.append('endpoint', filterEndpoint);
      }
      
      if (filterDays > 0) {
        const startDate = Date.now() - (filterDays * 24 * 60 * 60 * 1000);
        params.append('startDate', startDate.toString());
      }

      const response = await fetch(`/api/analytics?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setMetrics(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportData = async (format: 'json' | 'csv') => {
    try {
      const filter: any = {};
      
      if (filterEndpoint) {
        filter.endpoint = filterEndpoint;
      }
      
      if (filterDays > 0) {
        filter.startDate = Date.now() - (filterDays * 24 * 60 * 60 * 1000);
      }

      const response = await fetch('/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ format, filter }),
      });

      if (format === 'csv') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Failed to export data:', error);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [filterEndpoint, filterDays]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchAnalytics, 10000); // Refresh every 10 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, filterEndpoint, filterDays]);

  const endpoints = metrics ? Object.keys(metrics.endpointStats) : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-slate-900/50 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="flex items-center gap-2 text-white hover:text-purple-400 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Home</span>
              </Link>
              <h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  autoRefresh 
                    ? 'bg-green-600 hover:bg-green-700 text-white' 
                    : 'bg-white/10 hover:bg-white/20 text-white'
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
        {/* Filters */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Filters</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-300 mb-2">Time Period</label>
              <select
                value={filterDays}
                onChange={(e) => setFilterDays(parseInt(e.target.value))}
                className="w-full px-4 py-2 rounded-lg bg-slate-900 text-white border border-white/10 focus:border-purple-500 focus:outline-none"
              >
                <option value={1}>Last 24 hours</option>
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
                <option value={0}>All time</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-2">Endpoint</label>
              <select
                value={filterEndpoint}
                onChange={(e) => setFilterEndpoint(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-slate-900 text-white border border-white/10 focus:border-purple-500 focus:outline-none"
              >
                <option value="">All endpoints</option>
                {endpoints.map((endpoint) => (
                  <option key={endpoint} value={endpoint}>
                    {endpoint}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={() => exportData('json')}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                JSON
              </button>
              <button
                onClick={() => exportData('csv')}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                CSV
              </button>
            </div>
          </div>
        </div>

        {loading && !metrics ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
          </div>
        ) : metrics ? (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <MetricCard
                icon={<Activity className="w-6 h-6" />}
                label="Total Requests"
                value={metrics.totalRequests}
                subtitle={`${metrics.successfulRequests} successful`}
                color="blue"
              />
              <MetricCard
                icon={<DollarSign className="w-6 h-6" />}
                label="Total Revenue"
                value={`$${metrics.totalRevenue.toFixed(2)}`}
                subtitle={`${metrics.successfulPayments} payments`}
                color="green"
              />
              <MetricCard
                icon={<Users className="w-6 h-6" />}
                label="Unique Wallets"
                value={metrics.uniqueWallets}
                subtitle={`${metrics.paymentRequests} payment requests`}
                color="purple"
              />
              <MetricCard
                icon={<Clock className="w-6 h-6" />}
                label="Avg Response Time"
                value={`${metrics.averageResponseTime.toFixed(0)}ms`}
                subtitle={`${metrics.failedRequests} failed`}
                color="orange"
              />
            </div>

            {/* Endpoint Statistics */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">Endpoint Statistics</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4 text-gray-300 font-semibold">Endpoint</th>
                      <th className="text-right py-3 px-4 text-gray-300 font-semibold">Calls</th>
                      <th className="text-right py-3 px-4 text-gray-300 font-semibold">Success</th>
                      <th className="text-right py-3 px-4 text-gray-300 font-semibold">Failed</th>
                      <th className="text-right py-3 px-4 text-gray-300 font-semibold">Revenue</th>
                      <th className="text-right py-3 px-4 text-gray-300 font-semibold">Avg Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.values(metrics.endpointStats).map((stats) => (
                      <tr key={stats.endpoint} className="border-b border-white/5 hover:bg-white/5">
                        <td className="py-3 px-4 text-white font-mono text-sm">{stats.endpoint}</td>
                        <td className="py-3 px-4 text-right text-gray-300">{stats.totalCalls}</td>
                        <td className="py-3 px-4 text-right text-green-400">{stats.successfulCalls}</td>
                        <td className="py-3 px-4 text-right text-red-400">{stats.failedCalls}</td>
                        <td className="py-3 px-4 text-right text-purple-400">${stats.revenue.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right text-gray-300">{stats.averageResponseTime.toFixed(0)}ms</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <h2 className="text-xl font-semibold text-white mb-4">Recent Activity</h2>
              <div className="space-y-2">
                {metrics.recentEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center gap-4 p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex-shrink-0">
                      {event.status >= 200 && event.status < 300 ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm text-purple-400">{event.method}</span>
                        <span className="font-mono text-sm text-white truncate">{event.endpoint}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          event.status >= 200 && event.status < 300
                            ? 'bg-green-500/20 text-green-300'
                            : 'bg-red-500/20 text-red-300'
                        }`}>
                          {event.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span>{new Date(event.timestamp).toLocaleString()}</span>
                        <span>{event.responseTime}ms</span>
                        {event.amount && <span className="text-purple-400">${event.amount}</span>}
                        {event.walletAddress && (
                          <span className="font-mono truncate max-w-[150px]">
                            {event.walletAddress}
                          </span>
                        )}
                      </div>
                      {event.error && (
                        <div className="text-xs text-red-400 mt-1">{event.error}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-20 text-gray-400">
            No analytics data available
          </div>
        )}
      </div>
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
    blue: 'bg-blue-500/20 text-blue-400',
    green: 'bg-green-500/20 text-green-400',
    purple: 'bg-purple-500/20 text-purple-400',
    orange: 'bg-orange-500/20 text-orange-400',
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
      <div className={`w-12 h-12 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <div className="text-sm text-gray-400 mb-1">{label}</div>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      <div className="text-xs text-gray-500">{subtitle}</div>
    </div>
  );
}

