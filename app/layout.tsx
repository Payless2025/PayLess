import type { Metadata } from 'next'
import { IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'
import { ClientProviders } from '@/components/ClientProviders'

const sans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
})

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
})

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
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body className="font-sans bg-bg text-text antialiased">
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  )
}
