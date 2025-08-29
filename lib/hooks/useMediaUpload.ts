// lib/hooks/useMediaUpload.ts
// Production-ready unified media upload hook

import { useState, useCallback, useRef } from 'react';
import { ref, uploadBytesResumable, getDownloadURL, uploadBytes } from 'firebase/storage';
import { storage } from '@/lib/firebase/config';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/utils/logger';
import { 
  validateFileType, 
  validateFileSize, 
  generateUniqueId,
  compressImage,
  isImageFile 
} from '@/lib/utils/mediaUtils';

// Types
export interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  url?: string;
  error?: string;
}

export interface UploadedFile {
  name: string;
  url: string;
  size: number;
}

export interface UseMediaUploadConfig {
  maxFiles?: number;
  maxSizeInMB?: number;
  allowedTypes?: string[];
  autoCompress?: boolean;
  compressionQuality?: number;
}

export interface UseMediaUploadReturn {
  uploadFiles: (files: File[], type: 'image' | 'video') => Promise<UploadedFile[]>;
  uploading: boolean;
  progress: Record<string, UploadProgress>;
  error: string | null;
  totalProgress: number;
  clearError: () => void;
  cancelUploads: () => void;
}

// Default configurations
const DEFAULT_CONFIG: Required<UseMediaUploadConfig> = {
  maxFiles: 20,
  maxSizeInMB: 10,
  allowedTypes: ['image/', 'video/'],
  autoCompress: true,
  compressionQuality: 0.8
};

