import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-line pt-14">
      {/* The one decorative element: a faint engineering grid, masked out at the edges */}
      <div className="grid-bg pointer-events-none absolute inset-0" aria-hidden="true" />

      <div className="relative mx-auto max-w-6xl px-6 py-24 md:py-32">
        <div className="inline-flex items-center gap-2 rounded border border-line bg-surface px-2.5 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          <span className="font-mono text-xs text-text-muted">
            x402 · Robinhood Chain · chain 4663
          </span>
        </div>

        <h1 className="mt-8 max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight text-text md:text-6xl">
          Charge for an API call
          <br />
          <span className="text-text-muted">without an account on either side.</span>
        </h1>

        <p className="mt-6 max-w-xl text-lg leading-relaxed text-text-muted">
          Wrap a route, name a price. The caller pays per request in USDG and the money
          lands in your wallet — no signup, no subscription, no processor in between.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Link
            href="/playground"
            className="inline-flex items-center gap-2 rounded border border-accent bg-accent px-4 py-2.5 text-sm font-medium text-bg transition-colors hover:bg-transparent hover:text-accent"
          >
            Open the playground
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="#how-it-works"
            className="rounded border border-line-strong bg-surface-raised px-4 py-2.5 text-sm font-medium text-text transition-colors hover:border-text-faint"
          >
            How it works
          </Link>
        </div>

        {/* The pitch, as the thing itself */}
        <div className="mt-16 max-w-2xl overflow-x-auto rounded border border-line bg-surface">
          <div className="border-b border-line px-4 py-2.5">
            <span className="font-mono text-xs text-text-faint">
              app/api/your-endpoint/route.ts
            </span>
          </div>
          <pre className="p-4 font-mono text-sm leading-relaxed text-text-muted">
            <code>
              {`import { withX402Payment } from '@/lib/x402/middleware';

export const POST = withX402Payment(handler, `}
              <span className="text-accent">&quot;0.01&quot;</span>
              {`);`}
            </code>
          </pre>
        </div>

        <dl className="mt-10 flex flex-wrap gap-x-12 gap-y-4">
          {[
            ['Protocol fee', '0%'],
            ['Settles in', 'USDG'],
            ['Accounts required', 'none'],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="font-mono text-xs uppercase tracking-widest text-text-faint">
                {label}
              </dt>
              <dd className="mt-1 font-mono text-lg text-text">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
