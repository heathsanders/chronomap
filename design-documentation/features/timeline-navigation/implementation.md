---
title: Timeline Navigation Implementation Guide
description: Developer-focused implementation specifications for React Native timeline navigation
feature: timeline-navigation
last-updated: 2025-01-21
version: 1.0.0
related-files: 
  - ./README.md
  - ./screen-states.md
  - ../../design-system/components/README.md
dependencies:
  - React Native
  - React Native Gesture Handler
  - React Native Fast Image
  - Expo MediaLibrary
status: approved
---

# Timeline Navigation Implementation Guide

## Overview
This guide provides comprehensive implementation specifications for the Timeline Navigation feature, including React Native component structure, performance optimization techniques, and integration patterns for smooth photo browsing experiences.

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Component Structure](#component-structure)
3. [Performance Optimization](#performance-optimization)
4. [State Management](#state-management)
5. [Gesture Handling](#gesture-handling)
6. [Accessibility Implementation](#accessibility-implementation)
7. [Platform-Specific Considerations](#platform-specific-considerations)

---

## Architecture Overview

### Core Components Hierarchy
```
TimelineScreen
├── TimelineHeader
│   ├── ViewToggle
│   ├── DatePicker
│   └── PrivacyIndicator
├── TimelineScrollView
│   ├── DateSectionHeader
│   ├── PhotoGrid
│   │   └── PhotoCard[]
│   └── LoadingIndicator
└── MultiSelectControls (conditional)
```

### Data Flow Architecture
```
MediaLibrary → PhotoProcessor → LocalDatabase → TimelineState → UI Components
```

### Performance Targets
- **Scroll Performance**: 60fps with 10,000+ photos
- **Memory Usage**: <200MB for timeline navigation
- **Initial Load**: <3 seconds for 1,000 photos
- **Photo Loading**: <500ms for visible thumbnails

---

## Component Structure

### TimelineScreen (Main Container)

```jsx
import React, { useEffect, useState, useCallback } from 'react';
import { SafeAreaView, StatusBar } from 'react-native';
import { usePhotoLibrary } from '../hooks/usePhotoLibrary';
import { useTimelineState } from '../hooks/useTimelineState';

const TimelineScreen = () => {
  const { photos, isLoading, error } = usePhotoLibrary();
  const { 
    currentDate, 
    visiblePhotos, 
    setCurrentDate,
    handleScroll 
  } = useTimelineState(photos);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7FAFC" />
      
      <TimelineHeader 
        currentDate={currentDate}
        onDateChange={setCurrentDate}
      />
      
      <TimelineScrollView
        photos={visiblePhotos}
        onScroll={handleScroll}
        isLoading={isLoading}
        error={error}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC', // Neutral-50
  },
});
```

### TimelineScrollView (Optimized Photo List)

```jsx
import React, { useCallback, useMemo } from 'react';
import { FlatList, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';

const TimelineScrollView = ({ 
  photos, 
  onScroll, 
  isLoading, 
  error 
}) => {
  // Group photos by date for section headers
  const photoSections = useMemo(() => {
    return groupPhotosByDate(photos);
  }, [photos]);

  const renderItem = useCallback(({ item, index }) => {
    if (item.type === 'header') {
      return <DateSectionHeader date={item.date} count={item.count} />;
    }
    
    return (
      <PhotoCard
        photo={item}
        index={index}
        onPress={() => handlePhotoPress(item)}
        onLongPress={() => handlePhotoLongPress(item)}
      />
    );
  }, []);

  const getItemLayout = useCallback((data, index) => {
    const PHOTO_SIZE = 180; // Based on 2-column grid
    const HEADER_HEIGHT = 44;
    
    // Calculate layout based on item type and position
    return calculateItemLayout(data, index, PHOTO_SIZE, HEADER_HEIGHT);
  }, []);

  return (
    <FlashList
      data={photoSections}
      renderItem={renderItem}
      getItemLayout={getItemLayout}
      onScroll={onScroll}
      numColumns={2}
      estimatedItemSize={180}
      removeClippedSubviews
      maxToRenderPerBatch={20}
      windowSize={10}
      initialNumToRender={15}
      maintainVisibleContentPosition={{
        minIndexForVisible: 0,
        autoscrollToTopThreshold: 100,
      }}
      showsVerticalScrollIndicator={false}
      style={styles.scrollView}
    />
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
});
```

### PhotoCard (Optimized Photo Display)

```jsx
import React, { memo, useState } from 'react';
import { Pressable, View, Text } from 'react-native';
import FastImage from 'react-native-fast-image';
import { usePhotoSelection } from '../hooks/usePhotoSelection';

const PhotoCard = memo(({ 
  photo, 
  index, 
  onPress, 
  onLongPress 
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const { isSelected } = usePhotoSelection(photo.id);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  const handlePress = useCallback(() => {
    if (isSelectionMode) {
      toggleSelection(photo.id);
    } else {
      onPress(photo);
    }
  }, [photo, onPress, isSelectionMode]);

  return (
    <Pressable
      style={[
        styles.photoCard,
        isSelected && styles.selectedCard
      ]}
      onPress={handlePress}
      onLongPress={() => onLongPress(photo)}
      accessibilityRole="image"
      accessibilityLabel={`Photo taken on ${formatDate(photo.creationTime)}`}
      accessibilityState={{ selected: isSelected }}
    >
      <FastImage
        source={{ 
          uri: photo.uri,
          priority: FastImage.priority.normal,
        }}
        style={styles.photoImage}
        onLoad={handleLoad}
        onError={handleError}
        resizeMode={FastImage.resizeMode.cover}
      />
      
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <PhotoSkeleton />
        </View>
      )}
      
      {hasError && (
        <View style={styles.errorOverlay}>
          <ErrorPlaceholder onRetry={() => setHasError(false)} />
        </View>
      )}
      
      {isSelected && (
        <View style={styles.selectionOverlay}>
          <SelectionCheckmark />
        </View>
      )}
      
      {photo.location && (
        <View style={styles.locationBadge}>
          <Text style={styles.locationText}>
            {photo.location.city}
          </Text>
        </View>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  photoCard: {
    width: (SCREEN_WIDTH - 48) / 2, // 2 columns with padding
    aspectRatio: 1,
    borderRadius: 8,
    marginBottom: 2,
    backgroundColor: '#EDF2F7', // Neutral-100
    overflow: 'hidden',
  },
  selectedCard: {
    borderWidth: 3,
    borderColor: '#F56565', // Accent Primary
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#EDF2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F56565',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  locationText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '500',
  },
});
```

---

## Performance Optimization

### Image Loading Strategy

```jsx
// Efficient image caching and loading
import { ImageCache } from '../utils/ImageCache';

const useOptimizedImages = (photos) => {
  const [cachedPhotos, setCachedPhotos] = useState([]);

  useEffect(() => {
    const loadImages = async () => {
      const batchSize = 20;
      const batches = chunk(photos, batchSize);
      
      for (const batch of batches) {
        const cachedBatch = await Promise.all(
          batch.map(async (photo) => {
            const cachedUri = await ImageCache.get(photo.uri);
            return { ...photo, cachedUri };
          })
        );
        
        setCachedPhotos(prev => [...prev, ...cachedBatch]);
        
        // Allow UI to update between batches
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    };
    
    loadImages();
  }, [photos]);

  return cachedPhotos;
};

// Memory management for large libraries
const PhotoGrid = ({ photos }) => {
  const viewabilityConfig = useMemo(() => ({
    itemVisiblePercentThreshold: 10,
    minimumViewTime: 100,
  }), []);

  const onViewableItemsChanged = useCallback(({ viewableItems }) => {
    // Cleanup images that are no longer visible
    const visibleIds = viewableItems.map(item => item.key);
    ImageCache.cleanup(visibleIds);
  }, []);

  return (
    <FlashList
      // ... other props
      viewabilityConfig={viewabilityConfig}
      onViewableItemsChanged={onViewableItemsChanged}
    />
  );
};
```

### Scroll Performance Optimization

```jsx
// Optimized scroll handling with throttling
import { useSharedValue, useAnimatedScrollHandler } from 'react-native-reanimated';

const useTimelineScroll = () => {
  const scrollY = useSharedValue(0);
  const currentSection = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
      
      // Update current date section efficiently
      const sectionIndex = Math.floor(scrollY.value / SECTION_HEIGHT);
      if (sectionIndex !== currentSection.value) {
        currentSection.value = sectionIndex;
        runOnJS(updateCurrentDate)(sectionIndex);
      }
    },
  });

  return { scrollHandler, scrollY };
};

// Efficient date grouping with memoization
const usePhotoSections = (photos) => {
  return useMemo(() => {
    const sections = new Map();
    
    photos.forEach(photo => {
      const dateKey = format(photo.creationTime, 'yyyy-MM-dd');
      
      if (!sections.has(dateKey)) {
        sections.set(dateKey, {
          date: dateKey,
          photos: [],
          count: 0,
        });
      }
      
      sections.get(dateKey).photos.push(photo);
      sections.get(dateKey).count++;
    });
    
    return Array.from(sections.values()).sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    );
  }, [photos]);
};
```

---

## State Management

### Timeline State Hook

```jsx
import { useReducer, useCallback } from 'react';

const timelineReducer = (state, action) => {
  switch (action.type) {
    case 'SET_PHOTOS':
      return {
        ...state,
        photos: action.payload,
        isLoading: false,
      };
    
    case 'SET_CURRENT_DATE':
      return {
        ...state,
        currentDate: action.payload,
      };
    
    case 'TOGGLE_SELECTION_MODE':
      return {
        ...state,
        isSelectionMode: !state.isSelectionMode,
        selectedPhotos: state.isSelectionMode ? [] : state.selectedPhotos,
      };
    
    case 'SELECT_PHOTO':
      const isSelected = state.selectedPhotos.includes(action.payload);
      return {
        ...state,
        selectedPhotos: isSelected
          ? state.selectedPhotos.filter(id => id !== action.payload)
          : [...state.selectedPhotos, action.payload],
      };
    
    default:
      return state;
  }
};

const useTimelineState = (initialPhotos = []) => {
  const [state, dispatch] = useReducer(timelineReducer, {
    photos: initialPhotos,
    currentDate: new Date(),
    isSelectionMode: false,
    selectedPhotos: [],
    isLoading: true,
  });

  const setCurrentDate = useCallback((date) => {
    dispatch({ type: 'SET_CURRENT_DATE', payload: date });
  }, []);

  const toggleSelectionMode = useCallback(() => {
    dispatch({ type: 'TOGGLE_SELECTION_MODE' });
  }, []);

  const selectPhoto = useCallback((photoId) => {
    dispatch({ type: 'SELECT_PHOTO', payload: photoId });
  }, []);

  return {
    ...state,
    setCurrentDate,
    toggleSelectionMode,
    selectPhoto,
  };
};
```

### Photo Library Integration

```jsx
// Expo MediaLibrary integration with error handling
import * as MediaLibrary from 'expo-media-library';

const usePhotoLibrary = () => {
  const [photos, setPhotos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadPhotos = async () => {
      try {
        // Request permissions
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          throw new Error('Photo library permission denied');
        }

        // Load photos with metadata
        const albumInfo = await MediaLibrary.getAlbumAsync('All Photos');
        const { assets } = await MediaLibrary.getAssetsAsync({
          album: albumInfo,
          mediaType: 'photo',
          sortBy: [MediaLibrary.SortBy.creationTime],
          first: 10000, // Load in batches for large libraries
        });

        // Process and enhance photos with location data
        const enhancedPhotos = await Promise.all(
          assets.map(async (asset) => {
            const assetInfo = await MediaLibrary.getAssetInfoAsync(asset.id);
            return {
              ...asset,
              location: assetInfo.location,
              metadata: assetInfo.exif,
            };
          })
        );

        setPhotos(enhancedPhotos);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadPhotos();
  }, []);

  return { photos, isLoading, error };
};
```

---

## Gesture Handling

### Long Press Selection

```jsx
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

const PhotoCardWithGestures = ({ photo, onPress, onLongPress }) => {
  const tap = Gesture.Tap()
    .onEnd(() => {
      runOnJS(onPress)(photo);
    });

  const longPress = Gesture.LongPress()
    .minDuration(300)
    .onStart(() => {
      runOnJS(onLongPress)(photo);
    });

  const composed = Gesture.Simultaneous(tap, longPress);

  return (
    <GestureDetector gesture={composed}>
      <PhotoCard photo={photo} />
    </GestureDetector>
  );
};
```

### Scroll-Based Date Updates

```jsx
// Smooth date context updates during scroll
const useDateFromScroll = (sections, scrollY) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const updateDate = () => {
      const currentScrollPosition = scrollY.value;
      const sectionIndex = findSectionAtPosition(sections, currentScrollPosition);
      
      if (sectionIndex >= 0 && sections[sectionIndex]) {
        const newDate = new Date(sections[sectionIndex].date);
        setCurrentDate(newDate);
      }
    };

    const interval = setInterval(updateDate, 100); // Update 10 times per second
    return () => clearInterval(interval);
  }, [sections, scrollY]);

  return currentDate;
};
```

---

## Accessibility Implementation

### Screen Reader Support

```jsx
const AccessiblePhotoCard = ({ photo, index, totalCount }) => {
  const accessibilityLabel = useMemo(() => {
    const parts = [
      `Photo ${index + 1} of ${totalCount}`,
      `taken on ${formatDate(photo.creationTime)}`,
    ];

    if (photo.location) {
      parts.push(`at ${photo.location.city || 'unknown location'}`);
    }

    return parts.join(', ');
  }, [photo, index, totalCount]);

  return (
    <Pressable
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      accessibilityActions={[
        { name: 'select', label: 'Select photo' },
        { name: 'view', label: 'View full size' },
      ]}
      onAccessibilityAction={(event) => {
        switch (event.nativeEvent.actionName) {
          case 'select':
            toggleSelection(photo.id);
            break;
          case 'view':
            openPhotoDetail(photo);
            break;
        }
      }}
    >
      <PhotoCard photo={photo} />
    </Pressable>
  );
};
```

### Keyboard Navigation

```jsx
// Support for external keyboard navigation
import { useFocusEffect } from '@react-navigation/native';

const TimelineScreen = () => {
  const [focusedIndex, setFocusedIndex] = useState(0);

  useFocusEffect(
    useCallback(() => {
      const handleKeyPress = (event) => {
        switch (event.key) {
          case 'ArrowDown':
            setFocusedIndex(prev => Math.min(prev + 2, photos.length - 1));
            break;
          case 'ArrowUp':
            setFocusedIndex(prev => Math.max(prev - 2, 0));
            break;
          case 'ArrowRight':
            setFocusedIndex(prev => Math.min(prev + 1, photos.length - 1));
            break;
          case 'ArrowLeft':
            setFocusedIndex(prev => Math.max(prev - 1, 0));
            break;
          case 'Enter':
          case ' ':
            openPhoto(photos[focusedIndex]);
            break;
        }
      };

      // Add keyboard event listener (platform-specific implementation)
      const subscription = addKeyboardListener(handleKeyPress);
      return () => subscription.remove();
    }, [photos, focusedIndex])
  );

  // ... rest of component
};
```

---

## Platform-Specific Considerations

### iOS Implementation

```jsx
// iOS-specific optimizations
import { NativeModules, Platform } from 'react-native';

const IOSOptimizations = {
  // Use iOS-specific photo access APIs
  async requestPhotoPermissions() {
    if (Platform.OS === 'ios') {
      const { PHPhotoLibrary } = NativeModules;
      return await PHPhotoLibrary.requestAuthorization();
    }
  },

  // Leverage iOS photo framework for better performance
  async loadPhotosWithPHAsset(count = 100) {
    if (Platform.OS === 'ios') {
      // Use native iOS PHAsset loading for better performance
      const { PhotoFramework } = NativeModules;
      return await PhotoFramework.fetchAssets({
        mediaType: 'image',
        sortDescriptors: [{ key: 'creationDate', ascending: false }],
        fetchLimit: count,
      });
    }
  },

  // iOS haptic feedback for interactions
  triggerSelectionFeedback() {
    if (Platform.OS === 'ios') {
      const { HapticFeedback } = NativeModules;
      HapticFeedback.impactOccurred('light');
    }
  },
};
```

### Android Implementation

```jsx
// Android-specific optimizations
const AndroidOptimizations = {
  // Handle Android scoped storage
  async requestStoragePermissions() {
    if (Platform.OS === 'android') {
      const { PermissionsAndroid } = require('react-native');
      return await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
      );
    }
  },

  // Use Android MediaStore API efficiently
  async loadPhotosWithMediaStore() {
    if (Platform.OS === 'android') {
      const { MediaStore } = NativeModules;
      return await MediaStore.queryImages({
        sortOrder: 'date_added DESC',
        limit: 1000,
      });
    }
  },

  // Android haptic feedback
  triggerSelectionFeedback() {
    if (Platform.OS === 'android') {
      const { Vibration } = require('react-native');
      Vibration.vibrate(50);
    }
  },
};
```

---

## Testing and Quality Assurance

### Performance Testing

```jsx
// Performance monitoring hook
const usePerformanceMonitor = (componentName) => {
  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      if (renderTime > 16) { // > 60fps threshold
        console.warn(`${componentName} render took ${renderTime}ms`);
      }
    };
  });
};

// Memory usage monitoring
const useMemoryMonitor = () => {
  useEffect(() => {
    const interval = setInterval(() => {
      if (__DEV__) {
        const memoryUsage = performance.memory?.usedJSHeapSize || 0;
        const memoryMB = memoryUsage / 1024 / 1024;
        
        if (memoryMB > 200) {
          console.warn(`High memory usage: ${memoryMB}MB`);
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);
};
```

### Component Testing

```jsx
// Jest testing for photo components
import { render, fireEvent } from '@testing-library/react-native';

describe('PhotoCard', () => {
  const mockPhoto = {
    id: '1',
    uri: 'file://test.jpg',
    creationTime: new Date('2024-01-01'),
    location: { city: 'San Francisco' },
  };

  it('renders photo correctly', () => {
    const { getByRole } = render(
      <PhotoCard photo={mockPhoto} onPress={jest.fn()} />
    );
    
    const image = getByRole('image');
    expect(image).toBeTruthy();
    expect(image.props.accessibilityLabel).toContain('Photo taken on');
  });

  it('handles press events', () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <PhotoCard photo={mockPhoto} onPress={onPress} />
    );
    
    fireEvent.press(getByRole('image'));
    expect(onPress).toHaveBeenCalledWith(mockPhoto);
  });

  it('shows selection state correctly', () => {
    const { getByRole, rerender } = render(
      <PhotoCard photo={mockPhoto} isSelected={false} />
    );
    
    rerender(<PhotoCard photo={mockPhoto} isSelected={true} />);
    
    const image = getByRole('image');
    expect(image.props.accessibilityState.selected).toBe(true);
  });
});
```

---

## Deployment Considerations

### Build Optimization

```javascript
// Metro bundler configuration for image optimization
module.exports = {
  resolver: {
    assetExts: ['png', 'jpg', 'jpeg', 'gif', 'webp'],
  },
  transformer: {
    // Enable image compression
    minifierConfig: {
      keep_fnames: true,
      mangle: {
        keep_fnames: true,
      },
    },
  },
};

// Flipper configuration for performance debugging
if (__DEV__) {
  import('flipper-plugin-react-native-performance').then(
    ({ default: ReactNativePerformance }) => {
      ReactNativePerformance.setupDefaultFlipperReactDevtools();
    }
  );
}
```

### Performance Monitoring

```jsx
// Production performance monitoring
import crashlytics from '@react-native-firebase/crashlytics';

const logPerformanceMetric = (metric, value) => {
  if (!__DEV__) {
    crashlytics().setAttribute(metric, value.toString());
  }
};

// Track timeline performance metrics
const useTimelineMetrics = () => {
  const trackScrollPerformance = useCallback((fps) => {
    if (fps < 50) {
      logPerformanceMetric('timeline_scroll_fps', fps);
    }
  }, []);

  const trackLoadTime = useCallback((photoCount, loadTime) => {
    logPerformanceMetric('timeline_load_time', loadTime);
    logPerformanceMetric('timeline_photo_count', photoCount);
  }, []);

  return { trackScrollPerformance, trackLoadTime };
};
```

---

## Related Documentation
- [Timeline Navigation Overview](./README.md)
- [Screen States Specifications](./screen-states.md)
- [Component Library](../../design-system/components/README.md)
- [Accessibility Guidelines](../../accessibility/guidelines.md)

## External Dependencies
- React Native 0.72+
- @shopify/flash-list for optimized lists
- react-native-fast-image for image performance
- react-native-gesture-handler for gestures
- expo-media-library for photo access

## Last Updated
January 21, 2025 - Complete implementation guide for timeline navigation with performance optimization