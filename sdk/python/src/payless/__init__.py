"""
Payless SDK for Python
Official SDK for integrating Payless x402 payments
"""

from .client import PaylessClient, create_client
from .payment import (
    create_payment_proof,
    create_mock_payment_proof,
    verify_payment_proof,
    payment_proof_to_header,
)
from .types import PaylessConfig, PaymentProof, ApiResponse

__version__ = "1.0.0"
__all__ = [
    "PaylessClient",
    "create_client",
    "create_payment_proof",
    "create_mock_payment_proof",
    "verify_payment_proof",
    "payment_proof_to_header",
    "PaylessConfig",
    "PaymentProof",
    "ApiResponse",
]

