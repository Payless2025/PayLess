import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ClientProviders } from '@/components/ClientProviders'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Payless - Accept Crypto Payments Without Accounts | x402 on Robinhood Chain',
  description: 'Payless: The simplest way to monetize APIs with crypto. Built on the x402 protocol for Robinhood Chain. Zero fees, instant settlements, one line of code. Perfect for developers and AI agents.',
  keywords: 'payless, x402, crypto payments, robinhood chain, USDG, micropayments, serverless, blockchain, API monetization, AI agent payments, no accounts',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  )
}

