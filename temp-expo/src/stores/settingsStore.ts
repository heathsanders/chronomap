import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';

export interface UserPreferences {
  // Privacy Settings
  locationAccuracy: 'high' | 'medium' | 'low';
  shareLocationData: boolean;
  allowMetadataExtraction: boolean;
  
  // Display Settings
  theme: 'light' | 'dark' | 'system';
  timelineGridSize: 'small' | 'medium' | 'large';
  showDateHeaders: boolean;
  showLocationLabels: boolean;
  
  // Performance Settings
  cacheSize: 50 | 100 | 200; // MB
  backgroundScanning: boolean;
  autoOptimizeDatabase: boolean;
  lowMemoryMode: boolean;
  
  // Map Settings
  mapType: 'standard' | 'satellite' | 'hybrid';
  clusteringLevel: 'low' | 'medium' | 'high';
  showPhotoThumbnailsOnMap: boolean;
  
  // Notification Settings
  scanProgressNotifications: boolean;
  newPhotoNotifications: boolean;
}

export interface AdvancedSettings {
  // Database Settings
  databaseBackupFrequency: 'daily' | 'weekly' | 'never';
  maxBackupCount: number;
  
  // Scanning Settings
  scanBatchSize: 50 | 100 | 200;
  maxConcurrentScans: 1 | 2 | 3;
  scanOnAppLaunch: boolean;
  
  // Debug Settings (dev only)
  enableDebugLogging: boolean;
  showPerformanceMetrics: boolean;
  bypassCacheForTesting: boolean;
}

export interface SettingsState {
  userPreferences: UserPreferences;
  advancedSettings: AdvancedSettings;
  hasCompletedOnboarding: boolean;
  lastSettingsUpdate: number;
  settingsVersion: number;
}

export interface SettingsActions {
  updateUserPreference: <K extends keyof UserPreferences>(
    key: K, 
    value: UserPreferences[K]
  ) => void;
  updateAdvancedSetting: <K extends keyof AdvancedSettings>(
    key: K, 
    value: AdvancedSettings[K]
  ) => void;
  setOnboardingComplete: (complete: boolean) => void;
  resetToDefaults: () => void;
  exportSettings: () => SettingsState;
  importSettings: (settings: Partial<SettingsState>) => void;
  getEffectiveSettings: () => EffectiveSettings;
}

export interface EffectiveSettings extends UserPreferences, AdvancedSettings {
  // Computed settings based on device capabilities and user preferences
  effectiveCacheSize: number;
  effectiveBatchSize: number;
  shouldUseBackgroundScanning: boolean;
}

export type SettingsStore = SettingsState & SettingsActions;

const defaultUserPreferences: UserPreferences = {
  // Privacy defaults - most restrictive for privacy-first approach
  locationAccuracy: 'medium',
  shareLocationData: false,
  allowMetadataExtraction: true,
  
  // Display defaults - balanced for good UX
  theme: 'system',
  timelineGridSize: 'medium',
  showDateHeaders: true,
  showLocationLabels: true,
  
  // Performance defaults - conservative for battery life
  cacheSize: 100,
  backgroundScanning: true,
  autoOptimizeDatabase: true,
  lowMemoryMode: false,
  
  // Map defaults
  mapType: 'standard',
  clusteringLevel: 'medium',
  showPhotoThumbnailsOnMap: true,
  
  // Notification defaults
  scanProgressNotifications: true,
  newPhotoNotifications: false,
};

const defaultAdvancedSettings: AdvancedSettings = {
  // Database defaults
  databaseBackupFrequency: 'weekly',
  maxBackupCount: 3,
  
  // Scanning defaults
  scanBatchSize: 100,
  maxConcurrentScans: 1,
  scanOnAppLaunch: true,
  
  // Debug defaults (disabled in production)
  enableDebugLogging: __DEV__,
  showPerformanceMetrics: false,
  bypassCacheForTesting: false,
};

const initialState: SettingsState = {
  userPreferences: defaultUserPreferences,
  advancedSettings: defaultAdvancedSettings,
  hasCompletedOnboarding: false,
  lastSettingsUpdate: Date.now(),
  settingsVersion: 1, // Increment when settings schema changes
};

