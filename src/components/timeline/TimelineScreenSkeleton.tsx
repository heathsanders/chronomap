/**
 * TimelineScreenSkeleton Component
 * Complete skeleton loading state for the timeline screen
 */

import React from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '@/config';
import { PhotoGridSkeleton } from './PhotoGridSkeleton';
import { DateSectionHeaderSkeleton } from './DateSectionHeaderSkeleton';

const { width: screenWidth } = Dimensions.get('window');

export interface TimelineScreenSkeletonProps {
  isDarkMode?: boolean;
  sectionCount?: number;
  photosPerSection?: number;
}

export const TimelineScreenSkeleton: React.FC<TimelineScreenSkeletonProps> = ({
  isDarkMode = false,
  sectionCount = 5,
  photosPerSection = 6,
}) => {
  // Calculate photo grid dimensions
  const photosPerRow = 3;
  const gridPadding = spacing.lg * 2;
  const photoSpacing = spacing.sm * 2;
  const photoSize = (screenWidth - gridPadding - photoSpacing) / photosPerRow;

  const renderPhotoGrid = (sectionIndex: number) => {
    const photos = [];
    for (let i = 0; i < photosPerSection; i++) {
      photos.push(
        <PhotoGridSkeleton
          key={`photo-${sectionIndex}-${i}`}
          size={photoSize}
          isDarkMode={isDarkMode}
          animationDelay={i * 100}
          showShimmer={i < 3} // Only first few photos show shimmer for performance
        />
      );
    }

    return (
      <View style={styles.photoGrid}>
        {photos}
      </View>
    );
  };

  const renderSection = (index: number) => (
    <View key={`skeleton-section-${index}`} style={styles.section}>
      <DateSectionHeaderSkeleton
        isDarkMode={isDarkMode}
        animationDelay={index * 200}
      />
      {renderPhotoGrid(index)}
    </View>
  );

  const sections = [];
  for (let i = 0; i < sectionCount; i++) {
    sections.push(renderSection(i));
  }

  return (
    <SafeAreaView style={[
      styles.container,
      { backgroundColor: isDarkMode ? colors.neutral[900] : colors.background }
    ]}>
      {/* Header Skeleton */}
      <View style={styles.headerContainer}>
        <View style={styles.headerContent}>
          {/* Title skeleton */}
          <View 
            style={[
              styles.titleSkeleton,
              { backgroundColor: isDarkMode ? colors.neutral[800] : colors.neutral[200] }
            ]} 
          />
          
          {/* Subtitle skeleton */}
          <View 
            style={[
              styles.subtitleSkeleton,
              { backgroundColor: isDarkMode ? colors.neutral[700] : colors.neutral[300] }
            ]} 
          />

          {/* Date range skeleton */}
          <View 
            style={[
              styles.dateRangeSkeleton,
              { backgroundColor: isDarkMode ? colors.neutral[700] : colors.neutral[300] }
            ]} 
          />
        </View>

        {/* Navigation button skeleton */}
        <View 
          style={[
            styles.navButtonSkeleton,
            { backgroundColor: isDarkMode ? colors.neutral[800] : colors.neutral[200] }
          ]} 
        />
      </View>

      {/* Grouping controls skeleton */}
      <View style={styles.groupingContainer}>
        <View 
          style={[
            styles.groupingLabelSkeleton,
            { backgroundColor: isDarkMode ? colors.neutral[700] : colors.neutral[300] }
          ]} 
        />
        <View style={styles.groupingButtons}>
          {[1, 2, 3].map((item) => (
            <View
              key={`grouping-${item}`}
              style={[
                styles.groupingButtonSkeleton,
                { backgroundColor: isDarkMode ? colors.neutral[800] : colors.neutral[200] }
              ]}
            />
          ))}
        </View>
      </View>

      {/* Timeline Content */}
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {sections}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  headerContent: {
    flex: 1,
  },

  titleSkeleton: {
    height: 28,
    width: '60%',
    borderRadius: 6,
    marginBottom: spacing.xs,
  },

  subtitleSkeleton: {
    height: 16,
    width: '80%',
    borderRadius: 4,
    marginBottom: spacing.xs,
  },

  dateRangeSkeleton: {
    height: 14,
    width: '50%',
    borderRadius: 4,
  },

  navButtonSkeleton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginLeft: spacing.md,
  },

  groupingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  groupingLabelSkeleton: {
    height: 14,
    width: 60,
    borderRadius: 4,
  },

  groupingButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  groupingButtonSkeleton: {
    height: 32,
    width: 70,
    borderRadius: 16,
  },

  scrollView: {
    flex: 1,
  },

  section: {
    marginBottom: spacing.md,
  },

  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
});

export default TimelineScreenSkeleton;