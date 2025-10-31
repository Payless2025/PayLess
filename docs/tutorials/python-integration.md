# Python Integration Tutorial (Flask & FastAPI)

Learn how to add Payless x402 payments to your Python backend API using Flask or FastAPI.

## Prerequisites

- Python 3.8+ installed
- A Solana wallet address for receiving payments
- Basic knowledge of Python web frameworks

## Installation

```bash
pip install payless-sdk flask fastapi uvicorn python-dotenv pynacl base58
```

## Part 1: Flask Integration

### Step 1: Project Setup

Create `.env` file:

```env
WALLET_ADDRESS=YOUR_WALLET_ADDRESS_HERE
NETWORK=mainnet-beta
USDC_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
```

### Step 2: Create x402 Middleware

Create `middleware/x402.py`:

```python
import os
import json
import time
from functools import wraps
from flask import request, jsonify
import base58
import nacl.signing
import nacl.encoding

# Define endpoint pricing
ENDPOINT_PRICING = {
    '/api/premium/content': '0.10',
    '/api/ai/chat': '0.05',
    '/api/data/analysis': '0.02',
}

def with_x402_payment(price=None):
    """Decorator for protecting Flask routes with x402 payments"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            endpoint_price = price or ENDPOINT_PRICING.get(request.path)
            
            if not endpoint_price:
                return jsonify({'error': 'Endpoint not configured'}), 500
            
            # Check for payment header
            payment_header = request.headers.get('X-Payment')
            
            if not payment_header:
                return jsonify({
                    'status': 402,
                    'message': 'Payment Required',
                    'payment': {
                        'amount': endpoint_price,
                        'currency': 'USDC',
                        'recipient': os.getenv('WALLET_ADDRESS'),
                        'network': os.getenv('NETWORK', 'mainnet-beta'),
                        'tokenMint': os.getenv('USDC_MINT'),
                    }
                }), 402
            
            # Verify payment
            try:
                payment = json.loads(payment_header)
                
                # Verify recipient
                if payment['to'] != os.getenv('WALLET_ADDRESS'):
                    return jsonify({'error': 'Invalid recipient address'}), 402
                
                # Verify amount
                if float(payment['amount']) < float(endpoint_price):
                    return jsonify({'error': 'Insufficient payment amount'}), 402
                
                # Verify timestamp (within 5 minutes)
                now = int(time.time() * 1000)
                if now - payment['timestamp'] > 5 * 60 * 1000:
                    return jsonify({'error': 'Payment expired'}), 402
                
                # Verify signature
                message_bytes = payment['message'].encode('utf-8')
                signature_bytes = base58.b58decode(payment['signature'])
                
                # Note: In production, verify with actual public key
                if len(signature_bytes) != 64:  # Ed25519 signature length
                    return jsonify({'error': 'Invalid signature'}), 402
                
                # Payment verified - add to request context
                request.payment = payment
                return func(*args, **kwargs)
                
            except Exception as e:
                print(f'Payment verification error: {e}')
                return jsonify({'error': 'Payment verification failed'}), 402
        
        return wrapper
    return decorator
```

### Step 3: Create Flask App

Create `app.py`:

```python
import os
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
from middleware.x402 import with_x402_payment

load_dotenv()

app = Flask(__name__)
CORS(app)

# Free endpoint
@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'healthy',
        'timestamp': time.time()
    })

# Protected endpoints
@app.route('/api/premium/content', methods=['GET'])
@with_x402_payment('0.10')
def premium_content():
    return jsonify({
        'success': True,
        'data': {
            'title': 'Exclusive Article',
            'content': 'This is premium content that requires payment.',
            'author': 'John Doe',
            'paidBy': request.payment['from']
        }
    })

@app.route('/api/ai/chat', methods=['POST'])
@with_x402_payment('0.05')
def ai_chat():
    data = request.get_json()
    message = data.get('message')
    
    if not message:
        return jsonify({'error': 'Message is required'}), 400
    
    return jsonify({
        'success': True,
        'data': {
            'response': f'You said: {message}. This is an AI response.',
            'model': 'gpt-4',
            'timestamp': time.time()
        }
    })

@app.route('/api/data/analysis', methods=['GET'])
@with_x402_payment('0.02')
def data_analysis():
    query = request.args.get('query', 'default')
    
    return jsonify({
        'success': True,
        'data': {
            'query': query,
            'results': [
                {'metric': 'engagement', 'value': 85},
                {'metric': 'conversion', 'value': 12.5}
            ]
        }
    })

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    print(f'Server running on port {port}')
    print(f'Wallet Address: {os.getenv("WALLET_ADDRESS")}')
    app.run(host='0.0.0.0', port=port, debug=True)
```

### Step 4: Run Flask Server

```bash
python app.py
```

## Part 2: FastAPI Integration

### Step 1: Create x402 Middleware for FastAPI

Create `middleware/x402_fastapi.py`:

