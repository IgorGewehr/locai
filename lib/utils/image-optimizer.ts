/**
 * Image Optimizer for Mini-Site
 * Generates optimized URLs and handles responsive images
 */

import { logger } from '@/lib/utils/logger';

interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'auto';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
}

/**
 * Generate optimized image URL based on provider
 */
export function getOptimizedImageUrl(
  originalUrl: string,
  options: ImageOptimizationOptions = {}
): string {
  // Skip optimization for blob URLs (local previews)
  if (originalUrl.startsWith('blob:')) {
    return originalUrl;
  }

  // Firebase Storage URLs
  if (originalUrl.includes('firebasestorage.googleapis.com')) {
    return getFirebaseOptimizedUrl(originalUrl, options);
  }

  // Cloudinary URLs (if using Cloudinary)
  if (originalUrl.includes('cloudinary.com')) {
    return getCloudinaryOptimizedUrl(originalUrl, options);
  }

  // Default: return original URL
  return originalUrl;
}

/**
 * Firebase Storage optimization using resize parameters
 */
function getFirebaseOptimizedUrl(
  url: string,
  options: ImageOptimizationOptions
): string {
  try {
    const urlObj = new URL(url);
    
    // Add image transformation parameters
    const params = new URLSearchParams(urlObj.search);
    
    // Firebase Storage doesn't support direct transformations
    // but we can request different sizes if we store them
    if (options.width) {
      // For now, return original URL
      // In production, you'd want to use Firebase Extensions
      // or Cloud Functions to generate different sizes
      return url;
    }
    
    return url;
  } catch (error) {
    logger.error('❌ [ImageOptimizer] Firebase URL error', { error });
    return url;
  }
}

/**
 * Cloudinary optimization
 */
function getCloudinaryOptimizedUrl(
  url: string,
  options: ImageOptimizationOptions
): string {
  try {
    // Parse Cloudinary URL
    const parts = url.split('/upload/');
    if (parts.length !== 2) return url;
    
    const transformations = [];
    
    if (options.width) {
      transformations.push(`w_${options.width}`);
    }
    if (options.height) {
      transformations.push(`h_${options.height}`);
    }
    if (options.quality) {
      transformations.push(`q_${options.quality}`);
    }
    if (options.format) {
      transformations.push(`f_${options.format}`);
    }
    if (options.fit) {
      transformations.push(`c_${options.fit}`);
    }
    
    // Auto format and quality for best optimization
    if (!options.format) {
      transformations.push('f_auto');
    }
    if (!options.quality) {
      transformations.push('q_auto');
    }
    
    const transformation = transformations.join(',');
    return `${parts[0]}/upload/${transformation}/${parts[1]}`;
  } catch (error) {
    logger.error('❌ [ImageOptimizer] Cloudinary URL error', { error });
    return url;
  }
}

/**
 * Generate srcset for responsive images
 */
export function generateSrcSet(
  originalUrl: string,
  widths: number[] = [320, 640, 960, 1280, 1920]
): string {
  return widths
    .map(width => {
      const url = getOptimizedImageUrl(originalUrl, { width });
      return `${url} ${width}w`;
    })
    .join(', ');
}

/**
 * Generate sizes attribute for responsive images
 */
export function generateSizes(
  breakpoints: { maxWidth: number; size: string }[] = [
    { maxWidth: 640, size: '100vw' },
    { maxWidth: 1024, size: '50vw' },
    { maxWidth: 1920, size: '33vw' },
  ]
): string {
  return breakpoints
    .map(bp => `(max-width: ${bp.maxWidth}px) ${bp.size}`)
    .join(', ');
}

/**
 * Get placeholder/blur data URL for lazy loading
 */
export function getPlaceholderDataUrl(
  dominantColor: string = '#f3f4f6'
): string {
  // Simple colored placeholder
  const svg = `<svg width="1" height="1" xmlns="http://www.w3.org/2000/svg">
    <rect width="1" height="1" fill="${dominantColor}"/>
  </svg>`;
  
  const encoded = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${encoded}`;
}

/**
 * Preload critical images
 */
export function preloadImage(url: string): void {
  if (typeof window === 'undefined') return;
  
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = url;
  document.head.appendChild(link);
}

/**
 * Lazy load images with Intersection Observer
 */
export class ImageLazyLoader {
  private observer: IntersectionObserver | null = null;
  
  constructor(options: IntersectionObserverInit = {}) {
    if (typeof window === 'undefined') return;
    
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          const src = img.dataset.src;
          const srcset = img.dataset.srcset;
          
          if (src) {
            img.src = src;
            delete img.dataset.src;
          }
          
          if (srcset) {
            img.srcset = srcset;
            delete img.dataset.srcset;
          }
          
          img.classList.add('loaded');
          this.observer?.unobserve(img);
        }
      });
    }, {
      rootMargin: '50px',
      ...options
    });
  }
  
  observe(element: HTMLImageElement): void {
    this.observer?.observe(element);
  }
  
  disconnect(): void {
    this.observer?.disconnect();
  }
}

/**
 * Calculate optimal image dimensions based on container
 */
export function calculateOptimalDimensions(
  containerWidth: number,
  containerHeight: number,
  originalWidth: number,
  originalHeight: number,
  fit: 'cover' | 'contain' = 'cover'
): { width: number; height: number } {
  const containerRatio = containerWidth / containerHeight;
  const imageRatio = originalWidth / originalHeight;
  
  let width, height;
  
  if (fit === 'cover') {
    if (containerRatio > imageRatio) {
      width = containerWidth;
      height = containerWidth / imageRatio;
    } else {
      height = containerHeight;
      width = containerHeight * imageRatio;
    }
  } else {
    if (containerRatio > imageRatio) {
      height = containerHeight;
      width = containerHeight * imageRatio;
    } else {
      width = containerWidth;
      height = containerWidth / imageRatio;
    }
  }
  
  return {
    width: Math.round(width),
    height: Math.round(height)
  };
}