import { NextRequest, NextResponse } from 'next/server';
import { ENDPOINT_PRICING, PAYMENT_CONFIG } from '@/lib/x402/config';

export async function GET(req: NextRequest) {
  return NextResponse.json({
    name: 'Payless API',
    description: 'Serverless payment platform with x402 protocol integration',
    version: '1.0.0',
    payment: {
      protocol: 'x402',
      wallet: PAYMENT_CONFIG.walletAddress,
      network: PAYMENT_CONFIG.network,
      currency: PAYMENT_CONFIG.currency,
      facilitator: PAYMENT_CONFIG.facilitatorUrl,
    },
    endpoints: Object.entries(ENDPOINT_PRICING).map(([path, price]) => ({
      path,
      price: `$${price} ${PAYMENT_CONFIG.currency}`,
      method: 'GET/POST',
    })),
    documentation: 'https://github.com/yourusername/payless',
  });
}

