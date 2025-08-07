import { NextRequest, NextResponse } from 'next/server'

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

    // WhatsApp Web temporarily disabled
    return NextResponse.json({ 
      success: false, 
      message: 'WhatsApp Web temporarily disabled - dependency issues being resolved' 
    })
  } catch (error) {
    console.error('WhatsApp Web webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}