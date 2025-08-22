/**
 * Centralized Error Manager
 * Privacy-safe error handling, logging, and recovery for ChronoMap
 */

import { AppError, ErrorCode } from '@/types';

export interface ErrorMetrics {
  totalErrors: number;
  errorsByCode: Record<ErrorCode, number>;
  lastError: Date | null;
  recoveryAttempts: number;
  successfulRecoveries: number;
}

export interface ErrorHandlerOptions {
  shouldLog?: boolean;
  shouldNotifyUser?: boolean;
  shouldAttemptRecovery?: boolean;
  maxRetries?: number;
  privacySafe?: boolean;
}

export interface RecoveryStrategy {
  code: ErrorCode;
  handler: (error: AppError) => Promise<boolean>;
  maxAttempts: number;
  description: string;
}

class ErrorManager {
  private static instance: ErrorManager;
  private errorLog: AppError[] = [];
  private metrics: ErrorMetrics = {
    totalErrors: 0,
    errorsByCode: {} as Record<ErrorCode, number>,
    lastError: null,
    recoveryAttempts: 0,
    successfulRecoveries: 0,
  };
  private recoveryStrategies = new Map<ErrorCode, RecoveryStrategy>();
  private errorCallbacks = new Set<(error: AppError) => void>();
  
  private readonly MAX_LOG_SIZE = 100; // Keep last 100 errors
  private readonly PRIVACY_SAFE_CODES: ErrorCode[] = [
    'PERMISSION_DENIED',
    'DATABASE_ERROR',
    'SCAN_INTERRUPTED',
    'STORAGE_FULL',
  ];

  static getInstance(): ErrorManager {
    if (!ErrorManager.instance) {
      ErrorManager.instance = new ErrorManager();
    }
    return ErrorManager.instance;
  }

  /**
   * Register error callback for UI notifications
   */
  onError(callback: (error: AppError) => void): () => void {
    this.errorCallbacks.add(callback);
    return () => this.errorCallbacks.delete(callback);
  }

  /**
   * Register recovery strategy for specific error codes
   */
  registerRecoveryStrategy(strategy: RecoveryStrategy): void {
    this.recoveryStrategies.set(strategy.code, strategy);
  }

  /**
   * Handle error with optional recovery attempts
   */
  async handleError(
    error: Error | AppError,
    options: ErrorHandlerOptions = {}
  ): Promise<AppError> {
    const appError = this.normalizeError(error);
    
    // Update metrics
    this.updateMetrics(appError);
    
    // Add to log if privacy-safe
    if (this.isPrivacySafe(appError, options.privacySafe)) {
      this.addToLog(appError);
    }

    // Log error if requested
    if (options.shouldLog !== false) {
      this.logError(appError, options.privacySafe);
    }

    // Attempt recovery if configured
    let recoverySuccessful = false;
    if (options.shouldAttemptRecovery !== false) {
      recoverySuccessful = await this.attemptRecovery(appError, options.maxRetries);
    }

    // Notify callbacks (UI, analytics, etc.)
    if (options.shouldNotifyUser !== false && !recoverySuccessful) {
      this.notifyCallbacks(appError);
    }

    return appError;
  }

  /**
   * Create structured error
   */
  createError(
    code: ErrorCode,
    message: string,
    details?: any,
    originalError?: Error
  ): AppError {
    const error: AppError = {
      code,
      message,
      details: this.sanitizeDetails(details),
      timestamp: new Date(),
    };

    // Add stack trace in development
    if (__DEV__ && originalError?.stack) {
      error.details = {
        ...error.details,
        stack: originalError.stack,
      };
    }

    return error;
  }

  /**
   * Get error metrics for monitoring
   */
  getMetrics(): ErrorMetrics {
    return { ...this.metrics };
  }

  /**
   * Get recent errors (privacy-safe only)
   */
  getRecentErrors(count: number = 10): AppError[] {
    return this.errorLog.slice(-count);
  }

  /**
   * Clear error log and metrics
   */
  clearLog(): void {
    this.errorLog = [];
    this.metrics = {
      totalErrors: 0,
      errorsByCode: {} as Record<ErrorCode, number>,
      lastError: null,
      recoveryAttempts: 0,
      successfulRecoveries: 0,
    };
  }

  /**
   * Check if error occurred recently (for debouncing)
   */
  hasRecentSimilarError(error: AppError, timeWindow: number = 5000): boolean {
    const cutoff = Date.now() - timeWindow;
    return this.errorLog.some(
      e => e.code === error.code && 
           e.message === error.message && 
           e.timestamp.getTime() > cutoff
    );
  }

  /**
   * Normalize various error types to AppError
   */
  private normalizeError(error: Error | AppError): AppError {
    if ('code' in error && 'timestamp' in error) {
      return error as AppError;
    }

    // Map common error types to error codes
    let code: ErrorCode = 'UNKNOWN_ERROR';
    if (error.message.includes('permission')) {
      code = 'PERMISSION_DENIED';
    } else if (error.message.includes('network') || error.message.includes('fetch')) {
      code = 'NETWORK_ERROR';
    } else if (error.message.includes('database') || error.message.includes('sqlite')) {
      code = 'DATABASE_ERROR';
    } else if (error.message.includes('storage') || error.message.includes('space')) {
      code = 'STORAGE_FULL';
    }

    return this.createError(code, error.message, { originalError: error.name }, error);
  }

