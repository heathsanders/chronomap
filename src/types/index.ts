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