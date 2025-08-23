/**
 * TimelineEngine Service
 * Handles timeline data processing, grouping, and caching for efficient photo timeline rendering
 * Optimized for large photo libraries (50,000+ photos) with smart caching strategies
 */

import { 
  PhotoAsset, 
  PhotoMetadata,
  DateSection, 
  TimelinePhoto, 
  TimelineSlice, 
  TimelinePosition, 
  TimelineQuery, 
  TimelineGrouping, 
  TimelineMetrics,
  TimelineCache,
  AppError 
} from '@/types';
import DatabaseService from '@/services/DatabaseService';

export interface TimelineEngineConfig {
  maxCacheSize: number; // bytes
  defaultGrouping: TimelineGrouping;
  sliceSize: number; // photos per slice
  preloadSections: number; // sections to preload
}

class TimelineEngineService {
  private static instance: TimelineEngineService;
  private cache: Map<string, TimelineCache> = new Map();
  private currentPosition: TimelinePosition | null = null;
  private isInitialized = false;
  
  private config: TimelineEngineConfig = {
    maxCacheSize: 50 * 1024 * 1024, // 50MB
    defaultGrouping: 'daily',
    sliceSize: 100,
    preloadSections: 3
  };

  static getInstance(): TimelineEngineService {
    if (!TimelineEngineService.instance) {
      TimelineEngineService.instance = new TimelineEngineService();
    }
    return TimelineEngineService.instance;
  }

  /**
   * Initialize the timeline engine
   */
  async initialize(config?: Partial<TimelineEngineConfig>): Promise<void> {
    if (this.isInitialized) return;

    if (config) {
      this.config = { ...this.config, ...config };
    }

    // Ensure database is initialized
    if (!DatabaseService.isReady()) {
      await DatabaseService.initialize();
    }

    this.isInitialized = true;
    console.log('TimelineEngine initialized');
  }

  /**
   * Generate timeline sections from photos with intelligent grouping
   */
  async generateTimelineSections(
    photos: PhotoAsset[], 
    grouping: TimelineGrouping = this.config.defaultGrouping
  ): Promise<DateSection[]> {
    const cacheKey = `sections_${grouping}_${this.hashPhotos(photos)}`;
    
    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached && Array.isArray(cached.data)) {
      this.updateCacheAccess(cacheKey);
      return cached.data as DateSection[];
    }

    const sections = this.groupPhotosByDate(photos, grouping);
    
    // Cache the result
    this.setCache(cacheKey, sections);
    
