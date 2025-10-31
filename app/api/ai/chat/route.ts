import { NextRequest, NextResponse } from 'next/server';
import { withX402Payment } from '@/lib/x402/middleware';
import axios from 'axios';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

async function handler(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, model = 'gpt-3.5-turbo' } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // If no API key, return helpful mock response
    if (!OPENAI_API_KEY) {
      console.warn('OpenAI API key not set, using mock response');
      return NextResponse.json({
        success: true,
        data: {
          message: `This is a mock AI response to: "${message}". To get real AI responses, set your OPENAI_API_KEY in .env.local`,
          model: 'mock-model',
          usage: { tokens: 0 },
          timestamp: new Date().toISOString(),
          source: 'Mock Response (Set OPENAI_API_KEY for real AI)',
        },
      });
    }

    // Call real OpenAI API
    const response = await axios.post(
      OPENAI_API_URL,
      {
        model,
        messages: [
          {
            role: 'user',
            content: message,
          },
        ],
        max_tokens: 500,
        temperature: 0.7,
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 seconds
      }
    );

    const aiResponse = response.data.choices[0].message.content;

    return NextResponse.json({
      success: true,
      data: {
        message: aiResponse,
        model: response.data.model,
        usage: {
          promptTokens: response.data.usage.prompt_tokens,
          completionTokens: response.data.usage.completion_tokens,
          totalTokens: response.data.usage.total_tokens,
        },
        timestamp: new Date().toISOString(),
        source: 'OpenAI API',
      },
    });
  } catch (error: any) {
    console.error('OpenAI API error:', error.response?.data || error.message);
    
    return NextResponse.json({
      success: false,
      error: 'AI service temporarily unavailable',
      message: error.response?.data?.error?.message || 'Failed to generate response',
    }, { status: 500 });
  }
}

export const POST = withX402Payment(handler);
