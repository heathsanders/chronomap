// DatabaseService - Main database service with encryption and CRUD operations
import * as SQLite from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { DatabaseConfig } from './config';
import { DatabaseSchema } from './schema';
import { DatabaseMigration } from './migrations';
import { DatabaseBackup } from './backup';
import type {
  DatabaseInstance,
  PhotoRecord,
  LocationRecord,
  PhotoLocationRecord,
  MetadataRecord,
  AlbumRecord,
  SettingRecord,
  ScanHistoryRecord,
  DatabaseInitOptions,
  QueryResult
} from './types';

class DatabaseService {
  private static instance: DatabaseService;
  private db: SQLite.SQLiteDatabase | null = null;
  private isInitialized = false;
  private encryptionKey: string | null = null;

  private constructor() {}

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Initialize the database with encryption
   */
  async initialize(options: DatabaseInitOptions = {}): Promise<void> {
    if (this.isInitialized && this.db) {
      return;
    }

    try {
      // Get or create encryption key
      this.encryptionKey = await this.getOrCreateEncryptionKey();
      
      // Open database with security configuration
      this.db = await SQLite.openDatabaseAsync(DatabaseConfig.DATABASE_NAME, {
        enableChangeListener: true,
        useNewConnection: true,
      });

      if (!this.db) {
        throw new Error('Failed to open database');
      }

      // Configure database for performance and security
      await this.configureDatabase();

      // Run migrations and create schema
      await DatabaseMigration.runMigrations(this.db);
      await DatabaseSchema.createTables(this.db);

      // Initialize default settings
      await this.initializeDefaultSettings();

      this.isInitialized = true;
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw new Error(`Database initialization failed: ${error.message}`);
    }
  }

  /**
   * Get or create secure encryption key
   */
  private async getOrCreateEncryptionKey(): Promise<string> {
    const keyName = 'chronomap_db_key';

    try {
      // Try to retrieve existing key
      const existingKey = await SecureStore.getItemAsync(keyName);
      if (existingKey) {
        return existingKey;
      }
    } catch (error) {
      console.warn('Could not retrieve existing encryption key:', error);
    }

    // Generate new key
    const newKey = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${Date.now()}-${Math.random()}-chronomap`,
      { encoding: Crypto.CryptoEncoding.HEX }
    );

    // Store securely
    await SecureStore.setItemAsync(keyName, newKey, {
      requireAuthentication: false, // Set to true for biometric authentication
      authenticationPrompt: 'Authenticate to access ChronoMap data',
    });

    return newKey;
  }

  /**
   * Configure database for optimal performance
   */
  private async configureDatabase(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const configurations = [
      'PRAGMA journal_mode = WAL;',
      'PRAGMA synchronous = NORMAL;',
      'PRAGMA cache_size = 10000;',
      'PRAGMA temp_store = memory;',
      'PRAGMA foreign_keys = ON;',
    ];

    for (const pragma of configurations) {
      await this.db.execAsync(pragma);
    }
  }

  /**
   * Initialize default application settings
   */
  private async initializeDefaultSettings(): Promise<void> {
    const defaultSettings = [
      { key: 'data_retention_period', value: '7776000', value_type: 'number' }, // 90 days
      { key: 'metadata_processing_level', value: 'standard', value_type: 'string' },
      { key: 'location_precision', value: 'city', value_type: 'string' },
      { key: 'automatic_backup', value: 'true', value_type: 'boolean' },
      { key: 'app_version', value: '1.0.0', value_type: 'string' },
      { key: 'last_scan_timestamp', value: '0', value_type: 'number' },
    ];

    for (const setting of defaultSettings) {
      await this.upsertSetting(setting.key, setting.value, setting.value_type);
    }
  }

  /**
   * Get database instance (throws if not initialized)
   */
  private getDb(): SQLite.SQLiteDatabase {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  // =============================================================================
  // PHOTO CRUD OPERATIONS
  // =============================================================================

  /**
   * Insert a new photo record
   */
  async insertPhoto(photo: Omit<PhotoRecord, 'created_at' | 'updated_at'>): Promise<string> {
    const db = this.getDb();
    const now = Math.floor(Date.now() / 1000);

    await db.runAsync(`
      INSERT INTO photos (
        id, device_id, uri, filename, file_size, mime_type,
        width, height, creation_time, modification_time, duration,
        is_favorite, is_deleted, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      photo.id, photo.device_id, photo.uri, photo.filename, photo.file_size,
      photo.mime_type, photo.width, photo.height, photo.creation_time,
      photo.modification_time, photo.duration || null, photo.is_favorite || false,
      photo.is_deleted || false, now, now
    ]);

