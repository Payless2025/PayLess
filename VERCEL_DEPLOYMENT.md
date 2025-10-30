# Vercel Deployment Guide

## 🚨 Current Issue: Deployment Not Triggering

Your project is pushed to GitHub but Vercel isn't automatically deploying.

### Project Info
- **Project ID:** `prj_2FjpNA7CqeJXudEIAu9GpSttwB09`
- **Repository:** https://github.com/Payless2025/PayLess

---

## ✅ Step-by-Step Fix

### 1. Check GitHub Integration

Go to your Vercel dashboard:
```
https://vercel.com/payless2025/payless
```

**Check:**
- ✅ Is GitHub repository connected?
- ✅ Is the correct branch set (master)?
- ✅ Are deployment triggers enabled?

**To Fix:**
1. Go to Project Settings → Git
2. Click "Connect Git Repository"
3. Select: `Payless2025/PayLess`
4. Branch: `master`
5. Enable "Production Branch" for master

---

### 2. Set Environment Variables

**CRITICAL:** Your app needs these environment variables to work!

Go to: **Settings → Environment Variables**

Add these variables:

| Variable Name | Value | Environment |
|---------------|-------|-------------|
| `WALLET_ADDRESS` | Your Solana wallet address | Production, Preview, Development |
| `FACILITATOR_URL` | `https://facilitator.x402.org` | Production, Preview, Development |
| `NETWORK` | `mainnet-beta` or `devnet` | Production, Preview, Development |
| `RPC_URL` | `https://api.mainnet-beta.solana.com` | Production, Preview, Development |
| `USDC_MINT` | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` | Production, Preview, Development |

**Screenshot:** Make sure to check all three checkboxes (Production, Preview, Development)

---

### 3. Trigger Manual Deployment

After setting environment variables:

**Option A: Through Vercel Dashboard**
1. Go to Deployments tab
2. Click "Deploy" button
3. Select branch: `master`
4. Click "Deploy"

**Option B: Through CLI**
```bash
# Install Vercel CLI (if not installed)
npm i -g vercel

# Login
vercel login

# Link project
vercel link --project=prj_2FjpNA7CqeJXudEIAu9GpSttwB09

# Deploy
vercel --prod
```

**Option C: Push a new commit**
```bash
# Make a small change to trigger deployment
git commit --allow-empty -m "Trigger Vercel deployment"
git push origin master
```

---

### 4. Check Build Settings

Go to: **Settings → General**

**Verify these settings:**
```
Framework Preset: Next.js
Build Command: npm run build
Output Directory: .next
Install Command: npm install
Node.js Version: 18.x or higher
```

---

### 5. Common Issues & Solutions

#### Issue: "Build Failed"
**Solution:** Check build logs for errors
- Missing environment variables
- TypeScript errors
- Dependency issues

#### Issue: "No Deployment Triggered"
**Solution:** 
- Re-connect GitHub repository
- Check webhook settings
- Enable automatic deployments

#### Issue: "Environment Variables Not Working"
**Solution:**
- Redeploy after adding env vars
- Check variable names (exact match)
- Ensure all three environments are selected

#### Issue: "API Routes 402 Error"
**Solution:**
- Verify `WALLET_ADDRESS` is set
- Check wallet address is valid Solana address
- Test with `/api/health` endpoint first

---

## 🔍 Debugging Checklist

- [ ] GitHub repository connected to Vercel
- [ ] Branch set to `master`
- [ ] Environment variables added (all 5)
- [ ] Environment checkboxes selected (all 3)
- [ ] Build settings correct
- [ ] Node.js version >= 18
- [ ] Manual deployment triggered
- [ ] Check deployment logs for errors

---

## 📊 Expected Build Output

**Successful build should show:**
```
✓ Creating an optimized production build
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages (7/7)
✓ Finalizing page optimization

Route (app)                              Size     First Load JS
┌ ○ /                                    5.2 kB         87.3 kB
├ ○ /api/health                          0 B                0 B
├ ○ /api/info                            0 B                0 B
└ ○ /playground                          12.5 kB        94.6 kB
```

---

## 🚀 Quick Deploy Now

**Fastest way to deploy:**

```bash
cd /Users/hakkioz/Desktop/Payless

# Empty commit to trigger deployment
git commit --allow-empty -m "Deploy: Trigger Vercel build"
git push origin master
```

Then:
1. Go to https://vercel.com/payless2025
2. Click on your project
3. Watch "Deployments" tab
4. Build should start within 10 seconds

---

## 📝 After Successful Deployment

1. **Test your deployment:**
   - Visit: `https://your-project.vercel.app`
   - Try playground: `https://your-project.vercel.app/playground`
   - Test API: `https://your-project.vercel.app/api/health`

2. **Set Custom Domain (Optional):**
   - Settings → Domains
   - Add your custom domain
   - Update DNS records

3. **Update Links:**
   - Update README.md with live URL
   - Update social media profiles
   - Update documentation links

---

## 🆘 Still Not Working?

**Check Vercel Status:**
- https://www.vercel-status.com/

**Contact Support:**
- Vercel Support: https://vercel.com/support
- Include Project ID: `prj_2FjpNA7CqeJXudEIAu9GpSttwB09`

**Common Error Codes:**
- `402 Payment Required` - x402 middleware working! ✅
- `500 Internal Error` - Check environment variables
- `404 Not Found` - Check build output directory

---

## ✅ Success!

Once deployed, your site will be live at:
```
https://payless-[random].vercel.app
```

**Next Steps:**
1. Test all features
2. Set up custom domain
3. Monitor analytics
4. Share with community! 🎉

