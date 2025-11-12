import React, { useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import {
  usePayless,
  usePaymentStream,
  WalletButton,
  createPhantomWallet,
} from '@payless/react-native';

/**
 * Payment Streaming Example
 */
export default function StreamingExample() {
  const phantomWallet = createPhantomWallet('myapp');

  const {
    client,
    wallet,
    isConnected,
    connectWallet,
    disconnectWallet,
  } = usePayless({
    walletAddress: 'YOUR_WALLET_ADDRESS',
    network: 'solana',
  });

  const {
    stream,
    isActive,
    isLoading,
    error,
    createStream,
    pauseStream,
    resumeStream,
    cancelStream,
    refreshStream,
  } = usePaymentStream(client);

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
    }
  }, [error]);

  const handleConnectWallet = async () => {
    try {
      await phantomWallet.connect();
      await connectWallet(phantomWallet);
    } catch (err) {
      Alert.alert('Error', 'Failed to connect wallet');
    }
  };

  const handleCreateStream = async () => {
    if (!isConnected) {
      Alert.alert('Error', 'Please connect your wallet first');
      return;
    }

    try {
      await createStream({
        recipient: 'YOUR_WALLET_ADDRESS',
        amountPerInterval: '0.10',
        interval: 60, // 1 minute
        duration: 3600, // 1 hour
      });
      Alert.alert('Success', 'Payment stream created!');
    } catch (err) {
      Alert.alert('Error', 'Failed to create stream');
    }
  };

  const handlePauseStream = async () => {
    try {
      await pauseStream();
      Alert.alert('Success', 'Stream paused');
    } catch (err) {
      Alert.alert('Error', 'Failed to pause stream');
    }
  };

  const handleResumeStream = async () => {
    try {
      await resumeStream();
      Alert.alert('Success', 'Stream resumed');
    } catch (err) {
      Alert.alert('Error', 'Failed to resume stream');
    }
  };

  const handleCancelStream = async () => {
    Alert.alert(
      'Cancel Stream',
      'Are you sure you want to cancel this stream?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelStream();
              Alert.alert('Success', 'Stream cancelled');
            } catch (err) {
              Alert.alert('Error', 'Failed to cancel stream');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Payment Streaming</Text>
        <Text style={styles.subtitle}>Continuous Micropayments</Text>

        {/* Wallet Connection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Wallet</Text>
          <WalletButton
            wallet={wallet}
            onConnect={handleConnectWallet}
            onDisconnect={disconnectWallet}
          />
        </View>

        {/* Stream Status */}
        {stream && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Stream Status</Text>
            <View style={styles.streamCard}>
              <View style={styles.streamHeader}>
                <Text style={styles.streamId}>Stream #{stream.id.slice(0, 8)}</Text>
                <View style={[
                  styles.statusBadge,
                  isActive ? styles.statusActive : styles.statusInactive,
                ]}>
                  <Text style={styles.statusBadgeText}>
                    {stream.status.toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.streamInfo}>
                <InfoRow label="Amount/Interval" value={`${stream.amountPerInterval} USDC`} />
                <InfoRow label="Interval" value={`${stream.interval}s`} />
                <InfoRow label="Total Paid" value={`${stream.totalPaid} USDC`} />
                <InfoRow 
                  label="Recipient" 
                  value={`${stream.recipient.slice(0, 6)}...${stream.recipient.slice(-4)}`} 
                />
              </View>

              <TouchableOpacity 
                style={styles.refreshButton}
                onPress={refreshStream}
                disabled={isLoading}
              >
                <Text style={styles.refreshButtonText}>
                  {isLoading ? 'Refreshing...' : '🔄 Refresh'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Stream Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Controls</Text>
          
          {!stream ? (
            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary]}
              onPress={handleCreateStream}
              disabled={!isConnected || isLoading}
            >
              <Text style={styles.buttonText}>
                {isConnected ? 'Create Stream' : 'Connect Wallet to Start'}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.controlButtons}>
              {isActive ? (
                <TouchableOpacity
                  style={[styles.button, styles.buttonWarning]}
                  onPress={handlePauseStream}
                  disabled={isLoading}
                >
                  <Text style={styles.buttonText}>⏸️ Pause</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.button, styles.buttonSuccess]}
                  onPress={handleResumeStream}
                  disabled={isLoading}
                >
                  <Text style={styles.buttonText}>▶️ Resume</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.button, styles.buttonDanger]}
                onPress={handleCancelStream}
                disabled={isLoading}
              >
                <Text style={styles.buttonText}>❌ Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>ℹ️ How it works</Text>
          <Text style={styles.infoText}>
            Payment streaming enables continuous micropayments over time. 
            Set an amount per interval and the stream will automatically 
            process payments at regular intervals.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

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
  streamCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  streamHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  streamId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusActive: {
    backgroundColor: '#34C759',
  },
  statusInactive: {
    backgroundColor: '#FF9500',
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  streamInfo: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  refreshButton: {
    padding: 12,
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    alignItems: 'center',
  },
  refreshButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonPrimary: {
    backgroundColor: '#007AFF',
  },
  buttonSuccess: {
    backgroundColor: '#34C759',
  },
  buttonWarning: {
    backgroundColor: '#FF9500',
  },
  buttonDanger: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  controlButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1565C0',
    lineHeight: 20,
  },
});

