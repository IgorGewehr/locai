import { NextRequest, NextResponse } from 'next/server'
import { AIService } from '@/lib/services/ai-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      agentId = 'ai-agent-default',
      message,
      tenantId = 'default'
    } = body

    if (!message) {
      return NextResponse.json(
        { error: 'Missing required field: message' },
        { status: 400 }
      )
    }

    // Initialize AI service
    const aiService = new AIService(tenantId)

    // Test the agent with the provided message
    const response = await aiService.testAgent(agentId, message)

    return NextResponse.json({
      success: true,
      testResult: {
        input: message,
        output: response.content,
        confidence: response.confidence,
        sentiment: response.sentiment,
        functionCall: response.functionCall,
        suggestedActions: response.suggestedActions,
        timestamp: new Date().toISOString()
      },
      agentId,
      message: 'Agent test completed successfully'
    })

  } catch (error) {
    console.error('Error testing AI agent:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId') || 'default'

    // Initialize AI service and perform health check
    const aiService = new AIService(tenantId)
    const healthCheck = await aiService.healthCheck()

    return NextResponse.json({
      success: true,
      health: healthCheck,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error performing AI health check:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}