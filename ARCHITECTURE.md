# 🏗️ Payless - System Architecture

Understanding how Payless works under the hood.

---

## 📊 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                         │
│  ┌──────────────────┐           ┌──────────────────────────┐   │
│  │  Landing Page    │           │   API Playground         │   │
│  │  - Hero          │           │   - Test Endpoints       │   │
│  │  - Features      │           │   - Payment Demo         │   │
│  │  - Examples      │           │   - Response Viewer      │   │
│  └──────────────────┘           └──────────────────────────┘   │
└─────────────────────┬───────────────────────┬───────────────────┘
                      │                       │
                      │ HTTP/HTTPS            │ API Requests
                      │                       │
┌─────────────────────▼───────────────────────▼───────────────────┐
│                   NEXT.JS SERVER (Serverless)                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    API Routes Layer                        │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │ │
│  │  │ /api/health  │  │ /api/ai/chat │  │ /api/data/*  │   │ │
│  │  │   (FREE)     │  │   ($0.05)    │  │   ($0.01+)   │   │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │ │
│  └───────────────────────┬────────────────────────────────────┘ │
│                          │                                       │
│  ┌───────────────────────▼────────────────────────────────────┐ │
│  │              x402 Payment Middleware                       │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │  1. Check for X-Payment header                       │ │ │
│  │  │  2. If missing → Return 402 Payment Required         │ │ │
│  │  │  3. If present → Verify payment payload              │ │ │
│  │  │  4. Check amount, recipient, signature               │ │ │
│  │  │  5. If valid → Allow request                         │ │ │
│  │  │  6. If invalid → Return 402 with error               │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  └───────────────────────┬────────────────────────────────────┘ │
└──────────────────────────┼──────────────────────────────────────┘
                           │
                           │ Verification Request
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                    x402 Facilitator                              │
│  - Verify payment signatures                                     │
│  - Check blockchain state                                        │
│  - Settle transactions on-chain                                  │
│  - Return confirmation                                           │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           │ On-chain Transaction
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                       Blockchain                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Base / Ethereum / Polygon                                 │ │
│  │  - USDC Token Transfer                                     │ │
│  │  - From: User Wallet                                       │ │
│  │  - To: Merchant Wallet                                     │ │
│  │  - Amount: API Price                                       │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Payment Flow Sequence

```
┌────────┐        ┌────────┐        ┌──────────┐        ┌────────────┐
│ Client │        │ Server │        │ x402 MW  │        │Facilitator │
└───┬────┘        └───┬────┘        └────┬─────┘        └─────┬──────┘
    │                 │                  │                     │
    │ 1. GET /api/ai/chat (no payment)  │                     │
    ├────────────────>│                  │                     │
    │                 │                  │                     │
    │                 │ 2. Check payment │                     │
    │                 ├─────────────────>│                     │
    │                 │                  │                     │
    │                 │ 3. No payment!   │                     │
    │                 │<─────────────────┤                     │
    │                 │                  │                     │
    │ 4. 402 Payment Required            │                     │
    │<────────────────┤                  │                     │
    │ {                                  │                     │
    │   amount: "0.05",                  │                     │
    │   recipient: "0x...",              │                     │
    │   facilitator: "https://..."       │                     │
    │ }                                  │                     │
    │                 │                  │                     │
    │ 5. Sign payment payload            │                     │
    │    (User wallet)│                  │                     │
    │                 │                  │                     │
    │ 6. POST /api/ai/chat               │                     │
    │    X-Payment: {signed payload}     │                     │
    ├────────────────>│                  │                     │
    │                 │                  │                     │
    │                 │ 7. Verify payment│                     │
    │                 ├─────────────────>│                     │
    │                 │                  │                     │
    │                 │                  │ 8. Verify signature │
    │                 │                  ├────────────────────>│
    │                 │                  │                     │
    │                 │                  │ 9. Signature valid! │
    │                 │                  │<────────────────────┤
    │                 │                  │    + tx hash        │
    │                 │                  │                     │
    │                 │ 10. Payment OK   │                     │
    │                 │<─────────────────┤                     │
    │                 │                  │                     │
    │                 │ 11. Process req  │                     │
    │                 │     (business    │                     │
    │                 │      logic)      │                     │
    │                 │                  │                     │
    │ 12. 200 OK + Response Data         │                     │
    │<────────────────┤                  │                     │
    │ {                                  │                     │
    │   success: true,                   │                     │
    │   data: {...}                      │                     │
    │ }                                  │                     │
    │                 │                  │                     │
```

---

## 🧩 Component Architecture

### Frontend Layer

```
app/
├── page.tsx                    # Landing page (SSR)
│   ├── <Hero />               # Animated hero section
│   ├── <Features />           # Feature grid
│   ├── <CodeExample />        # Code samples
│   ├── <UseCases />           # Use case cards
│   └── <Footer />             # Footer with links
│
├── playground/page.tsx         # API testing interface (Client-side)
│   ├── Endpoint selector
│   ├── Request builder
│   ├── Response viewer
│   └── Payment simulator
│
└── globals.css                 # Global styles + animations
```

### Backend Layer

```
app/api/
├── health/route.ts             # Health check (FREE)
├── info/route.ts               # API documentation (FREE)
│
├── ai/
│   ├── chat/route.ts          # AI chat ($0.05)
│   └── image/route.ts         # AI image gen ($0.10)
│
├── data/
│   ├── weather/route.ts       # Weather API ($0.01)
│   └── stock/route.ts         # Stock data ($0.02)
│
└── premium/
    └── content/route.ts       # Premium content ($1.00)
```

### x402 Protocol Layer

```
lib/x402/
├── types.ts                    # TypeScript interfaces
│   ├── PaymentConfig
│   ├── PaymentVerificationResult
│   ├── X402Response
│   └── PaymentPayload
│
├── config.ts                   # Configuration
│   ├── PAYMENT_CONFIG          # Wallet, facilitator, network
│   ├── ENDPOINT_PRICING        # Price per endpoint
│   └── FREE_ENDPOINTS          # No payment required
│
├── middleware.ts               # Core middleware
│   ├── verifyPayment()        # Verify payment payload
│   ├── create402Response()    # Create 402 response
│   ├── withX402Payment()      # Wrap handler function
│   └── getEndpointPrice()     # Get endpoint pricing
│
└── client.ts                   # Client utilities
    ├── createPaymentPayload()  # Create payment data
    ├── signPaymentPayload()    # Sign payment
    ├── makePaymentRequest()    # Auto-pay request
    └── createMockPayment()     # Demo mode helper
```

---

## 🔐 Payment Verification Process

```
┌────────────────────────────────────────────────────────────────┐
│                    Payment Verification                         │
└────────────────────────────────────────────────────────────────┘

1. Extract X-Payment Header
   ├─ If missing → Return 402 Payment Required
   └─ If present → Continue to step 2

2. Parse Payment Payload
   ├─ from: "0x..." (payer wallet)
   ├─ to: "0x..." (recipient wallet)
   ├─ amount: "0.05" (payment amount)
   ├─ token: "USDC" (payment token)
   ├─ nonce: "abc123" (unique ID)
   ├─ signature: "0x..." (cryptographic signature)
   └─ timestamp: 1234567890 (when signed)

3. Validate Recipient
   ├─ Check if 'to' matches configured wallet
   └─ If mismatch → Return error

4. Validate Amount
   ├─ Check if amount >= required price
   └─ If insufficient → Return error

5. Validate Timestamp
   ├─ Check if timestamp is recent (< 5 minutes)
   └─ If expired → Return error

6. Verify Signature (via Facilitator)
   ├─ Send payload to facilitator
   ├─ Facilitator checks on-chain state
   ├─ Facilitator verifies cryptographic signature
   └─ Return verification result + tx hash

7. Grant Access
   ├─ If all checks pass → Execute business logic
   └─ Return response with X-Payment-Confirmed header
```

---

## 💾 Data Flow

### Request without Payment

```
Client                    Server                   Response
  │                         │                         │
  │  GET /api/ai/chat      │                         │
  ├────────────────────────>│                         │
  │                         │                         │
  │                         │ Check: No X-Payment    │
  │                         │                         │
  │                         │ Create 402 Response     │
  │                         │                         │
  │                      402 Payment Required         │
  │<────────────────────────┤                         │
  │ {                       │                         │
  │   status: 402,          │                         │
  │   message: "Payment     │                         │
  │            Required",   │                         │
  │   payment: {            │                         │
  │     amount: "0.05",     │                         │
  │     recipient: "0x...", │                         │
  │     ...                 │                         │
  │   }                     │                         │
  │ }                       │                         │
```

### Request with Valid Payment

```
Client                    Server                   Business Logic
  │                         │                         │
  │  POST /api/ai/chat     │                         │
  │  X-Payment: {...}      │                         │
  ├────────────────────────>│                         │
  │                         │                         │
  │                         │ Verify Payment ✓        │
  │                         │                         │
  │                         │ Execute Handler         │
  │                         ├────────────────────────>│
  │                         │                         │
  │                         │                    Process Request
  │                         │                    (AI, DB, etc.)
  │                         │                         │
  │                         │      Return Result      │
  │                         │<────────────────────────┤
  │                         │                         │
  │         200 OK          │                         │
  │<────────────────────────┤                         │
  │ {                       │                         │
  │   success: true,        │                         │
  │   data: {...}           │                         │
  │ }                       │                         │
  │ X-Payment-Confirmed:    │                         │
  │   0x1234...             │                         │
```

---

## 🎨 UI Component Tree

```
app/page.tsx (Landing)
├── Hero
│   ├── Animated Background
│   │   ├── Floating Orb 1 (purple)
│   │   ├── Floating Orb 2 (blue)
│   │   └── Floating Orb 3 (pink)
│   ├── Badge (x402 Protocol)
│   ├── Heading
│   ├── Subheading
│   ├── CTA Buttons
│   │   ├── Try Demo → /playground
│   │   └── Learn More → #features
│   └── Feature Cards (3 columns)
│       ├── Instant Settlement
│       ├── Zero Fees
│       └── Blockchain Agnostic
│
├── Features
│   └── Feature Grid (6 items)
│       ├── One Line of Code
│       ├── Perfect for AI Agents
│       ├── True Micropayments
│       ├── Privacy First
│       ├── Web Native
│       └── Serverless Ready
│
├── CodeExample
│   ├── Server Code Block
│   │   ├── Syntax Highlighting
│   │   └── Copy Button
│   ├── Client Code Block
│   └── Stats (Setup time, Fees, Settlement)
│
├── UseCases
│   └── Use Case Grid (6 items)
│       ├── AI API Gateway
│       ├── Image Generation
│       ├── Market Data API
│       ├── Cloud Storage
│       ├── Premium Content
│       └── Compute Functions
│
└── Footer
    ├── Brand Section
    ├── Product Links
    ├── Resources Links
    └── Copyright
```

```
app/playground/page.tsx
├── Header
│   ├── Back to Home Link
│   └── Title
│
├── Sidebar
│   ├── Endpoints List
│   │   ├── AI Chat ($0.05)
│   │   ├── AI Image ($0.10)
│   │   ├── Weather ($0.01)
│   │   ├── Stock ($0.02)
│   │   └── Premium ($1.00)
│   └── Demo Mode Notice
│
└── Main Content
    ├── Endpoint Details
    │   ├── Path & Description
    │   ├── Method & Price Tags
    │   ├── Parameters List
    │   └── Request Body Editor
    │
    ├── Action Buttons
    │   ├── Try Without Payment
    │   └── Try With Payment
    │
    └── Response Viewer
        ├── Error Message (if any)
        ├── JSON Response
        └── Copy Button
```

---

## 🔄 State Management

### Server State
- No database required
- Stateless serverless functions
- Each request is independent
- Payment verification per request

### Client State (Playground)
```typescript
useState<ApiEndpoint>       // Selected endpoint
useState<boolean>           // Loading state
useState<any>               // Response data
useState<string | null>     // Error message
useState<boolean>           // Payment required flag
useState<boolean>           // Copy button state
useState<string>            // Request body JSON
```

---

## 🚀 Deployment Architecture

### Vercel Deployment

```
┌─────────────────────────────────────────────────────────────┐
│                        Vercel Edge Network                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              CDN (Static Assets)                      │  │
│  │  - CSS, JS, Images                                    │  │
│  │  - Cached at edge locations                           │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         Serverless Functions (API Routes)             │  │
│  │  - Auto-scaling                                        │  │
│  │  - Pay per execution                                   │  │
│  │  - Global distribution                                 │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/HTTPS
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                       User Traffic                           │
│  - Routed to nearest edge location                          │
│  - Low latency                                              │
│  - High availability                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Configuration Hierarchy

```
Environment Variables (.env)
    ↓
Config File (lib/x402/config.ts)
    ↓
Middleware (lib/x402/middleware.ts)
    ↓
API Routes (app/api/*/route.ts)
    ↓
