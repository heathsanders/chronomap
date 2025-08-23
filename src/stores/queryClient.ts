/**
 * React Query Client Configuration
 * Optimized for offline-first photo app with privacy compliance
 */

import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { APP_CONFIG } from '@/config';
import { AppError } from '@/types';

/**
 * Query keys factory for consistent cache management
 * Provides type-safe query key generation
 */
export const queryKeys = {
  // Photo-related queries
  photos: {
    all: ['photos'] as const,
    lists: () => [...queryKeys.photos.all, 'list'] as const,
    list: (filters?: any) => [...queryKeys.photos.lists(), filters] as const,
    details: () => [...queryKeys.photos.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.photos.details(), id] as const,
    metadata: (id: string) => [...queryKeys.photos.detail(id), 'metadata'] as const,
    thumbnail: (id: string) => [...queryKeys.photos.detail(id), 'thumbnail'] as const,
    scan: {
      all: ['scan'] as const,
      progress: () => [...queryKeys.photos.scan.all, 'progress'] as const,
      status: () => [...queryKeys.photos.scan.all, 'status'] as const,
    },
  },

  // Timeline-related queries
  timeline: {
    all: ['timeline'] as const,
    sections: (dateRange?: { start: Date; end: Date }) => 
      [...queryKeys.timeline.all, 'sections', dateRange] as const,
    dateGroups: () => [...queryKeys.timeline.all, 'dateGroups'] as const,
  },

  // Location-related queries
  locations: {
    all: ['locations'] as const,
    clusters: (bounds?: any) => [...queryKeys.locations.all, 'clusters', bounds] as const,
    geocoding: (coords: { lat: number; lon: number }) => 
      [...queryKeys.locations.all, 'geocoding', coords] as const,
  },

  // Media library queries
  mediaLibrary: {
    all: ['mediaLibrary'] as const,
    permissions: () => [...queryKeys.mediaLibrary.all, 'permissions'] as const,
    count: () => [...queryKeys.mediaLibrary.all, 'count'] as const,
    albums: () => [...queryKeys.mediaLibrary.all, 'albums'] as const,
  },

  // Settings and preferences
  settings: {
    all: ['settings'] as const,
    privacy: () => [...queryKeys.settings.all, 'privacy'] as const,
    performance: () => [...queryKeys.settings.all, 'performance'] as const,
  },
} as const;

/**
 * Error handler for React Query operations
 * Provides privacy-safe error logging
 */
function handleQueryError(error: unknown): void {
  console.error('Query error:', error);
  
  // Could integrate with error boundary or toast notifications
  // Ensure no sensitive data is logged
  if (error instanceof Error) {
    // Log sanitized error information only
    const sanitizedError: AppError = {
      code: 'UNKNOWN_ERROR',
      message: error.message,
      timestamp: new Date(),
    };
    
    // Store error for user feedback (without sensitive details)
    // This could be integrated with error store or analytics
  }
}

/**
 * Cache invalidation strategies for different scenarios
 */
export const cacheInvalidation = {
  /**
   * Invalidate all photo-related queries
   * Use after major scan operations or photo library changes
   */
  invalidatePhotos: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.photos.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.timeline.all });
  },

  /**
   * Invalidate location-related queries
   * Use after location permission changes or geocoding updates
   */
  invalidateLocations: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.locations.all });
  },

  /**
   * Invalidate timeline sections
   * Use after date filtering or sorting changes
   */
  invalidateTimeline: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.timeline.all });
  },

  /**
   * Full cache refresh
   * Use sparingly, only for major app state changes
   */
  invalidateAll: (queryClient: QueryClient) => {
    queryClient.clear();
  },

  /**
   * Selective invalidation for performance
   * Invalidate only specific photo detail queries
   */
  invalidatePhotoDetail: (queryClient: QueryClient, photoId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.photos.detail(photoId) });
  },
};

