/**
 * Photo Store - Zustand State Management
 * Manages timeline photo data, scanning state, and photo operations
 * Optimized for large photo libraries (50,000+ photos)
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { PhotoAsset, ScanProgress, PhotoMetadata, AppError } from '@/types';

export interface PhotoGridData {
  photos: PhotoAsset[];
  metadata: Map<string, PhotoMetadata>;
  lastScanDate: Date | null;
  totalCount: number;
  isLoading: boolean;
  error: AppError | null;
}

export interface TimelineSection {
  date: string; // YYYY-MM-DD format
  photos: PhotoAsset[];
  count: number;
}

export interface PhotoStoreState {
  // Photo data
  allPhotos: PhotoAsset[];
  photoMetadata: Map<string, PhotoMetadata>;
  timelineSections: TimelineSection[];
  selectedPhotos: Set<string>;
  
  // Scanning state
  scanProgress: ScanProgress | null;
  lastScanDate: Date | null;
  isScanning: boolean;
  
  // UI state for photo operations
  isLoading: boolean;
  error: AppError | null;
  
  // Filter and search state
  searchQuery: string;
  dateRangeFilter: { start: Date; end: Date } | null;
  locationFilter: { latitude: number; longitude: number; radius: number } | null;
  
  // Cache management
  cacheSize: number;
  maxCacheSize: number;
}

export interface PhotoStoreActions {
  // Photo data management
  setPhotos: (photos: PhotoAsset[]) => void;
  addPhotos: (photos: PhotoAsset[]) => void;
  removePhoto: (photoId: string) => void;
  updatePhotoMetadata: (photoId: string, metadata: PhotoMetadata) => void;
  
  // Scanning operations
  setScanProgress: (progress: ScanProgress | null) => void;
  setScanning: (isScanning: boolean) => void;
  updateLastScanDate: (date: Date) => void;
  
  // Selection management
  selectPhoto: (photoId: string) => void;
  selectPhotos: (photoIds: string[]) => void;
  deselectPhoto: (photoId: string) => void;
  deselectAllPhotos: () => void;
  togglePhotoSelection: (photoId: string) => void;
  
  // Filtering and search
  setSearchQuery: (query: string) => void;
  setDateRangeFilter: (range: { start: Date; end: Date } | null) => void;
  setLocationFilter: (filter: { latitude: number; longitude: number; radius: number } | null) => void;
  clearAllFilters: () => void;
  
  // Timeline management
  regenerateTimelineSections: () => void;
  getPhotosForDateRange: (start: Date, end: Date) => PhotoAsset[];
  
  // Error handling
  setError: (error: AppError | null) => void;
  clearError: () => void;
  
  // Loading state
  setLoading: (isLoading: boolean) => void;
  
  // Cache management
  pruneCache: () => void;
  getCacheInfo: () => { size: number; maxSize: number; utilizationPercent: number };
}

export type PhotoStore = PhotoStoreState & PhotoStoreActions;

const INITIAL_STATE: PhotoStoreState = {
  allPhotos: [],
  photoMetadata: new Map(),
  timelineSections: [],
  selectedPhotos: new Set(),
  scanProgress: null,
  lastScanDate: null,
  isScanning: false,
  isLoading: false,
  error: null,
  searchQuery: '',
  dateRangeFilter: null,
  locationFilter: null,
  cacheSize: 0,
  maxCacheSize: 50 * 1024 * 1024, // 50MB cache limit
};

export const usePhotoStore = create<PhotoStore>()(
  subscribeWithSelector((set, get) => ({
    ...INITIAL_STATE,

    // Photo data management
    setPhotos: (photos: PhotoAsset[]) => {
      set((state) => {
        const newState = {
          ...state,
          allPhotos: photos,
          cacheSize: photos.length * 1024, // Rough estimate
        };
        
        // Regenerate timeline sections when photos change
        const sections = generateTimelineSections(photos);
        newState.timelineSections = sections;
        
        return newState;
      });
    },

    addPhotos: (photos: PhotoAsset[]) => {
      set((state) => {
        const existingIds = new Set(state.allPhotos.map(p => p.id));
        const newPhotos = photos.filter(p => !existingIds.has(p.id));
        const updatedPhotos = [...state.allPhotos, ...newPhotos];
        
        return {
          ...state,
          allPhotos: updatedPhotos,
          timelineSections: generateTimelineSections(updatedPhotos),
          cacheSize: state.cacheSize + (newPhotos.length * 1024),
        };
      });
    },

    removePhoto: (photoId: string) => {
      set((state) => {
        const updatedPhotos = state.allPhotos.filter(p => p.id !== photoId);
        const newMetadata = new Map(state.photoMetadata);
        newMetadata.delete(photoId);
        
        const newSelectedPhotos = new Set(state.selectedPhotos);
        newSelectedPhotos.delete(photoId);
        
        return {
          ...state,
          allPhotos: updatedPhotos,
          photoMetadata: newMetadata,
          selectedPhotos: newSelectedPhotos,
          timelineSections: generateTimelineSections(updatedPhotos),
          cacheSize: Math.max(0, state.cacheSize - 1024),
        };
      });
    },

    updatePhotoMetadata: (photoId: string, metadata: PhotoMetadata) => {
      set((state) => {
        const newMetadata = new Map(state.photoMetadata);
        newMetadata.set(photoId, metadata);
        
        return {
          ...state,
          photoMetadata: newMetadata,
        };
      });
    },

    // Scanning operations
    setScanProgress: (progress: ScanProgress | null) => {
      set({ scanProgress: progress });
    },

    setScanning: (isScanning: boolean) => {
      set({ isScanning });
    },

    updateLastScanDate: (date: Date) => {
      set({ lastScanDate: date });
    },

    // Selection management
    selectPhoto: (photoId: string) => {
      set((state) => ({
        selectedPhotos: new Set([...state.selectedPhotos, photoId]),
      }));
    },

    selectPhotos: (photoIds: string[]) => {
      set((state) => ({
        selectedPhotos: new Set([...state.selectedPhotos, ...photoIds]),
      }));
    },

    deselectPhoto: (photoId: string) => {
      set((state) => {
        const newSelected = new Set(state.selectedPhotos);
        newSelected.delete(photoId);
        return { selectedPhotos: newSelected };
      });
    },

    deselectAllPhotos: () => {
      set({ selectedPhotos: new Set() });
    },

    togglePhotoSelection: (photoId: string) => {
      set((state) => {
        const newSelected = new Set(state.selectedPhotos);
        if (newSelected.has(photoId)) {
          newSelected.delete(photoId);
        } else {
          newSelected.add(photoId);
        }
        return { selectedPhotos: newSelected };
      });
    },

    // Filtering and search
    setSearchQuery: (query: string) => {
      set({ searchQuery: query });
    },

    setDateRangeFilter: (range: { start: Date; end: Date } | null) => {
      set({ dateRangeFilter: range });
    },

    setLocationFilter: (filter: { latitude: number; longitude: number; radius: number } | null) => {
      set({ locationFilter: filter });
    },

    clearAllFilters: () => {
      set({
        searchQuery: '',
        dateRangeFilter: null,
        locationFilter: null,
      });
    },

    // Timeline management
    regenerateTimelineSections: () => {
      const { allPhotos } = get();
      set({ timelineSections: generateTimelineSections(allPhotos) });
    },

    getPhotosForDateRange: (start: Date, end: Date) => {
      const { allPhotos } = get();
      return allPhotos.filter(photo => {
        const photoDate = new Date(photo.creationTime);
        return photoDate >= start && photoDate <= end;
      });
    },

    // Error handling
    setError: (error: AppError | null) => {
      set({ error });
    },

    clearError: () => {
      set({ error: null });
    },

    // Loading state
    setLoading: (isLoading: boolean) => {
      set({ isLoading });
    },

    // Cache management
    pruneCache: () => {
      set((state) => {
        if (state.cacheSize <= state.maxCacheSize) {
          return state;
        }

        // Simple pruning strategy: keep most recent photos
        const sortedPhotos = [...state.allPhotos].sort((a, b) => b.creationTime - a.creationTime);
        const keepCount = Math.floor(sortedPhotos.length * 0.8); // Keep 80% of photos
        const prunedPhotos = sortedPhotos.slice(0, keepCount);
        
        return {
          ...state,
          allPhotos: prunedPhotos,
          timelineSections: generateTimelineSections(prunedPhotos),
          cacheSize: prunedPhotos.length * 1024,
        };
      });
    },

    getCacheInfo: () => {
      const { cacheSize, maxCacheSize } = get();
      return {
        size: cacheSize,
        maxSize: maxCacheSize,
        utilizationPercent: Math.round((cacheSize / maxCacheSize) * 100),
      };
    },
  }))
);

/**
 * Generate timeline sections from photos array
 * Groups photos by date for efficient timeline rendering
 */
