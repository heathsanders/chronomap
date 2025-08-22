/**
 * PhotoThumbnail Component
 * Optimized thumbnail component with progressive loading for large photo libraries
 * Supports lazy loading, error handling, and accessibility
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Text,
  PixelRatio,
  ImageStyle,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import { PhotoAsset } from '@/types';
import { colors, spacing, typography } from '@/config';
import { useSettingsStore, useUIStore } from '@/stores';

export interface PhotoThumbnailProps {
  photo: PhotoAsset;
  size: number;
  onPress?: (photo: PhotoAsset) => void;
  onLongPress?: (photo: PhotoAsset) => void;
  isSelected?: boolean;
  showOverlay?: boolean;
  showFileName?: boolean;
  showDate?: boolean;
  priority?: 'high' | 'normal' | 'low';
  testID?: string;
}

interface ThumbnailState {
  isLoading: boolean;
  hasError: boolean;
  isLoaded: boolean;
}

export const PhotoThumbnail: React.FC<PhotoThumbnailProps> = ({
  photo,
  size,
  onPress,
  onLongPress,
  isSelected = false,
  showOverlay = true,
  showFileName = false,
  showDate = false,
  priority = 'normal',
  testID,
}) => {
  const [thumbnailState, setThumbnailState] = useState<ThumbnailState>({
    isLoading: true,
    hasError: false,
    isLoaded: false,
  });

  const { accessibility } = useSettingsStore();
  const hapticFeedbackEnabled = accessibility.hapticFeedback;
  const { isDarkMode } = useUIStore();

  // Optimize image size for device pixel ratio
  const optimizedSize = useMemo(() => {
    const pixelRatio = PixelRatio.get();
    // Clamp pixel ratio between 1.5 and 3 to avoid excessive memory usage
    const clampedRatio = Math.min(Math.max(pixelRatio, 1.5), 3);
    return Math.round(size * clampedRatio);
  }, [size]);

  // Generate thumbnail URI with size optimization
  const thumbnailUri = useMemo(() => {
    // In a real implementation, this would generate optimized thumbnail URIs
    // For now, use the original URI with size parameters
    const baseUri = photo.uri;
    
    // Expo ImageManipulator or similar could be used to generate thumbnails
    // This is a placeholder for the actual thumbnail generation logic
    return `${baseUri}?width=${optimizedSize}&height=${optimizedSize}&quality=80`;
  }, [photo.uri, optimizedSize]);

  // FastImage priority mapping
  const imagePriority = useMemo(() => {
    switch (priority) {
      case 'high':
        return FastImage.priority.high;
      case 'low':
        return FastImage.priority.low;
      default:
        return FastImage.priority.normal;
    }
  }, [priority]);

  // Handle image loading states
  const handleLoadStart = useCallback(() => {
    setThumbnailState(prev => ({
      ...prev,
      isLoading: true,
      hasError: false,
    }));
  }, []);

  const handleLoadEnd = useCallback(() => {
    setThumbnailState(prev => ({
      ...prev,
      isLoading: false,
      isLoaded: true,
    }));
  }, []);

  const handleError = useCallback(() => {
    setThumbnailState(prev => ({
      ...prev,
      isLoading: false,
      hasError: true,
      isLoaded: false,
    }));
  }, []);

  // Handle press events with haptic feedback
  const handlePress = useCallback(() => {
    if (hapticFeedbackEnabled) {
      // Light impact for photo selection
      // HapticFeedback.impactAsync(HapticFeedback.ImpactFeedbackStyle.Light);
    }
    onPress?.(photo);
  }, [photo, onPress, hapticFeedbackEnabled]);

  const handleLongPress = useCallback(() => {
    if (hapticFeedbackEnabled) {
      // Medium impact for long press actions
      // HapticFeedback.impactAsync(HapticFeedback.ImpactFeedbackStyle.Medium);
    }
    onLongPress?.(photo);
  }, [photo, onLongPress, hapticFeedbackEnabled]);

  // Format date for display
  const formattedDate = useMemo(() => {
    if (!showDate) return null;
    const date = new Date(photo.creationTime);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, [photo.creationTime, showDate]);

  // Accessibility label
  const accessibilityLabel = useMemo(() => {
    let label = `Photo ${photo.filename}`;
    if (formattedDate) {
      label += `, taken on ${formattedDate}`;
    }
    if (isSelected) {
      label += ', selected';
    }
    if (photo.location) {
      label += ', has location data';
    }
    return label;
  }, [photo.filename, photo.location, formattedDate, isSelected]);

  // Dynamic styles based on state and theme
  const containerStyle = useMemo(() => [
    styles.container,
    {
      width: size,
      height: size,
      backgroundColor: isDarkMode ? colors.neutral[800] : colors.neutral[100],
    },
    isSelected && {
      borderColor: colors.primary[500],
      borderWidth: 3,
    },
  ], [size, isDarkMode, isSelected]);

  const overlayStyle = useMemo(() => [
    styles.overlay,
    {
      backgroundColor: isDarkMode 
        ? 'rgba(0, 0, 0, 0.7)' 
        : 'rgba(255, 255, 255, 0.9)',
    },
  ], [isDarkMode]);

  return (
    <Pressable
      style={containerStyle}
      onPress={handlePress}
      onLongPress={handleLongPress}
      accessible={true}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="imagebutton"
      testID={testID}
    >
      {/* Main image */}
      <FastImage
        source={{
          uri: thumbnailUri,
          priority: imagePriority,
        }}
        style={styles.image}
        resizeMode={FastImage.resizeMode.cover}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
      />

      {/* Loading skeleton */}
      {thumbnailState.isLoading && (
        <View style={[styles.skeleton, { backgroundColor: isDarkMode ? colors.neutral[700] : colors.neutral[200] }]}>
          <View style={[styles.skeletonPulse, { backgroundColor: isDarkMode ? colors.neutral[600] : colors.neutral[300] }]} />
        </View>
      )}

      {/* Error state */}
      {thumbnailState.hasError && (
        <View style={[styles.errorContainer, overlayStyle]}>
          <Text style={[styles.errorText, { color: isDarkMode ? colors.neutral[300] : colors.neutral[600] }]}>
            Failed to load
          </Text>
        </View>
      )}

      {/* Selection indicator */}
      {isSelected && (
        <View style={styles.selectionIndicator}>
          <View style={[styles.checkmark, { backgroundColor: colors.primary[500] }]}>
            <Text style={styles.checkmarkText}>✓</Text>
          </View>
        </View>
      )}

      {/* Video indicator */}
      {photo.mediaType === 'video' && (
        <View style={styles.videoIndicator}>
          <Text style={styles.videoText}>▶</Text>
        </View>
      )}

      {/* Overlay information */}
      {showOverlay && (showFileName || showDate) && (
        <View style={[styles.infoOverlay, overlayStyle]}>
          {showFileName && (
            <Text 
              style={[styles.filename, { color: isDarkMode ? colors.neutral[100] : colors.neutral[800] }]}
              numberOfLines={1}
              ellipsizeMode="middle"
            >
              {photo.filename}
            </Text>
          )}
          {showDate && (
            <Text style={[styles.date, { color: isDarkMode ? colors.neutral[300] : colors.neutral[600] }]}>
              {formattedDate}
            </Text>
          )}
        </View>
      )}

      {/* Location indicator */}
      {photo.location && (
        <View style={styles.locationIndicator}>
          <Text style={styles.locationText}>📍</Text>
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  
  image: {
    width: '100%',
    height: '100%',
  } as ImageStyle,
  
  skeleton: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  skeletonPulse: {
    width: '60%',
    height: '60%',
    borderRadius: 4,
    opacity: 0.7,
  },
  
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  errorText: {
    ...typography.styles.caption,
    textAlign: 'center',
    paddingHorizontal: spacing.xs,
  },
  
  selectionIndicator: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
  },
  
  checkmark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  checkmarkText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  videoIndicator: {
    position: 'absolute',
    bottom: spacing.xs,
    right: spacing.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  videoText: {
    color: 'white',
    fontSize: 10,
  },
  
  infoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs / 2,
  },
  
  filename: {
    ...typography.styles.caption,
    fontWeight: '500',
  },
  
  date: {
    ...typography.styles.caption,
    fontSize: 10,
  },
  
  locationIndicator: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
  },
  
  locationText: {
    fontSize: 12,
  },
});

export default PhotoThumbnail;