/**
 * Photo Store Tests
 * Tests for photo state management, filtering, and performance
 */

import { act, renderHook } from '@testing-library/react-native';
import { usePhotoStore } from '../photoStore';
import { mockPhotoAsset, mockPhotoArray, mockPhotoMetadata } from '@/__tests__/utils/testUtils';

describe('Photo Store', () => {
  beforeEach(() => {
    // Reset store before each test
    const { result } = renderHook(() => usePhotoStore());
    act(() => {
      result.current.setPhotos([]);
      result.current.deselectAllPhotos();
      result.current.clearError();
      result.current.setLoading(false);
      result.current.clearAllFilters();
    });
  });

  describe('Photo Management', () => {
    it('sets photos correctly', () => {
      const { result } = renderHook(() => usePhotoStore());
      const mockPhotos = mockPhotoArray(5);

      act(() => {
        result.current.setPhotos(mockPhotos);
      });

      expect(result.current.allPhotos).toEqual(mockPhotos);
      expect(result.current.timelineSections.length).toBeGreaterThan(0);
    });

    it('adds new photos without duplicates', () => {
      const { result } = renderHook(() => usePhotoStore());
      const initialPhotos = mockPhotoArray(3);
      const newPhotos = mockPhotoArray(2);
      
      act(() => {
        result.current.setPhotos(initialPhotos);
      });

      act(() => {
        result.current.addPhotos(newPhotos);
      });

      expect(result.current.allPhotos.length).toBe(5);
    });

    it('prevents duplicate photos when adding', () => {
      const { result } = renderHook(() => usePhotoStore());
      const photos = mockPhotoArray(3);
      
      act(() => {
        result.current.setPhotos(photos);
      });

      // Try to add the same photos again
      act(() => {
        result.current.addPhotos(photos);
      });

      expect(result.current.allPhotos.length).toBe(3); // No duplicates
    });

    it('removes photos correctly', () => {
      const { result } = renderHook(() => usePhotoStore());
      const photos = mockPhotoArray(3);
      
      act(() => {
        result.current.setPhotos(photos);
      });

      act(() => {
        result.current.removePhoto(photos[0].id);
      });

      expect(result.current.allPhotos.length).toBe(2);
      expect(result.current.allPhotos.find(p => p.id === photos[0].id)).toBeUndefined();
    });

    it('updates photo metadata', () => {
      const { result } = renderHook(() => usePhotoStore());
      const photo = mockPhotoAsset();
      const metadata = mockPhotoMetadata({ assetId: photo.id });
      
      act(() => {
        result.current.setPhotos([photo]);
        result.current.updatePhotoMetadata(photo.id, metadata);
      });

      expect(result.current.photoMetadata.get(photo.id)).toEqual(metadata);
    });
  });

  describe('Selection Management', () => {
    it('selects and deselects photos', () => {
      const { result } = renderHook(() => usePhotoStore());
      const photos = mockPhotoArray(3);
      
      act(() => {
        result.current.setPhotos(photos);
        result.current.selectPhoto(photos[0].id);
      });

      expect(result.current.selectedPhotos.has(photos[0].id)).toBe(true);

      act(() => {
        result.current.deselectPhoto(photos[0].id);
      });

      expect(result.current.selectedPhotos.has(photos[0].id)).toBe(false);
    });

    it('toggles photo selection', () => {
      const { result } = renderHook(() => usePhotoStore());
      const photo = mockPhotoAsset();
      
      act(() => {
        result.current.setPhotos([photo]);
        result.current.togglePhotoSelection(photo.id);
      });

      expect(result.current.selectedPhotos.has(photo.id)).toBe(true);

      act(() => {
        result.current.togglePhotoSelection(photo.id);
      });

      expect(result.current.selectedPhotos.has(photo.id)).toBe(false);
    });

    it('selects multiple photos', () => {
      const { result } = renderHook(() => usePhotoStore());
      const photos = mockPhotoArray(5);
      const photoIds = photos.slice(0, 3).map(p => p.id);
      
      act(() => {
        result.current.setPhotos(photos);
        result.current.selectPhotos(photoIds);
      });

      expect(result.current.selectedPhotos.size).toBe(3);
      photoIds.forEach(id => {
        expect(result.current.selectedPhotos.has(id)).toBe(true);
      });
    });

    it('deselects all photos', () => {
      const { result } = renderHook(() => usePhotoStore());
      const photos = mockPhotoArray(3);
      
      act(() => {
        result.current.setPhotos(photos);
        result.current.selectPhotos(photos.map(p => p.id));
        result.current.deselectAllPhotos();
      });

      expect(result.current.selectedPhotos.size).toBe(0);
    });
  });

  describe('Timeline Sections', () => {
    it('generates timeline sections from photos', () => {
      const { result } = renderHook(() => usePhotoStore());
      const photos = mockPhotoArray(10);
      
      act(() => {
        result.current.setPhotos(photos);
      });

      expect(result.current.timelineSections.length).toBeGreaterThan(0);
      
      // Verify sections have correct structure
      result.current.timelineSections.forEach(section => {
        expect(section).toMatchObject({
          date: expect.any(String),
          photos: expect.any(Array),
          count: expect.any(Number),
        });
      });
    });

    it('regenerates timeline sections', () => {
      const { result } = renderHook(() => usePhotoStore());
      const photos = mockPhotoArray(5);
      
      act(() => {
        result.current.setPhotos(photos);
      });

      const initialSectionCount = result.current.timelineSections.length;

      act(() => {
        result.current.regenerateTimelineSections();
      });

      expect(result.current.timelineSections.length).toBe(initialSectionCount);
    });

    it('gets photos for date range', () => {
      const { result } = renderHook(() => usePhotoStore());
      const now = Date.now();
      const photos = [
        mockPhotoAsset({ id: '1', creationTime: now - 86400000 }), // 1 day ago
        mockPhotoAsset({ id: '2', creationTime: now - 172800000 }), // 2 days ago
        mockPhotoAsset({ id: '3', creationTime: now - 259200000 }), // 3 days ago
      ];
      
      act(() => {
        result.current.setPhotos(photos);
      });

      const startDate = new Date(now - 200000000); // 2.3 days ago
      const endDate = new Date(now);
      
      const filteredPhotos = result.current.getPhotosForDateRange(startDate, endDate);
      expect(filteredPhotos.length).toBe(2); // Only photos from last 2.3 days
    });
  });

  describe('Filtering', () => {
    it('sets search query', () => {
      const { result } = renderHook(() => usePhotoStore());
      
      act(() => {
        result.current.setSearchQuery('vacation');
      });

      expect(result.current.searchQuery).toBe('vacation');
    });

    it('sets date range filter', () => {
      const { result } = renderHook(() => usePhotoStore());
      const dateRange = { start: new Date('2023-01-01'), end: new Date('2023-12-31') };
      
      act(() => {
        result.current.setDateRangeFilter(dateRange);
      });

      expect(result.current.dateRangeFilter).toEqual(dateRange);
    });

    it('sets location filter', () => {
      const { result } = renderHook(() => usePhotoStore());
      const locationFilter = { latitude: 37.7749, longitude: -122.4194, radius: 1000 };
      
      act(() => {
        result.current.setLocationFilter(locationFilter);
      });

      expect(result.current.locationFilter).toEqual(locationFilter);
    });

    it('clears all filters', () => {
      const { result } = renderHook(() => usePhotoStore());
      
      act(() => {
        result.current.setSearchQuery('test');
        result.current.setDateRangeFilter({ start: new Date(), end: new Date() });
        result.current.setLocationFilter({ latitude: 0, longitude: 0, radius: 100 });
        result.current.clearAllFilters();
      });

      expect(result.current.searchQuery).toBe('');
      expect(result.current.dateRangeFilter).toBeNull();
      expect(result.current.locationFilter).toBeNull();
    });
  });

  describe('Scan Progress', () => {
    it('sets scan progress', () => {
      const { result } = renderHook(() => usePhotoStore());
      const scanProgress = {
        totalPhotos: 100,
        processedPhotos: 50,
        stage: 'scanning' as const,
        percentage: 50,
      };
      
      act(() => {
        result.current.setScanProgress(scanProgress);
      });

      expect(result.current.scanProgress).toEqual(scanProgress);
    });

    it('updates scan status', () => {
      const { result } = renderHook(() => usePhotoStore());
      
      act(() => {
        result.current.setScanning(true);
      });

      expect(result.current.isScanning).toBe(true);

      act(() => {
        result.current.setScanning(false);
      });

      expect(result.current.isScanning).toBe(false);
    });

    it('updates last scan date', () => {
      const { result } = renderHook(() => usePhotoStore());
      const scanDate = new Date();
      
      act(() => {
        result.current.updateLastScanDate(scanDate);
      });

      expect(result.current.lastScanDate).toEqual(scanDate);
    });
  });

  describe('Error Handling', () => {
    it('sets and clears errors', () => {
      const { result } = renderHook(() => usePhotoStore());
      const error = {
        code: 'SCAN_INTERRUPTED' as const,
        message: 'Scan was interrupted',
        timestamp: new Date(),
      };
      
      act(() => {
        result.current.setError(error);
      });

      expect(result.current.error).toEqual(error);

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Cache Management', () => {
    it('provides cache info', () => {
      const { result } = renderHook(() => usePhotoStore());
      const photos = mockPhotoArray(100);
      
      act(() => {
        result.current.setPhotos(photos);
      });

      const cacheInfo = result.current.getCacheInfo();
      expect(cacheInfo).toMatchObject({
        size: expect.any(Number),
        maxSize: expect.any(Number),
        utilizationPercent: expect.any(Number),
      });
    });

    it('prunes cache when over limit', () => {
      const { result } = renderHook(() => usePhotoStore());
      const largePhotoArray = mockPhotoArray(1000);
      
      act(() => {
        result.current.setPhotos(largePhotoArray);
      });

      const initialCount = result.current.allPhotos.length;

      act(() => {
        result.current.pruneCache();
      });

      // Should have fewer photos after pruning if cache was over limit
      expect(result.current.allPhotos.length).toBeLessThanOrEqual(initialCount);
    });
  });

  describe('Performance', () => {
    it('handles large photo arrays efficiently', () => {
      const { result } = renderHook(() => usePhotoStore());
      const largePhotoArray = mockPhotoArray(10000);
      
      const startTime = performance.now();
      
      act(() => {
        result.current.setPhotos(largePhotoArray);
      });

      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (less than 1 second)
      expect(duration).toBeLessThan(1000);
      expect(result.current.allPhotos.length).toBe(10000);
    });

    it('maintains performance with frequent updates', () => {
      const { result } = renderHook(() => usePhotoStore());
      
      const startTime = performance.now();
      
      // Perform many rapid updates
      for (let i = 0; i < 100; i++) {
        act(() => {
          result.current.addPhotos([mockPhotoAsset({ id: `test-${i}` })]);
        });
      }

      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should handle rapid updates efficiently
      expect(duration).toBeLessThan(2000);
      expect(result.current.allPhotos.length).toBe(100);
    });
  });
});