import { NextRequest, NextResponse } from 'next/server';
import { withMultiChainPayment } from '@/lib/x402/multi-chain-middleware';
import axios from 'axios';

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const OPENWEATHER_API = 'https://api.openweathermap.org/data/2.5';

async function handler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const city = searchParams.get('city') || 'San Francisco';

    // If no API key, return mock data
    if (!OPENWEATHER_API_KEY) {
      console.warn('OpenWeatherMap API key not set, using mock data');
      return NextResponse.json({
        success: true,
        data: {
          city,
          temperature: 72,
          condition: 'Partly Cloudy',
          humidity: 65,
          windSpeed: 10,
          timestamp: new Date().toISOString(),
          source: 'Mock Data (Set OPENWEATHER_API_KEY for real data)',
        },
      });
    }

    // Fetch real weather data from OpenWeatherMap
    const response = await axios.get(`${OPENWEATHER_API}/weather`, {
      params: {
        q: city,
        appid: OPENWEATHER_API_KEY,
        units: 'metric',
      },
      timeout: 10000,
    });

    const data = response.data;

    return NextResponse.json({
      success: true,
      data: {
        city: data.name,
        country: data.sys.country,
        temperature: Math.round((data.main.temp * 9/5) + 32), // Convert to Fahrenheit
        temperatureC: Math.round(data.main.temp),
        condition: data.weather[0].main,
        description: data.weather[0].description,
        humidity: data.main.humidity,
        windSpeed: Math.round(data.wind.speed * 2.237), // Convert m/s to mph
        icon: `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`,
        timestamp: new Date().toISOString(),
        source: 'OpenWeatherMap API',
      },
    });
  } catch (error) {
    console.error('Weather API error:', error);
    
    // Return fallback data
    return NextResponse.json({
      success: true,
      data: {
        city: 'San Francisco',
        temperature: 68,
        condition: 'Clear',
        humidity: 60,
        windSpeed: 8,
        timestamp: new Date().toISOString(),
        source: 'Fallback (API unavailable)',
      },
    });
  }
}

export const GET = withMultiChainPayment(handler);
