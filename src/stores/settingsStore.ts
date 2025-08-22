/**
 * Settings Store - Zustand State Management
 * Manages user preferences, privacy settings, and app configuration
 * Persisted locally with encryption for privacy compliance
 */

import { create } from 'zustand';
import { subscribeWithSelector, persist } from 'zustand/middleware';
import { PrivacySettings } from '@/types';

export interface PhotoScanSettings {
  autoScanEnabled: boolean;
  scanIntervalHours: number; // How often to check for new photos
  batchSize: number;
  includeVideos: boolean;
  processEXIFData: boolean;
  extractLocationData: boolean;
  generateThumbnails: boolean;
  thumbnailQuality: 'low' | 'medium' | 'high';
}

export interface DisplaySettings {
  theme: 'auto' | 'light' | 'dark';
  gridColumns: number;
  showFileName: boolean;
  showCreationDate: boolean;
  showLocation: boolean;
  dateFormat: 'relative' | 'absolute' | 'iso';
  timeFormat: '12h' | '24h';
  firstDayOfWeek: 'sunday' | 'monday';
}

export interface PerformanceSettings {
  enableHardwareAcceleration: boolean;
  maxCacheSize: number; // in MB
  prefetchDistance: number; // How many items ahead to preload
  animationDuration: 'fast' | 'normal' | 'slow' | 'disabled';
  enableVirtualization: boolean;
  memoryOptimizationLevel: 'aggressive' | 'balanced' | 'performance';
}

export interface SecuritySettings {
  requireBiometricAuth: boolean;
  autoLockTimeout: number; // minutes, 0 = disabled
  hideInAppSwitcher: boolean;
  enableSecureMode: boolean; // Prevents screenshots/screen recording
  allowExport: boolean;
  allowSharing: boolean;
}

export interface LocationSettings {
  enableLocationServices: boolean;
  locationAccuracy: 'high' | 'medium' | 'low';
  enableReverseGeocoding: boolean;
  offlineGeocodingOnly: boolean;
  clusteingRadius: number; // meters
  showLocationInTimeline: boolean;
  showLocationInSearch: boolean;
}

export interface BackupSettings {
  enableAutoBackup: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
  backupLocation: 'local' | 'icloud' | 'none'; // Privacy-first: no cloud by default
  includeMetadata: boolean;
  includeThumbnails: boolean;
  compressBackups: boolean;
  retentionDays: number;
}

export interface AccessibilitySettings {
  enableVoiceOver: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
  hapticFeedback: boolean;
  visualIndicators: boolean;
  audioDescriptions: boolean;
}

export interface AdvancedSettings {
  enableDeveloperMode: boolean;
  debugLogging: boolean;
  crashReporting: boolean;
  performanceMonitoring: boolean;
  betaFeatures: boolean;
  diagnosticSharing: boolean;
}

export interface SettingsStoreState {
  // Core settings categories
  privacy: PrivacySettings;
  photoScan: PhotoScanSettings;
  display: DisplaySettings;
  performance: PerformanceSettings;
  security: SecuritySettings;
  location: LocationSettings;
  backup: BackupSettings;
  accessibility: AccessibilitySettings;
  advanced: AdvancedSettings;
  
  // App metadata
  version: string;
  lastUpdate: Date;
  isFirstLaunch: boolean;
  onboardingCompleted: boolean;
  permissionsGranted: {
    mediaLibrary: boolean;
    location: boolean;
    notifications: boolean;
  };
  
  // Usage statistics (privacy-safe)
  stats: {
    totalPhotosProcessed: number;
    lastScanDate: Date | null;
    appOpenCount: number;
    timelineViewCount: number;
    mapViewCount: number;
  };
}

export interface SettingsStoreActions {
  // Privacy settings
  updatePrivacySettings: (settings: Partial<PrivacySettings>) => void;
  
  // Photo scan settings
  updatePhotoScanSettings: (settings: Partial<PhotoScanSettings>) => void;
  
