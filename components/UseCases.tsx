'use client';

import { Bot, Cloud, FileText, Image, TrendingUp, Zap } from 'lucide-react';

const useCases = [
  {
    icon: Bot,
    title: 'AI API Gateway',
    description: 'Proxy AI models (GPT, Claude) with micropayments per request',
    price: '$0.05/request',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    icon: Image,
    title: 'Image Generation',
    description: 'DALL-E, Midjourney, Stable Diffusion with pay-per-image',
    price: '$0.10/image',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    icon: TrendingUp,
    title: 'Market Data API',
    description: 'Real-time stock quotes, crypto prices, financial data',
    price: '$0.02/query',
    gradient: 'from-green-500 to-emerald-500',
  },
  {
    icon: Cloud,
    title: 'Cloud Storage',
    description: 'File storage and CDN with usage-based pricing',
    price: '$0.001/MB',
    gradient: 'from-orange-500 to-red-500',
  },
  {
    icon: FileText,
    title: 'Premium Content',
    description: 'Articles, reports, research papers with instant access',
    price: '$1.00/article',
    gradient: 'from-yellow-500 to-orange-500',
  },
  {
    icon: Zap,
    title: 'Compute Functions',
    description: 'Serverless compute for data processing and analytics',
    price: '$0.03/execution',
    gradient: 'from-indigo-500 to-purple-500',
  },
];

export default function UseCases() {
  return (
    <section className="py-24 bg-white dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Endless Possibilities
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Build any pay-per-use service you can imagine
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {useCases.map((useCase, index) => (
            <div
              key={index}
              className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 shadow-lg hover:shadow-2xl transition-all duration-300"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${useCase.gradient} opacity-0 group-hover:opacity-10 transition-opacity`}></div>
              <div className="relative p-6">
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${useCase.gradient} mb-4`}>
                  <useCase.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {useCase.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  {useCase.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-semibold bg-gradient-to-r ${useCase.gradient} bg-clip-text text-transparent`}>
                    {useCase.price}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">instant settlement</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

