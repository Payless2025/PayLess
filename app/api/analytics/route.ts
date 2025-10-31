import { NextRequest, NextResponse } from 'next/server';
import { analyticsStore, AnalyticsFilter } from '@/lib/x402/analytics';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  
  // Parse filter parameters
  const filter: AnalyticsFilter = {};
  
  const startDate = searchParams.get('startDate');
  if (startDate) {
    filter.startDate = parseInt(startDate);
  }
  
  const endDate = searchParams.get('endDate');
  if (endDate) {
    filter.endDate = parseInt(endDate);
  }
  
  const endpoint = searchParams.get('endpoint');
  if (endpoint) {
    filter.endpoint = endpoint;
  }
  
  const status = searchParams.get('status');
  if (status) {
    filter.status = parseInt(status);
  }

  // Get metrics based on filter
  const metrics = analyticsStore.getMetrics(filter);

  return NextResponse.json({
    success: true,
    data: metrics,
    filter,
  });
}

// Export analytics data
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { format = 'json', filter } = body;

    const events = analyticsStore.getEvents(filter);

    if (format === 'csv') {
      // Convert to CSV
      const headers = [
        'ID',
        'Timestamp',
        'Date',
        'Endpoint',
        'Method',
        'Status',
        'Payment Required',
        'Payment Provided',
        'Payment Valid',
        'Amount',
        'Wallet Address',
        'Response Time (ms)',
        'Error'
      ];

      const csvRows = [
        headers.join(','),
        ...events.map(event => [
          event.id,
          event.timestamp,
          new Date(event.timestamp).toISOString(),
          event.endpoint,
          event.method,
          event.status,
          event.paymentRequired,
          event.paymentProvided,
          event.paymentValid,
          event.amount || '',
          event.walletAddress || '',
          event.responseTime,
          event.error || ''
        ].join(','))
      ];

      return new NextResponse(csvRows.join('\n'), {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="analytics-${Date.now()}.csv"`,
        },
      });
    }

    // Default: JSON format
    return NextResponse.json({
      success: true,
      data: events,
      count: events.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to export analytics data' },
      { status: 500 }
    );
  }
}

