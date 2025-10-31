"""
Payless API Client
"""

import requests
from typing import Optional, Dict, Any
from .types import PaylessConfig, ApiResponse, WalletAdapter, PaymentProof
from .payment import create_payment_proof, create_mock_payment_proof, payment_proof_to_header


DEFAULT_CONFIG = {
    'network': 'mainnet-beta',
    'usdc_mint': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',  # Solana USDC
    'facilitator_url': 'https://facilitator.x402.org',
}


class PaylessClient:
    """
    Payless API Client for making paid requests to x402-protected endpoints
    """
    
    def __init__(self, config: PaylessConfig):
        """
        Initialize Payless client
        
        Args:
            config: PaylessConfig dictionary with wallet_address (required) and optional settings
        """
        self.config = {**DEFAULT_CONFIG, **config}
        
        if 'rpc_url' not in self.config:
            network = self.config['network']
            self.config['rpc_url'] = f"https://api.{network}.solana.com"
        
        self.wallet: Optional[WalletAdapter] = None
        self.session = requests.Session()
    
    def connect_wallet(self, wallet: WalletAdapter) -> None:
        """
        Connect a wallet for signing payments
        
        Args:
            wallet: WalletAdapter with public_key and sign_message function
        """
        self.wallet = wallet
    
    async def request(
        self,
        endpoint: str,
        method: str = 'GET',
        headers: Optional[Dict[str, str]] = None,
        body: Optional[Any] = None,
        payment_amount: Optional[str] = None,
    ) -> ApiResponse:
        """
        Make a request to a Payless-protected API endpoint
        
        Args:
            endpoint: API endpoint path
            method: HTTP method (GET, POST, PUT, DELETE)
            headers: Additional headers
            body: Request body (will be JSON-encoded)
            payment_amount: Override payment amount
        
        Returns:
            ApiResponse dictionary
        """
        request_headers = {'Content-Type': 'application/json', **(headers or {})}
        
        # First, try without payment to see if it's required
        response = self._make_http_request(
            endpoint,
            method=method,
            headers=request_headers,
            json=body,
        )
        
        # If payment is required (402 status), create payment and retry
        if response.status_code == 402:
            payment_info = response.json()
            amount = payment_amount or payment_info.get('payment', {}).get('amount')
            
            if not amount:
                return ApiResponse(
                    success=False,
                    error='Payment amount not specified',
                    status=402,
                )
            
            # Create payment proof
            payment_proof = await self._create_payment(amount)
            payment_header = payment_proof_to_header(payment_proof)
            
            # Retry with payment
            request_headers['X-Payment'] = payment_header
            response = self._make_http_request(
                endpoint,
                method=method,
                headers=request_headers,
                json=body,
            )
        
        try:
            data = response.json()
        except Exception:
            data = None
        
        return ApiResponse(
            success=response.ok,
            data=data if response.ok else None,
            error=data.get('error', 'Request failed') if not response.ok and data else None,
            status=response.status_code,
        )
    
    async def get(
        self,
        endpoint: str,
        headers: Optional[Dict[str, str]] = None,
        payment_amount: Optional[str] = None,
    ) -> ApiResponse:
        """Make a GET request"""
        return await self.request(endpoint, method='GET', headers=headers, payment_amount=payment_amount)
    
    async def post(
        self,
        endpoint: str,
        body: Optional[Any] = None,
        headers: Optional[Dict[str, str]] = None,
        payment_amount: Optional[str] = None,
    ) -> ApiResponse:
        """Make a POST request"""
        return await self.request(endpoint, method='POST', headers=headers, body=body, payment_amount=payment_amount)
    
    async def _create_payment(self, amount: str) -> PaymentProof:
        """Create a payment proof"""
        if not self.wallet:
            # If no wallet connected, create mock payment for testing
            return create_mock_payment_proof(
                '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',  # Demo address
                self.config['wallet_address'],
                amount,
                self.config['usdc_mint'],
            )
        
        return await create_payment_proof(
            self.wallet['public_key'],
            self.config['wallet_address'],
            amount,
            self.config['usdc_mint'],
            self.wallet['sign_message'],
        )
    
    def _make_http_request(
        self,
        endpoint: str,
        method: str = 'GET',
        **kwargs
    ) -> requests.Response:
        """Make HTTP request"""
        url = endpoint if endpoint.startswith('http') else endpoint
        return self.session.request(method, url, **kwargs)
    
    async def get_api_info(self) -> ApiResponse:
        """Get API information"""
        return await self.get('/api/info')
    
    async def get_health(self) -> ApiResponse:
        """Get API health status"""
        return await self.get('/api/health')


def create_client(config: PaylessConfig) -> PaylessClient:
    """
    Create a Payless client instance
    
    Args:
        config: PaylessConfig dictionary
    
    Returns:
        PaylessClient instance
    """
    return PaylessClient(config)