/**
 * Create configured React Query client
 * Optimized for offline-first mobile app with large datasets
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: handleQueryError,
    }),
    
    mutationCache: new MutationCache({
      onError: handleQueryError,
    }),

    defaultOptions: {
      queries: {
        // Offline-first configuration
        retry: (failureCount, error) => {
          // Retry network errors but not permission errors
          if (error instanceof Error && error.message.includes('permission')) {
            return false;
          }
          return failureCount < 3;
        },
        
        // Cache for 5 minutes by default
        staleTime: 5 * 60 * 1000,
        
        // Keep cache for 1 hour
        gcTime: 60 * 60 * 1000, // Updated to gcTime for React Query v5
        
        // Refetch on window focus for fresh data
        refetchOnWindowFocus: true,
        
        // Don't refetch on reconnect to preserve battery
        refetchOnReconnect: false,
        
        // Background refetch for better UX
        refetchOnMount: 'always',
        
        // Network mode for offline-first approach
        networkMode: 'offlineFirst',
        
        // Retry delay with exponential backoff
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      },

      mutations: {
        // Retry mutations less aggressively
        retry: (failureCount, error) => {
          // Don't retry user-initiated actions that failed due to permissions
          if (error instanceof Error && 
              (error.message.includes('permission') || error.message.includes('user'))) {
            return false;
          }
          return failureCount < 2;
        },
        
        // Network mode for offline-first mutations
        networkMode: 'offlineFirst',
      },
    },
  });
}

/**
 * Query client singleton instance
 * Ensures consistent configuration across the app
 */
export const queryClient = createQueryClient();

/**
 * Cache size monitoring and management
 * Helps maintain performance with large photo libraries
 */
export const cacheManager = {
  /**
   * Get current cache statistics
   */
  getCacheStats: () => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    return {
      totalQueries: queries.length,
      activeQueries: queries.filter(q => q.getObserversCount() > 0).length,
      staleQueries: queries.filter(q => q.isStale()).length,
      errorQueries: queries.filter(q => q.state.status === 'error').length,
    };
  },

  /**
   * Prune cache to manage memory usage
   * Removes old and unused cache entries
   */
  pruneCache: () => {
    const maxQueries = 500; // Reasonable limit for mobile devices
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    if (queries.length > maxQueries) {
      // Remove oldest stale queries first
      const staleQueries = queries
        .filter(q => q.isStale() && q.getObserversCount() === 0)
        .sort((a, b) => (a.state.dataUpdatedAt || 0) - (b.state.dataUpdatedAt || 0));
      
      const toRemove = Math.min(staleQueries.length, queries.length - maxQueries);
      
      for (let i = 0; i < toRemove; i++) {
        cache.remove(staleQueries[i]);
      }
      
      console.log(`Pruned ${toRemove} cache entries`);
    }
  },

  /**
   * Monitor cache size and auto-prune if necessary
   */
  startCacheMonitoring: () => {
    // Check cache size every 5 minutes
    const interval = setInterval(() => {
      const stats = cacheManager.getCacheStats();
      
      // Log cache statistics for debugging
      if (APP_CONFIG.privacy.noCrashReporting === false) {
        console.log('Cache stats:', stats);
      }
      
      // Auto-prune if cache gets too large
      if (stats.totalQueries > 1000) {
        cacheManager.pruneCache();
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  },
};

/**
 * Offline query strategies
 * Handles different scenarios when device is offline
 */
export const offlineStrategies = {
  /**
   * Pre-populate cache with essential data
   * Call during app initialization
   */
  prefetchEssentialData: async () => {
    try {
      // Prefetch photo count for UI initialization
      await queryClient.prefetchQuery({
        queryKey: queryKeys.mediaLibrary.count(),
        queryFn: async () => {
          // This would integrate with MediaScanner service
          const MediaScanner = (await import('@/services/MediaScanner')).default;
          return MediaScanner.getPhotoCount();
        },
        staleTime: 10 * 60 * 1000, // 10 minutes
      });

      // Prefetch permissions status
      await queryClient.prefetchQuery({
        queryKey: queryKeys.mediaLibrary.permissions(),
        queryFn: async () => {
          const PermissionManager = (await import('@/services/PermissionManager')).default;
          return {
            mediaLibrary: await PermissionManager.checkMediaLibraryPermission(),
            location: await PermissionManager.checkLocationPermission(),
          };
        },
        staleTime: 60 * 1000, // 1 minute
      });

    } catch (error) {
      console.error('Failed to prefetch essential data:', error);
    }
  },

  /**
   * Set data for offline use
   * Use when receiving data from background processes
   */
  setOfflineData: <T>(queryKey: any[], data: T) => {
    queryClient.setQueryData(queryKey, data);
  },

  /**
   * Get cached data without triggering network request
   */
  getCachedData: <T>(queryKey: any[]): T | undefined => {
    return queryClient.getQueryData<T>(queryKey);
  },
};