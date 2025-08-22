/**
 * Error Boundary Components
 * React error boundaries for graceful error handling and recovery
 */

import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, spacing, typography } from '@/config';
import ErrorManager from '@/utils/errorHandling/ErrorManager';
import PrivacyLogger from '@/utils/errorHandling/PrivacyLogger';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: ErrorInfo) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetOnPropsChange?: boolean;
  resetKeys?: (string | number)[];
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

export interface ErrorInfo {
  componentStack: string;
}

/**
 * Main Error Boundary Component
 * Catches JavaScript errors in component tree and displays fallback UI
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: number | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Log error through privacy-safe logger
    PrivacyLogger.error('Component error boundary triggered', 'error', {
      errorMessage: error.message,
      errorStack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
    });

    // Handle error through error manager
    ErrorManager.handleError(error, {
      shouldLog: true,
      shouldNotifyUser: false, // Error boundary handles UI
      shouldAttemptRecovery: true,
      privacySafe: true,
    });

    // Call custom error handler
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    const { resetOnPropsChange, resetKeys } = this.props;
    const { hasError } = this.state;

    if (hasError) {
      // Check if props have changed to potentially reset
    }

    if (hasError && resetOnPropsChange && prevProps.children !== this.props.children) {
      this.resetErrorBoundary();
    }

    if (hasError && resetKeys && resetKeys.length > 0) {
      const prevResetKeys = prevProps.resetKeys || [];
      const hasResetKeyChanged = resetKeys.some(
        (key, index) => key !== prevResetKeys[index]
      );
      
      if (hasResetKeyChanged) {
        this.resetErrorBoundary();
      }
    }
  }

  resetErrorBoundary = (): void => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });

    PrivacyLogger.info('Error boundary reset', 'system', {
      errorId: this.state.errorId,
    });
  };

  handleRetry = (): void => {
    this.resetErrorBoundary();
  };

  handleReport = (): void => {
    const { error, errorInfo, errorId } = this.state;
    
    if (error && errorInfo) {
      // Create detailed error report
      const errorReport = ErrorManager.createError(
        'UNKNOWN_ERROR',
        error.message,
        {
          componentStack: errorInfo.componentStack,
          errorId,
          timestamp: new Date().toISOString(),
        },
        error
      );

      PrivacyLogger.error('User reported error boundary error', 'error', {
        errorId,
        userReported: true,
      });

      // Could integrate with crash reporting service here
      console.info('Error report generated:', errorReport);
    }
  };

  render(): ReactNode {
    const { children, fallback } = this.props;
    const { hasError, error, errorInfo } = this.state;

    if (hasError && error) {
      if (fallback) {
        return fallback(error, errorInfo!);
      }

      return (
        <DefaultErrorFallback
          error={error}
          errorInfo={errorInfo}
          onRetry={this.handleRetry}
          onReport={this.handleReport}
        />
      );
    }

    return children;
  }
}

/**
 * Default Error Fallback UI
 */
interface DefaultErrorFallbackProps {
  error: Error;
  errorInfo: ErrorInfo | null;
  onRetry: () => void;
  onReport: () => void;
}

