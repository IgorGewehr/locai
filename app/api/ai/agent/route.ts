import { NextRequest, NextResponse } from 'next/server'
import { AIService } from '@/lib/services/ai-service'
import { ConversationContextManager } from '@/lib/ai/conversation-context'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      conversationId, 
      message, 
      tenantId = 'default',
      agentId = 'ai-agent-default' 
    } = body

    if (!conversationId || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: conversationId, message' },
        { status: 400 }
      )
    }

    // Initialize AI service
    const aiService = new AIService(tenantId)

    // Create conversation and message objects for processing
    const conversation = {
      id: conversationId,
      clientId: body.clientId || 'unknown',
      agentId,
      tenantId,
      whatsappPhone: body.phone || '',
      status: 'active' as any,
      stage: 'discovery' as any,
      intent: 'information' as any,
      priority: 'medium' as any,
      messages: body.conversationHistory || [],
      summary: {
        mainTopic: 'Consulta de cliente',
        keyPoints: [],
        sentimentOverall: { score: 0, label: 'neutral', confidence: 0.5 },
        stage: 'discovery' as any,
        nextSteps: []
      },
      context: body.context || {
        clientPreferences: { amenities: [], communicationStyle: 'formal' },
        previousConversations: [],
        clientScore: 0,
        viewedProperties: [],
        favoriteProperties: [],
        searchCriteria: {},
        flexibleDates: false,
        specialRequests: [],
        pendingQuestions: [],
        nextAction: 'ai_response'
      },
      sentiment: { score: 0, label: 'neutral', confidence: 0.5 },
      confidence: 0.8,
      extractedInfo: {},
      startedAt: new Date(),
      lastMessageAt: new Date(),
      outcome: {
        type: 'information',
        leadScore: 0,
        followUpRequired: false,
        notes: ''
      }
    }

    const messageObj = {
      id: `msg_${Date.now()}`,
      conversationId,
      content: message,
      type: 'text' as any,
      direction: 'inbound' as any,
      isFromAI: false,
      timestamp: new Date(),
      status: 'received' as any
    }

    // Process message with AI
    const aiResponse = await aiService.processMessage(conversation, messageObj)

    return NextResponse.json({
      success: true,
      response: aiResponse,
      conversationId,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
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
    const agentId = searchParams.get('agentId')

    const aiService = new AIService(tenantId)

    if (agentId) {
      // Get specific agent
      const agent = await aiService.getAgent(agentId)
      if (!agent) {
        return NextResponse.json(
          { error: 'Agent not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        agent
      })
    } else {
      // Get all agents
      const agents = await aiService.getAllAgents()

      return NextResponse.json({
        success: true,
        agents
      })
    }

  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      agentId, 
      tenantId = 'default',
      personality,
      configuration 
    } = body

    if (!agentId) {
      return NextResponse.json(
        { error: 'Missing required field: agentId' },
        { status: 400 }
      )
    }

    const aiService = new AIService(tenantId)

    // Update personality if provided
    if (personality) {
      await aiService.updateAgentPersonality(agentId, personality)
    }

    // Update configuration if provided
    if (configuration) {
      await aiService.updateAgentConfiguration(agentId, configuration)
    }

    // Get updated agent
    const updatedAgent = await aiService.getAgent(agentId)

    return NextResponse.json({
      success: true,
      agent: updatedAgent,
      message: 'Agent updated successfully'
    })

  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}