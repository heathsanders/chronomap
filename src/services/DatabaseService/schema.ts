// DatabaseService Schema - SQL schema definitions and table creation
import type { SQLiteDatabase } from 'expo-sqlite';
import { DatabaseConfig } from './config';

export class DatabaseSchema {
  /**
   * Create all database tables
   */
  static async createTables(db: SQLiteDatabase): Promise<void> {
    try {
      // Create tables in dependency order
      await this.createPhotosTable(db);
      await this.createLocationsTable(db);
      await this.createPhotoLocationsTable(db);
      await this.createPhotoMetadataTable(db);
      await this.createAlbumsTable(db);
      await this.createAlbumPhotosTable(db);
      await this.createSettingsTable(db);
      await this.createScanHistoryTable(db);
      await this.createPrivacyTables(db);
      
      // Create indexes for performance
      await this.createIndexes(db);
      
      // Create triggers for data integrity
      await this.createTriggers(db);
      
      console.log('Database schema created successfully');
    } catch (error) {
      console.error('Failed to create database schema:', error);
      throw error;
    }
  }

  /**
   * Photos table - Core photo records
   */
  private static async createPhotosTable(db: SQLiteDatabase): Promise<void> {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS photos (
        id TEXT PRIMARY KEY,
        device_id TEXT NOT NULL,
        uri TEXT NOT NULL,
        filename TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        mime_type TEXT NOT NULL,
        width INTEGER,
        height INTEGER,
        creation_time INTEGER NOT NULL,
        modification_time INTEGER NOT NULL,
        duration INTEGER,
        is_favorite BOOLEAN DEFAULT FALSE,
        is_deleted BOOLEAN DEFAULT FALSE,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now')),
        UNIQUE(device_id, uri)
      );
    `);
  }

  /**
   * Locations table - Geographic location data
   */
  private static async createLocationsTable(db: SQLiteDatabase): Promise<void> {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS locations (
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
    `);
  }

  /**
   * Photo-Locations junction table
   */
  private static async createPhotoLocationsTable(db: SQLiteDatabase): Promise<void> {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS photo_locations (
        photo_id TEXT NOT NULL,
        location_id INTEGER NOT NULL,
        confidence_score REAL DEFAULT 1.0,
        PRIMARY KEY (photo_id, location_id),
        FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE,
        FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
      );
    `);
  }

  /**
   * Photo metadata table - Flexible EXIF and custom metadata
   */
  private static async createPhotoMetadataTable(db: SQLiteDatabase): Promise<void> {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS photo_metadata (
        photo_id TEXT NOT NULL,
        metadata_type TEXT NOT NULL CHECK (metadata_type IN ('exif', 'custom', 'ai', 'system')),
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        PRIMARY KEY (photo_id, metadata_type, key),
        FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE
      );
    `);
  }

  /**
   * Albums table - Virtual photo albums
   */
  private static async createAlbumsTable(db: SQLiteDatabase): Promise<void> {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS albums (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL DEFAULT 'custom' CHECK (type IN ('auto', 'custom', 'location', 'date')),
        auto_criteria TEXT,
        thumbnail_photo_id TEXT,
        photo_count INTEGER DEFAULT 0,
        is_hidden BOOLEAN DEFAULT FALSE,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY (thumbnail_photo_id) REFERENCES photos(id) ON DELETE SET NULL
      );
    `);
  }

  /**
   * Album-Photos junction table
   */
  private static async createAlbumPhotosTable(db: SQLiteDatabase): Promise<void> {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS album_photos (
        album_id TEXT NOT NULL,
        photo_id TEXT NOT NULL,
        added_at INTEGER DEFAULT (strftime('%s', 'now')),
        PRIMARY KEY (album_id, photo_id),
        FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE,
        FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE
      );
    `);
  }

  /**
   * Settings table - Application preferences
   */
  private static async createSettingsTable(db: SQLiteDatabase): Promise<void> {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        value_type TEXT NOT NULL DEFAULT 'string' CHECK (value_type IN ('string', 'number', 'boolean', 'json')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      );
    `);
  }

  /**
   * Scan history table - Track photo library scans
   */
  private static async createScanHistoryTable(db: SQLiteDatabase): Promise<void> {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS scan_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        scan_type TEXT NOT NULL CHECK (scan_type IN ('full', 'incremental', 'location', 'metadata')),
        started_at INTEGER NOT NULL,
        completed_at INTEGER,
        photos_processed INTEGER DEFAULT 0,
        photos_added INTEGER DEFAULT 0,
        photos_updated INTEGER DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
        error_message TEXT
      );
    `);
  }

  /**
   * Privacy and compliance tables
   */
  private static async createPrivacyTables(db: SQLiteDatabase): Promise<void> {
    // Privacy settings table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS privacy_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      );
    `);

    // Data processing consent table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS data_processing_consent (
        processing_type TEXT PRIMARY KEY,
        consent_given BOOLEAN NOT NULL,
        consent_timestamp INTEGER NOT NULL,
        consent_version TEXT NOT NULL
      );
    `);

    // Privacy audit log table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS privacy_audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL CHECK (event_type IN ('permission_request', 'data_access', 'data_export', 'data_deletion')),
        permission_name TEXT,
        status TEXT,
        timestamp INTEGER NOT NULL,
        details TEXT
      );
    `);
  }

  /**
   * Create performance indexes
   */
  private static async createIndexes(db: SQLiteDatabase): Promise<void> {
    const indexes = [
      // Primary performance indexes for photos
      'CREATE INDEX IF NOT EXISTS idx_photos_creation_time ON photos(creation_time DESC);',
      'CREATE INDEX IF NOT EXISTS idx_photos_device_deleted ON photos(device_id, is_deleted);',
      'CREATE INDEX IF NOT EXISTS idx_photos_filename ON photos(filename);',
      'CREATE INDEX IF NOT EXISTS idx_photos_mime_type ON photos(mime_type);',
      'CREATE INDEX IF NOT EXISTS idx_photos_file_size ON photos(file_size);',
      'CREATE INDEX IF NOT EXISTS idx_photos_favorite ON photos(is_favorite) WHERE is_favorite = TRUE;',
      
      // Location indexes
      'CREATE INDEX IF NOT EXISTS idx_locations_coordinates ON locations(latitude, longitude);',
      'CREATE INDEX IF NOT EXISTS idx_locations_city ON locations(city) WHERE city IS NOT NULL;',
      'CREATE INDEX IF NOT EXISTS idx_locations_country ON locations(country) WHERE country IS NOT NULL;',
      
      // Junction table indexes
      'CREATE INDEX IF NOT EXISTS idx_photo_locations_photo ON photo_locations(photo_id);',
      'CREATE INDEX IF NOT EXISTS idx_photo_locations_location ON photo_locations(location_id);',
      'CREATE INDEX IF NOT EXISTS idx_photo_locations_confidence ON photo_locations(confidence_score);',
      
      // Metadata indexes
      'CREATE INDEX IF NOT EXISTS idx_metadata_photo_type ON photo_metadata(photo_id, metadata_type);',
      'CREATE INDEX IF NOT EXISTS idx_metadata_key ON photo_metadata(key);',
      'CREATE INDEX IF NOT EXISTS idx_metadata_type ON photo_metadata(metadata_type);',
      
      // Album indexes
      'CREATE INDEX IF NOT EXISTS idx_albums_type ON albums(type, is_hidden);',
      'CREATE INDEX IF NOT EXISTS idx_albums_name ON albums(name) WHERE is_hidden = FALSE;',
      'CREATE INDEX IF NOT EXISTS idx_album_photos_album ON album_photos(album_id);',
      'CREATE INDEX IF NOT EXISTS idx_album_photos_photo ON album_photos(photo_id);',
      'CREATE INDEX IF NOT EXISTS idx_album_photos_added ON album_photos(added_at);',
      
      // Settings and history indexes
      'CREATE INDEX IF NOT EXISTS idx_scan_history_type ON scan_history(scan_type, started_at);',
      'CREATE INDEX IF NOT EXISTS idx_scan_history_status ON scan_history(status, started_at);',
      'CREATE INDEX IF NOT EXISTS idx_privacy_audit_timestamp ON privacy_audit_log(timestamp);',
      'CREATE INDEX IF NOT EXISTS idx_privacy_audit_event ON privacy_audit_log(event_type, timestamp);',
      
      // Composite indexes for common queries
      'CREATE INDEX IF NOT EXISTS idx_photos_time_location ON photos(creation_time DESC, id) WHERE EXISTS(SELECT 1 FROM photo_locations WHERE photo_id = photos.id);',
      'CREATE INDEX IF NOT EXISTS idx_locations_search ON locations(city, state, country) WHERE city IS NOT NULL;',
      'CREATE INDEX IF NOT EXISTS idx_photos_active ON photos(is_deleted, creation_time DESC) WHERE is_deleted = FALSE;',
    ];

    for (const indexSQL of indexes) {
      await db.execAsync(indexSQL);
    }
  }

  /**
   * Create database triggers for data integrity and automation
   */
  private static async createTriggers(db: SQLiteDatabase): Promise<void> {
    // Trigger to update photo count in albums
    await db.execAsync(`
      CREATE TRIGGER IF NOT EXISTS tr_album_photos_insert_count
      AFTER INSERT ON album_photos
      BEGIN
        UPDATE albums 
        SET photo_count = (
          SELECT COUNT(*) FROM album_photos 
          WHERE album_id = NEW.album_id
        )
        WHERE id = NEW.album_id;
      END;
    `);

    await db.execAsync(`
      CREATE TRIGGER IF NOT EXISTS tr_album_photos_delete_count
      AFTER DELETE ON album_photos
      BEGIN
        UPDATE albums 
        SET photo_count = (
          SELECT COUNT(*) FROM album_photos 
          WHERE album_id = OLD.album_id
        )
        WHERE id = OLD.album_id;
      END;
    `);

    // Trigger to update updated_at timestamp
    await db.execAsync(`
      CREATE TRIGGER IF NOT EXISTS tr_photos_updated_at
      AFTER UPDATE ON photos
      WHEN NEW.updated_at = OLD.updated_at
      BEGIN
        UPDATE photos 
        SET updated_at = strftime('%s', 'now')
        WHERE id = NEW.id;
      END;
    `);

    await db.execAsync(`
      CREATE TRIGGER IF NOT EXISTS tr_albums_updated_at
      AFTER UPDATE ON albums
      WHEN NEW.updated_at = OLD.updated_at
      BEGIN
        UPDATE albums 
        SET updated_at = strftime('%s', 'now')
        WHERE id = NEW.id;
      END;
    `);

    // Trigger to clean up related data when photo is deleted
    await db.execAsync(`
      CREATE TRIGGER IF NOT EXISTS tr_photos_cascade_cleanup
      AFTER DELETE ON photos
      BEGIN
        -- Remove from albums
        DELETE FROM album_photos WHERE photo_id = OLD.id;
        
        -- Remove metadata
        DELETE FROM photo_metadata WHERE photo_id = OLD.id;
        
        -- Remove location associations
        DELETE FROM photo_locations WHERE photo_id = OLD.id;
        
        -- Update album thumbnails if this photo was used
        UPDATE albums SET thumbnail_photo_id = NULL WHERE thumbnail_photo_id = OLD.id;
      END;
    `);

    // Trigger to ensure location uniqueness with tolerance
    await db.execAsync(`
      CREATE TRIGGER IF NOT EXISTS tr_locations_unique_check
      BEFORE INSERT ON locations
      WHEN EXISTS (
        SELECT 1 FROM locations 
        WHERE ABS(latitude - NEW.latitude) < 0.0001 
        AND ABS(longitude - NEW.longitude) < 0.0001
      )
      BEGIN
        SELECT RAISE(FAIL, 'Location already exists within tolerance');
      END;
    `);
  }

  /**
   * Create views for common queries
   */
  static async createViews(db: SQLiteDatabase): Promise<void> {
    // View for photos with location information
    await db.execAsync(`
      CREATE VIEW IF NOT EXISTS vw_photos_with_location AS
      SELECT 
        p.*,
        l.latitude,
        l.longitude,
        l.city,
        l.state,
        l.country,
        l.place_name,
        pl.confidence_score as location_confidence
      FROM photos p
      LEFT JOIN photo_locations pl ON p.id = pl.photo_id
      LEFT JOIN locations l ON pl.location_id = l.id
      WHERE p.is_deleted = FALSE;
    `);

    // View for photo timeline sections
    await db.execAsync(`
      CREATE VIEW IF NOT EXISTS vw_timeline_sections AS
      SELECT 
        DATE(creation_time, 'unixepoch') as date,
        COUNT(*) as photo_count,
        MIN(creation_time) as first_photo_time,
        MAX(creation_time) as last_photo_time,
        GROUP_CONCAT(DISTINCT l.city) as cities
      FROM photos p
      LEFT JOIN photo_locations pl ON p.id = pl.photo_id
      LEFT JOIN locations l ON pl.location_id = l.id
      WHERE p.is_deleted = FALSE
      GROUP BY DATE(creation_time, 'unixepoch')
      ORDER BY date DESC;
    `);

    // View for location clusters
    await db.execAsync(`
      CREATE VIEW IF NOT EXISTS vw_location_clusters AS
      SELECT 
        l.id,
        l.latitude,
        l.longitude,
        l.city,
        l.country,
        COUNT(DISTINCT p.id) as photo_count,
        MIN(p.creation_time) as earliest_photo,
        MAX(p.creation_time) as latest_photo
      FROM locations l
      JOIN photo_locations pl ON l.id = pl.location_id
      JOIN photos p ON pl.photo_id = p.id
      WHERE p.is_deleted = FALSE
      GROUP BY l.id, l.latitude, l.longitude, l.city, l.country
      HAVING photo_count > 0;
    `);
  }

  /**
   * Drop all tables (for testing/reset)
   */
  static async dropAllTables(db: SQLiteDatabase): Promise<void> {
    const tables = [
      'privacy_audit_log',
      'data_processing_consent', 
      'privacy_settings',
      'scan_history',
      'album_photos',
      'albums',
      'photo_metadata',
      'photo_locations',
      'locations',
      'photos',
      'settings'
    ];

    for (const table of tables) {
      await db.execAsync(`DROP TABLE IF EXISTS ${table};`);
    }

    // Drop views
    await db.execAsync('DROP VIEW IF EXISTS vw_photos_with_location;');
    await db.execAsync('DROP VIEW IF EXISTS vw_timeline_sections;');
    await db.execAsync('DROP VIEW IF EXISTS vw_location_clusters;');
  }

  /**
   * Verify schema integrity
   */
  static async verifySchema(db: SQLiteDatabase): Promise<boolean> {
    try {
      // Check if all required tables exist
      const requiredTables = [
        'photos', 'locations', 'photo_locations', 'photo_metadata',
        'albums', 'album_photos', 'settings', 'scan_history'
      ];

      for (const table of requiredTables) {
        const result = await db.getFirstAsync(
          `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
          [table]
        );
        
        if (!result) {
          console.error(`Missing required table: ${table}`);
          return false;
        }
      }

      // Run integrity check
      const integrityResult = await db.getFirstAsync('PRAGMA integrity_check;');
      if (integrityResult?.integrity_check !== 'ok') {
        console.error('Database integrity check failed:', integrityResult);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Schema verification failed:', error);
      return false;
    }
  }

  /**
   * Get schema version
   */
  static async getSchemaVersion(db: SQLiteDatabase): Promise<number> {
    try {
      const result = await db.getFirstAsync('PRAGMA user_version;');
      return result?.user_version || 0;
    } catch (error) {
      console.error('Failed to get schema version:', error);
      return 0;
    }
  }

  /**
   * Set schema version
   */
  static async setSchemaVersion(db: SQLiteDatabase, version: number): Promise<void> {
    await db.execAsync(`PRAGMA user_version = ${version};`);
  }
}

export default DatabaseSchema;