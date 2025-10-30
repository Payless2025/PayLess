'use client';

import Link from 'next/link';
import { ArrowRight, Zap, Shield, Globe } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-[10px] opacity-50">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-float"></div>
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
          <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl animate-float" style={{ animationDelay: '4s' }}></div>
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-8">
          <Zap className="w-4 h-4 text-yellow-400" />
          <span className="text-sm text-white font-medium">Powered by x402 Protocol</span>
        </div>

        {/* Main heading */}
        <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
          Accept Payments
          <br />
          <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Without Accounts
          </span>
        </h1>

        {/* Subheading */}
        <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto">
          Serverless payment platform using x402 protocol. 
          Pay-per-use APIs with instant crypto settlements. No registration, no subscriptions.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link 
            href="/playground"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-purple-900 rounded-lg font-semibold hover:bg-gray-100 transition-all transform hover:scale-105 shadow-lg"
          >
            Try Demo
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link 
            href="#features"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-md text-white rounded-lg font-semibold hover:bg-white/20 transition-all border border-white/20"
          >
            Learn More
          </Link>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24 max-w-4xl mx-auto">
          <div className="p-6 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20">
            <Zap className="w-12 h-12 text-yellow-400 mb-4 mx-auto" />
            <h3 className="text-xl font-semibold text-white mb-2">Instant Settlement</h3>
            <p className="text-gray-300">Money in your wallet in 2 seconds, not T+2. Real-time blockchain payments.</p>
          </div>
          <div className="p-6 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20">
            <Shield className="w-12 h-12 text-green-400 mb-4 mx-auto" />
            <h3 className="text-xl font-semibold text-white mb-2">Zero Protocol Fees</h3>
            <p className="text-gray-300">No hidden fees. Keep 100% of your revenue. Open-source and transparent.</p>
          </div>
          <div className="p-6 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20">
            <Globe className="w-12 h-12 text-blue-400 mb-4 mx-auto" />
            <h3 className="text-xl font-semibold text-white mb-2">Blockchain Agnostic</h3>
            <p className="text-gray-300">Works with any blockchain and token. Currently supports USDC on Solana.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

