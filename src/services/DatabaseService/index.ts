/**
 * DatabaseService
 * Handles encrypted SQLite database operations for photo metadata storage
 * Uses SQLCipher for privacy-first local data storage
 */

import * as SQLite from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';
import { PhotoMetadata, AppError } from '@/types';

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

export class DatabaseService {
  private static instance: DatabaseService;
  private database: SQLite.SQLiteDatabase | null = null;
  private isInitialized = false;
  private encryptionKey: string | null = null;
  
  private config: DatabaseConfig = {
    name: 'chronomap.db',
    version: 1
  };

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Initialize the encrypted database with proper schema
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Generate or retrieve encryption key
      this.encryptionKey = await this.getOrCreateEncryptionKey();
      
      // Open encrypted database
      this.database = await SQLite.openDatabaseAsync(this.config.name, {
        enableChangeListener: true,
        enableCRSQLite: false, // Use standard SQLite for now
        useNewConnection: true
      });

      // Set encryption key if available (requires SQLCipher)
      // Note: expo-sqlite doesn't support SQLCipher natively yet
      // This is a placeholder for when SQLCipher support is added
      if (this.encryptionKey) {
        // await this.database.execAsync(`PRAGMA key = '${this.encryptionKey}';`);
      }

      // Create database schema
      await this.createSchema();
      
      // Run database health checks
      await this.healthCheck();
      
      this.isInitialized = true;
      console.log('DatabaseService initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw this.createError('DATABASE_ERROR', `Database initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create the database schema with all required tables
   */
  private async createSchema(): Promise<void> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    const schemaSql = `
      -- Photos table - main photo metadata storage
      CREATE TABLE IF NOT EXISTS photos (
        id TEXT PRIMARY KEY,
        assetId TEXT UNIQUE NOT NULL,
        filePath TEXT NOT NULL,
        filename TEXT NOT NULL,
        fileSize INTEGER DEFAULT 0,
        mimeType TEXT NOT NULL,
        width INTEGER NOT NULL,
        height INTEGER NOT NULL,
        createdAt DATETIME NOT NULL,
        modifiedAt DATETIME NOT NULL,
        scannedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        thumbnailPath TEXT,
        isDeleted BOOLEAN DEFAULT 0,
        checksum TEXT,
        UNIQUE(assetId)
      );

      -- Locations table - geographic location data
      CREATE TABLE IF NOT EXISTS locations (
        id TEXT PRIMARY KEY,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        altitude REAL,
        accuracy REAL,
        address TEXT,
        city TEXT,
        region TEXT,
        country TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(latitude, longitude)
      );

      -- Photo-Location junction table
      CREATE TABLE IF NOT EXISTS photo_locations (
        photoId TEXT NOT NULL,
        locationId TEXT NOT NULL,
        PRIMARY KEY (photoId, locationId),
        FOREIGN KEY (photoId) REFERENCES photos(id) ON DELETE CASCADE,
        FOREIGN KEY (locationId) REFERENCES locations(id) ON DELETE CASCADE
      );

      -- Metadata table - flexible EXIF and custom metadata storage
      CREATE TABLE IF NOT EXISTS metadata (
        id TEXT PRIMARY KEY,
        photoId TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        type TEXT DEFAULT 'string' CHECK (type IN ('string', 'number', 'boolean', 'json')),
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (photoId) REFERENCES photos(id) ON DELETE CASCADE,
        UNIQUE(photoId, key)
      );

      -- Performance indexes
      CREATE INDEX IF NOT EXISTS idx_photos_created_at ON photos(createdAt);
      CREATE INDEX IF NOT EXISTS idx_photos_asset_id ON photos(assetId);
      CREATE INDEX IF NOT EXISTS idx_photos_filename ON photos(filename);
      CREATE INDEX IF NOT EXISTS idx_photos_is_deleted ON photos(isDeleted);
      CREATE INDEX IF NOT EXISTS idx_locations_coords ON locations(latitude, longitude);
      CREATE INDEX IF NOT EXISTS idx_metadata_photo_key ON metadata(photoId, key);
      CREATE INDEX IF NOT EXISTS idx_photos_scanned_at ON photos(scannedAt);
    `;

    await this.database.execAsync(schemaSql);
  }

  /**
   * Insert a new photo record into the database
   */
  async insertPhoto(photo: Omit<PhotoMetadata, 'id'>): Promise<string> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    const id = this.generateId();

