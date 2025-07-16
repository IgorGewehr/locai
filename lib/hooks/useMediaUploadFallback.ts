// lib/hooks/useMediaUploadFallback.ts
import { useState, useCallback } from 'react'
import { ref, uploadString, getDownloadURL } from 'firebase/storage'
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

/**
 * Alternative upload hook using base64/data URL
 * More reliable but uses more memory
 */
export function useMediaUploadFallback(): UseMediaUploadReturn {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

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
      // Check authentication
      if (!auth.currentUser) {
        throw new Error('Você precisa estar autenticado para fazer upload')
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

      const uploadPromises = files.map(async (file, index) => {
        try {
          // Compress images if needed
          let fileToUpload = file
          if (isImageFile(file) && file.size > 2 * 1024 * 1024) {
            console.log(`🗜️ Compressing ${file.name}...`)
            fileToUpload = await compressImage(file, 0.8)
          }

          // Convert to data URL
          console.log(`📄 Converting ${file.name} to data URL...`)
          const dataUrl = await fileToDataUrl(fileToUpload)
          
          const fileName = `${generateUniqueId()}-${file.name}`
          const storageRef = ref(storage, `properties/${type}s/${fileName}`)

          // Upload using uploadString (more reliable than uploadBytes)
          console.log(`☁️ Uploading ${fileName} using base64...`)
          const snapshot = await uploadString(storageRef, dataUrl, 'data_url')
          
          // Get download URL
          const url = await getDownloadURL(snapshot.ref)
          console.log(`✅ Upload successful for ${fileName}`)
          
          // Update progress
          const overallProgress = ((index + 1) * 100) / files.length
          setProgress(overallProgress)
          
          return {
            name: file.name,
            url,
            size: file.size,
          }
        } catch (err) {
          console.error(`❌ Error uploading ${file.name}:`, err)
          throw new Error(`Erro ao enviar ${file.name}: ${err instanceof Error ? err.message : 'Erro desconhecido'}`)
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