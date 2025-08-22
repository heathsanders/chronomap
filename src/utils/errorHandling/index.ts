/**
 * Error Handling Utilities Index
 * Centralized export of error management, logging, and recovery systems
 */

import ErrorManagerClass from './ErrorManager';
import PrivacyLoggerClass from './PrivacyLogger';

// Core error management
export { default as ErrorManager, type ErrorMetrics, type ErrorHandlerOptions, type RecoveryStrategy, commonRecoveryStrategies } from './ErrorManager';

// Privacy-safe logging
export { default as PrivacyLogger, type LogLevel, type LogCategory, type LogEntry, type LoggerConfig } from './PrivacyLogger';

// Error boundary components
export { default as ErrorBoundary, PhotoGridErrorBoundary, SettingsErrorBoundary, withErrorBoundary, type ErrorBoundaryProps, type ErrorBoundaryState, type ErrorInfo } from '@/components/common/ErrorBoundary';

// Re-export types for convenience
export type { AppError, ErrorCode } from '@/types';

/**
 * Quick setup function for error handling system
 * Call this during app initialization
 */
export const initializeErrorHandling = (options: {
  enableLogging?: boolean;
  privacyMode?: 'strict' | 'balanced' | 'disabled';
  enableRecovery?: boolean;
}) => {
  // Configure privacy logger
  PrivacyLoggerClass.updateConfig({
    enableLogging: options.enableLogging ?? true,
    privacyMode: options.privacyMode ?? 'balanced',
  });

  // Register error manager callback for UI notifications
  ErrorManagerClass.onError((error: any) => {
    PrivacyLoggerClass.error(`Unhandled error: ${error.message}`, 'error', {
      errorCode: error.code,
      timestamp: error.timestamp,
    });
  });

  PrivacyLoggerClass.info('Error handling system initialized', 'system', {
    enableLogging: options.enableLogging,
    privacyMode: options.privacyMode,
    enableRecovery: options.enableRecovery,
  });
};

/**
 * Quick error reporting function
 * Convenience function for one-off error reporting
 */
export const reportError = async (
  error: Error | string,
  context?: string,
  metadata?: Record<string, any>
): Promise<void> => {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const errorObj = typeof error === 'string' ? new Error(error) : error;

  await ErrorManagerClass.handleError(errorObj, {
    shouldLog: true,
    shouldNotifyUser: true,
    shouldAttemptRecovery: false,
    privacySafe: true,
  });

  PrivacyLoggerClass.error(`Reported error: ${errorMessage}`, 'error', {
    context,
    ...metadata,
  });
};

/**
 * Performance monitoring helper
 * Log performance metrics with privacy protection
 */
export const logPerformance = (
  operation: string,
  duration: number,
  metadata?: Record<string, any>
): void => {
  PrivacyLoggerClass.performance(operation, duration, metadata);
  
  // Log performance warnings
  const thresholds = {
    'photo-grid-render': 100,
    'photo-scan': 5000,
    'database-query': 1000,
    'navigation': 200,
  };

  const threshold = thresholds[operation as keyof typeof thresholds] || 500;
  
  if (duration > threshold) {
    PrivacyLoggerClass.warn(`Performance threshold exceeded for ${operation}`, 'performance', {
      duration,
      threshold,
      ...metadata,
    });
  }
};

/**
 * User action tracking helper
 * Privacy-safe user action logging
 */
export const logUserAction = (
  action: string,
  metadata?: Record<string, any>
): void => {
  PrivacyLoggerClass.userAction(action, {
    timestamp: Date.now(),
    ...metadata,
  });
};