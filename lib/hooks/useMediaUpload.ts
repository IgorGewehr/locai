// lib/hooks/useMediaUpload.ts
import { useState, useCallback } from 'react'
import { ref, uploadBytesResumable, getDownloadURL, UploadTask } from 'firebase/storage'
import { storage } from '@/lib/firebase/config'
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
      // Validate files
      for (const file of files) {
        if (!validateFileType(file, allowedTypes)) {
          throw new Error(`Tipo de arquivo não suportado: ${file.name}`)
        }
        if (!validateFileSize(file, maxSizeInMB)) {
          throw new Error(`Arquivo muito grande: ${file.name} (máximo ${maxSizeInMB}MB)`)
        }
      }

      const uploadPromises = files.map(async (file, index) => {
        try {
          // Compress images if needed
          let fileToUpload = file
          if (isImageFile(file) && file.size > 2 * 1024 * 1024) { // 2MB threshold
            fileToUpload = await compressImage(file, 0.8)
          }

          const fileName = `${generateUniqueId()}-${file.name}`
          const storageRef = ref(storage, `properties/${type}s/${fileName}`)

          // Use uploadBytesResumable for progress tracking
          const uploadTask = uploadBytesResumable(storageRef, fileToUpload)
          
          return new Promise<UploadedFile>((resolve, reject) => {
            uploadTask.on(
              'state_changed',
              (snapshot) => {
                // Calculate progress for this file
                const fileProgress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
                // Calculate overall progress across all files
                const overallProgress = ((index * 100) + fileProgress) / files.length
                setProgress(overallProgress)
              },
              (error) => {
                reject(new Error(`Erro ao enviar ${file.name}: ${error.message}`))
              },
              async () => {
                try {
                  const url = await getDownloadURL(uploadTask.snapshot.ref)
                  resolve({
                    name: file.name,
                    url,
                    size: file.size,
                  })
                } catch (err) {
                  reject(new Error(`Erro ao obter URL de ${file.name}: ${err instanceof Error ? err.message : 'Erro desconhecido'}`))
                }
              }
            )
          })
        } catch (err) {
          throw new Error(`Erro ao preparar upload de ${file.name}: ${err instanceof Error ? err.message : 'Erro desconhecido'}`)
        }
      })

      const results = await Promise.all(uploadPromises)
      return results
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