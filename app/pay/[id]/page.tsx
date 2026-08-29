'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle2, Clock, XCircle, Copy, ExternalLink } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getRobinhoodAddressLink } from '@/lib/chains/robinhood';

interface PaymentLink {
  id: string;
  amount: string;
  currency: string;
  description?: string;
  chains: string[];
  recipientAddress: string;
  status: 'active' | 'completed' | 'expired';
  completedAt?: number;
  transactionSignature?: string;
  paidBy?: string;
  paidChain?: string;
}

export default function PaymentPage() {
  const params = useParams();
  const linkId = params.id as string;
  
  const [paymentLink, setPaymentLink] = useState<PaymentLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChain, setSelectedChain] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchPaymentLink();
  }, [linkId]);

  const fetchPaymentLink = async () => {
    try {
      const response = await fetch(`/api/payment-links/${linkId}`);
      const data = await response.json();

      if (data.success) {
        setPaymentLink(data.link);
        setSelectedChain(data.link.chains[0]);
      } else {
        setError(data.error || 'Payment link not found');
      }
    } catch (err) {
      setError('Failed to load payment link');
    } finally {
      setLoading(false);
    }
  };

  const copyAddress = () => {
    if (paymentLink) {
      navigator.clipboard.writeText(paymentLink.recipientAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getChainIcon = (chain: string) => {
    switch (chain) {
      case 'robinhood':
        return <img src="/assets/robinhood-logo.svg" alt="Robinhood Chain" className="w-6 h-6" />;
      default:
        return <span className="text-2xl">🔗</span>;
    }
  };

  const getChainName = (chain: string) => {
    switch (chain) {
      case 'robinhood': return 'Robinhood Chain';
      default: return chain;
    }
  };

  const getExplorerUrl = (chain: string, address: string) =>
    getRobinhoodAddressLink(address);

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-bg flex items-center justify-center pt-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
        </div>
        <Footer />
      </>
    );
  }

  if (error || !paymentLink) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-bg flex items-center justify-center p-4 pt-20">
          <div className="bg-surface border-2 border-err/30 rounded p-8 max-w-md w-full text-center ">
            <XCircle className="w-16 h-16 text-err mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-text mb-2">Payment Link Not Found</h1>
            <p className="text-text-muted">{error}</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (paymentLink.status === 'completed') {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-bg flex items-center justify-center p-4 pt-20">
          <div className="bg-surface border-2 border-ok/30 rounded p-8 max-w-md w-full text-center ">
            <CheckCircle2 className="w-16 h-16 text-ok mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-text mb-2">Payment Completed</h1>
            <p className="text-text-muted mb-4">This payment link has already been used</p>
            {paymentLink.transactionSignature && (
              <div className="bg-surface-raised border border-line rounded p-3 text-sm">
                <p className="text-text-muted mb-1">Transaction:</p>
                <p className="text-text break-all font-mono">{paymentLink.transactionSignature}</p>
              </div>
            )}
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (paymentLink.status === 'expired') {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-bg flex items-center justify-center p-4 pt-20">
          <div className="bg-surface border-2 border-orange-300 rounded p-8 max-w-md w-full text-center ">
            <Clock className="w-16 h-16 text-orange-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-text mb-2">Payment Link Expired</h1>
            <p className="text-text-muted">This payment link is no longer valid</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-bg flex items-center justify-center p-4 pt-20">
        <div className="bg-surface border border-line rounded p-8 max-w-md w-full shadow-xl">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-text mb-2">Payment Request</h1>
            {paymentLink.description && (
              <p className="text-text-muted">{paymentLink.description}</p>
            )}
          </div>

          {/* Amount */}
          <div className="rounded border border-accent/30 bg-accent-wash p-6 mb-6 text-center ">
            <p className="text-purple-100 text-sm mb-1">Amount</p>
            <p className="text-4xl font-bold text-text">${paymentLink.amount}</p>
            <p className="text-purple-100 text-sm mt-1">{paymentLink.currency}</p>
          </div>

          {/* Chain Selection */}
          <div className="mb-6">
            <label className="block text-text-muted text-sm font-medium mb-2">
              Select Blockchain
            </label>
            <div className="grid grid-cols-3 gap-2">
              {paymentLink.chains.map((chain) => (
                <button
                  key={chain}
                  onClick={() => setSelectedChain(chain)}
                  className={`p-3 rounded border-2 transition-all ${
                    selectedChain === chain
                      ? 'border-accent bg-accent-wash'
                      : 'border-line bg-surface hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-center justify-center mb-1">{getChainIcon(chain)}</div>
                  <div className="text-xs text-text-muted">{getChainName(chain)}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Recipient Address */}
          <div className="mb-6">
            <label className="block text-text-muted text-sm font-medium mb-2">
              Send Payment To
            </label>
            <div className="bg-surface-raised border border-line rounded p-3">
              <div className="flex items-center gap-2 mb-2">
                <code className="flex-1 text-xs font-mono text-text break-all">
                  {paymentLink.recipientAddress}
                </code>
                <button
                  onClick={copyAddress}
                  className="p-2 hover:bg-gray-200 rounded transition-all"
                  title="Copy address"
                >
                  {copied ? (
                    <CheckCircle2 className="w-4 h-4 text-ok" />
                  ) : (
                    <Copy className="w-4 h-4 text-text-faint" />
                  )}
                </button>
                <a
                  href={getExplorerUrl(selectedChain, paymentLink.recipientAddress)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 hover:bg-gray-200 rounded transition-all"
                  title="View on explorer"
                >
                  <ExternalLink className="w-4 h-4 text-text-faint" />
                </a>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-accent-wash border border-accent/30 rounded p-4">
            <h3 className="text-sm font-medium text-text mb-2">Payment Instructions</h3>
            <ol className="text-sm text-purple-800 space-y-1 list-decimal list-inside">
              <li>Copy the recipient address above</li>
              <li>Open your {getChainName(selectedChain)} wallet</li>
              <li>Send exactly <strong>${paymentLink.amount}</strong> in {paymentLink.currency}</li>
              <li>Wait for confirmation</li>
            </ol>
          </div>

          {/* Warning */}
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-xs text-warn">
              ⚠️ Make sure to send the exact amount to the correct address on the selected blockchain.
              Payments to wrong addresses or incorrect amounts cannot be refunded.
            </p>
          </div>

          {/* Powered by */}
          <div className="mt-6 text-center">
            <p className="text-xs text-text-faint">
              Powered by{' '}
              <a href="https://payless.network" className="text-accent hover:text-accent font-medium">
                Payless
              </a>
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
