// DatabaseService Migrations - Database schema migration system
import type { SQLiteDatabase } from 'expo-sqlite';
import { DatabaseConfig } from './config';
import { DatabaseSchema } from './schema';
import type { MigrationScript, DatabaseMigrationError } from './types';

export class DatabaseMigration {
  private static migrations: MigrationScript[] = [
    {
      version: 1,
      description: 'Initial database schema',
      up: [
        // This is handled by DatabaseSchema.createTables()
        'SELECT 1;' // Placeholder
      ],
      down: [
        'DROP TABLE IF EXISTS privacy_audit_log;',
        'DROP TABLE IF EXISTS data_processing_consent;',
        'DROP TABLE IF EXISTS privacy_settings;',
        'DROP TABLE IF EXISTS scan_history;',
        'DROP TABLE IF EXISTS album_photos;',
        'DROP TABLE IF EXISTS albums;',
        'DROP TABLE IF EXISTS photo_metadata;',
        'DROP TABLE IF EXISTS photo_locations;',
        'DROP TABLE IF EXISTS locations;',
        'DROP TABLE IF EXISTS photos;',
        'DROP TABLE IF EXISTS settings;'
      ]
    },
    // Future migrations will be added here
    // {
    //   version: 2,
    //   description: 'Add face recognition tables',
    //   up: [
    //     'CREATE TABLE faces (...);',
    //     'CREATE TABLE photo_faces (...);'
    //   ],
    //   down: [
    //     'DROP TABLE photo_faces;',
    //     'DROP TABLE faces;'
    //   ]
    // }
  ];

  /**
   * Run all pending migrations
   */
  static async runMigrations(db: SQLiteDatabase): Promise<void> {
    try {
      console.log('Starting database migrations...');

      // Get current schema version
      const currentVersion = await DatabaseSchema.getSchemaVersion(db);
      console.log(`Current database version: ${currentVersion}`);

      // Find migrations to run
      const pendingMigrations = this.migrations.filter(
        migration => migration.version > currentVersion
      );

      if (pendingMigrations.length === 0) {
        console.log('No pending migrations');
        return;
      }

      console.log(`Found ${pendingMigrations.length} pending migrations`);

      // Run migrations in transaction
      await this.runMigrationsInTransaction(db, pendingMigrations);

      // Update schema version
      const latestVersion = Math.max(...this.migrations.map(m => m.version));
      await DatabaseSchema.setSchemaVersion(db, latestVersion);

      console.log(`Database migration completed. New version: ${latestVersion}`);
    } catch (error) {
      console.error('Migration failed:', error);
      throw new DatabaseMigrationError(
        `Migration failed: ${error.message}`,
        await DatabaseSchema.getSchemaVersion(db)
      );
    }
  }

  /**
   * Run migrations within a transaction for atomicity
   */
  private static async runMigrationsInTransaction(
    db: SQLiteDatabase,
    migrations: MigrationScript[]
  ): Promise<void> {
    await db.withTransactionAsync(async () => {
      for (const migration of migrations) {
        console.log(`Running migration ${migration.version}: ${migration.description}`);
        
        try {
          if (migration.version === 1) {
            // For initial migration, use schema creation
            await DatabaseSchema.createTables(db);
          } else {
            // Run migration SQL statements
            for (const sql of migration.up) {
              await db.execAsync(sql);
            }
          }
          
          console.log(`✓ Migration ${migration.version} completed`);
        } catch (error) {
          console.error(`✗ Migration ${migration.version} failed:`, error);
          throw error;
        }
      }
    });
  }

  /**
   * Rollback to a specific version
   */
  static async rollbackToVersion(db: SQLiteDatabase, targetVersion: number): Promise<void> {
    try {
      console.log(`Rolling back to version ${targetVersion}...`);

      const currentVersion = await DatabaseSchema.getSchemaVersion(db);
      
      if (targetVersion >= currentVersion) {
        throw new Error('Target version must be lower than current version');
      }

      // Find migrations to rollback (in reverse order)
      const migrationsToRollback = this.migrations
        .filter(migration => migration.version > targetVersion)
        .sort((a, b) => b.version - a.version); // Descending order

      if (migrationsToRollback.length === 0) {
        console.log('No migrations to rollback');
        return;
      }

      // Run rollbacks in transaction
      await db.withTransactionAsync(async () => {
        for (const migration of migrationsToRollback) {
          console.log(`Rolling back migration ${migration.version}: ${migration.description}`);
          
          try {
            for (const sql of migration.down) {
              await db.execAsync(sql);
            }
            console.log(`✓ Rollback ${migration.version} completed`);
          } catch (error) {
            console.error(`✗ Rollback ${migration.version} failed:`, error);
            throw error;
          }
        }
      });

      // Update schema version
      await DatabaseSchema.setSchemaVersion(db, targetVersion);
      console.log(`Rollback completed. Current version: ${targetVersion}`);
    } catch (error) {
      console.error('Rollback failed:', error);
      throw new DatabaseMigrationError(`Rollback failed: ${error.message}`, targetVersion);
    }
  }

