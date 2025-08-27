// lib/hooks/useMediaUpload.ts
import { useState, useCallback } from 'react'
import { ref, uploadBytesResumable, getDownloadURL, UploadTask, uploadBytes, uploadString } from 'firebase/storage'
import { storage, auth } from '@/lib/firebase/config'
import { 
  validateFileType, 
  validateFileSize, 
  generateUniqueId,
  compressImage,
  isImageFile
} from '@/lib/utils/mediaUtils'
import { useTenant } from '@/contexts/TenantContext'

export interface UploadedFile {
  name: string
  url: string
  size: number
}

export interface UseMediaUploadReturn {
  uploadFiles: (files: File[], type: 'image' | 'video') => Promise<UploadedFile[]>
  uploading: boolean
  progress: number
  error: string | null
  clearError: () => void
}

export function useMediaUpload(): UseMediaUploadReturn {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const { tenantId } = useTenant()
  
  console.log('🎬 [useMediaUpload] Hook initialized', {
    tenantId,
    hasValidTenant: !!tenantId,
    tenantIdType: typeof tenantId,
    tenantIdLength: tenantId?.length || 0
  })
  
  // Validate tenant ID
  if (!tenantId) {
    console.error('❌ [useMediaUpload] No tenant ID available!');
  }

  // Helper function to convert file to data URL
  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  // Fallback method using base64/data URL
  const uploadWithDataUrl = async (file: File, type: 'image' | 'video'): Promise<UploadedFile> => {
    console.log('📤 [uploadWithDataUrl] Starting data URL upload', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      tenantId
    });
    
    const dataUrl = await fileToDataUrl(file);
    console.log('🔄 [uploadWithDataUrl] File converted to data URL', {
      dataUrlLength: dataUrl.length,
      dataUrlPreview: dataUrl.substring(0, 50) + '...'
    });
    
    const fileName = `${generateUniqueId()}-${file.name}`;
    // Use multi-tenant path structure with effective tenant ID
    const effectiveTenantId = tenantId || (auth.currentUser?.uid);
    const storagePath = `tenants/${effectiveTenantId}/properties/${type}s/${fileName}`;
    console.log('📁 [uploadWithDataUrl] Storage path created', { storagePath, effectiveTenantId });
    
    const storageRef = ref(storage, storagePath);

    const snapshot = await uploadString(storageRef, dataUrl, 'data_url');
    console.log('✅ [uploadWithDataUrl] Upload to Firebase successful', {
      fullPath: snapshot.ref.fullPath,
      bucket: snapshot.ref.bucket
    });
    
    const url = await getDownloadURL(snapshot.ref);
    console.log('🔗 [uploadWithDataUrl] Download URL obtained', {
      url,
      urlLength: url.length,
      isFirebaseUrl: url.includes('firebasestorage.googleapis.com')
    });
    
    return {
      name: file.name,
      url,
      size: file.size,
    };
  };

  // API fallback method
  const uploadViaAPI = async (files: File[], type: 'image' | 'video'): Promise<UploadedFile[]> => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    formData.append('type', type);

    const response = await fetch('/api/upload/media', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Upload failed');
    }

    const result = await response.json();
    return result.files;
  };

  const uploadFiles = useCallback(async (
    files: File[], 
    type: 'image' | 'video'
  ): Promise<UploadedFile[]> => {
    console.log('🚀 [uploadFiles] Starting upload process', {
      filesCount: files.length,
      type,
      tenantId,
      hasTenantId: !!tenantId,
      fileNames: files.map(f => f.name),
      fileSizes: files.map(f => f.size),
      fileTypes: files.map(f => f.type),
      authUser: auth.currentUser?.uid,
      hasAuth: !!auth.currentUser
    });
    
    // Fallback para usar o UID do usuário se tenantId não estiver disponível
    let effectiveTenantId = tenantId;
    if (!effectiveTenantId && auth.currentUser) {
      effectiveTenantId = auth.currentUser.uid;
      console.log('⚠️ [uploadFiles] Using fallback tenantId from auth user', {
        fallbackTenantId: effectiveTenantId
      });
    }
    
    if (!effectiveTenantId) {
      const error = 'Cannot upload files: No tenant ID available and no authenticated user';
      console.error('❌ [uploadFiles]', error);
      throw new Error(error);
    }
    
    setUploading(true)
    setError(null)
    setProgress(0)

    const maxSizeInMB = type === 'image' ? 10 : 50
    const allowedTypes = type === 'image' ? ['image/'] : ['video/']

    try {
      // Check authentication first
      if (!auth.currentUser) {
        console.error('❌ [uploadFiles] No authenticated user');
        throw new Error('Você precisa estar autenticado para fazer upload de arquivos')
      }
      
      console.log('✅ [uploadFiles] User authenticated', {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        emailVerified: auth.currentUser.emailVerified,
        isAnonymous: auth.currentUser.isAnonymous,
        metadata: auth.currentUser.metadata,
        providerId: auth.currentUser.providerId,
        tenantId: (auth.currentUser as any).tenantId
      });
      
      // Get fresh auth token to check permissions
      try {
        const token = await auth.currentUser.getIdToken();
        console.log('🔑 [uploadFiles] Auth token obtained', {
          hasToken: !!token,
          tokenLength: token?.length
        });
        
        const tokenResult = await auth.currentUser.getIdTokenResult();
        console.log('🔍 [uploadFiles] Token claims', {
          claims: tokenResult.claims,
          expirationTime: tokenResult.expirationTime,
          issuedAtTime: tokenResult.issuedAtTime
        });
      } catch (tokenError) {
        console.error('❌ [uploadFiles] Failed to get auth token', tokenError);
      }
      
      // Validate files
      for (const file of files) {        
        if (!validateFileType(file, allowedTypes)) {
          throw new Error(`Tipo de arquivo não suportado: ${file.name}`)
        }
        if (!validateFileSize(file, maxSizeInMB)) {
          throw new Error(`Arquivo muito grande: ${file.name} (máximo ${maxSizeInMB}MB)`)
        }
      }

      console.log(`[MediaUpload] Starting upload of ${files.length} files (${type})`);

      const uploadPromises = files.map(async (file, index) => {
        console.log(`[MediaUpload] Processing file ${index + 1}/${files.length}: ${file.name}`);
        
        try {
          // Compress images if needed
          let fileToUpload = file
          if (isImageFile(file) && file.size > 2 * 1024 * 1024) { // 2MB threshold
            console.log(`[MediaUpload] Compressing image: ${file.name}`);
            fileToUpload = await compressImage(file, 0.8)
          }

          const fileName = `${generateUniqueId()}-${file.name}`
          // Use multi-tenant path structure
          const storagePath = `tenants/${effectiveTenantId}/properties/${type}s/${fileName}`;
          console.log(`🎯 [MediaUpload] Creating storage reference`, {
            fileName,
            storagePath,
            tenantId,
            effectiveTenantId,
            type,
            originalFileName: file.name
          });
          
          // Check if storage is initialized
          if (!storage) {
            console.error('❌ [MediaUpload] Firebase Storage not initialized!');
            throw new Error('Storage not initialized');
          }
          
          console.log(`🔧 [MediaUpload] Creating storage reference`, {
            hasStorage: !!storage,
            storagePath,
            storageType: typeof storage,
            storageApp: (storage as any).app?.name
          });
          
          const storageRef = ref(storage, storagePath);
          
          console.log(`📍 [MediaUpload] Storage reference created`, {
            fullPath: storageRef.fullPath,
            bucket: storageRef.bucket,
            name: storageRef.name,
            hasRef: !!storageRef
          });
          
          // Try primary method: uploadBytesResumable
          try {
            console.log(`[MediaUpload] Attempting primary upload for: ${file.name}`);
            console.log(`🆕 [MediaUpload] Before uploadBytesResumable call`, {
              storageRefExists: !!storageRef,
              fileExists: !!fileToUpload,
              storageExists: !!storage,
              fileType: fileToUpload.type,
              fileSize: fileToUpload.size
            });
            
            // Test simple uploadBytes first
            console.log(`🧪 [MediaUpload] Testing simple uploadBytes first`);
            try {
              const testSnapshot = await uploadBytes(storageRef, fileToUpload);
              console.log(`✅ [MediaUpload] Simple uploadBytes successful!`, {
                fullPath: testSnapshot.ref.fullPath,
                bucket: testSnapshot.ref.bucket
              });
              const testUrl = await getDownloadURL(testSnapshot.ref);
              console.log(`🎉 [MediaUpload] Got URL from simple upload:`, testUrl);
              return {
                name: file.name,
                url: testUrl,
                size: file.size
              };
            } catch (simpleError) {
              console.error(`❌ [MediaUpload] Simple uploadBytes failed`, {
                error: simpleError,
                errorMessage: simpleError instanceof Error ? simpleError.message : 'Unknown',
                errorCode: (simpleError as any)?.code
              });
              // Continue to resumable upload
            }
            
            return await new Promise<UploadedFile>((resolve, reject) => {
              console.log(`📤 [MediaUpload] Creating upload task`, {
                fileName: file.name,
                fileSize: fileToUpload.size,
                storageRefPath: storageRef.fullPath
              });
              
              let uploadTask;
              try {
                uploadTask = uploadBytesResumable(storageRef, fileToUpload);
                console.log(`✅ [MediaUpload] Upload task created`, {
                  hasUploadTask: !!uploadTask,
                  taskState: (uploadTask as any).state
                });
              } catch (taskError) {
                console.error(`❌ [MediaUpload] Failed to create upload task`, {
                  error: taskError,
                  errorMessage: taskError instanceof Error ? taskError.message : 'Unknown',
                  errorCode: (taskError as any)?.code,
                  errorName: (taskError as any)?.name,
                  errorStack: taskError instanceof Error ? taskError.stack : undefined
                });
                throw new Error('TASK_CREATION_FAILED');
              }
              
              // Set a timeout to prevent hanging
              const uploadTimeout = setTimeout(() => {
                console.log(`[MediaUpload] Primary upload timeout for: ${file.name}`);
                uploadTask.cancel();
                reject(new Error('PRIMARY_TIMEOUT'));
              }, 30000); // Increased timeout
              
              uploadTask.on('state_changed',
                // Progress callback
                (snapshot) => {
                  const fileProgress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                  const overallProgress = ((index * 100) + fileProgress) / files.length;
                  console.log(`📊 [MediaUpload] Upload progress`, {
                    fileName: file.name,
                    fileProgress: `${fileProgress.toFixed(2)}%`,
                    overallProgress: `${overallProgress.toFixed(2)}%`,
                    bytesTransferred: snapshot.bytesTransferred,
                    totalBytes: snapshot.totalBytes,
                    state: snapshot.state
                  });
                  setProgress(overallProgress);
                },
                // Error callback
                (error) => {
                  clearTimeout(uploadTimeout);
                  console.error(`❌ [MediaUpload] Primary upload failed`, {
                    fileName: file.name,
                    hasError: !!error,
                    errorType: typeof error,
                    errorCode: error?.code || (error as any)?.code || 'NO_CODE',
                    errorMessage: error?.message || (error as any)?.message || 'NO_MESSAGE',
                    errorName: error?.name || (error as any)?.name || 'NO_NAME',
                    serverResponse: (error as any)?.serverResponse || 'NO_RESPONSE',
                    customData: (error as any)?.customData || 'NO_CUSTOM_DATA',
                    fullError: error || 'ERROR_IS_UNDEFINED',
                    errorString: error ? error.toString() : 'NO_ERROR_STRING',
                    errorKeys: error ? Object.keys(error) : []
                  });
                  reject(new Error(`PRIMARY_FAILED: ${error?.message || error?.code || 'Unknown error'}` ));
                },
                // Success callback
                async () => {
                  clearTimeout(uploadTimeout);
                  console.log(`✅ [MediaUpload] Upload task completed for: ${file.name}`);
                  
                  try {
                    const url = await getDownloadURL(uploadTask.snapshot.ref);
                    console.log(`🎉 [MediaUpload] Primary upload successful`, {
                      fileName: file.name,
                      url,
                      urlLength: url.length,
                      isFirebaseUrl: url.includes('firebasestorage.googleapis.com'),
                      fullPath: uploadTask.snapshot.ref.fullPath,
                      bucket: uploadTask.snapshot.ref.bucket
                    });
                    resolve({
                      name: file.name,
                      url,
                      size: file.size,
                    });
                  } catch (urlError) {
                    console.error(`❌ [MediaUpload] Error getting download URL`, {
                      fileName: file.name,
                      error: urlError,
                      errorMessage: urlError instanceof Error ? urlError.message : 'Unknown',
                      snapshot: uploadTask.snapshot
                    });
                    reject(new Error('PRIMARY_FAILED'));
                  }
                }
              );
            });
          } catch (primaryError) {
            console.error(`[MediaUpload] Primary upload exception caught`, {
              fileName: file.name,
              errorMessage: primaryError instanceof Error ? primaryError.message : 'Unknown',
              errorType: typeof primaryError,
              errorString: primaryError ? primaryError.toString() : 'NO_ERROR',
              isPrimaryTimeout: primaryError instanceof Error && primaryError.message === 'PRIMARY_TIMEOUT',
              isPrimaryFailed: primaryError instanceof Error && primaryError.message.includes('PRIMARY_FAILED'),
              isTaskCreationFailed: primaryError instanceof Error && primaryError.message === 'TASK_CREATION_FAILED'
            });
            console.log(`[MediaUpload] Trying fallback method for: ${file.name}`);
            // Try fallback method: uploadString with data URL
            try {
              console.log(`[MediaUpload] Attempting fallback upload for: ${file.name}`);
              const result = await uploadWithDataUrl(fileToUpload, type);
              console.log(`[MediaUpload] Fallback upload successful for: ${file.name}`);
              
              // Update progress for fallback
              const overallProgress = ((index + 1) * 100) / files.length;
              setProgress(overallProgress);
              
              return result;
            } catch (fallbackError) {
              console.error(`[MediaUpload] Fallback upload failed for: ${file.name}`, fallbackError);
              throw new Error(`Erro ao enviar ${file.name}. Tente novamente.`);
            }
          }
        } catch (err) {
          throw new Error(`Erro ao preparar upload de ${file.name}: ${err instanceof Error ? err.message : 'Erro desconhecido'}`)
        }
      })

      try {
        console.log(`[MediaUpload] Executing ${uploadPromises.length} upload promises`);
        const results = await Promise.all(uploadPromises)
        console.log(`[MediaUpload] All uploads completed successfully. Total: ${results.length}`);
        return results
      } catch (batchError) {
        console.error('[MediaUpload] Batch upload failed, trying API fallback', batchError);
        // Last resort: API upload for all files
        try {
          console.log('[MediaUpload] Attempting API upload fallback');
          const apiResults = await uploadViaAPI(files, type);
          console.log('[MediaUpload] API upload successful');
          return apiResults;
        } catch (apiError) {
          console.error('[MediaUpload] API upload also failed', apiError);
          throw new Error('Falha em todos os métodos de upload. Verifique sua conexão.');
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro no upload'
      setError(errorMessage)
      throw err
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }, [tenantId])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    uploadFiles,
    uploading,
    progress,
    error,
    clearError,
  }
}