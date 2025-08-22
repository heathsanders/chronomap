// MediaScanner Types - TypeScript interfaces for media scanning operations
import type { MediaTypeValue } from 'expo-media-library';

// =============================================================================
// CORE SCAN TYPES
// =============================================================================

export interface ScanOptions {
  includeVideos?: boolean;
  batchSize?: number;
  includeHidden?: boolean;
  maxFileSize?: number; // in bytes
  supportedFormats?: string[];
}

export interface ScanProgress {
  phase: 'scanning' | 'processing' | 'saving';
  totalItems: number;
  processedItems: number;
  currentItem?: string;
  estimatedTimeRemaining?: number; // in milliseconds
  errors: ScanError[];
}

export interface ScanResult {
  scanId: string;
  startedAt: number; // timestamp
  completedAt: number; // timestamp
  totalPhotos: number;
  newPhotos: number;
  updatedPhotos: number;
  errors: ScanError[];
  status: 'completed' | 'failed' | 'cancelled';
}

export interface ScanError {
  type: 'permission' | 'file_access' | 'metadata' | 'database' | 'scan_error' | 'unknown';
  message: string;
  fileUri?: string;
  timestamp: number;
}

export interface ScanStatus {
  isScanning: boolean;
  scanId: number | null;
  canPause: boolean;
  canResume: boolean;
  canCancel: boolean;
}

// =============================================================================
// MEDIA ASSET TYPES
// =============================================================================

export interface MediaAsset {
  id: string;
  filename: string;
  uri: string;
  mediaType: MediaTypeValue;
  width: number;
  height: number;
  creationTime: number; // timestamp
  modificationTime: number; // timestamp
  duration?: number; // for videos, in seconds
  mediaSubtypes: string[];
}

export interface ProcessedPhoto {
  asset: MediaAsset;
  metadata?: ExtractedMetadata;
  location?: LocationData;
  isNew: boolean;
  isUpdated: boolean;
  errors: string[];
}

// =============================================================================
// METADATA EXTRACTION TYPES
// =============================================================================

export interface ExtractedMetadata {
  exif?: ExifData;
  camera?: CameraData;
  location?: LocationData;
  custom?: Record<string, any>;
  errors?: string[];
}

export interface ExifData {
  // DateTime fields
  DateTime?: string;
  DateTimeOriginal?: string;
  DateTimeDigitized?: string;
  
  // Camera settings
  Make?: string;
  Model?: string;
  Software?: string;
  Orientation?: number;
  
  // Photo settings
  ExposureTime?: number;
  FNumber?: number;
  ISO?: number;
  FocalLength?: number;
  Flash?: number;
  WhiteBalance?: number;
  
  // Image properties
  ColorSpace?: number;
  PixelXDimension?: number;
  PixelYDimension?: number;
  
  // GPS data
  GPSLatitude?: number;
  GPSLongitude?: number;
  GPSAltitude?: number;
  GPSTimeStamp?: string;
  GPSSpeed?: number;
  GPSImgDirection?: number;
  
  // Additional fields
  ImageDescription?: string;
  UserComment?: string;
  Artist?: string;
  Copyright?: string;
  
  // Technical details
  Compression?: number;
  BitsPerSample?: number[];
  PhotometricInterpretation?: number;
  SamplesPerPixel?: number;
  PlanarConfiguration?: number;
  XResolution?: number;
  YResolution?: number;
  ResolutionUnit?: number;
}

export interface CameraData {
  make?: string;
  model?: string;
  lens?: string;
  software?: string;
  serialNumber?: string;
  firmware?: string;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  speed?: number;
  direction?: number;
  timestamp?: number;
  address?: AddressData;
}

export interface AddressData {
  streetNumber?: string;
  streetName?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  formattedAddress?: string;
}

// =============================================================================
// PHOTO PROCESSING TYPES
// =============================================================================

export interface PhotoDimensions {
  width: number;
  height: number;
  aspectRatio: number;
}

export interface ThumbnailOptions {
  size: number;
  quality: number;
  format: 'jpeg' | 'png' | 'webp';
}

export interface ProcessingResult {
  success: boolean;
  thumbnailUri?: string;
  metadata?: ExtractedMetadata;
  errors?: string[];
  processingTime?: number;
}

// =============================================================================
// BATCH PROCESSING TYPES
// =============================================================================

export interface BatchProcessingOptions {
  batchSize: number;
  maxConcurrency: number;
  retryAttempts: number;
  retryDelay: number; // milliseconds
  onProgress?: (progress: BatchProgress) => void;
  onError?: (error: BatchError) => void;
}

export interface BatchProgress {
  totalItems: number;
  processedItems: number;
  successfulItems: number;
  failedItems: number;
  currentBatch: number;
  totalBatches: number;
  estimatedTimeRemaining?: number;
}

export interface BatchError {
  batchIndex: number;
  itemIndex: number;
  item: MediaAsset;
  error: Error;
  retryAttempt: number;
}

export interface BatchResult {
  totalProcessed: number;
  successful: number;
  failed: number;
  errors: BatchError[];
  processingTime: number;
  averageTimePerItem: number;
}

// =============================================================================
// QUALITY ANALYSIS TYPES
// =============================================================================

