'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Activity, DollarSign, Clock, Zap } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface Stream {
  streamId: string;
  serviceId: string;
  payerAddress: string;
  recipientAddress: string;
  chain: string;
  ratePerSecond: number;
  startTime: number;
  status: string;
  totalPaid: number;
}

interface StreamStats {
  currentAmount: number;
  duration: number;
}

export default function PaymentStreamingPage() {
  const [activeStream, setActiveStream] = useState<Stream | null>(null);
  const [stats, setStats] = useState<StreamStats>({ currentAmount: 0, duration: 0 });
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update stats in real-time
  useEffect(() => {
    if (activeStream && activeStream.status === 'active') {
      intervalRef.current = setInterval(() => {
        const duration = Math.floor((Date.now() - activeStream.startTime) / 1000);
        const amount = duration * activeStream.ratePerSecond;
        setStats({ currentAmount: amount, duration });
      }, 100); // Update every 100ms for smooth animation

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
  }, [activeStream]);

  const startStream = async () => {
    if (!walletAddress) {
      alert('Please enter your wallet address');
      return;
    }

    try {
      const response = await fetch('/api/streams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: 'streaming-chat-demo',
          recipientAddress: '9aXHxhNtiAjbysGFmm4RG4hVDMtvhMMQfKpT2xQ7GLg1',
          chain: 'robinhood',
          ratePerSecond: 1_000_000, // 0.001 SOL/sec
          payerAddress: walletAddress,
          metadata: { demo: true },
        }),
      });

      const data = await response.json();
      if (data.success) {
        setActiveStream(data.stream);
        setMessages([
          { role: 'assistant', content: '👋 Stream started! Send me a message. You\'re paying 0.001 SOL per second.' }
        ]);
      }
    } catch (error) {
      console.error('Failed to start stream:', error);
      alert('Failed to start stream');
    }
  };

  const stopStream = async () => {
    if (!activeStream) return;

    try {
      const response = await fetch(`/api/streams/${activeStream.streamId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' }),
      });

      const data = await response.json();
      if (data.success) {
        setActiveStream(null);
        setMessages([
          ...messages,
          { role: 'assistant', content: `✅ Stream stopped. Total cost: ${(stats.currentAmount / 1e9).toFixed(6)} SOL for ${stats.duration} seconds.` }
        ]);
      }
    } catch (error) {
      console.error('Failed to stop stream:', error);
    }
  };

  const pauseStream = async () => {
    if (!activeStream) return;

    try {
      const response = await fetch(`/api/streams/${activeStream.streamId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pause' }),
      });

      const data = await response.json();
      if (data.success) {
        setActiveStream({ ...activeStream, status: 'paused' });
      }
    } catch (error) {
      console.error('Failed to pause stream:', error);
    }
  };

  const resumeStream = async () => {
    if (!activeStream) return;

    try {
      const response = await fetch(`/api/streams/${activeStream.streamId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resume' }),
      });

      const data = await response.json();
      if (data.success && data.result) {
        setActiveStream(data.result);
      }
    } catch (error) {
      console.error('Failed to resume stream:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !activeStream) return;

    setLoading(true);
    setMessages([...messages, { role: 'user', content: inputMessage }]);
    setInputMessage('');

    try {
      const response = await fetch('/api/demo/streaming-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Wallet-Address': walletAddress,
        },
        body: JSON.stringify({ message: inputMessage }),
      });

      const data = await response.json();
      if (data.success) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatSOL = (lamports: number) => (lamports / 1e9).toFixed(6);

  return (
    <div className="min-h-screen bg-bg">
      <Header />
      <div className="pt-14">
      {/* Header */}
      <header className="border-b border-line bg-surface">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="w-8 h-8 text-accent" />
            <div>
              <h1 className="text-2xl font-bold text-text">Payment Streaming</h1>
              <p className="text-sm text-text-muted">Pay-per-second for real-time services</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Chat Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Wallet Input */}
            {!activeStream && (
              <div className="bg-surface border border-line rounded p-6">
                <h2 className="text-lg font-bold text-text mb-4">Start a Payment Stream</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-muted mb-2">
                      Your Wallet Address (Robinhood Chain)
                    </label>
                    <input
                      type="text"
                      value={walletAddress}
                      onChange={(e) => setWalletAddress(e.target.value)}
                      placeholder="9aXHxhNtiAjbysGFmm4RG4hVDMtvhMMQfKpT2xQ7GLg1"
                      className="w-full px-4 py-3 border border-line rounded focus:outline-none focus:ring-2 focus:ring-purple-600"
                    />
                  </div>
                  <button
                    onClick={startStream}
                    className="w-full bg-accent text-text px-6 py-3 rounded font-semibold hover:opacity-90 transition-colors flex items-center justify-center gap-2"
                  >
                    <Play className="w-5 h-5" />
                    Start Stream (0.001 SOL/sec)
                  </button>
                </div>
              </div>
            )}

            {/* Chat Interface */}
            {activeStream && (
              <>
                <div className="bg-surface border border-line rounded p-6 min-h-[400px] max-h-[500px] overflow-y-auto">
                  <div className="space-y-4">
                    {messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] px-4 py-3 rounded ${
                            msg.role === 'user'
                              ? 'bg-accent text-text'
                              : 'bg-surface-raised text-text'
                          }`}
                        >
                          {msg.content}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Message Input */}
                <div className="bg-surface border border-line rounded p-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      placeholder="Type a message..."
                      disabled={loading || activeStream.status !== 'active'}
                      className="flex-1 px-4 py-2 border border-line rounded focus:outline-none focus:ring-2 focus:ring-purple-600 disabled:bg-surface-raised"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={loading || activeStream.status !== 'active'}
                      className="bg-accent text-text px-6 py-2 rounded font-semibold hover:opacity-90 transition-colors disabled:bg-gray-400"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Stream Stats Sidebar */}
          <div className="space-y-6">
            {activeStream && (
              <>
                {/* Real-time Stats */}
                <div className="rounded border border-accent/30 bg-accent-wash p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Activity className="w-5 h-5" />
                    <h3 className="font-bold">Stream Active</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm opacity-90 mb-1">Total Cost</div>
                      <div className="text-3xl font-bold">
                        {formatSOL(stats.currentAmount)} SOL
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm opacity-90 mb-1">Duration</div>
                      <div className="text-2xl font-bold">{stats.duration}s</div>
                    </div>

                    <div>
                      <div className="text-sm opacity-90 mb-1">Rate</div>
                      <div className="text-lg font-semibold">0.001 SOL/sec</div>
                    </div>
                  </div>
                </div>

                {/* Stream Controls */}
                <div className="bg-surface border border-line rounded p-6">
                  <h3 className="font-bold text-text mb-4">Controls</h3>
                  <div className="space-y-2">
                    {activeStream.status === 'active' && (
                      <button
                        onClick={pauseStream}
                        className="w-full bg-yellow-500 text-text px-4 py-2 rounded font-semibold hover:bg-yellow-600 transition-colors flex items-center justify-center gap-2"
                      >
                        <Pause className="w-4 h-4" />
                        Pause Stream
                      </button>
                    )}
                    
                    {activeStream.status === 'paused' && (
                      <button
                        onClick={resumeStream}
                        className="w-full bg-green-500 text-text px-4 py-2 rounded font-semibold hover:bg-ok transition-colors flex items-center justify-center gap-2"
                      >
                        <Play className="w-4 h-4" />
                        Resume Stream
                      </button>
                    )}
                    
                    <button
                      onClick={stopStream}
                      className="w-full bg-red-500 text-text px-4 py-2 rounded font-semibold hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <Square className="w-4 h-4" />
                      Stop Stream
                    </button>
                  </div>
                </div>

                {/* Stream Info */}
                <div className="bg-surface border border-line rounded p-6">
                  <h3 className="font-bold text-text mb-4">Stream Info</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-text-muted">ID:</span>
                      <div className="font-mono text-xs mt-1 break-all">{activeStream.streamId}</div>
                    </div>
                    <div>
                      <span className="text-text-muted">Status:</span>
                      <span className={`ml-2 font-semibold ${
                        activeStream.status === 'active' ? 'text-ok' :
                        activeStream.status === 'paused' ? 'text-yellow-600' :
                        'text-text-muted'
                      }`}>
                        {activeStream.status.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-muted">Chain:</span>
                      <span className="ml-2 font-semibold">{activeStream.chain.toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Info Card */}
            <div className="bg-blue-50 border border-blue-200 rounded p-6">
              <h3 className="font-mono text-xs uppercase tracking-widest text-text-faint mb-3">How it works</h3>
              <ul className="text-sm text-blue-800 space-y-2">
                <li>• Pay per second of usage</li>
                <li>• Start/pause/stop anytime</li>
                <li>• Real-time cost tracking</li>
                <li>• Perfect for AI APIs, compute, streaming</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      </div>
      <Footer />
    </div>
  );
}

