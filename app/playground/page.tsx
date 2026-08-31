'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, Play, Copy, Check, Loader2, Wallet, 
  Code2, FileJson, Terminal, Share2, Download,
  Sparkles, Database, Wrench, Crown
} from 'lucide-react';
import { useAccount, useNetwork, useWalletClient, usePublicClient } from 'wagmi';
import { parseUnits } from 'viem';
import { WalletConnectButton } from '@/components/WalletConnectButton';
import { USDG_ADDRESS, ROBINHOOD_CHAIN_ID } from '@/lib/chains/config';

const ERC20_TRANSFER_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

const EXPECTED_CHAIN = Number(ROBINHOOD_CHAIN_ID);

type PayStep = null | 'challenge' | 'transfer' | 'confirm' | 'call';
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
  const { chain } = useNetwork();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const onRightChain = chain?.id === EXPECTED_CHAIN;
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
  const [payStep, setPayStep] = useState<PayStep>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  // Loaded from /api/info so the playground always pays whatever the server
  // actually expects.
  const [recipientAddress, setRecipientAddress] = useState('');
  const [tokenAddress, setTokenAddress] = useState(USDG_ADDRESS);
  const [tokenDecimals, setTokenDecimals] = useState(6);

  useEffect(() => {
    fetch('/api/info')
      .then((res) => res.json())
      .then((info) => {
        if (info?.payment?.wallet) setRecipientAddress(info.payment.wallet);
        if (info?.payment?.tokenAddress) setTokenAddress(info.payment.tokenAddress);
        if (typeof info?.payment?.tokenDecimals === 'number')
          setTokenDecimals(info.payment.tokenDecimals);
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

  /**
   * Runs the real x402 handshake:
   *   1. call with no payment  -> read the 402 challenge
   *   2. send the USDG transfer on Robinhood Chain
   *   3. wait for the receipt
   *   4. call again with the transaction hash
   *
   * Nothing is simulated. Without a connected wallet we stop after step 1 and
   * show the challenge, rather than sending a payment that cannot settle.
   */
  const makeRequest = async (withPayment: boolean = false) => {
    setLoading(true);
    setError(null);
    setResponse(null);
    setPaymentRequired(false);
    setTxHash(null);

    const url = selectedEndpoint.path;
    const baseOptions: RequestInit = {
      method: selectedEndpoint.method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (selectedEndpoint.method === 'POST' && requestBody.trim()) {
      baseOptions.body = requestBody;
    }

    try {
      // Step 1 — always ask first. This is the part of the protocol worth seeing.
      setPayStep(withPayment ? 'challenge' : null);
      const first = await fetch(url, baseOptions);
      const firstData = await first.json();

      if (first.status !== 402) {
        setResponse(firstData);
        if (!first.ok) setError(firstData.error || 'Request failed');
        return;
      }

      setPaymentRequired(true);

      if (!withPayment) {
        setResponse(firstData);
        setError('402 Payment Required — this is the protocol working, not an error.');
        setActiveTab('response');
        return;
      }

      // Step 2 — pay for real, or explain why we cannot
      if (!connected || !address || !walletClient) {
        setResponse(firstData);
        setError('Connect a wallet to pay this 402. Nothing is simulated here.');
        setActiveTab('response');
        return;
      }
      if (!onRightChain) {
        setResponse(firstData);
        setError(`Wrong network. Switch to Robinhood Chain (${EXPECTED_CHAIN}) to pay.`);
        setActiveTab('response');
        return;
      }

      const pay = firstData?.payment || {};
      const to = (pay.recipient || recipientAddress) as `0x${string}`;
      const token = (pay.tokenAddress || tokenAddress) as `0x${string}`;
      const amount = String(pay.amount ?? selectedEndpoint.price.replace('$', ''));

      if (!to || !/^0x[0-9a-fA-F]{40}$/.test(to)) {
        setError('The server did not advertise a recipient address, so it cannot be paid.');
        setResponse(firstData);
        setActiveTab('response');
        return;
      }

      setPayStep('transfer');
      const hash = await walletClient.writeContract({
        address: token,
        abi: ERC20_TRANSFER_ABI,
        functionName: 'transfer',
        args: [to, parseUnits(amount as `${number}`, tokenDecimals)],
        account: address,
        chain: undefined,
      });
      setTxHash(hash);

      // Step 3 — the server will not accept an unmined transfer
      setPayStep('confirm');
      await publicClient.waitForTransactionReceipt({ hash });

      // Step 4 — retry with proof of payment
      setPayStep('call');
      const paid = await fetch(url, {
        ...baseOptions,
        headers: {
          ...baseOptions.headers,
          'X-Payment': JSON.stringify({
            from: address,
            to,
            amount,
            token: pay.currency || 'USDG',
            tokenAddress: token,
            chainId: String(EXPECTED_CHAIN),
            transactionHash: hash,
            nonce: hash,
            signature: '',
            timestamp: Date.now(),
            message: '',
          }),
        },
      });
      const paidData = await paid.json();
      setResponse(paidData);
      setActiveTab('response');

      if (paid.ok) {
        setPaymentRequired(false);
        setError(null);
      } else {
        setError(paidData.error || 'Payment was rejected');
      }
    } catch (err: any) {
      const msg = err?.shortMessage || err?.message || 'Request failed';
      setError(
        /user rejected|denied/i.test(msg) ? 'Payment cancelled in the wallet.' : msg
      );
      setActiveTab('response');
    } finally {
      setLoading(false);
      setPayStep(null);
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

            <div className="space-y-3 border-t border-line px-4 py-3 text-xs">
              {connected ? (
                onRightChain ? (
                  <div>
                    <div className="text-text">Paying from</div>
                    <div className="mt-0.5 truncate font-mono text-[11px] text-text-faint">
                      {address}
                    </div>
                  </div>
                ) : (
                  <p className="text-warn">
                    Wrong network — switch to Robinhood Chain ({EXPECTED_CHAIN}) to pay.
                  </p>
                )
              ) : (
                <p className="text-text-faint">
                  No wallet connected. You can still send the request and read the 402
                  challenge — paying it needs a wallet.
                </p>
              )}

              <p className="text-text-faint">
                Payments here are real: sending one transfers USDG on Robinhood Chain.
              </p>
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

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    onClick={() => makeRequest(true)}
                    disabled={loading || !connected || !onRightChain}
                    variant="primary"
                    title={
                      !connected
                        ? 'Connect a wallet to pay'
                        : !onRightChain
                        ? `Switch to Robinhood Chain (${EXPECTED_CHAIN})`
                        : `Transfers ${selectedEndpoint.price} USDG on Robinhood Chain`
                    }
                  >
                    {payStep ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    {payStep === 'challenge'
                      ? 'Reading 402…'
                      : payStep === 'transfer'
                      ? 'Confirm in wallet…'
                      : payStep === 'confirm'
                      ? 'Waiting for the block…'
                      : payStep === 'call'
                      ? 'Calling with receipt…'
                      : `Pay ${selectedEndpoint.price} and call`}
                  </Button>
                  <Button onClick={() => makeRequest(false)} disabled={loading}>
                    Send without paying
                  </Button>
                </div>

                {txHash && (
                  <p className="font-mono text-xs text-text-faint">
                    tx{' '}
                    <a
                      href={`https://robinhoodchain.blockscout.com/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:underline"
                    >
                      {txHash.slice(0, 10)}…{txHash.slice(-8)}
                    </a>
                  </p>
                )}

                <p className="text-xs text-text-faint">
                  Without paying, the endpoint answers <span className="font-mono">402</span> —
                  that is the protocol working, not an error. Paying moves real USDG on
                  Robinhood Chain; nothing here is simulated.
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
