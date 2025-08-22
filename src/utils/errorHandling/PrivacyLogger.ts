/**
 * Privacy-Safe Logger
 * Logging system that respects user privacy and GDPR compliance
 */

// import { AppError } from '@/types'; // TODO: Use when implementing structured logging
import { APP_CONFIG } from '@/config';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogCategory = 
  | 'performance' 
  | 'user-action' 
  | 'system' 
  | 'error' 
  | 'privacy' 
  | 'security';

export interface LogEntry {
  level: LogLevel;
  category: LogCategory;
  message: string;
  timestamp: Date;
  metadata?: Record<string, any>;
  session: string;
}

export interface LoggerConfig {
  enableLogging: boolean;
  enableConsoleLogging: boolean;
  enableFileLogging: boolean;
  maxLogEntries: number;
  privacyMode: 'strict' | 'balanced' | 'disabled';
  allowedCategories: LogCategory[];
  retentionDays: number;
}

class PrivacyLogger {
  private static instance: PrivacyLogger;
  private logs: LogEntry[] = [];
  private sessionId: string;
  private config: LoggerConfig;
  
  private readonly SENSITIVE_PATTERNS = [
    /password/i,
    /token/i,
    /key/i,
    /secret/i,
    /\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/, // Credit card patterns
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email patterns
    /file:\/\/[^\s]+/, // File paths
    /\/[^\s]*\.jpg|\.jpeg|\.png|\.mp4/, // Media file paths
  ];

  constructor() {
    this.sessionId = this.generateSessionId();
    this.config = this.getDefaultConfig();
    this.initializeLogger();
  }

  static getInstance(): PrivacyLogger {
    if (!PrivacyLogger.instance) {
      PrivacyLogger.instance = new PrivacyLogger();
    }
    return PrivacyLogger.instance;
  }

  /**
   * Log debug information (development only)
   */
  debug(message: string, category: LogCategory = 'system', metadata?: Record<string, any>): void {
    if (__DEV__) {
      this.log('debug', category, message, metadata);
    }
  }

  /**
   * Log informational messages
   */
  info(message: string, category: LogCategory = 'system', metadata?: Record<string, any>): void {
    this.log('info', category, message, metadata);
  }

  /**
   * Log warning messages
   */
  warn(message: string, category: LogCategory = 'system', metadata?: Record<string, any>): void {
    this.log('warn', category, message, metadata);
  }

  /**
   * Log error messages
   */
  error(message: string, category: LogCategory = 'error', metadata?: Record<string, any>): void {
    this.log('error', category, message, metadata);
  }

  /**
   * Log user actions (for analytics)
   */
  userAction(action: string, metadata?: Record<string, any>): void {
    if (this.config.allowedCategories.includes('user-action')) {
      this.log('info', 'user-action', action, metadata);
    }
  }

  /**
   * Log performance metrics
   */
  performance(metric: string, value: number, metadata?: Record<string, any>): void {
    if (this.config.allowedCategories.includes('performance')) {
      this.log('info', 'performance', metric, { 
        value, 
        unit: 'ms', 
        ...metadata 
      });
    }
  }

  /**
   * Log privacy-related events
   */
  privacy(event: string, metadata?: Record<string, any>): void {
    this.log('info', 'privacy', event, metadata);
  }

  /**
   * Log security events
   */
  security(event: string, metadata?: Record<string, any>): void {
    this.log('warn', 'security', event, metadata);
  }

  /**
   * Update logger configuration
   */
  updateConfig(newConfig: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Respect privacy settings
    if (this.config.privacyMode === 'strict') {
      this.config.allowedCategories = ['error', 'privacy', 'security'];
    }
  }

