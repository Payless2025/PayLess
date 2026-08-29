'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, Play, Copy, Check, Loader2, Wallet, 
  Code2, FileJson, Terminal, Share2, Download,
  Sparkles, Database, Wrench, Crown
} from 'lucide-react';
import { useAccount, useSignMessage } from 'wagmi';
import { WalletConnectButton } from '@/components/WalletConnectButton';
import { createMockPayment, createRealPayment } from '@/lib/x402/client';
import { USDG_ADDRESS } from '@/lib/chains/config';
import { Page, Panel, Button } from '@/components/ui';

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
  const { address, isConnected: connected } = useAccount();
  const { signMessageAsync } = useSignMessage();
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

  // Demo payer used when "Use real wallet" is off
  const mockWalletAddress = '0x1111111111111111111111111111111111111111';
  // The recipient the server actually expects; loaded from /api/info so the
  // demo keeps working whatever WALLET_ADDRESS is configured.
  const [recipientAddress, setRecipientAddress] = useState(
    '0x0000000000000000000000000000000000000000'
  );
  const [tokenAddress, setTokenAddress] = useState(USDG_ADDRESS);

  useEffect(() => {
    fetch('/api/info')
      .then((res) => res.json())
      .then((info) => {
        if (info?.payment?.wallet) setRecipientAddress(info.payment.wallet);
        if (info?.payment?.tokenAddress) setTokenAddress(info.payment.tokenAddress);
      })
      .catch(() => {
        /* keep the defaults */
      });
  }, []);

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

        let payment: string;

        if (useRealWallet && connected && address) {
          try {
            payment = await createRealPayment(
              address,
              recipientAddress,
              priceAmount,
              tokenAddress,
              (message) => signMessageAsync({ message })
            );
          } catch (walletError) {
            setError(`Wallet error: ${walletError instanceof Error ? walletError.message : 'Failed'}`);
            setLoading(false);
            return;
          }
        } else {
          payment = createMockPayment(mockWalletAddress, recipientAddress, priceAmount, tokenAddress);
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
    <Page>
      {/* Top bar — thin, bordered, no glass */}
      <header className="sticky top-0 z-50 border-b border-line bg-bg/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text"
            >
              <ArrowLeft className="h-4 w-4" />
              Payless
            </Link>
            <span className="text-line-strong">/</span>
            <span className="font-mono text-sm text-text">playground</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden font-mono text-xs text-text-faint sm:inline">
              chain 4663 · USDG
            </span>
            <WalletConnectButton />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-px bg-line lg:grid-cols-[280px_1fr]">
        {/* Rail */}
        <aside className="bg-bg">
          <div className="sticky top-[57px]">
            <div className="border-b border-line px-4 py-3">
              <div className="grid grid-cols-2 gap-1">
                {Object.entries(categoryIcons).map(([cat, Icon]) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat);
                      const firstEndpoint = endpoints.find((e) => e.category === cat);
                      if (firstEndpoint) handleEndpointChange(firstEndpoint);
                    }}
                    className={`flex items-center gap-1.5 rounded px-2 py-1.5 text-xs transition-colors ${
                      selectedCategory === cat
                        ? 'bg-accent-wash text-accent'
                        : 'text-text-muted hover:text-text'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <nav className="max-h-[calc(100vh-14rem)] overflow-y-auto">
              {filteredEndpoints.map((endpoint) => {
                const active = selectedEndpoint.path === endpoint.path;
                return (
                  <button
                    key={endpoint.path}
                    onClick={() => handleEndpointChange(endpoint)}
                    className={`flex w-full items-baseline gap-2 border-l-2 px-4 py-2.5 text-left transition-colors ${
                      active
                        ? 'border-accent bg-accent-wash'
                        : 'border-transparent hover:bg-surface'
                    }`}
                  >
                    <span
                      className={`font-mono text-[10px] uppercase ${
                        active ? 'text-accent' : 'text-text-faint'
                      }`}
                    >
                      {endpoint.method}
                    </span>
                    <span
                      className={`flex-1 truncate font-mono text-xs ${
                        active ? 'text-text' : 'text-text-muted'
                      }`}
                    >
                      {endpoint.path}
                    </span>
                    <span className="font-mono text-[11px] tnum text-text-faint">
                      {endpoint.price}
                    </span>
                  </button>
                );
              })}
            </nav>

            <div className="border-t border-line px-4 py-3 text-xs">
              {connected ? (
                <label className="flex cursor-pointer items-start gap-2">
                  <input
                    type="checkbox"
                    checked={useRealWallet}
                    onChange={(e) => setUseRealWallet(e.target.checked)}
                    className="mt-0.5 h-3.5 w-3.5 accent-[color:var(--accent)]"
                  />
                  <span>
                    <span className="text-text">Sign with connected wallet</span>
                    <span className="mt-0.5 block truncate font-mono text-[11px] text-text-faint">
                      {address}
                    </span>
                  </span>
                </label>
              ) : (
                <p className="text-text-faint">
                  No wallet connected — requests use a simulated signature.
                </p>
              )}
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="bg-bg">
          {/* Endpoint header */}
          <div className="border-b border-line px-6 py-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded border border-line-strong px-1.5 py-0.5 font-mono text-[11px] uppercase text-text-muted">
                {selectedEndpoint.method}
              </span>
              <h1 className="font-mono text-lg text-text">{selectedEndpoint.path}</h1>
              <span className="font-mono text-sm tnum text-accent">
                {selectedEndpoint.price} USDG
              </span>
              <button
                onClick={sharePlayground}
                className="ml-auto text-text-faint transition-colors hover:text-text"
                title="Copy link to this endpoint"
              >
                {copied === 'share' ? (
                  <Check className="h-4 w-4 text-accent" />
                ) : (
                  <Share2 className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="mt-2 text-sm text-text-muted">{selectedEndpoint.description}</p>
          </div>

          {/* Tabs — underlined, not pills */}
          <div className="flex gap-6 border-b border-line px-6">
            {(['request', 'response', 'code'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`-mb-px border-b-2 py-3 font-mono text-xs uppercase tracking-widest transition-colors ${
                  activeTab === tab
                    ? 'border-accent text-accent'
                    : 'border-transparent text-text-faint hover:text-text-muted'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="px-6 py-6">
            {/* Request */}
            {activeTab === 'request' && (
              <div className="space-y-6">
                {selectedEndpoint.params && (
                  <div>
                    <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-text-faint">
                      Parameters
                    </h2>
                    <div className="rounded border border-line">
                      {selectedEndpoint.params.map((param, i) => (
                        <div
                          key={param.name}
                          className={`flex flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-3 ${
                            i > 0 ? 'border-t border-line' : ''
                          }`}
                        >
                          <span className="min-w-[8rem] font-mono text-sm text-accent">
                            {param.name}
                          </span>
                          <span className="font-mono text-xs text-text-faint">
                            {param.type}
                          </span>
                          <span className="text-sm text-text-muted">
                            {param.description}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedEndpoint.method === 'POST' && (
                  <div>
                    <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-text-faint">
                      Request body
                    </h2>
                    <textarea
                      value={requestBody}
                      onChange={(e) => setRequestBody(e.target.value)}
                      spellCheck={false}
                      className="h-40 w-full rounded border border-line bg-surface p-4 font-mono text-sm text-text focus:border-accent focus:outline-none"
                    />
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => makeRequest(true)} disabled={loading} variant="primary">
                    {loading && !response ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    Send with payment
                  </Button>
                  <Button onClick={() => makeRequest(false)} disabled={loading}>
                    Send without payment
                  </Button>
                </div>
                <p className="text-xs text-text-faint">
                  Without payment the endpoint answers <span className="font-mono">402</span>.
                  That is the protocol working, not an error.
                </p>
              </div>
            )}

            {/* Response */}
            {activeTab === 'response' && (
              <div className="space-y-4">
                {error && (
                  <div
                    className={`rounded border px-4 py-3 text-sm ${
                      paymentRequired
                        ? 'border-warn/30 bg-warn/10 text-warn'
                        : 'border-err/30 bg-err/10 text-err'
                    }`}
                  >
                    <span className="font-mono">{error}</span>
                  </div>
                )}

                {response ? (
                  <Panel
                    title="response"
                    aside={
                      <button
                        onClick={() =>
                          copyToClipboard(JSON.stringify(response, null, 2), 'response')
                        }
                        className="text-text-faint transition-colors hover:text-text"
                      >
                        {copied === 'response' ? (
                          <Check className="h-4 w-4 text-accent" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    }
                  >
                    <pre className="max-h-[28rem] overflow-auto p-4 font-mono text-sm leading-relaxed text-text-muted">
                      {JSON.stringify(response, null, 2)}
                    </pre>
                  </Panel>
                ) : (
                  !error && (
                    <div className="rounded border border-dashed border-line px-4 py-16 text-center font-mono text-sm text-text-faint">
                      awaiting request
                    </div>
                  )
                )}
              </div>
            )}

            {/* Code */}
            {activeTab === 'code' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-1">
                  {(['curl', 'nodejs', 'python', 'react-native'] as SdkType[]).map((sdk) => (
                    <button
                      key={sdk}
                      onClick={() => setSelectedSdk(sdk)}
                      className={`rounded px-2.5 py-1 font-mono text-xs transition-colors ${
                        selectedSdk === sdk
                          ? 'bg-accent-wash text-accent'
                          : 'text-text-faint hover:text-text'
                      }`}
                    >
                      {sdk}
                    </button>
                  ))}
                  <button
                    onClick={() => copyToClipboard(generateCode(), 'code')}
                    className="ml-auto text-text-faint transition-colors hover:text-text"
                  >
                    {copied === 'code' ? (
                      <Check className="h-4 w-4 text-accent" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>

                <pre className="overflow-x-auto rounded border border-line bg-surface p-4 font-mono text-sm leading-relaxed text-text-muted">
                  {generateCode()}
                </pre>

                <p className="text-xs text-text-faint">
                  Swap <span className="font-mono text-text-muted">YOUR_WALLET_ADDRESS</span>{' '}
                  for the address that should receive the payment.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </Page>
  );
}
