import { NextRequest, NextResponse } from 'next/server';
import { withX402Payment } from '@/lib/x402/middleware';

async function handler(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get('city') || 'San Francisco';

  // Simulate weather data (in production, call real weather API)
  const weatherData = {
    city,
    temperature: Math.floor(Math.random() * 30) + 10,
    condition: ['Sunny', 'Cloudy', 'Rainy', 'Windy'][Math.floor(Math.random() * 4)],
    humidity: Math.floor(Math.random() * 100),
    windSpeed: Math.floor(Math.random() * 50),
    timestamp: new Date().toISOString(),
  };

  await new Promise(resolve => setTimeout(resolve, 500));

  return NextResponse.json({
    success: true,
    data: weatherData,
  });
}

export const GET = withX402Payment(handler);

