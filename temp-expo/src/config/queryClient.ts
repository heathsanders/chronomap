import { QueryClient } from 'react-query';
import { useCacheStore } from '../stores/cacheStore';

// Privacy-safe error logging
const logError = (error: Error, context: string) => {
  if (__DEV__) {
    console.error(`[QueryClient] ${context}:`, error.message);
  }
  // In production, only log non-sensitive error info
  // Never log photo data, file paths, or personal information
};

// Query client configuration optimized for mobile and privacy
export const createQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Conservative defaults for mobile battery life
        staleTime: 5 * 60 * 1000, // 5 minutes
        cacheTime: 30 * 60 * 1000, // 30 minutes
        
        // Retry configuration for mobile networks
        retry: (failureCount, error) => {
          // Don't retry on certain errors
          if (error instanceof Error) {
            // Don't retry permission errors
            if (error.message.includes('permission')) return false;
            // Don't retry file not found errors
            if (error.message.includes('not found')) return false;
          }
          
          // Retry up to 3 times with exponential backoff
          return failureCount < 3;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        
        // Background updates
        refetchOnWindowFocus: false, // Not applicable in mobile
        refetchOnMount: true,
        refetchOnReconnect: true,
        
        // Error handling
        onError: (error) => {
          logError(error as Error, 'Query Error');
        },
        
        // Use network status for loading states
        notifyOnChangeProps: ['data', 'error', 'isLoading', 'isFetching'],
      },
      
      mutations: {
        // Retry failed mutations (like photo saves)
        retry: (failureCount, error) => {
          if (error instanceof Error) {
            // Don't retry certain errors
            if (error.message.includes('permission')) return false;
            if (error.message.includes('disk full')) return false;
          }
          return failureCount < 2;
        },
        retryDelay: 1000,
        
        onError: (error) => {
          logError(error as Error, 'Mutation Error');
        },
      },
    },
    
    // Custom query cache for integration with our cache store
    queryCache: undefined, // We'll create this below
    mutationCache: undefined,
  });
};

// Query key factory for consistent cache keys
export const queryKeys = {
  // Photos queries
  photos: {
    all: ['photos'] as const,
    lists: () => [...queryKeys.photos.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.photos.lists(), filters] as const,
    details: () => [...queryKeys.photos.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.photos.details(), id] as const,
    byDateRange: (startDate: number, endDate: number) => 
      [...queryKeys.photos.lists(), 'dateRange', startDate, endDate] as const,
    withLocation: () => [...queryKeys.photos.lists(), 'withLocation'] as const,
    byAlbum: (albumId: string) => [...queryKeys.photos.lists(), 'album', albumId] as const,
    count: (filters?: Record<string, any>) => 
      [...queryKeys.photos.all, 'count', filters] as const,
  },
  
  // Albums queries
  albums: {
    all: ['albums'] as const,
    lists: () => [...queryKeys.albums.all, 'list'] as const,
    list: (filters?: Record<string, any>) => [...queryKeys.albums.lists(), filters] as const,
    details: () => [...queryKeys.albums.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.albums.details(), id] as const,
  },
  
  // Scanning queries
  scanning: {
    all: ['scanning'] as const,
    status: () => [...queryKeys.scanning.all, 'status'] as const,
    progress: () => [...queryKeys.scanning.all, 'progress'] as const,
    history: () => [...queryKeys.scanning.all, 'history'] as const,
  },
  
  // Location queries
  locations: {
    all: ['locations'] as const,
    clusters: (bounds?: any, zoom?: number) => 
      [...queryKeys.locations.all, 'clusters', bounds, zoom] as const,
    geocoding: (lat: number, lng: number) => 
      [...queryKeys.locations.all, 'geocoding', lat, lng] as const,
  },
  
  // Settings queries
  settings: {
    all: ['settings'] as const,
    user: () => [...queryKeys.settings.all, 'user'] as const,
    advanced: () => [...queryKeys.settings.all, 'advanced'] as const,
  },
  
  // Database health
  health: {
    all: ['health'] as const,
    database: () => [...queryKeys.health.all, 'database'] as const,
    storage: () => [...queryKeys.health.all, 'storage'] as const,
  },
} as const;

