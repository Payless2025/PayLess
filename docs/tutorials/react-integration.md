# React Frontend Integration Tutorial

Learn how to integrate Payless x402 payments into your React application.

## Prerequisites

- Node.js 18+ installed
- Basic knowledge of React and React Hooks
- A backend API with Payless integration

## Installation

```bash
npm install @payless/sdk @solana/wallet-adapter-react @solana/wallet-adapter-react-ui @solana/wallet-adapter-wallets @solana/web3.js
```

## Step 1: Setup Wallet Provider

Create `providers/WalletProvider.tsx`:

```typescript
import React, { FC, ReactNode, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

interface Props {
  children: ReactNode;
}

export const AppWalletProvider: FC<Props> = ({ children }) => {
  const network = WalletAdapterNetwork.Mainnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter({ network }),
    ],
    [network]
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
```

## Step 2: Wrap App with Wallet Provider

Update `App.tsx` or `main.tsx`:

```typescript
import { AppWalletProvider } from './providers/WalletProvider';

function App() {
  return (
    <AppWalletProvider>
      {/* Your app components */}
    </AppWalletProvider>
  );
}
```

## Step 3: Create Payless Hook

Create `hooks/usePayless.ts`:

```typescript
import { useWallet } from '@solana/wallet-adapter-react';
import { createClient, PaylessClient } from '@payless/sdk';
import { useEffect, useState } from 'react';

export function usePayless() {
  const { publicKey, signMessage, connected } = useWallet();
  const [client, setClient] = useState<PaylessClient | null>(null);

  useEffect(() => {
    // Initialize client
    const paylessClient = createClient({
      walletAddress: process.env.REACT_APP_RECIPIENT_ADDRESS || '',
    });

    // Connect wallet if available
    if (connected && publicKey && signMessage) {
      paylessClient.connectWallet({
        publicKey: publicKey.toString(),
        signMessage: async (message: Uint8Array) => {
          const signature = await signMessage(message);
          return signature;
        },
      });
    }

    setClient(paylessClient);
  }, [connected, publicKey, signMessage]);

  return { client, connected };
}
```

## Step 4: Create Payment Component

Create `components/PaymentButton.tsx`:

```typescript
import React, { useState } from 'react';
import { usePayless } from '../hooks/usePayless';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

interface PaymentButtonProps {
  endpoint: string;
  price: string;
  label: string;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

export const PaymentButton: React.FC<PaymentButtonProps> = ({
  endpoint,
  price,
  label,
  onSuccess,
  onError,
}) => {
  const { client, connected } = usePayless();
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    if (!connected || !client) {
      alert('Please connect your wallet first');
      return;
    }

    setLoading(true);
    try {
      const response = await client.get(endpoint);

      if (response.success) {
        onSuccess?.(response.data);
      } else {
        onError?.(response.error || 'Payment failed');
      }
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  if (!connected) {
    return <WalletMultiButton />;
  }

  return (
    <button
      onClick={handlePayment}
      disabled={loading}
      className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {loading ? 'Processing...' : `${label} (${price})`}
    </button>
  );
};
```

## Step 5: Create Content Component

Create `components/PremiumContent.tsx`:

```typescript
import React, { useState } from 'react';
import { PaymentButton } from './PaymentButton';

export const PremiumContent: React.FC = () => {
  const [content, setContent] = useState<any>(null);
  const [error, setError] = useState<string>('');

  const handleSuccess = (data: any) => {
    setContent(data);
    setError('');
  };

  const handleError = (err: string) => {
    setError(err);
    setContent(null);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Premium Content</h1>

      <div className="mb-6">
        <PaymentButton
          endpoint="/api/premium/content"
          price="$0.10"
          label="Access Premium Content"
          onSuccess={handleSuccess}
          onError={handleError}
        />
      </div>

      {error && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg mb-6">
          {error}
        </div>
      )}

      {content && (
        <div className="p-6 bg-white rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-2">{content.title}</h2>
          <p className="text-gray-600 mb-4">By {content.author}</p>
          <p className="text-gray-800">{content.content}</p>
        </div>
      )}
    </div>
  );
};
```

## Step 6: Create AI Chat Component

