# ChronoMap: Technical Architecture Specifications
## Privacy-First Photo Organization Mobile App

---

## Executive Summary

### Project Overview
ChronoMap is a React Native/Expo mobile application that provides privacy-first photo organization through timeline and interactive map interfaces. The app processes all data on-device, organizing photos/videos into virtual albums based on date and location metadata without compromising user privacy.

### Key Architectural Decisions
- **React Native/Expo Framework**: Chosen for cross-platform development efficiency while maintaining native performance
- **On-Device Processing**: All photo analysis, metadata extraction, and organization happens locally
- **SQLite Database**: Local data persistence with encryption for privacy and performance
- **Offline-First Architecture**: Core functionality works without internet connectivity
- **Privacy-by-Design**: No external data transmission, local-only processing

### Technology Stack Summary
- **Frontend**: React Native 0.74+ with Expo SDK 51+
- **Database**: SQLite with SQLCipher encryption
- **State Management**: Zustand with React Query for caching
- **Image Processing**: React Native Fast Image with custom optimization
- **Maps**: React Native Maps with offline tile caching
- **Build System**: Expo Application Services (EAS) Build

### System Component Overview
- **Media Scanner Service**: Processes device photo library and extracts metadata
- **Location Service**: Handles GPS data and offline geocoding
- **Timeline Engine**: Manages chronological photo organization and navigation
- **Map Clustering Engine**: Groups photos geographically with dynamic clustering
- **Local Database**: Encrypted storage for photo metadata and user preferences
- **Privacy Manager**: Ensures all processing remains on-device

### Critical Technical Constraints
- **Performance Target**: Support 50,000+ photos with <3 second app launch
- **Memory Management**: <200MB RAM usage during normal operation
- **Privacy Requirement**: Zero external data transmission of photo content
- **Platform Support**: iOS 14+ and Android API 30+ (Android 11+)

---

## 1. System Architecture Design

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    ChronoMap Mobile App                          │
├─────────────────────────────────────────────────────────────────┤
│                     Presentation Layer                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Timeline UI   │  │    Map UI       │  │  Settings UI    │ │
│  │  - Photo Grid   │  │  - Clustering   │  │  - Privacy      │ │
│  │  - Date Nav     │  │  - Markers      │  │  - Preferences  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                     State Management                            │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              Zustand Store + React Query                    │ │
│  │  - Photo State   - UI State   - Settings   - Cache Layer   │ │
│  └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                      Business Logic                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────┐ │
│  │ Media Scanner│ │ Timeline Eng.│ │ Map Clustering│ │Location │ │
│  │ - Scan Lib   │ │ - Date Group │ │ - Geo Group   │ │Service  │ │
│  │ - Metadata   │ │ - Sorting    │ │ - Cluster Mgr │ │- Geocode│ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └─────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                       Data Layer                                │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                   SQLite Database                            │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────┐ │ │
│  │  │   Photos    │ │  Locations  │ │  Metadata   │ │Settings │ │ │
│  │  │    Table    │ │    Table    │ │    Table    │ │  Table  │ │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────┘ │ │
│  └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                      Platform Layer                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────┐ │
│  │ Media Library│ │  File System │ │   Device GPS │ │Encrypted│ │
│  │    Access    │ │   Storage    │ │   Location   │ │Storage  │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └─────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Component Relationships and Data Flow

#### 1. Media Scanner Service Flow
```
Device Photo Library → Permission Check → Batch Scanning → 
Metadata Extraction → Location Processing → Database Storage → 
UI State Update → User Notification
```

#### 2. Timeline Navigation Flow
```
User Scroll Input → Date Calculation → Photo Query → 
Thumbnail Loading → Virtual List Rendering → 
Performance Monitoring → Memory Cleanup
```

#### 3. Map Clustering Flow
```
Location Data Query → Viewport Calculation → 
Clustering Algorithm → Marker Generation → 
Map Rendering → User Interaction → Photo Preview
```

### Module Organization Structure

```
src/
├── components/           # Reusable UI components
│   ├── common/          # Cross-feature components
│   ├── timeline/        # Timeline-specific components
│   ├── map/            # Map-specific components
│   └── forms/          # Form and input components
├── screens/            # Screen-level components
│   ├── TimelineScreen/
│   ├── MapScreen/
│   ├── SettingsScreen/
│   └── OnboardingScreen/
├── services/           # Business logic services
│   ├── MediaScanner/
│   ├── LocationService/
│   ├── DatabaseService/
│   └── PrivacyManager/
├── stores/             # State management
│   ├── photoStore.js
│   ├── settingsStore.js
│   └── uiStore.js
├── utils/              # Utility functions
│   ├── imageProcessing/
│   ├── dateHelpers/
│   ├── geoHelpers/
│   └── performance/
├── hooks/              # Custom React hooks
│   ├── usePhotoLibrary/
│   ├── useTimeline/
│   └── useMapClustering/
└── config/             # Configuration files
    ├── database.js
    ├── performance.js
    └── privacy.js
```

### Privacy-First Architectural Decisions

#### 1. Local-Only Processing
- **No Cloud Dependencies**: All photo analysis happens on-device
- **Zero Network Transmission**: Photo data never leaves the device
- **Local Encryption**: Database and cache encrypted at rest
- **Privacy Indicators**: Clear UI confirmation of local processing

#### 2. Secure Data Handling
- **Encrypted Storage**: SQLCipher for database encryption
- **Memory Protection**: Secure memory handling for sensitive data
- **File System Security**: Sandbox isolation for app data
- **Permission Management**: Minimal required permissions with clear justification

#### 3. Privacy Controls
- **Data Deletion**: Complete removal of processed data on demand
- **Processing Transparency**: Clear indication of what data is processed
- **User Consent**: Explicit consent for each data processing operation
- **Audit Trail**: Local logging of privacy-related operations (opt-in)

---

## 2. Technology Stack Recommendations

### React Native/Expo Framework Choices

#### Core Framework Decision: Expo SDK 51+ with React Native 0.74+
**Rationale**: 
- Provides managed workflow for easier development and deployment
- Access to native APIs through Expo modules
- Excellent performance for photo-heavy applications
- Built-in over-the-air updates for non-native changes
- Strong community support and regular updates

#### Key Dependencies:

```json
{
  "dependencies": {
    "@expo/vector-icons": "^14.0.0",
    "@react-navigation/native": "^6.1.0",
    "@react-navigation/stack": "^6.3.0",
    "@shopify/flash-list": "^1.6.0",
    "expo": "~51.0.0",
    "expo-media-library": "~16.0.0",
    "expo-location": "~17.0.0",
    "expo-file-system": "~17.0.0",
    "expo-sqlite": "~14.0.0",
    "react": "18.2.0",
    "react-native": "0.74.0",
    "react-native-fast-image": "^8.6.0",
    "react-native-maps": "^1.14.0",
    "react-native-gesture-handler": "~2.16.0",
    "react-native-reanimated": "~3.10.0",
    "react-query": "^3.39.0",
    "zustand": "^4.5.0"
  }
}
```

### On-Device Database Solution: SQLite with SQLCipher

#### Primary Database: Expo SQLite with Encryption
**Rationale**:
- Lightweight and performant for mobile applications
- Built-in encryption support through SQLCipher
- Excellent support for complex queries needed for photo organization
- No network dependency, truly offline-first
- Battle-tested in production mobile applications

#### Database Configuration:
```javascript
// config/database.js
import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

const DATABASE_NAME = 'chronomap.db';
const DATABASE_VERSION = 1;

export const initializeDatabase = async () => {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME, {
    enableChangeListener: true,
    useNewConnection: true,
    encryptionKey: await getSecureEncryptionKey(), // From secure storage
  });
  
  // Enable WAL mode for better performance
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA synchronous = NORMAL;');
  await db.execAsync('PRAGMA cache_size = 10000;');
  await db.execAsync('PRAGMA temp_store = memory;');
  
  return db;
};
```

### Image Processing Libraries

#### React Native Fast Image
**Purpose**: High-performance image loading and caching
**Rationale**:
- Superior caching compared to built-in Image component
- Priority-based loading for better UX
- Memory-efficient handling of large photo libraries
- Support for various image formats and resize modes

