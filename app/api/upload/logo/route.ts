import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromCookie } from '@/lib/utils/auth-cookie';
import { StorageService } from '@/lib/firebase/storage';

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromCookie(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, SVG, and WebP are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (max 2MB for logos)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 2MB.' },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Firebase Storage
    const storageService = new StorageService();
    const tenantId = auth.tenantId || 'default-tenant';
    const filename = `logos/${tenantId}_${Date.now()}.${file.type.split('/')[1]}`;
    const url = await storageService.uploadFile(buffer, filename, file.type);

    return NextResponse.json({
      success: true,
      url,
    });

  } catch (error) {
    console.error('Logo upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload logo' },
      { status: 500 }
    );
  }
}