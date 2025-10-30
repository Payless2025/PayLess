'use client';

import { Check, X, ExternalLink } from 'lucide-react';

const comparisonData = [
  {
    feature: 'Best For',
    payless: 'Developers monetizing any API',
    payai: 'AI agent marketplaces',
    highlight: true,
  },
  {
    feature: 'Setup Time',
    payless: 'One line of code, < 5 minutes',
    payai: 'Full SDK integration',
    highlight: true,
  },
  {
    feature: 'Deployment',
    payless: '100% serverless - deploy anywhere',
    payai: 'Requires infrastructure setup',
    highlight: true,
  },
  {
    feature: 'Protocol Fees',
    payless: '0% - Keep 100% of your revenue',
    payai: 'Platform fees',
    highlight: true,
  },
  {
    feature: 'Open Source',
    payless: 'Fully open source - MIT license',
    payai: 'Partially open source',
    highlight: true,
  },
  {
    feature: 'Flexibility',
    payless: 'Set any price, any API endpoint',
    payai: 'Marketplace-based',
    highlight: true,
  },
  {
    feature: 'Payment Speed',
    payless: 'Instant (< 2 seconds)',
    payai: 'Instant',
    highlight: false,
  },
  {
    feature: 'Blockchain',
    payless: 'Solana (x402 protocol)',
    payai: 'Solana-first, multi-network',
    highlight: false,
  },
  {
    feature: 'Minimum Payment',
    payless: '$0.01 USDC',
    payai: '$0.01',
    highlight: false,
  },
  {
    feature: 'Developer Experience',
    payless: 'Zero config, works out of box',
    payai: 'Rich ecosystem & plugins',
    highlight: true,
  },
  {
    feature: 'Testing',
    payless: 'Built-in playground for all endpoints',
    payai: 'Echo merchant testing',
    highlight: false,
  },
  {
    feature: 'Use Cases',
    payless: 'Any paid API or service',
    payai: 'AI agent hiring, CT monetization',
    highlight: false,
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
            Why Choose Payless?
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
            We're not the only x402 solution—PayAI is excellent for AI agent marketplaces.
            But if you want the simplest API monetization with zero fees, Payless is built for you.
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
                          {row.highlight && (
                            <span className="text-lg flex-shrink-0">⭐</span>
                          )}
                          <span className={row.highlight ? 'text-white font-medium' : ''}>
                            {row.payless}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300">
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
              <h3 className="text-2xl font-bold text-white">Payless Strengths</h3>
            </div>
            <p className="text-gray-300 mb-6">
              Built for developers who value simplicity, speed, and freedom.
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-xl mt-0.5">⚡</span>
                <div>
                  <div className="text-white font-medium">Lightning Setup</div>
                  <div className="text-sm text-gray-400">One line of code. 5 minutes to production.</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl mt-0.5">💯</span>
                <div>
                  <div className="text-white font-medium">Keep 100%</div>
                  <div className="text-sm text-gray-400">Zero protocol fees. Every dollar is yours.</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl mt-0.5">🚀</span>
                <div>
                  <div className="text-white font-medium">True Serverless</div>
                  <div className="text-sm text-gray-400">Deploy anywhere. Scales automatically.</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl mt-0.5">🔓</span>
                <div>
                  <div className="text-white font-medium">Fully Open Source</div>
                  <div className="text-sm text-gray-400">MIT license. Fork, modify, own it.</div>
                </div>
              </div>
            </div>
          </div>

          {/* PayAI Card */}
          <div className="p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🤖</span>
              <h3 className="text-2xl font-bold text-white">When to Use PayAI</h3>
            </div>
            <p className="text-gray-300 mb-6">
              PayAI excels at specialized AI agent use cases with rich marketplace features.
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-xl mt-0.5">🤖</span>
                <div>
                  <div className="text-white font-medium">AI Agent Marketplaces</div>
                  <div className="text-sm text-gray-400">Built-in hiring & collaboration features</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl mt-0.5">🐦</span>
                <div>
                  <div className="text-white font-medium">CT Content Monetization</div>
                  <div className="text-sm text-gray-400">Turn crypto Twitter agents into revenue</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl mt-0.5">🌐</span>
                <div>
                  <div className="text-white font-medium">Multi-Network Support</div>
                  <div className="text-sm text-gray-400">Solana-first with expanding networks</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl mt-0.5">🛠️</span>
                <div>
                  <div className="text-white font-medium">Rich Ecosystem</div>
                  <div className="text-sm text-gray-400">SDKs, plugins, and integrations</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <p className="text-xl text-gray-300 mb-2">
            Both platforms use x402 protocol for instant, blockchain-based payments.
          </p>
          <p className="text-gray-400 mb-8">
            Choose Payless for simplest API monetization. Choose PayAI for AI agent marketplaces.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/playground"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-blue-600 transition-all transform hover:scale-105 shadow-lg"
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