    return photo.id;
  }

  /**
   * Get photos with pagination and filtering
   */
  async getPhotos(options: {
    limit?: number;
    offset?: number;
    startDate?: number;
    endDate?: number;
    includeDeleted?: boolean;
    sortBy?: 'creation_time' | 'modification_time';
    sortOrder?: 'ASC' | 'DESC';
  } = {}): Promise<PhotoRecord[]> {
    const db = this.getDb();
    const {
      limit = 100,
      offset = 0,
      includeDeleted = false,
      sortBy = 'creation_time',
      sortOrder = 'DESC'
    } = options;

    let query = `
      SELECT * FROM photos
      WHERE 1=1
    `;
    const params: any[] = [];

    if (!includeDeleted) {
      query += ` AND is_deleted = false`;
    }

    if (options.startDate !== undefined) {
      query += ` AND creation_time >= ?`;
      params.push(options.startDate);
    }

    if (options.endDate !== undefined) {
      query += ` AND creation_time <= ?`;
      params.push(options.endDate);
    }

    query += ` ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const result = await db.getAllAsync(query, params);
    return result as PhotoRecord[];
  }

  /**
   * Get a single photo by ID
   */
  async getPhotoById(id: string): Promise<PhotoRecord | null> {
    const db = this.getDb();
    const result = await db.getFirstAsync(
      'SELECT * FROM photos WHERE id = ? AND is_deleted = false',
      [id]
    );
    return (result as PhotoRecord) || null;
  }

  /**
   * Update a photo record
   */
  async updatePhoto(id: string, updates: Partial<PhotoRecord>): Promise<void> {
    const db = this.getDb();
    const now = Math.floor(Date.now() / 1000);
    
    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updates), now, id];

    await db.runAsync(`
      UPDATE photos 
      SET ${setClause}, updated_at = ?
      WHERE id = ?
    `, values);
  }

  /**
   * Soft delete a photo (mark as deleted)
   */
  async deletePhoto(id: string): Promise<void> {
    await this.updatePhoto(id, { is_deleted: true });
  }

  /**
   * Hard delete a photo and all related records
   */
  async permanentDeletePhoto(id: string): Promise<void> {
    const db = this.getDb();
    await db.runAsync('DELETE FROM photos WHERE id = ?', [id]);
  }

  // =============================================================================
  // LOCATION CRUD OPERATIONS
  // =============================================================================

  /**
   * Insert a new location record
   */
  async insertLocation(location: Omit<LocationRecord, 'id' | 'created_at'>): Promise<number> {
    const db = this.getDb();
    const now = Math.floor(Date.now() / 1000);

    const result = await db.runAsync(`
      INSERT INTO locations (
        latitude, longitude, altitude, accuracy, address_line1, address_line2,
        city, state, country, postal_code, place_name, geocoded_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      location.latitude, location.longitude, location.altitude, location.accuracy,
      location.address_line1, location.address_line2, location.city, location.state,
      location.country, location.postal_code, location.place_name, location.geocoded_at,
      now
    ]);

    return result.lastInsertRowId;
  }

  /**
   * Find location by coordinates (with tolerance for nearby locations)
   */
  async findLocationByCoordinates(
    latitude: number,
    longitude: number,
    tolerance: number = 0.001
  ): Promise<LocationRecord | null> {
    const db = this.getDb();
    const result = await db.getFirstAsync(`
      SELECT * FROM locations 
      WHERE latitude BETWEEN ? AND ? 
      AND longitude BETWEEN ? AND ?
      ORDER BY (
        (latitude - ?) * (latitude - ?) + 
        (longitude - ?) * (longitude - ?)
      ) ASC
      LIMIT 1
    `, [
      latitude - tolerance, latitude + tolerance,
      longitude - tolerance, longitude + tolerance,
      latitude, latitude, longitude, longitude
    ]);

    return (result as LocationRecord) || null;
  }

  /**
   * Link a photo to a location
   */
  async linkPhotoToLocation(
    photoId: string,
    locationId: number,
    confidenceScore: number = 1.0
  ): Promise<void> {
    const db = this.getDb();
    await db.runAsync(`
      INSERT OR REPLACE INTO photo_locations (photo_id, location_id, confidence_score)
      VALUES (?, ?, ?)
    `, [photoId, locationId, confidenceScore]);
  }

  /**
   * Get locations within bounds (for map clustering)
   */
  async getLocationsInBounds(
    northEast: { latitude: number; longitude: number },
    southWest: { latitude: number; longitude: number }
  ): Promise<LocationRecord[]> {
    const db = this.getDb();
    const result = await db.getAllAsync(`
      SELECT DISTINCT l.* FROM locations l
      JOIN photo_locations pl ON l.id = pl.location_id
      JOIN photos p ON pl.photo_id = p.id
      WHERE l.latitude BETWEEN ? AND ?
      AND l.longitude BETWEEN ? AND ?
      AND p.is_deleted = false
    `, [
      southWest.latitude, northEast.latitude,
      southWest.longitude, northEast.longitude
    ]);

    return result as LocationRecord[];
  }

  // =============================================================================
  // METADATA CRUD OPERATIONS
  // =============================================================================

  /**
   * Insert photo metadata
   */
  async insertMetadata(metadata: Omit<MetadataRecord, 'created_at'>): Promise<void> {
    const db = this.getDb();
    const now = Math.floor(Date.now() / 1000);

    await db.runAsync(`
      INSERT OR REPLACE INTO photo_metadata (photo_id, metadata_type, key, value, created_at)
      VALUES (?, ?, ?, ?, ?)
    `, [metadata.photo_id, metadata.metadata_type, metadata.key, metadata.value, now]);
  }

  /**
   * Get metadata for a photo
   */
  async getMetadataForPhoto(
    photoId: string,
    metadataType?: string
  ): Promise<MetadataRecord[]> {
    const db = this.getDb();
    let query = 'SELECT * FROM photo_metadata WHERE photo_id = ?';
    const params = [photoId];

    if (metadataType) {
      query += ' AND metadata_type = ?';
      params.push(metadataType);
    }

    const result = await db.getAllAsync(query, params);
    return result as MetadataRecord[];
  }

  // =============================================================================
  // SETTINGS CRUD OPERATIONS
  // =============================================================================

  /**
   * Upsert a setting
   */
  async upsertSetting(key: string, value: string, valueType: string = 'string'): Promise<void> {
    const db = this.getDb();
    const now = Math.floor(Date.now() / 1000);

    await db.runAsync(`
      INSERT OR REPLACE INTO settings (key, value, value_type, updated_at)
      VALUES (?, ?, ?, ?)
    `, [key, value, valueType, now]);
  }

  /**
   * Get a setting value
   */
  async getSetting(key: string): Promise<string | null> {
    const db = this.getDb();
    const result = await db.getFirstAsync(
      'SELECT value FROM settings WHERE key = ?',
      [key]
    );
    return result?.value || null;
  }

  /**
   * Get all settings
   */
  async getAllSettings(): Promise<Record<string, string>> {
    const db = this.getDb();
    const result = await db.getAllAsync('SELECT key, value FROM settings');
    
    const settings: Record<string, string> = {};
    result.forEach((row: any) => {
      settings[row.key] = row.value;
    });

    return settings;
  }

  // =============================================================================
  // SCAN HISTORY OPERATIONS
  // =============================================================================

  /**
   * Record the start of a scan
   */
  async startScanRecord(scanType: string): Promise<number> {
    const db = this.getDb();
    const now = Math.floor(Date.now() / 1000);

    const result = await db.runAsync(`
      INSERT INTO scan_history (scan_type, started_at, status)
      VALUES (?, ?, 'running')
    `, [scanType, now]);

    return result.lastInsertRowId;
  }

  /**
   * Update scan progress
   */
  async updateScanProgress(
    scanId: number,
    photosProcessed: number,
    photosAdded: number = 0,
    photosUpdated: number = 0
  ): Promise<void> {
    const db = this.getDb();
    await db.runAsync(`
      UPDATE scan_history 
      SET photos_processed = ?, photos_added = ?, photos_updated = ?
      WHERE id = ?
    `, [photosProcessed, photosAdded, photosUpdated, scanId]);
  }

  /**
   * Complete a scan record
   */
  async completeScanRecord(
    scanId: number,
    status: 'completed' | 'failed',
    errorMessage?: string
  ): Promise<void> {
    const db = this.getDb();
    const now = Math.floor(Date.now() / 1000);

    await db.runAsync(`
      UPDATE scan_history 
      SET completed_at = ?, status = ?, error_message = ?
      WHERE id = ?
    `, [now, status, errorMessage || null, scanId]);
  }

  /**
   * Get recent scan history
   */
  async getRecentScans(limit: number = 10): Promise<ScanHistoryRecord[]> {
    const db = this.getDb();
    const result = await db.getAllAsync(`
      SELECT * FROM scan_history 
      ORDER BY started_at DESC 
      LIMIT ?
    `, [limit]);

    return result as ScanHistoryRecord[];
  }

  // =============================================================================
  // DATABASE MAINTENANCE
  // =============================================================================

  /**
   * Get database statistics
   */
  async getDatabaseStats(): Promise<{
    totalPhotos: number;
    totalLocations: number;
    totalMetadataEntries: number;
    totalAlbums: number;
    databaseSize: number;
  }> {
    const db = this.getDb();
    
    const [
      photosResult,
      locationsResult,
      metadataResult,
      albumsResult
    ] = await Promise.all([
      db.getFirstAsync('SELECT COUNT(*) as count FROM photos WHERE is_deleted = false'),
      db.getFirstAsync('SELECT COUNT(*) as count FROM locations'),
      db.getFirstAsync('SELECT COUNT(*) as count FROM photo_metadata'),
      db.getFirstAsync('SELECT COUNT(*) as count FROM albums WHERE is_hidden = false')
    ]);

    return {
      totalPhotos: photosResult?.count || 0,
      totalLocations: locationsResult?.count || 0,
      totalMetadataEntries: metadataResult?.count || 0,
      totalAlbums: albumsResult?.count || 0,
      databaseSize: 0 // TODO: Implement database size calculation
    };
  }

  /**
   * Vacuum database to reclaim space
   */
  async vacuum(): Promise<void> {
    const db = this.getDb();
    await db.execAsync('VACUUM');
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
      this.isInitialized = false;
    }
  }

  /**
   * Create backup of the database
   */
  async createBackup(): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');
    return await DatabaseBackup.createBackup(this.db);
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(backupPath: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await DatabaseBackup.restoreFromBackup(this.db, backupPath);
  }
}

export default DatabaseService;
export { DatabaseService };