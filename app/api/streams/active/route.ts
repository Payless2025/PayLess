import { NextRequest, NextResponse } from 'next/server';
import {
  getActiveStreams,
  updateStreamBilling,
  calculateStreamCost,
} from '@/lib/x402/payment-streaming';

/**
 * GET /api/streams/active - Get all active streams with real-time amounts
 */
export async function GET(req: NextRequest) {
  try {
    const activeStreams = getActiveStreams();

    // Update billing for all active streams and add current amounts
    const streamsWithAmounts = activeStreams.map(stream => {
      // Update billing to get latest amounts
      const updatedStream = updateStreamBilling(stream.id) || stream;
      
      // Calculate current duration
      const currentDuration = updatedStream.totalDuration;
      
      return {
        ...updatedStream,
        currentAmount: updatedStream.totalCharged,
        duration: Math.floor(currentDuration),
      };
    });

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

