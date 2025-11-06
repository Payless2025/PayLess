# 🔐 Token-Gated Content - Holder Benefits

## Overview

Payless offers **token-gated API access** for $PAYLESS holders. Instead of traditional subscriptions, simply hold tokens to unlock premium features and higher rate limits.

**Total Supply:** 1,000,000,000 $PAYLESS tokens  
**Contract Address (CA):** `FDgSegoxrdpsct21YVeAbC9dWeTwTxA8Cceeh8BPpump`  
**Chain:** Solana

## Why Token-Gating?

Traditional SaaS model: Pay $99/month → Money gone forever

Token-gated model: Buy $500 in $PAYLESS → API access + Asset appreciation

### Benefits for Holders
- ✅ **No recurring fees** - Hold once, access forever
- ✅ **Asset appreciation** - Your "subscription" can increase in value
- ✅ **Sell anytime** - Exit whenever you want
- ✅ **True utility** - Tokens have real use beyond speculation
- ✅ **Aligned incentives** - Platform growth benefits holders

## Token Tiers

### 🆓 Free Tier (0 tokens)
**Rate Limit:** 10 requests/hour

**Access:**
- Limited API access
- Basic endpoints only

---

### 🟢 Basic Tier
**Requirement:** 100,000 $PAYLESS (0.01% of supply)  
**Rate Limit:** 100 requests/hour

**Benefits:**
- ✅ All AI APIs (Chat, Image, TTS, Translate)
- ✅ Data APIs (Crypto, Stock, Weather, News)
- ✅ Premium content access
- ✅ Basic support

**Example Cost:** If $PAYLESS = $0.001, you need ~$100 worth

---

### 🔵 Pro Tier
**Requirement:** 500,000 $PAYLESS (0.05% of supply)  
**Rate Limit:** 500 requests/hour

**Benefits:**
- ✅ All Basic tier features
- ✅ Advanced analytics
- ✅ Premium tools (QR codes, Custom reports)
- ✅ Priority support
- ✅ Early access to new features
- ✅ Custom integrations

**Example Cost:** If $PAYLESS = $0.001, you need ~$500 worth

---

### 🟣 Enterprise Tier
**Requirement:** 1,000,000 $PAYLESS (0.1% of supply)  
**Rate Limit:** **Unlimited**

**Benefits:**
- ✅ All Pro tier features
- ✅ Unlimited API requests
- ✅ Dedicated support
- ✅ Custom SLAs
- ✅ Beta feature access
- ✅ Revenue sharing opportunities

**Example Cost:** If $PAYLESS = $0.001, you need ~$1,000 worth

---

## How It Works

### 1. Check Your Tier

```bash
curl "https://payless.network/api/token-tier?wallet=YOUR_WALLET_ADDRESS"
```

Response:
```json
{
  "success": true,
  "wallet": "YOUR_WALLET",
  "balance": {
    "tokens": 150000,
    "formatted": "150,000",
    "percentage": "0.015%"
  },
  "tier": {
    "current": "basic",
    "name": "Basic"
  },
  "rateLimit": {
    "limit": "100 requests/hour",
    "value": 100
  },
  "benefits": [
    "100 requests/hour",
    "All AI APIs",
    "Data APIs",
    "Basic support"
  ],
  "nextTier": {
    "tier": "pro",
    "tokensNeeded": 350000,
    "formatted": "350,000"
  }
}
```

### 2. Access Token-Gated Endpoints

Include your wallet address in the `x-wallet-address` header:

```bash
curl -X POST https://payless.network/api/premium/holder-content \
  -H "x-wallet-address: YOUR_WALLET_ADDRESS"
```

### 3. Monitor Rate Limits

Response headers include your rate limit info:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1699564800000
X-Token-Tier: basic
```

---

## Integration Examples

### JavaScript/TypeScript

```typescript
import { checkWalletTier } from '@payless/sdk';

// Check your tier
const tierInfo = await checkWalletTier('YOUR_WALLET');

console.log(`Your tier: ${tierInfo.tier}`);
console.log(`Rate limit: ${tierInfo.rateLimit} req/hour`);
console.log(`Balance: ${tierInfo.balance.toLocaleString()} tokens`);

