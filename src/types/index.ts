/**
 * ChronoMap Core Types
 * Type definitions for photo organization and privacy-first architecture
 */

export interface PhotoAsset {
  id: string;
  uri: string;
  filename: string;
  width: number;
  height: number;
  creationTime: number;
  modificationTime: number;
  mediaType: 'photo' | 'video';
  mediaSubtypes?: string[];
  albumId?: string;
  location?: LocationData;
  duration?: number; // for videos
}

export interface LocationData {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
}

export interface EXIFData {
  dateTime?: string;
  dateTimeOriginal?: string;
  gps?: {
    latitude: number;
    longitude: number;
    altitude?: number;
    timestamp?: string;
  };
  camera?: {
    make?: string;
    model?: string;
    software?: string;
  };
  settings?: {
    exposureTime?: string;
    fNumber?: number;
    iso?: number;
    focalLength?: number;
    flash?: boolean;
  };
  dimensions?: {
    width: number;
    height: number;
    orientation?: number;
  };
}

export interface PhotoMetadata {
  id: string;
  assetId: string;
  filePath: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  width: number;
  height: number;
  createdAt: Date;
  modifiedAt: Date;
  scannedAt: Date;
  thumbnailPath?: string;
  location?: LocationData;
  exifData?: EXIFData;
  isDeleted: boolean;
  checksum?: string;
}

export interface ScanProgress {
  totalPhotos: number;
  processedPhotos: number;
  currentPhoto?: string;
  stage: 'scanning' | 'processing' | 'indexing' | 'complete' | 'error';
  percentage: number;
  error?: string;
}

export interface DatabaseSchema {
  photos: PhotoMetadata;
  locations: {
    id: string;
    latitude: number;
    longitude: number;
    address?: string;
    city?: string;
    region?: string;
    country?: string;
    createdAt: Date;
  };
  photo_locations: {
    photoId: string;
    locationId: string;
  };
  metadata: {
    photoId: string;
    key: string;
    value: string;
    type: 'string' | 'number' | 'boolean' | 'json';
  };
}

export interface PermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  status: 'granted' | 'denied' | 'undetermined';
}

export interface AppPermissions {
  mediaLibrary: PermissionStatus;
  location: PermissionStatus;
}

export type ErrorCode = 
  | 'PERMISSION_DENIED'
  | 'DATABASE_ERROR'
  | 'SCAN_INTERRUPTED'
  | 'FILE_ACCESS_ERROR'
  | 'METADATA_EXTRACTION_ERROR'
  | 'STORAGE_FULL'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';

export interface AppError {
  code: ErrorCode;
  message: string;
  details?: any;
  timestamp: Date;
}

// Database Service Types
export interface DatabaseConfig {
  name: string;
  version: number;
  encryptionKey?: string;
}

export interface QueryResult<T = any> {
  rows: T[];
  affectedRows: number;
  insertId?: number;
}

// Location Service Types
export interface GeocodeResult {
  address: string;
  city?: string;
  region?: string;
  country?: string;
  postalCode?: string;
  confidence: number;
}

export interface LocationCluster {
  id: string;
  centerLatitude: number;
  centerLongitude: number;
  radius: number; // in meters
  photoCount: number;
  displayName: string;
  confidence: number;
}

export interface LocationValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  normalizedLocation?: LocationData;
}

// Privacy Manager Types
export interface PrivacySettings {
  allowLocationExtraction: boolean;
  allowMetadataExtraction: boolean;
  sanitizeEXIFBeforeSharing: boolean;
  removeLocationFromShares: boolean;
  allowCrashReporting: boolean;
  allowAnalytics: boolean;
  dataRetentionDays: number;
  autoDeleteEnabled: boolean;
}

export interface DataExportOptions {
  includePhotos: boolean;
  includeMetadata: boolean;
  includeLocation: boolean;
  includeThumbnails: boolean;
  format: 'json' | 'csv' | 'xml';
  sanitizeData: boolean;
}

export interface PrivacyAuditResult {
  timestamp: Date;
  externalConnectionsDetected: number;
  dataLeaksFound: string[];
  complianceStatus: 'compliant' | 'warning' | 'violation';
  recommendations: string[];
}

export interface ConsentRecord {
  feature: string;
  granted: boolean;
  timestamp: Date;
  version: string; // Privacy policy version
}

// EXIF Processor Types
export interface ProcessedMetadata {
  exifData: EXIFData;
  extractedLocation?: LocationData;
  creationDate: Date;
  modificationDate: Date;
  timezone?: string;
}

// Timeline Types
export type TimelineGrouping = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface DateSection {
  date: string; // YYYY-MM-DD format
  displayDate: string; // Human-readable format
  photos: PhotoAsset[];
  count: number;
  startDate: Date;
  endDate: Date;
  grouping: TimelineGrouping;
}

export interface TimelinePhoto extends PhotoAsset {
  sectionId: string;
  indexInSection: number;
  thumbnailUri?: string;
  isVisible: boolean;
}

export interface TimelineSlice {
  startIndex: number;
  endIndex: number;
  sections: DateSection[];
  totalPhotos: number;
  estimatedHeight: number;
  cacheKey: string;
}

export interface TimelinePosition {
  sectionIndex: number;
  photoIndex: number;
  scrollOffset: number;
  date: Date;
  timestamp: number;
}

export interface TimelineCache {
  key: string;
  data: DateSection[] | TimelineSlice | PhotoAsset[] | TimelinePhoto[];
  timestamp: number;
  accessCount: number;
  size: number; // bytes
}

export interface TimelineQuery {
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
  grouping?: TimelineGrouping;
  sortOrder?: 'asc' | 'desc';
  includeLocation?: boolean;
  onlyFavorites?: boolean;
}

export interface TimelineMetrics {
  totalSections: number;
  totalPhotos: number;
  dateRange: { start: Date; end: Date };
  cacheSize: number;
  averagePhotosPerSection: number;
  memoryUsage: number;
}

// Navigation Types
export type RootStackParamList = {
  Onboarding: undefined;
  Timeline: undefined;
  Map: undefined;
  Settings: undefined;
};