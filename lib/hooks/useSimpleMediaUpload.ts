// lib/hooks/useSimpleMediaUpload.ts
// Hook simplificado baseado no padrão funcional do projeto Dart

import { useState, useCallback } from 'react';
import { storage } from '@/lib/firebase/config';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { logger } from '@/lib/utils/logger';
import { useTenant } from '@/contexts/TenantContext';

interface UploadProgress {
  fileName: string;
  progress: number;
  url?: string;
  error?: string;
}

interface UseSimpleMediaUploadReturn {
  uploadFiles: (files: File[]) => Promise<string[]>;
  uploading: boolean;
  progress: Record<string, UploadProgress>;
  error: string | null;
  reset: () => void;
}

/**
 * Hook simplificado para upload de mídia inspirado no projeto Dart
 * - Upload direto para Firebase Storage
 * - Retorna array simples de URLs (como List<String> no Dart)
 * - Sem metadados complexos, apenas URLs funcionais
 */
export function useSimpleMediaUpload(): UseSimpleMediaUploadReturn {
  const { tenantId } = useTenant();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<Record<string, UploadProgress>>({});
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setUploading(false);
    setProgress({});
    setError(null);
  }, []);

  /**
   * Faz upload de múltiplos arquivos e retorna array de URLs
   * Inspirado no método _uploadFile do projeto Dart
   */
  const uploadFiles = useCallback(async (files: File[]): Promise<string[]> => {
    if (!tenantId) {
      throw new Error('Tenant ID é obrigatório para upload');
    }

    if (!files.length) {
      return [];
    }

    setUploading(true);
    setError(null);
    
    const urls: string[] = [];
    const uploadPromises: Promise<string | null>[] = [];

    // Processa todos os uploads em paralelo (como no Dart)
    for (const file of files) {
      const fileName = file.name;
      
      // Inicializa progress para este arquivo
      setProgress(prev => ({
        ...prev,
        [fileName]: {
          fileName,
          progress: 0
        }
      }));

      // Cria promise para upload individual
      const uploadPromise = new Promise<string | null>(async (resolve) => {
        try {
          // Gera caminho similar ao Dart: tenants/{tenantId}/properties/images/{fileName}
          const timestamp = Date.now();
          const fileExtension = file.name.split('.').pop();
          const safeFileName = `${timestamp}-${Math.random().toString(36).substring(2)}.${fileExtension}`;
          
          const storagePath = `tenants/${tenantId}/properties/images/${safeFileName}`;
          const storageRef = ref(storage, storagePath);

          // Upload com progresso
          const uploadTask = uploadBytesResumable(storageRef, file);
          
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const progressPercent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              
              setProgress(prev => ({
                ...prev,
                [fileName]: {
                  ...prev[fileName],
                  progress: progressPercent
                }
              }));
            },
            (error) => {
              logger.error('Erro no upload', {
                tenantId,
                fileName,
                error: error.message
              });
              
              setProgress(prev => ({
                ...prev,
                [fileName]: {
                  ...prev[fileName],
                  error: error.message
                }
              }));
              
              resolve(null);
            },
            async () => {
              try {
                // Upload concluído - obter URL
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                
                setProgress(prev => ({
                  ...prev,
                  [fileName]: {
                    ...prev[fileName],
                    progress: 100,
                    url: downloadURL
                  }
                }));
                
                logger.info('Upload concluído', {
                  tenantId,
                  fileName,
                  url: downloadURL
                });
                
                resolve(downloadURL);
              } catch (error) {
                logger.error('Erro ao obter URL de download', {
                  tenantId,
                  fileName,
                  error: error instanceof Error ? error.message : 'Unknown error'
                });
                resolve(null);
              }
            }
          );
        } catch (error) {
          logger.error('Erro ao iniciar upload', {
            tenantId,
            fileName,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          resolve(null);
        }
      });

      uploadPromises.push(uploadPromise);
    }

    try {
      // Aguarda todos os uploads (paralelo como no Dart)
      const results = await Promise.all(uploadPromises);
      
      // Filtra apenas URLs válidas (como no projeto Dart)
      const validUrls = results.filter((url): url is string => url !== null);
      
      logger.info('Todos os uploads concluídos', {
        tenantId,
        totalFiles: files.length,
        successfulUploads: validUrls.length,
        urls: validUrls
      });
      
      return validUrls;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido no upload';
      setError(errorMessage);
      
      logger.error('Erro nos uploads', {
        tenantId,
        error: errorMessage
      });
      
      throw error;
    } finally {
      setUploading(false);
    }
  }, [tenantId]);

  return {
    uploadFiles,
    uploading,
    progress,
    error,
    reset
  };
}

/**
 * Utilitário para filtrar arquivos por tipo (como no Dart)
 */
export function filterFilesByType(files: FileList | File[]): {
  images: File[];
  videos: File[];
} {
  const fileArray = Array.from(files);
  
  const images: File[] = [];
  const videos: File[] = [];
  
  fileArray.forEach(file => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) {
      images.push(file);
    } else if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(extension || '')) {
      videos.push(file);
    }
  });
  
  return { images, videos };
}