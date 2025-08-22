// DatabaseService Types - TypeScript interfaces for database records and operations
import type { SQLiteDatabase } from 'expo-sqlite';

export type DatabaseInstance = SQLiteDatabase;

export interface DatabaseInitOptions {
  enableWAL?: boolean;
  cacheSize?: number;
  foreignKeys?: boolean;
}

export interface QueryResult<T = any> {
  rows: T[];
  rowsAffected: number;
  insertId?: number;
}

// =============================================================================
// CORE RECORD TYPES
// =============================================================================

export interface PhotoRecord {
  id: string;
  device_id: string;
  uri: string;
  filename: string;
  file_size: number;
  mime_type: string;
  width: number | null;
  height: number | null;
  creation_time: number; // Unix timestamp
  modification_time: number; // Unix timestamp
  duration: number | null; // For videos, in seconds
  is_favorite: boolean;
  is_deleted: boolean;
  created_at: number; // Unix timestamp
  updated_at: number; // Unix timestamp
}

export interface LocationRecord {
  id: number;
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
  place_name: string | null;
  geocoded_at: number | null; // Unix timestamp
  created_at: number; // Unix timestamp
}

export interface PhotoLocationRecord {
  photo_id: string;
  location_id: number;
  confidence_score: number;
}

export interface MetadataRecord {
  photo_id: string;
  metadata_type: 'exif' | 'custom' | 'ai' | 'system';
  key: string;
  value: string; // JSON string for complex values
  created_at: number; // Unix timestamp
}

export interface AlbumRecord {
  id: string;
  name: string;
  description: string | null;
  type: 'auto' | 'custom' | 'location' | 'date';
  auto_criteria: string | null; // JSON criteria for auto albums
  thumbnail_photo_id: string | null;
  photo_count: number;
  is_hidden: boolean;
  created_at: number; // Unix timestamp
  updated_at: number; // Unix timestamp
}

export interface AlbumPhotoRecord {
  album_id: string;
  photo_id: string;
  added_at: number; // Unix timestamp
}

export interface SettingRecord {
  key: string;
  value: string;
  value_type: 'string' | 'number' | 'boolean' | 'json';
  updated_at: number; // Unix timestamp
}

export interface ScanHistoryRecord {
  id: number;
  scan_type: 'full' | 'incremental' | 'location' | 'metadata';
  started_at: number; // Unix timestamp
  completed_at: number | null; // Unix timestamp
  photos_processed: number;
  photos_added: number;
  photos_updated: number;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  error_message: string | null;
}

// =============================================================================
// QUERY OPTIONS AND FILTERS
// =============================================================================

export interface PhotoQueryOptions {
  limit?: number;
  offset?: number;
  startDate?: number; // Unix timestamp
  endDate?: number; // Unix timestamp
  includeDeleted?: boolean;
  sortBy?: 'creation_time' | 'modification_time' | 'filename' | 'file_size';
  sortOrder?: 'ASC' | 'DESC';
  locationId?: number;
  albumId?: string;
  metadataFilters?: MetadataFilter[];
}

export interface MetadataFilter {
  type: string;
  key: string;
  value: string;
  operator?: 'equals' | 'contains' | 'startsWith' | 'endsWith';
}

export interface LocationQueryOptions {
  bounds?: {
    northEast: { latitude: number; longitude: number };
    southWest: { latitude: number; longitude: number };
  };
  radius?: {
    center: { latitude: number; longitude: number };
    radiusKm: number;
  };
  includePhotoCount?: boolean;
  minPhotoCount?: number;
}

export interface TimelineSection {
  date: string; // YYYY-MM-DD format
  displayDate: string; // Human-readable format
  photos: PhotoRecord[];
  photoCount: number;
  locationSummary?: string[];
}

// =============================================================================
// CLUSTERING AND AGGREGATION TYPES
// =============================================================================