  /**
   * Get logs for export (privacy-filtered)
   */
  getLogs(options: {
    level?: LogLevel;
    category?: LogCategory;
    since?: Date;
    limit?: number;
  } = {}): LogEntry[] {
    let filteredLogs = this.logs;

    if (options.level) {
      const levelPriority = this.getLevelPriority(options.level);
      filteredLogs = filteredLogs.filter(
        log => this.getLevelPriority(log.level) >= levelPriority
      );
    }

    if (options.category) {
      filteredLogs = filteredLogs.filter(log => log.category === options.category);
    }

    if (options.since) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= options.since!);
    }

    if (options.limit) {
      filteredLogs = filteredLogs.slice(-options.limit);
    }

    return filteredLogs.map(this.sanitizeLogEntry.bind(this));
  }

  /**
   * Export logs as JSON (privacy-safe)
   */
  exportLogs(): string {
    const exportData = {
      sessionId: this.sessionId,
      exportDate: new Date().toISOString(),
      appVersion: APP_CONFIG.version,
      privacyMode: this.config.privacyMode,
      logs: this.getLogs(),
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
    this.sessionId = this.generateSessionId();
  }

  /**
   * Get logging statistics
   */
  getStats(): {
    totalLogs: number;
    logsByLevel: Record<LogLevel, number>;
    logsByCategory: Record<LogCategory, number>;
    sessionId: string;
    oldestLog?: Date;
    newestLog?: Date;
  } {
    const stats = {
      totalLogs: this.logs.length,
      logsByLevel: {} as Record<LogLevel, number>,
      logsByCategory: {} as Record<LogCategory, number>,
      sessionId: this.sessionId,
      oldestLog: this.logs[0]?.timestamp,
      newestLog: this.logs[this.logs.length - 1]?.timestamp,
    };

    this.logs.forEach(log => {
      stats.logsByLevel[log.level] = (stats.logsByLevel[log.level] || 0) + 1;
      stats.logsByCategory[log.category] = (stats.logsByCategory[log.category] || 0) + 1;
    });

    return stats;
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel, 
    category: LogCategory, 
    message: string, 
    metadata?: Record<string, any>
  ): void {
    if (!this.config.enableLogging) return;
    if (!this.config.allowedCategories.includes(category)) return;

    const sanitizedMessage = this.sanitizeMessage(message);
    const sanitizedMetadata = metadata ? this.sanitizeMetadata(metadata) : undefined;

    const logEntry: LogEntry = {
      level,
      category,
      message: sanitizedMessage,
      timestamp: new Date(),
      metadata: sanitizedMetadata,
      session: this.sessionId,
    };

    // Add to internal log
    this.addToLog(logEntry);

    // Console logging
    if (this.config.enableConsoleLogging) {
      this.consoleLog(logEntry);
    }

    // File logging (placeholder - would integrate with file system)
    if (this.config.enableFileLogging) {
      this.fileLog(logEntry);
    }
  }

  /**
   * Add log entry to internal storage
   */
  private addToLog(entry: LogEntry): void {
    this.logs.push(entry);

    // Manage log size
    if (this.logs.length > this.config.maxLogEntries) {
      this.logs = this.logs.slice(-this.config.maxLogEntries);
    }

    // Clean old logs based on retention policy
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);
    this.logs = this.logs.filter(log => log.timestamp >= cutoffDate);
  }

  /**
   * Output to console with formatting
   */
  private consoleLog(entry: LogEntry): void {
    const prefix = `[${entry.timestamp.toISOString()}] [${entry.level.toUpperCase()}] [${entry.category}]`;
    const message = `${prefix} ${entry.message}`;

    switch (entry.level) {
      case 'error':
        console.error(message, entry.metadata);
        break;
      case 'warn':
        console.warn(message, entry.metadata);
        break;
      case 'info':
        console.info(message, entry.metadata);
        break;
      case 'debug':
        console.debug(message, entry.metadata);
        break;
    }
  }

  /**
   * Write to file (placeholder)
   */
  private fileLog(entry: LogEntry): void {
    // Placeholder for file logging implementation
    // Would integrate with expo-file-system for persistent logging
  }

  /**
   * Sanitize message content
   */
  private sanitizeMessage(message: string): string {
    let sanitized = message;

    this.SENSITIVE_PATTERNS.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    });

    return sanitized;
  }

  /**
   * Sanitize metadata object
   */
  private sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    Object.keys(metadata).forEach(key => {
      const value = metadata[key];
      
      if (this.isSensitiveKey(key)) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'string') {
        sanitized[key] = this.sanitizeMessage(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeMetadata(value);
      } else {
        sanitized[key] = value;
      }
    });

    return sanitized;
  }

  /**
   * Sanitize log entry for export
   */
  private sanitizeLogEntry(entry: LogEntry): LogEntry {
    return {
      ...entry,
      message: this.sanitizeMessage(entry.message),
      metadata: entry.metadata ? this.sanitizeMetadata(entry.metadata) : undefined,
    };
  }

  /**
   * Check if key contains sensitive information
   */
  private isSensitiveKey(key: string): boolean {
    const sensitiveKeys = [
      'password', 'token', 'key', 'secret', 'auth', 'credential',
      'uri', 'path', 'filename', 'location', 'gps', 'coordinates'
    ];
    
    return sensitiveKeys.some(sensitive => 
      key.toLowerCase().includes(sensitive)
    );
  }

  /**
   * Get log level priority for filtering
   */
  private getLevelPriority(level: LogLevel): number {
    const priorities = { debug: 0, info: 1, warn: 2, error: 3 };
    return priorities[level] || 0;
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): LoggerConfig {
    return {
      enableLogging: !APP_CONFIG.privacy.noAnalytics,
      enableConsoleLogging: __DEV__,
      enableFileLogging: false,
      maxLogEntries: 1000,
      privacyMode: APP_CONFIG.privacy.localOnly ? 'strict' : 'balanced',
      allowedCategories: APP_CONFIG.privacy.localOnly 
        ? ['error', 'privacy', 'security']
        : ['system', 'error', 'privacy', 'security', 'performance'],
      retentionDays: 7,
    };
  }

  /**
   * Initialize logger with privacy settings
   */
  private initializeLogger(): void {
    this.privacy('Logger initialized', {
      privacyMode: this.config.privacyMode,
      allowedCategories: this.config.allowedCategories,
    });
  }
}

// Export singleton instance
export default PrivacyLogger.getInstance();