#### Custom Image Processing Service:
```javascript
// services/ImageProcessing/ImageProcessor.js
import FastImage from 'react-native-fast-image';
import { ImageManipulator } from 'expo-image-manipulator';

class ImageProcessor {
  static thumbnailCache = new Map();
  
  static async generateThumbnail(uri, size = 200) {
    const cacheKey = `${uri}_${size}`;
    if (this.thumbnailCache.has(cacheKey)) {
      return this.thumbnailCache.get(cacheKey);
    }
    
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: size, height: size } }],
      { 
        compress: 0.8, 
        format: ImageManipulator.SaveFormat.JPEG,
        base64: false
      }
    );
    
    this.thumbnailCache.set(cacheKey, result.uri);
    return result.uri;
  }
  
  static preloadImages(uris) {
    FastImage.preload(
      uris.map(uri => ({
        uri,
        priority: FastImage.priority.normal,
      }))
    );
  }
}
```

### Map Integration: React Native Maps with Offline Support

#### Core Map Library: React Native Maps
**Rationale**:
- Native map performance on both iOS and Android
- Support for custom markers and clustering
- Offline tile caching capabilities
- Extensive customization options
- Large community and good maintenance

#### Offline Map Configuration:
```javascript
// services/MapService/OfflineMapManager.js
import MapboxGL from '@rnmapbox/maps';
import { FileSystem } from 'expo-file-system';

class OfflineMapManager {
  static async downloadOfflineMaps(regions) {
    for (const region of regions) {
      const offlinePack = await MapboxGL.offlineManager.createPack({
        name: region.name,
        styleURL: MapboxGL.StyleURL.Street,
        bounds: region.bounds,
        minZoom: 8,
        maxZoom: 15,
      });
      
      await this.trackDownloadProgress(offlinePack);
    }
  }
  
  static async getAvailableOfflineMaps() {
    return await MapboxGL.offlineManager.getPacks();
  }
}
```

### Performance Optimization Libraries

#### State Management: Zustand + React Query
**Rationale**:
- Zustand: Lightweight, performant state management
- React Query: Excellent caching and background sync capabilities
- Perfect combination for photo-heavy applications
- Minimal boilerplate compared to Redux

#### Virtual List Rendering: @shopify/flash-list
**Rationale**:
- Superior performance compared to FlatList for large datasets
- Better memory management for photo grids
- Smooth scrolling with 50,000+ items
- Automatic size estimation and recycling

#### Animation: React Native Reanimated 3
**Rationale**:
- 60fps animations running on UI thread
- Perfect for smooth map interactions and timeline scrolling
- Excellent gesture integration
- Memory efficient for photo transitions

---

## 3. Data Architecture

### Database Schema Design

#### Core Entity Relationships:
```sql
-- Photos table (primary entity)
CREATE TABLE photos (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  uri TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  creation_time INTEGER NOT NULL, -- Unix timestamp
  modification_time INTEGER NOT NULL,
  duration INTEGER, -- For videos
  is_favorite BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now')),
  UNIQUE(device_id, uri)
);

-- Locations table (normalized location data)
CREATE TABLE locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  altitude REAL,
  accuracy REAL,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  postal_code TEXT,
  place_name TEXT,
  geocoded_at INTEGER,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  UNIQUE(latitude, longitude, city)
);

-- Photo_locations (many-to-many relationship)
CREATE TABLE photo_locations (
  photo_id TEXT NOT NULL,
  location_id INTEGER NOT NULL,
  confidence_score REAL DEFAULT 1.0,
  PRIMARY KEY (photo_id, location_id),
  FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
);

-- Metadata table (flexible EXIF and other metadata)
CREATE TABLE photo_metadata (
  photo_id TEXT NOT NULL,
  metadata_type TEXT NOT NULL, -- 'exif', 'custom', 'ai'
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  PRIMARY KEY (photo_id, metadata_type, key),
  FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE
);

-- Albums table (virtual albums for organization)
CREATE TABLE albums (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'custom', -- 'auto', 'custom', 'location', 'date'
  auto_criteria TEXT, -- JSON criteria for auto albums
  thumbnail_photo_id TEXT,
  photo_count INTEGER DEFAULT 0,
  is_hidden BOOLEAN DEFAULT FALSE,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (thumbnail_photo_id) REFERENCES photos(id)
);

-- Album_photos (many-to-many relationship)
CREATE TABLE album_photos (
  album_id TEXT NOT NULL,
  photo_id TEXT NOT NULL,
  added_at INTEGER DEFAULT (strftime('%s', 'now')),
  PRIMARY KEY (album_id, photo_id),
  FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE,
  FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE
);

-- User settings and preferences
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  value_type TEXT NOT NULL DEFAULT 'string', -- 'string', 'number', 'boolean', 'json'
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Scan history and progress tracking
CREATE TABLE scan_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scan_type TEXT NOT NULL, -- 'full', 'incremental', 'location'
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  photos_processed INTEGER DEFAULT 0,
  photos_added INTEGER DEFAULT 0,
  photos_updated INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'running', -- 'running', 'completed', 'failed'
  error_message TEXT
);
```

#### Performance Indexes:
```sql
-- Primary performance indexes
CREATE INDEX idx_photos_creation_time ON photos(creation_time DESC);
CREATE INDEX idx_photos_device_deleted ON photos(device_id, is_deleted);
CREATE INDEX idx_locations_coordinates ON locations(latitude, longitude);
CREATE INDEX idx_photo_locations_photo ON photo_locations(photo_id);
CREATE INDEX idx_photo_locations_location ON photo_locations(location_id);
CREATE INDEX idx_metadata_photo_type ON photo_metadata(photo_id, metadata_type);
CREATE INDEX idx_albums_type ON albums(type, is_hidden);
CREATE INDEX idx_album_photos_album ON album_photos(album_id);

-- Composite indexes for common queries
CREATE INDEX idx_photos_time_location ON photos(creation_time DESC, id) 
  WHERE EXISTS(SELECT 1 FROM photo_locations WHERE photo_id = photos.id);
CREATE INDEX idx_locations_search ON locations(city, state, country) 
  WHERE city IS NOT NULL;
```

### Metadata Extraction and Storage Patterns

#### EXIF Data Processing:
```javascript
// services/MetadataExtractor/EXIFProcessor.js
import { getImageMetadata } from 'expo-media-library';
import { Asset } from 'expo-media-library';

class EXIFProcessor {
  static async extractMetadata(asset) {
    try {
      const metadata = await getImageMetadata(asset.uri);
      
      return {
        camera: {
          make: metadata.exif?.Make,
          model: metadata.exif?.Model,
          lens: metadata.exif?.LensModel,
        },
        settings: {
          fNumber: metadata.exif?.FNumber,
          exposureTime: metadata.exif?.ExposureTime,
          iso: metadata.exif?.ISO,
          focalLength: metadata.exif?.FocalLength,
        },
        location: {
          latitude: metadata.gps?.latitude,
          longitude: metadata.gps?.longitude,
          altitude: metadata.gps?.altitude,
          timestamp: metadata.gps?.timestamp,
        },
        timestamp: {
          created: metadata.exif?.DateTime,
          digitized: metadata.exif?.DateTimeDigitized,
          modified: metadata.exif?.DateTimeModified,
        }
      };
    } catch (error) {
      console.warn('EXIF extraction failed:', error);
      return null;
    }
  }
  
  static async batchExtractMetadata(assets, batchSize = 50) {
    const results = [];
    
    for (let i = 0; i < assets.length; i += batchSize) {
      const batch = assets.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map(asset => this.extractMetadata(asset))
      );
      
      results.push(...batchResults);
      
      // Allow UI thread to update between batches
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    return results;
  }
}
```

### Indexing Strategies for Large Photo Libraries