export function useMediaUpload(config: UseMediaUploadConfig = {}): UseMediaUploadReturn {
  const { tenantId } = useTenant();
  const { getFirebaseToken } = useAuth();
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  // State
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<Record<string, UploadProgress>>({});
  const [error, setError] = useState<string | null>(null);
  
  // Refs for cancellation
  const uploadTasksRef = useRef<Map<string, any>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);

  // Calculated total progress
  const totalProgress = Object.keys(progress).length > 0 
    ? Object.values(progress).reduce((sum, p) => sum + p.progress, 0) / Object.keys(progress).length
    : 0;

  // Clear error state
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Cancel all uploads
  const cancelUploads = useCallback(() => {
    logger.info('Cancelling all uploads', { activeUploads: uploadTasksRef.current.size });
    
    // Cancel Firebase upload tasks
    uploadTasksRef.current.forEach((task, fileName) => {
      try {
        task.cancel();
        setProgress(prev => ({
          ...prev,
          [fileName]: {
            ...prev[fileName],
            status: 'error',
            error: 'Upload cancelled'
          }
        }));
      } catch (error) {
        logger.warn('Failed to cancel upload task', { fileName, error });
      }
    });
    
    // Cancel API requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    uploadTasksRef.current.clear();
    setUploading(false);
  }, []);

  // Validate tenant ID
  const validateTenant = useCallback(() => {
    if (!tenantId) {
      throw new Error('Tenant ID é obrigatório para upload de mídia');
    }
  }, [tenantId]);

  // Validate files
  const validateFiles = useCallback((files: File[], type: 'image' | 'video') => {
    const maxSize = type === 'image' ? finalConfig.maxSizeInMB : finalConfig.maxSizeInMB * 5; // 50MB for videos
    const allowedTypes = type === 'image' ? ['image/'] : ['video/'];

    for (const file of files) {
      if (!validateFileType(file, allowedTypes)) {
        throw new Error(`Tipo de arquivo não suportado: ${file.name}`);
      }
      if (!validateFileSize(file, maxSize)) {
        throw new Error(`Arquivo muito grande: ${file.name} (máximo ${maxSize}MB)`);
      }
    }
  }, [finalConfig]);

  // Prepare file for upload (compression, etc.)
  const prepareFile = useCallback(async (file: File, type: 'image' | 'video'): Promise<File> => {
    if (type === 'image' && finalConfig.autoCompress && file.size > 2 * 1024 * 1024) { // 2MB threshold
      logger.info('Compressing image', { fileName: file.name, originalSize: file.size });
      return await compressImage(file, finalConfig.compressionQuality);
    }
    return file;
  }, [finalConfig]);

  // Upload single file to Firebase Storage
  const uploadSingleFile = useCallback(async (
    file: File, 
    type: 'image' | 'video',
    onProgress: (progress: number) => void
  ): Promise<UploadedFile> => {
    const fileName = `${generateUniqueId()}-${file.name}`;
    const storagePath = `tenants/${tenantId}/properties/${type}s/${fileName}`;
    const storageRef = ref(storage, storagePath);

    logger.info('Starting file upload', {
      fileName: file.name,
      storagePath,
      fileSize: file.size,
      fileType: file.type
    });

    // Try resumable upload first
    try {
      return await new Promise<UploadedFile>((resolve, reject) => {
        const uploadTask = uploadBytesResumable(storageRef, file);
        
        // Store task for cancellation
        uploadTasksRef.current.set(file.name, uploadTask);

        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progressPercent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            onProgress(progressPercent);
          },
          (error) => {
            logger.error('Resumable upload failed', { 
              fileName: file.name, 
              error: error.message,
              errorCode: error.code 
            });
            uploadTasksRef.current.delete(file.name);
            reject(new Error(`Upload failed: ${error.message}`));
          },
          async () => {
            try {
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              uploadTasksRef.current.delete(file.name);
              
              logger.info('Upload completed successfully', {
                fileName: file.name,
                url: url.substring(0, 50) + '...'
              });

              resolve({
                name: file.name,
                url,
                size: file.size
              });
            } catch (urlError) {
              logger.error('Failed to get download URL', { fileName: file.name, urlError });
              reject(new Error('Failed to get download URL'));
            }
          }
        );
      });
    } catch (resumableError) {
      logger.warn('Resumable upload failed, trying simple upload', { 
        fileName: file.name, 
        error: resumableError 
      });

      // Fallback to simple upload
      try {
        const snapshot = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(snapshot.ref);
        onProgress(100);

        logger.info('Simple upload successful', {
          fileName: file.name,
          url: url.substring(0, 50) + '...'
        });

        return {
          name: file.name,
          url,
          size: file.size
        };
      } catch (simpleError) {
        logger.error('Simple upload also failed', { fileName: file.name, simpleError });
        throw new Error(`All upload methods failed for ${file.name}`);
      }
    }
  }, [tenantId]);

  // Fallback to API upload
  const uploadViaAPI = useCallback(async (files: File[], type: 'image' | 'video'): Promise<UploadedFile[]> => {
    logger.info('Using API fallback upload', { fileCount: files.length, type });

    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    formData.append('type', type);

    abortControllerRef.current = new AbortController();

    const token = await getFirebaseToken();
    if (!token) {
      throw new Error('Token de autenticação não disponível');
    }

    const response = await fetch('/api/upload/media', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
      signal: abortControllerRef.current.signal
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `API upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    logger.info('API upload successful', { fileCount: result.files.length });
    
    return result.files;
  }, []);

  // Main upload function
  const uploadFiles = useCallback(async (
    files: File[], 
    type: 'image' | 'video'
  ): Promise<UploadedFile[]> => {
    try {
      validateTenant();
      validateFiles(files, type);
      
      if (!files.length) return [];

      setUploading(true);
      setError(null);
      setProgress({});

      logger.info('Starting batch upload', {
        fileCount: files.length,
        type,
        tenantId,
        fileNames: files.map(f => f.name)
      });

      // Initialize progress for all files
      files.forEach(file => {
        setProgress(prev => ({
          ...prev,
          [file.name]: {
            fileName: file.name,
            progress: 0,
            status: 'uploading'
          }
        }));
      });

      // Process files in parallel
      const uploadPromises = files.map(async (file) => {
        try {
          const preparedFile = await prepareFile(file, type);
          
          const result = await uploadSingleFile(
            preparedFile,
            type,
            (progressPercent) => {
              setProgress(prev => ({
                ...prev,
                [file.name]: {
                  ...prev[file.name],
                  progress: progressPercent,
                  status: progressPercent === 100 ? 'completed' : 'uploading'
                }
              }));
            }
          );

          setProgress(prev => ({
            ...prev,
            [file.name]: {
              ...prev[file.name],
              status: 'completed',
              url: result.url
            }
          }));

          return result;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Upload failed';
          
          setProgress(prev => ({
            ...prev,
            [file.name]: {
              ...prev[file.name],
              status: 'error',
              error: errorMessage
            }
          }));

          logger.error('File upload failed', { 
            fileName: file.name, 
            error: errorMessage 
          });

          throw error;
        }
      });

      try {
        const results = await Promise.all(uploadPromises);
        
        logger.info('All uploads completed successfully', {
          totalFiles: results.length,
          successfulUploads: results.length
        });

        return results;
      } catch (batchError) {
        logger.warn('Some uploads failed, trying API fallback', { 
          batchError: batchError instanceof Error ? batchError.message : 'Unknown error' 
        });

        // Try API fallback for failed files
        const failedFiles = files.filter(file => {
          const fileProgress = progress[file.name];
          return !fileProgress || fileProgress.status === 'error';
        });

        if (failedFiles.length > 0) {
          logger.info('Retrying failed files via API', { failedCount: failedFiles.length });
          
          try {
            const apiResults = await uploadViaAPI(failedFiles, type);
            
            // Update progress for API uploaded files
            apiResults.forEach(result => {
              setProgress(prev => ({
                ...prev,
                [result.name]: {
                  fileName: result.name,
                  progress: 100,
                  status: 'completed',
                  url: result.url
                }
              }));
            });

            // Combine successful direct uploads with API uploads
            const successfulDirectUploads = files
              .filter(file => progress[file.name]?.status === 'completed')
              .map(file => ({
                name: file.name,
                url: progress[file.name].url!,
                size: file.size
              }));

            return [...successfulDirectUploads, ...apiResults];
          } catch (apiError) {
            logger.error('API fallback also failed', { apiError });
            throw new Error('All upload methods failed. Please check your connection and try again.');
          }
        }

        throw batchError;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown upload error';
      setError(errorMessage);
      logger.error('Upload batch failed completely', { error: errorMessage });
      throw err;
    } finally {
      setUploading(false);
      uploadTasksRef.current.clear();
      abortControllerRef.current = null;
    }
  }, [validateTenant, validateFiles, prepareFile, uploadSingleFile, uploadViaAPI, progress]);

  return {
    uploadFiles,
    uploading,
    progress,
    error,
    totalProgress,
    clearError,
    cancelUploads
  };
}