'use client';

import Link from 'next/link';
import { ArrowRight, Zap, Shield, Globe } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-white">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgb(229, 231, 235) 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }}></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 text-center">
        {/* Logo/Brand */}
        <div className="mb-8">
          <h1 className="text-6xl md:text-8xl font-bold text-gray-900 mb-3 tracking-tight">
            💰 Payless
          </h1>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-50 border border-purple-100">
            <Zap className="w-4 h-4 text-purple-600" />
            <span className="text-sm text-purple-700 font-medium">Powered by x402 on Solana</span>
          </div>
        </div>

        {/* Main heading */}
        <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
          Accept Payments
          <br />
          <span className="text-purple-600">
            Without Accounts
          </span>
        </h2>

        {/* Subheading */}
        <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
          Serverless payment platform using x402 protocol. 
          Pay-per-use APIs with instant crypto settlements. No registration, no subscriptions.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-24">
          <Link 
            href="/playground"
            className="inline-flex items-center gap-2 px-8 py-4 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-all shadow-sm hover:shadow-md"
          >
            Try Demo
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link 
            href="#features"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all border border-gray-200"
          >
            Learn More
          </Link>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <Zap className="w-12 h-12 text-purple-600 mb-4 mx-auto" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Instant Settlement</h3>
            <p className="text-gray-600">Money in your wallet in 2 seconds, not T+2. Real-time blockchain payments.</p>
          </div>
          <div className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <Shield className="w-12 h-12 text-purple-600 mb-4 mx-auto" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Zero Protocol Fees</h3>
            <p className="text-gray-600">No hidden fees. Keep 100% of your revenue. Open-source and transparent.</p>
          </div>
          <div className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <Globe className="w-12 h-12 text-purple-600 mb-4 mx-auto" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Blockchain Agnostic</h3>
            <p className="text-gray-600">Works with any blockchain and token. Currently supports USDC on Solana.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

