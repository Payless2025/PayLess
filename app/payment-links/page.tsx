'use client';

import { useState, useEffect } from 'react';
import { Link2, Copy, CheckCircle2, Trash2, Plus, ExternalLink } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface PaymentLink {
  id: string;
  amount: string;
  description?: string;
  chains: string[];
  status: 'active' | 'completed' | 'expired';
  createdAt: number;
  url: string;
}

export default function PaymentLinksPage() {
  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form state
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedChains, setSelectedChains] = useState<string[]>(['robinhood']);
  const [recipientAddress, setRecipientAddress] = useState('');

  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    try {
      const response = await fetch('/api/payment-links');
      const data = await response.json();
      if (data.success) {
        setLinks(data.links);
      }
    } catch (error) {
      console.error('Error fetching payment links:', error);
    } finally {
      setLoading(false);
    }
  };

  const createLink = async () => {
    if (!amount || !recipientAddress) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const response = await fetch('/api/payment-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          description,
          chains: selectedChains,
          recipientAddress,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setShowCreateModal(false);
        setAmount('');
        setDescription('');
        setRecipientAddress('');
        fetchLinks();
      } else {
        alert(data.error || 'Failed to create payment link');
      }
    } catch (error) {
      console.error('Error creating payment link:', error);
      alert('Failed to create payment link');
    }
  };

  const deleteLink = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payment link?')) return;

    try {
      const response = await fetch(`/api/payment-links?id=${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        fetchLinks();
      }
    } catch (error) {
      console.error('Error deleting payment link:', error);
    }
  };

  const copyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleChain = (chain: string) => {
    if (selectedChains.includes(chain)) {
      setSelectedChains(selectedChains.filter(c => c !== chain));
    } else {
      setSelectedChains([...selectedChains, chain]);
    }
  };

  return (
    <>
      <Header />
      <div className="min-h-screen bg-bg pt-20">
        <div className="container mx-auto px-4 py-16 max-w-6xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Link2 className="w-10 h-10 text-accent" />
                <h1 className="text-4xl font-bold text-text">Payment Links</h1>
              </div>
              <p className="text-text-muted">Create shareable crypto payment URLs</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-accent hover:opacity-90 text-text rounded font-semibold transition-all  hover:"
            >
              <Plus className="w-5 h-5" />
              Create Link
            </button>
          </div>

          {/* Payment Links List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent mx-auto"></div>
            </div>
          ) : links.length === 0 ? (
            <div className="bg-surface-raised border-2 border-dashed border-line rounded p-12 text-center">
              <Link2 className="w-16 h-16 text-text-faint mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-text mb-2">No payment links yet</h3>
              <p className="text-text-muted mb-6">Create your first payment link to get started</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-accent hover:opacity-90 text-text rounded font-semibold transition-all "
              >
                Create Link
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {links.map((link) => (
                <div
                  key={link.id}
                  className="bg-surface border border-line rounded p-6 hover:border-accent hover: transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-text">${link.amount}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          link.status === 'active' ? 'bg-ok/10 text-ok' :
                          link.status === 'completed' ? 'bg-ok/10 text-ok' :
                          'bg-surface-raised text-text-muted'
                        }`}>
                          {link.status}
                        </span>
                      </div>
                      {link.description && (
                        <p className="text-text-muted text-sm mb-3">{link.description}</p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        {link.chains.map((chain) => (
                          <span key={chain} className="px-2 py-1 bg-accent-wash text-accent rounded text-xs flex items-center gap-1 border border-accent/30">
                            <img src="/assets/robinhood-logo.svg" alt={chain} className="w-3 h-3" />
                            Robinhood Chain
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteLink(link.id)}
                      className="p-2 text-text-faint hover:text-err transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Link URL */}
                  <div className="flex items-center gap-2 bg-surface-raised border border-line rounded p-3">
                    <input
                      type="text"
                      value={link.url}
                      readOnly
                      className="flex-1 bg-transparent text-text-muted text-sm outline-none"
                    />
                    <button
                      onClick={() => copyLink(link.url, link.id)}
                      className="p-2 hover:bg-gray-200 rounded transition-all"
                    >
                      {copiedId === link.id ? (
                        <CheckCircle2 className="w-5 h-5 text-ok" />
                      ) : (
                        <Copy className="w-5 h-5 text-text-faint" />
                      )}
                    </button>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 hover:bg-gray-200 rounded transition-all"
                    >
                      <ExternalLink className="w-5 h-5 text-text-faint" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Create Modal */}
          {showCreateModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-surface border border-line rounded p-6 max-w-md w-full shadow-2xl">
                <h2 className="text-2xl font-bold text-text mb-4">Create Payment Link</h2>
                
                <div className="space-y-4">
                  {/* Amount */}
                  <div>
                    <label className="block text-text-muted text-sm font-medium mb-2">
                      Amount (USD) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="5.00"
                      className="w-full bg-surface border border-line rounded px-4 py-2 text-text focus:outline-none focus:ring-2 focus:border-accent focus:border-accent"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-text-muted text-sm font-medium mb-2">
                      Description (optional)
                    </label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Payment for..."
                      className="w-full bg-surface border border-line rounded px-4 py-2 text-text focus:outline-none focus:ring-2 focus:border-accent focus:border-accent"
                    />
                  </div>

                  {/* Recipient Address */}
                  <div>
                    <label className="block text-text-muted text-sm font-medium mb-2">
                      Recipient Address *
                    </label>
                    <input
                      type="text"
                      value={recipientAddress}
                      onChange={(e) => setRecipientAddress(e.target.value)}
                      placeholder="Your wallet address"
                      className="w-full bg-surface border border-line rounded px-4 py-2 text-text font-mono text-sm focus:outline-none focus:ring-2 focus:border-accent focus:border-accent"
                    />
                  </div>

                  {/* Chains */}
                  <div>
                    <label className="block text-text-muted text-sm font-medium mb-2">
                      Supported Chains
                    </label>
                    <div className="flex gap-2">
                      {['robinhood'].map((chain) => (
                        <button
                          key={chain}
                          onClick={() => toggleChain(chain)}
                          className={`px-4 py-2 rounded border-2 transition-all ${
                            selectedChains.includes(chain)
                              ? 'border-accent bg-accent-wash text-accent font-semibold'
                              : 'border-line bg-surface text-text-muted'
                          }`}
                        >
                          Robinhood Chain
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-2 bg-surface-raised hover:bg-gray-200 text-text-muted rounded transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createLink}
                    className="flex-1 px-4 py-2 bg-accent hover:opacity-90 text-text rounded font-semibold transition-all "
                  >
                    Create Link
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
