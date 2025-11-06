import { NextRequest, NextResponse } from 'next/server';
import {
  streamStore,
  calculateStreamAmount,
} from '@/lib/x402/payment-streaming';

/**
 * GET /api/streams/active - Get all active streams with real-time amounts
 */
export async function GET(req: NextRequest) {
  try {
    const activeStreams = streamStore.getActiveStreams();

    const streamsWithAmounts = activeStreams.map(stream => ({
      ...stream,
      currentAmount: calculateStreamAmount(stream),
      duration: Math.floor((Date.now() - stream.startTime) / 1000),
    }));

    // Calculate total streaming volume
    const totalVolume = streamsWithAmounts.reduce(
      (sum, stream) => sum + stream.currentAmount,
      0
    );

    return NextResponse.json({
      success: true,
      count: streamsWithAmounts.length,
      totalVolume,
      streams: streamsWithAmounts,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to fetch active streams',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

