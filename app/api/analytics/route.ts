import { NextResponse } from 'next/server';
import { getAnalyticsMetrics, generateMockTransactions, getAllTransactions } from '@/lib/x402/analytics';

export async function GET() {
  try {
    // Generate mock data if no transactions exist (for demo)
    if (getAllTransactions().length === 0) {
      generateMockTransactions(50); // More data for better charts
    }
    
    const metrics = getAnalyticsMetrics();

    return NextResponse.json({
      success: true,
      data: metrics,
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