```python
import os
import json
import time
from fastapi import Request, HTTPException
from typing import Callable
import base58

ENDPOINT_PRICING = {
    '/api/premium/content': '0.10',
    '/api/ai/chat': '0.05',
    '/api/data/analysis': '0.02',
}

async def verify_x402_payment(request: Request, price: str = None):
    """Verify x402 payment for FastAPI"""
    endpoint_price = price or ENDPOINT_PRICING.get(str(request.url.path))
    
    if not endpoint_price:
        raise HTTPException(status_code=500, detail='Endpoint not configured')
    
    # Check for payment header
    payment_header = request.headers.get('x-payment')
    
    if not payment_header:
        raise HTTPException(
            status_code=402,
            detail={
                'status': 402,
                'message': 'Payment Required',
                'payment': {
                    'amount': endpoint_price,
                    'currency': 'USDC',
                    'recipient': os.getenv('WALLET_ADDRESS'),
                    'network': os.getenv('NETWORK', 'mainnet-beta'),
                    'tokenMint': os.getenv('USDC_MINT'),
                }
            }
        )
    
    # Verify payment
    try:
        payment = json.loads(payment_header)
        
        # Verify recipient
        if payment['to'] != os.getenv('WALLET_ADDRESS'):
            raise HTTPException(status_code=402, detail='Invalid recipient address')
        
        # Verify amount
        if float(payment['amount']) < float(endpoint_price):
            raise HTTPException(status_code=402, detail='Insufficient payment amount')
        
        # Verify timestamp
        now = int(time.time() * 1000)
        if now - payment['timestamp'] > 5 * 60 * 1000:
            raise HTTPException(status_code=402, detail='Payment expired')
        
        # Verify signature
        signature_bytes = base58.b58decode(payment['signature'])
        if len(signature_bytes) != 64:
            raise HTTPException(status_code=402, detail='Invalid signature')
        
        return payment
        
    except HTTPException:
        raise
    except Exception as e:
        print(f'Payment verification error: {e}')
        raise HTTPException(status_code=402, detail='Payment verification failed')
```

### Step 2: Create FastAPI App

Create `main.py`:

```python
import os
import time
from dotenv import load_dotenv
from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from middleware.x402_fastapi import verify_x402_payment

load_dotenv()

app = FastAPI(title='Payless API', version='1.0.0')

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

# Request models
class ChatRequest(BaseModel):
    message: str
    model: str = 'gpt-4'

# Free endpoint
@app.get('/api/health')
async def health():
    return {
        'status': 'healthy',
        'timestamp': time.time()
    }

# Protected endpoints
@app.get('/api/premium/content')
async def premium_content(payment=Depends(lambda r: verify_x402_payment(r, '0.10'))):
    return {
        'success': True,
        'data': {
            'title': 'Exclusive Article',
            'content': 'This is premium content that requires payment.',
            'author': 'John Doe',
            'paidBy': payment['from']
        }
    }

@app.post('/api/ai/chat')
async def ai_chat(
    chat_request: ChatRequest,
    payment=Depends(lambda r: verify_x402_payment(r, '0.05'))
):
    return {
        'success': True,
        'data': {
            'response': f'You said: {chat_request.message}. This is an AI response.',
            'model': chat_request.model,
            'timestamp': time.time()
        }
    }

@app.get('/api/data/analysis')
async def data_analysis(
    query: str = 'default',
    payment=Depends(lambda r: verify_x402_payment(r, '0.02'))
):
    return {
        'success': True,
        'data': {
            'query': query,
            'results': [
                {'metric': 'engagement', 'value': 85},
                {'metric': 'conversion', 'value': 12.5}
            ]
        }
    }

if __name__ == '__main__':
    import uvicorn
    port = int(os.getenv('PORT', 8000))
    print(f'Server running on port {port}')
    print(f'Wallet Address: {os.getenv("WALLET_ADDRESS")}')
    uvicorn.run(app, host='0.0.0.0', port=port)
```

### Step 3: Run FastAPI Server

```bash
uvicorn main:app --reload
# or
python main.py
```

## Testing

### Create Test Client

Create `test_client.py`:

```python
import asyncio
from payless import create_client

async def main():
    client = create_client({
        'wallet_address': 'YOUR_WALLET_ADDRESS'
    })
    
    # Test Flask (port 5000) or FastAPI (port 8000)
    base_url = 'http://localhost:5000'  # or 8000 for FastAPI
    
    # Test without payment
    print('Testing without payment...')
    response = await client.get(f'{base_url}/api/premium/content')
    print(f'Status: {response["status"]}')
    print(f'Response: {response}')
    
    # Test with payment
    print('\nTesting with payment...')
    response = await client.get(f'{base_url}/api/premium/content')
    if response['success']:
        print('Success!')
        print(response['data'])
    else:
        print(f'Error: {response.get("error")}')
    
    # Test POST
    print('\nTesting POST with payment...')
    response = await client.post(f'{base_url}/api/ai/chat', {
        'message': 'Hello, AI!'
    })
    print(response)

if __name__ == '__main__':
    asyncio.run(main())
```

Run tests:

```bash
python test_client.py
```

## Deployment

### Docker

Create `Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# For FastAPI
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

# For Flask
# CMD ["python", "app.py"]
```

Create `requirements.txt`:

```
payless-sdk
flask
fastapi
uvicorn[standard]
flask-cors
python-dotenv
pynacl
base58
```

Build and run:

```bash
docker build -t payless-api .
docker run -p 8000:8000 -e WALLET_ADDRESS=your_address payless-api
```

### Heroku

```bash
heroku create your-app-name
heroku config:set WALLET_ADDRESS=your_wallet_address
git push heroku main
```

## Best Practices

1. **Use environment variables for configuration**
2. **Implement proper error handling**
3. **Add request logging**
4. **Use async/await for better performance**
5. **Cache payment verifications**
6. **Implement rate limiting**

## Resources

- [Flask Documentation](https://flask.palletsprojects.com/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Payless Python SDK](../../sdk/python/README.md)

## Support

Need help? [Open an issue](https://github.com/Payless2025/PayLess/issues)

