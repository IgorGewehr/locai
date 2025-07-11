import {
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  listAll,
  getMetadata,
  updateMetadata,
} from 'firebase/storage';
import { storage } from './config';

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  percentage: number;
}

export interface UploadResult {
  url: string;
  path: string;
  size: number;
  contentType: string;
}

export class StorageService {
  private basePath: string;

  constructor(basePath: string = '') {
    this.basePath = basePath;
  }

  private getPath(fileName: string): string {
    return this.basePath ? `${this.basePath}/${fileName}` : fileName;
  }

  private generateFileName(originalName: string): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const extension = originalName.split('.').pop();
    return `${timestamp}_${randomString}.${extension}`;
  }

  async uploadFile(
    file: File,
    fileName?: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    const name = fileName || this.generateFileName(file.name);
    const path = this.getPath(name);
    const storageRef = ref(storage, path);

    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = {
            bytesTransferred: snapshot.bytesTransferred,
            totalBytes: snapshot.totalBytes,
            percentage: (snapshot.bytesTransferred / snapshot.totalBytes) * 100,
          };
          onProgress?.(progress);
        },
        (error) => {
          reject(error);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            const metadata = await getMetadata(uploadTask.snapshot.ref);

            resolve({
              url: downloadURL,
              path: path,
              size: metadata.size,
              contentType: metadata.contentType || file.type,
            });
          } catch (error) {
            reject(error);
          }
        }
      );
    });
  }

  async uploadMultipleFiles(
    files: File[],
    onProgress?: (fileIndex: number, progress: UploadProgress) => void
  ): Promise<UploadResult[]> {
    const uploadPromises = files.map((file, index) =>
      this.uploadFile(
        file,
        undefined,
        (progress) => onProgress?.(index, progress)
      )
    );

    return Promise.all(uploadPromises);
  }

  async deleteFile(path: string): Promise<void> {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  }

  async deleteMultipleFiles(paths: string[]): Promise<void> {
    const deletePromises = paths.map(path => this.deleteFile(path));
    await Promise.all(deletePromises);
  }

  async getFileUrl(path: string): Promise<string> {
    const storageRef = ref(storage, path);
    return getDownloadURL(storageRef);
  }

  async listFiles(folderPath?: string): Promise<string[]> {
    const path = folderPath || this.basePath;
    const listRef = ref(storage, path);
    const result = await listAll(listRef);

    return result.items.map(item => item.fullPath);
  }

  async getFileMetadata(path: string) {
    const storageRef = ref(storage, path);
    return getMetadata(storageRef);
  }

  async updateFileMetadata(path: string, metadata: Record<string, string>): Promise<void> {
    const storageRef = ref(storage, path);
    await updateMetadata(storageRef, { customMetadata: metadata });
  }
}

// Specialized storage services
export const propertyImageService = new StorageService('properties/images');
export const propertyVideoService = new StorageService('properties/videos');
export const clientDocumentService = new StorageService('clients/documents');
export const chatMediaService = new StorageService('chat/media');

// Utility functions
export const extractPathFromUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    const pathMatch = urlObj.pathname.match(/\/o\/(.+?)\?/);
    return pathMatch ? decodeURIComponent(pathMatch[1]) : '';
  } catch (error) {

    return '';
  }
};

export const validateImageFile = (file: File): boolean => {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const maxSize = 10 * 1024 * 1024; // 10MB

  return validTypes.includes(file.type) && file.size <= maxSize;
};

export const validateVideoFile = (file: File): boolean => {
  const validTypes = ['video/mp4', 'video/webm', 'video/ogg'];
  const maxSize = 100 * 1024 * 1024; // 100MB

  return validTypes.includes(file.type) && file.size <= maxSize;
};

export const compressImage = async (file: File, maxWidth: number = 1920, quality: number = 0.8): Promise<File> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;

      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (blob) {
          const compressedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        } else {
          resolve(file);
        }
      }, 'image/jpeg', quality);
    };

    img.src = URL.createObjectURL(file);
  });
};

export const generateThumbnail = async (videoFile: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    video.onloadedmetadata = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      video.currentTime = 1; // Capture frame at 1 second
    };

    video.onseeked = () => {
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const thumbnailFile = new File([blob], `${videoFile.name}_thumbnail.jpg`, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(thumbnailFile);
          } else {
            reject(new Error('Failed to generate thumbnail'));
          }
        }, 'image/jpeg', 0.8);
      }
    };

    video.onerror = () => reject(new Error('Error loading video'));
    video.src = URL.createObjectURL(videoFile);
  });
};