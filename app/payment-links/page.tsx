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
  const [selectedChains, setSelectedChains] = useState<string[]>(['solana', 'bsc', 'ethereum']);
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
      <div className="min-h-screen bg-white pt-20">
        <div className="container mx-auto px-4 py-16 max-w-6xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Link2 className="w-10 h-10 text-purple-600" />
                <h1 className="text-4xl font-bold text-gray-900">Payment Links</h1>
              </div>
              <p className="text-gray-600">Create shareable crypto payment URLs</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
            >
              <Plus className="w-5 h-5" />
              Create Link
            </button>
          </div>

          {/* Payment Links List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600 mx-auto"></div>
            </div>
          ) : links.length === 0 ? (
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
              <Link2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No payment links yet</h3>
              <p className="text-gray-600 mb-6">Create your first payment link to get started</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-all shadow-md"
              >
                Create Link
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {links.map((link) => (
                <div
                  key={link.id}
                  className="bg-white border border-gray-200 rounded-lg p-6 hover:border-purple-500 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900">${link.amount}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          link.status === 'active' ? 'bg-green-100 text-green-700' :
                          link.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {link.status}
                        </span>
                      </div>
                      {link.description && (
                        <p className="text-gray-600 text-sm mb-3">{link.description}</p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        {link.chains.map((chain) => {
                          const logo = chain === 'solana' 
                            ? '/assets/sol-logo.png'
                            : chain === 'bsc'
                            ? '/assets/bsc-logo.png'
                            : '/assets/eth-logo.png';
                          return (
                            <span key={chain} className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs flex items-center gap-1 border border-purple-200">
                              <img src={logo} alt={chain} className="w-3 h-3" />
                              {chain}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteLink(link.id)}
                      className="p-2 text-gray-500 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Link URL */}
                  <div className="flex items-center gap-2 bg-gray-50 border border-gray-300 rounded-lg p-3">
                    <input
                      type="text"
                      value={link.url}
                      readOnly
                      className="flex-1 bg-transparent text-gray-700 text-sm outline-none"
                    />
                    <button
                      onClick={() => copyLink(link.url, link.id)}
                      className="p-2 hover:bg-gray-200 rounded transition-all"
                    >
                      {copiedId === link.id ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <Copy className="w-5 h-5 text-gray-500" />
                      )}
                    </button>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 hover:bg-gray-200 rounded transition-all"
                    >
                      <ExternalLink className="w-5 h-5 text-gray-500" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Create Modal */}
          {showCreateModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-md w-full shadow-2xl">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Create Payment Link</h2>
                
                <div className="space-y-4">
                  {/* Amount */}
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      Amount (USD) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="5.00"
                      className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      Description (optional)
                    </label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Payment for..."
                      className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>

                  {/* Recipient Address */}
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      Recipient Address *
                    </label>
                    <input
                      type="text"
                      value={recipientAddress}
                      onChange={(e) => setRecipientAddress(e.target.value)}
                      placeholder="Your wallet address"
                      className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>

                  {/* Chains */}
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      Supported Chains
                    </label>
                    <div className="flex gap-2">
                      {['solana', 'bsc', 'ethereum'].map((chain) => (
                        <button
                          key={chain}
                          onClick={() => toggleChain(chain)}
                          className={`px-4 py-2 rounded-lg border-2 transition-all capitalize ${
                            selectedChains.includes(chain)
                              ? 'border-purple-600 bg-purple-50 text-purple-700 font-semibold'
                              : 'border-gray-300 bg-white text-gray-600'
                          }`}
                        >
                          {chain}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createLink}
                    className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-all shadow-md"
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
