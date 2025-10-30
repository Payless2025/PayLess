# Assets Folder

This folder contains branding assets for Payless.

## Logo Files

Add your logo files here:

- `logo.svg` - Main logo (SVG format preferred)
- `logo.png` - PNG version for compatibility
- `logo-white.svg` - White version for dark backgrounds
- `favicon.ico` - Browser favicon
- `og-image.png` - Open Graph image for social media (1200x630px)

## Usage

```tsx
// In your React components
import Image from 'next/image';

<Image 
  src="/assets/logo.svg" 
  alt="Payless Logo" 
  width={200} 
  height={50}
/>
```

## Brand Guidelines

**Payless Brand Identity:**
- Primary emoji: 💰
- Colors: Purple gradient (from-purple-500 to-blue-500)
- Tagline: "Accept Crypto Payments Without Accounts"
- Focus: Simplicity, zero fees, developer-friendly

Once you add your logo files, you can reference them throughout the application.

