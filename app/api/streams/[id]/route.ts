import { NextRequest, NextResponse } from 'next/server';
import {
  getStream,
  pauseStream,
  resumeStream,
  completeStream,
  cancelStream,
  addStreamFunds,
  updateStreamBilling,
} from '@/lib/x402/payment-streaming';

/**
 * GET /api/streams/[id] - Get stream details
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const streamId = params.id;
    
    // Update billing before returning
    await updateStreamBilling(streamId);
    
    const stream = await getStream(streamId);

    if (!stream) {
      return NextResponse.json(
        { error: 'Stream not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      stream,
    });
  } catch (error) {
    console.error('Get stream error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stream' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/streams/[id] - Update stream (pause, resume, add funds)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const streamId = params.id;
    const body = await req.json();
    const { action, amount, reason } = body;

    let stream;

    switch (action) {
      case 'pause':
        stream = await pauseStream(streamId);
        break;

      case 'resume':
        stream = await resumeStream(streamId);
        break;

      case 'complete':
        stream = await completeStream(streamId);
        break;

      case 'cancel':
        stream = await cancelStream(streamId, reason);
        break;

      case 'add_funds':
        if (!amount || amount <= 0) {
          return NextResponse.json(
            { error: 'Valid amount is required for add_funds action' },
            { status: 400 }
          );
        }
        stream = await addStreamFunds(streamId, amount);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: pause, resume, complete, cancel, or add_funds' },
          { status: 400 }
        );
    }

    if (!stream) {
      return NextResponse.json(
        { error: 'Stream not found or action not allowed in current state' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      stream,
      message: `Stream ${action} successful`,
    });
  } catch (error) {
    console.error('Update stream error:', error);
    return NextResponse.json(
      { error: 'Failed to update stream' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/streams/[id] - Cancel stream
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const streamId = params.id;
    const stream = await cancelStream(streamId, 'Deleted by user');

    if (!stream) {
      return NextResponse.json(
        { error: 'Stream not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      stream,
      message: 'Stream cancelled successfully',
    });
  } catch (error) {
    console.error('Delete stream error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel stream' },
      { status: 500 }
    );
  }
}
