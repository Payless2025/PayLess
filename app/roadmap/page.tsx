import { CheckCircle2, Circle, Clock, Zap } from 'lucide-react';

import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function RoadmapPage() {
  return (
    <>
      <Header />
      <div className="min-h-screen bg-white pt-20">
        <div className="container mx-auto px-4 py-16 max-w-6xl">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              Payless Roadmap
            </h1>
            <p className="text-xl text-gray-600">
              Building the future of internet-native payments for AI
            </p>
          </div>

        {/* Roadmap Timeline */}
        <div className="space-y-12">
          
          {/* ✅ COMPLETED */}
          <section>
            <div className="flex items-center gap-3 mb-8">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
              <h2 className="text-3xl font-bold text-gray-900">Completed ✅</h2>
            </div>
            
            <div className="space-y-6 ml-12">
              {/* Core Platform */}
              <div className="border-l-4 border-green-500 pl-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6 hover:border-green-500 hover:shadow-lg transition-all">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Core Platform Launch</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>x402 protocol implementation</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>Solana payment integration</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>BSC (Binance Smart Chain) support</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>Interactive API playground</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>Node.js & Python SDKs</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>Built-in analytics system</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Major Technical Upgrade */}
              <div className="border-l-4 border-green-500 pl-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6 hover:border-green-500 hover:shadow-lg transition-all">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Major Technical Upgrade</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span><strong>Ethereum support</strong> - Full mainnet integration with USDC/USDT</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span><strong>Webhook system</strong> - Real-time payment notifications</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span><strong>Enhanced SDKs</strong> - Better error handling & examples</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span><strong>Multi-chain middleware</strong> - Unified payment interface</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>Comprehensive documentation overhaul</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* 🔥 IN PROGRESS */}
          <section>
            <div className="flex items-center gap-3 mb-8">
              <Zap className="w-8 h-8 text-orange-600" />
              <h2 className="text-3xl font-bold text-gray-900">In Progress 🔥</h2>
            </div>
            
            <div className="space-y-6 ml-12">
              <div className="border-l-4 border-orange-500 pl-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6 hover:border-orange-500 hover:shadow-lg transition-all">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Payment Links & UX</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <Clock className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5 animate-pulse" />
                      <span><strong>Payment Links</strong> - Shareable crypto payment URLs (no code needed)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Clock className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5 animate-pulse" />
                      <span><strong>Analytics Dashboard</strong> - Real-time transaction metrics</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Clock className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5 animate-pulse" />
                      <span><strong>Payment History</strong> - Transaction tracking & receipts</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Clock className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5 animate-pulse" />
                      <span>Enhanced playground with live demos</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* 🚀 PLANNED */}
          <section>
            <div className="flex items-center gap-3 mb-8">
              <Circle className="w-8 h-8 text-blue-600" />
              <h2 className="text-3xl font-bold text-gray-900">Planned 🚀</h2>
            </div>
            
            <div className="space-y-6 ml-12">
              
              {/* Advanced Features */}
              <div className="border-l-4 border-blue-500 pl-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6 hover:border-blue-500 hover:shadow-lg transition-all">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Advanced Features</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <Circle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <span><strong>Token-Gated Content</strong> - Holder-only API access</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Circle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <span><strong>Payment Streaming</strong> - Pay per second/minute</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Circle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <span><strong>Multi-Currency Pricing</strong> - USD-based pricing with auto-conversion</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Circle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <span>Persistent webhook storage (optional)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Circle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <span>Rate limiting & API key authentication</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Ecosystem Expansion */}
              <div className="border-l-4 border-blue-500 pl-6">
                <div className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-lg p-6 hover:border-blue-500 transition-all">
                  <h3 className="text-xl font-bold text-white mb-4">Ecosystem Expansion</h3>
                  <ul className="space-y-2 text-gray-300">
                    <li className="flex items-start gap-2">
                      <Circle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <span><strong>Polygon Network</strong> - Layer 2 scaling solution</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Circle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <span><strong>Arbitrum & Optimism</strong> - Additional L2 support</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Circle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <span><strong>AI Agent Demo</strong> - Autonomous payment showcase</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Circle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <span>Subscription management system</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Circle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <span>Advanced analytics with charts & exports</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Enterprise & Integrations */}
              <div className="border-l-4 border-blue-500 pl-6">
                <div className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-lg p-6 hover:border-blue-500 transition-all">
                  <h3 className="text-xl font-bold text-white mb-4">Enterprise & Integrations</h3>
                  <ul className="space-y-2 text-gray-300">
                    <li className="flex items-start gap-2">
                      <Circle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <span><strong>Mobile SDKs</strong> - React Native & Flutter support</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Circle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <span><strong>WordPress Plugin</strong> - Easy website integration</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Circle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <span><strong>Shopify Integration</strong> - E-commerce support</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Circle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <span>Payment splits & multi-recipient</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Circle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <span>Automated invoice generation</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Payment Enhancements */}
              <div className="border-l-4 border-blue-500 pl-6">
                <div className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-lg p-6 hover:border-blue-500 transition-all">
                  <h3 className="text-xl font-bold text-white mb-4">Payment Enhancements</h3>
                  <ul className="space-y-2 text-gray-300">
                    <li className="flex items-start gap-2">
                      <Circle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <span><strong>Fiat On-Ramps</strong> - Credit card to crypto payments</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Circle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <span><strong>Recurring Payments</strong> - Automated subscription billing</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Circle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <span><strong>Escrow Payments</strong> - Secure payment holds</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Circle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <span><strong>Payment Disputes</strong> - Resolution system</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Circle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <span>Batch payment processing</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

        </div>

        {/* Call to Action */}
        <div className="mt-16 text-center">
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-8 border border-purple-500">
            <h3 className="text-2xl font-bold text-white mb-4">
              Building the Future Together
            </h3>
            <p className="text-gray-200 mb-6">
              Join us on this journey to revolutionize internet-native payments
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <a
                href="/playground"
                className="px-6 py-3 bg-white text-purple-600 rounded-lg font-semibold hover:bg-gray-100 transition-all"
              >
                Try Playground
              </a>
              <a
                href="https://github.com/Payless2025/PayLess"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-gray-800 text-white rounded-lg font-semibold hover:bg-gray-700 transition-all border border-gray-600"
              >
                View on GitHub
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
    <Footer />
    </>
  );
}

