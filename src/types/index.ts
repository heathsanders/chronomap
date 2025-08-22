/**
 * Core TypeScript type definitions for ChronoMap
 * Privacy-first photo organization mobile app
 */

// Photo-related types
export interface Photo {
  id: string;
  deviceId: string;
  uri: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  width?: number;
  height?: number;
  creationTime: Date;
  modificationTime: Date;
  duration?: number; // For videos
  isFavorite: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PhotoLocation {
  photoId: string;
  locationId: number;
  confidenceScore: number;
}

export interface Location {
  id: number;
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  placeName?: string;
  geocodedAt?: Date;
  createdAt: Date;
}

// Permission types
export interface PermissionStatus {
  granted: boolean;
  required: boolean;
  status: string;
}

export interface PermissionResult {
  status: string;
  timestamp: number;
  required: boolean;
  error?: string;
  reason?: string;
}

// Navigation types
export type RootStackParamList = {
  Onboarding: undefined;
  MainTabs: undefined;
  PhotoViewer: { photoId: string; photoIndex: number };
};

export type TabParamList = {
  TimelineTab: undefined;
  MapTab: undefined;
  SettingsTab: undefined;
};

// Timeline types
export interface TimelinePhoto extends Photo {
  thumbnailUri: string;
  location?: Location;
  metadata?: Record<string, any>;
  aspectRatio: number;
}

export interface DateSection {
  date: string;
  displayDate: string;
  photoCount: number;
  photos: TimelinePhoto[];
  firstPhotoUri?: string;
  locationSummary?: string[];
}

// Scan types
export interface ScanProgress {
  phase: 'scanning' | 'processing' | 'saving';
  totalItems: number;
  processedItems: number;
  currentItem?: string;
  estimatedTimeRemaining?: number;
  errors: ScanError[];
}

export interface ScanResult {
  scanId: string;
  startedAt: Date;
  completedAt: Date;
  totalPhotos: number;
  newPhotos: number;
  updatedPhotos: number;
  errors: ScanError[];
  status: 'completed' | 'failed' | 'cancelled';
}

export interface ScanError {
  type: 'permission' | 'file_access' | 'metadata' | 'database';
  message: string;
  fileUri?: string;
  timestamp: Date;
}

// App state types
export interface AppSettings {
  privacyLevel: 'minimal' | 'standard' | 'high';
  locationPrecision: 'exact' | 'city' | 'region' | 'none';
  automaticScan: boolean;
  backgroundProcessing: boolean;
  dataRetentionDays: number;
  crashReporting: boolean;
  analytics: boolean;
  automaticBackup: boolean;
}

export interface UIState {
  isLoading: boolean;
  isScanning: boolean;
  currentScreen: string;
  selectedPhotos: string[];
  isSelectionMode: boolean;
  theme: 'light' | 'dark' | 'system';
}