  /**
   * Update error metrics
   */
  private updateMetrics(error: AppError): void {
    this.metrics.totalErrors++;
    this.metrics.errorsByCode[error.code] = (this.metrics.errorsByCode[error.code] || 0) + 1;
    this.metrics.lastError = error.timestamp;
  }

  /**
   * Add error to log with size management
   */
  private addToLog(error: AppError): void {
    this.errorLog.push(error);
    
    // Trim log if too large
    if (this.errorLog.length > this.MAX_LOG_SIZE) {
      this.errorLog = this.errorLog.slice(-this.MAX_LOG_SIZE);
    }
  }

  /**
   * Check if error is safe to log based on privacy settings
   */
  private isPrivacySafe(error: AppError, privacySafeOverride?: boolean): boolean {
    if (privacySafeOverride === false) return false;
    if (privacySafeOverride === true) return true;
    
    return this.PRIVACY_SAFE_CODES.includes(error.code);
  }

  /**
   * Log error with privacy considerations
   */
  private logError(error: AppError, privacySafe?: boolean): void {
    const logLevel = this.getLogLevel(error.code);
    const sanitizedError = privacySafe === false ? 
      { code: error.code, message: 'Error details hidden for privacy' } : 
      error;

    switch (logLevel) {
      case 'error':
        console.error('ChronoMap Error:', sanitizedError);
        break;
      case 'warn':
        console.warn('ChronoMap Warning:', sanitizedError);
        break;
      case 'info':
        console.info('ChronoMap Info:', sanitizedError);
        break;
      default:
        console.log('ChronoMap Debug:', sanitizedError);
    }
  }

  /**
   * Attempt error recovery using registered strategies
   */
  private async attemptRecovery(error: AppError, maxRetries: number = 3): Promise<boolean> {
    const strategy = this.recoveryStrategies.get(error.code);
    if (!strategy) return false;

    this.metrics.recoveryAttempts++;

    try {
      const retries = Math.min(maxRetries, strategy.maxAttempts);
      
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          const success = await strategy.handler(error);
          if (success) {
            this.metrics.successfulRecoveries++;
            console.info(`Recovery successful for ${error.code} on attempt ${attempt}`);
            return true;
          }
        } catch (recoveryError) {
          console.warn(`Recovery attempt ${attempt} failed for ${error.code}:`, recoveryError);
        }
        
        // Wait before retry (exponential backoff)
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    } catch (recoveryError) {
      console.error('Recovery strategy failed:', recoveryError);
    }

    return false;
  }

  /**
   * Notify registered callbacks
   */
  private notifyCallbacks(error: AppError): void {
    this.errorCallbacks.forEach(callback => {
      try {
        callback(error);
      } catch (callbackError) {
        console.error('Error in error callback:', callbackError);
      }
    });
  }

  /**
   * Sanitize error details to remove sensitive information
   */
  private sanitizeDetails(details: any): any {
    if (!details || typeof details !== 'object') return details;

    const sanitized = { ...details };
    
    // Remove sensitive keys
    const sensitiveKeys = ['password', 'token', 'key', 'secret', 'uri', 'path', 'filename'];
    sensitiveKeys.forEach(key => {
      if (key in sanitized) {
        sanitized[key] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Get appropriate log level for error code
   */
  private getLogLevel(code: ErrorCode): 'error' | 'warn' | 'info' | 'debug' {
    switch (code) {
      case 'DATABASE_ERROR':
      case 'STORAGE_FULL':
      case 'UNKNOWN_ERROR':
        return 'error';
        
      case 'PERMISSION_DENIED':
      case 'NETWORK_ERROR':
        return 'warn';
        
      case 'SCAN_INTERRUPTED':
      case 'FILE_ACCESS_ERROR':
      case 'METADATA_EXTRACTION_ERROR':
        return 'info';
        
      default:
        return 'debug';
    }
  }
}

// Export singleton instance
export default ErrorManager.getInstance();

// Export common recovery strategies
export const commonRecoveryStrategies: RecoveryStrategy[] = [
  {
    code: 'PERMISSION_DENIED',
    maxAttempts: 1,
    description: 'Attempt to re-request permissions',
    handler: async (error: AppError) => {
      // Would integrate with PermissionManager
      console.info('Attempting permission recovery for:', error.message);
      return false; // Placeholder - actual implementation would request permissions
    },
  },
  
  {
    code: 'DATABASE_ERROR',
    maxAttempts: 3,
    description: 'Attempt database reconnection',
    handler: async (error: AppError) => {
      // Would integrate with DatabaseService
      console.info('Attempting database recovery for:', error.message);
      return false; // Placeholder - actual implementation would reconnect
    },
  },
  
  {
    code: 'SCAN_INTERRUPTED',
    maxAttempts: 2,
    description: 'Restart scan operation',
    handler: async (error: AppError) => {
      // Would integrate with MediaScanner
      console.info('Attempting scan recovery for:', error.message);
      return false; // Placeholder - actual implementation would restart scan
    },
  },
];

// Register default recovery strategies
commonRecoveryStrategies.forEach(strategy => {
  ErrorManager.getInstance().registerRecoveryStrategy(strategy);
});