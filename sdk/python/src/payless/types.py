"""
Type definitions for Payless SDK
"""

from typing import TypedDict, Optional, Any, Callable, Awaitable, Dict
from typing_extensions import NotRequired


class PaylessConfig(TypedDict):
    """Configuration for Payless client"""
    wallet_address: str  # Your wallet address to receive payments
    network: NotRequired[str]  # Solana network (mainnet-beta, devnet, testnet)
    rpc_url: NotRequired[str]  # Custom RPC URL
    usdc_mint: NotRequired[str]  # USDC token mint address
    facilitator_url: NotRequired[str]  # x402 facilitator URL


class PaymentProof(TypedDict):
    """Payment proof for x402 protocol"""
    from_address: str  # Sender's wallet address (renamed from 'from' to avoid Python keyword)
    to: str  # Recipient's wallet address
    amount: str  # Payment amount in USDC
    token_mint: str  # Token mint address (USDC)
    timestamp: int  # Timestamp of payment creation
    message: str  # Payment message
    signature: str  # Cryptographic signature


class ApiResponse(TypedDict):
    """API response structure"""
    success: bool
    data: NotRequired[Any]
    error: NotRequired[str]
    status: int


class WalletAdapter(TypedDict):
    """Wallet adapter interface"""
    public_key: str
    sign_message: Callable[[bytes], Awaitable[bytes]]

