# Payless SDKs

Official SDKs for integrating Payless x402 payments into your applications.

## Available SDKs

### Node.js / TypeScript
```bash
npm install @payless/sdk
```
[Documentation](./nodejs/README.md)

### React Native (Mobile)
```bash
npm install @payless/react-native
```
[Documentation](./react-native/README.md)

### Python
```bash
pip install payless-sdk
```
[Documentation](./python/README.md)

## Quick Examples

### Node.js

```typescript
import { createClient } from '@payless/sdk';

const client = createClient({
  walletAddress: 'YOUR_WALLET_ADDRESS',
});

const response = await client.post('/api/ai/chat', {
  message: 'Hello, world!',
});

console.log(response.data);
```

### Python

```python
from payless import create_client
import asyncio

client = create_client({
    'wallet_address': 'YOUR_WALLET_ADDRESS',
})

async def main():
    response = await client.post('/api/ai/chat', {
        'message': 'Hello, world!',
    })
    print(response['data'])

asyncio.run(main())
```

### React Native

```typescript
import { usePayless, PaymentButton } from '@payless/react-native';

function App() {
  const { client } = usePayless({
    walletAddress: 'YOUR_WALLET_ADDRESS',
  });

  return (
    <PaymentButton
      client={client}
      endpoint="/api/ai/chat"
      amount="0.05"
      onSuccess={(data) => console.log(data)}
    />
  );
}
```

## Features

All SDKs provide:

- ✅ Automatic x402 payment handling
- ✅ Payment proof creation and verification
- ✅ Wallet integration support
- ✅ Mock payments for testing
- ✅ Full type safety
- ✅ Comprehensive error handling
- ✅ Easy-to-use API

## Installation

Choose your preferred platform and follow the installation guide in the respective SDK folder:

- [Node.js/TypeScript SDK](./nodejs/) - Backend & Node.js apps
- [React Native SDK](./react-native/) - iOS & Android mobile apps
- [Python SDK](./python/) - Python applications

## Publishing

### Node.js SDK (npm)

```bash
cd sdk/nodejs
npm install
npm run build
npm publish
```

### React Native SDK (npm)

```bash
cd sdk/react-native
npm install
npm run build
npm publish
```

### Python SDK (PyPI)

```bash
cd sdk/python
pip install build twine
python -m build
python -m twine upload dist/*
```

## Documentation

- [API Endpoints Documentation](../docs/API_ENDPOINTS.md)
- [x402 Protocol](https://x402.org)
- [Full Documentation](https://payless.gitbook.io/payless-documentation)

## License

MIT

## Support

- GitHub Issues: https://github.com/Payless2025/PayLess/issues
- Documentation: https://payless.gitbook.io/payless-documentation
- Website: https://payless.com

