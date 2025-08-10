import { NextRequest, NextResponse } from 'next/server';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase/config';
import { generateUniqueId } from '@/lib/utils/mediaUtils';
import { logger } from '@/lib/utils/logger';
import { verifyAuth } from '@/lib/utils/auth';

export async function POST(request: NextRequest) {
  logger.info('📤 [MediaUploadAPI] Fallback upload API called');
  
  try {
    // Verify authentication
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }
    
    const tenantId = user.tenantId || user.uid;
    
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const type = formData.get('type') as string;
    
    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum arquivo enviado' },
        { status: 400 }
      );
    }
    
    if (!type || !['image', 'video'].includes(type)) {
      return NextResponse.json(
        { error: 'Tipo de arquivo inválido' },
        { status: 400 }
      );
    }
    
    logger.info('📁 [MediaUploadAPI] Processing files via fallback API', {
      fileCount: files.length,
      type,
      filenames: files.map(f => f.name)
    });
    
    const maxSizeInMB = type === 'image' ? 10 : 50;
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    
    // Validate files
    for (const file of files) {
      if (file.size > maxSizeInBytes) {
        return NextResponse.json(
          { error: `Arquivo muito grande: ${file.name} (máximo ${maxSizeInMB}MB)` },
          { status: 400 }
        );
      }
      
      const allowedTypes = type === 'image' ? ['image/'] : ['video/'];
      if (!allowedTypes.some(allowedType => file.type.startsWith(allowedType))) {
        return NextResponse.json(
          { error: `Tipo de arquivo não suportado: ${file.name}` },
          { status: 400 }
        );
      }
    }
    
    // Process uploads
    const uploadPromises = files.map(async (file) => {
      const fileName = `${generateUniqueId()}-${file.name}`;
      // Use multi-tenant path structure
      const storagePath = `tenants/${tenantId}/properties/${type}s/${fileName}`;
      const storageRef = ref(storage, storagePath);
      
      logger.info('📤 [MediaUploadAPI] Uploading file via fallback', {
        fileName,
        fileSize: file.size,
        contentType: file.type
      });
      
      // Convert File to ArrayBuffer for server-side upload
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Upload to Firebase Storage
      const uploadResult = await uploadBytes(storageRef, uint8Array, {
        contentType: file.type,
      });
      
      // Get download URL
      const downloadURL = await getDownloadURL(uploadResult.ref);
      
      logger.info('✅ [MediaUploadAPI] Fallback upload successful', {
        fileName,
        downloadURL: downloadURL.substring(0, 50) + '...'
      });
      
      return {
        name: file.name,
        url: downloadURL,
        size: file.size,
      };
    });
    
    const results = await Promise.all(uploadPromises);
    
    logger.info('🎉 [MediaUploadAPI] All fallback uploads completed', {
      totalFiles: results.length,
      totalSize: results.reduce((sum, r) => sum + r.size, 0)
    });
    
    return NextResponse.json({
      success: true,
      files: results,
    });
    
  } catch (error) {
    logger.error('❌ [MediaUploadAPI] Fallback upload error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    let errorMessage = 'Erro no upload';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}