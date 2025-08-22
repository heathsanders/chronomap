// MediaScanner Service - Photo library scanning and metadata extraction
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { Image } from 'expo-image';
import { DatabaseService } from '../DatabaseService';
import { MetadataExtractor } from './MetadataExtractor';
import { PhotoProcessor } from './PhotoProcessor';
import type {
  ScanOptions,
  ScanProgress,
  ScanResult,
  ScanError,
  MediaAsset,
  ProcessedPhoto,
  ScanStatus
} from './types';

export class MediaScannerService {
  private static instance: MediaScannerService;
  private isScanning = false;
  private currentScanId: number | null = null;
  private progressCallback?: (progress: ScanProgress) => void;
  private completeCallback?: (result: ScanResult) => void;
  private errorCallback?: (error: ScanError) => void;
  private shouldCancelScan = false;
  private dbService: DatabaseService;

  private constructor() {
    this.dbService = DatabaseService.getInstance();
  }

  static getInstance(): MediaScannerService {
    if (!MediaScannerService.instance) {
      MediaScannerService.instance = new MediaScannerService();
    }
    return MediaScannerService.instance;
  }

  /**
   * Start a full library scan
   */
  async startFullScan(options: ScanOptions = {}): Promise<ScanResult> {
    if (this.isScanning) {
      throw new Error('Scan already in progress');
    }

    const scanOptions: Required<ScanOptions> = {
      includeVideos: options.includeVideos ?? true,
      batchSize: options.batchSize ?? 100,
      includeHidden: options.includeHidden ?? false,
      maxFileSize: options.maxFileSize ?? 100 * 1024 * 1024, // 100MB
      supportedFormats: options.supportedFormats ?? ['jpg', 'jpeg', 'png', 'heic', 'mp4', 'mov'],
      ...options
    };

    console.log('Starting full library scan with options:', scanOptions);
    return this.performScan('full', scanOptions);
  }

  /**
   * Start an incremental scan for new/changed photos
   */
  async startIncrementalScan(options: ScanOptions = {}): Promise<ScanResult> {
    if (this.isScanning) {
      throw new Error('Scan already in progress');
    }

    const lastScanTimestamp = await this.getLastScanTimestamp();
    console.log(`Starting incremental scan from timestamp: ${lastScanTimestamp}`);
    
    return this.performScan('incremental', options, lastScanTimestamp);
  }

  /**
   * Pause the current scan
   */
  async pauseScan(): Promise<void> {
    if (!this.isScanning) {
      throw new Error('No scan in progress');
    }
    
    this.shouldCancelScan = true;
    console.log('Scan pause requested');
  }

  /**
   * Resume a paused scan
   */
  async resumeScan(): Promise<void> {
    // For now, we'll restart the scan
    // In a more sophisticated implementation, we could save scan state
    console.log('Resume scan not implemented yet, use startIncrementalScan instead');
    throw new Error('Resume scan not implemented yet');
  }

  /**
   * Cancel the current scan
   */
  async cancelScan(): Promise<void> {
    if (!this.isScanning) {
      return;
    }

    this.shouldCancelScan = true;
    
    if (this.currentScanId) {
      await this.dbService.completeScanRecord(this.currentScanId, 'cancelled');
    }
    
    this.cleanupScanState();
    console.log('Scan cancelled');
  }

  /**
   * Get current scan status
   */
  async getScanStatus(): Promise<ScanStatus> {
    return {
      isScanning: this.isScanning,
      scanId: this.currentScanId,
      canPause: this.isScanning,
      canResume: false, // Not implemented yet
      canCancel: this.isScanning
    };
  }

  /**
   * Get the result of the last completed scan
   */
  async getLastScanResult(): Promise<ScanResult | null> {
    const recentScans = await this.dbService.getRecentScans(1);
    if (recentScans.length === 0) {
      return null;
    }

    const lastScan = recentScans[0];
    return {
      scanId: lastScan.id.toString(),
      startedAt: lastScan.started_at * 1000, // Convert to milliseconds
      completedAt: lastScan.completed_at ? lastScan.completed_at * 1000 : Date.now(),
      totalPhotos: lastScan.photos_processed,
      newPhotos: lastScan.photos_added,
      updatedPhotos: lastScan.photos_updated,
      errors: lastScan.error_message ? [{ 
        type: 'unknown',
        message: lastScan.error_message,
        timestamp: lastScan.completed_at || lastScan.started_at
      }] : [],
      status: lastScan.status as 'completed' | 'failed' | 'cancelled'
    };
  }

