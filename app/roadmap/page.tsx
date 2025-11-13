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

              {/* Payment Streaming & Mobile */}
              <div className="border-l-4 border-green-500 pl-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6 hover:border-green-500 hover:shadow-lg transition-all">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Payment Streaming & Mobile SDK</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span><strong>Payment Streaming</strong> - Continuous micropayments with real-time monitoring</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span><strong>Stream Management API</strong> - Create, pause, resume, and cancel streams</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span><strong>React Native SDK</strong> - Full mobile support for iOS & Android</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span><strong>Phantom Mobile Integration</strong> - Native mobile wallet support</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span><strong>React Hooks & Components</strong> - Ready-to-use mobile UI components</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Payment Links & Analytics */}
              <div className="border-l-4 border-green-500 pl-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6 hover:border-green-500 hover:shadow-lg transition-all">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Payment Links & Analytics</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span><strong>Payment Links</strong> - Shareable crypto payment URLs (no code needed)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span><strong>Analytics Dashboard</strong> - Real-time transaction metrics with export</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span><strong>QR Code Generation</strong> - Automatic QR codes for payment links</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span><strong>CSV/JSON Export</strong> - Data export functionality</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>Auto-refresh analytics & filtering</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Visual Analytics */}
              <div className="border-l-4 border-green-500 pl-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6 hover:border-green-500 hover:shadow-lg transition-all">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Visual Analytics & Charts</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span><strong>Revenue Timeline</strong> - Area chart showing revenue trends over time</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span><strong>Chain Distribution</strong> - Pie chart for transaction distribution by blockchain</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span><strong>Status Analytics</strong> - Bar chart for transaction status breakdown</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span><strong>Responsive Design</strong> - Mobile-friendly chart rendering</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>Interactive tooltips & legends with Recharts</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Enhanced Playground */}
              <div className="border-l-4 border-green-500 pl-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6 hover:border-green-500 hover:shadow-lg transition-all">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Enhanced API Playground</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span><strong>Multi-SDK Code Generator</strong> - Generate code for cURL, Node.js, Python, React Native</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span><strong>Categorized Endpoints</strong> - AI, Data, Tools, and Premium categories</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span><strong>Tabbed Interface</strong> - Request, Response, and Code tabs</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span><strong>Copy-to-Clipboard</strong> - One-click code copying</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>Share playground state via URL</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Payment History */}
              <div className="border-l-4 border-green-500 pl-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6 hover:border-green-500 hover:shadow-lg transition-all">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Payment History</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span><strong>Transaction Tracking</strong> - Complete history of all payments</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span><strong>Advanced Search & Filters</strong> - Filter by date, chain, status, addresses</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span><strong>CSV/JSON Export</strong> - Export transaction data for accounting</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span><strong>Blockchain Receipts</strong> - Detailed transaction proof with explorer links</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>Real-time updates with 30-second auto-refresh</span>
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
                  <h3 className="text-xl font-bold text-gray-900 mb-4">User Features</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <Clock className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5 animate-pulse" />
                      <span><strong>Email Notifications</strong> - Payment alerts and receipts</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Clock className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5 animate-pulse" />
                      <span><strong>User Dashboard Enhancement</strong> - Advanced statistics and insights</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Clock className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5 animate-pulse" />
                      <span>Custom receipt templates</span>
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
                    <li className="flex items-start gap-2">
                      <Circle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <span>Advanced webhook retry logic & management</span>
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
                      <span><strong>Flutter SDK</strong> - Cross-platform mobile development support</span>
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
                    <li className="flex items-start gap-2">
                      <Circle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <span>WooCommerce plugin support</span>
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

