# Payless React Native SDK - Examples

This directory contains example implementations of the Payless React Native SDK.

## Examples

### 1. BasicUsage.tsx

A complete example showing:
- Wallet connection with Phantom
- Payment button usage
- Multiple payment scenarios
- Error handling
- UI implementation

**Run this example:**
```typescript
import BasicUsageExample from '@payless/react-native/examples/BasicUsage';

export default function App() {
  return <BasicUsageExample />;
}
```

### 2. StreamingExample.tsx

Payment streaming implementation showing:
- Creating payment streams
- Stream management (pause, resume, cancel)
- Real-time stream status
- Stream monitoring
- Beautiful UI

**Run this example:**
```typescript
import StreamingExample from '@payless/react-native/examples/StreamingExample';

export default function App() {
  return <StreamingExample />;
}
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install @payless/react-native react react-native
```

### 2. Configure Deep Links

#### iOS (Info.plist)
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

#### Android (AndroidManifest.xml)
```xml
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="myapp" />
</intent-filter>
```

### 3. Update Configuration

Replace placeholders in examples:
- `YOUR_WALLET_ADDRESS` - Your Solana wallet address
- `myapp` - Your app's deep link scheme

### 4. Install Phantom Wallet

Download Phantom Mobile:
- [iOS App Store](https://apps.apple.com/app/phantom-solana-wallet/id1598432977)
- [Google Play Store](https://play.google.com/store/apps/details?id=app.phantom)

## Testing

### Mock Mode (No Wallet)

Both examples work without a wallet connection for testing:

```typescript
// Wallet not connected = mock payments
const response = await makeRequest('/api/test', {
  paymentAmount: '1.00',
});
// Returns mock payment proof
```

### With Real Wallet

1. Connect Phantom wallet
2. Approve transaction in Phantom app
3. Real payment proof generated and sent

## Features Demonstrated

### BasicUsage.tsx
- ✅ Wallet connection status
- ✅ Connect/disconnect wallet
- ✅ Make paid API requests
- ✅ Custom payment amounts
- ✅ Error handling
- ✅ Loading states

### StreamingExample.tsx
- ✅ Create payment streams
- ✅ Monitor stream status
- ✅ Pause/resume streams
- ✅ Cancel streams
- ✅ Real-time updates
- ✅ Stream information display

## Customization

### Styling

All components accept custom styles:

```typescript
<PaymentButton
  style={{ backgroundColor: '#FF0000' }}
  textStyle={{ fontSize: 18 }}
/>

<WalletButton
  connectedStyle={{ backgroundColor: '#00FF00' }}
  disconnectedStyle={{ backgroundColor: '#0000FF' }}
/>
```

### Branding

Customize button text:

```typescript
<WalletButton
  connectText="Connect Your Wallet"
  disconnectText="Sign Out"
/>

<PaymentButton>
  <Text>🚀 Pay Now</Text>
</PaymentButton>
```

## API Endpoints

Examples use these endpoints:

| Endpoint | Price | Description |
|----------|-------|-------------|
| `/api/premium/content` | 1.00 USDC | Premium content access |
| `/api/data/crypto` | 0.10 USDC | Crypto market data |
| `/api/ai/chat` | 0.05 USDC | AI chat completion |
| `/api/streams` | Variable | Payment streaming |

## Troubleshooting

### Deep Link Not Working

1. Verify scheme matches in both your app and examples
2. Rebuild native apps after changing manifest files
3. Test deep link: `npx uri-scheme open myapp:// --ios`

### Wallet Connection Fails

1. Ensure Phantom app is installed
2. Check app is in foreground when connecting
3. Verify deep link configuration

### TypeScript Errors

```bash
npm install --save-dev @types/react @types/react-native
```

## Next Steps

- Implement your own UI
- Add custom payment flows
- Integrate with your backend
- Deploy to App Store / Play Store

## Support

Need help? Check out:
- [Main SDK Documentation](../README.md)
- [API Documentation](../../../docs/API_ENDPOINTS.md)
- [GitHub Issues](https://github.com/Payless2025/PayLess/issues)

---

Happy coding! 🚀

