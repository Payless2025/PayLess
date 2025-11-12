'use client';

import Link from 'next/link';
import { ArrowRight, Zap, Shield, Globe } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-payless-dark-bg via-payless-dark to-payless-dark-bg pt-16">
      {/* Animated Background Gradient */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-96 h-96 bg-payless-cyan/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-payless-purple/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-payless-blue/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }}></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 text-center">
        {/* Logo/Brand */}
        <div className="mb-8">
          <div className="mb-6">
            <img 
              src="/logo.png" 
              alt="Payless Logo" 
              className="h-32 md:h-40 mx-auto drop-shadow-2xl"
            />
          </div>
          <h1 className="text-6xl md:text-8xl font-black mb-6 bg-gradient-to-r from-payless-cyan via-payless-blue to-payless-purple bg-clip-text text-transparent tracking-tight">
            Payless
          </h1>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-payless-cyan/10 border border-payless-cyan/30 backdrop-blur-sm">
            <Zap className="w-4 h-4 text-payless-cyan" />
            <span className="text-sm text-payless-cyan font-medium">Powered by x402 on Solana</span>
          </div>
        </div>

        {/* Main heading */}
        <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
          Accept Payments
          <br />
          <span className="bg-gradient-to-r from-payless-cyan via-payless-blue to-payless-purple bg-clip-text text-transparent">
            Without Accounts
          </span>
        </h2>

        {/* Subheading */}
        <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
          Serverless payment platform using x402 protocol. 
          Pay-per-use APIs with instant crypto settlements. No registration, no subscriptions.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-24">
          <Link 
            href="/playground"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-payless-cyan to-payless-blue text-payless-dark-bg rounded-xl font-semibold hover:shadow-lg hover:shadow-payless-cyan/50 transition-all transform hover:scale-105"
          >
            Try Demo
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link 
            href="#features"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white/10 text-white rounded-xl font-semibold hover:bg-white/20 transition-all border border-payless-cyan/30 backdrop-blur-sm"
          >
            Learn More
          </Link>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="p-6 rounded-2xl bg-white/5 border border-payless-cyan/20 shadow-sm hover:shadow-lg hover:border-payless-cyan/50 transition-all backdrop-blur-sm">
            <Zap className="w-12 h-12 text-payless-cyan mb-4 mx-auto" />
            <h3 className="text-xl font-semibold text-white mb-2">Instant Settlement</h3>
            <p className="text-gray-300">Money in your wallet in 2 seconds, not T+2. Real-time blockchain payments.</p>
          </div>
          <div className="p-6 rounded-2xl bg-white/5 border border-payless-blue/20 shadow-sm hover:shadow-lg hover:border-payless-blue/50 transition-all backdrop-blur-sm">
            <Shield className="w-12 h-12 text-payless-blue mb-4 mx-auto" />
            <h3 className="text-xl font-semibold text-white mb-2">Zero Protocol Fees</h3>
            <p className="text-gray-300">No hidden fees. Keep 100% of your revenue. Open-source and transparent.</p>
          </div>
          <div className="p-6 rounded-2xl bg-white/5 border border-payless-purple/20 shadow-sm hover:shadow-lg hover:border-payless-purple/50 transition-all backdrop-blur-sm">
            <Globe className="w-12 h-12 text-payless-purple mb-4 mx-auto" />
            <h3 className="text-xl font-semibold text-white mb-2">Blockchain Agnostic</h3>
            <p className="text-gray-300">Works with any blockchain and token. Currently supports USDC on Solana.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

