import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

// These are the endpoints actually wired up in this repo — prices come from
// ENDPOINT_PRICING in lib/x402/config.ts. Every one is callable in the playground.
const endpoints = [
  { path: '/api/ai/chat', price: '0.05', blurb: 'Proxy a model, charge per completion' },
  { path: '/api/ai/image', price: '0.10', blurb: 'Pay-per-image generation' },
  { path: '/api/ai/translate', price: '0.03', blurb: 'Per-call translation' },
  { path: '/api/data/stock', price: '0.02', blurb: 'Quotes, priced per query' },
  { path: '/api/tools/qrcode', price: '0.005', blurb: 'Half a cent a QR code' },
  { path: '/api/premium/content', price: '1.00', blurb: 'One article, one payment' },
];

export default function UseCases() {
  return (
    <section id="endpoints" className="py-24 bg-payless-dark-bg border-t border-white/5">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Six priced endpoints, already running
          </h2>
          <p className="text-lg text-gray-400">
            Not a roadmap — these are live in this repo and callable from the playground.
            Prices are whatever you pass as the second argument.
          </p>
        </div>

        <div className="rounded-xl border border-white/10 overflow-hidden">
          {endpoints.map((e, i) => (
            <div
              key={e.path}
              className={`flex flex-wrap items-baseline gap-x-6 gap-y-1 px-5 py-4 hover:bg-white/[0.03] transition-colors ${
                i > 0 ? 'border-t border-white/10' : ''
              }`}
            >
              <code className="font-mono text-sm text-payless-cyan min-w-[15rem]">
                {e.path}
              </code>
              <span className="font-mono text-sm text-white tabular-nums">
                ${e.price}
                <span className="text-gray-500"> USDG</span>
              </span>
              <span className="text-sm text-gray-400">{e.blurb}</span>
            </div>
          ))}
        </div>

        <Link
          href="/playground"
          className="mt-8 inline-flex items-center gap-2 text-payless-cyan hover:gap-3 transition-all font-medium"
        >
          Call them in the playground
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}
