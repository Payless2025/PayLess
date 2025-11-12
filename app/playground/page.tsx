'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, Play, Copy, Check, Loader2, Wallet, 
  Code2, FileJson, Terminal, Share2, Download,
  Sparkles, Database, Wrench, Crown
} from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { createMockPayment, createRealPayment } from '@/lib/x402/client';

interface ApiEndpoint {
  path: string;
  method: string;
  price: string;
  description: string;
  category: 'AI' | 'Data' | 'Tools' | 'Premium';
  params?: { name: string; type: string; description: string }[];
  bodyExample?: any;
}

const endpoints: ApiEndpoint[] = [
  {
    path: '/api/ai/chat',
    method: 'POST',
    price: '$0.05',
    category: 'AI',
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
    category: 'AI',
    description: 'AI Image Generation - Create images from text',
    params: [
      { name: 'prompt', type: 'string', description: 'Image description' },
      { name: 'size', type: 'string', description: 'Image size (optional)' },
    ],
    bodyExample: { prompt: 'A futuristic payment terminal', size: '1024x1024' },
  },
  {
    path: '/api/ai/translate',
    method: 'POST',
    price: '$0.03',
    category: 'AI',
    description: 'Language Translation - Translate text between languages',
    params: [
      { name: 'text', type: 'string', description: 'Text to translate' },
      { name: 'targetLanguage', type: 'string', description: 'Target language code' },
    ],
    bodyExample: { text: 'Hello, how are you?', targetLanguage: 'es' },
  },
  {
    path: '/api/ai/tts',
    method: 'POST',
    price: '$0.08',
    category: 'AI',
    description: 'Text-to-Speech - Convert text to audio',
    params: [
      { name: 'text', type: 'string', description: 'Text to convert to speech' },
      { name: 'voice', type: 'string', description: 'Voice type' },
    ],
    bodyExample: { text: 'Welcome to Payless', voice: 'female' },
  },
  {
    path: '/api/data/weather',
    method: 'GET',
    price: '$0.01',
    category: 'Data',
    description: 'Weather Data - Get current weather information',
    params: [{ name: 'city', type: 'string', description: 'City name' }],
  },
  {
    path: '/api/data/stock',
    method: 'GET',
    price: '$0.02',
    category: 'Data',
    description: 'Stock Market Data - Get real-time stock quotes',
    params: [{ name: 'symbol', type: 'string', description: 'Stock symbol' }],
  },
  {
    path: '/api/data/crypto',
    method: 'GET',
    price: '$0.015',
    category: 'Data',
    description: 'Cryptocurrency Prices - Get real-time crypto data',
    params: [{ name: 'symbol', type: 'string', description: 'Crypto symbol' }],
  },
  {
    path: '/api/data/news',
    method: 'GET',
    price: '$0.025',
    category: 'Data',
    description: 'News Aggregation - Get latest news articles',
    params: [{ name: 'category', type: 'string', description: 'News category' }],
  },
  {
    path: '/api/tools/qrcode',
    method: 'POST',
    price: '$0.005',
    category: 'Tools',
    description: 'QR Code Generator - Create QR codes',
    params: [{ name: 'data', type: 'string', description: 'Data to encode' }],
    bodyExample: { data: 'https://payless.example.com', size: '256' },
  },
  {
    path: '/api/premium/content',
    method: 'GET',
    price: '$1.00',
    category: 'Premium',
    description: 'Premium Content - Access exclusive articles',
    params: [{ name: 'id', type: 'string', description: 'Content ID' }],
  },
];

type TabType = 'request' | 'response' | 'code';
type SdkType = 'curl' | 'nodejs' | 'python' | 'react-native';

const categoryIcons = {
  AI: Sparkles,
  Data: Database,
  Tools: Wrench,
  Premium: Crown,
};

