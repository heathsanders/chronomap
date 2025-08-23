import { create } from 'zustand';
import * as FileSystem from 'expo-file-system';

export interface CacheEntry<T = any> {
  key: string;
  data: T;
  timestamp: number;
  size: number; // bytes
  ttl?: number; // time to live in ms
  accessCount: number;
  lastAccessed: number;
}

export interface CacheMetrics {
  totalSize: number;
  totalEntries: number;
  hitCount: number;
  missCount: number;
  evictionCount: number;
  lastCleanup: number;
}

export interface CacheState {
  // In-memory caches
  photoThumbnails: Map<string, CacheEntry<string>>; // photoId -> base64 or URI
  queryResults: Map<string, CacheEntry<any>>; // queryKey -> result data
  locationData: Map<string, CacheEntry<any>>; // coordinate -> geocoding result
  
  // Cache configuration
  maxMemorySize: number; // bytes
  maxEntries: number;
  defaultTTL: number; // ms
  
  // Cache metrics
  metrics: CacheMetrics;
  
  // Cache status
  isCleanupInProgress: boolean;
  lastOptimization: number;
}

export interface CacheActions {
  // Generic cache operations
  set: <T>(cacheType: keyof Pick<CacheState, 'photoThumbnails' | 'queryResults' | 'locationData'>, key: string, data: T, ttl?: number) => void;
  get: <T>(cacheType: keyof Pick<CacheState, 'photoThumbnails' | 'queryResults' | 'locationData'>, key: string) => T | null;
  has: (cacheType: keyof Pick<CacheState, 'photoThumbnails' | 'queryResults' | 'locationData'>, key: string) => boolean;
  delete: (cacheType: keyof Pick<CacheState, 'photoThumbnails' | 'queryResults' | 'locationData'>, key: string) => void;
  
  // Batch operations
  setMultiple: <T>(cacheType: keyof Pick<CacheState, 'photoThumbnails' | 'queryResults' | 'locationData'>, entries: Array<{key: string, data: T, ttl?: number}>) => void;
  deleteMultiple: (cacheType: keyof Pick<CacheState, 'photoThumbnails' | 'queryResults' | 'locationData'>, keys: string[]) => void;
  
  // Cache management
  cleanup: () => Promise<void>;
  evictLRU: (cacheType?: keyof Pick<CacheState, 'photoThumbnails' | 'queryResults' | 'locationData'>, count?: number) => void;
  clear: (cacheType?: keyof Pick<CacheState, 'photoThumbnails' | 'queryResults' | 'locationData'>) => void;
  optimize: () => Promise<void>;
  
  // Configuration
  setMaxMemorySize: (size: number) => void;
  setMaxEntries: (count: number) => void;
  setDefaultTTL: (ttl: number) => void;
  
  // Metrics and monitoring
  getMetrics: () => CacheMetrics;
  getCacheInfo: (cacheType: keyof Pick<CacheState, 'photoThumbnails' | 'queryResults' | 'locationData'>) => {
    size: number;
    entries: number;
    hitRate: number;
  };
  resetMetrics: () => void;
}

export type CacheStore = CacheState & CacheActions;

const initialMetrics: CacheMetrics = {
  totalSize: 0,
  totalEntries: 0,
  hitCount: 0,
  missCount: 0,
  evictionCount: 0,
  lastCleanup: Date.now(),
};

const initialState: CacheState = {
  photoThumbnails: new Map(),
  queryResults: new Map(),
  locationData: new Map(),
  
  maxMemorySize: 100 * 1024 * 1024, // 100MB default
  maxEntries: 1000,
  defaultTTL: 30 * 60 * 1000, // 30 minutes
  
  metrics: initialMetrics,
  isCleanupInProgress: false,
  lastOptimization: Date.now(),
};

