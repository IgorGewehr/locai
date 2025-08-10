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
    const dataUrl = await fileToDataUrl(file);
    const fileName = `${generateUniqueId()}-${file.name}`;
    // Use multi-tenant path structure
    const storagePath = `tenants/${tenantId}/properties/${type}s/${fileName}`;
    const storageRef = ref(storage, storagePath);

    const snapshot = await uploadString(storageRef, dataUrl, 'data_url');
    const url = await getDownloadURL(snapshot.ref);
    
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
    setUploading(true)
    setError(null)
    setProgress(0)

    const maxSizeInMB = type === 'image' ? 10 : 50
    const allowedTypes = type === 'image' ? ['image/'] : ['video/']

    try {
      // Check authentication first
      if (!auth.currentUser) {
        throw new Error('Você precisa estar autenticado para fazer upload de arquivos')
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
          const storagePath = `tenants/${tenantId}/properties/${type}s/${fileName}`;
          const storageRef = ref(storage, storagePath)
          console.log(`[MediaUpload] Upload path: ${storagePath}`);
          
          // Try primary method: uploadBytesResumable
          try {
            console.log(`[MediaUpload] Attempting primary upload for: ${file.name}`);
            return await new Promise<UploadedFile>((resolve, reject) => {
              const uploadTask = uploadBytesResumable(storageRef, fileToUpload);
              
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
                  setProgress(overallProgress);
                },
                // Error callback
                (error) => {
                  clearTimeout(uploadTimeout);
                  reject(new Error('PRIMARY_FAILED'));
                },
                // Success callback
                async () => {
                  clearTimeout(uploadTimeout);
                  
                  try {
                    const url = await getDownloadURL(uploadTask.snapshot.ref);
                    console.log(`[MediaUpload] Primary upload successful for: ${file.name}`);
                    console.log(`[MediaUpload] URL obtained: ${url.substring(0, 50)}...`);
                    resolve({
                      name: file.name,
                      url,
                      size: file.size,
                    });
                  } catch (urlError) {
                    console.error(`[MediaUpload] Error getting download URL for: ${file.name}`, urlError);
                    reject(new Error('PRIMARY_FAILED'));
                  }
                }
              );
            });
          } catch (primaryError) {
            console.log(`[MediaUpload] Primary upload failed for: ${file.name}, trying fallback`);
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
  }, [])

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