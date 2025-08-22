// PhotoProcessor - Image processing utilities for photos
import * as FileSystem from 'expo-file-system';
import { Image } from 'expo-image';
import * as ImageManipulator from 'expo-image-manipulator';
import type {
  MediaAsset,
  PhotoDimensions,
  ThumbnailOptions,
  ProcessingResult,
  QualityMetrics
} from './types';

export class PhotoProcessor {
  private static readonly DEFAULT_THUMBNAIL_SIZE = 200;
  private static readonly DEFAULT_QUALITY = 0.8;
  private static readonly CACHE_DIR = `${FileSystem.cacheDirectory}thumbnails/`;

  /**
   * Get image dimensions from URI
   */
  static async getImageDimensions(uri: string): Promise<PhotoDimensions> {
    try {
      return new Promise((resolve, reject) => {
        Image.getSize(
          uri,
          (width: number, height: number) => {
            resolve({
              width,
              height,
              aspectRatio: width / height
            });
          },
          (error: any) => {
            reject(new Error(`Failed to get image dimensions: ${error.message}`));
          }
        );
      });
    } catch (error) {
      console.error('Failed to get image dimensions:', error);
      throw error;
    }
  }

  /**
   * Generate thumbnail for an image
   */
  static async generateThumbnail(
    uri: string,
    options: Partial<ThumbnailOptions> = {}
  ): Promise<string> {
    try {
      const thumbnailOptions: ThumbnailOptions = {
        size: options.size || this.DEFAULT_THUMBNAIL_SIZE,
        quality: options.quality || this.DEFAULT_QUALITY,
        format: options.format || 'jpeg'
      };

      // Ensure thumbnail cache directory exists
      await this.ensureThumbnailDirectory();

      // Check if thumbnail already exists in cache
      const cacheKey = this.generateCacheKey(uri, thumbnailOptions);
      const cachedPath = `${this.CACHE_DIR}${cacheKey}`;
      
      const cacheInfo = await FileSystem.getInfoAsync(cachedPath);
      if (cacheInfo.exists) {
        console.log(`Using cached thumbnail: ${cacheKey}`);
        return cachedPath;
      }

      // Generate new thumbnail
      console.log(`Generating thumbnail for: ${uri}`);
      
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [
          {
            resize: {
              width: thumbnailOptions.size,
              height: thumbnailOptions.size
            }
          }
        ],
        {
          compress: thumbnailOptions.quality,
          format: thumbnailOptions.format === 'png' 
            ? ImageManipulator.SaveFormat.PNG 
            : ImageManipulator.SaveFormat.JPEG,
          base64: false
        }
      );

      // Move thumbnail to cache directory
      await FileSystem.moveAsync({
        from: result.uri,
        to: cachedPath
      });

      console.log(`✓ Thumbnail generated: ${cacheKey}`);
      return cachedPath;
    } catch (error) {
      console.error('Thumbnail generation failed:', error);
      throw new Error(`Thumbnail generation failed: ${error.message}`);
    }
  }

  /**
   * Generate multiple thumbnail sizes for an image
   */
  static async generateMultipleThumbnails(
    uri: string,
    sizes: number[] = [200, 400, 800]
  ): Promise<Record<number, string>> {
    const thumbnails: Record<number, string> = {};

    for (const size of sizes) {
      try {
        const thumbnailUri = await this.generateThumbnail(uri, { size });
        thumbnails[size] = thumbnailUri;
      } catch (error) {
        console.error(`Failed to generate ${size}px thumbnail:`, error);
      }
    }

    return thumbnails;
  }

  /**
   * Process image for optimization
   */
  static async processImage(
    uri: string,
    options: {
      maxWidth?: number;
      maxHeight?: number;
      quality?: number;
      format?: 'jpeg' | 'png';
      rotate?: number;
      crop?: {
        originX: number;
        originY: number;
        width: number;
        height: number;
      };
    } = {}
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    
    try {
      const manipulations: ImageManipulator.Action[] = [];

      // Add crop if specified
      if (options.crop) {
        manipulations.push({ crop: options.crop });
      }

      // Add rotation if specified
      if (options.rotate) {
        manipulations.push({ rotate: options.rotate });
      }

      // Add resize if max dimensions specified
      if (options.maxWidth || options.maxHeight) {
        const resize: any = {};
        if (options.maxWidth) resize.width = options.maxWidth;
        if (options.maxHeight) resize.height = options.maxHeight;
        manipulations.push({ resize });
      }

      const result = await ImageManipulator.manipulateAsync(
        uri,
        manipulations,
        {
          compress: options.quality || 0.9,
          format: options.format === 'png' 
            ? ImageManipulator.SaveFormat.PNG 
            : ImageManipulator.SaveFormat.JPEG,
          base64: false
        }
      );

      return {
        success: true,
        thumbnailUri: result.uri,
        processingTime: Date.now() - startTime
      };
    } catch (error) {
      console.error('Image processing failed:', error);
      return {
        success: false,
        errors: [error.message],
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Analyze image quality metrics
   */
  static async analyzeQuality(asset: MediaAsset): Promise<QualityMetrics> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(asset.uri);
      const fileSize = fileInfo.size || 0;

      // Calculate resolution category
      const totalPixels = asset.width * asset.height;
      let resolution: QualityMetrics['resolution'];
      
      if (totalPixels < 1000000) { // < 1MP
        resolution = 'low';
      } else if (totalPixels < 8000000) { // < 8MP
        resolution = 'medium';
      } else if (totalPixels < 20000000) { // < 20MP
        resolution = 'high';
      } else {
        resolution = 'ultra';
      }

      // Calculate quality score (simplified)
      let score = 50; // Base score

      // Resolution scoring
      if (resolution === 'ultra') score += 25;
      else if (resolution === 'high') score += 20;
      else if (resolution === 'medium') score += 10;

      // File size vs resolution ratio (compression quality indicator)
      const bytesPerPixel = fileSize / totalPixels;
      if (bytesPerPixel > 2) score += 15; // Good compression ratio
      else if (bytesPerPixel > 1) score += 10;
      else if (bytesPerPixel < 0.5) score -= 10; // Over-compressed

      // Aspect ratio scoring (penalize extreme ratios)
      const aspectRatio = asset.width / asset.height;
      if (aspectRatio > 0.5 && aspectRatio < 2) score += 10;

      // Ensure score is within bounds
      score = Math.max(0, Math.min(100, score));

      return {
        resolution,
        aspectRatio,
        fileSize,
        score
      };
    } catch (error) {
      console.error('Quality analysis failed:', error);
      return {
        resolution: 'low',
        aspectRatio: 1,
        fileSize: 0,
        score: 0
      };
    }
  }

  /**
   * Detect if image is blurry (simplified detection)
   */
  static async detectBlur(uri: string): Promise<{ isBlurry: boolean; confidence: number }> {
    try {
      // This is a placeholder for blur detection
      // Real blur detection would require image analysis algorithms
      // that might not be available in React Native without additional libraries
      
      // For now, we'll do a very basic check based on file size vs dimensions
      const fileInfo = await FileSystem.getInfoAsync(uri);
      const dimensions = await this.getImageDimensions(uri);
      
      const fileSize = fileInfo.size || 0;
      const totalPixels = dimensions.width * dimensions.height;
      const bytesPerPixel = fileSize / totalPixels;
      
      // Very rough heuristic: extremely small bytes per pixel might indicate blur
      // (due to less detail being compressible)
      const isBlurry = bytesPerPixel < 0.3;
      const confidence = isBlurry ? 0.6 : 0.4; // Low confidence since this is a rough estimate
      
      return { isBlurry, confidence };
    } catch (error) {
      console.error('Blur detection failed:', error);
      return { isBlurry: false, confidence: 0 };
    }
  }

  /**
   * Get cached thumbnail path if it exists
   */
  static async getCachedThumbnail(
    uri: string,
    size: number = this.DEFAULT_THUMBNAIL_SIZE
  ): Promise<string | null> {
    try {
      const cacheKey = this.generateCacheKey(uri, { size, quality: this.DEFAULT_QUALITY, format: 'jpeg' });
      const cachedPath = `${this.CACHE_DIR}${cacheKey}`;
      
      const cacheInfo = await FileSystem.getInfoAsync(cachedPath);
      return cacheInfo.exists ? cachedPath : null;
    } catch (error) {
      console.error('Failed to check thumbnail cache:', error);
      return null;
    }
  }

  /**
   * Clear thumbnail cache
   */
  static async clearThumbnailCache(): Promise<void> {
    try {
      const cacheInfo = await FileSystem.getInfoAsync(this.CACHE_DIR);
      if (cacheInfo.exists) {
        await FileSystem.deleteAsync(this.CACHE_DIR, { idempotent: true });
        await this.ensureThumbnailDirectory();
      }
      console.log('✓ Thumbnail cache cleared');
    } catch (error) {
      console.error('Failed to clear thumbnail cache:', error);
    }
  }

  /**
   * Get thumbnail cache size
   */
  static async getThumbnailCacheSize(): Promise<number> {
    try {
      const cacheInfo = await FileSystem.getInfoAsync(this.CACHE_DIR);
      if (!cacheInfo.exists) return 0;

      const files = await FileSystem.readDirectoryAsync(this.CACHE_DIR);
      let totalSize = 0;

      for (const file of files) {
        const filePath = `${this.CACHE_DIR}${file}`;
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        totalSize += fileInfo.size || 0;
      }

      return totalSize;
    } catch (error) {
      console.error('Failed to calculate cache size:', error);
      return 0;
    }
  }

  /**
   * Clean up old thumbnails
   */
  static async cleanupOldThumbnails(maxAge: number = 30 * 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const cacheInfo = await FileSystem.getInfoAsync(this.CACHE_DIR);
      if (!cacheInfo.exists) return;

      const files = await FileSystem.readDirectoryAsync(this.CACHE_DIR);
      const now = Date.now();
      let deletedCount = 0;

      for (const file of files) {
        const filePath = `${this.CACHE_DIR}${file}`;
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        
        if (fileInfo.modificationTime && (now - fileInfo.modificationTime) > maxAge) {
          await FileSystem.deleteAsync(filePath, { idempotent: true });
          deletedCount++;
        }
      }

      if (deletedCount > 0) {
        console.log(`✓ Cleaned up ${deletedCount} old thumbnails`);
      }
    } catch (error) {
      console.error('Failed to cleanup old thumbnails:', error);
    }
  }

  /**
   * Batch process multiple images
   */
  static async batchProcessImages(
    uris: string[],
    options: Parameters<typeof PhotoProcessor.processImage>[1] = {},
    onProgress?: (processed: number, total: number) => void
  ): Promise<ProcessingResult[]> {
    const results: ProcessingResult[] = [];
    
    for (let i = 0; i < uris.length; i++) {
      try {
        const result = await this.processImage(uris[i], options);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          errors: [error.message],
          processingTime: 0
        });
      }

      if (onProgress) {
        onProgress(i + 1, uris.length);
      }

      // Small delay to prevent overwhelming the system
      if (i < uris.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    return results;
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  /**
   * Ensure thumbnail directory exists
   */
  private static async ensureThumbnailDirectory(): Promise<void> {
    const dirInfo = await FileSystem.getInfoAsync(this.CACHE_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(this.CACHE_DIR, { intermediates: true });
    }
  }

  /**
   * Generate cache key for thumbnail
   */
  private static generateCacheKey(uri: string, options: ThumbnailOptions): string {
    // Create a simple hash of the URI and options
    const content = `${uri}_${options.size}_${options.quality}_${options.format}`;
    
    // Simple hash function (for production, consider using crypto)
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    const extension = options.format === 'png' ? '.png' : '.jpg';
    return `thumb_${Math.abs(hash).toString(16)}${extension}`;
  }

  /**
   * Validate image URI
   */
  private static async validateImageUri(uri: string): Promise<boolean> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      return fileInfo.exists;
    } catch (error) {
      return false;
    }
  }
}

export default PhotoProcessor;