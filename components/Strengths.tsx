'use client';

import { Zap, DollarSign, Rocket, Code, Lock, Globe } from 'lucide-react';

const strengths = [
  {
    icon: Zap,
    title: 'Lightning Setup',
    description: 'One line of code. 5 minutes to production.',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
  },
  {
    icon: DollarSign,
    title: 'Keep 100%',
    description: 'Zero protocol fees. Every dollar is yours.',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
  },
  {
    icon: Rocket,
    title: 'True Serverless',
    description: 'Deploy anywhere. Scales automatically.',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
  },
  {
    icon: Code,
    title: 'Fully Open Source',
    description: 'MIT license. Fork, modify, own it.',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
  },
  {
    icon: Lock,
    title: 'Privacy First',
    description: 'No accounts, emails, or OAuth required.',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
  },
  {
    icon: Globe,
    title: 'Any Use Case',
    description: 'Monetize any API or service. No restrictions.',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
  },
];

export default function Strengths() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-50 border border-purple-100 mb-6">
            <span className="text-sm text-purple-700 font-medium">Our Strengths</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Why Developers Choose Payless
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            The simplest way to monetize your APIs. Zero fees, zero complexity, zero compromises.
          </p>
        </div>

        {/* Strengths Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {strengths.map((strength, index) => (
            <div
              key={index}
              className="p-8 rounded-2xl bg-white border border-gray-100 hover:border-purple-200 hover:shadow-md transition-all duration-300"
            >
              <div className={`inline-flex p-4 rounded-xl ${strength.bgColor} mb-6`}>
                <strength.icon className={`w-8 h-8 ${strength.color}`} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                {strength.title}
              </h3>
              <p className="text-gray-600 text-lg">
                {strength.description}
              </p>
            </div>
          ))}
        </div>

        {/* Key Features List */}
        <div className="max-w-4xl mx-auto">
          <div className="p-8 rounded-2xl bg-purple-50 border border-purple-100">
            <h3 className="text-3xl font-bold text-gray-900 mb-8 text-center">
              Everything You Need. Nothing You Don&apos;t.
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚡</span>
                <div>
                  <div className="text-gray-900 font-semibold text-lg">Instant Settlement</div>
                  <div className="text-gray-600">Money in your wallet in 2 seconds</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">💵</span>
                <div>
                  <div className="text-gray-900 font-semibold text-lg">True Micropayments</div>
                  <div className="text-gray-600">Accept payments as low as $0.01</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">🔐</span>
                <div>
                  <div className="text-gray-900 font-semibold text-lg">No Accounts Needed</div>
                  <div className="text-gray-600">Users pay anonymously, no signup</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">🤖</span>
                <div>
                  <div className="text-gray-900 font-semibold text-lg">AI Agent Ready</div>
                  <div className="text-gray-600">Perfect for autonomous payments</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">📊</span>
                <div>
                  <div className="text-gray-900 font-semibold text-lg">Built-in Playground</div>
                  <div className="text-gray-600">Test all endpoints without coding</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">🌐</span>
                <div>
                  <div className="text-gray-900 font-semibold text-lg">Works Everywhere</div>
                  <div className="text-gray-600">x402 protocol, blockchain agnostic</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <p className="text-xl text-gray-600 mb-8">
            Start monetizing your APIs in minutes, not days.
          </p>
          <a
            href="/playground"
            className="inline-flex items-center justify-center gap-2 px-10 py-5 bg-purple-600 text-white text-lg rounded-xl font-semibold hover:bg-purple-700 transition-all shadow-sm hover:shadow-md"
          >
            Try Payless Demo Now
            <Zap className="w-6 h-6" />
          </a>
        </div>
      </div>
    </section>
  );
}