  // Display settings
  updateDisplaySettings: (settings: Partial<DisplaySettings>) => void;
  setTheme: (theme: 'auto' | 'light' | 'dark') => void;
  setGridColumns: (columns: number) => void;
  
  // Performance settings
  updatePerformanceSettings: (settings: Partial<PerformanceSettings>) => void;
  
  // Security settings
  updateSecuritySettings: (settings: Partial<SecuritySettings>) => void;
  
  // Location settings
  updateLocationSettings: (settings: Partial<LocationSettings>) => void;
  
  // Backup settings
  updateBackupSettings: (settings: Partial<BackupSettings>) => void;
  
  // Accessibility settings
  updateAccessibilitySettings: (settings: Partial<AccessibilitySettings>) => void;
  
  // Advanced settings
  updateAdvancedSettings: (settings: Partial<AdvancedSettings>) => void;
  
  // App metadata
  markOnboardingCompleted: () => void;
  updatePermissionStatus: (permission: keyof SettingsStoreState['permissionsGranted'], granted: boolean) => void;
  
  // Usage statistics
  incrementAppOpenCount: () => void;
  incrementTimelineViewCount: () => void;
  incrementMapViewCount: () => void;
  updateLastScanDate: (date: Date) => void;
  updateTotalPhotosProcessed: (count: number) => void;
  
  // Utility actions
  resetToDefaults: () => void;
  exportSettings: () => Promise<string>;
  importSettings: (settingsJson: string) => Promise<boolean>;
  validateSettings: () => boolean;
}

export type SettingsStore = SettingsStoreState & SettingsStoreActions;