export default function Playground() {
  const { publicKey, signMessage, connected } = useWallet();
  const [selectedCategory, setSelectedCategory] = useState<string>('AI');
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint>(endpoints[0]);
  const [activeTab, setActiveTab] = useState<TabType>('request');
  const [selectedSdk, setSelectedSdk] = useState<SdkType>('curl');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentRequired, setPaymentRequired] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [requestBody, setRequestBody] = useState(JSON.stringify(endpoints[0].bodyExample || {}, null, 2));
  const [useRealWallet, setUseRealWallet] = useState(false);

  const mockWalletAddress = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';
  const mockRecipientAddress = '8ahe4N7mFaLyQ7powRGWxZ3cnqbteF3yAeioMpM4ocMX';

  const filteredEndpoints = endpoints.filter(e => e.category === selectedCategory);

  const handleEndpointChange = (endpoint: ApiEndpoint) => {
    setSelectedEndpoint(endpoint);
    setRequestBody(JSON.stringify(endpoint.bodyExample || {}, null, 2));
    setResponse(null);
    setError(null);
    setPaymentRequired(false);
    setActiveTab('request');
  };

  const makeRequest = async (withPayment: boolean = false) => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const url = selectedEndpoint.path;
      const options: RequestInit = {
        method: selectedEndpoint.method,
        headers: { 'Content-Type': 'application/json' },
      };

      if (withPayment) {
        const priceAmount = selectedEndpoint.price.replace('$', '');
        const usdcMint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
        
        let payment: string;
        
        if (useRealWallet && connected && publicKey && signMessage) {
          try {
            payment = await createRealPayment(
              publicKey.toString(),
              mockRecipientAddress,
              priceAmount,
              usdcMint,
              signMessage
            );
          } catch (walletError) {
            setError(`Wallet error: ${walletError instanceof Error ? walletError.message : 'Failed'}`);
            setLoading(false);
            return;
          }
        } else {
          payment = createMockPayment(mockWalletAddress, mockRecipientAddress, priceAmount, usdcMint);
        }
        
        options.headers = { ...options.headers, 'X-Payment': payment };
      }

      if (selectedEndpoint.method === 'POST' && requestBody.trim()) {
        options.body = requestBody;
      }

      const res = await fetch(url, options);
      const data = await res.json();

      if (res.status === 402) {
        setPaymentRequired(true);
        setError('Payment required! Click "Try with Payment" to complete.');
        setResponse(data);
      } else if (!res.ok) {
        setError(data.error || 'Request failed');
        setResponse(data);
      } else {
        setResponse(data);
        setPaymentRequired(false);
        setActiveTab('response');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const generateCode = (): string => {
    const endpoint = selectedEndpoint.path;
    const method = selectedEndpoint.method;
    const body = requestBody;

    switch (selectedSdk) {
      case 'curl':
        return `curl -X ${method} '${endpoint}' \\
  -H 'Content-Type: application/json' \\
  -H 'X-Payment: <base64_payment_proof>'${method === 'POST' ? ` \\
  -d '${body}'` : ''}`;

      case 'nodejs':
        return `import { createClient } from '@payless/sdk';

const client = createClient({
  walletAddress: 'YOUR_WALLET_ADDRESS',
});

const response = await client.${method.toLowerCase()}('${endpoint}'${method === 'POST' ? `,
  ${body},
  { paymentAmount: '${selectedEndpoint.price.replace('$', '')}' }` : ''});

console.log(response.data);`;

      case 'python':
        return `from payless import create_client

client = create_client({
    'wallet_address': 'YOUR_WALLET_ADDRESS'
})

response = client.${method.toLowerCase()}('${endpoint}'${method === 'POST' ? `,
    ${body.replace(/"/g, "'")}` : ''})

print(response['data'])`;

      case 'react-native':
        return `import { usePayless, PaymentButton } from '@payless/react-native';

function MyComponent() {
  const { client } = usePayless({
    walletAddress: 'YOUR_WALLET_ADDRESS',
  });

  return (
    <PaymentButton
      client={client}
      endpoint="${endpoint}"
      amount="${selectedEndpoint.price.replace('$', '')}"
      onSuccess={(data) => console.log(data)}
    />
  );
}`;

      default:
        return '';
    }
  };

  const sharePlayground = () => {
    const state = btoa(JSON.stringify({
      endpoint: selectedEndpoint.path,
      body: requestBody,
    }));
    const url = `${window.location.origin}/playground?state=${state}`;
    copyToClipboard(url, 'share');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-slate-900/50 backdrop-blur-md border-b border-white/10 relative z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-white hover:text-purple-400 transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Home</span>
            </Link>
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-white">API Playground</h1>
              <div className="wallet-adapter-button-wrapper">
                <WalletMultiButton />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 sticky top-4">
              {/* Categories */}
              <h2 className="text-xl font-semibold text-white mb-4">Categories</h2>
              <div className="grid grid-cols-2 gap-2 mb-6">
                {Object.entries(categoryIcons).map(([cat, Icon]) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat);
                      const firstEndpoint = endpoints.find(e => e.category === cat);
                      if (firstEndpoint) handleEndpointChange(firstEndpoint);
                    }}
                    className={`flex items-center gap-2 p-3 rounded-lg transition-all ${
                      selectedCategory === cat
                        ? 'bg-purple-600 text-white'
                        : 'bg-white/5 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{cat}</span>
                  </button>
                ))}
              </div>

              {/* Endpoints */}
              <h3 className="text-lg font-semibold text-white mb-3">Endpoints</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredEndpoints.map((endpoint) => (
                  <button
                    key={endpoint.path}
                    onClick={() => handleEndpointChange(endpoint)}
                    className={`w-full text-left p-3 rounded-lg transition-all ${
                      selectedEndpoint.path === endpoint.path
                        ? 'bg-purple-600 text-white'
                        : 'bg-white/5 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono">{endpoint.method}</span>
                      <span className="text-xs font-semibold">{endpoint.price}</span>
                    </div>
                    <div className="text-sm font-medium truncate">{endpoint.path}</div>
                  </button>
                ))}
              </div>

              {/* Wallet Status */}
              <div className="mt-6 space-y-3">
                {connected && (
                  <div className="p-3 rounded-lg bg-green-500/20 border border-green-500/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Wallet className="w-4 h-4 text-green-400" />
                      <p className="text-sm font-semibold text-green-200">Connected</p>
                    </div>
                    <p className="text-xs text-green-300 font-mono truncate">
                      {publicKey?.toString()}
                    </p>
                    <label className="flex items-center gap-2 mt-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useRealWallet}
                        onChange={(e) => setUseRealWallet(e.target.checked)}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-xs text-green-200">Use real wallet</span>
                    </label>
                  </div>
                )}
                
                <div className="p-3 rounded-lg bg-yellow-500/20 border border-yellow-500/30">
                  <p className="text-xs text-yellow-200">
                    <strong>Demo Mode:</strong> {useRealWallet && connected 
                      ? 'Real wallet enabled' 
                      : 'Simulated payments'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tabs */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <div className="flex items-center justify-between mb-6">
                <div className="flex gap-2">
                  {(['request', 'response', 'code'] as TabType[]).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-2 rounded-lg transition-all capitalize ${
                        activeTab === tab
                          ? 'bg-purple-600 text-white'
                          : 'bg-white/5 text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      {tab === 'request' && <Terminal className="w-4 h-4 inline mr-2" />}
                      {tab === 'response' && <FileJson className="w-4 h-4 inline mr-2" />}
                      {tab === 'code' && <Code2 className="w-4 h-4 inline mr-2" />}
                      {tab}
                    </button>
                  ))}
                </div>
                <button
                  onClick={sharePlayground}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                  title="Share Playground"
                >
                  {copied === 'share' ? (
                    <Check className="w-5 h-5 text-green-400" />
                  ) : (
                    <Share2 className="w-5 h-5 text-gray-400" />
                  )}
                </button>
              </div>

              {/* Request Tab */}
              {activeTab === 'request' && (
                <div>
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

                  {selectedEndpoint.method === 'POST' && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-white mb-3">Request Body</h3>
                      <textarea
                        value={requestBody}
                        onChange={(e) => setRequestBody(e.target.value)}
                        className="w-full h-32 p-4 rounded-lg bg-slate-900 text-gray-300 font-mono text-sm border border-white/10 focus:border-purple-500 focus:outline-none"
                      />
                    </div>
                  )}

                  <div className="flex gap-4">
                    <button
                      onClick={() => makeRequest(false)}
                      disabled={loading}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-semibold transition-all disabled:opacity-50"
                    >
                      {loading && !paymentRequired ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                      Try Without Payment
                    </button>
                    <button
                      onClick={() => makeRequest(true)}
                      disabled={loading}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50"
                    >
                      {loading && !response ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                      Try with Payment
                    </button>
                  </div>
                </div>
              )}

              {/* Response Tab */}
              {activeTab === 'response' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Response</h3>
                    {response && (
                      <button
                        onClick={() => copyToClipboard(JSON.stringify(response, null, 2), 'response')}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        {copied === 'response' ? (
                          <Check className="w-5 h-5 text-green-400" />
                        ) : (
                          <Copy className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                    )}
                  </div>

                  {error && (
                    <div className={`mb-4 p-4 rounded-lg ${paymentRequired ? 'bg-yellow-500/20 border border-yellow-500/30' : 'bg-red-500/20 border border-red-500/30'}`}>
                      <p className={`text-sm ${paymentRequired ? 'text-yellow-200' : 'text-red-200'}`}>{error}</p>
                    </div>
                  )}

                  {response ? (
                    <pre className="p-4 rounded-lg bg-slate-900 text-gray-300 font-mono text-sm overflow-x-auto max-h-96">
                      {JSON.stringify(response, null, 2)}
                    </pre>
                  ) : (
                    <div className="p-12 text-center text-gray-400">
                      <FileJson className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p>No response yet. Make a request to see results.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Code Tab */}
              {activeTab === 'code' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex gap-2">
                      {(['curl', 'nodejs', 'python', 'react-native'] as SdkType[]).map((sdk) => (
                        <button
                          key={sdk}
                          onClick={() => setSelectedSdk(sdk)}
                          className={`px-3 py-1 rounded-lg text-sm transition-all ${
                            selectedSdk === sdk
                              ? 'bg-purple-600 text-white'
                              : 'bg-white/5 text-gray-300 hover:bg-white/10'
                          }`}
                        >
                          {sdk === 'curl' ? 'cURL' : sdk === 'nodejs' ? 'Node.js' : sdk === 'python' ? 'Python' : 'React Native'}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => copyToClipboard(generateCode(), 'code')}
                      className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      {copied === 'code' ? (
                        <Check className="w-5 h-5 text-green-400" />
                      ) : (
                        <Copy className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                  </div>

                  <pre className="p-4 rounded-lg bg-slate-900 text-gray-300 font-mono text-sm overflow-x-auto">
                    {generateCode()}
                  </pre>

                  <div className="mt-4 p-4 rounded-lg bg-blue-500/20 border border-blue-500/30">
                    <p className="text-sm text-blue-200">
                      💡 <strong>Tip:</strong> Replace YOUR_WALLET_ADDRESS with your actual wallet address to receive payments.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
