import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  Alert,
} from 'react-native';
import {
  usePayless,
  PaymentButton,
  WalletButton,
  createPhantomWallet,
} from '@payless/react-native';

/**
 * Basic Usage Example for Payless React Native SDK
 */
export default function BasicUsageExample() {
  const [phantomWallet] = useState(() => createPhantomWallet('myapp'));

  // Initialize Payless client
  const {
    client,
    wallet,
    isConnected,
    isLoading,
    error,
    connectWallet,
    disconnectWallet,
    makeRequest,
  } = usePayless({
    walletAddress: 'YOUR_WALLET_ADDRESS',
    network: 'solana',
  });

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
    }
  }, [error]);

  const handleConnectWallet = async () => {
    try {
      await phantomWallet.connect();
      await connectWallet(phantomWallet);
      Alert.alert('Success', 'Wallet connected!');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to connect wallet');
    }
  };

  const handleDisconnectWallet = async () => {
    try {
      await disconnectWallet();
      Alert.alert('Success', 'Wallet disconnected!');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to disconnect wallet');
    }
  };

  const handlePaymentSuccess = (data: any) => {
    Alert.alert('Payment Success', 'Payment completed successfully!');
    console.log('Payment data:', data);
  };

  const handlePaymentError = (errorMessage: string) => {
    Alert.alert('Payment Failed', errorMessage);
  };

  const fetchPremiumContent = async () => {
    const response = await makeRequest('/api/premium/content', {
      paymentAmount: '1.00',
    });

    if (response.success) {
      Alert.alert('Success', JSON.stringify(response.data, null, 2));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Payless React Native SDK</Text>
        <Text style={styles.subtitle}>Basic Usage Example</Text>

        {/* Wallet Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Wallet Status</Text>
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Connected:</Text>
              <Text style={[styles.statusValue, isConnected && styles.statusConnected]}>
                {isConnected ? 'Yes' : 'No'}
              </Text>
            </View>
            {wallet && (
              <>
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Network:</Text>
                  <Text style={styles.statusValue}>{wallet.network}</Text>
                </View>
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Address:</Text>
                  <Text style={styles.statusValue} numberOfLines={1}>
                    {wallet.publicKey}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Wallet Connection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Wallet Connection</Text>
          <WalletButton
            wallet={wallet}
            onConnect={handleConnectWallet}
            onDisconnect={handleDisconnectWallet}
          />
        </View>

        {/* Payment Examples */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Examples</Text>
          
          {client && (
            <>
              <PaymentButton
                client={client}
                endpoint="/api/premium/content"
                amount="1.00"
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
                style={styles.paymentButton}
              />

              <PaymentButton
                client={client}
                endpoint="/api/data/crypto"
                amount="0.10"
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
                style={[styles.paymentButton, styles.paymentButtonSecondary]}
              >
                <Text style={styles.buttonText}>Get Crypto Data (0.10 USDC)</Text>
              </PaymentButton>

              <PaymentButton
                client={client}
                endpoint="/api/ai/chat"
                amount="0.05"
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
                style={[styles.paymentButton, styles.paymentButtonSecondary]}
              >
                <Text style={styles.buttonText}>AI Chat (0.05 USDC)</Text>
              </PaymentButton>
            </>
          )}
        </View>

        {/* Loading Indicator */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Processing...</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  statusValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  statusConnected: {
    color: '#34C759',
    fontWeight: '600',
  },
  paymentButton: {
    marginBottom: 12,
  },
  paymentButtonSecondary: {
    backgroundColor: '#5856D6',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 16,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

