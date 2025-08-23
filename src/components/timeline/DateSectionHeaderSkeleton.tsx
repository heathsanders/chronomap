/**
 * DateSectionHeaderSkeleton Component
 * Skeleton loading placeholder for date section headers
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors, spacing, typography } from '@/config';

export interface DateSectionHeaderSkeletonProps {
  isDarkMode?: boolean;
  animationDelay?: number;
}

export const DateSectionHeaderSkeleton: React.FC<DateSectionHeaderSkeletonProps> = ({
  isDarkMode = false,
  animationDelay = 0,
}) => {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.8,
          duration: 1200,
          useNativeDriver: true,
          delay: animationDelay,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );

    pulseAnimation.start();

    return () => {
      pulseAnimation.stop();
    };
  }, [pulseAnim, animationDelay]);

  const baseColor = isDarkMode ? colors.neutral[800] : colors.neutral[200];
  const highlightColor = isDarkMode ? colors.neutral[700] : colors.neutral[300];

  return (
    <View style={styles.container}>
      {/* Date text skeleton */}
      <Animated.View
        style={[
          styles.dateText,
          {
            backgroundColor: baseColor,
            opacity: pulseAnim,
          }
        ]}
      />

      {/* Photo count skeleton */}
      <Animated.View
        style={[
          styles.photoCount,
          {
            backgroundColor: highlightColor,
            opacity: pulseAnim,
          }
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  dateText: {
    height: 24,
    width: 120,
    borderRadius: 6,
  },

  photoCount: {
    height: 18,
    width: 60,
    borderRadius: 4,
  },
});

export default DateSectionHeaderSkeleton;