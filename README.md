# 💰 Payless

## Accept Crypto Payments Without Accounts

The simplest way to monetize your APIs using the x402 protocol on Robinhood Chain. Zero fees, instant settlements, one line of code.

[![GitHub](https://img.shields.io/badge/GitHub-Payless2025%2FPayLess-blue?logo=github)](https://github.com/Payless2025/PayLess)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Robinhood Chain](https://img.shields.io/badge/Blockchain-Robinhood%20Chain-00C805)](https://docs.robinhood.com/chain/)
[![x402](https://img.shields.io/badge/Protocol-x402-orange)](https://x402.org)

**$PAYLESS Contract Address (Robinhood Chain):** `0xB8A30979F583a8c5340dC1B58203De7569AAe806`

---

## 🎯 What is Payless?

**Payless** is a serverless payment platform built on the x402 protocol. It lets developers monetize any API with crypto payments in minutes—no accounts, no subscriptions, no complexity.

**⛓️ Network:** Payless settles exclusively on [Robinhood Chain](https://docs.robinhood.com/chain/) — an EVM (Arbitrum Orbit) L2, chain ID `4663` — denominated in **USDG**.

Perfect for:
- 🤖 **AI Agent APIs** - Let agents pay for your services autonomously
- 💰 **Micropayments** - Accept payments as low as $0.01
- ⚡ **Instant Settlement** - Money in your wallet in 2 seconds
- 🚀 **Serverless APIs** - Deploy anywhere (Vercel, AWS, Netlify)
- ⛓️ **EVM Native** - Works with MetaMask, Rabby, and any EVM tooling

## 🌟 Features

- **💰 Zero Protocol Fees** - Keep 100% of your revenue
- **⚡ Instant Settlement** - Money in your wallet in 2 seconds
- **🔐 Privacy First** - No accounts, emails, or OAuth required
- **⛓️ Robinhood Chain** - EVM settlement in USDG, ETH for gas
- **🚀 Serverless Ready** - Deploy to Vercel, Netlify, or AWS Lambda
- **🤖 Perfect for AI Agents** - Autonomous payments without human intervention
- **⚡ Payment Streaming** - Pay-per-second for real-time services (AI APIs, compute, streaming)
- **📊 Built-in Analytics** - Track payments, revenue, and API usage
- **🔔 Webhook Support** - Real-time payment notifications
- **🔐 Token-Gated Content** - Holder-only API access for $PAYLESS holders

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- A Robinhood Chain wallet address (`0x…`) to receive payments — MetaMask, Rabby, or any EVM wallet
- (Optional) x402 facilitator endpoint

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/Payless2025/PayLess.git
cd payless
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
cp .env.example .env
```

Edit `.env` and add your Robinhood Chain wallet address:
```env
# Robinhood Chain wallet address (base58 format)
WALLET_ADDRESS=0xYourRobinhoodChainWalletAddressHere
FACILITATOR_URL=https://facilitator.x402.org
ROBINHOOD_CHAIN_ID=4663
ROBINHOOD_RPC_URL=https://rpc.mainnet.chain.robinhood.com
USDG_ADDRESS=0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168

# Enable demo payments (set to 'true' for playground/testing)
ENABLE_DEMO_PAYMENTS=true
```

4. **Run development server**
```bash
npm run dev
```

5. **Open your browser**
```
http://localhost:3000
```

## 📖 Usage

### Adding Payment to Your API Endpoint

It's as simple as wrapping your handler with `withX402Payment`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { withX402Payment } from '@/lib/x402/middleware';

async function handler(req: NextRequest) {
  // Your API logic here
  const result = await yourBusinessLogic(req);
  return NextResponse.json({ result });
}

// Add payment requirement - that's it!
export const POST = withX402Payment(handler, "0.01");
```

### Configure Endpoint Pricing

Edit `lib/x402/config.ts`:

```typescript
export const ENDPOINT_PRICING: EndpointConfig = {
  '/api/ai/chat': '0.05',        // $0.05 per request
  '/api/ai/image': '0.10',       // $0.10 per request
  '/api/data/weather': '0.01',   // $0.01 per request
  '/api/your-endpoint': '0.25',  // Add your custom pricing
};
```

### Making Payment Requests (Client-Side)

```typescript
import { makePaymentRequest } from '@/lib/x402/client';

// The SDK handles payment automatically
const response = await makePaymentRequest(
  '/api/ai/chat',
  {
    method: 'POST',
    body: JSON.stringify({ message: 'Hello!' })
  },
  walletAddress,      // Your wallet
  recipientAddress,   // Merchant wallet
  '0.05'             // Payment amount
);

const data = await response.json();
console.log(data);
```

## 🏗️ Project Structure

```
payless/
├── app/
│   ├── api/                  # API endpoints with x402 payment
│   │   ├── ai/
│   │   │   ├── chat/        # AI chat endpoint ($0.05)
│   │   │   └── image/       # AI image generation ($0.10)
│   │   ├── data/
│   │   │   ├── weather/     # Weather data ($0.01)
│   │   │   └── stock/       # Stock data ($0.02)
│   │   ├── premium/
│   │   │   └── content/     # Premium content ($1.00)
│   │   ├── health/          # Health check (free)
│   │   └── info/            # API info (free)
│   ├── playground/          # Interactive API playground
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Landing page
├── components/              # React components
│   ├── Hero.tsx            # Hero section
│   ├── Features.tsx        # Features grid
│   ├── CodeExample.tsx     # Code examples
│   ├── UseCases.tsx        # Use case cards
│   └── Footer.tsx          # Footer
├── lib/
│   └── x402/               # x402 protocol implementation
│       ├── types.ts        # TypeScript types
│       ├── config.ts       # Configuration
│       ├── middleware.ts   # Payment middleware
│       └── client.ts       # Client utilities
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── next.config.js
```

## 🔧 API Endpoints

### Free Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/info` | GET | API information and pricing |

### Paid Endpoints

| Endpoint | Method | Price | Description |
|----------|--------|-------|-------------|
| `/api/ai/chat` | POST | $0.05 | AI chat completion |
| `/api/ai/image` | POST | $0.10 | AI image generation |
| `/api/data/weather` | GET | $0.01 | Weather data |
| `/api/data/stock` | GET | $0.02 | Stock market data |
| `/api/premium/content` | GET | $1.00 | Premium content access |

## 🎮 Try the Playground

Visit `/playground` to test all endpoints interactively:

```bash
npm run dev
# Open http://localhost:3000/playground
```

The playground allows you to:
- Test all API endpoints
- See payment flow in action (demo mode)
- Inspect request/response payloads
- Understand x402 protocol behavior

## 🚢 Deployment

### Deploy to Vercel (Recommended)

1. **Push to GitHub**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/payless.git
git push -u origin main
```

2. **Deploy to Vercel**
```bash
npm install -g vercel
vercel
```

3. **Set environment variables in Vercel Dashboard**
   - `WALLET_ADDRESS` - Your Robinhood Chain wallet address
   - `FACILITATOR_URL` - Facilitator endpoint
   - `ROBINHOOD_CHAIN_ID` - Robinhood Chain ID (4663)
   - `RPC_URL` - Robinhood Chain RPC endpoint
   - `USDG_ADDRESS` - USDG ERC-20 contract address

### Deploy to Netlify

```bash
npm install -g netlify-cli
netlify deploy --prod
```

### Deploy to AWS Lambda

Use [Serverless Framework](https://www.serverless.com/) or [AWS SAM](https://aws.amazon.com/serverless/sam/).

## 🔐 Security Considerations

### Production Checklist

- [ ] Enable real facilitator verification (not demo mode)
- [ ] Set up proper RPC endpoints for your network
- [ ] Implement rate limiting
- [ ] Add request validation
- [ ] Set up monitoring and logging
- [ ] Use HTTPS only
- [ ] Implement webhook verification for payment confirmations
- [ ] Add CORS restrictions
- [ ] Enable API key authentication for sensitive endpoints (optional)

### Environment Variables

Never commit these to version control:
- `WALLET_ADDRESS` - Keep private
- `RPC_URL` - Use secure providers
- Private keys should NEVER be in your code

## 📚 Learn More

### Documentation

- [Robinhood Chain](./docs/ROBINHOOD_CHAIN.md) - Network details, USDG, and how a payment is verified
- [Quick Start](./docs/quickstart.md) - Get running in five minutes
- [API Reference](./docs/api-reference.md) - Endpoints, payloads, and errors
- [Payment Links](./docs/PAYMENT_LINKS.md) - Shareable payment URLs
- [Payment Streaming](./docs/PAYMENT_STREAMING.md) - Pay-per-second billing
- [Token Gating](./docs/TOKEN_GATING.md) - Holder-only access for $PAYLESS
- [Webhooks](./docs/WEBHOOKS.md) - Real-time payment notifications
- [API Configuration](./docs/API_CONFIGURATION.md) - Configure your API

### x402 Protocol

- [x402 Website](https://www.x402.org/)
- [x402 Documentation](https://x402.gitbook.io/x402)
- [x402 GitHub](https://github.com/coinbase/x402)

### Next.js

- [Next.js Documentation](https://nextjs.org/docs)
- [API Routes](https://nextjs.org/docs/api-routes/introduction)
- [Deployment](https://nextjs.org/docs/deployment)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 💬 Support

- GitHub Issues: [Report a bug](https://github.com/yourusername/payless/issues)
- Documentation: [Read the docs](https://github.com/yourusername/payless/wiki)
- Community: [Join Discord](https://discord.gg/x402)

## 🙏 Acknowledgments

- Built with [x402 Protocol](https://www.x402.org/)
- Powered by [Next.js](https://nextjs.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Icons by [Lucide](https://lucide.dev/)

---

## 💪 Why Developers Choose Payless

| Feature | What You Get |
|---------|--------------|
| **⚡ Lightning Setup** | One line of code, < 5 minutes to production |
| **💯 Keep 100%** | Zero protocol fees. Every dollar is yours |
| **🚀 True Serverless** | Deploy anywhere - Vercel, AWS, Netlify |
| **🔓 Fully Open Source** | MIT license. Fork, modify, own it |
| **🎯 Any Use Case** | Monetize any API or service, no restrictions |
| **🛝 Built-in Playground** | Test all endpoints without writing code |
| **🔐 Privacy First** | No accounts, emails, or OAuth required |
| **🤖 AI Agent Ready** | Perfect for autonomous payments |
| **💵 True Micropayments** | Accept payments as low as $0.01 USDG |
| **⚡ Instant Settlement** | Money in your wallet in 2 seconds |

The simplest, most developer-friendly way to monetize APIs with crypto. Zero fees, zero complexity, zero compromises.

---

**Built with ❤️ by the Payless Team**

🌟 **[GitHub](https://github.com/Payless2025/PayLess)** | 🐦 **[X/Twitter](https://x.com/paylessnetwork)** | 📚 **[Documentation](https://github.com/Payless2025/PayLess/tree/master/docs)**

⭐ Star this repo if you find it useful!

