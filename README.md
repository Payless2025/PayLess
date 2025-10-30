# 💰 Payless

## Accept Crypto Payments Without Accounts

The simplest way to monetize your APIs using the x402 protocol on Solana. Zero fees, instant settlements, one line of code.

[![GitHub](https://img.shields.io/badge/GitHub-Payless2025%2FPayLess-blue?logo=github)](https://github.com/Payless2025/PayLess)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Solana](https://img.shields.io/badge/Blockchain-Solana-blueviolet)](https://solana.com)
[![x402](https://img.shields.io/badge/Protocol-x402-orange)](https://x402.org)

---

## 🎯 What is Payless?

**Payless** is a serverless payment platform built on the x402 protocol for Solana. It lets developers monetize any API with crypto payments in minutes—no accounts, no subscriptions, no complexity.

Perfect for:
- 🤖 **AI Agent APIs** - Let agents pay for your services autonomously
- 💰 **Micropayments** - Accept payments as low as $0.01
- ⚡ **Instant Settlement** - Money in your wallet in 2 seconds
- 🚀 **Serverless APIs** - Deploy anywhere (Vercel, AWS, Netlify)

## 🌟 Features

- **💰 Zero Protocol Fees** - Keep 100% of your revenue
- **⚡ Instant Settlement** - Money in your wallet in 2 seconds
- **🔐 Privacy First** - No accounts, emails, or OAuth required
- **🌍 Solana Powered** - Fast, cheap transactions on Solana blockchain
- **🚀 Serverless Ready** - Deploy to Vercel, Netlify, or AWS Lambda
- **🤖 Perfect for AI Agents** - Autonomous payments without human intervention

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- A Solana wallet address to receive payments (Phantom, Solflare, etc.)
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

Edit `.env` and add your Solana wallet address:
```env
# Solana wallet address (base58 format)
WALLET_ADDRESS=YourSolanaWalletAddressHere1111111111111111
FACILITATOR_URL=https://facilitator.x402.org
NETWORK=mainnet-beta
RPC_URL=https://api.mainnet-beta.solana.com
USDC_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
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
   - `WALLET_ADDRESS` - Your Solana wallet address
   - `FACILITATOR_URL` - Facilitator endpoint
   - `NETWORK` - Solana network (mainnet-beta, devnet)
   - `RPC_URL` - Solana RPC endpoint
   - `USDC_MINT` - USDC SPL token mint address

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

## 🆚 Payless vs PayAI

Both are excellent x402 payment solutions, but with different focuses:

| Feature | Payless 💰 | PayAI 🤖 |
|---------|-----------|----------|
| **Best For** | API monetization, any developer | AI agent marketplaces, CT content |
| **Integration** | One line of code | Multiple SDKs & plugins |
| **Deployment** | Deploy anywhere | Requires setup |
| **Fees** | 0% - Keep 100% | Platform fees apply |
| **Open Source** | Fully open source | Partially open source |
| **Use Cases** | Any paid API/service | AI agent hiring, CT monetization |

**Choose Payless if:** You want the simplest way to monetize any API with zero fees.

**Choose PayAI if:** You're building AI agent marketplaces or crypto Twitter content monetization.

Learn more: [PayAI.network](https://payai.network/)

---

**Built with ❤️ by the Payless Team**

🌟 **[GitHub](https://github.com/Payless2025/PayLess)** | 🐦 **[Twitter](https://twitter.com/paylesstoken)** | 📚 **[x402 Docs](https://x402.gitbook.io/x402)**

⭐ Star this repo if you find it useful!

