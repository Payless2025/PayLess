import { NextRequest, NextResponse } from 'next/server';
import { withX402Payment } from '@/lib/x402/middleware';
import axios from 'axios';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/images/generations';

async function handler(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, size = '512x512' } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // If no API key, return placeholder
    if (!OPENAI_API_KEY) {
      console.warn('OpenAI API key not set, using placeholder image');
      return NextResponse.json({
        success: true,
        data: {
          prompt,
          imageUrl: `https://via.placeholder.com/${size.replace('x', 'x')}/6366F1/FFFFFF?text=AI+Image:+${encodeURIComponent(prompt.substring(0, 20))}`,
          size,
          timestamp: new Date().toISOString(),
          source: 'Placeholder (Set OPENAI_API_KEY for real AI images)',
        },
      });
    }

    // Call real OpenAI DALL-E API
    const response = await axios.post(
      OPENAI_API_URL,
      {
        prompt,
        n: 1,
        size: size === '512x512' ? '512x512' : '1024x1024',
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000, // 60 seconds for image generation
      }
    );

    const imageUrl = response.data.data[0].url;

    return NextResponse.json({
      success: true,
      data: {
        prompt,
        imageUrl,
        size,
        timestamp: new Date().toISOString(),
        source: 'OpenAI DALL-E',
      },
    });
  } catch (error: any) {
    console.error('OpenAI Image API error:', error.response?.data || error.message);
    
    return NextResponse.json({
      success: false,
      error: 'Image generation service temporarily unavailable',
      message: error.response?.data?.error?.message || 'Failed to generate image',
    }, { status: 500 });
  }
}

export const POST = withX402Payment(handler);
