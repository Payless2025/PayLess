'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Github, Twitter, Menu, X } from 'lucide-react';

const nav = [
  { href: '/playground', label: 'Playground' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/history', label: 'History' },
  { href: '/payment-links', label: 'Payment links' },
  { href: '/streams', label: 'Streams' },
  { href: '/roadmap', label: 'Roadmap' },
];

const DOCS = 'https://github.com/Payless2025/PayLess/tree/master/docs';

export default function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-line bg-bg/95 backdrop-blur-sm">
      <nav className="mx-auto max-w-7xl px-6">
        <div className="flex h-14 items-center justify-between gap-6">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <Image src="/logo.png" alt="" width={22} height={22} />
            <span className="font-mono text-sm font-medium tracking-tight text-text">
              payless
            </span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {nav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded px-2.5 py-1.5 text-sm transition-colors ${
                    active ? 'text-accent' : 'text-text-muted hover:text-text'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <a
              href={DOCS}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded px-2.5 py-1.5 text-sm text-text-muted transition-colors hover:text-text"
            >
              Docs
            </a>
          </div>

          <div className="hidden items-center gap-3 md:flex">
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
            <Link
              href="/playground"
              className="rounded border border-accent bg-accent px-3 py-1.5 text-sm font-medium text-bg transition-colors hover:bg-transparent hover:text-accent"
            >
              Try it
            </Link>
          </div>

          <button
            onClick={() => setOpen(!open)}
            className="text-text-muted md:hidden"
            aria-label="Menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {open && (
          <div className="border-t border-line py-2 md:hidden">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`block px-1 py-2 text-sm ${
                  pathname === item.href ? 'text-accent' : 'text-text-muted'
                }`}
              >
                {item.label}
              </Link>
            ))}
            <a
              href={DOCS}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-1 py-2 text-sm text-text-muted"
            >
              Docs
            </a>
            <div className="mt-2 flex items-center gap-4 border-t border-line px-1 pt-3">
              <a
                href="https://github.com/Payless2025/PayLess"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-faint"
                aria-label="GitHub"
              >
                <Github className="h-4 w-4" />
              </a>
              <a
                href="https://x.com/paylessnetwork"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-faint"
                aria-label="X"
              >
                <Twitter className="h-4 w-4" />
              </a>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