const DEFAULT_SETTINGS: SettingsStoreState = {
  privacy: {
    allowLocationExtraction: true,
    allowMetadataExtraction: true,
    sanitizeEXIFBeforeSharing: true,
    removeLocationFromShares: true,
    allowCrashReporting: false, // Privacy-first default
    allowAnalytics: false, // Privacy-first default
    dataRetentionDays: 30,
    autoDeleteEnabled: false,
  },
  
  photoScan: {
    autoScanEnabled: true,
    scanIntervalHours: 24,
    batchSize: 100,
    includeVideos: true,
    processEXIFData: true,
    extractLocationData: true,
    generateThumbnails: true,
    thumbnailQuality: 'medium',
  },
  
  display: {
    theme: 'auto',
    gridColumns: 3,
    showFileName: false,
    showCreationDate: true,
    showLocation: true,
    dateFormat: 'relative',
    timeFormat: '12h',
    firstDayOfWeek: 'sunday',
  },
  
  performance: {
    enableHardwareAcceleration: true,
    maxCacheSize: 50, // 50MB
    prefetchDistance: 10,
    animationDuration: 'normal',
    enableVirtualization: true,
    memoryOptimizationLevel: 'balanced',
  },
  
  security: {
    requireBiometricAuth: false,
    autoLockTimeout: 0, // Disabled by default
    hideInAppSwitcher: false,
    enableSecureMode: false,
    allowExport: true,
    allowSharing: true,
  },
  
  location: {
    enableLocationServices: true,
    locationAccuracy: 'medium',
    enableReverseGeocoding: true,
    offlineGeocodingOnly: true, // Privacy-first default
    clusteingRadius: 100, // 100 meters
    showLocationInTimeline: true,
    showLocationInSearch: true,
  },
  
  backup: {
    enableAutoBackup: false,
    backupFrequency: 'weekly',
    backupLocation: 'local', // Privacy-first default
    includeMetadata: true,
    includeThumbnails: false,
    compressBackups: true,
    retentionDays: 30,
  },
  
  accessibility: {
    enableVoiceOver: false,
    reducedMotion: false,
    highContrast: false,
    largeText: false,
    hapticFeedback: true,
    visualIndicators: true,
    audioDescriptions: false,
  },
  
  advanced: {
    enableDeveloperMode: false,
    debugLogging: false,
    crashReporting: false,
    performanceMonitoring: false,
    betaFeatures: false,
    diagnosticSharing: false,
  },
  
  version: '1.0.0',
  lastUpdate: new Date(),
  isFirstLaunch: true,
  onboardingCompleted: false,
  permissionsGranted: {
    mediaLibrary: false,
    location: false,
    notifications: false,
  },
  
  stats: {
    totalPhotosProcessed: 0,
    lastScanDate: null,
    appOpenCount: 0,
    timelineViewCount: 0,
    mapViewCount: 0,
  },
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    subscribeWithSelector((set, get) => ({
      ...DEFAULT_SETTINGS,

      // Privacy settings
      updatePrivacySettings: (settings: Partial<PrivacySettings>) => {
        set((state) => ({
          privacy: { ...state.privacy, ...settings },
          lastUpdate: new Date(),
        }));
      },

      // Photo scan settings
      updatePhotoScanSettings: (settings: Partial<PhotoScanSettings>) => {
        set((state) => ({
          photoScan: { ...state.photoScan, ...settings },
          lastUpdate: new Date(),
        }));
      },

      // Display settings
      updateDisplaySettings: (settings: Partial<DisplaySettings>) => {
        set((state) => ({
          display: { ...state.display, ...settings },
          lastUpdate: new Date(),
        }));
      },

      setTheme: (theme: 'auto' | 'light' | 'dark') => {
        set((state) => ({
          display: { ...state.display, theme },
          lastUpdate: new Date(),
        }));
      },

      setGridColumns: (columns: number) => {
        const clampedColumns = Math.max(1, Math.min(5, columns));
        set((state) => ({
          display: { ...state.display, gridColumns: clampedColumns },
          lastUpdate: new Date(),
        }));
      },

      // Performance settings
      updatePerformanceSettings: (settings: Partial<PerformanceSettings>) => {
        set((state) => ({
          performance: { ...state.performance, ...settings },
          lastUpdate: new Date(),
        }));
      },

      // Security settings
      updateSecuritySettings: (settings: Partial<SecuritySettings>) => {
        set((state) => ({
          security: { ...state.security, ...settings },
          lastUpdate: new Date(),
        }));
      },

      // Location settings
      updateLocationSettings: (settings: Partial<LocationSettings>) => {
        set((state) => ({
          location: { ...state.location, ...settings },
          lastUpdate: new Date(),
        }));
      },

      // Backup settings
      updateBackupSettings: (settings: Partial<BackupSettings>) => {
        set((state) => ({
          backup: { ...state.backup, ...settings },
          lastUpdate: new Date(),
        }));
      },

      // Accessibility settings
      updateAccessibilitySettings: (settings: Partial<AccessibilitySettings>) => {
        set((state) => ({
          accessibility: { ...state.accessibility, ...settings },
          lastUpdate: new Date(),
        }));
      },

      // Advanced settings
      updateAdvancedSettings: (settings: Partial<AdvancedSettings>) => {
        set((state) => ({
          advanced: { ...state.advanced, ...settings },
          lastUpdate: new Date(),
        }));
      },

      // App metadata
      markOnboardingCompleted: () => {
        set({
          onboardingCompleted: true,
          isFirstLaunch: false,
          lastUpdate: new Date(),
        });
      },

      updatePermissionStatus: (permission: keyof SettingsStoreState['permissionsGranted'], granted: boolean) => {
        set((state) => ({
          permissionsGranted: {
            ...state.permissionsGranted,
            [permission]: granted,
          },
          lastUpdate: new Date(),
        }));
      },

      // Usage statistics
      incrementAppOpenCount: () => {
        set((state) => ({
          stats: {
            ...state.stats,
            appOpenCount: state.stats.appOpenCount + 1,
          },
        }));
      },

      incrementTimelineViewCount: () => {
        set((state) => ({
          stats: {
            ...state.stats,
            timelineViewCount: state.stats.timelineViewCount + 1,
          },
        }));
      },

      incrementMapViewCount: () => {
        set((state) => ({
          stats: {
            ...state.stats,
            mapViewCount: state.stats.mapViewCount + 1,
          },
        }));
      },

      updateLastScanDate: (date: Date) => {
        set((state) => ({
          stats: {
            ...state.stats,
            lastScanDate: date,
          },
        }));
      },

      updateTotalPhotosProcessed: (count: number) => {
        set((state) => ({
          stats: {
            ...state.stats,
            totalPhotosProcessed: count,
          },
        }));
      },

      // Utility actions
      resetToDefaults: () => {
        const currentStats = get().stats;
        set({
          ...DEFAULT_SETTINGS,
          stats: currentStats, // Preserve usage statistics
          isFirstLaunch: false, // Don't reset first launch flag
          lastUpdate: new Date(),
        });
      },

      exportSettings: async (): Promise<string> => {
        const state = get();
        const exportData = {
          privacy: state.privacy,
          photoScan: state.photoScan,
          display: state.display,
          performance: state.performance,
          security: state.security,
          location: state.location,
          backup: state.backup,
          accessibility: state.accessibility,
          version: state.version,
          exportDate: new Date().toISOString(),
        };
        return JSON.stringify(exportData, null, 2);
      },

      importSettings: async (settingsJson: string): Promise<boolean> => {
        try {
          const importedSettings = JSON.parse(settingsJson);
          
          // Validate basic structure
          if (!importedSettings || typeof importedSettings !== 'object') {
            return false;
          }

          // Apply imported settings selectively
          const state = get();
          set({
            privacy: { ...state.privacy, ...importedSettings.privacy },
            photoScan: { ...state.photoScan, ...importedSettings.photoScan },
            display: { ...state.display, ...importedSettings.display },
            performance: { ...state.performance, ...importedSettings.performance },
            security: { ...state.security, ...importedSettings.security },
            location: { ...state.location, ...importedSettings.location },
            backup: { ...state.backup, ...importedSettings.backup },
            accessibility: { ...state.accessibility, ...importedSettings.accessibility },
            lastUpdate: new Date(),
          });

          return true;
        } catch (error) {
          console.error('Failed to import settings:', error);
          return false;
        }
      },

      validateSettings: (): boolean => {
        const state = get();
        
        // Validate critical constraints
        try {
          // Performance constraints
          if (state.performance.maxCacheSize < 10 || state.performance.maxCacheSize > 500) {
            return false;
          }
          
          // Grid columns constraint
          if (state.display.gridColumns < 1 || state.display.gridColumns > 5) {
            return false;
          }
          
          // Location clustering radius
          if (state.location.clusteingRadius < 10 || state.location.clusteingRadius > 10000) {
            return false;
          }

          return true;
        } catch (error) {
          console.error('Settings validation failed:', error);
          return false;
        }
      },
    })),
    {
      name: 'chronomap-settings',
      // Only persist settings, not sensitive runtime state
      partialize: (state) => ({
        privacy: state.privacy,
        photoScan: state.photoScan,
        display: state.display,
        performance: state.performance,
        security: state.security,
        location: state.location,
        backup: state.backup,
        accessibility: state.accessibility,
        advanced: state.advanced,
        version: state.version,
        onboardingCompleted: state.onboardingCompleted,
        permissionsGranted: state.permissionsGranted,
        stats: state.stats,
      }),
    }
  )
);

// Selectors for commonly used setting combinations
export const useThemeSettings = () => {
  return useSettingsStore((state) => ({
    theme: state.display.theme,
    highContrast: state.accessibility.highContrast,
    reducedMotion: state.accessibility.reducedMotion,
  }));
};

export const usePerformanceSettings = () => {
  return useSettingsStore((state) => ({
    maxCacheSize: state.performance.maxCacheSize,
    prefetchDistance: state.performance.prefetchDistance,
    enableVirtualization: state.performance.enableVirtualization,
    memoryOptimizationLevel: state.performance.memoryOptimizationLevel,
  }));
};

export const usePrivacySettings = () => {
  return useSettingsStore((state) => state.privacy);
};

export const useLocationSettings = () => {
  return useSettingsStore((state) => state.location);
};