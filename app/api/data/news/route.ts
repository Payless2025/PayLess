import { NextRequest, NextResponse } from 'next/server';
import { withX402Payment } from '@/lib/x402/middleware';

async function handler(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category') || 'technology';
  const limit = parseInt(searchParams.get('limit') || '5');

  // Simulate news data (in production, call NewsAPI/RSS feeds/etc)
  const newsTemplates = [
    {
      title: 'Breakthrough in AI Technology Announced',
      description: 'Major tech companies reveal significant advances in artificial intelligence capabilities.',
      source: 'Tech Daily',
      category: 'technology',
    },
    {
      title: 'Cryptocurrency Market Shows Strong Growth',
      description: 'Digital assets continue to gain mainstream adoption with institutional investors.',
      source: 'Crypto News',
      category: 'crypto',
    },
    {
      title: 'Global Markets React to Economic Data',
      description: 'Stock markets worldwide respond to latest economic indicators and policy changes.',
      source: 'Financial Times',
      category: 'business',
    },
    {
      title: 'New Scientific Discovery Promises Medical Advances',
      description: 'Researchers make breakthrough that could lead to new treatments for diseases.',
      source: 'Science Today',
      category: 'science',
    },
    {
      title: 'Blockchain Technology Adoption Accelerates',
      description: 'More industries explore decentralized solutions for transparency and efficiency.',
      source: 'Blockchain Weekly',
      category: 'technology',
    },
  ];

  const filteredNews = newsTemplates
    .filter(news => category === 'all' || news.category === category)
    .slice(0, limit)
    .map((news, index) => ({
      ...news,
      id: `news-${Date.now()}-${index}`,
      url: `https://news.example.com/article/${index}`,
      publishedAt: new Date(Date.now() - Math.random() * 86400000).toISOString(),
      author: `Reporter ${index + 1}`,
    }));

  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 700));

  return NextResponse.json({
    success: true,
    data: {
      articles: filteredNews,
      category,
      totalResults: filteredNews.length,
      timestamp: new Date().toISOString(),
    },
  });
}

export const GET = withX402Payment(handler);

