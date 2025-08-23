/**
 * PhotoGridSkeleton Component
 * Enhanced skeleton loading placeholder with smooth animations
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors, spacing } from '@/config';

export interface PhotoGridSkeletonProps {
  size: number;
  isDarkMode?: boolean;
  animationDelay?: number;
  showShimmer?: boolean;
}

export const PhotoGridSkeleton: React.FC<PhotoGridSkeletonProps> = ({
  size,
  isDarkMode = false,
  animationDelay = 0,
  showShimmer = true,
}) => {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;
  const shimmerAnim = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    // Pulse animation
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.8,
          duration: 1000,
          useNativeDriver: true,
          delay: animationDelay,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    // Shimmer animation
    const shimmerAnimation = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
        delay: animationDelay,
      })
    );

    pulseAnimation.start();
    if (showShimmer) {
      shimmerAnimation.start();
    }

    return () => {
      pulseAnimation.stop();
      shimmerAnimation.stop();
    };
  }, [pulseAnim, shimmerAnim, animationDelay, showShimmer]);

  const shimmerTranslateX = shimmerAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: [-size, size],
  });

  return (
    <View 
      style={[
        styles.container,
        {
          width: size,
          height: size,
        }
      ]}
    >
      <Animated.View 
        style={[
          styles.background,
          {
            opacity: pulseAnim,
            backgroundColor: isDarkMode ? colors.neutral[800] : colors.neutral[200],
          }
        ]} 
      />
      
      {showShimmer && (
        <View style={styles.shimmerContainer}>
          <Animated.View
            style={[
              styles.shimmer,
              {
                backgroundColor: isDarkMode ? colors.neutral[700] : colors.neutral[100],
                transform: [{ translateX: shimmerTranslateX }],
              }
            ]}
          />
        </View>
      )}
      
      {/* Photo icon placeholder */}
      <Animated.View 
        style={[
          styles.iconPlaceholder,
          {
            opacity: pulseAnim,
            backgroundColor: isDarkMode ? colors.neutral[700] : colors.neutral[300],
          }
        ]} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 8,
  },

  shimmerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 8,
    overflow: 'hidden',
  },

  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '30%',
    opacity: 0.5,
    transform: [{ skewX: '-20deg' }],
  },
  
  iconPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 4,
    zIndex: 1,
  },
});

export default PhotoGridSkeleton;