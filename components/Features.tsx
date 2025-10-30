'use client';

import { Code, Cpu, DollarSign, Lock, Smartphone, Workflow } from 'lucide-react';

const features = [
  {
    icon: Code,
    title: 'One Line of Code',
    description: 'Add payment requirements to your API with a single middleware wrapper. That\'s it.',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
  },
  {
    icon: Cpu,
    title: 'Perfect for AI Agents',
    description: 'AI agents can autonomously pay for API requests without human intervention.',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
  },
  {
    icon: DollarSign,
    title: 'True Micropayments',
    description: 'Accept payments as low as $0.01. Finally viable without traditional payment fees.',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
  },
  {
    icon: Lock,
    title: 'Privacy First',
    description: 'No accounts, no emails, no OAuth. Users pay and access content anonymously.',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
  },
  {
    icon: Smartphone,
    title: 'Web Native',
    description: 'Built on HTTP 402 status code. Works with any HTTP stack and existing infrastructure.',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
  },
  {
    icon: Workflow,
    title: 'Serverless Ready',
    description: 'Deploy to Vercel, Netlify, or AWS Lambda. Scale automatically with demand.',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
  },
];

export default function Features() {
  return (
    <section id="features" className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Why Choose Payless?
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Built for developers who want to monetize APIs without complexity
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="p-6 rounded-2xl bg-white border border-gray-100 hover:border-purple-200 hover:shadow-md transition-all duration-300"
            >
              <div className={`inline-flex p-3 rounded-xl ${feature.bgColor} mb-4`}>
                <feature.icon className={`w-6 h-6 ${feature.color}`} />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