// Make token-gated API request
const response = await fetch('https://payless.network/api/premium/holder-content', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-wallet-address': 'YOUR_WALLET',
  },
});

const data = await response.json();
```

### Python

```python
from payless import PaylessClient

client = PaylessClient()

# Check tier
tier_info = client.check_tier('YOUR_WALLET')
print(f"Tier: {tier_info['tier']}")
print(f"Rate limit: {tier_info['rateLimit']}")

# Access token-gated content
response = client.get_holder_content(
    wallet='YOUR_WALLET'
)
```

---

## Rate Limiting

Rate limits reset every hour. If you exceed your limit:

**Response (429 Too Many Requests):**
```json
{
  "error": "Rate Limit Exceeded",
  "message": "You have exceeded your rate limit of 100 requests per hour",
  "rateLimit": {
    "limit": 100,
    "remaining": 0,
    "resetIn": "45 minutes"
  },
  "upgrade": "Upgrade to a higher tier for more requests"
}
```

### Increase Your Rate Limit

1. **Buy more tokens** - Upgrade to next tier
2. **Wait** - Rate limit resets every hour
3. **Optimize** - Cache responses, batch requests

---

## Token-Gated Endpoints

| Endpoint | Tier Required | Rate Limit |
|----------|---------------|------------|
| `/api/premium/holder-content` | Basic | 100/hr |
| `/api/premium/pro-analytics` | Pro | 500/hr |
| `/api/ai/*` (with gating) | Basic | 100/hr |
| `/api/data/*` (with gating) | Basic | 100/hr |
| Custom Enterprise endpoints | Enterprise | Unlimited |

---

## Economics Example

### Traditional SaaS
- Monthly fee: $99
- Annual cost: $1,188
- After 1 year: You paid $1,188, have $0

### Token-Gated ($PAYLESS)
- Buy 500K tokens @ $0.001: $500
- Annual "cost": $0 (you hold the tokens)
- After 1 year: 
  - If token stays same: You have $500 + full year access
  - If token 2x: You have $1,000 + full year access
  - Can sell anytime to recoup

---

## Setup for Developers

### 1. Configure Token Mint

Add to your `.env.local`:
```env
PAYLESS_TOKEN_MINT=FDgSegoxrdpsct21YVeAbC9dWeTwTxA8Cceeh8BPpump
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

> **Note:** The token mint address is already configured in the codebase. This env variable is optional.

### 2. Protect Your Endpoints

```typescript
import { withBasicTier, withProTier } from '@/lib/x402/token-gated-middleware';

// Basic tier protection
export const POST = withBasicTier(async (req) => {
  // Your handler
  return NextResponse.json({ data: 'Holder-only content' });
});

// Pro tier protection
export const GET = withProTier(async (req) => {
  // Your handler
  return NextResponse.json({ data: 'Pro-only analytics' });
});
```

---

## FAQ

**Q: Do I need to pay gas fees to check my tier?**  
A: No, tier checking is free and doesn't require transactions.

**Q: What happens if my balance drops below the tier requirement?**  
A: You'll be downgraded to the appropriate tier automatically on your next request.

**Q: Can I use multiple wallets?**  
A: Yes, each wallet is tracked separately based on its token holdings.

**Q: Do staked tokens count?**  
A: Currently only liquid tokens in your wallet count. Staked token support coming soon.

**Q: Is this only on Solana?**  
A: Currently yes, but we're exploring multi-chain token gating.

---

## Roadmap

- ✅ Basic token-gating system
- ✅ Rate limiting per tier
- ✅ Holder-only endpoints
- 🔄 Staked token support
- 🔄 NFT-based access
- 🔄 Multi-chain token gating
- 🔄 Revenue sharing for large holders
- 🔄 Governance voting for holders

---

## Support

**For holders:**
- Basic tier: Email support (48h response)
- Pro tier: Priority support (24h response)
- Enterprise tier: Dedicated support (4h response)

**Contact:** support@payless.network  
**Website:** https://payless.network  
**Docs:** https://payless.gitbook.io

