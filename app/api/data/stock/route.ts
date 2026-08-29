import { NextRequest, NextResponse } from 'next/server';
import { withX402Payment } from '@/lib/x402/middleware';

async function handler(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol') || 'AAPL';

  // Simulate stock data (in production, call real stock API)
  const basePrice = 150;
  const stockData = {
    symbol: symbol.toUpperCase(),
    price: basePrice + (Math.random() * 20 - 10),
    change: (Math.random() * 10 - 5).toFixed(2),
    changePercent: (Math.random() * 5 - 2.5).toFixed(2),
    volume: Math.floor(Math.random() * 100000000),
    marketCap: `${(Math.random() * 1000 + 500).toFixed(2)}B`,
    timestamp: new Date().toISOString(),
  };

  await new Promise(resolve => setTimeout(resolve, 500));

  return NextResponse.json({
    success: true,
    data: stockData,
  });
}

export const GET = withX402Payment(handler);

