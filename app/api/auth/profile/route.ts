import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getAuthFromCookie } from '@/lib/utils/auth-cookie';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromCookie(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile from Firestore
    const userDoc = await adminDb.collection('users').doc(auth.userId).get();
    
    if (!userDoc.exists) {
      // Return basic profile if not in database yet
      return NextResponse.json({
        id: auth.userId,
        email: auth.email,
        name: '',
        phone: '',
        role: 'user',
        avatar: null,
        company: 'LocAI Imobiliária',
        position: 'Usuário',
        location: '',
        bio: '',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        settings: {
          notifications: true,
          darkMode: false,
          language: 'pt-BR',
          emailNotifications: true,
          whatsappNotifications: true,
        }
      });
    }

    const userData = userDoc.data();
    return NextResponse.json({
      id: auth.userId,
      ...userData,
    });

  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await getAuthFromCookie(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Remove id from body to avoid overwriting
    const { id, ...profileData } = body;

    // Update user profile in Firestore
    await adminDb.collection('users').doc(auth.userId).set({
      ...profileData,
      email: auth.email, // Ensure email matches auth
      updatedAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    }, { merge: true });

    // Also update tenant-specific user settings if needed
    if (auth.tenantId && auth.tenantId !== 'default-tenant') {
      await adminDb
        .collection('tenants')
        .doc(auth.tenantId)
        .collection('users')
        .doc(auth.userId)
        .set({
          ...profileData,
          email: auth.email,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
    });

  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}