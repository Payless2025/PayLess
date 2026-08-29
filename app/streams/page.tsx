'use client';

import { useState, useEffect } from 'react';
import { Play, Pause, Square, DollarSign, Clock, Zap, TrendingUp, Activity } from 'lucide-react';
import {
  PaymentStream,
  StreamStatus,
  BillingInterval,
  formatStreamDuration,
  formatStreamRate,
} from '@/lib/x402/payment-streaming';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Page, PageHeader, Container, Button, Input } from '@/components/ui';

export default function StreamsPage() {
  const [wallet, setWallet] = useState('');
  const [streams, setStreams] = useState<PaymentStream[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStream, setSelectedStream] = useState<PaymentStream | null>(null);
  
  // Create stream form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({
    serviceName: '',
    description: '',
    ratePerInterval: 0.001,
    billingInterval: BillingInterval.PER_SECOND,
    initialBalance: 1,
    minBalance: 0.1,
    maxDuration: 3600,
  });

  // Fetch streams
  const fetchStreams = async () => {
    if (!wallet) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/streams?wallet=${wallet}`);
      const data = await res.json();
      
      if (data.success) {
        setStreams(data.streams);
      }
    } catch (error) {
      console.error('Failed to fetch streams:', error);
    } finally {
      setLoading(false);
    }
  };

  // Create stream
  const createStream = async () => {
    if (!wallet) {
      alert('Please enter a wallet address');
      return;
    }

    try {
      const res = await fetch('/api/streams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: wallet,
          config: {
            ...createForm,
            chain: 'robinhood',
          },
          initialBalance: createForm.initialBalance,
        }),
      });

      const data = await res.json();
      
      if (data.success) {
        setShowCreateForm(false);
        fetchStreams();
        alert('Stream created successfully!');
      } else {
        alert('Failed to create stream: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to create stream:', error);
      alert('Failed to create stream');
    }
  };

  // Stream actions
  const pauseStream = async (streamId: string) => {
    try {
      const res = await fetch(`/api/streams/${streamId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pause' }),
      });

      const data = await res.json();
      if (data.success) {
        fetchStreams();
      }
    } catch (error) {
      console.error('Failed to pause stream:', error);
    }
  };

  const resumeStream = async (streamId: string) => {
    try {
      const res = await fetch(`/api/streams/${streamId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resume' }),
      });

      const data = await res.json();
      if (data.success) {
        fetchStreams();
      }
    } catch (error) {
      console.error('Failed to resume stream:', error);
    }
  };

  const stopStream = async (streamId: string) => {
    try {
      const res = await fetch(`/api/streams/${streamId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete' }),
      });

      const data = await res.json();
      if (data.success) {
        fetchStreams();
      }
    } catch (error) {
      console.error('Failed to stop stream:', error);
    }
  };

  // Auto-refresh active streams
  useEffect(() => {
    if (wallet && streams.some(s => s.status === StreamStatus.ACTIVE)) {
      const interval = setInterval(fetchStreams, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [wallet, streams]);

  const getStatusColor = (status: StreamStatus) => {
    switch (status) {
      case StreamStatus.ACTIVE:
        return 'bg-ok/10 text-ok border-ok/30';
      case StreamStatus.PAUSED:
        return 'bg-warn/10 text-warn border-warn/30';
      case StreamStatus.COMPLETED:
        return 'bg-ok/10 text-ok border-ok/30';
      case StreamStatus.CANCELLED:
        return 'bg-surface-raised text-text border-line';
      case StreamStatus.INSUFFICIENT_FUNDS:
        return 'bg-err/10 text-err border-err/30';
      default:
        return 'bg-surface-raised text-text border-line';
    }
  };

  const getStatusIcon = (status: StreamStatus) => {
    switch (status) {
      case StreamStatus.ACTIVE:
        return <Activity className="w-4 h-4 animate-pulse" />;
      case StreamStatus.PAUSED:
        return <Pause className="w-4 h-4" />;
      default:
        return <Square className="w-4 h-4" />;
    }
  };

  return (
    <Page>
      <Header />
      <div className="pt-14">
        <PageHeader
          title="Payment streaming"
          description="Bill by the second instead of by the call — for model inference, compute time and anything else metered."
        />
      </div>
      <Container>
        {/* Wallet Input */}
        <div className="mb-8 flex flex-wrap gap-2">
          <Input
            type="text"
            placeholder="0x… wallet address"
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            className="flex-1 min-w-[16rem] font-mono"
          />
          <Button onClick={fetchStreams} disabled={loading}>
            {loading ? 'Loading…' : 'Load streams'}
          </Button>
          <Button variant="primary" onClick={() => setShowCreateForm(!showCreateForm)}>
            New stream
          </Button>
        </div>

        {/* Create Stream Form */}
        {showCreateForm && (
          <div className="bg-surface rounded  p-6 mb-8">
            <h2 className="text-2xl font-bold text-text mb-4">Create Payment Stream</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">Service Name</label>
                <input
                  type="text"
                  value={createForm.serviceName}
                  onChange={(e) => setCreateForm({...createForm, serviceName: e.target.value})}
                  className="w-full px-4 py-2 border border-line rounded"
                  placeholder="AI API Service"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">Rate per Interval</label>
                <input
                  type="number"
                  step="0.0001"
                  value={createForm.ratePerInterval}
                  onChange={(e) => setCreateForm({...createForm, ratePerInterval: parseFloat(e.target.value)})}
                  className="w-full px-4 py-2 border border-line rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">Billing Interval</label>
                <select
                  value={createForm.billingInterval}
                  onChange={(e) => setCreateForm({...createForm, billingInterval: e.target.value as BillingInterval})}
                  className="w-full px-4 py-2 border border-line rounded"
                >
                  <option value={BillingInterval.PER_SECOND}>Per Second</option>
                  <option value={BillingInterval.PER_MINUTE}>Per Minute</option>
                  <option value={BillingInterval.PER_HOUR}>Per Hour</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">Initial Balance (SOL)</label>
                <input
                  type="number"
                  step="0.1"
                  value={createForm.initialBalance}
                  onChange={(e) => setCreateForm({...createForm, initialBalance: parseFloat(e.target.value)})}
                  className="w-full px-4 py-2 border border-line rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">Min Balance (SOL)</label>
                <input
                  type="number"
                  step="0.01"
                  value={createForm.minBalance}
                  onChange={(e) => setCreateForm({...createForm, minBalance: parseFloat(e.target.value)})}
                  className="w-full px-4 py-2 border border-line rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">Max Duration (seconds)</label>
                <input
                  type="number"
                  value={createForm.maxDuration}
                  onChange={(e) => setCreateForm({...createForm, maxDuration: parseInt(e.target.value)})}
                  className="w-full px-4 py-2 border border-line rounded"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-text-muted mb-1">Description (optional)</label>
              <textarea
                value={createForm.description}
                onChange={(e) => setCreateForm({...createForm, description: e.target.value})}
                className="w-full px-4 py-2 border border-line rounded"
                rows={2}
                placeholder="Describe what this stream is for..."
              />
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={createStream}
                className="px-6 py-2 bg-ok text-text rounded hover:bg-green-700"
              >
                Create Stream
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-6 py-2 bg-gray-300 text-text-muted rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Streams List */}
        {streams.length > 0 ? (
          <div className="space-y-4">
            {streams.map((stream) => (
              <div
                key={stream.id}
                className="bg-surface rounded  p-6 hover: transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-text">
                      {stream.config.serviceName}
                    </h3>
                    {stream.config.description && (
                      <p className="text-sm text-text-muted mt-1">{stream.config.description}</p>
                    )}
                  </div>
                  <div className={`px-3 py-1 rounded-full border flex items-center gap-2 ${getStatusColor(stream.status)}`}>
                    {getStatusIcon(stream.status)}
                    <span className="font-medium capitalize">{stream.status}</span>
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div className="bg-accent-wash rounded p-4">
                    <div className="flex items-center gap-2 text-accent mb-1">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm font-medium">Duration</span>
                    </div>
                    <p className="text-lg font-bold text-text">
                      {formatStreamDuration(stream.totalDuration)}
                    </p>
                  </div>

                  <div className="bg-green-50 rounded p-4">
                    <div className="flex items-center gap-2 text-ok mb-1">
                      <DollarSign className="w-4 h-4" />
                      <span className="text-sm font-medium">Charged</span>
                    </div>
                    <p className="text-lg font-bold text-text">
                      {stream.totalCharged.toFixed(6)} SOL
                    </p>
                  </div>

                  <div className="bg-blue-50 rounded p-4">
                    <div className="flex items-center gap-2 text-text-faint mb-1">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-sm font-medium">Balance</span>
                    </div>
                    <p className="text-lg font-bold text-text">
                      {stream.estimatedBalance.toFixed(6)} SOL
                    </p>
                  </div>

                  <div className="bg-orange-50 rounded p-4">
                    <div className="flex items-center gap-2 text-warn mb-1">
                      <Zap className="w-4 h-4" />
                      <span className="text-sm font-medium">Rate</span>
                    </div>
                    <p className="text-lg font-bold text-text">
                      {formatStreamRate(stream.config.ratePerInterval, stream.config.billingInterval, stream.config.chain)}
                    </p>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex gap-2">
                  {stream.status === StreamStatus.ACTIVE && (
                    <>
                      <button
                        onClick={() => pauseStream(stream.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-text rounded hover:bg-yellow-600 transition-colors"
                      >
                        <Pause className="w-4 h-4" />
                        Pause
                      </button>
                      <button
                        onClick={() => stopStream(stream.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500 text-text rounded hover:bg-red-600 transition-colors"
                      >
                        <Square className="w-4 h-4" />
                        Stop
                      </button>
                    </>
                  )}
                  
                  {stream.status === StreamStatus.PAUSED && (
                    <>
                      <button
                        onClick={() => resumeStream(stream.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-500 text-text rounded hover:bg-ok transition-colors"
                      >
                        <Play className="w-4 h-4" />
                        Resume
                      </button>
                      <button
                        onClick={() => stopStream(stream.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500 text-text rounded hover:bg-red-600 transition-colors"
                      >
                        <Square className="w-4 h-4" />
                        Stop
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => setSelectedStream(selectedStream?.id === stream.id ? null : stream)}
                    className="ml-auto px-4 py-2 bg-gray-200 text-text-muted rounded hover:bg-gray-300 transition-colors"
                  >
                    {selectedStream?.id === stream.id ? 'Hide Events' : 'Show Events'}
                  </button>
                </div>

                {/* Events */}
                {selectedStream?.id === stream.id && (
                  <div className="mt-4 bg-surface-raised rounded p-4">
                    <h4 className="font-bold text-text mb-2">Stream Events</h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {stream.events.map((event, idx) => (
                        <div key={idx} className="text-sm flex items-center gap-2 text-text-muted">
                          <span className="font-medium capitalize">{event.type}</span>
                          <span className="text-text-faint">•</span>
                          <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
                          {event.amount !== undefined && (
                            <>
                              <span className="text-text-faint">•</span>
                              <span>{event.amount.toFixed(6)} SOL</span>
                            </>
                          )}
                          {event.reason && (
                            <>
                              <span className="text-text-faint">•</span>
                              <span className="italic">{event.reason}</span>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          wallet && !loading && (
            <div className="text-center py-12 bg-surface rounded ">
              <p className="text-text-muted text-lg">No streams found for this wallet</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="mt-4 px-6 py-2 bg-accent text-text rounded hover:opacity-90"
              >
                Create Your First Stream
              </button>
            </div>
          )
        )}
      </Container>
      <Footer />
    </Page>
  );
}