export interface QualityMetrics {
  resolution: 'low' | 'medium' | 'high' | 'ultra';
  aspectRatio: number;
  fileSize: number;
  compression?: number;
  colorDepth?: number;
  hasFlash?: boolean;
  isBlurry?: boolean;
  isOverexposed?: boolean;
  isUnderexposed?: boolean;
  score: number; // 0-100
}

export interface DuplicateDetection {
  isDuplicate: boolean;
  similarPhotos: string[]; // Photo IDs
  similarity: number; // 0-1
  duplicateType: 'exact' | 'near' | 'different_size' | 'edited';
}

// =============================================================================
// METADATA PROCESSING TYPES
// =============================================================================

export interface MetadataProcessingOptions {
  extractExif: boolean;
  extractLocation: boolean;
  extractCamera: boolean;
  processTimezone: boolean;
  validateData: boolean;
  sanitizeData: boolean;
}

export interface MetadataValidation {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  sanitizedData?: ExtractedMetadata;
}

export interface TimezoneInfo {
  timezone: string;
  offset: number; // minutes from UTC
  isDST: boolean;
  adjustedTimestamp: number;
}

// =============================================================================
// PROGRESS TRACKING TYPES
// =============================================================================

export interface ScanStatistics {
  totalScans: number;
  successfulScans: number;
  failedScans: number;
  averageScanTime: number;
  totalPhotosProcessed: number;
  averagePhotosPerScan: number;
  lastScanDate: number;
  errorRate: number;
}

export interface PerformanceMetrics {
  averageProcessingTime: number; // per photo
  memoryUsage: number;
  cpuUsage: number;
  diskIOOperations: number;
  networkRequests: number; // for geocoding
  cacheHitRate: number;
}

// =============================================================================
// ERROR HANDLING TYPES
// =============================================================================

export class MediaScannerError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'MediaScannerError';
  }
}

export class MetadataExtractionError extends MediaScannerError {
  constructor(message: string, public fileUri: string, details?: any) {
    super(message, 'METADATA_EXTRACTION_ERROR', details);
    this.name = 'MetadataExtractionError';
  }
}

export class FileAccessError extends MediaScannerError {
  constructor(message: string, public fileUri: string) {
    super(message, 'FILE_ACCESS_ERROR');
    this.name = 'FileAccessError';
  }
}

export class PermissionError extends MediaScannerError {
  constructor(message: string, public permission: string) {
    super(message, 'PERMISSION_ERROR', { permission });
    this.name = 'PermissionError';
  }
}

// =============================================================================
// CONFIGURATION TYPES
// =============================================================================

export interface ScannerConfiguration {
  defaultBatchSize: number;
  maxFileSize: number;
  supportedFormats: string[];
  metadataProcessing: MetadataProcessingOptions;
  qualityAnalysis: boolean;
  duplicateDetection: boolean;
  thumbnailGeneration: boolean;
  backgroundProcessing: boolean;
  retryConfiguration: {
    maxAttempts: number;
    delayMs: number;
    backoffMultiplier: number;
  };
  performanceSettings: {
    maxConcurrency: number;
    memoryLimit: number;
    timeoutMs: number;
  };
}

export interface ScanHistory {
  scanId: string;
  scanType: 'full' | 'incremental' | 'metadata' | 'location';
  startedAt: number;
  completedAt?: number;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  statistics: {
    totalAssets: number;
    processedAssets: number;
    newPhotos: number;
    updatedPhotos: number;
    errors: number;
  };
  performance: {
    duration: number;
    averageTimePerAsset: number;
    memoryPeak: number;
  };
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

export type ScanPhase = 'initializing' | 'scanning' | 'processing' | 'storing' | 'finalizing';
export type MediaType = 'photo' | 'video';
export type ScanType = 'full' | 'incremental' | 'metadata' | 'location';
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';

// Callback types
export type ProgressCallback = (progress: ScanProgress) => void;
export type CompletionCallback = (result: ScanResult) => void;
export type ErrorCallback = (error: ScanError) => void;
export type BatchProgressCallback = (progress: BatchProgress) => void;

// Function types for dependency injection
export type MetadataExtractorFunction = (asset: MediaAsset) => Promise<ExtractedMetadata>;
export type LocationProcessorFunction = (location: LocationData) => Promise<AddressData>;
export type ThumbnailGeneratorFunction = (uri: string, options: ThumbnailOptions) => Promise<string>;
export type QualityAnalyzerFunction = (asset: MediaAsset) => Promise<QualityMetrics>;

export default {
  ScanOptions,
  ScanProgress,
  ScanResult,
  ScanError,
  ScanStatus,
  MediaAsset,
  ProcessedPhoto,
  ExtractedMetadata,
  ExifData,
  CameraData,
  LocationData,
  AddressData,
  PhotoDimensions,
  ThumbnailOptions,
  ProcessingResult,
  BatchProcessingOptions,
  BatchProgress,
  BatchError,
  BatchResult,
  QualityMetrics,
  DuplicateDetection,
  MetadataProcessingOptions,
  MetadataValidation,
  TimezoneInfo,
  ScanStatistics,
  PerformanceMetrics,
  MediaScannerError,
  MetadataExtractionError,
  FileAccessError,
  PermissionError,
  ScannerConfiguration,
  ScanHistory
};