  /**
   * Set progress callback
   */
  onScanProgress(callback: (progress: ScanProgress) => void): () => void {
    this.progressCallback = callback;
    return () => {
      this.progressCallback = undefined;
    };
  }

  /**
   * Set completion callback
   */
  onScanComplete(callback: (result: ScanResult) => void): () => void {
    this.completeCallback = callback;
    return () => {
      this.completeCallback = undefined;
    };
  }

  /**
   * Set error callback
   */
  onScanError(callback: (error: ScanError) => void): () => void {
    this.errorCallback = callback;
    return () => {
      this.errorCallback = undefined;
    };
  }

  // =============================================================================
  // PRIVATE METHODS
  // =============================================================================

  /**
   * Main scan implementation
   */
  private async performScan(
    scanType: 'full' | 'incremental',
    options: Required<ScanOptions>,
    lastScanTimestamp?: number
  ): Promise<ScanResult> {
    this.isScanning = true;
    this.shouldCancelScan = false;

    // Start scan record
    this.currentScanId = await this.dbService.startScanRecord(scanType);
    
    const scanResult: ScanResult = {
      scanId: this.currentScanId.toString(),
      startedAt: Date.now(),
      completedAt: 0,
      totalPhotos: 0,
      newPhotos: 0,
      updatedPhotos: 0,
      errors: [],
      status: 'completed'
    };

    try {
      // Check media library permissions
      const { status } = await MediaLibrary.getPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Media library permission not granted');
      }

      console.log(`Starting ${scanType} scan...`);
      
      // Get media assets
      const assets = await this.getMediaAssets(options, lastScanTimestamp);
      console.log(`Found ${assets.length} assets to process`);

      if (assets.length === 0) {
        scanResult.status = 'completed';
        return this.completeScan(scanResult);
      }

      // Process assets in batches
      let processedCount = 0;
      let addedCount = 0;
      let updatedCount = 0;
      const errors: ScanError[] = [];

      for (let i = 0; i < assets.length; i += options.batchSize) {
        if (this.shouldCancelScan) {
          scanResult.status = 'cancelled';
          break;
        }

        const batch = assets.slice(i, i + options.batchSize);
        
        // Update progress
        this.notifyProgress({
          phase: 'processing',
          totalItems: assets.length,
          processedItems: processedCount,
          currentItem: batch[0]?.filename,
          estimatedTimeRemaining: this.estimateTimeRemaining(
            processedCount,
            assets.length,
            scanResult.startedAt
          ),
          errors
        });

        // Process batch
        const batchResult = await this.processBatch(batch, options);
        
        processedCount += batchResult.processed;
        addedCount += batchResult.added;
        updatedCount += batchResult.updated;
        errors.push(...batchResult.errors);

        // Update scan progress in database
        await this.dbService.updateScanProgress(
          this.currentScanId!,
          processedCount,
          addedCount,
          updatedCount
        );

        // Small delay to prevent UI blocking
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      scanResult.totalPhotos = processedCount;
      scanResult.newPhotos = addedCount;
      scanResult.updatedPhotos = updatedCount;
      scanResult.errors = errors;

      if (this.shouldCancelScan) {
        scanResult.status = 'cancelled';
      } else if (errors.length > processedCount * 0.5) {
        scanResult.status = 'failed';
      } else {
        scanResult.status = 'completed';
        // Update last scan timestamp
        await this.updateLastScanTimestamp();
      }

      return this.completeScan(scanResult);

    } catch (error) {
      console.error('Scan failed:', error);
      
      scanResult.status = 'failed';
      scanResult.errors.push({
        type: 'scan_error',
        message: error.message,
        timestamp: Date.now()
      });

      return this.completeScan(scanResult);
    }
  }

  /**
   * Get media assets from library
   */
  private async getMediaAssets(
    options: Required<ScanOptions>,
    lastScanTimestamp?: number
  ): Promise<MediaAsset[]> {
    const mediaTypes = [];
    
    // Always include photos
    mediaTypes.push(MediaLibrary.MediaType.photo);
    
    if (options.includeVideos) {
      mediaTypes.push(MediaLibrary.MediaType.video);
    }

    // Build query options
    const queryOptions: MediaLibrary.AssetsOptions = {
      mediaType: mediaTypes,
      sortBy: MediaLibrary.SortBy.creationTime,
      includeSmartAlbums: false,
    };

    // Add incremental filter if provided
    if (lastScanTimestamp) {
      queryOptions.createdAfter = new Date(lastScanTimestamp);
    }

    // Get assets page by page
    const allAssets: MediaAsset[] = [];
    let hasNextPage = true;
    let after = undefined;

    while (hasNextPage) {
      const result = await MediaLibrary.getAssetsAsync({
        ...queryOptions,
        first: 1000, // Get 1000 at a time
        after
      });

      // Filter assets by supported formats and file size
      const filteredAssets = result.assets.filter(asset => 
        this.isAssetSupported(asset, options)
      );

      allAssets.push(...filteredAssets.map(asset => ({
        id: asset.id,
        filename: asset.filename,
        uri: asset.uri,
        mediaType: asset.mediaType,
        width: asset.width,
        height: asset.height,
        creationTime: asset.creationTime,
        modificationTime: asset.modificationTime,
        duration: asset.duration,
        mediaSubtypes: asset.mediaSubtypes || []
      })));

      hasNextPage = result.hasNextPage;
      after = result.endCursor;
    }

    return allAssets;
  }