#### Database Performance Optimization:
```javascript
// services/DatabaseService/PerformanceOptimizer.js
class DatabasePerformanceOptimizer {
  static async optimizeForLargeLibraries(db) {
    // Analyze query patterns and create optimal indexes
    await this.analyzeQueryPerformance(db);
    
    // Partition large tables by date for better performance
    await this.createDatePartitions(db);
    
    // Implement query result caching
    await this.setupQueryCache(db);
    
    // Regular maintenance tasks
    await this.scheduleMaintenance(db);
  }
  
  static async createDatePartitions(db) {
    // Create monthly partitions for large photo libraries
    const currentYear = new Date().getFullYear();
    
    for (let year = currentYear - 5; year <= currentYear; year++) {
      for (let month = 1; month <= 12; month++) {
        const partitionName = `photos_${year}_${month.toString().padStart(2, '0')}`;
        const startDate = new Date(year, month - 1, 1).getTime() / 1000;
        const endDate = new Date(year, month, 0).getTime() / 1000;
        
        await db.execAsync(`
          CREATE VIEW IF NOT EXISTS ${partitionName} AS 
          SELECT * FROM photos 
          WHERE creation_time >= ${startDate} 
          AND creation_time < ${endDate}
        `);
      }
    }
  }
  
  static async setupQueryCache(db) {
    // Implement intelligent query result caching
    const commonQueries = [
      'recent_photos', 'location_clusters', 'monthly_counts'
    ];
    
    for (const queryType of commonQueries) {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS cache_${queryType} (
          cache_key TEXT PRIMARY KEY,
          result TEXT NOT NULL,
          expires_at INTEGER NOT NULL,
          created_at INTEGER DEFAULT (strftime('%s', 'now'))
        )
      `);
    }
  }
}
```

### Local Data Persistence and Backup Strategies

#### Automated Backup System:
```javascript
// services/BackupService/LocalBackupManager.js
import { FileSystem } from 'expo-file-system';
import { SQLite } from 'expo-sqlite';

class LocalBackupManager {
  static async createBackup() {
    const timestamp = Date.now();
    const backupPath = `${FileSystem.documentDirectory}backups/backup_${timestamp}.db`;
    
    try {
      // Ensure backup directory exists
      await FileSystem.makeDirectoryAsync(
        `${FileSystem.documentDirectory}backups/`,
        { intermediates: true }
      );
      
      // Create database backup using SQLite backup API
      const db = await SQLite.openDatabaseAsync('chronomap.db');
      await db.execAsync(`
        ATTACH DATABASE '${backupPath}' AS backup_db;
        INSERT INTO backup_db.photos SELECT * FROM photos;
        INSERT INTO backup_db.locations SELECT * FROM locations;
        INSERT INTO backup_db.photo_locations SELECT * FROM photo_locations;
        INSERT INTO backup_db.photo_metadata SELECT * FROM photo_metadata;
        INSERT INTO backup_db.albums SELECT * FROM albums;
        INSERT INTO backup_db.album_photos SELECT * FROM album_photos;
        INSERT INTO backup_db.settings SELECT * FROM settings;
        DETACH DATABASE backup_db;
      `);
      
      return backupPath;
    } catch (error) {
      console.error('Backup creation failed:', error);
      throw error;
    }
  }
  
  static async restoreFromBackup(backupPath) {
    try {
      const db = await SQLite.openDatabaseAsync('chronomap.db');
      
      // Verify backup integrity
      await this.verifyBackupIntegrity(backupPath);
      
      // Restore from backup
      await db.execAsync(`
        ATTACH DATABASE '${backupPath}' AS restore_db;
        DELETE FROM photos;
        DELETE FROM locations;
        DELETE FROM photo_locations;
        DELETE FROM photo_metadata;
        DELETE FROM albums;
        DELETE FROM album_photos;
        DELETE FROM settings;
        
        INSERT INTO photos SELECT * FROM restore_db.photos;
        INSERT INTO locations SELECT * FROM restore_db.locations;
        INSERT INTO photo_locations SELECT * FROM restore_db.photo_locations;
        INSERT INTO photo_metadata SELECT * FROM restore_db.photo_metadata;
        INSERT INTO albums SELECT * FROM restore_db.albums;
        INSERT INTO album_photos SELECT * FROM restore_db.album_photos;
        INSERT INTO settings SELECT * FROM restore_db.settings;
        
        DETACH DATABASE restore_db;
      `);
      
      return true;
    } catch (error) {
      console.error('Backup restoration failed:', error);
      throw error;
    }
  }
  
  static async cleanupOldBackups(maxBackups = 5) {
    const backupDir = `${FileSystem.documentDirectory}backups/`;
    const backups = await FileSystem.readDirectoryAsync(backupDir);
    
    if (backups.length > maxBackups) {
      const backupFiles = backups
        .filter(file => file.startsWith('backup_'))
        .sort()
        .slice(0, -maxBackups);
      
      for (const file of backupFiles) {
        await FileSystem.deleteAsync(`${backupDir}${file}`);
      }
    }
  }
}
```

---

## 4. API Contracts & Interfaces

### Internal Service Interfaces

#### Photo Scanning Service Interface:
```typescript
// services/MediaScanner/types.ts
interface MediaScannerService {
  // Core scanning operations
  startFullScan(options?: ScanOptions): Promise<ScanResult>;
  startIncrementalScan(): Promise<ScanResult>;
  pauseScan(): Promise<void>;
  resumeScan(): Promise<void>;
  cancelScan(): Promise<void>;
  
  // Progress monitoring
  onScanProgress(callback: (progress: ScanProgress) => void): () => void;
  onScanComplete(callback: (result: ScanResult) => void): () => void;
  onScanError(callback: (error: ScanError) => void): () => void;
  
  // Status queries
  getScanStatus(): Promise<ScanStatus>;
  getLastScanResult(): Promise<ScanResult | null>;
}

interface ScanOptions {
  includeVideos?: boolean;
  batchSize?: number;
  includeHidden?: boolean;
  maxFileSize?: number; // in bytes
  supportedFormats?: string[];
}

interface ScanProgress {
  phase: 'scanning' | 'processing' | 'saving';
  totalItems: number;
  processedItems: number;
  currentItem?: string;
  estimatedTimeRemaining?: number;
  errors: ScanError[];
}

interface ScanResult {
  scanId: string;
  startedAt: number;
  completedAt: number;
  totalPhotos: number;
  newPhotos: number;
  updatedPhotos: number;
  errors: ScanError[];
  status: 'completed' | 'failed' | 'cancelled';
}

interface ScanError {
  type: 'permission' | 'file_access' | 'metadata' | 'database';
  message: string;
  fileUri?: string;
  timestamp: number;
}
```

#### Timeline Service Interface:
```typescript
// services/Timeline/types.ts
interface TimelineService {
  // Photo retrieval
  getPhotosForDateRange(
    startDate: Date, 
    endDate: Date, 
    options?: TimelineOptions
  ): Promise<TimelinePhoto[]>;
  
  getPhotosByMonth(year: number, month: number): Promise<TimelinePhoto[]>;
  getPhotosByYear(year: number): Promise<TimelinePhoto[]>;
  
  // Timeline navigation
  getDateSections(options?: SectionOptions): Promise<DateSection[]>;
  getPhotosAroundDate(
    date: Date, 
    radius: number
  ): Promise<TimelinePhoto[]>;
  
  // Performance optimizations
  preloadPhotoThumbnails(photoIds: string[]): Promise<void>;
  getVisiblePhotosForViewport(
    viewport: TimelineViewport
  ): Promise<TimelinePhoto[]>;
}

interface TimelineOptions {
  includeLocation?: boolean;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  thumbnailSize?: 'small' | 'medium' | 'large';
}

interface TimelinePhoto {
  id: string;
  uri: string;
  thumbnailUri: string;
  creationTime: Date;
  location?: PhotoLocation;
  metadata?: PhotoMetadata;
  aspectRatio: number;
  fileSize: number;
}

interface DateSection {
  date: string; // ISO date string
  displayDate: string; // Formatted for UI
  photoCount: number;
  firstPhotoUri?: string;
  locationSummary?: string[];
}

interface TimelineViewport {
  startIndex: number;
  endIndex: number;
  visibleDateRange: {
    start: Date;
    end: Date;
  };
}
```

### Metadata Extraction Service Contracts

#### Location Processing Service:
```typescript
// services/LocationService/types.ts
interface LocationService {
  // Geocoding operations
  reverseGeocode(
    latitude: number, 
    longitude: number
  ): Promise<LocationData>;
  
  batchReverseGeocode(
    coordinates: Coordinate[]
  ): Promise<LocationData[]>;
  
  // Location clustering
  clusterPhotosByLocation(
    photos: PhotoLocation[]
  ): Promise<LocationCluster[]>;
  
  getPhotosInRadius(
    center: Coordinate, 
    radiusKm: number
  ): Promise<PhotoLocation[]>;
  
  // Offline support
  cacheLocationData(locations: LocationData[]): Promise<void>;
  getOfflineLocationData(coordinates: Coordinate): Promise<LocationData | null>;
}

