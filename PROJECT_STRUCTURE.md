# Payless - Project Structure

Clean, organized structure for production deployment.

## 📁 Directory Structure

```
Payless/
├── app/                      # Next.js App Router
│   ├── api/                  # API Routes with x402 payments
│   │   ├── ai/              # AI endpoints ($0.05-$0.10)
│   │   ├── data/            # Data endpoints ($0.01-$0.02)
│   │   ├── premium/         # Premium content ($1.00)
│   │   ├── health/          # Health check (free)
│   │   └── info/            # API info (free)
│   ├── playground/          # Interactive API testing
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Homepage
│
├── components/              # React Components
│   ├── Header.tsx          # Navigation header
│   ├── Hero.tsx            # Hero section with video
│   ├── Features.tsx        # Features grid
│   ├── CodeExample.tsx     # Code examples
│   ├── UseCases.tsx        # Use case cards
│   ├── Strengths.tsx       # Why Payless section
│   └── Footer.tsx          # Footer with CA
│
├── lib/                     # Core Libraries
│   └── x402/               # x402 Protocol Implementation
│       ├── types.ts        # TypeScript types
│       ├── config.ts       # Configuration
│       ├── middleware.ts   # Payment middleware
│       └── client.ts       # Client utilities
│
├── public/                  # Static Assets
│   └── assets/             # Brand assets
│       ├── logo-horizontal.png
│       ├── logo-vertical.png
│       ├── logo.jpeg
│       ├── logo-dark-bg.jpeg
│       └── background-video.mp4
│
├── docs/                    # GitBook Documentation
│   ├── README.md           # Introduction
│   ├── SUMMARY.md          # Table of contents
│   ├── quickstart.md       # Quick start guide
│   ├── api-reference.md    # API documentation
│   └── examples/           # Code examples
│
├── README.md               # Main readme
├── LICENSE                 # MIT License
├── package.json            # Dependencies
├── tsconfig.json           # TypeScript config
├── tailwind.config.js      # Tailwind config
├── next.config.js          # Next.js config
└── vercel.json             # Vercel deployment config
```

## 🎯 Key Files

### Configuration
- `next.config.js` - Next.js configuration
- `tailwind.config.js` - Tailwind CSS styling
- `tsconfig.json` - TypeScript settings
- `.env` - Environment variables (not in repo)

### Core Implementation
- `lib/x402/middleware.ts` - Payment middleware wrapper
- `lib/x402/config.ts` - Pricing and wallet config
- `lib/x402/client.ts` - Client-side utilities

### Components
- `components/Header.tsx` - Fixed navigation
- `components/Hero.tsx` - Landing with video background
- `components/Footer.tsx` - Footer with CA section

## 📚 Documentation

All documentation is now in GitBook:
- **Live Docs:** https://github.com/Payless2025/PayLess/tree/master/docs
- **Source:** `/docs` folder (syncs with GitBook)

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your wallet address

# Run development
npm run dev

# Build for production
npm run build

# Deploy to Vercel
vercel
```

## 🔗 Links

- **GitHub:** https://github.com/Payless2025/PayLess
- **Docs:** https://github.com/Payless2025/PayLess/tree/master/docs
- **X/Twitter:** https://x.com/paylessnetwork
- **x402 Protocol:** https://x402.org

## 📦 What's Included

✅ Serverless payment API platform
✅ x402 protocol integration
✅ Multiple example endpoints
✅ Interactive playground
✅ Beautiful landing page
✅ Professional documentation
✅ Mobile responsive design
✅ Production ready

## 🎨 Brand Assets

All logos and assets in `/public/assets/`:
- Horizontal logo for headers
- Vertical logo for squares/icons
- Background video for hero
- Light and dark versions

## 📝 Notes

- Clean structure focused on essentials
- No duplicate documentation
- GitBook handles all docs
- Ready for production deployment