  /**
   * Check if asset is supported based on options
   */
  private isAssetSupported(asset: MediaLibrary.Asset, options: Required<ScanOptions>): boolean {
    // Check file extension
    const extension = asset.filename.split('.').pop()?.toLowerCase();
    if (!extension || !options.supportedFormats.includes(extension)) {
      return false;
    }

    // We can't easily check file size from MediaLibrary.Asset
    // This would need to be checked during processing
    return true;
  }

  /**
   * Process a batch of assets
   */
  private async processBatch(
    assets: MediaAsset[],
    options: Required<ScanOptions>
  ): Promise<{
    processed: number;
    added: number;
    updated: number;
    errors: ScanError[];
  }> {
    let processed = 0;
    let added = 0;
    let updated = 0;
    const errors: ScanError[] = [];

    for (const asset of assets) {
      try {
        if (this.shouldCancelScan) break;

        const result = await this.processAsset(asset, options);
        
        if (result.isNew) {
          added++;
        } else if (result.isUpdated) {
          updated++;
        }
        
        processed++;
      } catch (error) {
        console.error(`Failed to process asset ${asset.filename}:`, error);
        errors.push({
          type: 'file_access',
          message: error.message,
          fileUri: asset.uri,
          timestamp: Date.now()
        });
      }
    }

    return { processed, added, updated, errors };
  }

  /**
   * Process a single asset
   */
  private async processAsset(
    asset: MediaAsset,
    options: Required<ScanOptions>
  ): Promise<{ isNew: boolean; isUpdated: boolean }> {
    // Check if photo already exists
    const existingPhoto = await this.dbService.getPhotoById(asset.id);
    
    // Get file info to check size
    const fileInfo = await FileSystem.getInfoAsync(asset.uri);
    if (!fileInfo.exists) {
      throw new Error('Asset file not found');
    }

    const fileSize = fileInfo.size || 0;
    if (fileSize > options.maxFileSize) {
      throw new Error(`File too large: ${fileSize} bytes`);
    }

    // Extract metadata
    const metadata = await MetadataExtractor.extractMetadata(asset);
    
    // Process photo dimensions if not available
    let { width, height } = asset;
    if (!width || !height) {
      const dimensions = await PhotoProcessor.getImageDimensions(asset.uri);
      width = dimensions.width;
      height = dimensions.height;
    }

    const photoRecord = {
      id: asset.id,
      device_id: asset.id, // Use asset ID as device ID for now
      uri: asset.uri,
      filename: asset.filename,
      file_size: fileSize,
      mime_type: this.getMimeType(asset),
      width,
      height,
      creation_time: Math.floor(asset.creationTime / 1000),
      modification_time: Math.floor((asset.modificationTime || asset.creationTime) / 1000),
      duration: asset.duration || null,
      is_favorite: false,
      is_deleted: false
    };

    let isNew = false;
    let isUpdated = false;

    if (!existingPhoto) {
      // Insert new photo
      await this.dbService.insertPhoto(photoRecord);
      isNew = true;
    } else {
      // Check if update is needed
      if (existingPhoto.modification_time < photoRecord.modification_time) {
        await this.dbService.updatePhoto(asset.id, {
          file_size: photoRecord.file_size,
          modification_time: photoRecord.modification_time,
          width: photoRecord.width,
          height: photoRecord.height
        });
        isUpdated = true;
      }
    }

    // Store metadata
    if (metadata) {
      await this.storeMetadata(asset.id, metadata);
    }

    // Process location if available
    if (metadata?.location?.latitude && metadata?.location?.longitude) {
      await this.processLocation(asset.id, metadata.location);
    }

    return { isNew, isUpdated };
  }

