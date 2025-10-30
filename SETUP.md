# 🚀 Setup Guide for Payless

This guide will help you get Payless up and running in under 5 minutes.

## Prerequisites

Before you begin, make sure you have:
- ✅ Node.js 18 or higher installed
- ✅ npm or yarn package manager
- ✅ A crypto wallet address (MetaMask, Coinbase Wallet, etc.)
- ✅ Git installed (optional)

## Step-by-Step Setup

### 1. Install Dependencies

```bash
npm install
```

This will install all required packages including:
- Next.js (React framework)
- TypeScript
- Tailwind CSS
- ethers.js
- lucide-react (icons)

### 2. Configure Your Environment

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit the `.env` file with your wallet details:

```env
# Your wallet address to receive payments
WALLET_ADDRESS=YourSolanaWalletAddressHere1111111111111111

# x402 Facilitator URL (use Coinbase's or run your own)
FACILITATOR_URL=https://facilitator.x402.org

# Blockchain network
NETWORK=base

# Optional: Custom RPC endpoint
RPC_URL=https://mainnet.base.org
```

> **Important:** Replace the `WALLET_ADDRESS` with your actual wallet address!

### 3. Start Development Server

```bash
npm run dev
```

The app will start on `http://localhost:3000`

### 4. Test the Application

#### A) Visit the Homepage
Open your browser and go to:
```
http://localhost:3000
```

You should see the beautiful landing page with:
- Hero section with animated background
- Features overview
- Code examples
- Use cases

#### B) Try the Playground
Navigate to:
```
http://localhost:3000/playground
```

Here you can:
- Test all API endpoints
- See the payment flow in action
- Make requests with and without payment
- Inspect responses

#### C) Test API Endpoints Directly

**Free endpoint (no payment):**
```bash
curl http://localhost:3000/api/info
```

**Paid endpoint (will return 402):**
```bash
curl http://localhost:3000/api/ai/chat \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello!"}'
```

Response will be:
```json
{
  "status": 402,
  "message": "Payment Required",
  "payment": {
    "amount": "0.05",
    "currency": "USDC",
    "recipient": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    "facilitator": "https://facilitator.x402.org",
    "network": "base"
  }
}
```

### 5. Understanding the Demo Mode

By default, Payless runs in **demo mode** for testing:

- ✅ Payment verification is simulated
- ✅ No real crypto transactions
- ✅ Perfect for development and testing

To enable **production mode**:
1. Set `NODE_ENV=production` in your `.env`
2. Configure a real facilitator endpoint
3. Ensure you have gas tokens for transaction fees

## Common Issues & Solutions

### Issue: "Module not found"
**Solution:** Run `npm install` again

### Issue: "Port 3000 already in use"
**Solution:** 
```bash
# Kill the process using port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
PORT=3001 npm run dev
```

### Issue: API returns 500 error
**Solution:** Check your `.env` file is properly configured

### Issue: Payment verification fails
**Solution:** 
- In demo mode, this shouldn't happen
- In production, verify your facilitator URL is correct
- Check your wallet address is valid

## Next Steps

### 🎨 Customize Your Instance

1. **Change Endpoint Pricing**
   - Edit `lib/x402/config.ts`
   - Modify `ENDPOINT_PRICING` object

2. **Add New Endpoints**
   - Create a new file in `app/api/your-endpoint/route.ts`
   - Wrap handler with `withX402Payment`
   - Add pricing to config

3. **Customize UI**
   - Edit components in `components/`
   - Modify colors in `tailwind.config.js`
   - Update content in landing page

### 🚀 Deploy to Production

When you're ready to go live:

1. **Deploy to Vercel** (easiest)
```bash
npm install -g vercel
vercel
```

2. **Set Production Environment Variables**
   - Go to Vercel Dashboard
   - Add environment variables:
     - `WALLET_ADDRESS`
     - `FACILITATOR_URL`
     - `NETWORK`
     - `NODE_ENV=production`

3. **Test Production Deployment**
   - Try all endpoints
   - Verify payment flow
   - Monitor transactions

### 📚 Learn x402 Protocol

- Read the [x402 Documentation](https://x402.gitbook.io/x402)
- Explore the [x402 GitHub](https://github.com/coinbase/x402)
- Join the [x402 Discord](https://discord.gg/x402)

### 🔐 Security Best Practices

Before going to production:
- [ ] Never commit `.env` to version control
- [ ] Use environment variables for all secrets
- [ ] Enable HTTPS only
- [ ] Implement rate limiting
- [ ] Add request validation
- [ ] Set up monitoring
- [ ] Use secure RPC providers
- [ ] Test payment flow thoroughly

## Getting Help

If you run into issues:

1. **Check the Console**
   - Browser DevTools (F12)
   - Terminal output

2. **Review Logs**
   - Check API route responses
   - Look for error messages

3. **Read Documentation**
   - [x402 Docs](https://x402.gitbook.io/x402)
   - [Next.js Docs](https://nextjs.org/docs)

4. **Ask for Help**
   - GitHub Issues
   - Community Discord
   - Stack Overflow

## Success! 🎉

You now have a fully functional payment platform powered by x402 protocol!

**What you can do:**
- Accept crypto payments without accounts
- Monetize APIs with micropayments
- Build pay-per-use services
- Support AI agent payments
- Create subscription alternatives

**Next steps:**
- Customize your endpoints
- Deploy to production
- Start accepting real payments
- Build something amazing!

---

Need help? Check the [main README](README.md) or open an issue on GitHub.

