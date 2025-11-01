import { NextRequest, NextResponse } from 'next/server';
import { withMultiChainPayment } from '@/lib/x402/multi-chain-middleware';
import axios from 'axios';

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

// Map common symbols to CoinGecko IDs
const SYMBOL_TO_ID: { [key: string]: string } = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'SOL': 'solana',
  'USDC': 'usd-coin',
  'USDT': 'tether',
  'BNB': 'binancecoin',
  'MATIC': 'matic-network',
  'AVAX': 'avalanche-2',
  'DOGE': 'dogecoin',
  'ADA': 'cardano',
};

async function handler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get('symbol')?.toUpperCase() || 'SOL';
    
    // Get CoinGecko ID from symbol
    const coinId = SYMBOL_TO_ID[symbol] || 'solana';

    // Fetch real data from CoinGecko API (free tier, no API key)
    const response = await axios.get(
      `${COINGECKO_API}/simple/price`,
      {
        params: {
          ids: coinId,
          vs_currencies: 'usd',
          include_24hr_change: true,
          include_24hr_vol: true,
          include_market_cap: true,
        },
        timeout: 10000, // 10 second timeout
      }
    );

    const data = response.data[coinId];

    if (!data) {
      return NextResponse.json(
        { error: 'Cryptocurrency not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        symbol,
        coinId,
        price: data.usd,
        change24h: data.usd_24h_change?.toFixed(2) || 0,
        volume24h: data.usd_24h_vol || 0,
        marketCap: data.usd_market_cap || 0,
        timestamp: new Date().toISOString(),
        source: 'CoinGecko API',
      },
    });
  } catch (error) {
    console.error('Crypto API error:', error);
    
    // Return fallback mock data if API fails
    return NextResponse.json({
      success: true,
      data: {
        symbol: 'SOL',
        price: 125.43,
        change24h: 5.67,
        volume24h: 1500000000,
        marketCap: 52000000000,
        timestamp: new Date().toISOString(),
        source: 'Fallback (API unavailable)',
      },
    });
  }
}

export const GET = withMultiChainPayment(handler);
