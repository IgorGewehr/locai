import { NextRequest, NextResponse } from 'next/server'
import { messageService } from '@/lib/firebase/firestore'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const conversationId = resolvedParams.id

    // Get messages for this conversation
    const messages = await messageService.getWhere('conversationId', '==', conversationId)
    
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

    const message = {
      conversationId,
      content: body.content,
      type: body.type || 'text',
      isFromAI: body.isFromAI || false,
      timestamp: new Date(),
      metadata: body.metadata || {},
      ...body
    }

    const messageId = await messageService.create(message)

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