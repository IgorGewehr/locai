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
    console.log(`🔄 Using data URL fallback for ${file.name}`);
    
    const dataUrl = await fileToDataUrl(file);
    const fileName = `${generateUniqueId()}-${file.name}`;
    const storageRef = ref(storage, `properties/${type}s/${fileName}`);

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
    console.log(`🔄 Using API fallback for ${files.length} files`);
    
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
    console.log('🚀 Starting upload process...', {
      fileCount: files.length,
      type,
      files: files.map(f => ({ name: f.name, size: f.size, type: f.type }))
    });

    setUploading(true)
    setError(null)
    setProgress(0)

    const maxSizeInMB = type === 'image' ? 10 : 50
    const allowedTypes = type === 'image' ? ['image/'] : ['video/']

    try {
      // Diagnose Firebase configuration
      console.log('🔧 Firebase Configuration Check:');
      console.log('- Storage instance:', !!storage);
      console.log('- Auth instance:', !!auth);
      console.log('- Storage bucket:', storage?.app?.options?.storageBucket);
      console.log('- Auth current user:', !!auth.currentUser);
      
      // Check authentication first
      if (!auth.currentUser) {
        console.error('❌ No authenticated user found');
        throw new Error('Você precisa estar autenticado para fazer upload de arquivos')
      }
      
      console.log('🔐 User authenticated:', auth.currentUser.email);
      console.log('📦 Storage bucket:', storage.app.options.storageBucket);
      
      // Validate files
      console.log('🔍 Validating files...');
      for (const file of files) {
        console.log(`- Validating ${file.name}:`, {
          type: file.type,
          size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
          allowedTypes,
          maxSizeInMB
        });
        
        if (!validateFileType(file, allowedTypes)) {
          throw new Error(`Tipo de arquivo não suportado: ${file.name}`)
        }
        if (!validateFileSize(file, maxSizeInMB)) {
          throw new Error(`Arquivo muito grande: ${file.name} (máximo ${maxSizeInMB}MB)`)
        }
      }

      const uploadPromises = files.map(async (file, index) => {
        try {
          console.log(`📤 Processing file ${index + 1}/${files.length}: ${file.name}`);
          
          // Compress images if needed
          let fileToUpload = file
          if (isImageFile(file) && file.size > 2 * 1024 * 1024) { // 2MB threshold
            console.log('🗜️ Compressing image...');
            fileToUpload = await compressImage(file, 0.8)
            console.log('✅ Image compressed:', {
              originalSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
              compressedSize: `${(fileToUpload.size / 1024 / 1024).toFixed(2)}MB`
            });
          }

          const fileName = `${generateUniqueId()}-${file.name}`
          const storageRef = ref(storage, `properties/${type}s/${fileName}`)

          console.log(`📎 Starting upload for ${fileName}`);
          console.log(`📍 Storage path: ${storageRef.fullPath}`);
          
          // Try primary method: uploadBytesResumable
          try {
            console.log(`🚀 Trying primary upload method for ${fileName}`);
            
            return await new Promise<UploadedFile>((resolve, reject) => {
              const uploadTask = uploadBytesResumable(storageRef, fileToUpload);
              
              // Set a timeout to prevent hanging
              const uploadTimeout = setTimeout(() => {
                console.warn('⏱️ Primary upload timeout, trying fallback...');
                uploadTask.cancel();
                reject(new Error('PRIMARY_TIMEOUT'));
              }, 30000); // 30 seconds timeout for primary method
              
              uploadTask.on('state_changed',
                // Progress callback
                (snapshot) => {
                  const fileProgress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                  const overallProgress = ((index * 100) + fileProgress) / files.length;
                  setProgress(overallProgress);
                  
                  console.log(`📊 Primary upload progress for ${file.name}: ${fileProgress.toFixed(1)}%`);
                },
                // Error callback
                (error) => {
                  clearTimeout(uploadTimeout);
                  console.warn(`⚠️ Primary upload failed for ${file.name}:`, error?.code);
                  reject(new Error('PRIMARY_FAILED'));
                },
                // Success callback
                async () => {
                  clearTimeout(uploadTimeout);
                  console.log(`✅ Primary upload completed for ${file.name}`);
                  
                  try {
                    const url = await getDownloadURL(uploadTask.snapshot.ref);
                    resolve({
                      name: file.name,
                      url,
                      size: file.size,
                    });
                  } catch (urlError) {
                    console.error(`❌ Error getting download URL:`, urlError);
                    reject(new Error('PRIMARY_FAILED'));
                  }
                }
              );
            });
          } catch (primaryError) {
            console.warn(`⚠️ Primary upload failed for ${file.name}, trying data URL fallback...`);
            
            // Try fallback method: uploadString with data URL
            try {
              const result = await uploadWithDataUrl(fileToUpload, type);
              
              // Update progress for fallback
              const overallProgress = ((index + 1) * 100) / files.length;
              setProgress(overallProgress);
              
              return result;
            } catch (fallbackError) {
              console.error(`❌ All upload methods failed for ${file.name}`);
              throw new Error(`Erro ao enviar ${file.name}. Tente novamente.`);
            }
          }
        } catch (err) {
          console.error(`❌ Error preparing upload for ${file.name}:`, err);
          throw new Error(`Erro ao preparar upload de ${file.name}: ${err instanceof Error ? err.message : 'Erro desconhecido'}`)
        }
      })

      console.log('⏳ Waiting for all uploads to complete...');
      
      try {
        const results = await Promise.all(uploadPromises)
        console.log('🎉 All uploads completed successfully!', results);
        return results
      } catch (batchError) {
        console.error('❌ Batch upload failed, trying API fallback for all files...');
        
        // Last resort: API upload for all files
        try {
          const apiResults = await uploadViaAPI(files, type);
          console.log('🎉 API fallback upload completed successfully!', apiResults);
          return apiResults;
        } catch (apiError) {
          console.error('❌ All upload methods failed:', apiError);
          throw new Error('Falha em todos os métodos de upload. Verifique sua conexão.');
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro no upload'
      console.error('❌ Upload failed:', errorMessage);
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