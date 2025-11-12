import { useState, useEffect, useCallback } from 'react';
import { PaylessClient } from '../client';
import { PaymentStream, PaymentStreamConfig } from '../types';

export interface UsePaymentStreamReturn {
  stream: PaymentStream | null;
  isActive: boolean;
  isLoading: boolean;
  error: string | null;
  createStream: (config: PaymentStreamConfig) => Promise<void>;
  pauseStream: () => Promise<void>;
  resumeStream: () => Promise<void>;
  cancelStream: () => Promise<void>;
  refreshStream: () => Promise<void>;
}

/**
 * React Hook for Payment Streaming
 */
export function usePaymentStream(client: PaylessClient | null, streamId?: string): UsePaymentStreamReturn {
  const [stream, setStream] = useState<PaymentStream | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch stream details
  const fetchStream = useCallback(async (id: string) => {
    if (!client) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await client.get<PaymentStream>(`/api/streams/${id}`);
      if (response.success && response.data) {
        setStream(response.data);
        setIsActive(response.data.status === 'active');
      } else {
        setError(response.error || 'Failed to fetch stream');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stream');
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  // Load stream on mount
  useEffect(() => {
    if (streamId) {
      fetchStream(streamId);
    }
  }, [streamId, fetchStream]);

  // Create new stream
  const createStream = useCallback(async (config: PaymentStreamConfig) => {
    if (!client) {
      setError('Client not initialized');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await client.post<PaymentStream>('/api/streams', config);
      if (response.success && response.data) {
        setStream(response.data);
        setIsActive(true);
      } else {
        setError(response.error || 'Failed to create stream');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create stream');
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  // Pause stream
  const pauseStream = useCallback(async () => {
    if (!client || !stream) {
      setError('No active stream');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await client.post(`/api/streams/${stream.id}`, {
        action: 'pause',
      });
      if (response.success) {
        setIsActive(false);
        await fetchStream(stream.id);
      } else {
        setError(response.error || 'Failed to pause stream');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pause stream');
    } finally {
      setIsLoading(false);
    }
  }, [client, stream, fetchStream]);

  // Resume stream
  const resumeStream = useCallback(async () => {
    if (!client || !stream) {
      setError('No active stream');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await client.post(`/api/streams/${stream.id}`, {
        action: 'resume',
      });
      if (response.success) {
        setIsActive(true);
        await fetchStream(stream.id);
      } else {
        setError(response.error || 'Failed to resume stream');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resume stream');
    } finally {
      setIsLoading(false);
    }
  }, [client, stream, fetchStream]);

  // Cancel stream
  const cancelStream = useCallback(async () => {
    if (!client || !stream) {
      setError('No active stream');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await client.post(`/api/streams/${stream.id}`, {
        action: 'cancel',
      });
      if (response.success) {
        setIsActive(false);
        setStream(null);
      } else {
        setError(response.error || 'Failed to cancel stream');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel stream');
    } finally {
      setIsLoading(false);
    }
  }, [client, stream]);

  // Refresh stream
  const refreshStream = useCallback(async () => {
    if (stream) {
      await fetchStream(stream.id);
    }
  }, [stream, fetchStream]);

  return {
    stream,
    isActive,
    isLoading,
    error,
    createStream,
    pauseStream,
    resumeStream,
    cancelStream,
    refreshStream,
  };
}

