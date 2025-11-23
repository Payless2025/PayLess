'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Github, Twitter, ExternalLink } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-payless-dark-bg border-t border-payless-cyan/20 text-gray-300 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <Image 
                src="/logo.png" 
                alt="Payless" 
                width={40}
                height={40}
              />
              <span className="text-2xl font-bold bg-gradient-to-r from-payless-cyan via-payless-blue to-payless-purple bg-clip-text text-transparent">
                Payless
              </span>
            </div>
            <p className="text-gray-400 mb-4 max-w-md">
              Serverless payment platform powered by x402 protocol. Accept crypto payments without accounts, subscriptions, or complexity.
            </p>
            
            {/* Contract Address */}
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-white mb-2">Contract Address (CA)</h4>
              <div className="flex items-center gap-2 p-3 bg-payless-cyan/10 border border-payless-cyan/30 rounded-lg max-w-md backdrop-blur-sm">
                <code className="text-xs text-payless-cyan font-mono break-all flex-1">
                  6zgpKxYoaXJ6Eo8pAHkdLbADzts4P7Dfv1rnx6nhpump
                </code>
                <button
                  onClick={(e) => {
                    navigator.clipboard.writeText('6zgpKxYoaXJ6Eo8pAHkdLbADzts4P7Dfv1rnx6nhpump');
                    // Optional: Show toast notification
                    const button = e.currentTarget as HTMLButtonElement;
                    const originalHTML = button.innerHTML;
                    button.innerHTML = '<svg class="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
                    setTimeout(() => {
                      button.innerHTML = originalHTML;
                    }, 2000);
                  }}
                  className="p-1.5 rounded bg-payless-cyan/20 hover:bg-payless-cyan/30 transition-colors flex-shrink-0"
                  title="Copy Contract Address"
                >
                  <svg className="w-4 h-4 text-payless-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex gap-4">
              <a
                href="https://github.com/Payless2025/PayLess"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-payless-cyan/10 hover:bg-payless-cyan/20 transition-colors"
                aria-label="GitHub"
              >
                <Github className="w-5 h-5 text-payless-cyan" />
              </a>
              <a
                href="https://x.com/paylessnetwork"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-payless-cyan/10 hover:bg-payless-cyan/20 transition-colors"
                aria-label="X (Twitter)"
              >
                <Twitter className="w-5 h-5 text-payless-cyan" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4 text-white">Product</h4>
            <ul className="space-y-2 text-gray-400">
              <li>
                <Link href="/playground" className="hover:text-payless-cyan transition-colors">
                  Playground
                </Link>
              </li>
              <li>
                <Link href="#features" className="hover:text-payless-cyan transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/api/info" className="hover:text-payless-cyan transition-colors">
                  API Documentation
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold mb-4 text-white">Resources</h4>
            <ul className="space-y-2 text-gray-400">
              <li>
                <a
                  href="https://x402.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-payless-cyan transition-colors inline-flex items-center gap-1"
                >
                  x402 Protocol
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a
                  href="https://payless.gitbook.io/payless-documentation"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-payless-cyan transition-colors inline-flex items-center gap-1"
                >
                  Documentation
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/Payless2025/PayLess"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-payless-cyan transition-colors inline-flex items-center gap-1"
                >
                  GitHub
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a
                  href="https://solana.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-payless-cyan transition-colors inline-flex items-center gap-1"
                >
                  Solana
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-payless-cyan/20 text-center text-gray-400 text-sm">
          <p>
            © {new Date().getFullYear()} Payless. Built with ❤️ using{' '}
            <a
              href="https://x402.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-payless-cyan hover:text-payless-blue transition-colors"
            >
              x402 protocol
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

