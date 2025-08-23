/**
 * useTimeline Hook
 * React hook for timeline data management and state synchronization
 * Integrates TimelineEngine service with React components for optimal performance
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  PhotoAsset, 
  DateSection, 
  TimelinePhoto, 
  TimelineSlice, 
  TimelinePosition, 
  TimelineGrouping, 
  TimelineMetrics,
  TimelineQuery,
  AppError 
} from '@/types';
import TimelineEngine from '@/services/TimelineEngine';
import { usePhotoStore } from '@/stores/photoStore';

export interface UseTimelineOptions {
  grouping?: TimelineGrouping;
  enablePreloading?: boolean;
  cacheEnabled?: boolean;
  sliceSize?: number;
}

export interface UseTimelineReturn {
  // Data
  sections: DateSection[];
  slices: TimelineSlice[];
  currentPosition: TimelinePosition | null;
  metrics: TimelineMetrics | null;
  
  // Loading states
  isLoading: boolean;
  isRefreshing: boolean;
  isPreloading: boolean;
  
  // Error handling
  error: AppError | null;
  
  // Actions
  refreshTimeline: () => Promise<void>;
  scrollToDate: (date: Date) => Promise<TimelinePosition | null>;
  updatePosition: (position: TimelinePosition) => void;
  getPhotosForDateRange: (start: Date, end: Date, options?: { limit?: number; offset?: number }) => Promise<PhotoAsset[]>;
  changeGrouping: (grouping: TimelineGrouping) => Promise<void>;
  
  // Virtualization support
  preloadSection: (sectionIndex: number) => Promise<void>;
  clearCache: () => void;
  
  // Utilities
  findSectionByDate: (date: Date) => DateSection | null;
  getSectionIndex: (sectionId: string) => number;
  getCacheStats: () => { entries: number; size: number };
}

const DEFAULT_OPTIONS: UseTimelineOptions = {
  grouping: 'daily',
  enablePreloading: true,
  cacheEnabled: true,
  sliceSize: 100
};

export function useTimeline(options: UseTimelineOptions = {}): UseTimelineReturn {
  const config = { ...DEFAULT_OPTIONS, ...options };
  
  // Store integration
  const { 
    allPhotos, 
    isLoading: storeLoading, 
    error: storeError,
    setError: setStoreError 
  } = usePhotoStore();
  
  // Local state
  const [sections, setSections] = useState<DateSection[]>([]);
  const [slices, setSlices] = useState<TimelineSlice[]>([]);
  const [currentPosition, setCurrentPosition] = useState<TimelinePosition | null>(null);
  const [metrics, setMetrics] = useState<TimelineMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPreloading, setIsPreloading] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  
  // Refs for optimization
  const lastPhotosHash = useRef<string>('');
  const currentGrouping = useRef<TimelineGrouping>(config.grouping || 'daily');
  const isInitialized = useRef(false);

  /**
   * Initialize timeline engine
   */
  const initializeTimeline = useCallback(async () => {
    try {
      await TimelineEngine.initialize({
        defaultGrouping: config.grouping,
        sliceSize: config.sliceSize,
        preloadSections: config.enablePreloading ? 3 : 0
      });
      isInitialized.current = true;
    } catch (err) {
      const error: AppError = {
        code: 'UNKNOWN_ERROR',
        message: `Timeline initialization failed: ${err instanceof Error ? err.message : String(err)}`,
        timestamp: new Date()
      };
      setError(error);
      setStoreError(error);
    }
  }, [config.grouping, config.sliceSize, config.enablePreloading, setStoreError]);

  /**
   * Generate timeline sections from photos
   */
  const generateSections = useCallback(async (
    photos: PhotoAsset[], 
    grouping: TimelineGrouping = currentGrouping.current,
    forceRefresh = false
  ) => {
    console.log(`generateSections: Called with ${photos.length} photos, grouping: ${grouping}, forceRefresh: ${forceRefresh}`);
    
    if (photos.length === 0) {
      console.log('generateSections: No photos, clearing sections');
      setSections([]);
      setSlices([]);
      setMetrics(null);
      return;
    }

    // Check if we need to regenerate
    const photosHash = JSON.stringify(photos.map(p => ({ id: p.id, time: p.creationTime })));
    if (!forceRefresh && photosHash === lastPhotosHash.current && grouping === currentGrouping.current) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Generate sections using TimelineEngine
      const newSections = await TimelineEngine.generateTimelineSections(photos, grouping);
      
      // Create slices for virtualization
      const newSlices = TimelineEngine.createTimelineSlices(newSections, config.sliceSize);
      
      // Calculate metrics
      const newMetrics = TimelineEngine.getMetrics(newSections);
      
      // Update state
      setSections(newSections);
      setSlices(newSlices);
      setMetrics(newMetrics);
      
      // Update refs
      lastPhotosHash.current = photosHash;
      currentGrouping.current = grouping;
      
      console.log(`Timeline generated: ${newSections.length} sections, ${newMetrics.totalPhotos} photos`);
      
    } catch (err) {
      const error: AppError = {
        code: 'UNKNOWN_ERROR',
        message: `Timeline generation failed: ${err instanceof Error ? err.message : String(err)}`,
        timestamp: new Date()
      };
      setError(error);
      setStoreError(error);
    } finally {
      setIsLoading(false);
    }
  }, [config.sliceSize, setStoreError]);

  /**
   * Refresh timeline data
   */
  const refreshTimeline = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await generateSections(allPhotos, currentGrouping.current, true);
    } finally {
      setIsRefreshing(false);
    }
  }, [allPhotos, generateSections]);

  /**
   * Scroll to specific date
   */
  const scrollToDate = useCallback(async (date: Date): Promise<TimelinePosition | null> => {
    try {
      const position = await TimelineEngine.scrollToDate(date, sections);
      if (position) {
        setCurrentPosition(position);
        updatePosition(position);
      }
      return position;
    } catch (err) {
      console.error('Failed to scroll to date:', err);
      return null;
    }
  }, [sections]);

  /**
   * Update current timeline position
   */
  const updatePosition = useCallback((position: TimelinePosition) => {
    TimelineEngine.updatePosition(position);
    setCurrentPosition(position);
    
    // Preload adjacent sections if enabled
    if (config.enablePreloading) {
      preloadSection(position.sectionIndex);
    }
  }, [config.enablePreloading]);

  /**
   * Get photos for date range
   */
  const getPhotosForDateRange = useCallback(async (
    start: Date, 
    end: Date, 
    options?: { limit?: number; offset?: number }
  ): Promise<PhotoAsset[]> => {
    try {
      return await TimelineEngine.getPhotosForDateRange(start, end, options);
    } catch (err) {
      console.error('Failed to get photos for date range:', err);
      return [];
    }
  }, []);

  /**
   * Change grouping strategy
   */
  const changeGrouping = useCallback(async (grouping: TimelineGrouping) => {
    if (grouping === currentGrouping.current) return;
    
    setIsLoading(true);
    try {
      await generateSections(allPhotos, grouping, true);
    } finally {
      setIsLoading(false);
    }
  }, [allPhotos, generateSections]);

  /**
   * Preload specific section
   */
  const preloadSection = useCallback(async (sectionIndex: number) => {
    if (!config.enablePreloading || isPreloading) return;
    
    setIsPreloading(true);
    try {
      await TimelineEngine.preloadSections(sectionIndex, sections);
    } catch (err) {
      console.error('Failed to preload sections:', err);
    } finally {
      setIsPreloading(false);
    }
  }, [config.enablePreloading, sections, isPreloading]);

  /**
   * Clear timeline cache
   */
  const clearCache = useCallback(() => {
    TimelineEngine.clearCache();
    lastPhotosHash.current = '';
  }, []);

  /**
   * Find section by date
   */
  const findSectionByDate = useCallback((date: Date): DateSection | null => {
    return sections.find(section => 
      date >= section.startDate && date <= section.endDate
    ) || null;
  }, [sections]);

  /**
   * Get section index by section ID
   */
  const getSectionIndex = useCallback((sectionId: string): number => {
    return sections.findIndex(section => section.date === sectionId);
  }, [sections]);

  /**
   * Get cache statistics
   */
  const getCacheStats = useCallback(() => {
    return TimelineEngine.getCacheStats();
  }, []);

  /**
   * Initialize and sync with photo store
   */
  useEffect(() => {
    if (!isInitialized.current) {
      initializeTimeline();
    }
  }, [initializeTimeline]);

  /**
   * Generate sections when photos change
   */
  useEffect(() => {
    console.log(`useTimeline: allPhotos.length = ${allPhotos.length}, isInitialized = ${isInitialized.current}`);
    if (isInitialized.current && allPhotos.length > 0) {
      console.log('useTimeline: Generating sections from photos');
      generateSections(allPhotos);
    }
  }, [allPhotos, generateSections]);

  /**
   * Sync current position from TimelineEngine
   */
  useEffect(() => {
    const position = TimelineEngine.getCurrentPosition();
    if (position && !currentPosition) {
      setCurrentPosition(position);
    }
  }, [currentPosition]);

  /**
   * Handle store errors
   */
  useEffect(() => {
    if (storeError && !error) {
      setError(storeError);
    }
  }, [storeError, error]);

  return {
    // Data
    sections,
    slices,
    currentPosition,
    metrics,
    
    // Loading states
    isLoading: isLoading || storeLoading,
    isRefreshing,
    isPreloading,
    
    // Error handling
    error: error || storeError,
    
    // Actions
    refreshTimeline,
    scrollToDate,
    updatePosition,
    getPhotosForDateRange,
    changeGrouping,
    
    // Virtualization support
    preloadSection,
    clearCache,
    
    // Utilities
    findSectionByDate,
    getSectionIndex,
    getCacheStats
  };
}

export default useTimeline;