interface Coordinate {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
}

interface LocationData {
  coordinate: Coordinate;
  address: {
    streetNumber?: string;
    streetName?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  placeName?: string;
  category?: string; // 'restaurant', 'park', 'landmark', etc.
  confidence: number; // 0-1
  source: 'device' | 'offline' | 'online';
  lastUpdated: Date;
}

interface LocationCluster {
  id: string;
  center: Coordinate;
  radius: number; // in meters
  photos: PhotoLocation[];
  displayName: string;
  photoCount: number;
  dateRange: {
    start: Date;
    end: Date;
  };
}

interface PhotoLocation {
  photoId: string;
  coordinate: Coordinate;
  locationData?: LocationData;
  timestamp: Date;
}
```

### Map Integration APIs

#### Map Clustering Service:
```typescript
// services/MapService/types.ts
interface MapClusteringService {
  // Clustering operations
  generateClusters(
    photos: PhotoLocation[], 
    viewport: MapViewport,
    options?: ClusterOptions
  ): Promise<MapCluster[]>;
  
  updateClustersForViewport(
    viewport: MapViewport
  ): Promise<MapCluster[]>;
  
  // Marker management
  getMarkersForZoomLevel(zoomLevel: number): Promise<MapMarker[]>;
  getPhotoMarkersInBounds(bounds: MapBounds): Promise<PhotoMarker[]>;
  
  // Performance optimization
  precomputeClustersForRegion(bounds: MapBounds): Promise<void>;
  clearClusterCache(): Promise<void>;
}

interface MapViewport {
  bounds: MapBounds;
  zoomLevel: number;
  center: Coordinate;
}

interface MapBounds {
  northeast: Coordinate;
  southwest: Coordinate;
}

interface ClusterOptions {
  maxZoom: number;
  radius: number; // clustering radius in pixels
  minPoints: number; // minimum points to form cluster
  algorithm: 'grid' | 'kmeans' | 'hierarchical';
}

interface MapCluster {
  id: string;
  coordinate: Coordinate;
  photoCount: number;
  photos: PhotoLocation[];
  bounds: MapBounds;
  zoomLevel: number;
  displayText: string;
  clusterSize: 'small' | 'medium' | 'large';
}

interface MapMarker {
  id: string;
  coordinate: Coordinate;
  type: 'cluster' | 'photo';
  data: MapCluster | PhotoLocation;
}

interface PhotoMarker extends MapMarker {
  type: 'photo';
  data: PhotoLocation;
  thumbnailUri: string;
}
```

### Timeline Generation APIs

#### Timeline Engine Interface:
```typescript
// services/Timeline/TimelineEngine.ts
interface TimelineEngine {
  // Timeline generation
  generateTimeline(
    photos: TimelinePhoto[], 
    options?: TimelineGenerationOptions
  ): Promise<Timeline>;
  
  generateDateSections(
    photos: TimelinePhoto[]
  ): Promise<DateSection[]>;
  
  // Navigation helpers
  findPhotoInTimeline(
    photoId: string, 
    timeline: Timeline
  ): Promise<TimelinePosition>;
  
  getTimelineSlice(
    position: TimelinePosition, 
    windowSize: number
  ): Promise<TimelineSlice>;
  
  // Performance optimization
  virtualizeTimeline(
    timeline: Timeline, 
    viewport: TimelineViewport
  ): Promise<VirtualizedTimeline>;
}

interface TimelineGenerationOptions {
  groupingStrategy: 'daily' | 'weekly' | 'monthly' | 'smart';
  sortOrder: 'chronological' | 'reverse-chronological';
  includeLocation: boolean;
  thumbnailSize: 'small' | 'medium' | 'large';
  maxItemsPerSection: number;
}

interface Timeline {
  id: string;
  sections: DateSection[];
  totalPhotos: number;
  dateRange: {
    start: Date;
    end: Date;
  };
  generatedAt: Date;
  options: TimelineGenerationOptions;
}

interface TimelinePosition {
  sectionIndex: number;
  photoIndex: number;
  date: Date;
  scrollOffset: number;
}

interface TimelineSlice {
  sections: DateSection[];
  startPosition: TimelinePosition;
  endPosition: TimelinePosition;
  totalItems: number;
}

interface VirtualizedTimeline extends Timeline {
  visibleSections: DateSection[];
  preloadedSections: DateSection[];
  viewportInfo: TimelineViewport;
}
```

---

## 5. Performance & Scalability Architecture

### Architecture for Handling 50,000+ Photos

#### Memory Management Strategy:
```javascript
// services/MemoryManager/PhotoMemoryManager.js
class PhotoMemoryManager {
  constructor() {
    this.thumbnailCache = new Map(); // LRU cache for thumbnails
    this.photoCache = new Map(); // Full-size photo cache
    this.maxMemoryUsage = 200 * 1024 * 1024; // 200MB limit
    this.currentMemoryUsage = 0;
  }
  
  async loadPhoto(photoId, size = 'medium') {
    const cacheKey = `${photoId}_${size}`;
    
    if (this.photoCache.has(cacheKey)) {
      this.updateLRU(cacheKey);
      return this.photoCache.get(cacheKey);
    }
    
    // Check memory usage before loading
    if (this.currentMemoryUsage > this.maxMemoryUsage * 0.8) {
      await this.cleanupCache();
    }
    
    const photo = await this.loadPhotoFromStorage(photoId, size);
    const photoSize = this.estimatePhotoMemorySize(photo);
    
    this.photoCache.set(cacheKey, photo);
    this.currentMemoryUsage += photoSize;
    
    return photo;
  }
  
  async cleanupCache() {
    // Remove least recently used items
    const sortedEntries = Array.from(this.photoCache.entries())
      .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
    
    const itemsToRemove = sortedEntries.slice(0, sortedEntries.length / 3);
    
    for (const [key, photo] of itemsToRemove) {
      this.photoCache.delete(key);
      this.currentMemoryUsage -= this.estimatePhotoMemorySize(photo);
    }
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }
  
