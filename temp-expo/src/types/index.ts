// Re-export types from services
export type { Photo, PhotoInsert, PhotoQuery } from '../services/DatabaseService';
export type { ScanProgress, ProcessedPhoto } from '../services/MediaScanner';

// Re-export types from stores
export type { PhotoStore, PhotoState, PhotoActions } from '../stores/photoStore';
export type { AppStore, AppState, AppActions } from '../stores/appStore';

// UI Component types
export interface TimelinePhoto extends Photo {
  displayDate?: string;
  isFirstInDate?: boolean;
  isLastInDate?: boolean;
}

export interface PhotoSelection {
  photoId: string;
  selected: boolean;
  timestamp: number;
}

// Navigation types
export type RootStackParamList = {
  Timeline: undefined;
  PhotoViewer: {
    photo: Photo;
    photoIndex: number;
    sectionIndex: number;
  };
  Map: undefined;
  Settings: undefined;
  Onboarding: undefined;
};

// Permission types
export type PermissionStatus = 'granted' | 'denied' | 'undetermined' | 'restricted';

export interface PermissionState {
  status: PermissionStatus;
  canAskAgain: boolean;
  granted: boolean;
}

// Scan types
export interface ScanConfiguration {
  batchSize?: number;
  includeVideos?: boolean;
  includeMetadata?: boolean;
  includeLocation?: boolean;
}

export interface ScanResult {
  photosScanned: number;
  photosAdded: number;
  photosUpdated: number;
  errors: number;
  duration: number;
  startTime: number;
  endTime: number;
}

// Error types
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: number;
  recoverable: boolean;
}