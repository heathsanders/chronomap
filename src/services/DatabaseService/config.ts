// DatabaseService Configuration - Database settings and constants
export const DatabaseConfig = {
  // Database file name
  DATABASE_NAME: 'chronomap.db',
  
  // Database version for migrations
  DATABASE_VERSION: 1,
  
  // Performance settings
  WAL_MODE: true,
  CACHE_SIZE: 10000, // Number of pages
  SYNCHRONOUS_MODE: 'NORMAL', // FULL, NORMAL, OFF
  TEMP_STORE: 'memory', // memory, file, default
  
  // Connection settings
  FOREIGN_KEYS: true,
  ENABLE_CHANGE_LISTENER: true,
  USE_NEW_CONNECTION: true,
  
  // Query timeouts (milliseconds)
  QUERY_TIMEOUT: 30000,
  TRANSACTION_TIMEOUT: 60000,
  
  // Backup settings
  MAX_BACKUPS: 5,
  BACKUP_INTERVAL_HOURS: 24,
  AUTO_BACKUP_ENABLED: true,
  
  // Maintenance settings
  AUTO_VACUUM_ENABLED: true,
  VACUUM_THRESHOLD_MB: 100,
  INDEX_MAINTENANCE_INTERVAL: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  
  // Security settings
  ENCRYPTION_KEY_LENGTH: 64,
  SECURE_STORE_OPTIONS: {
    requireAuthentication: false, // Set to true for biometric auth
    authenticationPrompt: 'Authenticate to access ChronoMap data',
    keychainService: 'chronomap-keychain',
    showModal: true,
    kSecAccessControl: 'kSecAccessControlBiometryAny',
  },
  
  // Privacy settings
  DEFAULT_PRIVACY_SETTINGS: {
    dataRetentionPeriod: 90, // days
    metadataProcessingLevel: 'standard' as const,
    locationPrecision: 'city' as const,
    automaticBackup: true,
    crashReporting: false,
    analytics: false,
  },
  
  // Performance monitoring
  ENABLE_QUERY_MONITORING: __DEV__, // Only in development
  SLOW_QUERY_THRESHOLD: 1000, // milliseconds
  MAX_QUERY_LOG_ENTRIES: 100,
  
  // Cache settings
  METADATA_CACHE_SIZE: 1000,
  LOCATION_CACHE_SIZE: 500,
  QUERY_CACHE_TTL: 5 * 60 * 1000, // 5 minutes in ms
  
  // Batch processing settings
  DEFAULT_BATCH_SIZE: 100,
  MAX_BATCH_SIZE: 1000,
  BATCH_TIMEOUT: 30000, // milliseconds
  
  // Database limits
  MAX_PHOTO_RECORDS: 100000,
  MAX_LOCATION_RECORDS: 10000,
  MAX_METADATA_ENTRIES_PER_PHOTO: 50,
  MAX_STRING_LENGTH: 2048,
  
  // Index settings
  INDEX_FILL_FACTOR: 90,
  AUTO_INDEX_ENABLED: true,
  
  // Error handling
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
  CONNECTION_RETRY_DELAY: 5000,
  
  // Development settings
  DEBUG_SQL: __DEV__,
  LOG_SLOW_QUERIES: __DEV__,
  VALIDATE_SCHEMA: __DEV__,
} as const;

// SQL Pragma statements for database optimization
export const DatabasePragmas = {
  // Performance optimizations
  PERFORMANCE: [
    'PRAGMA journal_mode = WAL;',
    'PRAGMA synchronous = NORMAL;',
    'PRAGMA cache_size = 10000;',
    'PRAGMA temp_store = memory;',
    'PRAGMA mmap_size = 268435456;', // 256MB
    'PRAGMA optimize;',
  ],
  
  // Security and integrity
  SECURITY: [
    'PRAGMA foreign_keys = ON;',
    'PRAGMA recursive_triggers = ON;',
    'PRAGMA trusted_schema = OFF;',
  ],
  
  // Analysis and maintenance
  ANALYSIS: [
    'PRAGMA analysis_limit = 1000;',
    'PRAGMA auto_vacuum = INCREMENTAL;',
  ],
  
  // Development and debugging
  DEVELOPMENT: __DEV__ ? [
    'PRAGMA case_sensitive_like = ON;',
    'PRAGMA checkpoint_fullfsync = ON;',
  ] : [],
} as const;

