'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Play, Copy, Check, Loader2 } from 'lucide-react';
import { createMockPayment } from '@/lib/x402/client';

interface ApiEndpoint {
  path: string;
  method: string;
  price: string;
  description: string;
  params?: { name: string; type: string; description: string }[];
  bodyExample?: any;
}

const endpoints: ApiEndpoint[] = [
  {
    path: '/api/ai/chat',
    method: 'POST',
    price: '$0.05',
    description: 'AI Chat Completion - Get AI-powered responses',
    params: [
      { name: 'message', type: 'string', description: 'Your message to the AI' },
      { name: 'model', type: 'string', description: 'AI model (optional)' },
    ],
    bodyExample: { message: 'Hello, tell me about x402 protocol', model: 'gpt-4' },
  },
  {
    path: '/api/ai/image',
    method: 'POST',
    price: '$0.10',
    description: 'AI Image Generation - Create images from text',
    params: [
      { name: 'prompt', type: 'string', description: 'Image description' },
      { name: 'size', type: 'string', description: 'Image size (optional)' },
    ],
    bodyExample: { prompt: 'A futuristic payment terminal', size: '1024x1024' },
  },
  {
    path: '/api/data/weather',
    method: 'GET',
    price: '$0.01',
    description: 'Weather Data - Get current weather information',
    params: [
      { name: 'city', type: 'string', description: 'City name (query param)' },
    ],
  },
  {
    path: '/api/data/stock',
    method: 'GET',
    price: '$0.02',
    description: 'Stock Market Data - Get real-time stock quotes',
    params: [
      { name: 'symbol', type: 'string', description: 'Stock symbol (query param)' },
    ],
  },
  {
    path: '/api/premium/content',
    method: 'GET',
    price: '$1.00',
    description: 'Premium Content - Access exclusive articles',
    params: [
      { name: 'id', type: 'string', description: 'Content ID (query param)' },
    ],
  },
];

export default function Playground() {
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint>(endpoints[0]);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentRequired, setPaymentRequired] = useState(false);
  const [copied, setCopied] = useState(false);
  const [requestBody, setRequestBody] = useState(JSON.stringify(endpoints[0].bodyExample || {}, null, 2));

  const mockWalletAddress = 'ExampleWallet1111111111111111111111111111';
  const mockRecipientAddress = '8ahe4N7mFaLyQ7powRGWxZ3cnqbteF3yAeioMpM4ocMX'; // Payless wallet

  const handleEndpointChange = (endpoint: ApiEndpoint) => {
    setSelectedEndpoint(endpoint);
    setRequestBody(JSON.stringify(endpoint.bodyExample || {}, null, 2));
    setResponse(null);
    setError(null);
    setPaymentRequired(false);
  };

  const makeRequest = async (withPayment: boolean = false) => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const url = selectedEndpoint.path;
      const options: RequestInit = {
        method: selectedEndpoint.method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      // Add payment header if requested
      if (withPayment) {
        const priceAmount = selectedEndpoint.price.replace('$', '');
        const usdcMint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // Solana USDC
        const payment = createMockPayment(mockWalletAddress, mockRecipientAddress, priceAmount, usdcMint);
        options.headers = {
          ...options.headers,
          'X-Payment': payment,
        };
      }

      // Add body for POST requests
      if (selectedEndpoint.method === 'POST' && requestBody.trim()) {
        options.body = requestBody;
      }

      const res = await fetch(url, options);
      const data = await res.json();

      if (res.status === 402) {
        setPaymentRequired(true);
        setError('Payment required! Click "Try with Payment" to complete the request.');
        setResponse(data);
      } else if (!res.ok) {
        setError(data.error || 'Request failed');
        setResponse(data);
      } else {
        setResponse(data);
        setPaymentRequired(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  const copyResponse = () => {
    if (response) {
      navigator.clipboard.writeText(JSON.stringify(response, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-slate-900/50 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 text-white hover:text-purple-400 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Home</span>
            </Link>
            <h1 className="text-2xl font-bold text-white">API Playground</h1>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar - Endpoints */}
          <div className="lg:col-span-1">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <h2 className="text-xl font-semibold text-white mb-4">Endpoints</h2>
              <div className="space-y-2">
                {endpoints.map((endpoint) => (
                  <button
                    key={endpoint.path}
                    onClick={() => handleEndpointChange(endpoint)}
                    className={`w-full text-left p-4 rounded-lg transition-all ${
                      selectedEndpoint.path === endpoint.path
                        ? 'bg-purple-600 text-white'
                        : 'bg-white/5 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-mono">{endpoint.method}</span>
                      <span className="text-sm font-semibold">{endpoint.price}</span>
                    </div>
                    <div className="text-sm font-medium">{endpoint.path}</div>
                  </button>
                ))}
              </div>

              {/* Demo Mode Notice */}
              <div className="mt-6 p-4 rounded-lg bg-yellow-500/20 border border-yellow-500/30">
                <p className="text-sm text-yellow-200">
                  <strong>Demo Mode:</strong> Payments are simulated for testing. No real crypto is required.
                </p>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Endpoint Details */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <h2 className="text-2xl font-bold text-white mb-2">{selectedEndpoint.path}</h2>
              <p className="text-gray-300 mb-4">{selectedEndpoint.description}</p>
              
              <div className="flex items-center gap-4 mb-6">
                <span className="px-3 py-1 rounded-lg bg-purple-600 text-white text-sm font-semibold">
                  {selectedEndpoint.method}
                </span>
                <span className="px-3 py-1 rounded-lg bg-green-600 text-white text-sm font-semibold">
                  {selectedEndpoint.price} USDC
                </span>
              </div>

              {/* Parameters */}
              {selectedEndpoint.params && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Parameters</h3>
                  <div className="space-y-2">
                    {selectedEndpoint.params.map((param) => (
                      <div key={param.name} className="p-3 rounded-lg bg-white/5">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-purple-400">{param.name}</span>
                          <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-gray-300">
                            {param.type}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400">{param.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Request Body */}
              {selectedEndpoint.method === 'POST' && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Request Body</h3>
                  <textarea
                    value={requestBody}
                    onChange={(e) => setRequestBody(e.target.value)}
                    className="w-full h-32 p-4 rounded-lg bg-slate-900 text-gray-300 font-mono text-sm border border-white/10 focus:border-purple-500 focus:outline-none"
                    placeholder="Enter JSON request body"
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={() => makeRequest(false)}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading && !paymentRequired ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Play className="w-5 h-5" />
                  )}
                  Try Without Payment
                </button>
                <button
                  onClick={() => makeRequest(true)}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading && !response ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Play className="w-5 h-5" />
                  )}
                  Try with Payment
                </button>
              </div>
            </div>

            {/* Response */}
            {(response || error) && (
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Response</h3>
                  <button
                    onClick={copyResponse}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    {copied ? (
                      <Check className="w-5 h-5 text-green-400" />
                    ) : (
                      <Copy className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                </div>

                {error && (
                  <div className={`mb-4 p-4 rounded-lg ${paymentRequired ? 'bg-yellow-500/20 border border-yellow-500/30' : 'bg-red-500/20 border border-red-500/30'}`}>
                    <p className={`text-sm ${paymentRequired ? 'text-yellow-200' : 'text-red-200'}`}>
                      {error}
                    </p>
                  </div>
                )}

                {response && (
                  <pre className="p-4 rounded-lg bg-slate-900 text-gray-300 font-mono text-sm overflow-x-auto">
                    {JSON.stringify(response, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