  estimatePhotoMemorySize(photo) {
    // Rough estimation based on dimensions and format
    const { width, height } = photo;
    return width * height * 4; // 4 bytes per pixel for RGBA
  }
}
```

#### Database Query Optimization:
```javascript
// services/DatabaseService/QueryOptimizer.js
class QueryOptimizer {
  static async getPhotosWithPagination(offset, limit, filters = {}) {
    const { startDate, endDate, location, sortBy = 'creation_time' } = filters;
    
    let query = `
      SELECT 
        p.id, p.uri, p.filename, p.creation_time,
        l.city, l.country, l.latitude, l.longitude
      FROM photos p
      LEFT JOIN photo_locations pl ON p.id = pl.photo_id
      LEFT JOIN locations l ON pl.location_id = l.id
      WHERE p.is_deleted = false
    `;
    
    const params = [];
    
    if (startDate && endDate) {
      query += ` AND p.creation_time BETWEEN ? AND ?`;
      params.push(startDate.getTime() / 1000, endDate.getTime() / 1000);
    }
    
    if (location) {
      query += ` AND l.city = ?`;
      params.push(location);
    }
    
    query += ` ORDER BY p.${sortBy} DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    
    const db = await SQLite.openDatabaseAsync('chronomap.db');
    return await db.getAllAsync(query, params);
  }
  
  static async getLocationClusters(bounds, zoomLevel) {
    // Use spatial queries for efficient clustering
    const { north, south, east, west } = bounds;
    const clusterSize = this.getClusterSizeForZoom(zoomLevel);
    
    const query = `
      SELECT 
        ROUND(l.latitude / ?) * ? as cluster_lat,
        ROUND(l.longitude / ?) * ? as cluster_lng,
        COUNT(*) as photo_count,
        MIN(p.creation_time) as earliest_photo,
        MAX(p.creation_time) as latest_photo,
        GROUP_CONCAT(p.id, ',') as photo_ids
      FROM photos p
      JOIN photo_locations pl ON p.id = pl.photo_id
      JOIN locations l ON pl.location_id = l.id
      WHERE l.latitude BETWEEN ? AND ?
        AND l.longitude BETWEEN ? AND ?
        AND p.is_deleted = false
      GROUP BY cluster_lat, cluster_lng
      HAVING photo_count >= ?
      ORDER BY photo_count DESC
    `;
    
    const params = [
      clusterSize, clusterSize, clusterSize, clusterSize,
      south, north, west, east, 
      zoomLevel > 15 ? 1 : 3 // Minimum photos per cluster
    ];
    
    const db = await SQLite.openDatabaseAsync('chronomap.db');
    return await db.getAllAsync(query, params);
  }
  
  static getClusterSizeForZoom(zoomLevel) {
    // Dynamic clustering resolution based on zoom level
    if (zoomLevel < 8) return 1.0; // Country level
    if (zoomLevel < 12) return 0.1; // City level
    if (zoomLevel < 16) return 0.01; // Neighborhood level
    return 0.001; // Street level
  }
}
```

### Background Processing Patterns

#### Background Task Manager:
```javascript
// services/BackgroundProcessor/TaskManager.js
import { TaskManager, BackgroundFetch } from 'expo-task-manager';

const BACKGROUND_SCAN_TASK = 'background-scan';
const BACKGROUND_SYNC_TASK = 'background-sync';

class BackgroundTaskManager {
  static async registerBackgroundTasks() {
    // Register background photo library scanning
    TaskManager.defineTask(BACKGROUND_SCAN_TASK, async ({ data, error }) => {
      if (error) {
        console.error('Background scan error:', error);
        return BackgroundFetch.Result.Failed;
      }
      
      try {
        const scanService = new MediaScannerService();
        await scanService.startIncrementalScan();
        return BackgroundFetch.Result.NewData;
      } catch (error) {
        console.error('Background scan failed:', error);
        return BackgroundFetch.Result.Failed;
      }
    });
    
    // Register background sync task
    TaskManager.defineTask(BACKGROUND_SYNC_TASK, async ({ data, error }) => {
      if (error) {
        return BackgroundFetch.Result.Failed;
      }
      
      try {
        await this.performBackgroundMaintenance();
        return BackgroundFetch.Result.NewData;
      } catch (error) {
        return BackgroundFetch.Result.Failed;
      }
    });
    
    // Register tasks with the system
    await BackgroundFetch.registerTaskAsync(BACKGROUND_SCAN_TASK, {
      minimumInterval: 15 * 60, // 15 minutes
      stopOnTerminate: false,
      startOnBoot: true,
    });
    
    await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
      minimumInterval: 60 * 60, // 1 hour
      stopOnTerminate: false,
      startOnBoot: true,
    });
  }
  
  static async performBackgroundMaintenance() {
    const tasks = [
      this.cleanupThumbnailCache(),
      this.optimizeDatabaseIndexes(),
      this.updatePhotoStatistics(),
      this.performDatabaseVacuum(),
    ];
    
    await Promise.allSettled(tasks);
  }
  
  static async cleanupThumbnailCache() {
    const cacheDir = `${FileSystem.cacheDirectory}thumbnails/`;
    const cacheFiles = await FileSystem.readDirectoryAsync(cacheDir);
    const maxCacheSize = 100 * 1024 * 1024; // 100MB
    
    let totalSize = 0;
    const fileStats = [];
    
    for (const file of cacheFiles) {
      const filePath = `${cacheDir}${file}`;
      const stats = await FileSystem.getInfoAsync(filePath);
      totalSize += stats.size;
      fileStats.push({ path: filePath, size: stats.size, modificationTime: stats.modificationTime });
    }
    
    if (totalSize > maxCacheSize) {
      // Remove oldest files until under limit
      fileStats.sort((a, b) => a.modificationTime - b.modificationTime);
      
      let removedSize = 0;
      for (const file of fileStats) {
        if (totalSize - removedSize <= maxCacheSize) break;
        
        await FileSystem.deleteAsync(file.path);
        removedSize += file.size;
      }
    }
  }
}
```

### Lazy Loading and Virtualization Approaches

#### Virtual List Implementation:
```javascript
// components/VirtualizedPhotoGrid/VirtualizedPhotoGrid.js
import { FlashList } from '@shopify/flash-list';
import { memo, useMemo, useCallback } from 'react';

const VirtualizedPhotoGrid = memo(({
  photos,
  onPhotoPress,
  numColumns = 2,
  itemSize = 180,
}) => {
  // Memoize the data structure for FlashList
  const listData = useMemo(() => {
    return photos.map((photo, index) => ({
      ...photo,
      index,
      key: photo.id,
    }));
  }, [photos]);
  
  const renderPhoto = useCallback(({ item, index }) => {
    return (
      <PhotoThumbnail
        photo={item}
        size={itemSize}
        onPress={() => onPhotoPress(item, index)}
        priority={index < 20 ? 'high' : 'normal'}
      />
    );
  }, [itemSize, onPhotoPress]);
  
  const getItemLayout = useCallback((data, index) => ({
    length: itemSize + 4, // Item height + margin
    offset: Math.floor(index / numColumns) * (itemSize + 4),
    index,
  }), [itemSize, numColumns]);
  
  const keyExtractor = useCallback((item) => item.id, []);
  
  return (
    <FlashList
      data={listData}
      renderItem={renderPhoto}
      numColumns={numColumns}
      estimatedItemSize={itemSize}
      keyExtractor={keyExtractor}
      getItemLayout={getItemLayout}
      removeClippedSubviews
      maxToRenderPerBatch={20}
      windowSize={10}
      initialNumToRender={15}
      updateCellsBatchingPeriod={100}
      scrollEventThrottle={16}
      maintainVisibleContentPosition={{
        minIndexForVisible: 0,
        autoscrollToTopThreshold: 100,
      }}
      onViewableItemsChanged={useCallback(({ viewableItems }) => {
        // Preload images for items becoming visible
        const upcomingItems = viewableItems.slice(-5);
        PhotoMemoryManager.preloadThumbnails(
          upcomingItems.map(item => item.item.id)
        );
      }, [])}
    />
  );
});
```

#### Progressive Image Loading:
```javascript
// components/PhotoThumbnail/ProgressivePhotoThumbnail.js
import { useState, useEffect, memo } from 'react';
import FastImage from 'react-native-fast-image';

const ProgressivePhotoThumbnail = memo(({ 
  photo, 
  size, 
  priority = 'normal',
  onPress 
}) => {
  const [loadingState, setLoadingState] = useState('loading');
  const [thumbnailUri, setThumbnailUri] = useState(null);
  
  useEffect(() => {
    let isMounted = true;
    
    const loadThumbnail = async () => {
      try {
        // First try to load from cache
        const cachedUri = await PhotoCache.getThumbnail(photo.id, size);
        if (cachedUri && isMounted) {
          setThumbnailUri(cachedUri);
          setLoadingState('loaded');
          return;
        }
        
        // Generate thumbnail if not cached
        const generatedUri = await ImageProcessor.generateThumbnail(
          photo.uri, 
          size
        );
        
        if (isMounted) {
          setThumbnailUri(generatedUri);
          setLoadingState('loaded');
          
          // Cache for future use
          PhotoCache.cacheThumbnail(photo.id, size, generatedUri);
        }
      } catch (error) {
        if (isMounted) {
          setLoadingState('error');
        }
      }
    };
    
    loadThumbnail();
    
    return () => {
      isMounted = false;
    };
  }, [photo.id, photo.uri, size]);
  
  if (loadingState === 'loading') {
    return <PhotoSkeleton size={size} />;
  }
  
  if (loadingState === 'error') {
    return <PhotoErrorPlaceholder size={size} onRetry={() => setLoadingState('loading')} />;
  }
  
  return (
    <FastImage
      source={{
        uri: thumbnailUri,
        priority: priority === 'high' ? FastImage.priority.high : FastImage.priority.normal,
      }}
      style={{
        width: size,
        height: size,
        borderRadius: 8,
      }}
      onPress={onPress}
      resizeMode={FastImage.resizeMode.cover}
      fallback
    />
  );
});
```

---

## 6. Security & Privacy Architecture

### On-Device Data Encryption

#### Database Encryption Implementation:
```javascript
// services/Security/DatabaseEncryption.js
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { SQLite } from 'expo-sqlite';

class DatabaseEncryption {
  static async initializeSecureDatabase() {
    // Generate or retrieve encryption key
    const encryptionKey = await this.getOrCreateEncryptionKey();
    
    // Open database with encryption
    const db = await SQLite.openDatabaseAsync('chronomap.db', {
      encryptionKey,
      enableChangeListener: true,
    });
    
    // Verify encryption is working
    await this.verifyEncryption(db);
    
    return db;
  }
  
  static async getOrCreateEncryptionKey() {
    const keyName = 'chronomap_db_key';
    
    try {
      // Try to retrieve existing key
      const existingKey = await SecureStore.getItemAsync(keyName);
      if (existingKey) {
        return existingKey;
      }
    } catch (error) {
      console.warn('Could not retrieve existing key:', error);
    }
    
    // Generate new key
    const newKey = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${Date.now()}-${Math.random()}-chronomap`,
      { encoding: Crypto.CryptoEncoding.HEX }
    );
    
