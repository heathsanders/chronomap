import { create } from 'zustand';

export interface AppState {
  isInitialized: boolean;
  currentScreen: 'timeline' | 'map' | 'settings' | 'onboarding';
  isFirstLaunch: boolean;
  permissions: {
    photoLibrary: boolean;
    location: boolean;
  };
  scanStatus: {
    isScanning: boolean;
    lastScanTime: number | null;
    hasCompletedInitialScan: boolean;
  };
  ui: {
    showSelectionMode: boolean;
    showDatePicker: boolean;
    showSearch: boolean;
  };
}

export interface AppActions {
  setInitialized: (initialized: boolean) => void;
  setCurrentScreen: (screen: AppState['currentScreen']) => void;
  setFirstLaunch: (isFirst: boolean) => void;
  updatePermission: (permission: keyof AppState['permissions'], granted: boolean) => void;
  updateScanStatus: (updates: Partial<AppState['scanStatus']>) => void;
  toggleSelectionMode: () => void;
  setSelectionMode: (enabled: boolean) => void;
  toggleDatePicker: () => void;
  toggleSearch: () => void;
  resetUI: () => void;
  reset: () => void;
}

export type AppStore = AppState & AppActions;

const initialState: AppState = {
  isInitialized: false,
  currentScreen: 'timeline',
  isFirstLaunch: true,
  permissions: {
    photoLibrary: false,
    location: false,
  },
  scanStatus: {
    isScanning: false,
    lastScanTime: null,
    hasCompletedInitialScan: false,
  },
  ui: {
    showSelectionMode: false,
    showDatePicker: false,
    showSearch: false,
  },
};

export const useAppStore = create<AppStore>((set, get) => ({
  ...initialState,

  setInitialized: (isInitialized) =>
    set(() => ({ isInitialized })),

  setCurrentScreen: (currentScreen) =>
    set(() => ({ currentScreen })),

  setFirstLaunch: (isFirstLaunch) =>
    set(() => ({ isFirstLaunch })),

  updatePermission: (permission, granted) =>
    set((state) => ({
      permissions: {
        ...state.permissions,
        [permission]: granted,
      },
    })),

  updateScanStatus: (updates) =>
    set((state) => ({
      scanStatus: {
        ...state.scanStatus,
        ...updates,
      },
    })),

  toggleSelectionMode: () =>
    set((state) => ({
      ui: {
        ...state.ui,
        showSelectionMode: !state.ui.showSelectionMode,
      },
    })),

  setSelectionMode: (showSelectionMode) =>
    set((state) => ({
      ui: {
        ...state.ui,
        showSelectionMode,
      },
    })),

  toggleDatePicker: () =>
    set((state) => ({
      ui: {
        ...state.ui,
        showDatePicker: !state.ui.showDatePicker,
      },
    })),

  toggleSearch: () =>
    set((state) => ({
      ui: {
        ...state.ui,
        showSearch: !state.ui.showSearch,
      },
    })),

  resetUI: () =>
    set((state) => ({
      ui: {
        showSelectionMode: false,
        showDatePicker: false,
        showSearch: false,
      },
    })),

  reset: () =>
    set(() => ({ ...initialState })),
}));

// Selectors for computed values
export const useAppSelectors = () => {
  const store = useAppStore();
  
  return {
    ...store,
    hasAllPermissions: store.permissions.photoLibrary && store.permissions.location,
    hasPhotoPermission: store.permissions.photoLibrary,
    needsInitialScan: !store.scanStatus.hasCompletedInitialScan && store.permissions.photoLibrary,
    canScan: store.permissions.photoLibrary && !store.scanStatus.isScanning,
    isReady: store.isInitialized && store.permissions.photoLibrary,
  };
};