// Table and column naming conventions
export const NamingConventions = {
  // Table names (plural, snake_case)
  TABLES: {
    PHOTOS: 'photos',
    LOCATIONS: 'locations',
    PHOTO_LOCATIONS: 'photo_locations',
    PHOTO_METADATA: 'photo_metadata',
    ALBUMS: 'albums',
    ALBUM_PHOTOS: 'album_photos',
    SETTINGS: 'settings',
    SCAN_HISTORY: 'scan_history',
    PRIVACY_SETTINGS: 'privacy_settings',
    DATA_PROCESSING_CONSENT: 'data_processing_consent',
    PRIVACY_AUDIT_LOG: 'privacy_audit_log',
  },
  
  // Index naming pattern: idx_{table}_{columns}
  INDEX_PREFIX: 'idx_',
  
  // Foreign key naming pattern: fk_{table}_{referenced_table}
  FOREIGN_KEY_PREFIX: 'fk_',
  
  // Trigger naming pattern: tr_{table}_{action}
  TRIGGER_PREFIX: 'tr_',
  
  // View naming pattern: vw_{description}
  VIEW_PREFIX: 'vw_',
} as const;

// Query patterns for common operations
export const QueryPatterns = {
  // Pagination pattern
  PAGINATION: {
    LIMIT_OFFSET: 'LIMIT ? OFFSET ?',
    CURSOR_BASED: 'WHERE id > ? ORDER BY id LIMIT ?',
  },
  
  // Date range patterns
  DATE_RANGES: {
    BETWEEN: 'creation_time BETWEEN ? AND ?',
    GREATER_THAN: 'creation_time > ?',
    LESS_THAN: 'creation_time < ?',
    TODAY: 'DATE(creation_time, \'unixepoch\') = DATE(\'now\')',
    THIS_WEEK: 'creation_time > strftime(\'%s\', \'now\', \'-7 days\')',
    THIS_MONTH: 'creation_time > strftime(\'%s\', \'now\', \'start of month\')',
    THIS_YEAR: 'creation_time > strftime(\'%s\', \'now\', \'start of year\')',
  },
  
  // Location patterns
  LOCATION: {
    BOUNDS: 'latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ?',
    RADIUS: '((latitude - ?) * (latitude - ?) + (longitude - ?) * (longitude - ?)) < ?',
    NEARBY: 'ABS(latitude - ?) < ? AND ABS(longitude - ?) < ?',
  },
  
  // Common sorting patterns
  SORTING: {
    CREATION_TIME_DESC: 'ORDER BY creation_time DESC',
    CREATION_TIME_ASC: 'ORDER BY creation_time ASC',
    FILENAME_ASC: 'ORDER BY filename ASC',
    SIZE_DESC: 'ORDER BY file_size DESC',
    MODIFIED_DESC: 'ORDER BY modification_time DESC',
  },
} as const;

// Error codes for database operations
export const DatabaseErrorCodes = {
  CONNECTION_FAILED: 'DB_CONNECTION_FAILED',
  MIGRATION_FAILED: 'DB_MIGRATION_FAILED',
  QUERY_FAILED: 'DB_QUERY_FAILED',
  TRANSACTION_FAILED: 'DB_TRANSACTION_FAILED',
  INTEGRITY_ERROR: 'DB_INTEGRITY_ERROR',
  CONSTRAINT_VIOLATION: 'DB_CONSTRAINT_VIOLATION',
  ENCRYPTION_ERROR: 'DB_ENCRYPTION_ERROR',
  BACKUP_FAILED: 'DB_BACKUP_FAILED',
  RESTORE_FAILED: 'DB_RESTORE_FAILED',
  SCHEMA_MISMATCH: 'DB_SCHEMA_MISMATCH',
  TIMEOUT: 'DB_TIMEOUT',
  DISK_FULL: 'DB_DISK_FULL',
  PERMISSION_DENIED: 'DB_PERMISSION_DENIED',
} as const;

// Performance thresholds for monitoring
export const PerformanceThresholds = {
  SLOW_QUERY_MS: 1000,
  VERY_SLOW_QUERY_MS: 5000,
  MAX_MEMORY_MB: 200,
  MAX_DATABASE_SIZE_MB: 1000,
  MAX_WAL_SIZE_MB: 50,
  MAX_TRANSACTION_TIME_MS: 10000,
  INDEX_SCAN_RATIO_THRESHOLD: 0.8, // 80% of queries should use indexes
} as const;

// Export consolidated config object
export const DatabaseConstants = {
  ...DatabaseConfig,
  PRAGMAS: DatabasePragmas,
  NAMING: NamingConventions,
  QUERIES: QueryPatterns,
  ERRORS: DatabaseErrorCodes,
  PERFORMANCE: PerformanceThresholds,
} as const;

export default DatabaseConfig;