    // Store securely
    await SecureStore.setItemAsync(keyName, newKey, {
      requireAuthentication: true,
      authenticationPrompt: 'Authenticate to access ChronoMap data',
    });
    
    return newKey;
  }
  
  static async verifyEncryption(db) {
    try {
      // Try to read database without key (should fail)
      const testDb = await SQLite.openDatabaseAsync('chronomap.db');
      await testDb.getAllAsync('SELECT COUNT(*) FROM photos LIMIT 1');
      
      // If we reach here, encryption failed
      throw new Error('Database encryption verification failed');
    } catch (error) {
      // This should happen - encrypted database cannot be read without key
      if (error.message.includes('file is encrypted')) {
        return true; // Encryption is working
      }
      throw error;
    }
  }
  
  static async changeEncryptionKey(newKey) {
    const db = await this.initializeSecureDatabase();
    
    // SQLCipher key change operation
    await db.execAsync(`PRAGMA rekey = '${newKey}'`);
    
    // Update stored key
    await SecureStore.setItemAsync('chronomap_db_key', newKey, {
      requireAuthentication: true,
      authenticationPrompt: 'Authenticate to update encryption key',
    });
  }
}
```

### Secure Metadata Handling

#### Privacy-Preserving Metadata Processing:
```javascript
// services/Privacy/MetadataPrivacyManager.js
class MetadataPrivacyManager {
  static sensitiveMetadataKeys = [
    'GPS', 'Location', 'UserComment', 'ImageDescription',
    'Artist', 'Copyright', 'Software'
  ];
  
  static async sanitizeMetadata(metadata, privacyLevel = 'standard') {
    const sanitized = { ...metadata };
    
    switch (privacyLevel) {
      case 'high':
        // Remove all potentially identifying metadata
        this.sensitiveMetadataKeys.forEach(key => {
          delete sanitized[key];
        });
        delete sanitized.exif?.GPS;
        delete sanitized.exif?.UserComment;
        break;
        
      case 'standard':
        // Keep location but remove personal identifiers
        delete sanitized.exif?.UserComment;
        delete sanitized.exif?.ImageDescription;
        delete sanitized.exif?.Artist;
        delete sanitized.exif?.Copyright;
        break;
        
      case 'minimal':
        // Only remove obvious personal data
        delete sanitized.exif?.UserComment;
        break;
    }
    
    return sanitized;
  }
  
  static async hashSensitiveData(data) {
    // Hash sensitive data for internal use while preserving functionality
    const hashedData = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (this.isSensitive(key)) {
        hashedData[key] = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          String(value)
        );
      } else {
        hashedData[key] = value;
      }
    }
    
    return hashedData;
  }
  
  static isSensitive(key) {
    return this.sensitiveMetadataKeys.some(sensitiveKey => 
      key.toLowerCase().includes(sensitiveKey.toLowerCase())
    );
  }
  
  static async generatePrivacyReport() {
    const db = await DatabaseEncryption.initializeSecureDatabase();
    
    const report = {
      totalPhotos: 0,
      photosWithLocation: 0,
      photosWithPersonalMetadata: 0,
      sensitiveMetadataTypes: [],
      lastScan: new Date(),
    };
    
    // Analyze metadata privacy
    const photos = await db.getAllAsync('SELECT id FROM photos WHERE is_deleted = false');
    report.totalPhotos = photos.length;
    
    const photosWithLocation = await db.getAllAsync(`
      SELECT COUNT(*) as count 
      FROM photos p 
      JOIN photo_locations pl ON p.id = pl.photo_id 
      WHERE p.is_deleted = false
    `);
    report.photosWithLocation = photosWithLocation[0]?.count || 0;
    
    return report;
  }
}
```

### Permission Management System

#### Granular Permission Controller:
```javascript
// services/Privacy/PermissionManager.js
import { Camera } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import * as Location from 'expo-location';

class PermissionManager {
  static requiredPermissions = {
    mediaLibrary: {
      permission: MediaLibrary.MEDIA_LIBRARY_PERMISSIONS,
      rationale: 'Access your photos to organize them by date and location',
      required: true,
    },
    location: {
      permission: Location.LOCATION_PERMISSIONS,
      rationale: 'Read location data from your photos to show them on the map',
      required: false,
    },
  };
  
  static async requestAllPermissions() {
    const results = {};
    
    for (const [key, config] of Object.entries(this.requiredPermissions)) {
      results[key] = await this.requestPermission(key, config);
    }
    
    return results;
  }
  
  static async requestPermission(key, config) {
    try {
      // Check current status
      const { status: currentStatus } = await config.permission.getPermissionsAsync();
      
      if (currentStatus === 'granted') {
        return { status: 'granted', timestamp: Date.now() };
      }
      
      if (currentStatus === 'denied' && config.required) {
        // Show rationale for required permissions
        const shouldRequest = await this.showPermissionRationale(key, config.rationale);
        if (!shouldRequest) {
          return { status: 'denied', reason: 'user_declined' };
        }
      }
      
      // Request permission
      const { status } = await config.permission.requestPermissionsAsync();
      
      // Log permission result for privacy audit
      await this.logPermissionRequest(key, status);
      
      return { 
        status, 
        timestamp: Date.now(),
        required: config.required 
      };
      
    } catch (error) {
      console.error(`Permission request failed for ${key}:`, error);
      return { 
        status: 'error', 
        error: error.message,
        required: config.required 
      };
    }
  }
  
  static async showPermissionRationale(permissionKey, rationale) {
    return new Promise((resolve) => {
      Alert.alert(
        'Permission Required',
        `ChronoMap needs ${permissionKey} permission to function properly.\n\n${rationale}`,
        [
          {
            text: 'Not Now',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'Allow',
            onPress: () => resolve(true),
          },
        ]
      );
    });
  }
  
  static async logPermissionRequest(permission, status) {
    const db = await DatabaseEncryption.initializeSecureDatabase();
    
    await db.runAsync(`
      INSERT INTO privacy_audit_log 
      (event_type, permission_name, status, timestamp, details) 
      VALUES (?, ?, ?, ?, ?)
    `, [
      'permission_request',
      permission,
      status,
      Date.now(),
      JSON.stringify({ userAgent: Platform.OS })
    ]);
  }
  
  static async checkPermissionStatus() {
    const status = {};
    
    for (const [key, config] of Object.entries(this.requiredPermissions)) {
      const { status: permissionStatus } = await config.permission.getPermissionsAsync();
      status[key] = {
        granted: permissionStatus === 'granted',
        required: config.required,
        status: permissionStatus,
      };
    }
    
    return status;
  }
  
  static async revokePermissions() {
    // Note: Cannot programmatically revoke permissions
    // Guide user to system settings
    const settingsUrl = Platform.select({
      ios: 'app-settings:',
      android: 'package:com.chronomap.app',
    });
    
    Alert.alert(
      'Revoke Permissions',
      'To revoke permissions, please go to your device settings and disable permissions for ChronoMap.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Open Settings', 
          onPress: () => Linking.openURL(settingsUrl) 
        },
      ]
    );
  }
}
```

### Privacy Compliance Patterns

#### GDPR/Privacy Compliance Manager:
```javascript
// services/Privacy/ComplianceManager.js
class PrivacyComplianceManager {
  static async initializePrivacyControls() {
    // Create privacy control tables
    const db = await DatabaseEncryption.initializeSecureDatabase();
    
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS privacy_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      );
      
