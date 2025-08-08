// lib/utils/mediaUtils.ts
import { PropertyPhoto, PropertyVideo } from '@/lib/types/property'

export interface MediaUploadResult {
  success: boolean
  url?: string
  error?: string
}

export function validateFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.some(type => file.type.startsWith(type))
}

export function validateFileSize(file: File, maxSizeInMB: number): boolean {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024
  return file.size <= maxSizeInBytes
}

export function generateUniqueId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export function createPhotoFromFile(file: File, url: string, order: number, isMain: boolean = false): PropertyPhoto {
  return {
    id: generateUniqueId(),
    url,
    filename: file.name,
    order,
    isMain,
    caption: '',
  }
}

export function createVideoFromFile(file: File, url: string, order: number): PropertyVideo {
  return {
    id: generateUniqueId(),
    url,
    filename: file.name,
    title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
    order,
    duration: 0,
    thumbnail: '',
  }
}

export function reorderMedia<T extends { id: string; order: number }>(
  items: T[],
  sourceIndex: number,
  destinationIndex: number
): T[] {
  const reordered = Array.from(items)
  const [removed] = reordered.splice(sourceIndex, 1)
  reordered.splice(destinationIndex, 0, removed)

  return reordered.map((item, index) => ({
    ...item,
    order: index,
  }))
}

export function findMainPhoto(photos: PropertyPhoto[]): PropertyPhoto | null {
  return photos.find(photo => photo.isMain) || photos[0] || null
}

export function setMainPhoto(photos: PropertyPhoto[], photoId: string): PropertyPhoto[] {
  return photos.map(photo => ({
    ...photo,
    isMain: photo.id === photoId,
  }))
}

export function removeMedia<T extends { id: string }>(
  items: T[],
  itemId: string
): T[] {
  return items.filter(item => item.id !== itemId)
}

export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || ''
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/')
}

export function isVideoFile(file: File): boolean {
  return file.type.startsWith('video/')
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function createImageThumbnail(file: File, maxWidth: number = 300): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    
    img.onload = () => {
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height)
      canvas.width = img.width * ratio
      canvas.height = img.height * ratio
      
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.8))
    }
    
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

export function createVideoThumbnail(file: File, timeInSeconds: number = 1): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(timeInSeconds, video.duration)
    }
    
    video.onseeked = () => {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx?.drawImage(video, 0, 0)
      resolve(canvas.toDataURL('image/jpeg', 0.8))
    }
    
    video.onerror = reject
    video.src = URL.createObjectURL(file)
  })
}

export function compressImage(file: File, quality: number = 0.8): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx?.drawImage(img, 0, 0)
      
      canvas.toBlob((blob) => {
        if (blob) {
          const compressedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          })
          resolve(compressedFile)
        } else {
          reject(new Error('Failed to compress image'))
        }
      }, 'image/jpeg', quality)
    }
    
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

export function getMediaMimeType(filename: string): string {
  const ext = getFileExtension(filename)
  
  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    mp4: 'video/mp4',
    webm: 'video/webm',
    ogg: 'video/ogg',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
  }
  
  return mimeTypes[ext] || 'application/octet-stream'
}

export function sortMediaByOrder<T extends { order: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.order - b.order)
}