import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { PaylessClient } from '../client';

export interface PaymentButtonProps {
  client: PaylessClient;
  endpoint: string;
  amount: string;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  loadingColor?: string;
  disabled?: boolean;
  children?: React.ReactNode;
}

/**
 * Payment Button Component
 * A ready-to-use button that handles payment flow
 */
export const PaymentButton: React.FC<PaymentButtonProps> = ({
  client,
  endpoint,
  amount,
  onSuccess,
  onError,
  style,
  textStyle,
  loadingColor = '#ffffff',
  disabled = false,
  children,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handlePayment = async () => {
    if (disabled || isLoading) return;

    setIsLoading(true);

    try {
      const response = await client.request(endpoint, {
        paymentAmount: amount,
      });

      if (response.success) {
        onSuccess?.(response.data);
      } else {
        onError?.(response.error || 'Payment failed');
      }
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Payment failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        style,
        (disabled || isLoading) && styles.buttonDisabled,
      ]}
      onPress={handlePayment}
      disabled={disabled || isLoading}
      activeOpacity={0.8}
    >
      {isLoading ? (
        <ActivityIndicator color={loadingColor} />
      ) : (
        <>
          {children || (
            <Text style={[styles.buttonText, textStyle]}>
              Pay {amount} USDC
            </Text>
          )}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonDisabled: {
    backgroundColor: '#CCCCCC',
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