    return sections;
  }

  /**
   * Group photos by date with configurable granularity
   */
  private groupPhotosByDate(photos: PhotoAsset[], grouping: TimelineGrouping): DateSection[] {
    const groups = new Map<string, PhotoAsset[]>();

    photos.forEach(photo => {
      const date = new Date(photo.creationTime);
      const dateKey = this.getDateKey(date, grouping);
      
      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }
      groups.get(dateKey)!.push(photo);
    });

    // Convert to DateSection array with enhanced metadata
    const sections = Array.from(groups.entries()).map(([dateKey, sectionPhotos]) => {
      const { startDate, endDate, displayDate } = this.getDateRangeFromKey(dateKey, grouping);
      
      return {
        date: dateKey,
        displayDate,
        photos: sectionPhotos.sort((a, b) => b.creationTime - a.creationTime),
        count: sectionPhotos.length,
        startDate,
        endDate,
        grouping
      } as DateSection;
    });

    // Sort sections by date (newest first)
    return sections.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
  }

  /**
   * Generate date key based on grouping strategy
   */
  private getDateKey(date: Date, grouping: TimelineGrouping): string {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    switch (grouping) {
      case 'daily':
        return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      case 'weekly':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        return `${weekStart.getFullYear()}-W${this.getWeekNumber(weekStart)}`;
      case 'monthly':
        return `${year}-${month.toString().padStart(2, '0')}`;
      case 'yearly':
        return year.toString();
    }
  }

  /**
   * Get date range and display format for a date key
   */
  private getDateRangeFromKey(dateKey: string, grouping: TimelineGrouping): {
    startDate: Date;
    endDate: Date;
    displayDate: string;
  } {
    switch (grouping) {
      case 'daily': {
        const [year, month, day] = dateKey.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        return {
          startDate: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
          endDate: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59),
          displayDate: date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })
        };
      }
      case 'weekly': {
        const [year, weekStr] = dateKey.split('-W');
        const weekNum = parseInt(weekStr, 10);
        const startDate = this.getDateFromWeek(parseInt(year, 10), weekNum);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59);
        
        return {
          startDate,
          endDate,
          displayDate: `Week of ${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
        };
      }
      case 'monthly': {
        const [year, month] = dateKey.split('-').map(Number);
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);
        
        return {
          startDate,
          endDate,
          displayDate: startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
        };
      }
      case 'yearly': {
        const year = parseInt(dateKey, 10);
        return {
          startDate: new Date(year, 0, 1),
          endDate: new Date(year, 11, 31, 23, 59, 59),
          displayDate: year.toString()
        };
      }
    }
  }

  /**
   * Get photos for specific date range with pagination
   */
  async getPhotosForDateRange(
    startDate: Date,
    endDate: Date,
    options: {
      limit?: number;
      offset?: number;
      includeLocation?: boolean;
    } = {}
  ): Promise<PhotoAsset[]> {
    const cacheKey = `range_${startDate.getTime()}_${endDate.getTime()}_${JSON.stringify(options)}`;
    
    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached && Array.isArray(cached.data)) {
      this.updateCacheAccess(cacheKey);
      return cached.data as PhotoAsset[];
    }

    // Query database for photos in date range
    const photoMetadata = await DatabaseService.getPhotos({
      startDate,
      endDate,
      limit: options.limit,
      offset: options.offset
    });

    // Convert to PhotoAsset format
    const photos = photoMetadata.map(this.convertToPhotoAsset);
    
    // Cache the result
    this.setCache(cacheKey, photos);
    
    return photos;
  }

  /**
   * Create timeline slices for efficient virtualization
   */
  createTimelineSlices(sections: DateSection[], sliceSize: number = this.config.sliceSize): TimelineSlice[] {
    const slices: TimelineSlice[] = [];
    let photoIndex = 0;
    
    for (let i = 0; i < sections.length; i += sliceSize) {
      const sliceSections = sections.slice(i, i + sliceSize);
      const totalPhotos = sliceSections.reduce((sum, section) => sum + section.count, 0);
      
      const slice: TimelineSlice = {
        startIndex: i,
        endIndex: Math.min(i + sliceSize - 1, sections.length - 1),
        sections: sliceSections,
        totalPhotos,
        estimatedHeight: this.estimateSliceHeight(sliceSections),
        cacheKey: `slice_${i}_${sliceSize}`
      };
      
      slices.push(slice);
      photoIndex += totalPhotos;
    }
    
    return slices;
  }

  /**
   * Track current timeline position for navigation
   */
  updatePosition(position: TimelinePosition): void {
    this.currentPosition = {
      ...position,
      timestamp: Date.now()
    };
  }

  /**
   * Get current timeline position
   */
  getCurrentPosition(): TimelinePosition | null {
    return this.currentPosition;
  }

  /**
   * Scroll to specific date in timeline
   */
  async scrollToDate(targetDate: Date, sections: DateSection[]): Promise<TimelinePosition | null> {
    for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
      const section = sections[sectionIndex];
      
      if (targetDate >= section.startDate && targetDate <= section.endDate) {
        // Find photo closest to target date within section
        let photoIndex = 0;
        let closestDiff = Infinity;
        
        for (let i = 0; i < section.photos.length; i++) {
          const photo = section.photos[i];
          const diff = Math.abs(photo.creationTime - targetDate.getTime());
          
          if (diff < closestDiff) {
            closestDiff = diff;
            photoIndex = i;
          }
        }
        
        const position: TimelinePosition = {
          sectionIndex,
          photoIndex,
          scrollOffset: this.calculateScrollOffset(sections, sectionIndex, photoIndex),
          date: targetDate,
          timestamp: Date.now()
        };
        
        this.updatePosition(position);
        return position;
      }
    }
    
    return null;
  }

  /**
   * Get timeline metrics for performance monitoring
   */
  getMetrics(sections: DateSection[]): TimelineMetrics {
    const totalPhotos = sections.reduce((sum, section) => sum + section.count, 0);
    const dateRange = this.getDateRange(sections);
    
    return {
      totalSections: sections.length,
      totalPhotos,
      dateRange,
      cacheSize: this.getCacheSize(),
      averagePhotosPerSection: totalPhotos / sections.length || 0,
      memoryUsage: this.estimateMemoryUsage(sections)
    };
  }

  /**
   * Preload adjacent sections for smooth scrolling
   */
  async preloadSections(currentSectionIndex: number, sections: DateSection[]): Promise<void> {
    const preloadCount = this.config.preloadSections;
    const startIndex = Math.max(0, currentSectionIndex - preloadCount);
    const endIndex = Math.min(sections.length - 1, currentSectionIndex + preloadCount);
    
    for (let i = startIndex; i <= endIndex; i++) {
      if (i !== currentSectionIndex) {
        // Preload section data in background
        const section = sections[i];
        const cacheKey = `section_${i}_preload`;
        
        if (!this.cache.has(cacheKey)) {
          // Convert section photos to TimelinePhoto format
          const timelinePhotos = section.photos.map((photo, index) => ({
            ...photo,
            sectionId: section.date,
            indexInSection: index,
            isVisible: false
          } as TimelinePhoto));
          
          this.setCache(cacheKey, timelinePhotos);
        }
      }
    }
  }

  /**
   * Cache management methods
   */
  private setCache(key: string, data: DateSection[] | TimelineSlice | PhotoAsset[] | TimelinePhoto[]): void {
    const size = JSON.stringify(data).length * 2; // Rough byte estimation
    
    const cacheEntry: TimelineCache = {
      key,
      data,
      timestamp: Date.now(),
      accessCount: 1,
      size
    };
    
    this.cache.set(key, cacheEntry);
    
    // Prune cache if needed
    this.pruneCache();
  }

  private getFromCache(key: string): TimelineCache | null {
    return this.cache.get(key) || null;
  }

  private updateCacheAccess(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      entry.accessCount++;
      entry.timestamp = Date.now();
    }
  }

  private pruneCache(): void {
    const totalSize = Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.size, 0);
    
    if (totalSize > this.config.maxCacheSize) {
      // Sort by access count and timestamp (LRU strategy)
      const sortedEntries = Array.from(this.cache.entries()).sort(([, a], [, b]) => {
        const scoreA = a.accessCount / (Date.now() - a.timestamp);
        const scoreB = b.accessCount / (Date.now() - b.timestamp);
        return scoreA - scoreB;
      });
      
      // Remove oldest/least accessed entries
      let currentSize = totalSize;
      for (const [key] of sortedEntries) {
        if (currentSize <= this.config.maxCacheSize * 0.8) break;
        
        const entry = this.cache.get(key);
        if (entry) {
          currentSize -= entry.size;
          this.cache.delete(key);
        }
      }
    }
  }

  private getCacheSize(): number {
    return Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.size, 0);
  }

  /**
   * Utility methods
   */
  private hashPhotos(photos: PhotoAsset[]): string {
    const hashStr = photos.map(p => `${p.id}_${p.creationTime}`).join('|');
    return hashStr.slice(0, 32); // Simple hash
  }

  private convertToPhotoAsset(metadata: PhotoMetadata): PhotoAsset {
    return {
      id: metadata.id,
      uri: metadata.filePath,
      filename: metadata.filename,
      width: metadata.width,
      height: metadata.height,
      creationTime: metadata.createdAt.getTime(),
      modificationTime: metadata.modifiedAt.getTime(),
      mediaType: metadata.mimeType.startsWith('image/') ? 'photo' : 'video',
      location: metadata.location
    };
  }

  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  private getDateFromWeek(year: number, week: number): Date {
    const firstDayOfYear = new Date(year, 0, 1);
    const daysToAdd = (week - 1) * 7 - firstDayOfYear.getDay();
    return new Date(year, 0, 1 + daysToAdd);
  }

  private estimateSliceHeight(sections: DateSection[]): number {
    const HEADER_HEIGHT = 40; // Date header height
    const PHOTO_ROW_HEIGHT = 120; // Average photo row height
    const SECTION_MARGIN = 16; // Margin between sections
    
    return sections.reduce((total, section) => {
      const rows = Math.ceil(section.photos.length / 3); // Assuming 3 photos per row
      return total + HEADER_HEIGHT + (rows * PHOTO_ROW_HEIGHT) + SECTION_MARGIN;
    }, 0);
  }

  private calculateScrollOffset(sections: DateSection[], sectionIndex: number, photoIndex: number): number {
    let offset = 0;
    
    // Add heights of all previous sections
    for (let i = 0; i < sectionIndex; i++) {
      offset += this.estimateSliceHeight([sections[i]]);
    }
    
    // Add offset within current section for specific photo
    const PHOTO_ROW_HEIGHT = 120;
    const HEADER_HEIGHT = 40;
    const photosPerRow = 3;
    const rowIndex = Math.floor(photoIndex / photosPerRow);
    
    offset += HEADER_HEIGHT + (rowIndex * PHOTO_ROW_HEIGHT);
    
    return offset;
  }

  private getDateRange(sections: DateSection[]): { start: Date; end: Date } {
    if (sections.length === 0) {
      const now = new Date();
      return { start: now, end: now };
    }
    
    const sortedSections = [...sections].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    return {
      start: sortedSections[0].startDate,
      end: sortedSections[sortedSections.length - 1].endDate
    };
  }

  private estimateMemoryUsage(sections: DateSection[]): number {
    // Rough estimation in bytes
    const photosCount = sections.reduce((sum, section) => sum + section.count, 0);
    const avgPhotoSize = 2048; // Estimated size per photo object in memory
    return photosCount * avgPhotoSize;
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear();
    console.log('Timeline cache cleared');
  }

  /**
   * Get cache statistics for debugging
   */
  getCacheStats(): { entries: number; size: number; hitRate?: number } {
    const entries = this.cache.size;
    const size = this.getCacheSize();
    
    return { entries, size };
  }
}

export default TimelineEngineService.getInstance();