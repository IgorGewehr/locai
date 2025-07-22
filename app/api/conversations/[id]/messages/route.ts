import { NextRequest, NextResponse } from 'next/server'
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const conversationId = resolvedParams.id
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId') || 'default'

    const services = new TenantServiceFactory(tenantId)

    // Get messages for this conversation
    const messages = await services.messages.getWhere('conversationId', '==', conversationId)
    
    // Sort messages by timestamp
    const sortedMessages = messages
      .sort((a, b) => {
        const timeA = (a.timestamp as any)?.toDate ? (a.timestamp as any).toDate() : new Date(a.timestamp)
        const timeB = (b.timestamp as any)?.toDate ? (b.timestamp as any).toDate() : new Date(b.timestamp)
        return timeA.getTime() - timeB.getTime()
      })
      .map(msg => ({
        ...msg,
        timestamp: (msg.timestamp as any)?.toDate ? (msg.timestamp as any).toDate() : new Date(msg.timestamp)
      }))

    return NextResponse.json(sortedMessages)

  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const conversationId = resolvedParams.id
    const body = await request.json()
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId') || body.tenantId || 'default'

    const services = new TenantServiceFactory(tenantId)

    const message = {
      conversationId,
      content: body.content,
      type: body.type || 'text',
      isFromAI: body.isFromAI || false,
      timestamp: new Date(),
      metadata: body.metadata || {},
      tenantId,
      ...body
    }

    const messageId = await services.messages.create(message)

    return NextResponse.json({
      success: true,
      message: {
        id: messageId,
        ...message
      }
    })

  } catch (error) {
    console.error('Error creating message:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}