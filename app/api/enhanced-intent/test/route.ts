import { NextRequest, NextResponse } from 'next/server';
import { enhancedIntentDetector } from '@/lib/ai-agent/enhanced-intent-detector';

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();
    
    if (!message) {
      return NextResponse.json({ error: 'Mensagem é obrigatória' }, { status: 400 });
    }

    const startTime = Date.now();
    const result = await enhancedIntentDetector.testDetection(message);
    const processingTime = Date.now() - startTime;

    return NextResponse.json({
      ...result,
      processingTime
    });

  } catch (error) {
    console.error('Erro no teste de intent:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' }, 
      { status: 500 }
    );
  }
}