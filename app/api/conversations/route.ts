import { NextRequest, NextResponse } from 'next/server'
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2'
import { conversationService } from '@/lib/services/conversation-service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId') || 'default'
    const status = searchParams.get('status')
    const stage = searchParams.get('stage')
    const clientId = searchParams.get('clientId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let conversations = []

    if (clientId) {
      // Get conversations for specific client
      conversations = await conversationService.getConversationsByClient(clientId)
    } else if (status || stage) {
      // Search with filters
      const filters = {
        tenantId,
        status,
        stage,
        limit: limit + offset
      }
      conversations = await conversationService.searchConversations(tenantId, filters)
      conversations = conversations.slice(offset, offset + limit)
    } else {
      // Get active conversations
      conversations = await conversationService.getActiveConversations(tenantId, limit)
    }

    return NextResponse.json({
      success: true,
      conversations,
      total: conversations.length,
      limit,
      offset
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      phoneNumber,
      clientName,
      tenantId = 'default'
    } = body

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Missing required field: phoneNumber' },
        { status: 400 }
      )
    }

    // Check if conversation already exists
    const existingConversation = await conversationService.findActiveByPhone(phoneNumber, tenantId)

    if (existingConversation) {
      return NextResponse.json({
        success: true,
        conversation: existingConversation,
        message: 'Conversation already exists'
      })
    }

    // Create new conversation
    const conversation = await conversationService.createNew(phoneNumber, clientName, tenantId)

    return NextResponse.json({
      success: true,
      conversation,
      message: 'Conversation created successfully'
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