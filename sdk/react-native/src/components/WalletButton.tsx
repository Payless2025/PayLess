import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { WalletAdapter } from '../types';

export interface WalletButtonProps {
  wallet: WalletAdapter | undefined;
  onConnect: () => void;
  onDisconnect: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  connectedStyle?: ViewStyle;
  disconnectedStyle?: ViewStyle;
  connectText?: string;
  disconnectText?: string;
}

/**
 * Wallet Connection Button Component
 */
export const WalletButton: React.FC<WalletButtonProps> = ({
  wallet,
  onConnect,
  onDisconnect,
  style,
  textStyle,
  connectedStyle,
  disconnectedStyle,
  connectText = 'Connect Wallet',
  disconnectText = 'Disconnect',
}) => {
  const isConnected = !!wallet;

  const handlePress = () => {
    if (isConnected) {
      onDisconnect();
    } else {
      onConnect();
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        style,
        isConnected ? connectedStyle || styles.buttonConnected : disconnectedStyle || styles.buttonDisconnected,
      ]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        {isConnected && (
          <View style={styles.indicator} />
        )}
        <Text style={[styles.buttonText, textStyle]}>
          {isConnected ? disconnectText : connectText}
        </Text>
      </View>
      {isConnected && wallet && (
        <Text style={styles.address} numberOfLines={1}>
          {formatAddress(wallet.publicKey)}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const formatAddress = (address: string): string => {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonDisconnected: {
    backgroundColor: '#007AFF',
  },
  buttonConnected: {
    backgroundColor: '#34C759',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  address: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 4,
    opacity: 0.8,
  },
});

