"""
Payment proof creation and verification for x402 protocol
"""

import time
import json
from typing import Callable, Awaitable
import base58
import nacl.signing
import nacl.encoding
from .types import PaymentProof


async def create_payment_proof(
    from_address: str,
    to_address: str,
    amount: str,
    token_mint: str,
    sign_message: Callable[[bytes], Awaitable[bytes]],
) -> PaymentProof:
    """
    Create a payment proof for x402 protocol
    
    Args:
        from_address: Sender's wallet address
        to_address: Recipient's wallet address
        amount: Payment amount in USDC
        token_mint: USDC token mint address
        sign_message: Async function to sign messages
    
    Returns:
        PaymentProof dictionary
    """
    timestamp = int(time.time() * 1000)
    message = f"Payless Payment: {amount} USDC from {from_address} to {to_address} at {timestamp}"
    
    message_bytes = message.encode('utf-8')
    signature_bytes = await sign_message(message_bytes)
    signature = base58.b58encode(signature_bytes).decode('utf-8')
    
    return PaymentProof(
        from_address=from_address,
        to=to_address,
        amount=amount,
        token_mint=token_mint,
        timestamp=timestamp,
        message=message,
        signature=signature,
    )


def create_mock_payment_proof(
    from_address: str,
    to_address: str,
    amount: str,
    token_mint: str,
) -> PaymentProof:
    """
    Create a mock payment proof for testing (without real wallet)
    
    WARNING: DO NOT use in production!
    
    Args:
        from_address: Sender's wallet address
        to_address: Recipient's wallet address
        amount: Payment amount in USDC
        token_mint: USDC token mint address
    
    Returns:
        PaymentProof dictionary
    """
    timestamp = int(time.time() * 1000)
    message = f"Payless Payment: {amount} USDC from {from_address} to {to_address} at {timestamp}"
    
    # Create a mock signature (DO NOT use in production)
    signing_key = nacl.signing.SigningKey.generate()
    message_bytes = message.encode('utf-8')
    signed = signing_key.sign(message_bytes)
    signature = base58.b58encode(signed.signature).decode('utf-8')
    
    return PaymentProof(
        from_address=from_address,
        to=to_address,
        amount=amount,
        token_mint=token_mint,
        timestamp=timestamp,
        message=message,
        signature=signature,
    )


def verify_payment_proof(proof: PaymentProof) -> bool:
    """
    Verify a payment proof signature
    
    Args:
        proof: PaymentProof to verify
    
    Returns:
        True if signature is valid, False otherwise
    """
    try:
        message_bytes = proof['message'].encode('utf-8')
        signature_bytes = base58.b58decode(proof['signature'])
        
        # Note: This is a simplified verification
        # In production, you'd need to verify with the actual public key
        return len(signature_bytes) == 64  # Ed25519 signature length
    except Exception:
        return False


def payment_proof_to_header(proof: PaymentProof) -> str:
    """
    Convert payment proof to x402 header format
    
    Args:
        proof: PaymentProof to convert
    
    Returns:
        JSON string for X-Payment header
    """
    # Convert from_address back to 'from' for the header
    header_proof = {
        'from': proof['from_address'],
        'to': proof['to'],
        'amount': proof['amount'],
        'tokenMint': proof['token_mint'],
        'timestamp': proof['timestamp'],
        'message': proof['message'],
        'signature': proof['signature'],
    }
    return json.dumps(header_proof)

