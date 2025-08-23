import { create } from 'zustand';
import { Photo } from '../services/DatabaseService';

export interface PhotoState {
  photos: Photo[];
  selectedPhotos: Set<string>;
  isLoading: boolean;
  error: string | null;
  lastScanTime: number | null;
  totalPhotoCount: number;
}

export interface PhotoActions {
  setPhotos: (photos: Photo[]) => void;
  addPhoto: (photo: Photo) => void;
  addPhotos: (photos: Photo[]) => void;
  removePhoto: (photoId: string) => void;
  updatePhoto: (photoId: string, updates: Partial<Photo>) => void;
  togglePhotoSelection: (photoId: string) => void;
  selectPhotos: (photoIds: string[]) => void;
  clearSelection: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateScanTime: () => void;
  setTotalPhotoCount: (count: number) => void;
  reset: () => void;
}

export type PhotoStore = PhotoState & PhotoActions;

const initialState: PhotoState = {
  photos: [],
  selectedPhotos: new Set(),
  isLoading: false,
  error: null,
  lastScanTime: null,
  totalPhotoCount: 0,
};

export const usePhotoStore = create<PhotoStore>((set, get) => ({
  ...initialState,

  setPhotos: (photos) =>
    set((state) => ({
      photos,
      totalPhotoCount: photos.length,
      error: null,
    })),

  addPhoto: (photo) =>
    set((state) => {
      const existingIndex = state.photos.findIndex(p => p.id === photo.id);
      let newPhotos;
      
      if (existingIndex >= 0) {
        // Update existing photo
        newPhotos = [...state.photos];
        newPhotos[existingIndex] = photo;
      } else {
        // Add new photo, maintaining sort order by creation time (newest first)
        newPhotos = [photo, ...state.photos].sort((a, b) => b.creationTime - a.creationTime);
      }

      return {
        photos: newPhotos,
        totalPhotoCount: newPhotos.length,
      };
    }),

  addPhotos: (photos) =>
    set((state) => {
      const existingPhotoIds = new Set(state.photos.map(p => p.id));
      const newPhotos = photos.filter(photo => !existingPhotoIds.has(photo.id));
      
      const allPhotos = [...state.photos, ...newPhotos]
        .sort((a, b) => b.creationTime - a.creationTime);

      return {
        photos: allPhotos,
        totalPhotoCount: allPhotos.length,
      };
    }),

  removePhoto: (photoId) =>
    set((state) => {
      const newPhotos = state.photos.filter(p => p.id !== photoId);
      const newSelection = new Set(state.selectedPhotos);
      newSelection.delete(photoId);

      return {
        photos: newPhotos,
        selectedPhotos: newSelection,
        totalPhotoCount: newPhotos.length,
      };
    }),

  updatePhoto: (photoId, updates) =>
    set((state) => {
      const photoIndex = state.photos.findIndex(p => p.id === photoId);
      if (photoIndex === -1) return state;

      const newPhotos = [...state.photos];
      newPhotos[photoIndex] = { ...newPhotos[photoIndex], ...updates };

      return { photos: newPhotos };
    }),

  togglePhotoSelection: (photoId) =>
    set((state) => {
      const newSelection = new Set(state.selectedPhotos);
      if (newSelection.has(photoId)) {
        newSelection.delete(photoId);
      } else {
        newSelection.add(photoId);
      }
      return { selectedPhotos: newSelection };
    }),

  selectPhotos: (photoIds) =>
    set((state) => ({
      selectedPhotos: new Set([...state.selectedPhotos, ...photoIds]),
    })),

  clearSelection: () =>
    set((state) => ({
      selectedPhotos: new Set(),
    })),

  setLoading: (isLoading) =>
    set((state) => ({ isLoading })),

  setError: (error) =>
    set((state) => ({ error })),

  updateScanTime: () =>
    set((state) => ({ lastScanTime: Date.now() })),

  setTotalPhotoCount: (totalPhotoCount) =>
    set((state) => ({ totalPhotoCount })),

  reset: () =>
    set(() => ({ ...initialState, selectedPhotos: new Set() })),
}));

// Selectors for computed values
export const usePhotoSelectors = () => {
  const store = usePhotoStore();
  
  return {
    ...store,
    hasPhotos: store.photos.length > 0,
    hasSelection: store.selectedPhotos.size > 0,
    selectionCount: store.selectedPhotos.size,
    isAllSelected: store.selectedPhotos.size === store.photos.length && store.photos.length > 0,
    getSelectedPhotos: () => store.photos.filter(photo => store.selectedPhotos.has(photo.id)),
    getPhotoById: (id: string) => store.photos.find(photo => photo.id === id),
    getPhotosByDateRange: (startDate: number, endDate: number) =>
      store.photos.filter(photo => 
        photo.creationTime >= startDate && photo.creationTime <= endDate
      ),
    getPhotosWithLocation: () =>
      store.photos.filter(photo => photo.latitude != null && photo.longitude != null),
  };
};