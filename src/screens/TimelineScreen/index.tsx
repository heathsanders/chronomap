/**
 * TimelineScreen
 * Main screen displaying photos organized by timeline using TimelineEngine
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { StackNavigationProp } from '@react-navigation/stack';

import { RootStackParamList, DateSection, TimelinePosition, TimelineGrouping } from '@/types';
import { colors } from '@/config/colors';
import { spacing } from '@/config/spacing';
import { typography } from '@/config/typography';
import { 
  PhotoGrid, 
  DateSectionHeader, 
  DateNavigator, 
  DateScrubber, 
  TimelineScreenSkeleton,
  PhotoGridSkeleton
} from '@/components/timeline';
import { useTimeline } from '@/hooks/useTimeline';
import { initializePhotosOnStartup, refreshPhotosInStore } from '@/utils/photoLoader';

type TimelineScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'Timeline'>;
};

const { width: screenWidth } = Dimensions.get('window');

export default function TimelineScreen({ navigation }: TimelineScreenProps) {
  const flashListRef = useRef<FlashList<DateSection>>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  // Local state
  const [currentGrouping, setCurrentGrouping] = useState<TimelineGrouping>('daily');
  const [showDateNavigator, setShowDateNavigator] = useState(false);
  const [showDateScrubber, setShowDateScrubber] = useState(true);
  const [currentScrollPosition, setCurrentScrollPosition] = useState(0);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [isScrolling, setIsScrolling] = useState(false);

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
    grouping: currentGrouping,
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
   * Handle grouping changes
   */
  const handleGroupingChange = useCallback(async (grouping: TimelineGrouping) => {
    if (grouping !== currentGrouping) {
      setCurrentGrouping(grouping);
      await changeGrouping(grouping);
    }
  }, [currentGrouping, changeGrouping]);

  /**
   * Handle date navigation with smooth animation
   */
  const handleDateSelect = useCallback(async (date: Date) => {
    const position = await scrollToDate(date);
    if (position && flashListRef.current) {
      // Animate to the calculated position with smooth easing
      flashListRef.current.scrollToOffset({ 
        offset: position.scrollOffset, 
        animated: true 
      });
      
      // Update current date immediately for UI feedback
      setCurrentDate(date);
    }
    setShowDateNavigator(false);
  }, [scrollToDate]);

  /**
   * Handle date scrubber changes
   */
  const handleDateScrubberChange = useCallback(async (date: Date, sectionIndex: number) => {
    if (flashListRef.current && sectionIndex < sections.length) {
      // Smooth scroll to section
      flashListRef.current.scrollToIndex({
        index: sectionIndex,
        animated: true,
        viewPosition: 0.1, // Show section at top with small offset
      });
      
      setCurrentDate(date);
    }
  }, [sections]);

  /**
   * Handle section header press for expansion/collapse
   */
  const handleSectionHeaderPress = useCallback((section: DateSection) => {
    // For now, just scroll to the section
    const sectionIndex = sections.findIndex(s => s.date === section.date);
    if (sectionIndex >= 0 && flashListRef.current) {
      flashListRef.current.scrollToIndex({ 
        index: sectionIndex, 
        animated: true 
      });
    }
  }, [sections]);

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
   * Handle scroll position changes for position tracking with animations
   */
  const handleScroll = useCallback((event: any) => {
    const { contentOffset, velocity } = event.nativeEvent;
    const scrollOffset = contentOffset.y;
    
    // Update animated values for scroll effects
    scrollY.setValue(scrollOffset);
    setCurrentScrollPosition(scrollOffset);
    setIsScrolling(Math.abs(velocity?.y || 0) > 0.1);
    
    // Calculate current section based on scroll position
    let currentSectionIndex = 0;
    let currentSectionDate = new Date();
    
    if (sections.length > 0) {
      // Estimate which section is currently visible based on scroll position
      // This is a simplified calculation - in production you'd want more precise calculations
      const estimatedIndex = Math.floor(scrollOffset / 300); // Assuming ~300px per section
      currentSectionIndex = Math.min(Math.max(0, estimatedIndex), sections.length - 1);
      currentSectionDate = sections[currentSectionIndex]?.startDate || new Date();
    }
    
    setCurrentDate(currentSectionDate);
    
    // Create detailed position tracking
    const position: TimelinePosition = {
      sectionIndex: currentSectionIndex,
      photoIndex: 0,
      scrollOffset,
      date: currentSectionDate,
      timestamp: Date.now()
    };
    
    updatePosition(position);

    // Animate header based on scroll direction
    const scrollThreshold = 100;
    const headerOpacity = scrollOffset > scrollThreshold ? 0.95 : 1;
    const headerScale = scrollOffset > scrollThreshold ? 0.98 : 1;
    
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: headerOpacity,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: headerScale,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [updatePosition, scrollY, sections, fadeAnim, scaleAnim]);

  /**
   * Render empty state when no photos
   */
  const renderEmptyState = useCallback(() => (
    <ScrollView 
      contentContainerStyle={styles.emptyContainer}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    >
      <Text style={styles.emptyTitle}>No Photos Found</Text>
      <Text style={styles.emptyDescription}>
        If you just completed photo scanning, pull down to refresh the timeline.
        {'\n\n'}
        If you haven't scanned yet, ChronoMap will automatically scan for photos when you grant permission.
      </Text>
    </ScrollView>
  ), [isRefreshing, handleRefresh]);

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
   * Render enhanced timeline header with navigation and grouping controls
   */
  const renderHeader = useCallback(() => (
    <Animated.View 
      style={[
        styles.headerContainer,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        }
      ]}
    >
      <View style={styles.titleRow}>
        <View style={styles.titleContainer}>
          <Text style={styles.headerTitle}>Your Timeline</Text>
          <Text style={styles.headerSubtitle}>
            {metrics?.totalPhotos || 0} photos in {metrics?.totalSections || 0} {
              currentGrouping === 'daily' ? 'days' : 
              currentGrouping === 'weekly' ? 'weeks' : 
              currentGrouping === 'monthly' ? 'months' : 'years'
            }
          </Text>
          {metrics?.dateRange && (
            <Text style={styles.dateRangeText}>
              {metrics.dateRange.start.toLocaleDateString()} - {metrics.dateRange.end.toLocaleDateString()}
            </Text>
          )}
        </View>
        
        <TouchableOpacity
          style={styles.navigateButton}
          onPress={() => setShowDateNavigator(true)}
          accessibilityRole="button"
          accessibilityLabel="Open date navigator"
        >
          <Text style={styles.navigateButtonText}>📅</Text>
        </TouchableOpacity>
      </View>

      {/* Grouping Controls */}
      <View style={styles.groupingContainer}>
        <Text style={styles.groupingLabel}>View by:</Text>
        <View style={styles.groupingButtons}>
          {(['daily', 'weekly', 'monthly'] as TimelineGrouping[]).map((grouping) => (
            <TouchableOpacity
              key={grouping}
              style={[
                styles.groupingButton,
                currentGrouping === grouping && styles.groupingButtonActive
              ]}
              onPress={() => handleGroupingChange(grouping)}
              accessibilityRole="button"
              accessibilityLabel={`${grouping} grouping`}
              accessibilityState={{ selected: currentGrouping === grouping }}
            >
              <Text style={[
                styles.groupingButtonText,
                currentGrouping === grouping && styles.groupingButtonTextActive
              ]}>
                {grouping.charAt(0).toUpperCase() + grouping.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Current Position Indicator */}
      {isScrolling && (
        <Animated.View 
          style={[
            styles.positionIndicator,
            {
              opacity: scrollY.interpolate({
                inputRange: [0, 50, 100],
                outputRange: [0, 0.8, 1],
                extrapolate: 'clamp',
              }),
            }
          ]}
        >
          <Text style={styles.positionText}>
            {currentDate.toLocaleDateString('en', { 
              weekday: 'short', 
              month: 'short', 
              day: 'numeric',
              year: 'numeric'
            })}
          </Text>
        </Animated.View>
      )}
    </Animated.View>
  ), [metrics, currentGrouping, handleGroupingChange, fadeAnim, scaleAnim, isScrolling, currentDate, scrollY]);

  /**
   * Render individual timeline section with enhanced header
   */
  const renderSection = useCallback(({ item: section, index }: { item: DateSection; index: number }) => (
    <View style={styles.dateSection} key={`section-${section.date}-${index}`}>
      <DateSectionHeader
        section={section}
        currentGrouping={currentGrouping}
        showPhotoCount={true}
        onHeaderPress={handleSectionHeaderPress}
        testID={`section-header-${index}`}
      />
      <PhotoGrid
        photos={section.photos}
        onPhotoPress={handlePhotoPress}
        testID={`photo-grid-${index}`}
        useSimpleLayout={true}
      />
    </View>
  ), [handlePhotoPress, currentGrouping, handleSectionHeaderPress]);

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

  // Show loading state with skeleton
  if (isLoading && sections.length === 0) {
    return (
      <TimelineScreenSkeleton 
        isDarkMode={false}
        sectionCount={6}
        photosPerSection={9}
      />
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
      
      {/* Date Scrubber */}
      {showDateScrubber && sections.length > 0 && (
        <DateScrubber
          sections={sections}
          metrics={metrics}
          currentDate={currentDate}
          onDateChange={handleDateScrubberChange}
          width={screenWidth}
          visible={showDateScrubber}
          testID="date-scrubber"
        />
      )}
      
      {/* Date Navigator Modal */}
      <DateNavigator
        visible={showDateNavigator}
        sections={sections}
        metrics={metrics}
        currentDate={currentDate}
        onDateSelect={handleDateSelect}
        onClose={() => setShowDateNavigator(false)}
        testID="date-navigator"
      />
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
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  titleContainer: {
    flex: 1,
  },
  headerTitle: {
    ...typography.styles.h2,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    ...typography.styles.body,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  dateRangeText: {
    ...typography.styles.caption,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  navigateButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.md,
  },
  navigateButtonText: {
    fontSize: 20,
  },
  groupingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  groupingLabel: {
    ...typography.styles.caption,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  groupingButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  groupingButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  groupingButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  groupingButtonText: {
    ...typography.styles.caption,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  groupingButtonTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  positionIndicator: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginTop: spacing.sm,
    alignSelf: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  positionText: {
    ...typography.styles.caption,
    color: colors.white,
    fontWeight: '600',
    fontSize: 12,
  },
  dateSection: {
    marginBottom: spacing.sm,
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
    minHeight: 400, // Ensure enough height for pull-to-refresh
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