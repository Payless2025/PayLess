'use client';

import { Check, X, ExternalLink } from 'lucide-react';

const comparisonData = [
  {
    feature: 'Platform Focus',
    payless: 'Developer APIs & Serverless',
    payai: 'AI Agent Marketplace',
    paylessWins: false,
  },
  {
    feature: 'Setup Complexity',
    payless: 'One line of code',
    payai: 'Multiple SDKs & plugins',
    paylessWins: true,
  },
  {
    feature: 'Deployment',
    payless: 'Deploy anywhere (Vercel, AWS, etc.)',
    payai: 'Requires integration setup',
    paylessWins: true,
  },
  {
    feature: 'Target Users',
    payless: 'Any developer building APIs',
    payai: 'AI agents & CT monetization',
    paylessWins: false,
  },
  {
    feature: 'Pricing Model',
    payless: 'Set your own prices',
    payai: 'Marketplace-based pricing',
    paylessWins: true,
  },
  {
    feature: 'Protocol Fees',
    payless: '0% - Keep 100% of revenue',
    payai: 'Platform fees apply',
    paylessWins: true,
  },
  {
    feature: 'Payment Speed',
    payless: 'Instant (< 2 seconds)',
    payai: 'Instant',
    paylessWins: false,
  },
  {
    feature: 'Blockchain Support',
    payless: 'Solana (x402 agnostic)',
    payai: 'Solana-first, multi-network',
    paylessWins: false,
  },
  {
    feature: 'Minimum Payment',
    payless: '$0.01 USDC',
    payai: '$0.01',
    paylessWins: false,
  },
  {
    feature: 'Open Source',
    payless: 'Fully open source',
    payai: 'Partially open source',
    paylessWins: true,
  },
  {
    feature: 'Use Case',
    payless: 'Any paid API/service',
    payai: 'AI agent hiring & CT content',
    paylessWins: true,
  },
  {
    feature: 'Built-in Playground',
    payless: 'Yes - Test all endpoints',
    payai: 'Echo merchant for testing',
    paylessWins: true,
  },
];

export default function Comparison() {
  return (
    <section className="py-24 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/20 backdrop-blur-md border border-purple-500/30 mb-6">
            <span className="text-sm text-purple-300 font-medium">Comparison</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Payless vs PayAI
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
            Both are great x402 solutions, but focused on different use cases.
            Choose the right tool for your needs.
          </p>
          <a 
            href="https://payai.network/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors"
          >
            Visit PayAI
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* Comparison Table */}
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full align-middle">
            <div className="overflow-hidden rounded-2xl border border-white/10">
              <table className="min-w-full divide-y divide-white/10">
                <thead className="bg-white/5">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                      Feature
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-white">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">💰</span>
                        Payless
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🤖</span>
                        PayAI
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {comparisonData.map((row, index) => (
                    <tr 
                      key={index}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm font-medium text-white whitespace-nowrap">
                        {row.feature}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300">
                        <div className="flex items-start gap-2">
                          {row.paylessWins && (
                            <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                          )}
                          <span className={row.paylessWins ? 'text-white font-medium' : ''}>
                            {row.payless}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {row.payai}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Bottom Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-16">
          {/* Payless Card */}
          <div className="p-8 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 backdrop-blur-md">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">💰</span>
              <h3 className="text-2xl font-bold text-white">Payless</h3>
            </div>
            <p className="text-gray-300 mb-6">
              Perfect for developers who want to quickly monetize any API or service. 
              Ultra-simple integration, zero fees, deploy anywhere.
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-green-400">
                <Check className="w-5 h-5" />
                <span className="text-sm">Best for: API monetization</span>
              </div>
              <div className="flex items-center gap-2 text-green-400">
                <Check className="w-5 h-5" />
                <span className="text-sm">Simplest integration</span>
              </div>
              <div className="flex items-center gap-2 text-green-400">
                <Check className="w-5 h-5" />
                <span className="text-sm">Zero platform fees</span>
              </div>
            </div>
          </div>

          {/* PayAI Card */}
          <div className="p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🤖</span>
              <h3 className="text-2xl font-bold text-white">PayAI</h3>
            </div>
            <p className="text-gray-300 mb-6">
              Specialized platform for AI agent marketplaces and crypto Twitter monetization. 
              Built for autonomous agent transactions.
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-blue-400">
                <Check className="w-5 h-5" />
                <span className="text-sm">Best for: AI agent hiring</span>
              </div>
              <div className="flex items-center gap-2 text-blue-400">
                <Check className="w-5 h-5" />
                <span className="text-sm">CT content monetization</span>
              </div>
              <div className="flex items-center gap-2 text-blue-400">
                <Check className="w-5 h-5" />
                <span className="text-sm">Agent marketplace features</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <p className="text-gray-400 mb-6">
            Both platforms use x402 protocol for instant, blockchain-based payments
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/playground"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-purple-900 rounded-lg font-semibold hover:bg-gray-100 transition-all transform hover:scale-105 shadow-lg"
            >
              Try Payless Demo
            </a>
            <a
              href="https://payai.network/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-md text-white rounded-lg font-semibold hover:bg-white/20 transition-all border border-white/20"
            >
              Visit PayAI
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

