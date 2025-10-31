# Payless SDK for Python

Official Python SDK for integrating Payless x402 payments into your applications.

## Installation

```bash
pip install payless-sdk
```

## Quick Start

```python
import asyncio
from payless import create_client

# Initialize client
client = create_client({
    'wallet_address': 'YOUR_WALLET_ADDRESS',  # Your Solana wallet to receive payments
})

# Make a paid API request
async def main():
    response = await client.post('/api/ai/chat', {
        'message': 'Hello, world!',
    })
    print(response['data'])

asyncio.run(main())
```

## Features

- ✅ Automatic payment handling with x402 protocol
- ✅ Type hints with full typing support
- ✅ Solana wallet integration
- ✅ Mock payments for testing
- ✅ Easy-to-use async API client
- ✅ Built-in retry logic for 402 responses

## Usage

### Basic Usage

```python
import asyncio
from payless import create_client

client = create_client({
    'wallet_address': '8ahe4N7mFaLyQ7powRGWxZ3cnqbteF3yAeioMpM4ocMX',
    'network': 'mainnet-beta',  # or 'devnet', 'testnet'
})

async def main():
    # GET request
    weather = await client.get('/api/data/weather?city=London')
    
    # POST request
    translation = await client.post('/api/ai/translate', {
        'text': 'Hello, world!',
        'targetLanguage': 'es',
    })
    
    print(translation['data'])

asyncio.run(main())
```

### With Wallet Integration

```python
import asyncio
from payless import create_client

client = create_client({
    'wallet_address': 'YOUR_WALLET_ADDRESS',
})

# Connect your Solana wallet
async def sign_message(message: bytes) -> bytes:
    # Your wallet signing logic here
    # This should sign the message with your private key
    pass

wallet = {
    'public_key': 'YOUR_PUBLIC_KEY',
    'sign_message': sign_message,
}

client.connect_wallet(wallet)

async def main():
    # Now all payments will be signed with your real wallet
    response = await client.post('/api/ai/chat', {
        'message': 'Tell me about Solana',
    })
    print(response['data'])

asyncio.run(main())
```

### Error Handling

```python
async def main():
    response = await client.get('/api/data/stock?symbol=AAPL')
    
    if not response['success']:
        print(f"Error: {response.get('error')}")
        print(f"Status: {response['status']}")
    else:
        print(f"Data: {response['data']}")

asyncio.run(main())
```

### Manual Payment Creation

```python
from payless import create_payment_proof, payment_proof_to_header
import requests

async def main():
    # With real wallet
    proof = await create_payment_proof(
        'SENDER_ADDRESS',
        'RECIPIENT_ADDRESS',
        '0.05',  # amount in USDC
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',  # USDC mint
        sign_message_function
    )
    
    # Use in custom HTTP request
    response = requests.post(
        '/api/endpoint',
        headers={
            'Content-Type': 'application/json',
            'X-Payment': payment_proof_to_header(proof),
        },
        json={'data': '...'}
    )
```

### Testing with Mock Payments

```python
from payless import create_mock_payment_proof

# Create mock payment for testing (no real wallet needed)
mock_proof = create_mock_payment_proof(
    'SENDER_ADDRESS',
    'RECIPIENT_ADDRESS',
    '0.05',
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
)

print(mock_proof)
```

## API Reference

### `create_client(config)`

Creates a new Payless client instance.

**Parameters:**
- `config['wallet_address']` (str, required): Your Solana wallet address to receive payments
- `config['network']` (str, optional): Solana network ('mainnet-beta', 'devnet', 'testnet')
- `config['rpc_url']` (str, optional): Custom RPC URL
- `config['usdc_mint']` (str, optional): USDC token mint address
- `config['facilitator_url']` (str, optional): x402 facilitator URL

**Returns:** `PaylessClient`

### `await client.request(endpoint, method, headers, body, payment_amount)`

Make a request to a Payless-protected API endpoint.

**Parameters:**
- `endpoint` (str): API endpoint path
- `method` (str, optional): HTTP method (GET, POST, PUT, DELETE)
- `headers` (dict, optional): Additional headers
- `body` (any, optional): Request body
- `payment_amount` (str, optional): Override payment amount

**Returns:** `ApiResponse` dict

### `await client.get(endpoint, headers, payment_amount)`

Shorthand for GET requests.

### `await client.post(endpoint, body, headers, payment_amount)`

Shorthand for POST requests.

### `client.connect_wallet(wallet)`

Connect a Solana wallet for signing payments.

**Parameters:**
- `wallet['public_key']` (str): Wallet public key
- `wallet['sign_message']` (callable): Async message signing function

## Examples

### AI Chat

```python
async def main():
    response = await client.post('/api/ai/chat', {
        'message': 'Explain the x402 protocol',
        'model': 'gpt-4',
    })
    print(response['data'])
```

### Image Generation

```python
async def main():
    response = await client.post('/api/ai/image', {
        'prompt': 'A futuristic cityscape',
        'size': '1024x1024',
    })
    print(response['data'])
```

### Cryptocurrency Prices

```python
async def main():
    response = await client.get('/api/data/crypto?symbol=SOL')
    print(f"SOL Price: ${response['data']['price']}")
```

### QR Code Generation

```python
async def main():
    response = await client.post('/api/tools/qrcode', {
        'data': 'https://payless.com',
        'size': '256',
    })
    print(response['data'])
```

## Type Hints

The SDK includes type hints for better IDE support:

```python
from payless import PaylessClient, ApiResponse, PaymentProof
from typing import Dict, Any

client: PaylessClient = create_client({'wallet_address': '...'})

response: ApiResponse = await client.post('/api/ai/chat', {
    'message': 'Hello',
})
```

## License

MIT

## Links

- [Documentation](https://payless.gitbook.io/payless-documentation)
- [GitHub](https://github.com/Payless2025/PayLess)
- [Website](https://payless.com)

## Support

For issues and questions, please visit our [GitHub Issues](https://github.com/Payless2025/PayLess/issues).

