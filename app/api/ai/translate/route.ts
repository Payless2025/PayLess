import { NextRequest, NextResponse } from 'next/server';
import { withX402Payment } from '@/lib/x402/middleware';

async function handler(req: NextRequest) {
  const body = await req.json();
  const { text, targetLanguage = 'es', sourceLanguage = 'auto' } = body;

  if (!text) {
    return NextResponse.json(
      { error: 'Text is required' },
      { status: 400 }
    );
  }

  // Simulate translation (in production, call Google Translate/DeepL/etc)
  const translations: Record<string, Record<string, string>> = {
    'Hello, how are you?': {
      es: '¡Hola, cómo estás?',
      fr: 'Bonjour, comment allez-vous?',
      de: 'Hallo, wie geht es dir?',
      ja: 'こんにちは、お元気ですか？',
      zh: '你好，你好吗？',
    },
    'Welcome to Payless': {
      es: 'Bienvenido a Payless',
      fr: 'Bienvenue chez Payless',
      de: 'Willkommen bei Payless',
      ja: 'Paylessへようこそ',
      zh: '欢迎来到Payless',
    },
  };

  const translatedText = translations[text]?.[targetLanguage] || 
    `[Translated: ${text} → ${targetLanguage}]`;

  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 800));

  return NextResponse.json({
    success: true,
    data: {
      originalText: text,
      translatedText,
      sourceLanguage,
      targetLanguage,
      timestamp: new Date().toISOString(),
    },
  });
}

export const POST = withX402Payment(handler);

