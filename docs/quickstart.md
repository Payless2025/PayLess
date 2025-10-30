# Quick Start

Get Payless running in under 5 minutes.

## Prerequisites

- Node.js 18+ installed
- A Solana wallet address (Phantom, Solflare, etc.)
- Basic knowledge of Next.js/React

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/Payless2025/PayLess.git
cd PayLess
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and add your Solana wallet address:

```env
WALLET_ADDRESS=YourSolanaWalletAddressHere
FACILITATOR_URL=https://facilitator.x402.org
NETWORK=mainnet-beta
```

### 4. Start Development Server

```bash
npm run dev
```

Visit http://localhost:3000 - your payment API is live!

## Add Payment to Your API

Wrap any API route with payment middleware:

```typescript
import { withX402Payment } from '@/lib/x402/middleware';

async function handler(req: NextRequest) {
  const data = await yourApiLogic(req);
  return NextResponse.json({ data });
}

// Add payment requirement - that's it!
export const POST = withX402Payment(handler, "0.01");
```

## Test It

1. Go to `/playground`
2. Select an API endpoint
3. Click "Test Endpoint"
4. Payment happens automatically!

## Next Steps

- [Deploy to Production](deployment.md)
- [API Reference](api-reference.md)
- [Configuration Guide](configuration.md)

---

Need help? Check out our [GitHub Issues](https://github.com/Payless2025/PayLess/issues)

