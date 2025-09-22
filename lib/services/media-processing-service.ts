/**
 * Media Processing Service
 * Handles downloading external media URLs and uploading to Firebase Storage
 */

import { storage } from '@/lib/firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import sharp from 'sharp';
import { logger } from '@/lib/utils/logger';

export interface MediaProcessingResult {
  originalUrl: string;
  newUrl?: string;
  success: boolean;
  error?: string;
  type: 'photo' | 'video';
  size?: number;
  thumbnailUrl?: string;
}

export interface MediaProcessingOptions {
  createThumbnails: boolean;
  validateUrls: boolean;
  maxFileSize: number; // in MB
  tenantId: string;
  timeout: number; // in ms
}

export class MediaProcessingService {
  private readonly defaultOptions: MediaProcessingOptions = {
    createThumbnails: true,
    validateUrls: true,
    maxFileSize: 50, // 50MB max
    tenantId: '',
    timeout: 30000, // 30 seconds
  };

  constructor(private options: Partial<MediaProcessingOptions> = {}) {
    this.options = { ...this.defaultOptions, ...options };
  }

  /**
   * Process multiple media URLs in parallel
   */
  async processMediaUrls(
    urls: string[],
    type: 'photo' | 'video',
    propertyId: string
  ): Promise<MediaProcessingResult[]> {
    if (!urls.length) return [];

    logger.info('🖼️ [MediaProcessing] Starting batch processing', {
      urls: urls.length,
      type,
      propertyId,
      tenantId: this.options.tenantId
    });

    const results = await Promise.allSettled(
      urls.map((url, index) => this.processMediaUrl(url, type, propertyId, index))
    );

    const processedResults: MediaProcessingResult[] = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        logger.error('❌ [MediaProcessing] Failed to process media', {
          url: urls[index],
          error: result.reason,
          tenantId: this.options.tenantId
        });
        return {
          originalUrl: urls[index],
          success: false,
          error: result.reason?.message || 'Unknown error',
          type
        };
      }
    });

    const successCount = processedResults.filter(r => r.success).length;
    logger.info('✅ [MediaProcessing] Batch processing completed', {
      total: urls.length,
      success: successCount,
      failed: urls.length - successCount,
      tenantId: this.options.tenantId
    });

    return processedResults;
  }

  /**
   * Process a single media URL
   */
  private async processMediaUrl(
    url: string,
    type: 'photo' | 'video',
    propertyId: string,
    index: number
  ): Promise<MediaProcessingResult> {
    try {
      logger.debug('🔄 [MediaProcessing] Processing media URL', {
        url: url.substring(0, 100) + '...',
        type,
        index,
        tenantId: this.options.tenantId
      });

      // Validate URL if enabled
      if (this.options.validateUrls && !this.isValidUrl(url)) {
        throw new Error('Invalid URL format');
      }

      // Download the file
      const downloadResult = await this.downloadFile(url);

      // Validate file size
      if (downloadResult.size > this.options.maxFileSize * 1024 * 1024) {
        throw new Error(`File too large: ${(downloadResult.size / 1024 / 1024).toFixed(2)}MB`);
      }

      // Generate filename
      const extension = this.getFileExtension(url) || (type === 'photo' ? 'jpg' : 'mp4');
      const filename = `${propertyId}_${type}_${index + 1}_${Date.now()}.${extension}`;

      // Upload to Firebase Storage
      const storagePath = `tenants/${this.options.tenantId}/properties/${propertyId}/${type}s/${filename}`;
      const storageRef = ref(storage, storagePath);

      await uploadBytes(storageRef, downloadResult.buffer);
      const newUrl = await getDownloadURL(storageRef);

      let thumbnailUrl: string | undefined;

      // Create thumbnail for photos if enabled
      if (type === 'photo' && this.options.createThumbnails) {
        try {
          thumbnailUrl = await this.createThumbnail(downloadResult.buffer, filename, propertyId);
        } catch (error) {
          logger.warn('⚠️ [MediaProcessing] Failed to create thumbnail', {
            filename,
            error: error instanceof Error ? error.message : 'Unknown error',
            tenantId: this.options.tenantId
          });
        }
      }

      logger.debug('✅ [MediaProcessing] Media processed successfully', {
        originalUrl: url.substring(0, 100) + '...',
        newUrl: newUrl.substring(0, 100) + '...',
        size: downloadResult.size,
        tenantId: this.options.tenantId
      });

      return {
        originalUrl: url,
        newUrl,
        success: true,
        type,
        size: downloadResult.size,
        thumbnailUrl
      };
    } catch (error) {
      logger.error('❌ [MediaProcessing] Failed to process media URL', {
        url: url.substring(0, 100) + '...',
        error: error instanceof Error ? error.message : 'Unknown error',
        tenantId: this.options.tenantId
      });

      return {
        originalUrl: url,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        type
      };
    }
  }

  /**
   * Download file from URL with timeout
   */
  private async downloadFile(url: string): Promise<{ buffer: Buffer; size: number }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.options.timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'LocAI Property Import Bot/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      return { buffer, size: buffer.length };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Create thumbnail for photos
   */
  private async createThumbnail(
    imageBuffer: Buffer,
    originalFilename: string,
    propertyId: string
  ): Promise<string> {
    // Create thumbnail with Sharp
    const thumbnailBuffer = await sharp(imageBuffer)
      .resize(300, 200, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 80 })
      .toBuffer();

    // Upload thumbnail
    const thumbnailFilename = `thumb_${originalFilename.replace(/\.[^/.]+$/, '.jpg')}`;
    const thumbnailPath = `tenants/${this.options.tenantId}/properties/${propertyId}/thumbnails/${thumbnailFilename}`;
    const thumbnailRef = ref(storage, thumbnailPath);

    await uploadBytes(thumbnailRef, thumbnailBuffer);
    return await getDownloadURL(thumbnailRef);
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  }

  /**
   * Extract file extension from URL
   */
  private getFileExtension(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const match = pathname.match(/\.([^.]+)$/);
      return match ? match[1].toLowerCase() : null;
    } catch {
      return null;
    }
  }

  /**
   * Validate if URL points to a valid image/video
   */
  async validateMediaUrl(url: string, type: 'photo' | 'video'): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const response = await fetch(url, {
          method: 'HEAD',
          signal: controller.signal
        });

        if (!response.ok) return false;

        const contentType = response.headers.get('content-type') || '';

        if (type === 'photo') {
          return contentType.startsWith('image/');
        } else {
          return contentType.startsWith('video/');
        }
      } finally {
        clearTimeout(timeoutId);
      }
    } catch {
      return false;
    }
  }

  /**
   * Clean up failed uploads (helper method)
   */
  async cleanupFailedUploads(results: MediaProcessingResult[]): Promise<void> {
    const failedUploads = results.filter(r => r.success && r.newUrl);

    if (failedUploads.length === 0) return;

    logger.info('🧹 [MediaProcessing] Cleaning up failed uploads', {
      count: failedUploads.length,
      tenantId: this.options.tenantId
    });

    // Note: Firebase Storage cleanup would require admin SDK
    // For now, we just log the URLs that should be cleaned up
    for (const upload of failedUploads) {
      logger.warn('🗑️ [MediaProcessing] File should be cleaned up', {
        url: upload.newUrl,
        tenantId: this.options.tenantId
      });
    }
  }
}

export default MediaProcessingService;