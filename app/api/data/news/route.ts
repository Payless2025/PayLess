import { NextRequest, NextResponse } from 'next/server';
import { withX402Payment } from '@/lib/x402/middleware';
import axios from 'axios';

const NEWSAPI_KEY = process.env.NEWSAPI_KEY;
const NEWSAPI_URL = 'https://newsapi.org/v2';

const MOCK_NEWS = [
  {
    title: 'Bitcoin Surges Past $50,000 as Institutional Investment Grows',
    description: 'Major financial institutions are increasing their cryptocurrency holdings, driving Bitcoin to new heights.',
    url: 'https://example.com/news/bitcoin-surge',
    source: 'Crypto News Daily',
    publishedAt: new Date().toISOString(),
  },
  {
    title: 'AI Startup Raises $100M in Series B Funding',
    description: 'Revolutionary AI company secures major funding round to expand operations and accelerate product development.',
    url: 'https://example.com/news/ai-funding',
    source: 'Tech Crunch',
    publishedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    title: 'New Study Shows Remote Work Increases Productivity by 20%',
    description: 'Comprehensive research reveals significant productivity gains for remote workers across various industries.',
    url: 'https://example.com/news/remote-work',
    source: 'Business Insider',
    publishedAt: new Date(Date.now() - 7200000).toISOString(),
  },
];

async function handler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || 'technology';
    const limit = parseInt(searchParams.get('limit') || '5');

    // If no API key, return mock data
    if (!NEWSAPI_KEY) {
      console.warn('NewsAPI key not set, using mock data');
      return NextResponse.json({
        success: true,
        data: {
          category,
          articles: MOCK_NEWS.slice(0, limit),
          total: MOCK_NEWS.length,
          timestamp: new Date().toISOString(),
          source: 'Mock Data (Set NEWSAPI_KEY for real news)',
        },
      });
    }

    // Fetch real news from NewsAPI
    const response = await axios.get(`${NEWSAPI_URL}/top-headlines`, {
      params: {
        category,
        language: 'en',
        pageSize: limit,
        apiKey: NEWSAPI_KEY,
      },
      timeout: 10000,
    });

    const articles = response.data.articles.map((article: any) => ({
      title: article.title,
      description: article.description,
      url: article.url,
      source: article.source.name,
      author: article.author,
      publishedAt: article.publishedAt,
      image: article.urlToImage,
    }));

    return NextResponse.json({
      success: true,
      data: {
        category,
        articles,
        total: response.data.totalResults,
        timestamp: new Date().toISOString(),
        source: 'NewsAPI',
      },
    });
  } catch (error) {
    console.error('News API error:', error);
    
    // Return mock data as fallback
    return NextResponse.json({
      success: true,
      data: {
        category: 'technology',
        articles: MOCK_NEWS.slice(0, 3),
        total: MOCK_NEWS.length,
        timestamp: new Date().toISOString(),
        source: 'Fallback (API unavailable)',
      },
    });
  }
}

export const GET = withX402Payment(handler);