  /**
   * Store metadata in database
   */
  private async storeMetadata(photoId: string, metadata: any): Promise<void> {
    // Store EXIF metadata
    if (metadata.exif) {
      for (const [key, value] of Object.entries(metadata.exif)) {
        if (value !== null && value !== undefined) {
          await this.dbService.insertMetadata({
            photo_id: photoId,
            metadata_type: 'exif',
            key,
            value: String(value)
          });
        }
      }
    }

    // Store camera metadata
    if (metadata.camera) {
      for (const [key, value] of Object.entries(metadata.camera)) {
        if (value !== null && value !== undefined) {
          await this.dbService.insertMetadata({
            photo_id: photoId,
            metadata_type: 'exif',
            key: `camera_${key}`,
            value: String(value)
          });
        }
      }
    }

    // Store custom metadata
    if (metadata.custom) {
      for (const [key, value] of Object.entries(metadata.custom)) {
        if (value !== null && value !== undefined) {
          await this.dbService.insertMetadata({
            photo_id: photoId,
            metadata_type: 'custom',
            key,
            value: String(value)
          });
        }
      }
    }
  }

  /**
   * Process location data
   */
  private async processLocation(photoId: string, location: any): Promise<void> {
    const { latitude, longitude, altitude } = location;
    
    // Check if location already exists (with tolerance)
    let locationRecord = await this.dbService.findLocationByCoordinates(
      latitude,
      longitude,
      0.0001 // ~11 meters tolerance
    );

    if (!locationRecord) {
      // Create new location record
      const locationId = await this.dbService.insertLocation({
        latitude,
        longitude,
        altitude: altitude || null,
        accuracy: null, // Will be filled by geocoding
        address_line1: null,
        address_line2: null,
        city: null,
        state: null,
        country: null,
        postal_code: null,
        place_name: null,
        geocoded_at: null
      });

      // Link photo to location
      await this.dbService.linkPhotoToLocation(photoId, locationId, 1.0);
    } else {
      // Link photo to existing location
      await this.dbService.linkPhotoToLocation(photoId, locationRecord.id, 1.0);
    }
  }

  /**
   * Get MIME type from asset
   */
  private getMimeType(asset: MediaAsset): string {
    const extension = asset.filename.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'heic':
        return 'image/heic';
      case 'mp4':
        return 'video/mp4';
      case 'mov':
        return 'video/quicktime';
      default:
        return asset.mediaType === 'video' ? 'video/mp4' : 'image/jpeg';
    }
  }

  /**
   * Estimate remaining time for scan
   */
  private estimateTimeRemaining(
    processed: number,
    total: number,
    startTime: number
  ): number {
    if (processed === 0) return 0;
    
    const elapsed = Date.now() - startTime;
    const avgTimePerItem = elapsed / processed;
    const remaining = total - processed;
    
    return Math.round(remaining * avgTimePerItem);
  }

  /**
   * Get last scan timestamp
   */
  private async getLastScanTimestamp(): Promise<number> {
    const lastScanSetting = await this.dbService.getSetting('last_scan_timestamp');
    return lastScanSetting ? parseInt(lastScanSetting) : 0;
  }

  /**
   * Update last scan timestamp
   */
  private async updateLastScanTimestamp(): Promise<void> {
    await this.dbService.upsertSetting(
      'last_scan_timestamp',
      Date.now().toString(),
      'number'
    );
  }

  /**
   * Notify progress callback
   */
  private notifyProgress(progress: ScanProgress): void {
    if (this.progressCallback) {
      this.progressCallback(progress);
    }
  }

  /**
   * Complete scan and cleanup
   */
  private async completeScan(result: ScanResult): Promise<ScanResult> {
    result.completedAt = Date.now();
    
    // Update scan record in database
    if (this.currentScanId) {
      await this.dbService.completeScanRecord(
        this.currentScanId,
        result.status === 'cancelled' ? 'cancelled' : 
        result.status === 'failed' ? 'failed' : 'completed',
        result.errors.length > 0 ? result.errors[0].message : undefined
      );
    }

    // Notify completion callback
    if (this.completeCallback) {
      this.completeCallback(result);
    }

    // Cleanup state
    this.cleanupScanState();

    console.log(`Scan completed: ${result.status}`, {
      totalPhotos: result.totalPhotos,
      newPhotos: result.newPhotos,
      updatedPhotos: result.updatedPhotos,
      errors: result.errors.length
    });

    return result;
  }

  /**
   * Cleanup scan state
   */
  private cleanupScanState(): void {
    this.isScanning = false;
    this.currentScanId = null;
    this.shouldCancelScan = false;
  }
}

export default MediaScannerService;