// Cache invalidation utilities
export const cacheInvalidation = {
  // Invalidate all photo-related queries
  invalidatePhotos: (queryClient: QueryClient) => {
    queryClient.invalidateQueries(queryKeys.photos.all);
  },
  
  // Invalidate specific photo queries
  invalidatePhotosByDateRange: (queryClient: QueryClient, startDate: number, endDate: number) => {
    queryClient.invalidateQueries(queryKeys.photos.byDateRange(startDate, endDate));
  },
  
  // Invalidate after photo operations
  invalidateAfterPhotoChange: (queryClient: QueryClient, photoIds: string[]) => {
    // Invalidate photo lists
    queryClient.invalidateQueries(queryKeys.photos.lists());
    
    // Invalidate specific photo details
    photoIds.forEach(id => {
      queryClient.invalidateQueries(queryKeys.photos.detail(id));
    });
    
    // Invalidate photo counts
    queryClient.invalidateQueries(queryKeys.photos.count());
    
    // Invalidate location-related queries if photos have location data
    queryClient.invalidateQueries(queryKeys.locations.all);
  },
  
  // Invalidate after scan completion
  invalidateAfterScan: (queryClient: QueryClient) => {
    // Invalidate all photo queries
    queryClient.invalidateQueries(queryKeys.photos.all);
    
    // Invalidate scanning status
    queryClient.invalidateQueries(queryKeys.scanning.status());
    
    // Invalidate health checks
    queryClient.invalidateQueries(queryKeys.health.all);
  },
  
  // Invalidate settings
  invalidateSettings: (queryClient: QueryClient) => {
    queryClient.invalidateQueries(queryKeys.settings.all);
  },
};

// Prefetch utilities for performance
export const prefetchUtilities = {
  // Prefetch photos for timeline virtualization
  prefetchPhotosForDateRange: async (
    queryClient: QueryClient, 
    startDate: number, 
    endDate: number,
    fetchFn: () => Promise<any>
  ) => {
    const queryKey = queryKeys.photos.byDateRange(startDate, endDate);
    
    // Only prefetch if not already cached
    if (!queryClient.getQueryData(queryKey)) {
      queryClient.prefetchQuery(queryKey, fetchFn, {
        staleTime: 10 * 60 * 1000, // 10 minutes for prefetched data
      });
    }
  },
  
  // Prefetch photo details for smooth navigation
  prefetchPhotoDetails: async (
    queryClient: QueryClient,
    photoIds: string[],
    fetchFn: (id: string) => Promise<any>
  ) => {
    const prefetchPromises = photoIds.map(id => {
      const queryKey = queryKeys.photos.detail(id);
      
      if (!queryClient.getQueryData(queryKey)) {
        return queryClient.prefetchQuery(queryKey, () => fetchFn(id), {
          staleTime: 15 * 60 * 1000, // 15 minutes for photo details
        });
      }
      return Promise.resolve();
    });
    
    await Promise.all(prefetchPromises);
  },
  
  // Prefetch location data for map view
  prefetchLocationClusters: async (
    queryClient: QueryClient,
    bounds: any,
    zoom: number,
    fetchFn: () => Promise<any>
  ) => {
    const queryKey = queryKeys.locations.clusters(bounds, zoom);
    
    if (!queryClient.getQueryData(queryKey)) {
      queryClient.prefetchQuery(queryKey, fetchFn, {
        staleTime: 5 * 60 * 1000, // 5 minutes for location data
      });
    }
  },
};

// Background sync configuration for offline-first functionality
export const backgroundSync = {
  // Enable background sync for critical data
  enableBackgroundSync: (queryClient: QueryClient) => {
    // Background refetch for photo counts (lightweight)
    queryClient.getQueryCache().getAll().forEach(query => {
      if (query.queryKey.includes('count')) {
        query.setOptions({
          ...query.options,
          refetchInterval: 5 * 60 * 1000, // 5 minutes for counts
        });
      }
    });
    
    // Background refetch for health status
    const healthQueries = queryClient.getQueryCache().getAll().filter(
      query => query.queryKey.includes('health')
    );
    
    healthQueries.forEach(query => {
      query.setOptions({
        ...query.options,
        refetchInterval: 2 * 60 * 1000, // 2 minutes for health
      });
    });
  },
  
  // Disable background sync for battery saving
  disableBackgroundSync: (queryClient: QueryClient) => {
    queryClient.getQueryCache().getAll().forEach(query => {
      query.setOptions({
        ...query.options,
        refetchInterval: false,
      });
    });
  },
};

// Export configured query client instance
export const queryClient = createQueryClient();