Create `components/AIChat.tsx`:

```typescript
import React, { useState } from 'react';
import { usePayless } from '../hooks/usePayless';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export const AIChat: React.FC = () => {
  const { client, connected } = usePayless();
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!connected || !client) {
      alert('Please connect your wallet first');
      return;
    }

    if (!message.trim()) {
      alert('Please enter a message');
      return;
    }

    setLoading(true);
    try {
      const result = await client.post('/api/ai/chat', {
        message: message,
      });

      if (result.success) {
        setResponse(result.data.response);
        setMessage('');
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      alert('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">AI Chat ($0.05 per message)</h1>

      {!connected && (
        <div className="mb-6">
          <WalletMultiButton />
        </div>
      )}

      {connected && (
        <>
          <div className="mb-4">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
              rows={4}
            />
          </div>

          <button
            onClick={handleSend}
            disabled={loading || !message.trim()}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Sending...' : 'Send ($0.05)'}
          </button>

          {response && (
            <div className="mt-6 p-6 bg-blue-50 rounded-lg">
              <h3 className="font-semibold mb-2">AI Response:</h3>
              <p className="text-gray-800">{response}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};
```

## Step 7: Create Payment History

Create `components/PaymentHistory.tsx`:

```typescript
import React, { useState, useEffect } from 'react';

interface Payment {
  id: string;
  endpoint: string;
  amount: string;
  timestamp: number;
}

export const PaymentHistory: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    // Load payment history from localStorage
    const stored = localStorage.getItem('payment_history');
    if (stored) {
      setPayments(JSON.parse(stored));
    }
  }, []);

  const addPayment = (payment: Omit<Payment, 'id' | 'timestamp'>) => {
    const newPayment: Payment = {
      ...payment,
      id: Date.now().toString(),
      timestamp: Date.now(),
    };

    const updated = [newPayment, ...payments].slice(0, 10); // Keep last 10
    setPayments(updated);
    localStorage.setItem('payment_history', JSON.stringify(updated));
  };

  if (payments.length === 0) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto p-6 mt-8">
      <h2 className="text-2xl font-bold mb-4">Recent Payments</h2>
      <div className="space-y-2">
        {payments.map((payment) => (
          <div
            key={payment.id}
            className="p-4 bg-white rounded-lg shadow flex justify-between items-center"
          >
            <div>
              <p className="font-semibold">{payment.endpoint}</p>
              <p className="text-sm text-gray-500">
                {new Date(payment.timestamp).toLocaleString()}
              </p>
            </div>
            <div className="text-lg font-bold text-purple-600">
              ${payment.amount}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

## Advanced: Custom Hook with Caching

Create `hooks/usePaylessQuery.ts`:

```typescript
import { useState, useEffect } from 'react';
import { usePayless } from './usePayless';

interface CacheEntry {
  data: any;
  timestamp: number;
}

const cache: Record<string, CacheEntry> = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function usePaylessQuery(endpoint: string, enabled = true) {
  const { client } = usePayless();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !client) return;

    // Check cache
    const cached = cache[endpoint];
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setData(cached.data);
      return;
    }

    // Fetch data
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await client.get(endpoint);

        if (response.success) {
          setData(response.data);
          cache[endpoint] = {
            data: response.data,
            timestamp: Date.now(),
          };
        } else {
          setError(response.error || 'Request failed');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Request failed');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [endpoint, enabled, client]);

  return { data, loading, error };
}
```

Usage:

```typescript
function MyComponent() {
  const { data, loading, error } = usePaylessQuery('/api/premium/content');

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (data) return <div>{JSON.stringify(data)}</div>;
  return null;
}
```

## Best Practices

1. **Always handle wallet connection states**
2. **Show loading states during payments**
3. **Display clear error messages**
4. **Cache paid content locally**
5. **Show payment confirmation**
6. **Implement retry logic**

## Resources

- [React Documentation](https://react.dev/)
- [Solana Wallet Adapter](https://github.com/solana-labs/wallet-adapter)
- [Payless SDK](../../sdk/nodejs/README.md)

## Support

Need help? [Open an issue](https://github.com/Payless2025/PayLess/issues)