function generateTimelineSections(photos: PhotoAsset[]): TimelineSection[] {
  const sections = new Map<string, PhotoAsset[]>();
  
  photos.forEach(photo => {
    const date = new Date(photo.creationTime);
    const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    if (!sections.has(dateKey)) {
      sections.set(dateKey, []);
    }
    sections.get(dateKey)!.push(photo);
  });
  
  // Convert to array and sort by date (newest first)
  return Array.from(sections.entries())
    .map(([date, sectionPhotos]) => ({
      date,
      photos: sectionPhotos.sort((a, b) => b.creationTime - a.creationTime),
      count: sectionPhotos.length,
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// Selectors for derived state
export const usePhotosWithFilters = () => {
  return usePhotoStore((state) => {
    let filteredPhotos = state.allPhotos;
    
    // Apply search query filter
    if (state.searchQuery.trim()) {
      const query = state.searchQuery.toLowerCase();
      filteredPhotos = filteredPhotos.filter(photo => 
        photo.filename.toLowerCase().includes(query)
      );
    }
    
    // Apply date range filter
    if (state.dateRangeFilter) {
      const { start, end } = state.dateRangeFilter;
      filteredPhotos = filteredPhotos.filter(photo => {
        const photoDate = new Date(photo.creationTime);
        return photoDate >= start && photoDate <= end;
      });
    }
    
    // Apply location filter
    if (state.locationFilter && state.locationFilter.radius > 0) {
      const { latitude, longitude, radius } = state.locationFilter;
      filteredPhotos = filteredPhotos.filter(photo => {
        if (!photo.location) return false;
        
        const distance = calculateDistance(
          latitude, longitude,
          photo.location.latitude, photo.location.longitude
        );
        return distance <= radius;
      });
    }
    
    return filteredPhotos;
  });
};

/**
 * Calculate distance between two points using Haversine formula
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c * 1000; // Return distance in meters
}