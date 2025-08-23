/**
 * TimelineScreen
 * Main screen displaying photos organized by timeline using TimelineEngine
 */

import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { StackNavigationProp } from '@react-navigation/stack';

import { RootStackParamList, DateSection, TimelinePosition } from '@/types';
import { colors } from '@/config/colors';
import { spacing } from '@/config/spacing';
import { PhotoGrid } from '@/components/timeline';
import { useTimeline } from '@/hooks/useTimeline';
import { initializePhotosOnStartup, refreshPhotosInStore } from '@/utils/photoLoader';

type TimelineScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'Timeline'>;
};

export default function TimelineScreen({ navigation }: TimelineScreenProps) {
  const flashListRef = useRef<FlashList<DateSection>>(null);

  // Use the timeline hook for enhanced timeline functionality
  const {
    sections,
    metrics,
    isLoading,
    isRefreshing,
    error,
    refreshTimeline,
    updatePosition,
    scrollToDate,
    changeGrouping
  } = useTimeline({
    grouping: 'daily',
    enablePreloading: true,
    cacheEnabled: true,
    sliceSize: 50
  });

  // Initialize photos on component mount
  React.useEffect(() => {
    const initializePhotos = async () => {
      try {
        await initializePhotosOnStartup();
      } catch (initError) {
        console.error('Error initializing photos on startup:', initError);
      }
    };
    
    initializePhotos();
  }, []);

  /**
   * Handle photo press with navigation
   */
  const handlePhotoPress = useCallback((photo: any) => {
    // TODO: Navigate to photo detail view
    console.log('Photo pressed:', photo.filename);
    // navigation.navigate('PhotoDetail', { photoId: photo.id });
  }, []);

  /**
   * Handle pull-to-refresh by reloading photos from database
   */
  const handleRefresh = useCallback(async () => {
    try {
      console.log('Refreshing photos from database...');
      await refreshPhotosInStore();
      await refreshTimeline();
    } catch (refreshError) {
      console.error('Error refreshing photos:', refreshError);
    }
  }, [refreshTimeline]);

  /**
   * Handle scroll position changes for position tracking
   */
  const handleScroll = useCallback((event: any) => {
    const { contentOffset } = event.nativeEvent;
    
    // Update position tracking (simplified - in production would calculate exact section/photo)
    const position: TimelinePosition = {
      sectionIndex: 0, // Would calculate based on scroll position
      photoIndex: 0,
      scrollOffset: contentOffset.y,
      date: new Date(),
      timestamp: Date.now()
    };
    
    updatePosition(position);
  }, [updatePosition]);

  /**
   * Render empty state when no photos
   */
  const renderEmptyState = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>No Photos Found</Text>
      <Text style={styles.emptyDescription}>
        If you just completed photo scanning, pull down to refresh the timeline.
        {'\n\n'}
        If you haven't scanned yet, ChronoMap will automatically scan for photos when you grant permission.
      </Text>
    </View>
  ), []);

  /**
   * Render loading state
   */
  const renderLoadingState = useCallback(() => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingText}>Loading your timeline...</Text>
    </View>
  ), []);

  /**
   * Render error state
   */
  const renderErrorState = useCallback(() => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorDescription}>
        {error?.message || 'An unexpected error occurred'}
      </Text>
    </View>
  ), [error]);

  /**
   * Render timeline header with metrics
   */
  const renderHeader = useCallback(() => (
    <View style={styles.headerContainer}>
      <Text style={styles.headerTitle}>Your Timeline</Text>
      <Text style={styles.headerSubtitle}>
        {metrics?.totalPhotos || 0} photos in {metrics?.totalSections || 0} days
      </Text>
      {metrics?.dateRange && (
        <Text style={styles.dateRangeText}>
          {metrics.dateRange.start.toLocaleDateString()} - {metrics.dateRange.end.toLocaleDateString()}
        </Text>
      )}
    </View>
  ), [metrics]);

  /**
   * Render individual timeline section
   */
  const renderSection = useCallback(({ item: section, index }: { item: DateSection; index: number }) => (
    <View style={styles.dateSection} key={`section-${section.date}-${index}`}>
      <View style={styles.sectionHeader}>
        <Text style={styles.dateHeader}>{section.displayDate}</Text>
        <Text style={styles.photoCount}>{section.count} photos</Text>
      </View>
      <PhotoGrid
        photos={section.photos}
        onPhotoPress={handlePhotoPress}
        testID={`photo-grid-${index}`}
        useSimpleLayout={true}
      />
    </View>
  ), [handlePhotoPress]);

  /**
   * Render main timeline content
   */
  const renderTimeline = useCallback(() => {
    if (sections.length === 0) {
      return renderEmptyState();
    }

    return (
      <FlashList
        ref={flashListRef}
        data={sections}
        renderItem={renderSection}
        keyExtractor={(item, index) => `timeline-section-${item.date}-${index}`}
        estimatedItemSize={300}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={renderHeader}
        showsVerticalScrollIndicator={true}
        contentContainerStyle={styles.listContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        removeClippedSubviews={true}
      />
    );
  }, [sections, renderSection, isRefreshing, refreshTimeline, renderHeader, handleScroll]);

  // Show loading state
  if (isLoading && sections.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        {renderLoadingState()}
      </SafeAreaView>
    );
  }

  // Show error state
  if (error && sections.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        {renderErrorState()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderTimeline()}
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  dateRangeText: {
    fontSize: 12,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  dateSection: {
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 8,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  dateHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  photoCount: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 300,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.error,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  errorDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 300,
  },
});