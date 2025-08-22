// DatabaseService Backup - Database backup and restore functionality
import * as FileSystem from 'expo-file-system';
import type { SQLiteDatabase } from 'expo-sqlite';
import { DatabaseConfig } from './config';
import type { BackupMetadata } from './types';

export class DatabaseBackup {
  private static readonly BACKUP_DIR = `${FileSystem.documentDirectory}backups/`;
  private static readonly BACKUP_EXTENSION = '.db.backup';
  private static readonly METADATA_EXTENSION = '.metadata.json';

  /**
   * Create a backup of the database
   */
  static async createBackup(db: SQLiteDatabase): Promise<string> {
    try {
      console.log('Creating database backup...');

      // Ensure backup directory exists
      await this.ensureBackupDirectory();

      const timestamp = Date.now();
      const backupFilename = `backup_${timestamp}${this.BACKUP_EXTENSION}`;
      const backupPath = `${this.BACKUP_DIR}${backupFilename}`;
      const metadataPath = `${this.BACKUP_DIR}backup_${timestamp}${this.METADATA_EXTENSION}`;

      // Get database statistics for metadata
      const stats = await this.getDatabaseStats(db);
      
      // Create backup metadata
      const metadata: BackupMetadata = {
        version: await this.getSchemaVersion(db),
        timestamp,
        photoCount: stats.photoCount,
        locationCount: stats.locationCount,
        metadataCount: stats.metadataCount,
        checksums: {
          photos: await this.calculateTableChecksum(db, 'photos'),
          locations: await this.calculateTableChecksum(db, 'locations'),
          metadata: await this.calculateTableChecksum(db, 'photo_metadata')
        }
      };

      // Write metadata file
      await FileSystem.writeAsStringAsync(
        metadataPath,
        JSON.stringify(metadata, null, 2)
      );

      // Perform backup using VACUUM INTO (if supported) or copy method
      await this.performBackup(db, backupPath);

      // Verify backup integrity
      const isValid = await this.verifyBackup(backupPath, metadata);
      if (!isValid) {
        // Clean up invalid backup
        await this.deleteBackupFiles(timestamp);
        throw new Error('Backup verification failed');
      }

      // Clean up old backups
      await this.cleanupOldBackups();

      console.log(`✓ Database backup created successfully: ${backupPath}`);
      return backupPath;
    } catch (error) {
      console.error('Database backup failed:', error);
      throw new Error(`Backup failed: ${error.message}`);
    }
  }

  /**
   * Restore database from backup
   */
  static async restoreFromBackup(db: SQLiteDatabase, backupPath: string): Promise<void> {
    try {
      console.log(`Restoring database from backup: ${backupPath}`);

      // Verify backup file exists
      const backupInfo = await FileSystem.getInfoAsync(backupPath);
      if (!backupInfo.exists) {
        throw new Error('Backup file not found');
      }

      // Load backup metadata
      const metadataPath = backupPath.replace(this.BACKUP_EXTENSION, this.METADATA_EXTENSION);
      const metadata = await this.loadBackupMetadata(metadataPath);

      // Verify backup integrity before restore
      const isValid = await this.verifyBackup(backupPath, metadata);
      if (!isValid) {
        throw new Error('Backup file is corrupted or invalid');
      }

      // Create backup of current database before restore
      const currentBackupPath = await this.createBackup(db);
      console.log(`Current database backed up to: ${currentBackupPath}`);

      try {
        // Perform restore operation
        await this.performRestore(db, backupPath);

        // Verify restored database
        const restoredStats = await this.getDatabaseStats(db);
        if (restoredStats.photoCount !== metadata.photoCount) {
          throw new Error('Restored database photo count mismatch');
        }

        console.log('✓ Database restore completed successfully');
      } catch (restoreError) {
        console.error('Restore failed, attempting to recover:', restoreError);
        
        // Attempt to restore from the backup we just created
        try {
          await this.performRestore(db, currentBackupPath);
          console.log('✓ Successfully recovered original database');
        } catch (recoveryError) {
          console.error('Recovery failed:', recoveryError);
          throw new Error('Restore failed and recovery unsuccessful');
        }
        
        throw restoreError;
      }
    } catch (error) {
      console.error('Database restore failed:', error);
      throw new Error(`Restore failed: ${error.message}`);
    }
  }

  /**
   * List available backups
   */
  static async listBackups(): Promise<Array<{
    path: string;
    timestamp: number;
    metadata: BackupMetadata;
    size: number;
  }>> {
    try {
      await this.ensureBackupDirectory();
      
      const files = await FileSystem.readDirectoryAsync(this.BACKUP_DIR);
      const backupFiles = files.filter(file => file.endsWith(this.BACKUP_EXTENSION));
      
      const backups = [];
      
      for (const file of backupFiles) {
        const backupPath = `${this.BACKUP_DIR}${file}`;
        const metadataPath = backupPath.replace(this.BACKUP_EXTENSION, this.METADATA_EXTENSION);
        
        try {
          const backupInfo = await FileSystem.getInfoAsync(backupPath);
          const metadata = await this.loadBackupMetadata(metadataPath);
          
          backups.push({
            path: backupPath,
            timestamp: metadata.timestamp,
            metadata,
            size: backupInfo.size || 0
          });
        } catch (error) {
          console.warn(`Failed to load backup metadata for ${file}:`, error);
        }
      }
      
      return backups.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Failed to list backups:', error);
      return [];
    }
  }

