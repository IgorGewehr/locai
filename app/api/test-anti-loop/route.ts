import { NextRequest, NextResponse } from 'next/server'
import { MessageDeduplicationService } from '@/lib/services/message-deduplication-service'
import { logger } from '@/lib/utils/logger'

/**
 * Endpoint para testar o sistema anti-loop localmente
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { testType, message, clientPhone, tenantId } = body

    logger.info('🧪 [Test Anti-Loop] Testando sistema', {
      testType,
      message: message?.substring(0, 50) + '...',
      clientPhone: clientPhone?.substring(0, 6) + '***'
    })

    const deduplicationService = MessageDeduplicationService.getInstance()
    
    switch (testType) {
      case 'debounce':
        // Testar sistema de debounce
        const processed = await deduplicationService.addMessage(
          tenantId,
          clientPhone,
          message,
          `test-${Date.now()}`,
          async (groupedMessages: string[], messageIds: string[]) => {
            logger.info('✅ [Test] Grouped messages would be processed', {
              messageCount: groupedMessages.length,
              combined: groupedMessages.join(' | ')
            })
          }
        )
        
        return NextResponse.json({
          success: true,
          processedImmediately: processed,
          message: processed ? 'Message processed immediately' : 'Message added to debounce queue'
        })

      case 'stats':
        // Retornar estatísticas do sistema
        const stats = deduplicationService.getStats()
        return NextResponse.json({
          success: true,
          stats
        })

      case 'bot_detection':
        // Testar detecção de mensagem de bot
        const { sofiaAgent } = await import('@/lib/ai-agent/sofia-agent')
        const agent = await sofiaAgent.getInstance()
        
        // Usar método privado através de reflexão (apenas para teste)
        const isBotMessage = (agent as any).isBotMessage(message)
        
        return NextResponse.json({
          success: true,
          isBotMessage,
          message: isBotMessage ? 'Message detected as bot message' : 'Message is from user'
        })

      case 'suspicious':
        // Testar detecção de mensagem suspeita
        const { sofiaAgent: agent2 } = await import('@/lib/ai-agent/sofia-agent')
        const agentInstance = await agent2.getInstance()
        
        const isSuspicious = (agentInstance as any).isSuspiciousMessage(message, clientPhone)
        
        return NextResponse.json({
          success: true,
          isSuspicious,
          message: isSuspicious ? 'Message detected as suspicious' : 'Message is normal'
        })

      default:
        return NextResponse.json(
          { error: 'Invalid test type' },
          { status: 400 }
        )
    }

  } catch (error) {
    logger.error('❌ [Test Anti-Loop] Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const deduplicationService = MessageDeduplicationService.getInstance()
    const stats = deduplicationService.getStats()
    
    return NextResponse.json({
      success: true,
      antiLoopSystem: 'active',
      stats,
      features: [
        'Message deduplication',
        'Debounce grouping',
        'Bot message detection',
        'Suspicious message filtering',
        'Rate limiting'
      ]
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get anti-loop stats' },
      { status: 500 }
    )
  }
}