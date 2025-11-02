import { NextResponse } from 'next/server';
import { getAnalyticsMetrics, generateMockTransactions } from '@/lib/x402/analytics';

export async function GET() {
  try {
    // Generate mock data if no transactions exist (for demo)
    generateMockTransactions(25);
    
    const metrics = getAnalyticsMetrics();

    return NextResponse.json({
      success: true,
      metrics,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch analytics',
      },
      { status: 500 }
    );
  }
}
