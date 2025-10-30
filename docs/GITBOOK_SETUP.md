# GitBook Setup Guide for Payless

## 🚀 Quick Setup (5 minutes)

### Step 1: Create GitBook Account

1. Go to https://www.gitbook.com/
2. Click **"Sign up"**
3. Sign in with **GitHub** (easiest option)
4. Confirm your email

### Step 2: Create Documentation Space

1. In GitBook dashboard, click **"New Space"**
2. Name: **"Payless Documentation"**
3. Choose one of these options:

**Option A: Import from GitHub (Recommended)**
- Select "Import from GitHub"
- Choose repository: `Payless2025/PayLess`
- Select folder: `/docs`
- GitBook will auto-sync with your repo!

**Option B: Manual Setup**
- Choose "Start from scratch"
- Manually copy content from `/docs` folder

### Step 3: Configure Your Space

1. **Settings** → **General**
   - Title: "Payless Documentation"
   - Description: "Complete guide to building paid APIs with x402 on Solana"
   
2. **Settings** → **Appearance**
   - Logo: Upload `/public/assets/logo-vertical.png`
   - Primary color: `#9333EA` (purple-600)
   - Theme: Light

3. **Settings** → **Domain** (Optional)
   - Custom domain: `docs.payless.com`
   - Or use: `payless.gitbook.io/payless`

### Step 4: Organize Content

GitBook will use `SUMMARY.md` for navigation:

```
docs/
├── README.md          → Homepage
├── SUMMARY.md         → Table of Contents (navigation)
├── quickstart.md      → Quick Start Guide
├── api-reference.md   → API Documentation
└── examples/          → Code Examples
```

### Step 5: Enable Git Sync (Recommended)

1. Go to **Integrations** → **GitHub**
2. Click **"Connect"**
3. Authorize GitBook
4. Select: `Payless2025/PayLess` repo
5. Branch: `master`
6. Path: `/docs`

Now every push to `/docs` folder auto-updates your documentation! 🎉

### Step 6: Publish

1. Click **"Publish"** button (top right)
2. Choose: **"Public"** (free plan)
3. Your docs are live!

## 📝 Your GitBook URL

After setup, you'll get a URL like:
- Free: `https://payless.gitbook.io/payless`
- Custom: `https://docs.payless.com` (requires DNS setup)

## 🔗 Update Your Website

Once published, update the docs link in your header:

```typescript
// components/Header.tsx
<a href="https://payless.gitbook.io/payless">
  Docs
</a>
```

## 📚 Documentation Structure

Your documentation includes:

### Getting Started
- Introduction to Payless
- 5-minute quick start
- Installation guide

### API Reference
- Middleware functions
- Configuration options
- Type definitions
- Error handling

### Examples
- AI API Gateway
- Image Generation API
- Premium Content

### Resources
- FAQ
- Troubleshooting
- Links to GitHub

## ✨ GitBook Features You Get (Free)

- ✅ Beautiful, searchable documentation
- ✅ Auto-generated table of contents
- ✅ Syntax highlighting for code
- ✅ API documentation blocks
- ✅ Mobile responsive
- ✅ Git sync (auto-update)
- ✅ Custom domain support
- ✅ Analytics
- ✅ SEO optimized

## 🎨 Branding

Make sure to:
1. Upload logo (`logo-vertical.png`)
2. Set primary color: `#9333EA`
3. Add GitHub link in footer
4. Add Twitter link in footer

## 🔄 Keep Docs Updated

With Git Sync enabled:
1. Edit files in `/docs` folder
2. Commit and push to GitHub
3. GitBook auto-updates in ~1 minute

## 📊 Analytics (Optional)

GitBook includes basic analytics:
- Page views
- Popular pages
- Search queries
- User flow

## 💡 Pro Tips

1. **Use code blocks** - GitBook has great syntax highlighting
2. **Add images** - Place in `/docs/images/` and reference them
3. **Use callouts** - Highlight important info with hint blocks
4. **Test locally** - Preview docs before publishing
5. **Enable search** - Automatic with GitBook

## 🆘 Troubleshooting

**Git Sync not working?**
- Check GitHub permissions
- Verify `/docs` path is correct
- Push to correct branch (master)

**Docs not updating?**
- Wait 1-2 minutes for sync
- Check GitBook activity log
- Manually trigger sync in settings

**404 on custom domain?**
- DNS can take 24-48 hours
- Verify CNAME record
- Check SSL certificate

## 📞 Support

- GitBook Docs: https://docs.gitbook.com
- GitBook Support: support@gitbook.com
- Payless GitHub: https://github.com/Payless2025/PayLess/issues

---

Ready to publish beautiful docs! 📚✨

