/**
 * PhotoGrid Component
 * High-performance photo grid using FlashList for large datasets (50,000+ photos)
 * Supports virtualization, progressive loading, and smooth scrolling
 */

import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  RefreshControl,
  Text,
} from 'react-native';
import { FlashList, ListRenderItem } from '@shopify/flash-list';
import { PhotoAsset } from '@/types';
import { colors, spacing, typography } from '@/config';
import { useUIStore, usePhotoStore } from '@/stores';
import PhotoThumbnail from './PhotoThumbnail';
import PhotoGridSkeleton from './PhotoGridSkeleton';

export interface PhotoGridProps {
  photos: PhotoAsset[];
  onPhotoPress?: (photo: PhotoAsset) => void;
  onPhotoLongPress?: (photo: PhotoAsset) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  numColumns?: number;
  itemSpacing?: number;
  showOverlay?: boolean;
  testID?: string;
  useSimpleLayout?: boolean; // Use View instead of FlashList for nested contexts
}

interface GridItem {
  type: 'photo' | 'skeleton' | 'error';
  photo?: PhotoAsset;
  id: string;
}

const { width: screenWidth } = Dimensions.get('window');

export const PhotoGrid: React.FC<PhotoGridProps> = ({
  photos,
  onPhotoPress,
  onPhotoLongPress,
  onRefresh,
  isRefreshing = false,
  numColumns: propNumColumns,
  itemSpacing = spacing.xs,
  showOverlay = true,
  testID,
  useSimpleLayout = false,
}) => {
  const flashListRef = useRef<FlashList<GridItem>>(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 });
  const [memoryPressure, setMemoryPressure] = useState(false);
  
  // State from stores
  const { 
    gridColumns: storeGridColumns, 
    isDarkMode,
    isSelectionMode,
  } = useUIStore();
  const { selectedPhotos } = usePhotoStore();
  const { isLoading, scanProgress } = usePhotoStore();

  // Calculate grid dimensions
  const numColumns = propNumColumns || storeGridColumns;
  const itemSize = useMemo(() => {
    const totalSpacing = (numColumns + 1) * itemSpacing;
    return Math.floor((screenWidth - totalSpacing) / numColumns);
  }, [numColumns, itemSpacing]);

  // Prepare grid data with skeletons during loading
  const gridData = useMemo<GridItem[]>(() => {
    if (isLoading && photos.length === 0) {
      // Show skeleton items during initial load
      const skeletonCount = 20; // Show 20 skeleton items
      return Array.from({ length: skeletonCount }, (_, index) => ({
        type: 'skeleton' as const,
        id: `skeleton-${index}`,
      }));
    }

    return photos.map(photo => ({
      type: 'photo' as const,
      photo,
      id: photo.id,
    }));
  }, [photos, isLoading]);

  // Handle photo selection
  const handlePhotoPress = useCallback((photo: PhotoAsset) => {
    if (isSelectionMode) {
      // Toggle selection in selection mode
      usePhotoStore.getState().togglePhotoSelection(photo.id);
    } else {
      onPhotoPress?.(photo);
    }
  }, [isSelectionMode, onPhotoPress]);

  const handlePhotoLongPress = useCallback((photo: PhotoAsset) => {
    if (!isSelectionMode) {
      // Enter selection mode and select the photo
      useUIStore.getState().enterSelectionMode();
      usePhotoStore.getState().selectPhoto(photo.id);
    }
    onPhotoLongPress?.(photo);
  }, [isSelectionMode, onPhotoLongPress]);

  // FlashList render item
  const renderItem: ListRenderItem<GridItem> = useCallback(({ item, index }) => {
    if (item.type === 'skeleton') {
      return (
        <PhotoGridSkeleton
          size={itemSize}
          isDarkMode={isDarkMode}
        />
      );
    }

    if (item.type === 'photo' && item.photo) {
      const isSelected = selectedPhotos?.has(item.photo.id) ?? false;
      
      return (
        <PhotoThumbnail
          photo={item.photo}
          size={itemSize}
          onPress={handlePhotoPress}
          onLongPress={handlePhotoLongPress}
          isSelected={isSelected}
          showOverlay={showOverlay}
          priority={
            index < 20 ? 'high' : 
            (index >= visibleRange.start - 10 && index <= visibleRange.end + 10) ? 'normal' : 'low'
          }
          testID={`photo-thumbnail-${item.photo.id}`}
        />
      );
    }

    return null;
  }, [
    itemSize,
    isDarkMode,
    selectedPhotos,
    handlePhotoPress,
    handlePhotoLongPress,
    showOverlay,
    visibleRange,
  ]);

  // Key extractor for FlashList
  const keyExtractor = useCallback((item: GridItem) => item.id, []);

  // Estimated item size for FlashList optimization
  const getItemType = useCallback((item: GridItem) => {
    return item.type;
  }, []);

  // Handle scroll events for performance monitoring
  const handleScroll = useCallback((event: any) => {
    const currentOffset = event.nativeEvent.contentOffset.y;
    setScrollPosition(currentOffset);
  }, []);

  // Handle viewability changes for intelligent preloading
  const handleViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const start = viewableItems[0].index || 0;
      const end = viewableItems[viewableItems.length - 1].index || 0;
      setVisibleRange({ start, end });
    }
  }, []);

  const viewabilityConfigCallbackPairs = useRef([
    {
      viewabilityConfig: {
        itemVisiblePercentThreshold: 50,
        minimumViewTime: 100,
      },
      onViewableItemsChanged: handleViewableItemsChanged,
    },
  ]);

  // Memory pressure monitoring
  useEffect(() => {
    // Simple memory pressure detection based on dataset size
    const isLargeDataset = photos.length > 10000;
    const shouldReduceQuality = isLargeDataset && scrollPosition > 0;
    setMemoryPressure(shouldReduceQuality);
  }, [photos.length, scrollPosition]);

  // Handle scroll to top
  const scrollToTop = useCallback(() => {
    flashListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  // Empty state component
  const renderEmptyState = useCallback(() => {
    if (isLoading) {
      return null; // Skeleton items are shown in the grid
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={[
          styles.emptyTitle,
          { color: isDarkMode ? colors.neutral[300] : colors.neutral[600] }
        ]}>
          No Photos Found
        </Text>
        <Text style={[
          styles.emptySubtitle,
          { color: isDarkMode ? colors.neutral[400] : colors.neutral[500] }
        ]}>
          {photos.length === 0 
            ? "Start by scanning your photo library to see your photos here."
            : "Try adjusting your filters or search criteria."
          }
        </Text>
      </View>
    );
  }, [isLoading, isDarkMode, photos.length]);

  // Header component with scan progress
  const renderHeader = useCallback(() => {
    if (!scanProgress || scanProgress.stage === 'complete') {
      return null;
    }

    return (
      <View style={[
        styles.progressContainer,
        { backgroundColor: isDarkMode ? colors.neutral[800] : colors.neutral[100] }
      ]}>
        <Text style={[
          styles.progressTitle,
          { color: isDarkMode ? colors.neutral[200] : colors.neutral[700] }
        ]}>
          {scanProgress.stage === 'scanning' ? 'Scanning Photos...' : 'Processing Photos...'}
        </Text>
        <View style={styles.progressBarContainer}>
          <View 
            style={[
              styles.progressBar,
              { 
                width: `${scanProgress.percentage}%`,
                backgroundColor: colors.primary[500],
              }
            ]} 
          />
        </View>
        <Text style={[
          styles.progressText,
          { color: isDarkMode ? colors.neutral[400] : colors.neutral[600] }
        ]}>
          {scanProgress.processedPhotos} of {scanProgress.totalPhotos} photos
        </Text>
      </View>
    );
  }, [scanProgress, isDarkMode]);

  // Refresh control
  const refreshControl = useMemo(() => (
    <RefreshControl
      refreshing={isRefreshing}
      onRefresh={onRefresh}
      tintColor={colors.primary[500]}
      colors={[colors.primary[500]]}
    />
  ), [isRefreshing, onRefresh]);

  // Performance optimization: estimated item size
  const estimatedItemSize = itemSize + itemSpacing;

  // Simple layout for nested contexts (avoids FlashList nesting issues)
  if (useSimpleLayout) {
    return (
      <View style={styles.container} testID={testID}>
        <View style={[styles.simpleGrid, { gap: itemSpacing }]}>
          {photos.map((photo) => (
            <PhotoThumbnail
              key={photo.id}
              photo={photo}
              size={itemSize}
              onPress={onPhotoPress}
              onLongPress={onPhotoLongPress}
              isSelected={selectedPhotos?.has(photo.id) ?? false}
              showOverlay={showOverlay}
              priority="normal"
              testID={`photo-${photo.id}`}
            />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container} testID={testID}>
      <FlashList
        ref={flashListRef}
        data={gridData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemType={getItemType}
        numColumns={numColumns}
        estimatedItemSize={estimatedItemSize}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={refreshControl}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={true}
        
        // Advanced Performance Optimizations for Large Datasets
        removeClippedSubviews={true}
        initialNumToRender={20} // Render initial visible items
        updateCellsBatchingPeriod={50} // Batch updates for performance
        
        // Memory Management
        getItemLayout={undefined} // Let FlashList handle dynamic sizing
        overrideItemLayout={(layout, item, index) => {
          // Dynamic sizing optimization for photos vs skeletons
          if (item.type === 'skeleton') {
            layout.size = estimatedItemSize;
          } else {
            // Actual photo items might need different sizing
            layout.size = estimatedItemSize;
          }
        }}
        
        // Viewport optimization with callback pairs
        viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs.current}
        
        // Cache optimization for large datasets
        recycleItems={true} // Enable item recycling for memory efficiency
        
        // Dynamic performance adjustments based on memory pressure
        windowSize={memoryPressure ? 5 : 10}
        maxToRenderPerBatch={memoryPressure ? 5 : 10}
        
        // Accessibility
        accessible={true}
        accessibilityLabel={`Photo grid with ${photos.length} photos`}
        accessibilityHint="Double tap a photo to open it, or long press to select"
      />

      {/* Scroll to top indicator */}
      {scrollPosition > 1000 && (
        <View style={styles.scrollTopContainer}>
          <Text 
            style={styles.scrollTopText}
            onPress={scrollToTop}
            accessible={true}
            accessibilityLabel="Scroll to top"
            accessibilityRole="button"
          >
            ↑ Top
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  contentContainer: {
    padding: spacing.xs,
  },
  
  progressContainer: {
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: 8,
    marginHorizontal: spacing.xs,
  },
  
  progressTitle: {
    ...typography.styles.h4,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  
  progressBarContainer: {
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 2,
    marginBottom: spacing.xs,
  },
  
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  
  progressText: {
    ...typography.styles.caption,
  },
  
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl * 2,
  },
  
  emptyTitle: {
    ...typography.styles.h3,
    fontWeight: '600',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  
  emptySubtitle: {
    ...typography.styles.body,
    textAlign: 'center',
    lineHeight: 20,
  },
  
  scrollTopContainer: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.primary[500],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  
  scrollTopText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },

  simpleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
});

export default PhotoGrid;