      CREATE TABLE IF NOT EXISTS data_processing_consent (
        processing_type TEXT PRIMARY KEY,
        consent_given BOOLEAN NOT NULL,
        consent_timestamp INTEGER NOT NULL,
        consent_version TEXT NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS privacy_audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        permission_name TEXT,
        status TEXT,
        timestamp INTEGER NOT NULL,
        details TEXT
      );
    `);
    
    // Set default privacy settings
    await this.setDefaultPrivacySettings();
  }
  
  static async setDefaultPrivacySettings() {
    const defaultSettings = {
      data_retention_period: '7776000', // 90 days in seconds
      metadata_processing_level: 'standard',
      location_precision: 'city', // 'exact', 'city', 'region', 'none'
      crash_reporting: 'false',
      analytics: 'false',
      automatic_backup: 'true',
    };
    
    const db = await DatabaseEncryption.initializeSecureDatabase();
    
    for (const [key, value] of Object.entries(defaultSettings)) {
      await db.runAsync(`
        INSERT OR IGNORE INTO privacy_settings (key, value) 
        VALUES (?, ?)
      `, [key, value]);
    }
  }
  
  static async requestConsent(processingType, description, version = '1.0') {
    return new Promise((resolve) => {
      Alert.alert(
        'Data Processing Consent',
        `ChronoMap would like to ${description}.\n\nThis helps improve your experience while keeping all data on your device.`,
        [
          {
            text: 'Decline',
            style: 'cancel',
            onPress: () => {
              this.recordConsent(processingType, false, version);
              resolve(false);
            },
          },
          {
            text: 'Allow',
            onPress: () => {
              this.recordConsent(processingType, true, version);
              resolve(true);
            },
          },
        ]
      );
    });
  }
  
  static async recordConsent(processingType, consentGiven, version) {
    const db = await DatabaseEncryption.initializeSecureDatabase();
    
    await db.runAsync(`
      INSERT OR REPLACE INTO data_processing_consent 
      (processing_type, consent_given, consent_timestamp, consent_version) 
      VALUES (?, ?, ?, ?)
    `, [processingType, consentGiven, Date.now(), version]);
  }
  
  static async exportUserData() {
    // GDPR Article 20 - Right to data portability
    const db = await DatabaseEncryption.initializeSecureDatabase();
    
    const userData = {
      photos: await db.getAllAsync('SELECT * FROM photos WHERE is_deleted = false'),
      locations: await db.getAllAsync('SELECT * FROM locations'),
      albums: await db.getAllAsync('SELECT * FROM albums'),
      settings: await db.getAllAsync('SELECT * FROM privacy_settings'),
      consent_records: await db.getAllAsync('SELECT * FROM data_processing_consent'),
      export_timestamp: new Date().toISOString(),
    };
    
    // Remove sensitive internal data
    userData.photos = userData.photos.map(photo => ({
      ...photo,
      uri: '[DEVICE_PATH_REMOVED]', // Don't expose file paths
    }));
    
    return userData;
  }
  
  static async deleteAllUserData() {
    // GDPR Article 17 - Right to erasure
    const db = await DatabaseEncryption.initializeSecureDatabase();
    
    const tables = [
      'photos', 'locations', 'photo_locations', 'photo_metadata',
      'albums', 'album_photos', 'privacy_settings', 
      'data_processing_consent', 'privacy_audit_log', 'scan_history'
    ];
    
    // Delete all user data
    for (const table of tables) {
      await db.runAsync(`DELETE FROM ${table}`);
    }
    
    // Clear all caches
    await FileSystem.deleteAsync(`${FileSystem.cacheDirectory}thumbnails/`, 
      { idempotent: true });
    
    // Reset database
    await db.execAsync('VACUUM');
    
    return true;
  }
  
  static async generatePrivacyReport() {
    const db = await DatabaseEncryption.initializeSecureDatabase();
    
    const report = {
      data_categories: {
        photos: await this.getTableRowCount('photos'),
        locations: await this.getTableRowCount('locations'),
        metadata_entries: await this.getTableRowCount('photo_metadata'),
      },
      privacy_settings: await this.getAllPrivacySettings(),
      consent_records: await db.getAllAsync('SELECT * FROM data_processing_consent'),
      last_backup: await this.getLastBackupDate(),
      data_retention_compliance: await this.checkDataRetention(),
      generated_at: new Date().toISOString(),
    };
    
    return report;
  }
  
  static async getTableRowCount(tableName) {
    const db = await DatabaseEncryption.initializeSecureDatabase();
    const result = await db.getFirstAsync(`SELECT COUNT(*) as count FROM ${tableName}`);
    return result?.count || 0;
  }
  
  static async getAllPrivacySettings() {
    const db = await DatabaseEncryption.initializeSecureDatabase();
    const settings = await db.getAllAsync('SELECT key, value FROM privacy_settings');
    
    const settingsObject = {};
    settings.forEach(setting => {
      settingsObject[setting.key] = setting.value;
    });
    
    return settingsObject;
  }
}
```

---

## 7. Development & Deployment Architecture

### Project Structure and Build Configuration

#### Root Project Structure:
```
chronomap/
├── .expo/                    # Expo configuration
├── .github/                  # GitHub Actions workflows
│   └── workflows/
│       ├── build.yml
│       ├── test.yml
│       └── release.yml
├── android/                  # Android-specific code (if ejected)
├── ios/                      # iOS-specific code (if ejected)
├── assets/                   # Static assets
│   ├── images/
│   ├── fonts/
│   └── sounds/
├── src/                      # Application source code
│   ├── components/
│   ├── screens/
│   ├── services/
│   ├── hooks/
│   ├── utils/
│   ├── stores/
│   ├── config/
│   └── types/
├── __tests__/               # Test files
├── docs/                    # Documentation
├── scripts/                 # Build and deployment scripts
├── App.js                   # Root component
├── app.config.js            # Expo configuration
├── babel.config.js          # Babel configuration
├── metro.config.js          # Metro bundler configuration
├── package.json
├── tsconfig.json            # TypeScript configuration
└── README.md
```

#### Expo Configuration (app.config.js):
```javascript
export default {
  expo: {
    name: 'ChronoMap',
    slug: 'chronomap',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#F7FAFC',
    },
    updates: {
      fallbackToCacheTimeout: 0,
      url: 'https://u.expo.dev/[your-project-id]',
    },
    runtimeVersion: {
      policy: 'sdkVersion',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.chronomap.app',
      buildNumber: '1.0.0',
      infoPlist: {
        NSPhotoLibraryUsageDescription: 'ChronoMap needs access to your photos to organize them by date and location. All processing happens on your device.',
        NSLocationWhenInUseUsageDescription: 'ChronoMap reads location data from your photos to show them on the map. Location data never leaves your device.',
        NSCameraUsageDescription: 'ChronoMap can capture new photos to add to your timeline.',
      },
      config: {
        googleMapsApiKey: process.env.GOOGLE_MAPS_IOS_API_KEY,
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#F7FAFC',
      },
      package: 'com.chronomap.app',
      versionCode: 1,
      permissions: [
        'READ_EXTERNAL_STORAGE',
        'WRITE_EXTERNAL_STORAGE',
        'ACCESS_FINE_LOCATION',
        'ACCESS_COARSE_LOCATION',
        'CAMERA',
      ],
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY,
        },
      },
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-media-library',
      'expo-location',
      'expo-file-system',
      'expo-sqlite',
      'expo-secure-store',
      [
        'expo-build-properties',
        {
          ios: {
            deploymentTarget: '14.0',
          },
          android: {
            compileSdkVersion: 34,
            targetSdkVersion: 34,
            minSdkVersion: 30,
            buildToolsVersion: '34.0.0',
            proguardMinifyEnabled: true,
          },
        },
      ],
    ],
    extra: {
      eas: {
        projectId: '[your-project-id]',
      },
    },
  },
};
```

### Development Environment Setup

#### Package.json Scripts:
```json
{
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "build:android": "eas build --platform android",
    "build:ios": "eas build --platform ios",
    "build:all": "eas build --platform all",
    "submit:android": "eas submit --platform android",
    "submit:ios": "eas submit --platform ios",
    "update": "eas update",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src/ --ext .js,.jsx,.ts,.tsx",
    "lint:fix": "eslint src/ --ext .js,.jsx,.ts,.tsx --fix",
    "type-check": "tsc --noEmit",
    "analyze-bundle": "npx react-native-bundle-visualizer",
    "clean": "rm -rf node_modules && rm -rf .expo && npm install",
    "postinstall": "patch-package"
  }
}
```

#### Development Dependencies:
```json
{
  "devDependencies": {
    "@babel/core": "^7.24.0",
    "@testing-library/react-native": "^12.4.0",
    "@types/react": "~18.2.0",
    "@types/react-native": "~0.70.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "detox": "^20.18.0",
    "eslint": "^8.0.0",
    "eslint-config-expo": "^7.0.0",
    "jest": "^29.4.0",
    "jest-expo": "~50.0.0",
    "patch-package": "^8.0.0",
    "typescript": "^5.3.0"
  }
}
```

### CI/CD Pipeline Recommendations

#### GitHub Actions Workflow (.github/workflows/build.yml):
```yaml
name: Build and Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run type check
        run: npm run type-check
      
      - name: Run linting
        run: npm run lint
      
      - name: Run tests
        run: npm run test:coverage
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info

  build:
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Setup Expo CLI
        run: npm install -g @expo/cli
      
      - name: Install dependencies
        run: npm ci
      
      - name: Setup EAS CLI
        run: npm install -g eas-cli
      
      - name: Build Android APK
        run: eas build --platform android --profile preview
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
      
      - name: Build iOS IPA
        run: eas build --platform ios --profile preview
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}

  release:
    runs-on: ubuntu-latest
    needs: build
    if: startsWith(github.ref, 'refs/tags/v')
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build production releases
        run: eas build --platform all --profile production
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
      
      - name: Submit to app stores
        run: |
          eas submit --platform ios --profile production
          eas submit --platform android --profile production
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
          ASC_API_KEY_ID: ${{ secrets.ASC_API_KEY_ID }}
          ASC_API_ISSUER_ID: ${{ secrets.ASC_API_ISSUER_ID }}
          ASC_API_KEY_BASE64: ${{ secrets.ASC_API_KEY_BASE64 }}
```

### App Store Deployment Considerations

#### EAS Build Configuration (eas.json):
```json
{
  "cli": {
    "version": ">= 5.9.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "android": {
        "buildType": "aab",
        "gradleCommand": ":app:bundleRelease"
      },
      "ios": {
        "autoIncrement": true
      },
      "env": {
        "NODE_ENV": "production"
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "internal",
        "releaseStatus": "draft"
      },
      "ios": {
        "ascApiKeyPath": "./asc-api-key.p8",
        "ascApiKeyId": "YOUR_API_KEY_ID",
        "ascApiKeyIssuerId": "YOUR_ISSUER_ID"
      }
    }
  }
}
```

#### Performance Optimization Configuration:

##### Metro Configuration (metro.config.js):
```javascript
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable tree shaking for better bundle size
config.resolver.unstable_enableSymlinks = true;

// Optimize image assets
config.transformer.assetPlugins = ['expo-asset/tools/hashAssetFiles'];

// Enable Hermes for better performance
config.transformer.hermesEnabled = true;

// Bundle splitting configuration
config.serializer.createModuleIdFactory = () => {
  return (path) => {
    // Create consistent module IDs for better caching
    return require('crypto')
      .createHash('sha1')
      .update(path)
      .digest('hex')
      .substr(0, 8);
  };
};

// Optimize for production builds
if (process.env.NODE_ENV === 'production') {
  config.transformer.minifierConfig = {
    keep_fnames: false,
    mangle: {
      keep_fnames: false,
    },
  };
}

module.exports = config;
```

##### Babel Configuration (babel.config.js):
```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin',
      ['@babel/plugin-proposal-decorators', { legacy: true }],
      [
        'babel-plugin-module-resolver',
        {
          root: ['./src'],
          extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
          alias: {
            '@': './src',
            '@components': './src/components',
            '@screens': './src/screens',
            '@services': './src/services',
            '@utils': './src/utils',
            '@hooks': './src/hooks',
            '@stores': './src/stores',
            '@config': './src/config',
          },
        },
      ],
      // Production optimizations
      process.env.NODE_ENV === 'production' && [
        'transform-remove-console',
        { exclude: ['error', 'warn'] },
      ],
      process.env.NODE_ENV === 'production' && 'babel-plugin-minify-dead-code-elimination',
    ].filter(Boolean),
  };
};
```

---

## For Backend Engineers

### API Development Guidelines
While ChronoMap is primarily on-device processing, you may need to implement minimal backend services for:

1. **App Update Notifications**: Simple endpoint to check for app updates
2. **Crash Reporting**: Optional, privacy-conscious crash reporting service
3. **Feature Flag Management**: Remote configuration for gradual feature rollouts

### Database Implementation Guide
Implement the SQLite schema provided in the Data Architecture section:

1. **Use the exact table structures** defined in the schema
2. **Implement all performance indexes** for optimal query performance
3. **Add database migration system** for future schema updates
4. **Follow the backup and restore patterns** for data integrity

### Local Service Architecture
Implement the service interfaces defined in the API Contracts section:

1. **MediaScannerService**: Handles device photo library scanning
2. **LocationService**: Manages GPS data and geocoding
3. **TimelineService**: Processes chronological photo organization
4. **MapClusteringService**: Handles geographic photo clustering

---

## For Frontend Engineers

### Component Architecture Guidelines
Follow the component structure defined in the timeline implementation:

1. **Use the exact component hierarchy** shown in the architecture diagrams
2. **Implement virtual lists** using @shopify/flash-list for performance
3. **Follow the state management patterns** using Zustand + React Query
4. **Implement progressive image loading** for smooth user experience

### Performance Requirements
Ensure your implementation meets these targets:

1. **App launch time**: <3 seconds on mid-range devices
2. **Photo grid loading**: <2 seconds for 100 photos
3. **Timeline scrolling**: 60fps on all supported devices
4. **Memory usage**: <200MB during normal operation

### State Management Implementation
Use the Zustand store patterns defined in the architecture:

1. **Photo state management** for timeline and map views
2. **UI state management** for navigation and user preferences  
3. **Cache management** for performance optimization
4. **Error handling** for graceful degradation

---

## For QA Engineers

### Testing Strategy
Focus testing on these critical areas:

1. **Performance Testing**: 
   - Test with 50,000+ photos
   - Measure memory usage under load
   - Verify 60fps scrolling performance
   - Test app launch times

2. **Privacy Testing**:
   - Verify no network requests contain photo data
   - Test encryption at rest functionality
   - Validate permission handling
   - Test data deletion completeness

3. **Functional Testing**:
   - Photo library scanning accuracy
   - Timeline navigation smoothness
   - Map clustering correctness
   - Cross-platform consistency

### Test Data Requirements
Create test datasets with:

1. **Large photo libraries** (10K, 25K, 50K photos)
2. **Various metadata scenarios** (with/without GPS, different formats)
3. **Edge cases** (corrupted files, missing metadata, permission denial)
4. **Performance scenarios** (low memory, background processing)

---

## For Security Analysts

### Security Implementation Checklist

1. **Encryption Verification**:
   - Verify SQLCipher encryption is properly implemented
   - Test encryption key management in Secure Store
   - Validate data cannot be read without proper key

2. **Privacy Controls**:
   - Implement all privacy compliance features
   - Test data export functionality (GDPR Article 20)
   - Test complete data deletion (GDPR Article 17)
   - Verify no data leakage in logs or crash reports

3. **Permission Security**:
   - Implement minimal required permissions
   - Test permission handling edge cases
   - Verify proper user consent flows
   - Test permission revocation scenarios

### Security Monitoring
Implement monitoring for:

1. **Unauthorized access attempts**
2. **Encryption key usage patterns**
3. **Privacy setting changes**
4. **Data export/deletion requests**

---

## Critical Technical Constraints and Assumptions

### Performance Constraints
- **Target Device Range**: iPhone 12/Pixel 4a and newer
- **Memory Limit**: 200MB maximum during normal operation
- **Storage Overhead**: <5% of user's photo library size
- **Battery Impact**: <5% additional drain from background processing

### Platform Limitations
- **iOS**: Requires iOS 14+ for privacy features
- **Android**: Requires Android 11+ (API 30) for scoped storage
- **Photo Formats**: JPEG, PNG, HEIC, WebP support required
- **Video Support**: MP4, MOV basic metadata extraction

### Privacy Guarantees
- **Zero Network Transmission**: Photo content never transmitted
- **Local Encryption**: All data encrypted at rest
- **Reversible Processing**: Complete data deletion possible
- **Minimal Permissions**: Only required permissions requested

This comprehensive technical architecture provides the foundation for implementing ChronoMap as a robust, privacy-first photo organization mobile application. Each team can use their respective sections to understand requirements and implementation patterns while maintaining consistency across the entire system.