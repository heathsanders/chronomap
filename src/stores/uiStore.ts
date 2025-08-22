/**
 * UI Store - Zustand
 * Manages app UI state and navigation
 */

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { PermissionStatus } from "../types";

interface UIState {
  // App state
  isOnboardingComplete: boolean;
  currentScreen: string;
  theme: "light" | "dark" | "system";

  // Permission state
  permissions: {
    mediaLibrary: PermissionStatus;
    location: PermissionStatus;
  };

  // Loading states
  appIsLoading: boolean;
  permissionsLoading: boolean;

  // Error state
  lastError: string | null;
  errorVisible: boolean;

  // UI preferences
  preferredPhotoGridSize: number;
  timelineViewMode: "grid" | "list";
  mapViewType: "standard" | "satellite";

  // Actions
  setOnboardingComplete: (complete: boolean) => void;
  setCurrentScreen: (screen: string) => void;
  setTheme: (theme: "light" | "dark" | "system") => void;

  // Permission actions
  setPermissionStatus: (
    permission: "mediaLibrary" | "location",
    status: PermissionStatus
  ) => void;
  setPermissionsLoading: (loading: boolean) => void;

  // Loading actions
  setAppLoading: (loading: boolean) => void;

  // Error actions
  setError: (error: string) => void;
  clearError: () => void;

  // Preference actions
  setPhotoGridSize: (size: number) => void;
  setTimelineViewMode: (mode: "grid" | "list") => void;
  setMapViewType: (type: "standard" | "satellite") => void;

  // Utility actions
  reset: () => void;
}

const initialState = {
  isOnboardingComplete: false,
  currentScreen: "Onboarding",
  theme: "system" as const,
  permissions: {
    mediaLibrary: {
      granted: false,
      required: true,
      status: "undetermined",
    },
    location: {
      granted: false,
      required: false,
      status: "undetermined",
    },
  },
  appIsLoading: true,
  permissionsLoading: false,
  lastError: null,
  errorVisible: false,
  preferredPhotoGridSize: 2,
  timelineViewMode: "grid" as const,
  mapViewType: "standard" as const,
};

export const useUIStore = create<UIState>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // App actions
    setOnboardingComplete: (complete) =>
      set({
        isOnboardingComplete: complete,
        currentScreen: complete ? "Timeline" : "Onboarding",
      }),

    setCurrentScreen: (screen) => set({ currentScreen: screen }),

    setTheme: (theme) => set({ theme }),

    // Permission actions
    setPermissionStatus: (permission, status) =>
      set((state) => ({
        permissions: {
          ...state.permissions,
          [permission]: status,
        },
      })),

    setPermissionsLoading: (loading) => set({ permissionsLoading: loading }),

    // Loading actions
    setAppLoading: (loading) => set({ appIsLoading: loading }),

    // Error actions
    setError: (error) =>
      set({
        lastError: error,
        errorVisible: true,
      }),

    clearError: () =>
      set({
        lastError: null,
        errorVisible: false,
      }),

    // Preference actions
    setPhotoGridSize: (size) => set({ preferredPhotoGridSize: size }),
    setTimelineViewMode: (mode) => set({ timelineViewMode: mode }),
    setMapViewType: (type) => set({ mapViewType: type }),

    // Utility actions
    reset: () => set(initialState),
  }))
);