export const useCacheStore = create<CacheStore>((set, get) => ({
  ...initialState,

  set: (cacheType, key, data, ttl) => {
    set((state) => {
      const cache = state[cacheType];
      const now = Date.now();
      const dataString = typeof data === 'string' ? data : JSON.stringify(data);
      const size = new Blob([dataString]).size;
      
      const entry: CacheEntry = {
        key,
        data,
        timestamp: now,
        size,
        ttl: ttl || state.defaultTTL,
        accessCount: 1,
        lastAccessed: now,
      };
      
      // Check if we need to evict before adding
      const newCache = new Map(cache);
      const currentSize = state.metrics.totalSize;
      
      if (currentSize + size > state.maxMemorySize || cache.size >= state.maxEntries) {
        // Evict LRU entries
        get().evictLRU(cacheType, Math.max(1, Math.floor(cache.size * 0.1)));
      }
      
      newCache.set(key, entry);
      
      return {
        [cacheType]: newCache,
        metrics: {
          ...state.metrics,
          totalSize: state.metrics.totalSize + size,
          totalEntries: state.metrics.totalEntries + 1,
        },
      };
    });
  },

  get: (cacheType, key) => {
    const state = get();
    const cache = state[cacheType];
    const entry = cache.get(key);
    
    if (!entry) {
      // Cache miss
      set((s) => ({
        metrics: {
          ...s.metrics,
          missCount: s.metrics.missCount + 1,
        },
      }));
      return null;
    }
    
    const now = Date.now();
    
    // Check if entry has expired
    if (entry.ttl && (now - entry.timestamp) > entry.ttl) {
      get().delete(cacheType, key);
      set((s) => ({
        metrics: {
          ...s.metrics,
          missCount: s.metrics.missCount + 1,
        },
      }));
      return null;
    }
    
    // Update access information
    const updatedEntry = {
      ...entry,
      accessCount: entry.accessCount + 1,
      lastAccessed: now,
    };
    
    set((s) => ({
      [cacheType]: new Map(s[cacheType]).set(key, updatedEntry),
      metrics: {
        ...s.metrics,
        hitCount: s.metrics.hitCount + 1,
      },
    }));
    
    return entry.data;
  },

  has: (cacheType, key) => {
    const cache = get()[cacheType];
    const entry = cache.get(key);
    
    if (!entry) return false;
    
    // Check expiration
    if (entry.ttl && (Date.now() - entry.timestamp) > entry.ttl) {
      get().delete(cacheType, key);
      return false;
    }
    
    return true;
  },

  delete: (cacheType, key) => {
    set((state) => {
      const cache = new Map(state[cacheType]);
      const entry = cache.get(key);
      
      if (entry) {
        cache.delete(key);
        return {
          [cacheType]: cache,
          metrics: {
            ...state.metrics,
            totalSize: state.metrics.totalSize - entry.size,
            totalEntries: state.metrics.totalEntries - 1,
          },
        };
      }
      
      return state;
    });
  },

  setMultiple: (cacheType, entries) => {
    entries.forEach(({ key, data, ttl }) => {
      get().set(cacheType, key, data, ttl);
    });
  },

  deleteMultiple: (cacheType, keys) => {
    keys.forEach(key => {
      get().delete(cacheType, key);
    });
  },

  cleanup: async () => {
    const state = get();
    if (state.isCleanupInProgress) return;
    
    set((s) => ({ isCleanupInProgress: true }));
    
    try {
      const now = Date.now();
      
      // Clean up expired entries from all caches
      ['photoThumbnails', 'queryResults', 'locationData'].forEach((cacheType) => {
        const cache = state[cacheType as keyof Pick<CacheState, 'photoThumbnails' | 'queryResults' | 'locationData'>];
        const expiredKeys: string[] = [];
        
        cache.forEach((entry, key) => {
          if (entry.ttl && (now - entry.timestamp) > entry.ttl) {
            expiredKeys.push(key);
          }
        });
        
        if (expiredKeys.length > 0) {
          get().deleteMultiple(cacheType as keyof Pick<CacheState, 'photoThumbnails' | 'queryResults' | 'locationData'>, expiredKeys);
        }
      });
      
      set((s) => ({
        isCleanupInProgress: false,
        metrics: {
          ...s.metrics,
          lastCleanup: now,
        },
      }));
    } catch (error) {
      console.error('Cache cleanup failed:', error);
      set((s) => ({ isCleanupInProgress: false }));
    }
  },

  evictLRU: (cacheType, count = 1) => {
    set((state) => {
      const cacheTypes = cacheType ? [cacheType] : ['photoThumbnails', 'queryResults', 'locationData'] as const;
      let evictedCount = 0;
      
      const newState = { ...state };
      
      cacheTypes.forEach((type) => {
        const cache = new Map(state[type]);
        
        // Sort entries by last accessed time (oldest first)
        const entries = Array.from(cache.entries())
          .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed)
          .slice(0, count);
        
        entries.forEach(([key, entry]) => {
          cache.delete(key);
          newState.metrics.totalSize -= entry.size;
          newState.metrics.totalEntries -= 1;
          evictedCount++;
        });
        
        newState[type] = cache;
      });
      
      newState.metrics.evictionCount += evictedCount;
      return newState;
    });
  },

  clear: (cacheType) => {
    set((state) => {
      if (cacheType) {
        const cache = state[cacheType];
        let removedSize = 0;
        let removedCount = 0;
        
        cache.forEach((entry) => {
          removedSize += entry.size;
          removedCount++;
        });
        
        return {
          [cacheType]: new Map(),
          metrics: {
            ...state.metrics,
            totalSize: state.metrics.totalSize - removedSize,
            totalEntries: state.metrics.totalEntries - removedCount,
          },
        };
      } else {
        // Clear all caches
        return {
          ...initialState,
          maxMemorySize: state.maxMemorySize,
          maxEntries: state.maxEntries,
          defaultTTL: state.defaultTTL,
          metrics: {
            ...initialMetrics,
            evictionCount: state.metrics.evictionCount,
            hitCount: state.metrics.hitCount,
            missCount: state.metrics.missCount,
          },
        };
      }
    });
  },

  optimize: async () => {
    const state = get();
    const now = Date.now();
    
    // Skip if optimized recently (within last 5 minutes)
    if (now - state.lastOptimization < 5 * 60 * 1000) {
      return;
    }
    
    try {
      // Clean up expired entries
      await get().cleanup();
      
      // If still over limits, evict LRU entries
      const afterCleanup = get();
      if (afterCleanup.metrics.totalSize > afterCleanup.maxMemorySize * 0.8) {
        const evictCount = Math.floor(afterCleanup.metrics.totalEntries * 0.2);
        get().evictLRU(undefined, evictCount);
      }
      
      set((s) => ({ lastOptimization: now }));
    } catch (error) {
      console.error('Cache optimization failed:', error);
    }
  },

  setMaxMemorySize: (maxMemorySize) => {
    set(() => ({ maxMemorySize }));
  },

  setMaxEntries: (maxEntries) => {
    set(() => ({ maxEntries }));
  },

  setDefaultTTL: (defaultTTL) => {
    set(() => ({ defaultTTL }));
  },

  getMetrics: () => {
    return get().metrics;
  },

  getCacheInfo: (cacheType) => {
    const state = get();
    const cache = state[cacheType];
    let totalSize = 0;
    
    cache.forEach((entry) => {
      totalSize += entry.size;
    });
    
    const hitRate = state.metrics.hitCount + state.metrics.missCount > 0
      ? state.metrics.hitCount / (state.metrics.hitCount + state.metrics.missCount)
      : 0;
    
    return {
      size: totalSize,
      entries: cache.size,
      hitRate,
    };
  },

  resetMetrics: () => {
    set((state) => ({
      metrics: {
        ...initialMetrics,
        lastCleanup: state.metrics.lastCleanup,
      },
    }));
  },
}));

// Auto-cleanup hook - runs periodic cleanup
export const useCacheCleanup = () => {
  const cleanup = useCacheStore((state) => state.cleanup);
  const optimize = useCacheStore((state) => state.optimize);
  
  // Run cleanup every 5 minutes
  React.useEffect(() => {
    const interval = setInterval(() => {
      cleanup();
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [cleanup]);
  
  // Run optimization every 10 minutes
  React.useEffect(() => {
    const interval = setInterval(() => {
      optimize();
    }, 10 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [optimize]);
};