  /**
   * Get migration status
   */
  static async getMigrationStatus(db: SQLiteDatabase): Promise<{
    currentVersion: number;
    latestVersion: number;
    pendingMigrations: MigrationScript[];
    appliedMigrations: MigrationScript[];
  }> {
    const currentVersion = await DatabaseSchema.getSchemaVersion(db);
    const latestVersion = Math.max(...this.migrations.map(m => m.version));
    
    const pendingMigrations = this.migrations.filter(
      migration => migration.version > currentVersion
    );
    
    const appliedMigrations = this.migrations.filter(
      migration => migration.version <= currentVersion
    );

    return {
      currentVersion,
      latestVersion,
      pendingMigrations,
      appliedMigrations
    };
  }

  /**
   * Validate migration scripts
   */
  static validateMigrations(): string[] {
    const errors: string[] = [];

    // Check for duplicate versions
    const versions = this.migrations.map(m => m.version);
    const duplicateVersions = versions.filter((v, i) => versions.indexOf(v) !== i);
    if (duplicateVersions.length > 0) {
      errors.push(`Duplicate migration versions: ${duplicateVersions.join(', ')}`);
    }

    // Check for gaps in version numbers
    const sortedVersions = [...versions].sort((a, b) => a - b);
    for (let i = 1; i < sortedVersions.length; i++) {
      if (sortedVersions[i] !== sortedVersions[i - 1] + 1) {
        errors.push(`Gap in migration versions between ${sortedVersions[i - 1]} and ${sortedVersions[i]}`);
      }
    }

    // Check that each migration has up and down scripts
    this.migrations.forEach(migration => {
      if (!migration.up || migration.up.length === 0) {
        errors.push(`Migration ${migration.version} missing 'up' scripts`);
      }
      if (!migration.down || migration.down.length === 0) {
        errors.push(`Migration ${migration.version} missing 'down' scripts`);
      }
    });

    return errors;
  }

  /**
   * Create a new migration template
   */
  static createMigrationTemplate(description: string): MigrationScript {
    const nextVersion = Math.max(...this.migrations.map(m => m.version)) + 1;
    
    return {
      version: nextVersion,
      description,
      up: [
        '-- Add your migration SQL here',
        'SELECT 1;' // Placeholder
      ],
      down: [
        '-- Add your rollback SQL here',
        'SELECT 1;' // Placeholder
      ]
    };
  }

  /**
   * Test migration integrity
   */
  static async testMigrations(db: SQLiteDatabase): Promise<boolean> {
    try {
      console.log('Testing migration integrity...');

      // Validate migration scripts
      const errors = this.validateMigrations();
      if (errors.length > 0) {
        console.error('Migration validation errors:', errors);
        return false;
      }

      // Test migration cycle (up and down)
      const originalVersion = await DatabaseSchema.getSchemaVersion(db);
      
      // Run all migrations
      await this.runMigrations(db);
      
      // Verify schema integrity
      const schemaValid = await DatabaseSchema.verifySchema(db);
      if (!schemaValid) {
        console.error('Schema integrity check failed after migrations');
        return false;
      }

      // Test rollback to original version
      if (originalVersion > 0) {
        await this.rollbackToVersion(db, originalVersion);
        
        // Run migrations again
        await this.runMigrations(db);
      }

      console.log('Migration integrity test passed');
      return true;
    } catch (error) {
      console.error('Migration integrity test failed:', error);
      return false;
    }
  }

  /**
   * Get migration history from database
   */
  static async getMigrationHistory(db: SQLiteDatabase): Promise<{
    version: number;
    appliedAt: number;
    description?: string;
  }[]> {
    try {
      // Check if migration history table exists
      const tableExists = await db.getFirstAsync(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='migration_history'
      `);

      if (!tableExists) {
        // Create migration history table
        await db.execAsync(`
          CREATE TABLE migration_history (
            version INTEGER PRIMARY KEY,
            description TEXT,
            applied_at INTEGER NOT NULL,
            checksum TEXT
          );
        `);
        return [];
      }

      const history = await db.getAllAsync(`
        SELECT version, description, applied_at 
        FROM migration_history 
        ORDER BY version DESC
      `);

      return history.map((row: any) => ({
        version: row.version,
        appliedAt: row.applied_at,
        description: row.description
      }));
    } catch (error) {
      console.error('Failed to get migration history:', error);
      return [];
    }
  }

  /**
   * Record migration in history
   */
  static async recordMigration(
    db: SQLiteDatabase,
    migration: MigrationScript
  ): Promise<void> {
    try {
      await db.runAsync(`
        INSERT OR REPLACE INTO migration_history 
        (version, description, applied_at, checksum)
        VALUES (?, ?, ?, ?)
      `, [
        migration.version,
        migration.description,
        Math.floor(Date.now() / 1000),
        this.calculateMigrationChecksum(migration)
      ]);
    } catch (error) {
      console.warn('Failed to record migration in history:', error);
      // Don't fail the migration for history recording issues
    }
  }

  /**
   * Calculate checksum for migration integrity
   */
  private static calculateMigrationChecksum(migration: MigrationScript): string {
    const content = JSON.stringify({
      version: migration.version,
      up: migration.up,
      down: migration.down
    });
    
    // Simple checksum calculation (in production, use crypto)
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  /**
   * Force reset database to specific version (dangerous!)
   */
  static async forceResetToVersion(
    db: SQLiteDatabase,
    version: number
  ): Promise<void> {
    console.warn(`Force resetting database to version ${version}. This may cause data loss!`);
    
    try {
      await DatabaseSchema.setSchemaVersion(db, version);
      console.log(`Database version forcefully set to ${version}`);
    } catch (error) {
      console.error('Force reset failed:', error);
      throw error;
    }
  }
}

export default DatabaseMigration;