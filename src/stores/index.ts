/**
 * Store Index
 * Centralized export of all Zustand stores and related utilities
 */

// Store exports
export { usePhotoStore, usePhotosWithFilters, type PhotoStore, type PhotoStoreState, type PhotoStoreActions } from './photoStore';
export { useUIStore, useIsAnyLoading, useIsAnyModalOpen, useCurrentViewSettings, useAccessibilitySettings, type UIStore, type UIStoreState, type UIStoreActions } from './uiStore';
export { useSettingsStore, useThemeSettings, usePerformanceSettings, usePrivacySettings, useLocationSettings, type SettingsStore, type SettingsStoreState, type SettingsStoreActions } from './settingsStore';

// Re-export common types for convenience
export type { 
  PhotoAsset, 
  ScanProgress, 
  PhotoMetadata, 
  AppError,
  PrivacySettings 
} from '@/types';

// Store utilities and helpers
export const storeUtils = {
  /**
   * Reset all stores to their initial state
   * Useful for logout, testing, or error recovery
   */
  resetAllStores: () => {
    // Note: Individual stores should implement their own reset methods
    // This is a placeholder for coordinated reset functionality
    console.warn('resetAllStores: Individual store reset methods should be called');
  },

  /**
   * Get combined loading state from all stores
   */
  getGlobalLoadingState: () => {
    // This could be implemented as a computed value
    // For now, individual stores manage their own loading states
    return false;
  },

  /**
   * Validate all store states for consistency
   */
  validateStoreConsistency: () => {
    try {
      // Add validation logic here as stores evolve
      return true;
    } catch (error) {
      console.error('Store consistency validation failed:', error);
      return false;
    }
  },
};