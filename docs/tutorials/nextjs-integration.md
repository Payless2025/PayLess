# Next.js Integration Tutorial

Learn how to integrate Payless x402 payments into your Next.js application in minutes.

## Prerequisites

- Node.js 18+ installed
- A Solana wallet address for receiving payments
- Basic knowledge of Next.js App Router

## Installation

```bash
npm install @payless/sdk @solana/web3.js bs58 tweetnacl
```

## Step 1: Set Up Configuration

Create a `.env.local` file in your project root:

```env
# Your Solana wallet address to receive payments
WALLET_ADDRESS=YOUR_WALLET_ADDRESS_HERE

# Network (mainnet-beta, devnet, testnet)
NETWORK=mainnet-beta

# USDC Token Mint (Mainnet)
USDC_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v

# Optional: Custom RPC URL
RPC_URL=https://api.mainnet-beta.solana.com
```

## Step 2: Create x402 Middleware

Create `lib/x402/middleware.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

interface PaymentPayload {
  from: string;
  to: string;
  amount: string;
  tokenMint: string;
  timestamp: number;
  message: string;
  signature: string;
}

// Define your endpoint pricing
const ENDPOINT_PRICING: Record<string, string> = {
  '/api/premium/content': '0.10',
  '/api/ai/chat': '0.05',
  '/api/data/analysis': '0.02',
};

export function withX402Payment(
  handler: (req: NextRequest) => Promise<NextResponse>,
  price?: string
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const pathname = new URL(req.url).pathname;
    const endpointPrice = price || ENDPOINT_PRICING[pathname];

    if (!endpointPrice) {
      return NextResponse.json(
        { error: 'Endpoint not configured' },
        { status: 500 }
      );
    }

    // Check for payment header
    const paymentHeader = req.headers.get('x-payment');

    if (!paymentHeader) {
      return NextResponse.json(
        {
          status: 402,
          message: 'Payment Required',
          payment: {
            amount: endpointPrice,
            currency: 'USDC',
            recipient: process.env.WALLET_ADDRESS,
            network: process.env.NETWORK || 'mainnet-beta',
            tokenMint: process.env.USDC_MINT,
          },
        },
        { status: 402 }
      );
    }

    // Verify payment
    try {
      const payment: PaymentPayload = JSON.parse(paymentHeader);

      // Verify recipient
      if (payment.to !== process.env.WALLET_ADDRESS) {
        return NextResponse.json(
          { error: 'Invalid recipient address' },
          { status: 402 }
        );
      }

      // Verify amount
      if (parseFloat(payment.amount) < parseFloat(endpointPrice)) {
        return NextResponse.json(
          { error: 'Insufficient payment amount' },
          { status: 402 }
        );
      }

      // Verify timestamp (within 5 minutes)
      const now = Date.now();
      if (now - payment.timestamp > 5 * 60 * 1000) {
        return NextResponse.json(
          { error: 'Payment expired' },
          { status: 402 }
        );
      }

      // Verify signature
      const messageBytes = new TextEncoder().encode(payment.message);
      const signatureBytes = bs58.decode(payment.signature);
      const publicKey = new PublicKey(payment.from);

      const isValid = nacl.sign.detached.verify(
        messageBytes,
        signatureBytes,
        publicKey.toBytes()
      );

      if (!isValid) {
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 402 }
        );
      }

      // Payment verified - proceed with request
      return await handler(req);
    } catch (error) {
      return NextResponse.json(
        { error: 'Payment verification failed' },
        { status: 402 }
      );
    }
  };
}
```

## Step 3: Create Your First Protected API Route

Create `app/api/premium/content/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { withX402Payment } from '@/lib/x402/middleware';

async function handler(req: NextRequest) {
  // Your premium content logic here
  const premiumContent = {
    title: 'Exclusive Article',
    content: 'This is premium content that requires payment to access.',
    author: 'John Doe',
    publishedAt: new Date().toISOString(),
  };

  return NextResponse.json({
    success: true,
    data: premiumContent,
  });
}

// Export with x402 protection
export const GET = withX402Payment(handler, '0.10');
```

## Step 4: Use the SDK in Your Frontend

### Install Frontend Dependencies

```bash
npm install @solana/wallet-adapter-react @solana/wallet-adapter-react-ui @solana/wallet-adapter-wallets
```

### Create Wallet Provider

