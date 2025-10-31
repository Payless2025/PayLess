'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Github, Twitter, Menu, X } from 'lucide-react';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <img 
              src="/assets/logo-horizontal.png" 
              alt="Payless" 
              className="h-8"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link 
              href="#features" 
              className="text-gray-700 hover:text-purple-600 transition-colors font-medium"
            >
              Features
            </Link>
            <Link 
              href="/playground" 
              className="text-gray-700 hover:text-purple-600 transition-colors font-medium"
            >
              Playground
            </Link>
            <Link 
              href="/analytics" 
              className="text-gray-700 hover:text-purple-600 transition-colors font-medium"
            >
              Analytics
            </Link>
            <a 
              href="https://payless.gitbook.io/payless-documentation" 
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-700 hover:text-purple-600 transition-colors font-medium"
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
              className="p-2 rounded-lg text-gray-600 hover:text-purple-600 hover:bg-purple-50 transition-all"
              aria-label="GitHub"
            >
              <Github className="w-5 h-5" />
            </a>
            <a
              href="https://x.com/paylessnetwork"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg text-gray-600 hover:text-purple-600 hover:bg-purple-50 transition-all"
              aria-label="X (Twitter)"
            >
              <Twitter className="w-5 h-5" />
            </a>
            <Link
              href="/playground"
              className="px-5 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-all shadow-sm hover:shadow-md"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
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
          <div className="md:hidden py-4 border-t border-gray-100">
            <div className="flex flex-col space-y-4">
              <Link 
                href="#features" 
                className="text-gray-700 hover:text-purple-600 transition-colors font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                Features
              </Link>
              <Link 
                href="/playground" 
                className="text-gray-700 hover:text-purple-600 transition-colors font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                Playground
              </Link>
              <Link 
                href="/analytics" 
                className="text-gray-700 hover:text-purple-600 transition-colors font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                Analytics
              </Link>
              <a 
                href="https://payless.gitbook.io/payless-documentation" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-700 hover:text-purple-600 transition-colors font-medium"
              >
                Docs
              </a>
              
              {/* Mobile Social Links */}
              <div className="flex items-center space-x-4 pt-4 border-t border-gray-100">
                <a
                  href="https://github.com/Payless2025/PayLess"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg text-gray-600 hover:text-purple-600 hover:bg-purple-50 transition-all"
                >
                  <Github className="w-5 h-5" />
                </a>
                <a
                  href="https://x.com/paylessnetwork"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg text-gray-600 hover:text-purple-600 hover:bg-purple-50 transition-all"
                >
                  <Twitter className="w-5 h-5" />
                </a>
              </div>

              <Link
                href="/playground"
                className="px-5 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-all shadow-sm text-center"
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