const DefaultErrorFallback: React.FC<DefaultErrorFallbackProps> = ({
  error,
  errorInfo,
  onRetry,
  onReport,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.subtitle}>
          We're sorry, but something unexpected happened. The error has been logged
          and our team will investigate.
        </Text>
        
        {__DEV__ && (
          <View style={styles.errorDetails}>
            <Text style={styles.errorTitle}>Error Details (Development):</Text>
            <Text style={styles.errorMessage}>{error.message}</Text>
            {error.stack && (
              <Text style={styles.errorStack}>{error.stack}</Text>
            )}
            {errorInfo?.componentStack && (
              <Text style={styles.componentStack}>{errorInfo.componentStack}</Text>
            )}
          </View>
        )}

        <View style={styles.actions}>
          <Pressable
            style={[styles.button, styles.retryButton]}
            onPress={onRetry}
            accessible={true}
            accessibilityLabel="Try again"
            accessibilityRole="button"
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>

          <Pressable
            style={[styles.button, styles.reportButton]}
            onPress={onReport}
            accessible={true}
            accessibilityLabel="Report error"
            accessibilityRole="button"
          >
            <Text style={styles.reportButtonText}>Report Error</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

/**
 * Photo Grid Specific Error Boundary
 * Tailored error handling for photo grid components
 */
export const PhotoGridErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <ErrorBoundary
      fallback={(error) => (
        <View style={styles.gridErrorContainer}>
          <Text style={styles.gridErrorTitle}>Unable to load photos</Text>
          <Text style={styles.gridErrorSubtitle}>
            There was a problem displaying your photo grid. Please try refreshing.
          </Text>
        </View>
      )}
      onError={(error, errorInfo) => {
        PrivacyLogger.error('Photo grid error', 'error', {
          component: 'PhotoGrid',
          errorMessage: error.message,
        });
      }}
    >
      {children}
    </ErrorBoundary>
  );
};

/**
 * Settings Page Error Boundary
 * Specific error handling for settings components
 */
export const SettingsErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <ErrorBoundary
      fallback={(error) => (
        <View style={styles.settingsErrorContainer}>
          <Text style={styles.settingsErrorTitle}>Settings unavailable</Text>
          <Text style={styles.settingsErrorSubtitle}>
            We couldn't load your settings. Your preferences are safe and will be restored.
          </Text>
        </View>
      )}
      onError={(error, errorInfo) => {
        PrivacyLogger.error('Settings error', 'error', {
          component: 'Settings',
          errorMessage: error.message,
        });
      }}
    >
      {children}
    </ErrorBoundary>
  );
};

/**
 * Higher-Order Component for Error Boundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const ComponentWithErrorBoundary = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;
  
  return ComponentWithErrorBoundary;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },

  content: {
    maxWidth: 400,
    alignItems: 'center',
  },

  title: {
    ...typography.styles.h2,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.md,
  },

  subtitle: {
    ...typography.styles.body,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 24,
  },

  errorDetails: {
    width: '100%',
    backgroundColor: colors.neutral[100],
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.lg,
  },

  errorTitle: {
    ...typography.styles.h4,
    color: colors.error,
    marginBottom: spacing.sm,
  },

  errorMessage: {
    ...typography.styles.bodySmall,
    color: colors.error,
    marginBottom: spacing.sm,
    fontFamily: typography.fontFamily.mono,
  },

  errorStack: {
    ...typography.styles.caption,
    color: colors.neutral[600],
    fontFamily: typography.fontFamily.mono,
    marginBottom: spacing.sm,
  },

  componentStack: {
    ...typography.styles.caption,
    color: colors.neutral[500],
    fontFamily: typography.fontFamily.mono,
  },

  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },

  button: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },

  retryButton: {
    backgroundColor: colors.primary,
  },

  retryButtonText: {
    ...typography.styles.button,
    color: colors.white,
  },

  reportButton: {
    backgroundColor: colors.neutral[200],
    borderWidth: 1,
    borderColor: colors.neutral[300],
  },

  reportButtonText: {
    ...typography.styles.button,
    color: colors.neutral[700],
  },

  // Grid specific error styles
  gridErrorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },

  gridErrorTitle: {
    ...typography.styles.h3,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },

  gridErrorSubtitle: {
    ...typography.styles.body,
    color: colors.text,
    textAlign: 'center',
  },

  // Settings specific error styles
  settingsErrorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },

  settingsErrorTitle: {
    ...typography.styles.h3,
    color: colors.warning,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },

  settingsErrorSubtitle: {
    ...typography.styles.body,
    color: colors.text,
    textAlign: 'center',
  },
});

export default ErrorBoundary;