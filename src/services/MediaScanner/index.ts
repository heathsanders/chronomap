/**
 * MediaScanner Service
 * Handles photo library scanning, enumeration, and progress tracking
 * Optimized for large photo libraries with batch processing
 */

import * as MediaLibrary from 'expo-media-library';
import { PhotoAsset, ScanProgress, AppError } from '@/types';
import PermissionManager from '@/services/PermissionManager';

export interface MediaScannerConfig {
  batchSize: number;
  processingDelay: number; // ms between batches to prevent UI blocking
  includeVideos: boolean;
  sortBy: MediaLibrary.SortByValue[];
  mediaType: MediaLibrary.MediaTypeValue[];
}

export class MediaScanner {
  private static instance: MediaScanner;
  private isScanning = false;
  private scanAbortController: AbortController | null = null;
  private progressCallbacks: ((progress: ScanProgress) => void)[] = [];
  
  private config: MediaScannerConfig = {
    batchSize: 100, // Process 100 photos at a time
    processingDelay: 50, // 50ms delay between batches
    includeVideos: true,
    sortBy: ['creationTime'],
    mediaType: ['photo', 'video']
  };

  static getInstance(): MediaScanner {
    if (!MediaScanner.instance) {
      MediaScanner.instance = new MediaScanner();
    }
    return MediaScanner.instance;
  }

  /**
   * Start a full scan of the photo library
   */
  async startFullScan(
    onProgress?: (progress: ScanProgress) => void
  ): Promise<PhotoAsset[]> {
    if (this.isScanning) {
      throw new Error('Scan already in progress');
    }

    // Check permissions first
    const hasPermission = await this.ensurePermissions();
    if (!hasPermission) {
      throw this.createError('PERMISSION_DENIED', 'Photo library permission required');
    }

    this.isScanning = true;
    this.scanAbortController = new AbortController();
    
    if (onProgress) {
      this.progressCallbacks.push(onProgress);
    }

    try {
      return await this.performFullScan();
    } catch (error) {
      this.handleScanError(error);
      throw error;
    } finally {
      this.isScanning = false;
      this.scanAbortController = null;
      this.progressCallbacks = [];
    }
  }

  /**
   * Start an incremental scan for new photos since last scan
   */
  async startIncrementalScan(
    lastScanDate: Date,
    onProgress?: (progress: ScanProgress) => void
  ): Promise<PhotoAsset[]> {
    if (this.isScanning) {
      throw new Error('Scan already in progress');
    }

    const hasPermission = await this.ensurePermissions();
    if (!hasPermission) {
      throw this.createError('PERMISSION_DENIED', 'Photo library permission required');
    }

    this.isScanning = true;
    this.scanAbortController = new AbortController();
    
    if (onProgress) {
      this.progressCallbacks.push(onProgress);
    }

    try {
      return await this.performIncrementalScan(lastScanDate);
    } catch (error) {
      this.handleScanError(error);
      throw error;
    } finally {
      this.isScanning = false;
      this.scanAbortController = null;
      this.progressCallbacks = [];
    }
  }

  /**
   * Get total photo count without full scan
   */
  async getPhotoCount(): Promise<number> {
    const hasPermission = await this.ensurePermissions();
    if (!hasPermission) {
      return 0;
    }

    try {
      const { totalCount } = await MediaLibrary.getAssetsAsync({
        first: 1,
        mediaType: this.config.mediaType,
        sortBy: this.config.sortBy
      });
      return totalCount;
    } catch (error) {
      console.error('Error getting photo count:', error);
      return 0;
    }
  }

  /**
   * Check if scanner is currently running
   */
  isRunning(): boolean {
    return this.isScanning;
  }

  /**
   * Abort current scan operation
   */
  abortScan(): void {
    if (this.scanAbortController) {
      this.scanAbortController.abort();
    }
    this.isScanning = false;
  }