Create `components/WalletProvider.tsx`:

```typescript
'use client';

import { FC, ReactNode, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

import '@solana/wallet-adapter-react-ui/styles.css';

export const AppWalletProvider: FC<{ children: ReactNode }> = ({ children }) => {
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
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
```

### Make Paid API Request

Create `app/premium/page.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { createClient } from '@payless/sdk';

export default function PremiumPage() {
  const { publicKey, signMessage, connected } = useWallet();
  const [content, setContent] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchPremiumContent = async () => {
    if (!connected || !publicKey || !signMessage) {
      alert('Please connect your wallet first');
      return;
    }

    setLoading(true);
    try {
      const client = createClient({
        walletAddress: process.env.NEXT_PUBLIC_RECIPIENT_ADDRESS!,
      });

      // Connect wallet
      client.connectWallet({
        publicKey: publicKey.toString(),
        signMessage: async (message: Uint8Array) => {
          const signature = await signMessage(message);
          return signature;
        },
      });

      // Make paid request
      const response = await client.get('/api/premium/content');

      if (response.success) {
        setContent(response.data);
      } else {
        alert(`Error: ${response.error}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to fetch content');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Premium Content</h1>
      
      <div className="mb-6">
        <WalletMultiButton />
      </div>

      {connected && (
        <button
          onClick={fetchPremiumContent}
          disabled={loading}
          className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Access Premium Content ($0.10)'}
        </button>
      )}

      {content && (
        <div className="mt-8 p-6 bg-white rounded-lg shadow">
          <h2 className="text-2xl font-bold mb-2">{content.title}</h2>
          <p className="text-gray-600 mb-4">By {content.author}</p>
          <p>{content.content}</p>
        </div>
      )}
    </div>
  );
}
```

## Step 5: Add Wallet Provider to Layout

Update `app/layout.tsx`:

```typescript
import { AppWalletProvider } from '@/components/WalletProvider';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AppWalletProvider>
          {children}
        </AppWalletProvider>
      </body>
    </html>
  );
}
```

## Testing

### 1. Start Development Server

```bash
npm run dev
```

### 2. Test Without Payment

```bash
curl http://localhost:3000/api/premium/content
```

Response:
```json
{
  "status": 402,
  "message": "Payment Required",
  "payment": {
    "amount": "0.10",
    "currency": "USDC",
    "recipient": "YOUR_WALLET_ADDRESS"
  }
}
```

### 3. Test With Frontend

1. Open `http://localhost:3000/premium`
2. Connect your wallet (Phantom/Solflare)
3. Click "Access Premium Content"
4. Approve the transaction signature
5. Content appears!

## Best Practices

### 1. Use Environment Variables

Never hardcode wallet addresses or sensitive data:

```typescript
const config = {
  walletAddress: process.env.WALLET_ADDRESS,
  network: process.env.NETWORK,
};
```

### 2. Add Error Handling

```typescript
try {
  const response = await client.get('/api/endpoint');
  if (!response.success) {
    // Handle error
    console.error(response.error);
  }
} catch (error) {
  // Handle network error
  console.error('Network error:', error);
}
```

### 3. Show Payment Status

```typescript
const [paymentStatus, setPaymentStatus] = useState('idle');

// Show loading, success, or error states
{paymentStatus === 'loading' && <Spinner />}
{paymentStatus === 'success' && <SuccessMessage />}
{paymentStatus === 'error' && <ErrorMessage />}
```

### 4. Cache Paid Content

```typescript
// Store accessed content in localStorage
if (response.success) {
  localStorage.setItem('premium_content', JSON.stringify(response.data));
}
```

## Common Issues

### "Payment Required" Error

- Check that payment header is included
- Verify wallet is connected
- Ensure signature is valid

### "Insufficient Payment" Error

- Check endpoint pricing configuration
- Verify payment amount matches

### Signature Verification Failed

- Ensure message format matches
- Check wallet is signing correctly
- Verify public key matches

## Next Steps

- Add analytics tracking
- Implement subscription models
- Add refund logic
- Deploy to production

## Resources

- [Full API Documentation](../api-reference.md)
- [SDK Documentation](../../sdk/nodejs/README.md)
- [Example Repository](https://github.com/Payless2025/PayLess)

## Support

Need help? [Open an issue](https://github.com/Payless2025/PayLess/issues)