  /**
   * Delete a specific backup
   */
  static async deleteBackup(backupPath: string): Promise<void> {
    try {
      const metadataPath = backupPath.replace(this.BACKUP_EXTENSION, this.METADATA_EXTENSION);
      
      // Delete backup file
      await FileSystem.deleteAsync(backupPath, { idempotent: true });
      
      // Delete metadata file
      await FileSystem.deleteAsync(metadataPath, { idempotent: true });
      
      console.log(`✓ Backup deleted: ${backupPath}`);
    } catch (error) {
      console.error('Failed to delete backup:', error);
      throw error;
    }
  }

  /**
   * Get backup directory size
   */
  static async getBackupDirectorySize(): Promise<number> {
    try {
      await this.ensureBackupDirectory();
      
      const files = await FileSystem.readDirectoryAsync(this.BACKUP_DIR);
      let totalSize = 0;
      
      for (const file of files) {
        const filePath = `${this.BACKUP_DIR}${file}`;
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        totalSize += fileInfo.size || 0;
      }
      
      return totalSize;
    } catch (error) {
      console.error('Failed to calculate backup directory size:', error);
      return 0;
    }
  }

  /**
   * Schedule automatic backup
   */
  static async scheduleAutomaticBackup(db: SQLiteDatabase): Promise<void> {
    // This would integrate with background tasks
    // For now, we'll check if a backup is needed based on time
    try {
      const backups = await this.listBackups();
      const lastBackup = backups[0];
      
      const shouldBackup = !lastBackup || 
        (Date.now() - lastBackup.timestamp) > (DatabaseConfig.BACKUP_INTERVAL_HOURS * 60 * 60 * 1000);
      
      if (shouldBackup) {
        await this.createBackup(db);
        console.log('✓ Automatic backup completed');
      }
    } catch (error) {
      console.error('Automatic backup failed:', error);
    }
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  /**
   * Ensure backup directory exists
   */
  private static async ensureBackupDirectory(): Promise<void> {
    const dirInfo = await FileSystem.getInfoAsync(this.BACKUP_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(this.BACKUP_DIR, { intermediates: true });
    }
  }

  /**
   * Perform the actual backup operation
   */
  private static async performBackup(db: SQLiteDatabase, backupPath: string): Promise<void> {
    // Method 1: Try VACUUM INTO (SQLite 3.27+)
    try {
      await db.execAsync(`VACUUM INTO '${backupPath}';`);
      return;
    } catch (error) {
      console.log('VACUUM INTO not supported, using alternative method');
    }

    // Method 2: Use ATTACH and copy tables
    await db.withTransactionAsync(async () => {
      // Attach backup database
      await db.execAsync(`ATTACH DATABASE '${backupPath}' AS backup_db;`);
      
      try {
        // Get list of all tables
        const tables = await db.getAllAsync(`
          SELECT name FROM sqlite_master 
          WHERE type='table' AND name NOT LIKE 'sqlite_%'
        `);

        // Copy each table
        for (const table of tables) {
          const tableName = (table as any).name;
          
          // Get table schema
          const schema = await db.getFirstAsync(`
            SELECT sql FROM sqlite_master 
            WHERE type='table' AND name=?
          `, [tableName]);
          
          if (schema) {
            // Create table in backup
            const createSQL = (schema as any).sql.replace(
              `CREATE TABLE ${tableName}`,
              `CREATE TABLE backup_db.${tableName}`
            );
            await db.execAsync(createSQL);
            
            // Copy data
            await db.execAsync(`
              INSERT INTO backup_db.${tableName} 
              SELECT * FROM ${tableName};
            `);
          }
        }

        // Copy indexes
        const indexes = await db.getAllAsync(`
          SELECT sql FROM sqlite_master 
          WHERE type='index' AND name NOT LIKE 'sqlite_%'
        `);

        for (const index of indexes) {
          const indexSQL = (index as any).sql;
          if (indexSQL) {
            const backupIndexSQL = indexSQL.replace(
              /CREATE INDEX ([^ ]+)/,
              'CREATE INDEX backup_db.$1'
            );
            await db.execAsync(backupIndexSQL);
          }
        }
      } finally {
        // Detach backup database
        await db.execAsync('DETACH DATABASE backup_db;');
      }
    });
  }

  /**
   * Perform database restore
   */
  private static async performRestore(db: SQLiteDatabase, backupPath: string): Promise<void> {
    await db.withTransactionAsync(async () => {
      // Attach backup database
      await db.execAsync(`ATTACH DATABASE '${backupPath}' AS restore_db;`);
      
      try {
        // Get list of tables to restore
        const tables = await db.getAllAsync(`
          SELECT name FROM restore_db.sqlite_master 
          WHERE type='table' AND name NOT LIKE 'sqlite_%'
        `);

        // Clear existing data
        for (const table of tables) {
          const tableName = (table as any).name;
          await db.execAsync(`DELETE FROM ${tableName};`);
        }

        // Restore data
        for (const table of tables) {
          const tableName = (table as any).name;
          await db.execAsync(`
            INSERT INTO ${tableName} 
            SELECT * FROM restore_db.${tableName};
          `);
        }
      } finally {
        // Detach restore database
        await db.execAsync('DETACH DATABASE restore_db;');
      }
    });
  }

  /**
   * Verify backup integrity
   */
  private static async verifyBackup(backupPath: string, metadata: BackupMetadata): Promise<boolean> {
    try {
      // Check if backup file exists and has reasonable size
      const backupInfo = await FileSystem.getInfoAsync(backupPath);
      if (!backupInfo.exists || (backupInfo.size || 0) < 1024) {
        return false;
      }

      // TODO: Open backup database and verify table counts
      // For now, we'll do basic file validation
      return true;
    } catch (error) {
      console.error('Backup verification failed:', error);
      return false;
    }
  }

  /**
   * Load backup metadata
   */
  private static async loadBackupMetadata(metadataPath: string): Promise<BackupMetadata> {
    try {
      const metadataContent = await FileSystem.readAsStringAsync(metadataPath);
      return JSON.parse(metadataContent);
    } catch (error) {
      throw new Error(`Failed to load backup metadata: ${error.message}`);
    }
  }

  /**
   * Get database statistics
   */
  private static async getDatabaseStats(db: SQLiteDatabase): Promise<{
    photoCount: number;
    locationCount: number;
    metadataCount: number;
  }> {
    const [photoResult, locationResult, metadataResult] = await Promise.all([
      db.getFirstAsync('SELECT COUNT(*) as count FROM photos'),
      db.getFirstAsync('SELECT COUNT(*) as count FROM locations'),
      db.getFirstAsync('SELECT COUNT(*) as count FROM photo_metadata')
    ]);

    return {
      photoCount: (photoResult as any)?.count || 0,
      locationCount: (locationResult as any)?.count || 0,
      metadataCount: (metadataResult as any)?.count || 0
    };
  }

  /**
   * Get schema version
   */
  private static async getSchemaVersion(db: SQLiteDatabase): Promise<string> {
    try {
      const result = await db.getFirstAsync('PRAGMA user_version;');
      return String((result as any)?.user_version || 1);
    } catch (error) {
      return '1';
    }
  }

  /**
   * Calculate table checksum for integrity verification
   */
  private static async calculateTableChecksum(db: SQLiteDatabase, tableName: string): Promise<string> {
    try {
      // Simple checksum based on row count and some data sampling
      const result = await db.getFirstAsync(`
        SELECT COUNT(*) as count, 
               COALESCE(SUM(LENGTH(CAST(rowid AS TEXT))), 0) as rowsum
        FROM ${tableName}
      `);
      
      const count = (result as any)?.count || 0;
      const rowsum = (result as any)?.rowsum || 0;
      
      return `${count}-${rowsum}`;
    } catch (error) {
      console.error(`Failed to calculate checksum for ${tableName}:`, error);
      return '0-0';
    }
  }

  /**
   * Clean up old backups beyond the configured limit
   */
  private static async cleanupOldBackups(): Promise<void> {
    try {
      const backups = await this.listBackups();
      
      if (backups.length > DatabaseConfig.MAX_BACKUPS) {
        const backupsToDelete = backups.slice(DatabaseConfig.MAX_BACKUPS);
        
        for (const backup of backupsToDelete) {
          await this.deleteBackup(backup.path);
        }
        
        console.log(`✓ Cleaned up ${backupsToDelete.length} old backups`);
      }
    } catch (error) {
      console.error('Failed to cleanup old backups:', error);
    }
  }

  /**
   * Delete backup files by timestamp
   */
  private static async deleteBackupFiles(timestamp: number): Promise<void> {
    try {
      const backupPath = `${this.BACKUP_DIR}backup_${timestamp}${this.BACKUP_EXTENSION}`;
      const metadataPath = `${this.BACKUP_DIR}backup_${timestamp}${this.METADATA_EXTENSION}`;
      
      await FileSystem.deleteAsync(backupPath, { idempotent: true });
      await FileSystem.deleteAsync(metadataPath, { idempotent: true });
    } catch (error) {
      console.error('Failed to delete backup files:', error);
    }
  }
}

export default DatabaseBackup;