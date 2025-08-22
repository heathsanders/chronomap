/**
 * Photo Store - Zustand
 * Manages photo data and timeline state
 */

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { TimelinePhoto, DateSection, ScanProgress, ScanResult } from "../types";

interface PhotoState {
  // Photo data
  photos: TimelinePhoto[];
  totalPhotos: number;
  lastScanResult: ScanResult | null;

  // Timeline state
  timeline: DateSection[];
  currentViewportPhotos: TimelinePhoto[];
  selectedPhotos: string[];

  // Scanning state
  isScanning: boolean;
  scanProgress: ScanProgress | null;

  // Loading states
  isLoading: boolean;
  isLoadingMore: boolean;

  // Actions
  setPhotos: (photos: TimelinePhoto[]) => void;
  addPhotos: (photos: TimelinePhoto[]) => void;
  updatePhoto: (photoId: string, updates: Partial<TimelinePhoto>) => void;
  removePhoto: (photoId: string) => void;

  // Timeline actions
  setTimeline: (timeline: DateSection[]) => void;
  setCurrentViewportPhotos: (photos: TimelinePhoto[]) => void;

  // Selection actions
  selectPhoto: (photoId: string) => void;
  deselectPhoto: (photoId: string) => void;
  selectAllPhotos: () => void;
  clearSelection: () => void;
  togglePhotoSelection: (photoId: string) => void;

  // Scanning actions
  startScan: () => void;
  updateScanProgress: (progress: ScanProgress) => void;
  completeScan: (result: ScanResult) => void;

  // Loading actions
  setLoading: (loading: boolean) => void;
  setLoadingMore: (loading: boolean) => void;

  // Utility actions
  reset: () => void;
}

const initialState = {
  photos: [],
  totalPhotos: 0,
  lastScanResult: null,
  timeline: [],
  currentViewportPhotos: [],
  selectedPhotos: [],
  isScanning: false,
  scanProgress: null,
  isLoading: false,
  isLoadingMore: false,
};

export const usePhotoStore = create<PhotoState>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // Photo actions
    setPhotos: (photos) => set({ photos, totalPhotos: photos.length }),

    addPhotos: (newPhotos) =>
      set((state) => {
        const existingIds = new Set(state.photos.map((p) => p.id));
        const uniqueNewPhotos = newPhotos.filter(
          (p) => !existingIds.has(p.id)
        );
        const allPhotos = [...state.photos, ...uniqueNewPhotos];

        // Sort by creation time (newest first)
        allPhotos.sort(
          (a, b) => b.creationTime.getTime() - a.creationTime.getTime()
        );

        return {
          photos: allPhotos,
          totalPhotos: allPhotos.length,
        };
      }),

    updatePhoto: (photoId, updates) =>
      set((state) => ({
        photos: state.photos.map((photo) =>
          photo.id === photoId ? { ...photo, ...updates } : photo
        ),
      })),

    removePhoto: (photoId) =>
      set((state) => ({
        photos: state.photos.filter((photo) => photo.id !== photoId),
        selectedPhotos: state.selectedPhotos.filter((id) => id !== photoId),
        totalPhotos: state.totalPhotos - 1,
      })),

    // Timeline actions
    setTimeline: (timeline) => set({ timeline }),

    setCurrentViewportPhotos: (photos) =>
      set({ currentViewportPhotos: photos }),

    // Selection actions
    selectPhoto: (photoId) =>
      set((state) => ({
        selectedPhotos: state.selectedPhotos.includes(photoId)
          ? state.selectedPhotos
          : [...state.selectedPhotos, photoId],
      })),

    deselectPhoto: (photoId) =>
      set((state) => ({
        selectedPhotos: state.selectedPhotos.filter((id) => id !== photoId),
      })),

    selectAllPhotos: () =>
      set((state) => ({
        selectedPhotos: state.currentViewportPhotos.map((photo) => photo.id),
      })),

    clearSelection: () => set({ selectedPhotos: [] }),

    togglePhotoSelection: (photoId) => {
      const { selectedPhotos, selectPhoto, deselectPhoto } = get();
      if (selectedPhotos.includes(photoId)) {
        deselectPhoto(photoId);
      } else {
        selectPhoto(photoId);
      }
    },

    // Scanning actions
    startScan: () =>
      set({
        isScanning: true,
        scanProgress: {
          phase: "scanning",
          totalItems: 0,
          processedItems: 0,
          errors: [],
        },
      }),

    updateScanProgress: (progress) => set({ scanProgress: progress }),

    completeScan: (result) =>
      set({
        isScanning: false,
        scanProgress: null,
        lastScanResult: result,
      }),

    // Loading actions
    setLoading: (loading) => set({ isLoading: loading }),
    setLoadingMore: (loading) => set({ isLoadingMore: loading }),

    // Utility actions
    reset: () => set(initialState),
  }))
);