Client Requests
```

---

## 📊 Performance Characteristics

| Metric | Value | Notes |
|--------|-------|-------|
| **Cold Start** | ~500ms | First request to function |
| **Warm Start** | <100ms | Subsequent requests |
| **Payment Verification** | ~200ms | Facilitator round-trip |
| **Total Latency** | <500ms | End-to-end with payment |
| **Throughput** | 1000s/sec | Serverless auto-scaling |
| **Availability** | 99.9%+ | Vercel SLA |

---

## 🔐 Security Layers

```
1. Transport Layer
   └─ HTTPS/TLS encryption

2. Application Layer
   ├─ Payment signature verification
   ├─ Timestamp validation
   ├─ Amount verification
   └─ Recipient validation

3. Protocol Layer
   └─ x402 facilitator verification

4. Blockchain Layer
   └─ On-chain transaction verification

5. Infrastructure Layer
   ├─ Environment variable secrets
   ├─ No private keys in code
   └─ Vercel secure deployment
```

---

## 🎯 Scaling Strategy

```
Traffic Pattern:
  Low Traffic → Single serverless instance
  Medium Traffic → Auto-scale to N instances
  High Traffic → Edge caching + N instances
  Spike → Instant auto-scaling

Cost Model:
  Pay per request (not per server)
  No idle costs
  Automatic optimization
