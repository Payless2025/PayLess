'use client';

import React, { useState } from 'react';
import { PaymentConfirmation, PaymentHistory } from '@/components/PaymentConfirmation';
import { createMockPayment } from '@/lib/x402/client';

/**
 * Payment Confirmation Demo Page
 * 
 * This page demonstrates the Payment Confirmation System features:
 * 1. Check payment confirmation by signature
 * 2. Check payment confirmation by nonce
 * 3. Monitor payment confirmation with auto-polling
 * 4. View payment history for a wallet
 */
export default function PaymentConfirmationPage() {
  const [checkMode, setCheckMode] = useState<'signature' | 'nonce' | 'monitor'>('signature');
  const [signature, setSignature] = useState<string>('');
  const [nonce, setNonce] = useState<string>('');
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);

  // Example test data
  const exampleWallet = '0x1111111111111111111111111111111111111111';
  const exampleRecipient = '0x2222222222222222222222222222222222222222';

  const handleGenerateTestPayment = () => {
    const testNonce = Math.random().toString(36).substring(7);
    const testPayment = createMockPayment(
      exampleWallet,
      exampleRecipient,
      '0.10'
    );
    
    try {
      const parsed = JSON.parse(testPayment);
      setNonce(parsed.nonce);
      setSignature(parsed.signature);
      setWalletAddress(parsed.from);
      alert('Test payment data generated! You can now use the nonce or signature to check confirmation.');
    } catch (error) {
      console.error('Error generating test payment:', error);
    }
  };

  const handleStartCheck = () => {
    setIsChecking(true);
  };

  return (
    <div className="min-h-screen bg-bg p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-text">
            Payment Confirmation System
          </h1>
          <p className="text-text-muted">
            Track, verify, and monitor payment confirmations in real-time
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-surface p-6 rounded  border-2 border-accent/30">
            <div className="text-3xl mb-3">🔍</div>
            <h3 className="text-lg font-semibold mb-2">Check by Signature</h3>
            <p className="text-sm text-text-muted">
              Verify payment confirmation using the transaction signature
            </p>
          </div>
          <div className="bg-surface p-6 rounded  border-2 border-blue-200">
            <div className="text-3xl mb-3">🔢</div>
            <h3 className="text-lg font-semibold mb-2">Check by Nonce</h3>
            <p className="text-sm text-text-muted">
              Look up payment confirmation using the unique nonce identifier
            </p>
          </div>
          <div className="bg-surface p-6 rounded  border-2 border-ok/30">
            <div className="text-3xl mb-3">⏱️</div>
            <h3 className="text-lg font-semibold mb-2">Auto-Monitor</h3>
            <p className="text-sm text-text-muted">
              Automatically poll and monitor payment confirmation status
            </p>
          </div>
        </div>

        {/* Demo Controls */}
        <div className="bg-surface rounded  p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">Try It Out</h2>

          {/* Test Data Generator */}
          <div className="bg-surface-raised p-4 rounded mb-6">
            <h3 className="font-semibold mb-2">Quick Start</h3>
            <p className="text-sm text-text-muted mb-3">
              Generate test payment data to try out the confirmation system
            </p>
            <button
              onClick={handleGenerateTestPayment}
              className="px-4 py-2 bg-accent text-text rounded hover:opacity-90 transition-colors"
            >
              Generate Test Payment Data
            </button>
          </div>

          {/* Mode Selection */}
          <div className="mb-6">
            <label className="block text-sm font-semibold mb-2">Check Mode:</label>
            <div className="flex gap-2">
              <button
                onClick={() => setCheckMode('signature')}
                className={`px-4 py-2 rounded transition-colors ${
                  checkMode === 'signature'
                    ? 'bg-accent text-text'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                By Signature
              </button>
              <button
                onClick={() => setCheckMode('nonce')}
                className={`px-4 py-2 rounded transition-colors ${
                  checkMode === 'nonce'
                    ? 'bg-blue-600 text-text'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                By Nonce
              </button>
              <button
                onClick={() => setCheckMode('monitor')}
                className={`px-4 py-2 rounded transition-colors ${
                  checkMode === 'monitor'
                    ? 'bg-ok text-text'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                Monitor
              </button>
            </div>
          </div>

          {/* Input Fields */}
          <div className="space-y-4 mb-6">
            {(checkMode === 'signature' || checkMode === 'monitor') && (
              <div>
                <label className="block text-sm font-semibold mb-2">
                  {checkMode === 'signature' ? 'Payment Signature:' : 'Payment Nonce:'}
                </label>
                {checkMode === 'signature' ? (
                  <input
                    type="text"
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    placeholder="Enter payment signature..."
                    className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />
                ) : (
                  <input
                    type="text"
                    value={nonce}
                    onChange={(e) => setNonce(e.target.value)}
                    placeholder="Enter payment nonce..."
                    className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                )}
              </div>
            )}

            {checkMode === 'nonce' && (
              <div>
                <label className="block text-sm font-semibold mb-2">Payment Nonce:</label>
                <input
                  type="text"
                  value={nonce}
                  onChange={(e) => setNonce(e.target.value)}
                  placeholder="Enter payment nonce..."
                  className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold mb-2">
                Wallet Address (optional):
              </label>
              <input
                type="text"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="Enter wallet address..."
                className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>
          </div>

          {/* Check Button */}
          <button
            onClick={handleStartCheck}
            disabled={
              isChecking ||
              (checkMode === 'signature' && !signature) ||
              ((checkMode === 'nonce' || checkMode === 'monitor') && !nonce)
            }
            className="w-full px-6 py-3 bg-accent text-bg font-medium rounded hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {checkMode === 'monitor' ? 'Start Monitoring' : 'Check Confirmation'}
          </button>
        </div>

        {/* Confirmation Result */}
        {isChecking && (
          <div className="mb-8">
            <PaymentConfirmation
              signature={checkMode === 'signature' ? signature : undefined}
              nonce={checkMode === 'nonce' || checkMode === 'monitor' ? nonce : undefined}
              walletAddress={walletAddress || undefined}
              autoMonitor={checkMode === 'monitor'}
            />
          </div>
        )}

        {/* Payment History Section */}
        <div className="bg-surface rounded  p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Payment History</h2>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded transition-colors"
            >
              {showHistory ? 'Hide' : 'Show'} History
            </button>
          </div>

          {showHistory && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">
                  Wallet Address for History:
                </label>
                <input
                  type="text"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  placeholder="Enter wallet address to view history..."
                  className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              {walletAddress && <PaymentHistory walletAddress={walletAddress} limit={10} />}

              {!walletAddress && (
                <div className="text-center text-text-faint py-8">
                  Enter a wallet address to view payment history
                </div>
              )}
            </>
          )}
        </div>

        {/* API Documentation Link */}
        <div className="mt-8 p-6 rounded border border-accent/30 bg-accent-wash">
          <h3 className="font-semibold mb-2">📚 API Documentation</h3>
          <p className="text-sm text-text-muted mb-3">
            Integrate the Payment Confirmation System into your application using our API
          </p>
          <div className="space-y-2 text-sm">
            <div className="font-mono bg-surface p-2 rounded">
              <span className="text-ok">GET</span> /api/payment/confirm?walletAddress=...
            </div>
            <div className="font-mono bg-surface p-2 rounded">
              <span className="text-text-faint">POST</span> /api/payment/confirm
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

