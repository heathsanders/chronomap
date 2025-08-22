/**
 * PhotoGridSkeleton Component
 * Skeleton loading placeholder for photo grid items
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '@/config';

export interface PhotoGridSkeletonProps {
  size: number;
  isDarkMode?: boolean;
}

export const PhotoGridSkeleton: React.FC<PhotoGridSkeletonProps> = ({
  size,
  isDarkMode = false,
}) => {
  return (
    <View 
      style={[
        styles.container,
        {
          width: size,
          height: size,
          backgroundColor: isDarkMode ? colors.neutral[800] : colors.neutral[200],
        }
      ]}
    >
      <View 
        style={[
          styles.pulse,
          {
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  pulse: {
    width: '60%',
    height: '60%',
    borderRadius: 4,
    opacity: 0.7,
  },
});

export default PhotoGridSkeleton;