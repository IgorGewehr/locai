// Endpoint super simples para testar Sofia Fixed sem dependências
import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';

export async function POST(request: NextRequest) {
  console.log('🔥 [SIMPLE TEST] Iniciando teste simples da Sofia Fixed');
  
  try {
    const { message } = await request.json();
    
    // Teste 1: Verificar se OpenAI funciona diretamente
    console.log('🔥 [SIMPLE TEST] Testando OpenAI diretamente...');
    const openai = new OpenAI({
      apiKey: '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'
    });

    const start = Date.now();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Você é Sofia, consultora imobiliária.' },
        { role: 'user', content: message || 'oi' }
      ],
      max_tokens: 100,
      temperature: 0.7
    });
    
    const duration = Date.now() - start;
    console.log('🔥 [SIMPLE TEST] OpenAI respondeu em', duration + 'ms');
    
    // Teste 2: Tentar importar Sofia Fixed
    console.log('🔥 [SIMPLE TEST] Tentando importar Sofia Fixed...');
    try {
      const { SofiaAgentFixed } = await import('@/lib/ai-agent/sofia-agent-fixed');
      console.log('🔥 [SIMPLE TEST] Sofia Fixed importada com sucesso!');
      
      // Teste 3: Criar instância
      console.log('🔥 [SIMPLE TEST] Tentando criar instância...');
      const sofia = SofiaAgentFixed.getInstance();
      console.log('🔥 [SIMPLE TEST] Instância criada com sucesso!');
      
      return NextResponse.json({
        success: true,
        message: completion.choices[0].message.content,
        tests: {
          openai_direct: { success: true, time: duration },
          sofia_import: { success: true },
          sofia_instance: { success: true }
        }
      });
      
    } catch (importError: any) {
      console.error('🔥 [SIMPLE TEST] Erro ao importar Sofia Fixed:', importError.message);
      
      return NextResponse.json({
        success: true,
        message: completion.choices[0].message.content,
        tests: {
          openai_direct: { success: true, time: duration },
          sofia_import: { success: false, error: importError.message },
          sofia_instance: { success: false }
        }
      });
    }
    
  } catch (error: any) {
    console.error('🔥 [SIMPLE TEST] ERRO CRÍTICO:', error.message);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      tests: {
        openai_direct: { success: false, error: error.message }
      }
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Simple test endpoint - use POST with {"message": "test"}'
  });
}