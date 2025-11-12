# Payless React Native SDK

Official React Native SDK for Payless - Accept crypto payments in your mobile apps with the x402 protocol.

[![npm version](https://badge.fury.io/js/@payless%2Freact-native.svg)](https://www.npmjs.com/package/@payless/react-native)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- ✅ **Multi-Chain Support** - Solana, Ethereum, and BSC
- 📱 **Mobile-First** - Optimized for React Native (iOS & Android)
- 🎣 **React Hooks** - Easy integration with hooks-based API
- 🎨 **UI Components** - Pre-built payment and wallet buttons
- 💳 **Wallet Integration** - Phantom Mobile & WalletConnect support
- 💧 **Payment Streaming** - Continuous micropayments
- 🔒 **Secure** - Cryptographic signing with industry standards
- 🚀 **Easy to Use** - Simple API, comprehensive docs

## Installation

```bash
npm install @payless/react-native

# Or with yarn
yarn add @payless/react-native
```

### Additional Dependencies

For full functionality, install these peer dependencies:

```bash
# Required
npm install react react-native

# For AsyncStorage (optional, for caching)
npm install @react-native-async-storage/async-storage

# For WalletConnect (optional)
npm install @walletconnect/react-native-compat @walletconnect/web3wallet
```

## Quick Start

### 1. Basic Setup

```typescript
import React from 'react';
import { View } from 'react-native';
import { 
  usePayless, 
  PaymentButton, 
  WalletButton,
  createPhantomWallet 
} from '@payless/react-native';

function App() {
  const phantomWallet = createPhantomWallet('myapp');
  
  const { client, wallet, isConnected, connectWallet, disconnectWallet } = usePayless({
    walletAddress: 'YOUR_WALLET_ADDRESS',
    network: 'solana',
  });

  const handleConnect = async () => {
    await phantomWallet.connect();
    await connectWallet(phantomWallet);
  };

  return (
    <View>
      <WalletButton
        wallet={wallet}
        onConnect={handleConnect}
        onDisconnect={disconnectWallet}
      />
      
      {client && (
        <PaymentButton
          client={client}
          endpoint="/api/premium/content"
          amount="1.00"
          onSuccess={(data) => console.log('Payment success:', data)}
          onError={(error) => console.error('Payment error:', error)}
        />
      )}
    </View>
  );
}
```

### 2. Payment Streaming

```typescript
import { usePaymentStream } from '@payless/react-native';

function StreamingComponent() {
  const { client } = usePayless({ walletAddress: 'YOUR_ADDRESS' });
  
  const {
    stream,
    isActive,
    createStream,
    pauseStream,
    cancelStream,
  } = usePaymentStream(client);

  const startStream = async () => {
    await createStream({
      recipient: 'RECIPIENT_ADDRESS',
      amountPerInterval: '0.10',
      interval: 60, // 1 minute
      duration: 3600, // 1 hour
    });
  };

  return (
    <View>
      {/* Your streaming UI */}
    </View>
  );
}
```

## API Reference

### Hooks

#### `usePayless(config)`

Main hook for Payless SDK.

```typescript
const {
  client,           // PaylessClient instance
  wallet,           // Connected wallet adapter
  isConnected,      // Connection status
  isLoading,        // Loading state
  error,            // Error message
  connectWallet,    // Connect wallet function
  disconnectWallet, // Disconnect wallet function
  makeRequest,      // Make API request function
} = usePayless({
  walletAddress: string,
  network?: 'solana' | 'ethereum' | 'bsc',
  rpcUrl?: string,
  tokenAddress?: string,
});
```

#### `usePaymentStream(client, streamId?)`

Hook for payment streaming.

```typescript
const {
  stream,         // Current stream data
  isActive,       // Stream active status
  isLoading,      // Loading state
  error,          // Error message
  createStream,   // Create new stream
  pauseStream,    // Pause stream
  resumeStream,   // Resume stream
  cancelStream,   // Cancel stream
  refreshStream,  // Refresh stream data
} = usePaymentStream(client, streamId);
```

### Components

#### `<PaymentButton />`

Pre-built payment button component.

```typescript
<PaymentButton
  client={client}
  endpoint="/api/endpoint"
  amount="1.00"
  onSuccess={(data) => {}}
  onError={(error) => {}}
  style={customStyle}
  disabled={false}
>
  Custom Button Text
</PaymentButton>
```

#### `<WalletButton />`

Wallet connection button.

```typescript
<WalletButton
  wallet={wallet}
  onConnect={() => {}}
  onDisconnect={() => {}}
  connectText="Connect"
  disconnectText="Disconnect"
  style={customStyle}
/>
```

### Wallet Adapters

#### Phantom Mobile

```typescript
import { createPhantomWallet } from '@payless/react-native';

const phantomWallet = createPhantomWallet('myapp'); // Your app's deep link scheme
await phantomWallet.connect();
```

**Note:** Requires deep link handling in your app. See [Phantom Deep Linking Guide](https://docs.phantom.app/integrating/deeplinks-ios-and-android).

#### WalletConnect

```typescript
import { createWalletConnectWallet } from '@payless/react-native';

const wcWallet = createWalletConnectWallet(
  {
    projectId: 'YOUR_PROJECT_ID',
    metadata: {
      name: 'My App',
      description: 'My App Description',
      url: 'https://myapp.com',
      icons: ['https://myapp.com/icon.png'],
    },
  },
  'solana' // or 'ethereum', 'bsc'
);
```

## Configuration

### Networks

| Network | Default RPC | Default Token |
|---------|-------------|---------------|
| Solana | `https://api.mainnet-beta.solana.com` | USDC |
| Ethereum | `https://eth.llamarpc.com` | USDC |
| BSC | `https://bsc-dataseed1.binance.org` | USDC |

### Environment Variables

Create a `.env` file:

```bash
PAYLESS_WALLET_ADDRESS=your_wallet_address
PAYLESS_NETWORK=solana
WALLETCONNECT_PROJECT_ID=your_project_id
```

## Examples

Check out the [examples](./examples) directory:

- **BasicUsage.tsx** - Simple payment integration
- **StreamingExample.tsx** - Payment streaming implementation

## Deep Linking Setup

### iOS (Info.plist)

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>myapp</string>
    </array>
  </dict>
</array>
```

### Android (AndroidManifest.xml)

```xml
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="myapp" />
</intent-filter>
```

## TypeScript Support

Fully typed with TypeScript. All types are exported:

```typescript
import type {
  PaylessConfig,
  PaymentProof,
  ApiResponse,
  WalletAdapter,
  PaymentStream,
  BlockchainNetwork,
} from '@payless/react-native';
```

## Testing

Mock payment mode (no wallet required):

```typescript
const { makeRequest } = usePayless({
  walletAddress: 'YOUR_ADDRESS',
});

// Without connected wallet, SDK uses mock payments for testing
const response = await makeRequest('/api/test', {
  paymentAmount: '1.00',
});
```

## Error Handling

```typescript
const { error, makeRequest } = usePayless(config);

// Hook-level error
useEffect(() => {
  if (error) {
    Alert.alert('Error', error);
  }
}, [error]);

// Request-level error
const response = await makeRequest('/api/endpoint');
if (!response.success) {
  console.error(response.error);
}
```

## Platform Support

- ✅ **iOS** 12.0+
- ✅ **Android** 5.0+ (API 21+)
- ✅ **React Native** 0.64+

## Troubleshooting

### Phantom wallet not opening

1. Ensure Phantom app is installed
2. Check deep link scheme matches in both app and Phantom config
3. Verify Info.plist / AndroidManifest.xml configuration

### TypeScript errors

```bash
npm install --save-dev @types/react @types/react-native
```

### Build errors

Make sure all peer dependencies are installed:

```bash
npm install react react-native @react-native-async-storage/async-storage
```

## Support

- 📚 [Documentation](https://github.com/Payless2025/PayLess/tree/master/docs)
- 🐛 [Issues](https://github.com/Payless2025/PayLess/issues)
- 💬 [Discussions](https://github.com/Payless2025/PayLess/discussions)

## License

MIT License - see [LICENSE](../../LICENSE) file for details.

## Contributing

Contributions are welcome! Please read our [contributing guidelines](../../CONTRIBUTING.md) first.

---

Made with ❤️ by Payless

