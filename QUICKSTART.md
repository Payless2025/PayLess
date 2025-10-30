# ⚡ Payless - Quick Start Guide

Get up and running in 3 minutes!

## 🎯 What is Payless?

Payless is a **complete serverless payment platform** that integrates the **x402 protocol** to accept crypto payments without requiring user accounts, email registration, or complex authentication flows.

### What You Get

✅ **Beautiful Landing Page** - Modern, responsive website  
✅ **5 Demo API Endpoints** - Ready-to-use paid APIs  
✅ **Interactive Playground** - Test all features  
✅ **x402 Middleware** - One-line payment integration  
✅ **Complete Documentation** - Setup and deployment guides  
✅ **Production Ready** - Deploy to Vercel in minutes  

## 🚀 Installation (3 Steps)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Environment
```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your Solana wallet address (base58 format)
# WALLET_ADDRESS=YourSolanaWalletAddressHere1111111111111111
```

### Step 3: Start the Server
```bash
npm run dev
```

**That's it!** Open http://localhost:3000 🎉

## 🎮 Try It Out

### 1. Visit the Homepage
```
http://localhost:3000
```
Beautiful landing page with:
- Animated hero section
- Feature showcase
- Code examples
- Use case cards

### 2. Test the Playground
```
http://localhost:3000/playground
```
Interactive API testing environment:
- Try all 5 API endpoints
- See payment flow in action (demo mode)
- No real crypto needed for testing

### 3. Make API Calls

**Free Endpoint:**
```bash
curl http://localhost:3000/api/info
```

**Paid Endpoint (returns 402):**
```bash
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Tell me about x402"}'
```

## 📦 What's Inside?

### API Endpoints

| Endpoint | Price | Description |
|----------|-------|-------------|
| `/api/ai/chat` | $0.05 | AI chat responses |
| `/api/ai/image` | $0.10 | AI image generation |
| `/api/data/weather` | $0.01 | Weather data |
| `/api/data/stock` | $0.02 | Stock market data |
| `/api/premium/content` | $1.00 | Premium articles |

### Pages

- `/` - Landing page
- `/playground` - Interactive API tester
- `/api/info` - API documentation
- `/api/health` - Health check

## 🔧 Customize Your Platform

### Add a New Paid Endpoint

**1. Create the endpoint file:**
```typescript
// app/api/your-endpoint/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withX402Payment } from '@/lib/x402/middleware';

async function handler(req: NextRequest) {
  // Your logic here
  return NextResponse.json({ data: 'Your response' });
}

export const POST = withX402Payment(handler, "0.01");
```

**2. Add pricing to config:**
```typescript
// lib/x402/config.ts
export const ENDPOINT_PRICING = {
  '/api/your-endpoint': '0.01',  // Add this line
  // ... other endpoints
};
```

**Done!** Your endpoint now requires payment.

### Change Pricing

Edit `lib/x402/config.ts`:
```typescript
export const ENDPOINT_PRICING = {
  '/api/ai/chat': '0.10',  // Changed from 0.05 to 0.10
};
```

## 🚀 Deploy to Production

### Option 1: Vercel (Easiest)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables:
   - `WALLET_ADDRESS`
   - `FACILITATOR_URL`
   - `NETWORK`
4. Deploy!

### Option 2: One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/payless)

## 🎯 How x402 Works

### The Flow

```
1. Client requests API → Server responds with 402 Payment Required
2. Client signs payment payload → Includes in X-Payment header
3. Server verifies payment → Grants access to resource
4. Money settled on-chain → In your wallet instantly
```

### Payment Request Example

```typescript
// Client makes request without payment
fetch('/api/ai/chat', { method: 'POST' })
// ↓ Receives 402 with payment details

// Client adds payment and retries
fetch('/api/ai/chat', {
  method: 'POST',
  headers: {
    'X-Payment': signedPaymentPayload
  }
})
// ↓ Receives 200 with response
```

## 🎨 Technology Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Protocol:** x402
- **Blockchain:** Solana
- **Currency:** USDC (SPL Token)

## 📊 Project Structure

```
payless/
├── app/
│   ├── api/              # API routes with payment
│   ├── playground/       # Interactive demo
│   ├── page.tsx         # Landing page
│   └── layout.tsx       # Root layout
├── components/           # React components
├── lib/x402/            # x402 implementation
├── package.json
└── README.md
```

## 💡 Use Cases

Build these with Payless:

- 🤖 **AI API Gateway** - Proxy AI models with micropayments
- 🖼️ **Image Generation** - DALL-E/Midjourney API
- 📊 **Data APIs** - Weather, stocks, crypto prices
- 📝 **Premium Content** - Paywalled articles/videos
- ☁️ **Cloud Storage** - Pay-per-use file hosting
- ⚡ **Serverless Functions** - Compute marketplace

## 🔐 Important Notes

### Demo Mode (Default)
- ✅ Perfect for testing
- ✅ No real crypto required
- ✅ Payment verification simulated

### Production Mode
- Set `NODE_ENV=production`
- Configure real facilitator
- Real blockchain transactions
- Requires gas for fees

## 📚 Documentation

- **README.md** - Full documentation
- **SETUP.md** - Detailed setup guide
- **QUICKSTART.md** - This file
- [x402 Docs](https://x402.gitbook.io/x402) - Protocol documentation

## 🆘 Need Help?

**Common Issues:**

1. **Port already in use**
   ```bash
   PORT=3001 npm run dev
   ```

2. **Module not found**
   ```bash
   npm install
   ```

3. **Payment fails in production**
   - Check facilitator URL
   - Verify wallet address
   - Ensure network is correct

## ✅ Next Steps

Now that you have Payless running:

1. ✨ **Customize** - Add your own endpoints
2. 🎨 **Brand** - Update colors and content
3. 🧪 **Test** - Use the playground extensively
4. 🚀 **Deploy** - Push to production
5. 💰 **Profit** - Start accepting payments!

## 🌟 Key Features

- **No Accounts Required** - Users pay and access instantly
- **Zero Protocol Fees** - Keep 100% of revenue
- **Instant Settlement** - 2-second blockchain payments
- **Privacy First** - No email, OAuth, or tracking
- **Perfect for AI Agents** - Autonomous payments
- **Blockchain Agnostic** - Works with any chain

## 🎉 You're Ready!

You now have a fully functional payment platform powered by x402 protocol.

**Start building your pay-per-use service today!**

---

Questions? Check [README.md](README.md) or [SETUP.md](SETUP.md)

⭐ Star the project if you find it useful!