```

---

## 📈 Monitoring Points

```
┌─────────────────────────────────────────────────────────────┐
│                    Monitoring Stack                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. API Endpoint Metrics                                    │
│     - Request count                                          │
│     - Response time                                          │
│     - Error rate                                             │
│     - Status code distribution                               │
│                                                              │
│  2. Payment Metrics                                          │
│     - Payment success rate                                   │
│     - Payment amount distribution                            │
│     - Verification time                                      │
│     - Failed payment reasons                                 │
│                                                              │
│  3. Business Metrics                                         │
│     - Revenue per endpoint                                   │
│     - Most popular endpoints                                 │
│     - User geography                                         │
│     - Peak usage times                                       │
│                                                              │
│  4. Infrastructure Metrics                                   │
│     - Function execution time                                │
│     - Cold start frequency                                   │
│     - Memory usage                                           │
│     - Network latency                                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎓 Key Design Decisions

### 1. Serverless Architecture
**Why:** Zero infrastructure management, auto-scaling, pay-per-use

### 2. Next.js App Router
**Why:** Best-in-class React framework, built-in API routes, great DX

### 3. TypeScript
**Why:** Type safety, better IDE support, fewer runtime errors

### 4. Tailwind CSS
**Why:** Rapid UI development, modern styling, great performance

### 5. x402 Protocol
**Why:** Standard protocol, no vendor lock-in, HTTP-native

### 6. Demo Mode Default
**Why:** Easy testing without crypto, lower barrier to entry

### 7. Middleware Pattern
**Why:** Clean separation, reusable, easy to understand

### 8. No Database
**Why:** Stateless = simpler, cheaper, more scalable

---

This architecture is designed to be:
- ✅ **Simple** - Easy to understand and modify
- ✅ **Scalable** - Handles traffic spikes automatically
- ✅ **Secure** - Multiple layers of protection
- ✅ **Fast** - Low latency, edge distribution
- ✅ **Cost-effective** - Pay only for what you use
- ✅ **Maintainable** - Clear structure, good docs

---

For implementation details, see:
- [README.md](README.md) - Full documentation
- [lib/x402/](lib/x402/) - Protocol implementation
- [app/api/](app/api/) - API endpoints

