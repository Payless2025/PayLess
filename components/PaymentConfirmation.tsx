'use client';

import React, { useState, useEffect } from 'react';
import {
  checkPaymentConfirmation,
  checkPaymentConfirmationByNonce,
  getPaymentHistory,
  monitorPaymentConfirmation,
} from '@/lib/x402/client';

interface PaymentConfirmationProps {
  signature?: string;
  nonce?: string;
  walletAddress?: string;
  autoMonitor?: boolean;
}

/**
 * PaymentConfirmation Component
 * 
 * Displays payment confirmation status and details
 * Can be used to check payment status by signature or nonce
 * Supports auto-monitoring with polling
 */
export function PaymentConfirmation({
  signature,
  nonce,
  walletAddress,
  autoMonitor = false,
}: PaymentConfirmationProps) {
  const [status, setStatus] = useState<'idle' | 'checking' | 'confirmed' | 'not_found' | 'error'>('idle');
  const [confirmation, setConfirmation] = useState<any>(null);
  const [message, setMessage] = useState<string>('');
  const [attempts, setAttempts] = useState<number>(0);

  useEffect(() => {
    if (autoMonitor && nonce) {
      handleMonitorPayment();
    } else if (signature || nonce) {
      handleCheckPayment();
    }
  }, [signature, nonce, autoMonitor]);

  const handleCheckPayment = async () => {
    setStatus('checking');
    setMessage('Checking payment confirmation...');

    try {
      const result = signature
        ? await checkPaymentConfirmation(signature, walletAddress)
        : nonce
        ? await checkPaymentConfirmationByNonce(nonce, walletAddress)
        : null;

      if (result) {
        if (result.confirmed) {
          setStatus('confirmed');
          setConfirmation(result.confirmation);
          setMessage(result.message);
        } else {
          setStatus('not_found');
          setMessage(result.message);
        }
      } else {
        setStatus('error');
        setMessage('No signature or nonce provided');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Error checking payment confirmation');
      console.error('Error checking payment:', error);
    }
  };

  const handleMonitorPayment = async () => {
    if (!nonce) return;

    setStatus('checking');
    setMessage('Monitoring payment confirmation...');

    try {
      const result = await monitorPaymentConfirmation(nonce, {
        timeout: 60000,
        interval: 2000,
        onUpdate: (confirmed, currentAttempts) => {
          setAttempts(currentAttempts);
          if (!confirmed) {
            setMessage(`Checking payment confirmation... (Attempt ${currentAttempts})`);
          }
        },
      });

      if (result.confirmed) {
        setStatus('confirmed');
        setConfirmation(result.confirmation);
        setMessage(result.message);
      } else {
        setStatus('not_found');
        setMessage(result.message);
      }
    } catch (error) {
      setStatus('error');
      setMessage('Error monitoring payment confirmation');
      console.error('Error monitoring payment:', error);
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'confirmed':
        return 'bg-ok/10 border-green-500 text-ok';
      case 'checking':
        return 'bg-accent-wash border-accent/30 text-accent';
      case 'not_found':
        return 'bg-warn/10 border-yellow-500 text-warn';
      case 'error':
        return 'bg-err/10 border-red-500 text-err';
      default:
        return 'bg-surface-raised border-gray-500 text-text';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'confirmed':
        return '✅';
      case 'checking':
        return '🔄';
      case 'not_found':
        return '❓';
      case 'error':
        return '❌';
      default:
        return '💳';
    }
  };

  return (
    <div className={`p-6 rounded border-2 ${getStatusColor()} transition-all duration-300`}>
      <div className="flex items-start gap-4">
        <div className="text-4xl">{getStatusIcon()}</div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold mb-2">
            Payment Confirmation Status
          </h3>
          <p className="mb-3">{message}</p>

          {status === 'checking' && attempts > 0 && (
            <p className="text-sm opacity-75">Attempts: {attempts}</p>
          )}

          {confirmation && (
            <div className="mt-4 p-4 bg-surface bg-opacity-50 rounded border">
              <h4 className="font-semibold mb-2">Confirmation Details:</h4>
              <div className="space-y-1 text-sm font-mono">
                <div>
                  <span className="font-semibold">ID:</span> {confirmation.id}
                </div>
                <div>
                  <span className="font-semibold">Amount:</span> {confirmation.amount} {confirmation.token}
                </div>
                <div>
                  <span className="font-semibold">Wallet:</span>{' '}
                  {confirmation.walletAddress.substring(0, 8)}...
                  {confirmation.walletAddress.substring(confirmation.walletAddress.length - 8)}
                </div>
                <div>
                  <span className="font-semibold">Endpoint:</span> {confirmation.endpoint}
                </div>
                <div>
                  <span className="font-semibold">Confirmed At:</span>{' '}
                  {new Date(confirmation.confirmedAt).toLocaleString()}
                </div>
                {confirmation.metadata?.responseTime && (
                  <div>
                    <span className="font-semibold">Response Time:</span>{' '}
                    {confirmation.metadata.responseTime}ms
                  </div>
                )}
              </div>
            </div>
          )}

          {status !== 'checking' && (signature || nonce) && (
            <button
              onClick={autoMonitor ? handleMonitorPayment : handleCheckPayment}
              className="mt-4 px-4 py-2 bg-surface bg-opacity-50 hover:bg-opacity-75 rounded border transition-colors"
            >
              Check Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * PaymentHistory Component
 * 
 * Displays payment history for a wallet address
 */
interface PaymentHistoryProps {
  walletAddress: string;
  limit?: number;
}

export function PaymentHistory({ walletAddress, limit = 10 }: PaymentHistoryProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (walletAddress) {
      loadHistory();
    }
  }, [walletAddress, limit]);

  const loadHistory = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getPaymentHistory(walletAddress, { limit });
      if (result.error) {
        setError(result.error);
      } else {
        setHistory(result.confirmations || []);
      }
    } catch (err) {
      setError('Failed to load payment history');
      console.error('Error loading payment history:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 rounded border border-accent/30 bg-accent-wash">
        <div className="flex items-center gap-2">
          <div className="animate-spin">🔄</div>
          <span>Loading payment history...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-err/10 rounded border-2 border-red-500">
        <div className="flex items-center gap-2">
          <span>❌</span>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="p-6 bg-surface-raised rounded border-2 border-line">
        <p className="text-text-muted">No payment history found for this wallet.</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-surface rounded border-2 border-line">
      <h3 className="text-lg font-semibold mb-4">Payment History</h3>
      <div className="space-y-3">
        {history.map((confirmation) => (
          <div
            key={confirmation.id}
            className="p-4 bg-surface-raised rounded border hover:bg-surface-raised transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold">
                {confirmation.amount} {confirmation.token}
              </span>
              <span
                className={`px-2 py-1 rounded text-xs font-semibold ${
                  confirmation.status === 'confirmed'
                    ? 'bg-green-200 text-ok'
                    : confirmation.status === 'pending'
                    ? 'bg-yellow-200 text-warn'
                    : 'bg-red-200 text-err'
                }`}
              >
                {confirmation.status}
              </span>
            </div>
            <div className="text-sm text-text-muted space-y-1">
              <div>
                <span className="font-semibold">Endpoint:</span> {confirmation.endpoint}
              </div>
              <div>
                <span className="font-semibold">Date:</span>{' '}
                {new Date(confirmation.confirmedAt).toLocaleString()}
              </div>
              <div className="font-mono text-xs">
                <span className="font-semibold">Signature:</span>{' '}
                {confirmation.paymentSignature.substring(0, 16)}...
              </div>
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={loadHistory}
        className="mt-4 w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded transition-colors"
      >
        Refresh History
      </button>
    </div>
  );
}

export default PaymentConfirmation;