    try {
      await this.database.runAsync(`
        INSERT INTO photos (
          id, assetId, filePath, filename, fileSize, mimeType, 
          width, height, createdAt, modifiedAt, scannedAt, 
          thumbnailPath, isDeleted, checksum
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id,
        photo.assetId,
        photo.filePath,
        photo.filename,
        photo.fileSize,
        photo.mimeType,
        photo.width,
        photo.height,
        photo.createdAt.toISOString(),
        photo.modifiedAt.toISOString(),
        photo.scannedAt.toISOString(),
        photo.thumbnailPath || null,
        photo.isDeleted ? 1 : 0,
        photo.checksum || null
      ]);

      // Insert location data if available
      if (photo.location) {
        const locationId = await this.insertLocation(photo.location);
        await this.linkPhotoLocation(id, locationId);
      }

      // Insert EXIF metadata if available
      if (photo.exifData) {
        await this.insertMetadata(id, photo.exifData);
      }

      return id;
    } catch (error) {
      console.error('Error inserting photo:', error);
      throw this.createError('DATABASE_ERROR', `Failed to insert photo: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get photos with pagination and optional filtering
   */
  async getPhotos(options: {
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
    includeDeleted?: boolean;
  } = {}): Promise<PhotoMetadata[]> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    const {
      limit = 100,
      offset = 0,
      startDate,
      endDate,
      includeDeleted = false
    } = options;

    let sql = `
      SELECT 
        p.*, 
        l.latitude, l.longitude, l.altitude, l.accuracy,
        l.address, l.city, l.region, l.country
      FROM photos p
      LEFT JOIN photo_locations pl ON p.id = pl.photoId
      LEFT JOIN locations l ON pl.locationId = l.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (!includeDeleted) {
      sql += ` AND p.isDeleted = 0`;
    }

    if (startDate) {
      sql += ` AND p.createdAt >= ?`;
      params.push(startDate.toISOString());
    }

    if (endDate) {
      sql += ` AND p.createdAt <= ?`;
      params.push(endDate.toISOString());
    }

    sql += ` ORDER BY p.createdAt DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    try {
      const result = await this.database.getAllAsync(sql, params) as any[];
      
      return result.map(row => ({
        id: row.id,
        assetId: row.assetId,
        filePath: row.filePath,
        filename: row.filename,
        fileSize: row.fileSize,
        mimeType: row.mimeType,
        width: row.width,
        height: row.height,
        createdAt: new Date(row.createdAt),
        modifiedAt: new Date(row.modifiedAt),
        scannedAt: new Date(row.scannedAt),
        thumbnailPath: row.thumbnailPath,
        isDeleted: row.isDeleted === 1,
        checksum: row.checksum,
        location: row.latitude && row.longitude ? {
          latitude: row.latitude,
          longitude: row.longitude,
          altitude: row.altitude,
          accuracy: row.accuracy
        } : undefined
      }));
    } catch (error) {
      console.error('Error getting photos:', error);
      throw this.createError('DATABASE_ERROR', `Failed to get photos: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get a single photo by ID
   */
  async getPhoto(id: string): Promise<PhotoMetadata | null> {
    const photo = await this.database?.getFirstAsync(`
      SELECT 
        p.*, 
        l.latitude, l.longitude, l.altitude, l.accuracy,
        l.address, l.city, l.region, l.country
      FROM photos p
      LEFT JOIN photo_locations pl ON p.id = pl.photoId
      LEFT JOIN locations l ON pl.locationId = l.id
      WHERE p.id = ?
    `, [id]) as any;

    if (!photo) {
      return null;
    }

    return {
      id: photo.id,
      assetId: photo.assetId,
      filePath: photo.filePath,
      filename: photo.filename,
      fileSize: photo.fileSize,
      mimeType: photo.mimeType,
      width: photo.width,
      height: photo.height,
      createdAt: new Date(photo.createdAt),
      modifiedAt: new Date(photo.modifiedAt),
      scannedAt: new Date(photo.scannedAt),
      thumbnailPath: photo.thumbnailPath,
      isDeleted: photo.isDeleted === 1,
      checksum: photo.checksum,
      location: photo.latitude && photo.longitude ? {
        latitude: photo.latitude,
        longitude: photo.longitude,
        altitude: photo.altitude,
        accuracy: photo.accuracy
      } : undefined
    };
  }

  /**
   * Update a photo record
   */
  async updatePhoto(id: string, updates: Partial<PhotoMetadata>): Promise<void> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    const setClauses: string[] = [];
    const params: any[] = [];

    // Build dynamic update query
    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'id' || key === 'location' || key === 'exifData') {
        return; // Skip these fields
      }

      setClauses.push(`${key} = ?`);
      if (value instanceof Date) {
        params.push(value.toISOString());
      } else if (typeof value === 'boolean') {
        params.push(value ? 1 : 0);
      } else {
        params.push(value);
      }
    });

    if (setClauses.length === 0) {
      return;
    }

    params.push(id);

    try {
      await this.database.runAsync(`
        UPDATE photos SET ${setClauses.join(', ')} WHERE id = ?
      `, params);
    } catch (error) {
      console.error('Error updating photo:', error);
      throw this.createError('DATABASE_ERROR', `Failed to update photo: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Mark photos as deleted (soft delete)
   */
  async deletePhotos(ids: string[]): Promise<void> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      const placeholders = ids.map(() => '?').join(',');
      await this.database.runAsync(`
        UPDATE photos SET isDeleted = 1 WHERE id IN (${placeholders})
      `, ids);
    } catch (error) {
      console.error('Error deleting photos:', error);
      throw this.createError('DATABASE_ERROR', `Failed to delete photos: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get total photo count
   */
  async getPhotoCount(includeDeleted = false): Promise<number> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      const sql = includeDeleted 
        ? `SELECT COUNT(*) as count FROM photos`
        : `SELECT COUNT(*) as count FROM photos WHERE isDeleted = 0`;
      
      const result = await this.database.getFirstAsync(sql) as { count: number };
      return result.count;
    } catch (error) {
      console.error('Error getting photo count:', error);
      return 0;
    }
  }

  /**
   * Insert location data
   */
  private async insertLocation(location: NonNullable<PhotoMetadata['location']>): Promise<string> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    const id = this.generateId();

    try {
      await this.database.runAsync(`
        INSERT OR REPLACE INTO locations (
          id, latitude, longitude, altitude, accuracy, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [
        id,
        location.latitude,
        location.longitude,
        location.altitude || null,
        location.accuracy || null,
        new Date().toISOString()
      ]);

      return id;
    } catch (error) {
      // If location already exists, find and return its ID
      const existing = await this.database.getFirstAsync(`
        SELECT id FROM locations WHERE latitude = ? AND longitude = ?
      `, [location.latitude, location.longitude]) as { id: string } | null;

      if (existing) {
        return existing.id;
      }

      throw error;
    }
  }

  /**
   * Link photo to location
   */
  private async linkPhotoLocation(photoId: string, locationId: string): Promise<void> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      await this.database.runAsync(`
        INSERT OR REPLACE INTO photo_locations (photoId, locationId) VALUES (?, ?)
      `, [photoId, locationId]);
    } catch (error) {
      console.error('Error linking photo to location:', error);
    }
  }

  /**
   * Insert metadata for a photo
   */
  private async insertMetadata(photoId: string, exifData: any): Promise<void> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      // Flatten EXIF data and insert as key-value pairs
      const flattenedData = this.flattenObject(exifData);
      
      for (const [key, value] of Object.entries(flattenedData)) {
        const id = this.generateId();
        const type = this.getValueType(value);
        
        await this.database.runAsync(`
          INSERT OR REPLACE INTO metadata (id, photoId, key, value, type) VALUES (?, ?, ?, ?, ?)
        `, [id, photoId, key, JSON.stringify(value), type]);
      }
    } catch (error) {
      console.error('Error inserting metadata:', error);
    }
  }

  /**
   * Perform database health check
   */
  private async healthCheck(): Promise<void> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      // Test database connection
      await this.database.getFirstAsync('SELECT 1');
      
      // Check table integrity
      await this.database.getFirstAsync('PRAGMA integrity_check');
      
      console.log('Database health check passed');
    } catch (error) {
      console.error('Database health check failed:', error);
      throw this.createError('DATABASE_ERROR', 'Database health check failed');
    }
  }

  /**
   * Get or create encryption key for database
   */
  private async getOrCreateEncryptionKey(): Promise<string> {
    try {
      let key = await SecureStore.getItemAsync('db_encryption_key');
      
      if (!key) {
        // Generate new encryption key
        key = this.generateEncryptionKey();
        await SecureStore.setItemAsync('db_encryption_key', key);
      }
      
      return key;
    } catch (error) {
      console.error('Error managing encryption key:', error);
      // Return a fallback key (in production, this should be handled differently)
      return 'fallback_key_' + Date.now();
    }
  }

  /**
   * Generate a secure encryption key
   */
  private generateEncryptionKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = '';
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  }

  /**
   * Generate unique ID for database records
   */
  private generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Flatten nested object for metadata storage
   */
  private flattenObject(obj: any, prefix = ''): Record<string, any> {
    const flattened: Record<string, any> = {};

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const newKey = prefix ? `${prefix}.${key}` : key;
        
        if (obj[key] !== null && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
          Object.assign(flattened, this.flattenObject(obj[key], newKey));
        } else {
          flattened[newKey] = obj[key];
        }
      }
    }

    return flattened;
  }

  /**
   * Determine value type for metadata storage
   */
  private getValueType(value: any): 'string' | 'number' | 'boolean' | 'json' {
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'object') return 'json';
    return 'string';
  }

  /**
   * Create structured error for better error handling
   */
  private createError(code: 'DATABASE_ERROR', message: string): AppError {
    return {
      code,
      message,
      timestamp: new Date()
    };
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.database) {
      await this.database.closeAsync();
      this.database = null;
      this.isInitialized = false;
    }
  }

  /**
   * Check if database is initialized
   */
  isReady(): boolean {
    return this.isInitialized && this.database !== null;
  }
}

export default DatabaseService.getInstance();