export interface LocationCluster {
  id: string;
  center: {
    latitude: number;
    longitude: number;
  };
  bounds: {
    northEast: { latitude: number; longitude: number };
    southWest: { latitude: number; longitude: number };
  };
  photoCount: number;
  photos: PhotoRecord[];
  displayName: string;
  dateRange: {
    start: number; // Unix timestamp
    end: number; // Unix timestamp
  };
  zoomLevel: number;
}

export interface DateGrouping {
  date: string; // YYYY-MM-DD
  photos: PhotoRecord[];
  photoCount: number;
  firstPhoto: PhotoRecord;
  lastPhoto: PhotoRecord;
  locations: LocationRecord[];
}

// =============================================================================
// BACKUP AND MIGRATION TYPES
// =============================================================================

export interface BackupMetadata {
  version: string;
  timestamp: number;
  photoCount: number;
  locationCount: number;
  metadataCount: number;
  checksums: {
    photos: string;
    locations: string;
    metadata: string;
  };
}

export interface MigrationScript {
  version: number;
  description: string;
  up: string[]; // Array of SQL statements
  down: string[]; // Array of rollback SQL statements
}

export interface DatabaseHealth {
  isConnected: boolean;
  lastVacuum: number | null;
  walFileSize: number;
  pageCount: number;
  freePages: number;
  integrityCheck: boolean;
}

// =============================================================================
// PRIVACY AND SECURITY TYPES
// =============================================================================

export interface PrivacySettings {
  dataRetentionPeriod: number; // Days
  metadataProcessingLevel: 'minimal' | 'standard' | 'full';
  locationPrecision: 'exact' | 'city' | 'region' | 'none';
  automaticBackup: boolean;
  crashReporting: boolean;
  analytics: boolean;
}

export interface ConsentRecord {
  processing_type: string;
  consent_given: boolean;
  consent_timestamp: number;
  consent_version: string;
}

export interface PrivacyAuditLog {
  id: number;
  event_type: 'permission_request' | 'data_access' | 'data_export' | 'data_deletion';
  permission_name?: string;
  status: string;
  timestamp: number;
  details: string; // JSON string
}

// =============================================================================
// ERROR TYPES
// =============================================================================

export class DatabaseError extends Error {
  constructor(
    message: string,
    public code?: string,
    public query?: string,
    public params?: any[]
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class DatabaseConnectionError extends DatabaseError {
  constructor(message: string) {
    super(message, 'CONNECTION_ERROR');
    this.name = 'DatabaseConnectionError';
  }
}

export class DatabaseMigrationError extends DatabaseError {
  constructor(message: string, public version?: number) {
    super(message, 'MIGRATION_ERROR');
    this.name = 'DatabaseMigrationError';
  }
}

export class DatabaseIntegrityError extends DatabaseError {
  constructor(message: string) {
    super(message, 'INTEGRITY_ERROR');
    this.name = 'DatabaseIntegrityError';
  }
}

// =============================================================================
// PERFORMANCE MONITORING TYPES
// =============================================================================

export interface QueryPerformanceMetrics {
  query: string;
  duration: number; // milliseconds
  rowsReturned: number;
  timestamp: number;
  params?: any[];
}

export interface DatabasePerformanceReport {
  averageQueryTime: number;
  slowQueries: QueryPerformanceMetrics[];
  totalQueries: number;
  cacheHitRate: number;
  indexUsage: Record<string, number>;
  generatedAt: number;
}

// =============================================================================
// EXPORT UTILITY TYPES
// =============================================================================

export type CreatePhotoRecord = Omit<PhotoRecord, 'created_at' | 'updated_at'>;
export type UpdatePhotoRecord = Partial<Omit<PhotoRecord, 'id' | 'device_id' | 'created_at'>>;
export type CreateLocationRecord = Omit<LocationRecord, 'id' | 'created_at'>;
export type CreateMetadataRecord = Omit<MetadataRecord, 'created_at'>;
export type CreateAlbumRecord = Omit<AlbumRecord, 'created_at' | 'updated_at' | 'photo_count'>;
export type UpdateAlbumRecord = Partial<Omit<AlbumRecord, 'id' | 'created_at'>>;

// Re-export common types for convenience
export type {
  SQLiteDatabase
} from 'expo-sqlite';