/**
 * API para obter informações do usuário atual
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await validateFirebaseAuth(request);
    
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: auth.userId,
        email: auth.email,
        tenantId: auth.tenantId || auth.userId, // Use userId as tenantId fallback
      }
    });

  } catch (error) {
    console.error('Error getting user info:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get user information'
    }, { status: 500 });
  }
}