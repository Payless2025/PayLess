# Payless API Endpoints

Complete list of available API endpoints with pricing and usage examples.

## AI Services

### 1. AI Chat Completion
**Endpoint:** `POST /api/ai/chat`  
**Price:** $0.05 USDC  
**Description:** Get AI-powered responses for chat conversations

```json
{
  "message": "Hello, tell me about x402 protocol",
  "model": "gpt-4"
}
```

### 2. AI Image Generation
**Endpoint:** `POST /api/ai/image`  
**Price:** $0.10 USDC  
**Description:** Create images from text descriptions

```json
{
  "prompt": "A futuristic payment terminal",
  "size": "1024x1024"
}
```

### 3. Language Translation
**Endpoint:** `POST /api/ai/translate`  
**Price:** $0.03 USDC  
**Description:** Translate text between multiple languages

**Supported Languages:** Spanish (es), French (fr), German (de), Japanese (ja), Chinese (zh)

```json
{
  "text": "Hello, how are you?",
  "targetLanguage": "es",
  "sourceLanguage": "auto"
}
```

### 4. Text-to-Speech
**Endpoint:** `POST /api/ai/tts`  
**Price:** $0.08 USDC  
**Description:** Convert text to audio with multiple voice options

```json
{
  "text": "Welcome to Payless payment system",
  "voice": "female",
  "language": "en"
}
```

## Data Services

### 5. Weather Data
**Endpoint:** `GET /api/data/weather?city={city}`  
**Price:** $0.01 USDC  
**Description:** Get current weather information for any city

**Example:** `/api/data/weather?city=London`

### 6. Stock Market Data
**Endpoint:** `GET /api/data/stock?symbol={symbol}`  
**Price:** $0.02 USDC  
**Description:** Get real-time stock quotes and market data

**Example:** `/api/data/stock?symbol=AAPL`

### 7. Cryptocurrency Prices
**Endpoint:** `GET /api/data/crypto?symbol={symbol}`  
**Price:** $0.015 USDC  
**Description:** Get real-time cryptocurrency market data

**Supported Symbols:** BTC, ETH, SOL, USDC, BNB

**Example:** `/api/data/crypto?symbol=SOL`

### 8. News Aggregation
**Endpoint:** `GET /api/data/news?category={category}&limit={limit}`  
**Price:** $0.025 USDC  
**Description:** Get latest news articles by category

**Categories:** technology, crypto, business, science, all

**Example:** `/api/data/news?category=technology&limit=5`

## Tools & Utilities

### 9. QR Code Generator
**Endpoint:** `POST /api/tools/qrcode`  
**Price:** $0.005 USDC  
**Description:** Generate QR codes from text or URLs

```json
{
  "data": "https://payless.example.com",
  "size": "256",
  "format": "png"
}
```

## Premium Content

### 10. Premium Content Access
**Endpoint:** `GET /api/premium/content?id={id}`  
**Price:** $1.00 USDC  
**Description:** Access exclusive articles and premium content

**Example:** `/api/premium/content?id=article-123`

## Free Endpoints

### Health Check
**Endpoint:** `GET /api/health`  
**Price:** FREE  
**Description:** Check API health status

### API Information
**Endpoint:** `GET /api/info`  
**Price:** FREE  
**Description:** Get API metadata and available endpoints

### Analytics Dashboard
**Endpoint:** `GET /api/analytics`  
**Price:** FREE  
**Description:** Access analytics data (developers only)

## Usage

All paid endpoints require payment via the x402 protocol. Include the `X-Payment` header with a signed payment proof:

```bash
curl -X POST https://api.payless.com/api/ai/chat \
  -H "Content-Type: application/json" \
  -H "X-Payment: {signed_payment}" \
  -d '{"message":"Hello"}'
```

## Pricing Summary

| Endpoint | Price | Use Case |
|----------|-------|----------|
| QR Code Generator | $0.005 | Cheapest - Generate QR codes |
| Weather Data | $0.01 | Low-cost data queries |
| Crypto Prices | $0.015 | Real-time market data |
| Stock Data | $0.02 | Financial market quotes |
| News Aggregation | $0.025 | Latest news articles |
| Translation | $0.03 | Multi-language translation |
| AI Chat | $0.05 | Conversational AI |
| Text-to-Speech | $0.08 | Audio generation |
| Image Generation | $0.10 | AI-powered images |
| Premium Content | $1.00 | Exclusive articles |

## Testing

Try all endpoints interactively in our [Playground](https://payless.com/playground).

## Integration

Add payment requirements to your own API with one line of code:

```typescript
import { withX402Payment } from '@/lib/x402/middleware';

async function handler(req: NextRequest) {
  // Your API logic here
  return NextResponse.json({ data: "..." });
}

export const POST = withX402Payment(handler, "0.05");
```

For more information, visit our [Documentation](https://payless.gitbook.io/payless-documentation).

