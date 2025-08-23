/**
 * DateSectionHeader Component
 * Enhanced header for timeline date sections with grouping controls and photo count
 * Supports different grouping modes and interactive controls
 */

import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { colors, spacing, typography } from '@/config';
import { DateSection, TimelineGrouping } from '@/types';

export interface DateSectionHeaderProps {
  section: DateSection;
  isSticky?: boolean;
  showPhotoCount?: boolean;
  showGroupingToggle?: boolean;
  currentGrouping?: TimelineGrouping;
  onGroupingChange?: (grouping: TimelineGrouping) => void;
  onHeaderPress?: (section: DateSection) => void;
  animatedValue?: Animated.Value;
  testID?: string;
}

export const DateSectionHeader: React.FC<DateSectionHeaderProps> = memo(({
  section,
  isSticky = false,
  showPhotoCount = true,
  showGroupingToggle = false,
  currentGrouping = 'daily',
  onGroupingChange,
  onHeaderPress,
  animatedValue,
  testID,
}) => {
  const handleHeaderPress = () => {
    onHeaderPress?.(section);
  };

  const handleGroupingPress = (grouping: TimelineGrouping) => {
    if (grouping !== currentGrouping) {
      onGroupingChange?.(grouping);
    }
  };

  const getGroupingButtonStyle = (grouping: TimelineGrouping) => [
    styles.groupingButton,
    currentGrouping === grouping && styles.groupingButtonActive,
  ];

  const getGroupingTextStyle = (grouping: TimelineGrouping) => [
    styles.groupingButtonText,
    currentGrouping === grouping && styles.groupingButtonTextActive,
  ];

  // Animated styles for sticky header
  const animatedStyle = animatedValue ? {
    opacity: animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0.9, 1],
    }),
    transform: [
      {
        scale: animatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: [0.95, 1],
        }),
      },
    ],
  } : {};

  return (
    <Animated.View
      style={[
        styles.container,
        isSticky && styles.stickyContainer,
        animatedStyle,
      ]}
      testID={testID}
    >
      <TouchableOpacity
        style={styles.headerContent}
        onPress={handleHeaderPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${section.displayDate}, ${section.count} photos`}
        accessibilityHint="Tap to expand or collapse section"
      >
        <View style={styles.titleContainer}>
          <Text style={styles.dateTitle} numberOfLines={1}>
            {section.displayDate}
          </Text>
          {showPhotoCount && (
            <Text style={styles.photoCount}>
              {section.count} {section.count === 1 ? 'photo' : 'photos'}
            </Text>
          )}
        </View>

        {/* Date range indicator for weekly/monthly groupings */}
        {section.grouping !== 'daily' && (
          <Text style={styles.dateRange}>
            {section.startDate.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric' 
            })} - {section.endDate.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric' 
            })}
          </Text>
        )}
      </TouchableOpacity>

      {/* Grouping toggle buttons */}
      {showGroupingToggle && (
        <View style={styles.groupingContainer}>
          <TouchableOpacity
            style={getGroupingButtonStyle('daily')}
            onPress={() => handleGroupingPress('daily')}
            accessibilityRole="button"
            accessibilityLabel="Daily grouping"
            accessibilityState={{ selected: currentGrouping === 'daily' }}
          >
            <Text style={getGroupingTextStyle('daily')}>Day</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={getGroupingButtonStyle('weekly')}
            onPress={() => handleGroupingPress('weekly')}
            accessibilityRole="button"
            accessibilityLabel="Weekly grouping"
            accessibilityState={{ selected: currentGrouping === 'weekly' }}
          >
            <Text style={getGroupingTextStyle('weekly')}>Week</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={getGroupingButtonStyle('monthly')}
            onPress={() => handleGroupingPress('monthly')}
            accessibilityRole="button"
            accessibilityLabel="Monthly grouping"
            accessibilityState={{ selected: currentGrouping === 'monthly' }}
          >
            <Text style={getGroupingTextStyle('monthly')}>Month</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Progress indicator for sections being loaded - future enhancement */}
      {/* {section.isLoading && (
        <View style={styles.loadingIndicator}>
          <View style={styles.loadingBar} />
        </View>
      )} */}
    </Animated.View>
  );
});

DateSectionHeader.displayName = 'DateSectionHeader';

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  
  stickyContainer: {
    backgroundColor: colors.background,
    marginHorizontal: 0,
    borderRadius: 0,
    elevation: 4,
    shadowOpacity: 0.15,
    shadowRadius: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  
  headerContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  
  dateTitle: {
    ...typography.styles.h3,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  
  photoCount: {
    ...typography.styles.caption,
    color: colors.textSecondary,
    fontWeight: '500',
    marginLeft: spacing.sm,
  },
  
  dateRange: {
    ...typography.styles.caption,
    color: colors.textTertiary,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  
  groupingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  
  groupingButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 60,
    alignItems: 'center',
  },
  
  groupingButtonActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
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
  
  loadingIndicator: {
    height: 2,
    backgroundColor: colors.neutral[200],
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: 1,
    overflow: 'hidden',
  },
  
  loadingBar: {
    height: '100%',
    backgroundColor: colors.primary[500],
    width: '100%',
    borderRadius: 1,
  },
});

export default DateSectionHeader;