  /**
   * Update scanner configuration
   */
  updateConfig(config: Partial<MediaScannerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Perform the actual full scan operation
   */
  private async performFullScan(): Promise<PhotoAsset[]> {
    const allAssets: PhotoAsset[] = [];
    let hasNextPage = true;
    let after: MediaLibrary.AssetRef | undefined;

    // Get total count for progress tracking
    const totalCount = await this.getPhotoCount();
    
    this.notifyProgress({
      totalPhotos: totalCount,
      processedPhotos: 0,
      stage: 'scanning',
      percentage: 0
    });

    while (hasNextPage && !this.scanAbortController?.signal.aborted) {
      try {
        const result = await MediaLibrary.getAssetsAsync({
          first: this.config.batchSize,
          after,
          mediaType: this.config.mediaType,
          sortBy: this.config.sortBy
        });

        // Get detailed asset info with location data for each asset
        const assetInfos = await Promise.all(
          result.assets.map(asset => MediaLibrary.getAssetInfoAsync(asset.id))
        );

        // Convert MediaLibrary assets to our PhotoAsset format, filtering out non-photo/video types
        const batchAssets: PhotoAsset[] = assetInfos
          .filter((asset): asset is MediaLibrary.AssetInfo & { mediaType: 'photo' | 'video' } => 
            asset.mediaType === 'photo' || asset.mediaType === 'video'
          )
          .map(asset => ({
            id: asset.id,
            uri: asset.uri,
            filename: asset.filename,
            width: asset.width,
            height: asset.height,
            creationTime: asset.creationTime,
            modificationTime: asset.modificationTime,
            mediaType: asset.mediaType,
            mediaSubtypes: asset.mediaSubtypes,
            albumId: asset.albumId,
            duration: asset.duration,
            location: asset.location ? {
              latitude: asset.location.latitude,
              longitude: asset.location.longitude,
              altitude: undefined, // MediaLibrary.Location doesn't have altitude
              accuracy: undefined, // MediaLibrary.Location doesn't have accuracy
              heading: undefined, // MediaLibrary.Location doesn't have heading
              speed: undefined // MediaLibrary.Location doesn't have speed
            } : undefined
          }));

        allAssets.push(...batchAssets);
        
        // Update progress
        this.notifyProgress({
          totalPhotos: totalCount,
          processedPhotos: allAssets.length,
          stage: 'scanning',
          percentage: Math.round((allAssets.length / totalCount) * 100),
          currentPhoto: batchAssets[0]?.filename
        });

        hasNextPage = result.hasNextPage;
        after = result.endCursor;

        // Add delay between batches to prevent UI blocking
        if (hasNextPage && this.config.processingDelay > 0) {
          await new Promise(resolve => setTimeout(resolve, this.config.processingDelay));
        }

      } catch (error) {
        console.error('Error during batch scan:', error);
        throw this.createError('SCAN_INTERRUPTED', `Scan failed during batch processing: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Check if scan was aborted
    if (this.scanAbortController?.signal.aborted) {
      throw this.createError('SCAN_INTERRUPTED', 'Scan was aborted by user');
    }

    this.notifyProgress({
      totalPhotos: totalCount,
      processedPhotos: allAssets.length,
      stage: 'complete',
      percentage: 100
    });

    return allAssets;
  }

  /**
   * Perform incremental scan for photos newer than specified date
   */
  private async performIncrementalScan(lastScanDate: Date): Promise<PhotoAsset[]> {
    const newAssets: PhotoAsset[] = [];
    let hasNextPage = true;
    let after: MediaLibrary.AssetRef | undefined;

    this.notifyProgress({
      totalPhotos: 0,
      processedPhotos: 0,
      stage: 'scanning',
      percentage: 0
    });

    while (hasNextPage && !this.scanAbortController?.signal.aborted) {
      try {
        const result = await MediaLibrary.getAssetsAsync({
          first: this.config.batchSize,
          after,
          mediaType: this.config.mediaType,
          sortBy: this.config.sortBy,
          createdAfter: lastScanDate
        });

        // Get detailed asset info with location data for each asset
        const assetInfos = await Promise.all(
          result.assets
            .filter(asset => asset.creationTime > lastScanDate.getTime())
            .map(asset => MediaLibrary.getAssetInfoAsync(asset.id))
        );

        // Convert to PhotoAsset format, filtering out non-photo/video types
        const batchAssets: PhotoAsset[] = assetInfos
          .filter((asset): asset is MediaLibrary.AssetInfo & { mediaType: 'photo' | 'video' } => 
            asset.mediaType === 'photo' || asset.mediaType === 'video'
          )
          .map(asset => ({
            id: asset.id,
            uri: asset.uri,
            filename: asset.filename,
            width: asset.width,
            height: asset.height,
            creationTime: asset.creationTime,
            modificationTime: asset.modificationTime,
            mediaType: asset.mediaType,
            mediaSubtypes: asset.mediaSubtypes,
            albumId: asset.albumId,
            duration: asset.duration,
            location: asset.location ? {
              latitude: asset.location.latitude,
              longitude: asset.location.longitude,
              altitude: undefined, // MediaLibrary.Location doesn't have altitude
              accuracy: undefined, // MediaLibrary.Location doesn't have accuracy
              heading: undefined, // MediaLibrary.Location doesn't have heading
              speed: undefined // MediaLibrary.Location doesn't have speed
            } : undefined
          }));

        newAssets.push(...batchAssets);
        
        // Update progress - for incremental scan, we don't know total count upfront
        this.notifyProgress({
          totalPhotos: newAssets.length, // Dynamic total
          processedPhotos: newAssets.length,
          stage: 'scanning',
          percentage: hasNextPage ? 50 : 100, // Estimate progress
          currentPhoto: batchAssets[0]?.filename
        });

        hasNextPage = result.hasNextPage;
        after = result.endCursor;

        if (hasNextPage && this.config.processingDelay > 0) {
          await new Promise(resolve => setTimeout(resolve, this.config.processingDelay));
        }

      } catch (error) {
        console.error('Error during incremental scan:', error);
        throw this.createError('SCAN_INTERRUPTED', `Incremental scan failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    if (this.scanAbortController?.signal.aborted) {
      throw this.createError('SCAN_INTERRUPTED', 'Incremental scan was aborted by user');
    }

    this.notifyProgress({
      totalPhotos: newAssets.length,
      processedPhotos: newAssets.length,
      stage: 'complete',
      percentage: 100
    });

    return newAssets;
  }

  /**
   * Ensure required permissions are available
   */
  private async ensurePermissions(): Promise<boolean> {
    const permission = await PermissionManager.checkMediaLibraryPermission();
    return permission.granted;
  }

  /**
   * Notify all registered progress callbacks
   */
  private notifyProgress(progress: ScanProgress): void {
    this.progressCallbacks.forEach(callback => {
      try {
        callback(progress);
      } catch (error) {
        console.error('Error in progress callback:', error);
      }
    });
  }

  /**
   * Create structured error for better error handling
   */
  private createError(code: 'PERMISSION_DENIED' | 'SCAN_INTERRUPTED', message: string): AppError {
    return {
      code,
      message,
      timestamp: new Date()
    };
  }

  /**
   * Handle scan errors with proper cleanup
   */
  private handleScanError(error: any): void {
    console.error('Media scan error:', error);
    
    this.notifyProgress({
      totalPhotos: 0,
      processedPhotos: 0,
      stage: 'error',
      percentage: 0,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

export default MediaScanner.getInstance();