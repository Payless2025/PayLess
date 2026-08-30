'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { Github, Twitter, Copy, Check } from 'lucide-react';

import { PAYLESS_TOKEN, ROBINHOOD_EXPLORER_URL } from '@/lib/chains/config';

const PAYLESS_TOKEN_ADDRESS = PAYLESS_TOKEN.address;

const DOCS = 'https://github.com/Payless2025/PayLess/tree/master/docs';

const columns = [
  {
    title: 'Product',
    links: [
      { label: 'Playground', href: '/playground' },
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Payment links', href: '/payment-links' },
      { label: 'How it works', href: '/#how-it-works' },
    ],
  },
  {
    title: 'Reference',
    links: [
      { label: 'Docs', href: DOCS, external: true },
      { label: 'Robinhood Chain', href: `${DOCS}/ROBINHOOD_CHAIN.md`, external: true },
      { label: 'x402 protocol', href: 'https://www.x402.org/', external: true },
      { label: 'GitHub', href: 'https://github.com/Payless2025/PayLess', external: true },
    ],
  },
];

export default function Footer() {
  const [copied, setCopied] = useState(false);

  return (
    <footer className="border-t border-line bg-bg">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2">
              <Image src="/logo.png" alt="" width={20} height={20} />
              <span className="font-mono text-sm text-text">payless</span>
            </div>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-text-muted">
              Pay-per-call APIs over HTTP 402. Settles on Robinhood Chain in USDG, with no
              account on either side.
            </p>

            <div className="mt-5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-mono text-xs uppercase tracking-widest text-text-faint">
                  $PAYLESS · Robinhood Chain
                </span>
                <a
                  href={`${ROBINHOOD_EXPLORER_URL}/token/${PAYLESS_TOKEN_ADDRESS}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-text-faint transition-colors hover:text-accent"
                >
                  verify
                </a>
              </div>
              <div className="mt-2 flex items-center gap-2 rounded border border-line bg-surface px-3 py-2">
                <code className="flex-1 truncate font-mono text-xs text-text-muted">
                  {PAYLESS_TOKEN_ADDRESS}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(PAYLESS_TOKEN_ADDRESS);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  className="shrink-0 text-text-faint transition-colors hover:text-accent"
                  title="Copy address"
                  aria-label="Copy contract address"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-accent" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-4">
              <a
                href="https://github.com/Payless2025/PayLess"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-faint transition-colors hover:text-text"
                aria-label="GitHub"
              >
                <Github className="h-4 w-4" />
              </a>
              <a
                href="https://x.com/paylessnetwork"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-faint transition-colors hover:text-text"
                aria-label="X"
              >
                <Twitter className="h-4 w-4" />
              </a>
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="font-mono text-xs uppercase tracking-widest text-text-faint">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {'external' in link && link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-text-muted transition-colors hover:text-accent"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-sm text-text-muted transition-colors hover:text-accent"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
          <span className="font-mono text-xs text-text-faint">
            © {new Date().getFullYear()} Payless · MIT
          </span>
          <span className="font-mono text-xs text-text-faint">chain 4663 · USDG</span>
        </div>
      </div>
    </footer>
  );
}
