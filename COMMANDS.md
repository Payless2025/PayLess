# 🎯 Payless - Command Reference

Quick reference for all commands you'll need.

---

## 🚀 Getting Started

```bash
# Navigate to project
cd /Users/hakkioz/Desktop/Payless

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env (add your wallet address)
nano .env
# or
open .env

# Start development server
npm run dev
```

---

## 📦 Development Commands

```bash
# Start development server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Format code (if prettier is installed)
npm run format
```

---

## 🧪 Testing Commands

```bash
# Test health endpoint
curl http://localhost:3000/api/health

# Test info endpoint
curl http://localhost:3000/api/info

# Test paid endpoint (will return 402)
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello!"}'

# Test weather endpoint
curl http://localhost:3000/api/data/weather?city=London

# Test stock endpoint
curl http://localhost:3000/api/data/stock?symbol=AAPL
```

---

## 🚀 Deployment Commands

### Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod

# Set environment variable
vercel env add WALLET_ADDRESS
```

### Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy
netlify deploy

# Deploy to production
netlify deploy --prod
```

### Docker

```bash
# Build Docker image
docker build -t payless .

# Run container
docker run -p 3000:3000 --env-file .env payless

# Docker Compose
docker-compose up -d
```

---

## 🔧 Environment Variables

```bash
# View current environment
printenv | grep WALLET

# Set environment variable (macOS/Linux)
export WALLET_ADDRESS=0xYourAddress
export FACILITATOR_URL=https://facilitator.x402.org

# Set environment variable (Windows)
set WALLET_ADDRESS=0xYourAddress
set FACILITATOR_URL=https://facilitator.x402.org
```

---

## 📝 Git Commands

```bash
# Initialize git repository
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit"

# Add remote
git remote add origin https://github.com/yourusername/payless.git

# Push to GitHub
git push -u origin main

# Create new branch
git checkout -b feature/new-endpoint

# Merge branch
git checkout main
git merge feature/new-endpoint
```

---

## 🛠️ Useful Development Commands

```bash
# Check Node version
node --version

# Check npm version
npm --version

# Clear npm cache
npm cache clean --force

# Update dependencies
npm update

# Check for outdated packages
npm outdated

# Install specific package
npm install package-name

# Install dev dependency
npm install --save-dev package-name

# Remove package
npm uninstall package-name

# List installed packages
npm list --depth=0
```

---

## 🔍 Debugging Commands

```bash
# Check if port 3000 is in use (macOS/Linux)
lsof -i :3000

# Kill process on port 3000 (macOS/Linux)
lsof -ti:3000 | xargs kill -9

# Check if port 3000 is in use (Windows)
netstat -ano | findstr :3000

# View logs
npm run dev -- --verbose

# Clear Next.js cache
rm -rf .next
npm run dev
```

---

## 📊 Monitoring Commands

```bash
# Monitor file changes
watch -n 1 'curl -s http://localhost:3000/api/health | jq'

# Check response time
time curl http://localhost:3000/api/info

# Load testing (if wrk installed)
wrk -t12 -c400 -d30s http://localhost:3000/api/health

# Monitor server logs
tail -f logs/server.log
```

---

## 🧹 Cleanup Commands

```bash
# Remove node_modules
rm -rf node_modules

# Remove build artifacts
rm -rf .next
rm -rf out

# Remove all generated files
rm -rf node_modules .next out

# Fresh install
rm -rf node_modules package-lock.json
npm install
```

---

## 📱 Quick Access URLs

```bash
# Development
http://localhost:3000              # Landing page
http://localhost:3000/playground   # Playground
http://localhost:3000/api/info     # API info
http://localhost:3000/api/health   # Health check

# Production (after deployment)
https://your-app.vercel.app
https://your-app.netlify.app
```

---

## 🔐 Security Commands

```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Force fix vulnerabilities
npm audit fix --force

# Check security with snyk (if installed)
npx snyk test
```

---

## 📦 Package Management

```bash
# Update to latest Next.js
npm install next@latest react@latest react-dom@latest

# Update all dependencies to latest
npm update --latest

# Check bundle size
npm run build && du -sh .next

# Analyze bundle (if @next/bundle-analyzer installed)
ANALYZE=true npm run build
```

---

## 🧪 Testing with curl

```bash
# Pretty print JSON
curl http://localhost:3000/api/info | jq

# Save response to file
curl http://localhost:3000/api/info > response.json

# Include headers in output
curl -i http://localhost:3000/api/health

# Follow redirects
curl -L http://localhost:3000

# Set custom header
curl -H "X-Custom-Header: value" http://localhost:3000/api/info

# POST with JSON body
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "test"}'

# Measure response time
curl -w "\nTime: %{time_total}s\n" http://localhost:3000/api/health
```

---

## 💡 Pro Tips

```bash
# Open in default browser (macOS)
open http://localhost:3000

# Open in default browser (Linux)
xdg-open http://localhost:3000

# Open in default browser (Windows)
start http://localhost:3000

# Watch for file changes and reload
npm run dev -- --turbo

# Run on different port
PORT=3001 npm run dev

# Run with debug mode
DEBUG=* npm run dev
```

---

## 📚 Documentation Commands

```bash
# View README
cat README.md

# View README in browser (macOS)
open README.md

# View Quick Start
cat QUICKSTART.md

# View Setup Guide
cat SETUP.md

# View Project Overview
cat PROJECT_OVERVIEW.md
```

---

## 🎯 Common Workflows

### New Feature Development
```bash
git checkout -b feature/my-feature
# ... make changes ...
npm run dev  # test locally
git add .
git commit -m "Add new feature"
git push origin feature/my-feature
```

### Quick Deploy
```bash
git add .
git commit -m "Update"
git push
vercel --prod
```

### Fresh Start
```bash
rm -rf node_modules .next
npm install
npm run dev
```

---

## 🆘 Troubleshooting

```bash
# If dev server won't start
lsof -ti:3000 | xargs kill -9
npm run dev

# If packages won't install
rm -rf node_modules package-lock.json
npm cache clean --force
npm install

# If build fails
rm -rf .next
npm run build

# If TypeScript errors
npm run lint
```

---

**💡 Tip:** Bookmark this file for quick reference!

For more help, see:
- [README.md](README.md) - Full documentation
- [QUICKSTART.md](QUICKSTART.md) - Quick start guide
- [SETUP.md](SETUP.md) - Setup instructions

