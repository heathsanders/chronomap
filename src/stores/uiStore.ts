/**
 * UI Store - Zustand State Management
 * Manages app navigation, screen states, and user interface interactions
 * Optimized for responsive UI state management
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { APP_CONFIG } from '@/config';

export type AppScreen = 
  | 'onboarding'
  | 'timeline'
  | 'map'
  | 'settings'
  | 'permissions';

export type ViewMode = 'grid' | 'timeline' | 'map';
export type SortOrder = 'newest' | 'oldest' | 'location' | 'name';

export interface ModalState {
  isVisible: boolean;
  type: 'photo-detail' | 'settings' | 'permissions' | 'scan-progress' | 'error' | null;
  data?: any;
}

export interface ToastState {
  isVisible: boolean;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration: number;
  autoHide: boolean;
}

export interface BottomSheetState {
  isVisible: boolean;
  type: 'photo-actions' | 'share-options' | 'filter-menu' | null;
  data?: any;
  snapPoints?: string[];
}

export interface LoadingState {
  isGlobalLoading: boolean;
  loadingTasks: Set<string>;
  loadingMessage?: string;
}

export interface UIStoreState {
  // Navigation state
  currentScreen: AppScreen;
  previousScreen: AppScreen | null;
  
  // View configuration
  viewMode: ViewMode;
  sortOrder: SortOrder;
  gridColumns: number;
  
  // Layout and theme
  isDarkMode: boolean;
  isFullscreen: boolean;
  orientation: 'portrait' | 'landscape';
  safeAreaInsets: { top: number; bottom: number; left: number; right: number };
  
  // Interactive states
  isSelectionMode: boolean;
  isSearchMode: boolean;
  isFilterPanelOpen: boolean;
  
  // Modal and overlay states
  modal: ModalState;
  toast: ToastState;
  bottomSheet: BottomSheetState;
  
  // Loading and performance
  loading: LoadingState;
  
  // Accessibility
  isReducedMotion: boolean;
  fontSize: 'small' | 'medium' | 'large';
  highContrast: boolean;
  
  // Gesture and interaction
  isSwipeEnabled: boolean;
  isPinchZoomEnabled: boolean;
  hapticFeedbackEnabled: boolean;
  
  // Performance monitoring
  lastPerformanceMetric: {
    screen: AppScreen;
    renderTime: number;
    memoryUsage: number;
    timestamp: Date;
  } | null;
}

export interface UIStoreActions {
  // Navigation
  setCurrentScreen: (screen: AppScreen) => void;
  goBack: () => void;
  
  // View configuration
  setViewMode: (mode: ViewMode) => void;
  setSortOrder: (order: SortOrder) => void;
  setGridColumns: (columns: number) => void;
  
  // Layout and theme
  toggleDarkMode: () => void;
  setDarkMode: (isDark: boolean) => void;
  toggleFullscreen: () => void;
  setOrientation: (orientation: 'portrait' | 'landscape') => void;
  setSafeAreaInsets: (insets: { top: number; bottom: number; left: number; right: number }) => void;
  
  // Interactive modes
  enterSelectionMode: () => void;
  exitSelectionMode: () => void;
  toggleSelectionMode: () => void;
  enterSearchMode: () => void;
  exitSearchMode: () => void;
  toggleFilterPanel: () => void;
  
  // Modal management
  showModal: (type: ModalState['type'], data?: any) => void;
  hideModal: () => void;
  
  // Toast notifications
  showToast: (message: string, type?: ToastState['type'], duration?: number) => void;
  hideToast: () => void;
  
  // Bottom sheet management
  showBottomSheet: (type: BottomSheetState['type'], data?: any, snapPoints?: string[]) => void;
  hideBottomSheet: () => void;
  
  // Loading management
  setGlobalLoading: (isLoading: boolean, message?: string) => void;
  addLoadingTask: (taskId: string) => void;
  removeLoadingTask: (taskId: string) => void;
  
  // Accessibility
  setReducedMotion: (enabled: boolean) => void;
  setFontSize: (size: 'small' | 'medium' | 'large') => void;
  setHighContrast: (enabled: boolean) => void;
  
  // Gesture and interaction
  setSwipeEnabled: (enabled: boolean) => void;
  setPinchZoomEnabled: (enabled: boolean) => void;
  setHapticFeedbackEnabled: (enabled: boolean) => void;
  
  // Performance monitoring
  updatePerformanceMetric: (screen: AppScreen, renderTime: number, memoryUsage: number) => void;
  
  // Utility actions
  resetUIState: () => void;
}

export type UIStore = UIStoreState & UIStoreActions;

const INITIAL_STATE: UIStoreState = {
  currentScreen: 'onboarding',
  previousScreen: null,
  
  viewMode: 'timeline',
  sortOrder: 'newest',
  gridColumns: 3,
  
  isDarkMode: false,
  isFullscreen: false,
  orientation: 'portrait',
  safeAreaInsets: { top: 0, bottom: 0, left: 0, right: 0 },
  
  isSelectionMode: false,
  isSearchMode: false,
  isFilterPanelOpen: false,
  
  modal: {
    isVisible: false,
    type: null,
    data: undefined,
  },
  
  toast: {
    isVisible: false,
    message: '',
    type: 'info',
    duration: 3000,
    autoHide: true,
  },
  
  bottomSheet: {
    isVisible: false,
    type: null,
    data: undefined,
    snapPoints: ['25%', '50%', '75%'],
  },
  
  loading: {
    isGlobalLoading: false,
    loadingTasks: new Set(),
    loadingMessage: undefined,
  },
  
  isReducedMotion: false,
  fontSize: 'medium',
  highContrast: false,
  
  isSwipeEnabled: true,
  isPinchZoomEnabled: true,
  hapticFeedbackEnabled: true,
  
  lastPerformanceMetric: null,
};

export const useUIStore = create<UIStore>()(
  subscribeWithSelector((set, get) => ({
    ...INITIAL_STATE,

    // Navigation
    setCurrentScreen: (screen: AppScreen) => {
      set((state) => ({
        previousScreen: state.currentScreen,
        currentScreen: screen,
      }));
    },

    goBack: () => {
      set((state) => {
        if (state.previousScreen) {
          return {
            currentScreen: state.previousScreen,
            previousScreen: null,
          };
        }
        return state;
      });
    },

    // View configuration
    setViewMode: (mode: ViewMode) => {
      set({ viewMode: mode });
    },

    setSortOrder: (order: SortOrder) => {
      set({ sortOrder: order });
    },

    setGridColumns: (columns: number) => {
      const clampedColumns = Math.max(1, Math.min(5, columns)); // Between 1-5 columns
      set({ gridColumns: clampedColumns });
    },

    // Layout and theme
    toggleDarkMode: () => {
      set((state) => ({ isDarkMode: !state.isDarkMode }));
    },

    setDarkMode: (isDark: boolean) => {
      set({ isDarkMode: isDark });
    },

    toggleFullscreen: () => {
      set((state) => ({ isFullscreen: !state.isFullscreen }));
    },

    setOrientation: (orientation: 'portrait' | 'landscape') => {
      set({ orientation });
    },

    setSafeAreaInsets: (insets: { top: number; bottom: number; left: number; right: number }) => {
      set({ safeAreaInsets: insets });
    },

    // Interactive modes
    enterSelectionMode: () => {
      set({ isSelectionMode: true });
    },

    exitSelectionMode: () => {
      set({ isSelectionMode: false });
    },

    toggleSelectionMode: () => {
      set((state) => ({ isSelectionMode: !state.isSelectionMode }));
    },

    enterSearchMode: () => {
      set({ isSearchMode: true });
    },

    exitSearchMode: () => {
      set({ isSearchMode: false });
    },

    toggleFilterPanel: () => {
      set((state) => ({ isFilterPanelOpen: !state.isFilterPanelOpen }));
    },

    // Modal management
    showModal: (type: ModalState['type'], data?: any) => {
      set({
        modal: {
          isVisible: true,
          type,
          data,
        },
      });
    },

    hideModal: () => {
      set({
        modal: {
          isVisible: false,
          type: null,
          data: undefined,
        },
      });
    },

    // Toast notifications
    showToast: (message: string, type: ToastState['type'] = 'info', duration: number = 3000) => {
      set({
        toast: {
          isVisible: true,
          message,
          type,
          duration,
          autoHide: duration > 0,
        },
      });

      // Auto-hide toast if duration is set
      if (duration > 0) {
        setTimeout(() => {
          const currentState = get();
          if (currentState.toast.isVisible && currentState.toast.message === message) {
            get().hideToast();
          }
        }, duration);
      }
    },

    hideToast: () => {
      set({
        toast: {
          isVisible: false,
          message: '',
          type: 'info',
          duration: 3000,
          autoHide: true,
        },
      });
    },

    // Bottom sheet management
    showBottomSheet: (type: BottomSheetState['type'], data?: any, snapPoints?: string[]) => {
      set({
        bottomSheet: {
          isVisible: true,
          type,
          data,
          snapPoints: snapPoints || ['25%', '50%', '75%'],
        },
      });
    },

    hideBottomSheet: () => {
      set({
        bottomSheet: {
          isVisible: false,
          type: null,
          data: undefined,
          snapPoints: ['25%', '50%', '75%'],
        },
      });
    },

    // Loading management
    setGlobalLoading: (isLoading: boolean, message?: string) => {
      set((state) => ({
        loading: {
          ...state.loading,
          isGlobalLoading: isLoading,
          loadingMessage: message,
        },
      }));
    },

    addLoadingTask: (taskId: string) => {
      set((state) => ({
        loading: {
          ...state.loading,
          loadingTasks: new Set([...state.loading.loadingTasks, taskId]),
        },
      }));
    },

    removeLoadingTask: (taskId: string) => {
      set((state) => {
        const newTasks = new Set(state.loading.loadingTasks);
        newTasks.delete(taskId);
        return {
          loading: {
            ...state.loading,
            loadingTasks: newTasks,
          },
        };
      });
    },

    // Accessibility
    setReducedMotion: (enabled: boolean) => {
      set({ isReducedMotion: enabled });
    },

    setFontSize: (size: 'small' | 'medium' | 'large') => {
      set({ fontSize: size });
    },

    setHighContrast: (enabled: boolean) => {
      set({ highContrast: enabled });
    },

    // Gesture and interaction
    setSwipeEnabled: (enabled: boolean) => {
      set({ isSwipeEnabled: enabled });
    },

    setPinchZoomEnabled: (enabled: boolean) => {
      set({ isPinchZoomEnabled: enabled });
    },

    setHapticFeedbackEnabled: (enabled: boolean) => {
      set({ hapticFeedbackEnabled: enabled });
    },

    // Performance monitoring
    updatePerformanceMetric: (screen: AppScreen, renderTime: number, memoryUsage: number) => {
      set({
        lastPerformanceMetric: {
          screen,
          renderTime,
          memoryUsage,
          timestamp: new Date(),
        },
      });

      // Log performance warnings
      if (renderTime > APP_CONFIG.performance.launchTime) {
        console.warn(`Performance warning: ${screen} render time (${renderTime}ms) exceeds target`);
      }
      
      if (memoryUsage > APP_CONFIG.limits.maxMemoryUsage) {
        console.warn(`Memory warning: Usage (${memoryUsage}MB) exceeds target for ${screen}`);
      }
    },

    // Utility actions
    resetUIState: () => {
      set(INITIAL_STATE);
    },
  }))
);

// Derived selectors for common UI state combinations
export const useIsAnyLoading = () => {
  return useUIStore((state) => 
    state.loading.isGlobalLoading || state.loading.loadingTasks.size > 0
  );
};

export const useIsAnyModalOpen = () => {
  return useUIStore((state) => 
    state.modal.isVisible || state.bottomSheet.isVisible
  );
};

export const useCurrentViewSettings = () => {
  return useUIStore((state) => ({
    viewMode: state.viewMode,
    sortOrder: state.sortOrder,
    gridColumns: state.gridColumns,
    isDarkMode: state.isDarkMode,
  }));
};

export const useAccessibilitySettings = () => {
  return useUIStore((state) => ({
    isReducedMotion: state.isReducedMotion,
    fontSize: state.fontSize,
    highContrast: state.highContrast,
    hapticFeedbackEnabled: state.hapticFeedbackEnabled,
  }));
};