// Custom storage for secure settings persistence
const secureStorage = {
  getItem: async (name: string) => {
    try {
      const value = await SecureStore.getItemAsync(name);
      return value;
    } catch (error) {
      console.warn('Failed to get secure storage item:', name, error);
      return null;
    }
  },
  setItem: async (name: string, value: string) => {
    try {
      await SecureStore.setItemAsync(name, value);
    } catch (error) {
      console.warn('Failed to set secure storage item:', name, error);
    }
  },
  removeItem: async (name: string) => {
    try {
      await SecureStore.deleteItemAsync(name);
    } catch (error) {
      console.warn('Failed to remove secure storage item:', name, error);
    }
  },
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      updateUserPreference: (key, value) =>
        set((state) => ({
          userPreferences: {
            ...state.userPreferences,
            [key]: value,
          },
          lastSettingsUpdate: Date.now(),
        })),

      updateAdvancedSetting: (key, value) =>
        set((state) => ({
          advancedSettings: {
            ...state.advancedSettings,
            [key]: value,
          },
          lastSettingsUpdate: Date.now(),
        })),

      setOnboardingComplete: (hasCompletedOnboarding) =>
        set((state) => ({
          hasCompletedOnboarding,
          lastSettingsUpdate: Date.now(),
        })),

      resetToDefaults: () =>
        set(() => ({
          ...initialState,
          lastSettingsUpdate: Date.now(),
        })),

      exportSettings: () => get(),

      importSettings: (settings) =>
        set((state) => ({
          ...state,
          ...settings,
          lastSettingsUpdate: Date.now(),
        })),

      getEffectiveSettings: (): EffectiveSettings => {
        const { userPreferences, advancedSettings } = get();
        
        return {
          ...userPreferences,
          ...advancedSettings,
          
          // Compute effective settings based on constraints
          effectiveCacheSize: userPreferences.lowMemoryMode 
            ? Math.min(userPreferences.cacheSize, 50)
            : userPreferences.cacheSize,
            
          effectiveBatchSize: userPreferences.lowMemoryMode
            ? Math.min(advancedSettings.scanBatchSize, 50)
            : advancedSettings.scanBatchSize,
            
          shouldUseBackgroundScanning: userPreferences.backgroundScanning && 
            !userPreferences.lowMemoryMode,
        };
      },
    }),
    {
      name: 'chronomap-settings',
      storage: createJSONStorage(() => secureStorage),
      version: 1,
      migrate: (persistedState: any, version: number) => {
        // Handle settings schema migrations
        if (version === 0) {
          // Migration from version 0 to 1
          return {
            ...persistedState,
            settingsVersion: 1,
            lastSettingsUpdate: Date.now(),
          };
        }
        return persistedState;
      },
    }
  )
);

// Selectors for common settings combinations
export const useSettingsSelectors = () => {
  const store = useSettingsStore();
  const effectiveSettings = store.getEffectiveSettings();
  
  return {
    ...store,
    effectiveSettings,
    
    // Convenience selectors
    isDarkMode: store.userPreferences.theme === 'dark' || 
      (store.userPreferences.theme === 'system' && false), // TODO: Add system theme detection
      
    isPrivacyModeEnabled: !store.userPreferences.shareLocationData && 
      store.userPreferences.locationAccuracy === 'low',
      
    isPerformanceOptimized: store.userPreferences.lowMemoryMode ||
      effectiveSettings.effectiveCacheSize < 100,
      
    shouldShowOnboarding: !store.hasCompletedOnboarding,
    
    getMapSettings: () => ({
      type: store.userPreferences.mapType,
      clustering: store.userPreferences.clusteringLevel,
      showThumbnails: store.userPreferences.showPhotoThumbnailsOnMap,
    }),
    
    getTimelineSettings: () => ({
      gridSize: store.userPreferences.timelineGridSize,
      showHeaders: store.userPreferences.showDateHeaders,
      showLocations: store.userPreferences.showLocationLabels,
    }),
    
    getScanSettings: () => ({
      batchSize: effectiveSettings.effectiveBatchSize,
      backgroundEnabled: effectiveSettings.shouldUseBackgroundScanning,
      onAppLaunch: store.advancedSettings.scanOnAppLaunch,
      maxConcurrent: store.advancedSettings.maxConcurrentScans,
    }),
  };
};