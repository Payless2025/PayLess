'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Github, Twitter, Menu, X } from 'lucide-react';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-payless-dark-bg/95 backdrop-blur-md border-b border-payless-cyan/20">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <Image 
              src="/logo.png" 
              alt="Payless" 
              width={40}
              height={40}
              className="transition-transform group-hover:scale-110"
            />
            <span className="text-xl font-bold bg-gradient-to-r from-payless-cyan via-payless-blue to-payless-purple bg-clip-text text-transparent">
              Payless
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link 
              href="/roadmap" 
              className="text-gray-300 hover:text-payless-cyan transition-colors font-medium"
            >
              Roadmap
            </Link>
            <Link 
              href="/history" 
              className="text-gray-300 hover:text-payless-cyan transition-colors font-medium"
            >
              History
            </Link>
            <Link 
              href="/payment-links" 
              className="text-gray-300 hover:text-payless-cyan transition-colors font-medium"
            >
              Payment Links
            </Link>
            <Link 
              href="/streams" 
              className="text-gray-300 hover:text-payless-cyan transition-colors font-medium"
            >
              Streams
            </Link>
            <Link 
              href="/playground" 
              className="text-gray-300 hover:text-payless-cyan transition-colors font-medium"
            >
              Playground
            </Link>
            <Link 
              href="/dashboard" 
              className="text-gray-300 hover:text-payless-cyan transition-colors font-medium"
            >
              Dashboard
            </Link>
            <a 
              href="https://payless.gitbook.io/payless-documentation" 
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-300 hover:text-payless-cyan transition-colors font-medium"
            >
              Docs
            </a>
          </div>

          {/* Social Links + CTA */}
          <div className="hidden md:flex items-center space-x-4">
            <a
              href="https://github.com/Payless2025/PayLess"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg text-gray-400 hover:text-payless-cyan hover:bg-payless-cyan/10 transition-all"
              aria-label="GitHub"
            >
              <Github className="w-5 h-5" />
            </a>
            <a
              href="https://x.com/paylessnetwork"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg text-gray-400 hover:text-payless-cyan hover:bg-payless-cyan/10 transition-all"
              aria-label="X (Twitter)"
            >
              <Twitter className="w-5 h-5" />
            </a>
            <Link
              href="/playground"
              className="px-5 py-2 bg-gradient-to-r from-payless-cyan to-payless-blue text-payless-dark-bg rounded-lg font-semibold hover:shadow-lg hover:shadow-payless-cyan/50 transition-all"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-gray-300 hover:bg-payless-cyan/10"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-payless-cyan/20">
            <div className="flex flex-col space-y-4">
              <Link 
                href="/roadmap" 
                className="text-gray-300 hover:text-payless-cyan transition-colors font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                Roadmap
              </Link>
              <Link 
                href="/history" 
                className="text-gray-300 hover:text-payless-cyan transition-colors font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                History
              </Link>
              <Link 
                href="/payment-links" 
                className="text-gray-300 hover:text-payless-cyan transition-colors font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                Payment Links
              </Link>
              <Link 
                href="/streams" 
                className="text-gray-300 hover:text-payless-cyan transition-colors font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                Streams
              </Link>
              <Link 
                href="/playground" 
                className="text-gray-300 hover:text-payless-cyan transition-colors font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                Playground
              </Link>
              <Link 
                href="/dashboard" 
                className="text-gray-300 hover:text-payless-cyan transition-colors font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                Dashboard
              </Link>
              <a 
                href="https://payless.gitbook.io/payless-documentation" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-300 hover:text-payless-cyan transition-colors font-medium"
              >
                Docs
              </a>
              
              {/* Mobile Social Links */}
              <div className="flex items-center space-x-4 pt-4 border-t border-payless-cyan/20">
                <a
                  href="https://github.com/Payless2025/PayLess"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg text-gray-400 hover:text-payless-cyan hover:bg-payless-cyan/10 transition-all"
                >
                  <Github className="w-5 h-5" />
                </a>
                <a
                  href="https://x.com/paylessnetwork"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg text-gray-400 hover:text-payless-cyan hover:bg-payless-cyan/10 transition-all"
                >
                  <Twitter className="w-5 h-5" />
                </a>
              </div>

              <Link
                href="/playground"
                className="px-5 py-2 bg-gradient-to-r from-payless-cyan to-payless-blue text-payless-dark-bg rounded-lg font-semibold hover:shadow-lg transition-all text-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                Get Started
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}

