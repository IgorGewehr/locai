// Endpoint DEBUG - Sofia simplificada para identificar problema
import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { getOpenAIFunctions } from '@/lib/ai/agent-functions';

export async function POST(request: NextRequest) {
  try {
    const { message, clientPhone } = await request.json();
    
    console.log('🔧 [DEBUG] Testando Sofia simplificada:', message);
    
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const simplePrompt = `Você é Sofia, consultora imobiliária. 
    
REGRA ÚNICA: Se mencionam apartamento, casa, alugar ou similar, EXECUTE search_properties IMEDIATAMENTE.
NUNCA pergunte detalhes - sempre execute com dados padrão.`;

    const messages = [
      { role: 'system', content: simplePrompt },
      { role: 'user', content: message }
    ];

    console.log('🎯 [DEBUG] Chamando OpenAI...');
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      tools: getOpenAIFunctions(),
      tool_choice: 'required',
      max_tokens: 1000,
      temperature: 0.7
    });

    const response = completion.choices[0].message;
    
    console.log('📥 [DEBUG] Resposta OpenAI:', {
      hasToolCalls: !!response.tool_calls,
      toolCallsCount: response.tool_calls?.length || 0,
      functions: response.tool_calls?.map(tc => tc.function.name) || []
    });

    return NextResponse.json({
      success: true,
      message: response.content || 'Função executada!',
      debug: {
        toolCalls: response.tool_calls?.length || 0,
        functions: response.tool_calls?.map(tc => tc.function.name) || [],
        tokens: completion.usage?.total_tokens || 0
      }
    });

  } catch (error: any) {
    console.error('❌ [DEBUG] Erro:', error.message);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack?.split('\n').slice(0, 3).join('\n')
    }, { status: 500 });
  }
}