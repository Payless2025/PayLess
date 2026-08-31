import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

// Every endpoint here is priced and does real work. The /api/rwa/* family
// reads the tokenised equities Robinhood Chain was built to carry.
const endpoints = [
  { path: '/api/rwa/tokens', price: '0.02', blurb: 'Every Robinhood stock token, supply read live' },
  { path: '/api/rwa/token', price: '0.01', blurb: 'One tokenised equity, by ticker' },
  { path: '/api/rwa/holdings', price: '0.02', blurb: 'An address\u2019s tokenised equity position' },
  { path: '/api/chain/receipt', price: '0.02', blurb: 'Did this transaction actually pay me?' },
  { path: '/api/chain/balance', price: '0.01', blurb: 'ETH and token balances for any address' },
  { path: '/api/chain/token', price: '0.01', blurb: 'ERC-20 metadata, read live from chain 4663' },
  { path: '/api/data/crypto', price: '0.015', blurb: 'Spot prices, no API key on your side' },
  { path: '/api/tools/qrcode', price: '0.005', blurb: 'Half a cent a QR code' },
];

export default function UseCases() {
  return (
    <section id="endpoints" className="py-24 bg-bg border-t border-line">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-text mb-4">
Selling data about the assets the chain carries
          </h2>
          <p className="text-lg text-text-muted">
            Reading a tokenised equity on Robinhood Chain is permissionless. Moving one is
            not. So these endpoints sell data about them and settle in USDG — no securities
            held, no upstream key, and every answer checkable against the explorer.
          </p>
        </div>

        <div className="rounded border border-line overflow-hidden">
          {endpoints.map((e, i) => (
            <div
              key={e.path}
              className={`flex flex-wrap items-baseline gap-x-6 gap-y-1 px-5 py-4 hover:bg-surface transition-colors ${
                i > 0 ? 'border-t border-line' : ''
              }`}
            >
              <code className="font-mono text-sm text-accent min-w-[15rem]">
                {e.path}
              </code>
              <span className="font-mono text-sm text-text tnum">
                ${e.price}
                <span className="text-text-faint"> USDG</span>
              </span>
              <span className="text-sm text-text-muted">{e.blurb}</span>
            </div>
          ))}
        </div>

        <Link
          href="/playground"
          className="mt-8 inline-flex items-center gap-2 text-accent hover:gap-3 transition-all font-medium"
        >
          Call them in the playground
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}
