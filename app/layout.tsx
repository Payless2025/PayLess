import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Payless - Serverless x402 Payment Platform',
  description: 'Accept crypto payments with x402 protocol. No accounts, no subscriptions, just pay and use.',
  keywords: 'x402, crypto payments, USDC, micropayments, serverless, blockchain',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}

