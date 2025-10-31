import { NextRequest, NextResponse } from 'next/server';
import { withX402Payment } from '@/lib/x402/middleware';

async function handler(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol')?.toUpperCase() || 'BTC';

  // Simulate crypto price data (in production, call CoinGecko/Binance/etc)
  const cryptoPrices: Record<string, any> = {
    BTC: { name: 'Bitcoin', basePrice: 45000 },
    ETH: { name: 'Ethereum', basePrice: 2500 },
    SOL: { name: 'Solana', basePrice: 100 },
    USDC: { name: 'USD Coin', basePrice: 1 },
    BNB: { name: 'Binance Coin', basePrice: 350 },
  };

  const crypto = cryptoPrices[symbol] || cryptoPrices['BTC'];
  const price = crypto.basePrice + (Math.random() * crypto.basePrice * 0.05 - crypto.basePrice * 0.025);
  const change24h = (Math.random() * 10 - 5).toFixed(2);

  const cryptoData = {
    symbol,
    name: crypto.name,
    price: price.toFixed(2),
    change24h: parseFloat(change24h),
    changePercent24h: ((parseFloat(change24h) / price) * 100).toFixed(2),
    marketCap: `${(price * Math.random() * 1000000).toFixed(0)}M`,
    volume24h: `${(Math.random() * 10000).toFixed(0)}M`,
    high24h: (price * 1.05).toFixed(2),
    low24h: (price * 0.95).toFixed(2),
    timestamp: new Date().toISOString(),
  };

  await new Promise(resolve => setTimeout(resolve, 600));

  return NextResponse.json({
    success: true,
    data: cryptoData,
  });
}

export const GET = withX402Payment(handler);

