import { NextRequest, NextResponse } from 'next/server'
import { whatsappSessionManager } from '@/lib/whatsapp/session-manager'

// This webhook is called internally by the session manager when messages arrive
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tenantId, message } = body

    if (!tenantId || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Messages are already processed by the session manager
    // This endpoint exists for future expansion

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('WhatsApp Web webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}