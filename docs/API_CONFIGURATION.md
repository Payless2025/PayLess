# API Configuration Guide

Payless supports real API integrations for all endpoints. This guide shows you how to configure them.

## 🎯 Quick Start

**Good News:** All APIs work WITHOUT configuration! They return mock/fallback data if API keys are not set.

**Want Real Data?** Add API keys to your `.env.local` file (create it in the project root).

## 📝 Environment Variables

Create `/Users/hakkioz/Desktop/Payless/.env.local`:

```bash
# Wallet Addresses (Required for payments)
WALLET_ADDRESS=your_default_wallet_address
SOLANA_WALLET_ADDRESS=your_solana_wallet_address
BSC_WALLET_ADDRESS=your_bsc_evm_address

# API Keys (Optional - APIs work without them)
OPENAI_API_KEY=sk-your-key-here
OPENWEATHER_API_KEY=your-key-here
NEWSAPI_KEY=your-key-here
```

## 🔑 Getting API Keys

### 1. OpenAI (AI Chat & Image Generation)

**Endpoint:** `/api/ai/chat`, `/api/ai/image`

**Get Key:** https://platform.openai.com/api-keys

**Free Tier:** $5 credit for new accounts

**Setup:**
```bash
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
```

**Without Key:** Returns helpful mock responses

---

### 2. OpenWeatherMap (Weather Data)

**Endpoint:** `/api/data/weather`

**Get Key:** https://openweathermap.org/api

**Free Tier:** 1,000 calls/day

**Setup:**
```bash
OPENWEATHER_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxx
```

**Without Key:** Returns mock weather data

---

### 3. NewsAPI (News Aggregation)

**Endpoint:** `/api/data/news`

**Get Key:** https://newsapi.org/register

**Free Tier:** 100 requests/day

**Setup:**
```bash
NEWSAPI_KEY=xxxxxxxxxxxxxxxxxxxxxxxx
```

**Without Key:** Returns mock news articles

---

### 4. CoinGecko (Crypto Prices)

**Endpoint:** `/api/data/crypto`

**Get Key:** ❌ NO API KEY NEEDED!

**Free Tier:** ✅ Fully functional without registration

**Works Immediately:** Just call the endpoint

---

### 5. QR Code Generator

**Endpoint:** `/api/tools/qrcode`

**Get Key:** ❌ NO API KEY NEEDED!

**Works Immediately:** Uses `qrcode` npm package

---

## 📊 API Status

| API | Status | Free Tier | API Key Required |
|-----|--------|-----------|------------------|
| QR Code | ✅ Ready | Unlimited | No |
| CoinGecko | ✅ Ready | Yes | No |
| OpenWeatherMap | ⚙️ Optional | 1K/day | Yes |
| NewsAPI | ⚙️ Optional | 100/day | Yes |
| OpenAI Chat | ⚙️ Optional | $5 credit | Yes |
| OpenAI Image | ⚙️ Optional | $5 credit | Yes |

## 🧪 Testing Real APIs

### Test QR Code (No Key Needed)
```bash
curl -X POST http://localhost:3000/api/tools/qrcode \
  -H "Content-Type: application/json" \
  -d '{"data": "https://payless.example.com", "size": 256}'
```

### Test Crypto Prices (No Key Needed)
```bash
curl http://localhost:3000/api/data/crypto?symbol=SOL
```

### Test Weather (Needs Key)
```bash
curl http://localhost:3000/api/data/weather?city=London
```

### Test AI Chat (Needs Key)
```bash
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is blockchain?"}'
```

## 💡 Fallback Behavior

All APIs gracefully fallback to mock data if:
- API key is not set
- API is unavailable
- Rate limit exceeded
- Network error

This ensures your Payless platform **always works**, even during API outages!

## 🚀 Production Deployment

### Vercel

Add environment variables in Vercel dashboard:
1. Go to Project Settings → Environment Variables
2. Add each key
3. Redeploy

### Netlify

```bash
netlify env:set OPENAI_API_KEY sk-your-key-here
netlify env:set OPENWEATHER_API_KEY your-key-here
netlify env:set NEWSAPI_KEY your-key-here
```

### Docker

```dockerfile
ENV OPENAI_API_KEY=sk-your-key-here
ENV OPENWEATHER_API_KEY=your-key-here
ENV NEWSAPI_KEY=your-key-here
```

## 📈 Rate Limits

| Service | Free Tier Limit | Upgrade Cost |
|---------|----------------|--------------|
| CoinGecko | 50 calls/min | Free |
| OpenWeather | 1,000/day | $40/month (40K/day) |
| NewsAPI | 100/day | $449/month (250K/day) |
| OpenAI | $5 credit | Pay-as-you-go |

## 🔒 Security Best Practices

1. **Never commit** `.env.local` to git (already in `.gitignore`)
2. **Rotate keys** regularly
3. **Use environment variables** in production
4. **Monitor usage** to avoid unexpected charges
5. **Set spending limits** on paid APIs

## 💰 Cost Optimization

- Use **CoinGecko** instead of paid crypto APIs (free!)
- Use **mock data** for development/testing
- Cache API responses when possible
- Set rate limits on your endpoints

## 🆘 Troubleshooting

**"API key not set" warning?**
- Normal! API works with mock data
- Add key to `.env.local` for real data

**"API unavailable" error?**
- Check your API key is correct
- Verify you haven't exceeded rate limits
- Check service status page

**API key not working?**
- Restart dev server: `npm run dev`
- Check key has proper permissions
- Verify billing is set up (for paid APIs)

## 📚 Next Steps

1. Start with **free APIs** (QR Code, CoinGecko)
2. Add **weather/news** for more features
3. Add **OpenAI** for premium AI features
4. Monitor usage and upgrade as needed

All APIs are **production-ready** right now! 🚀

