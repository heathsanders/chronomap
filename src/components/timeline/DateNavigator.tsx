/**
 * DateNavigator Component
 * Quick date navigation component with calendar picker and timeline scrubber
 * Allows users to jump to specific dates in their photo timeline
 */

import React, { memo, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';
import { colors, spacing, typography } from '@/config';
import { DateSection, TimelineMetrics } from '@/types';

export interface DateNavigatorProps {
  sections: DateSection[];
  metrics: TimelineMetrics | null;
  currentDate?: Date;
  onDateSelect: (date: Date) => void;
  onClose?: () => void;
  visible?: boolean;
  testID?: string;
}

interface YearMonth {
  year: number;
  month: number;
  sections: DateSection[];
  photoCount: number;
}

const { width: screenWidth } = Dimensions.get('window');
const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export const DateNavigator: React.FC<DateNavigatorProps> = memo(({
  sections,
  metrics,
  currentDate,
  onDateSelect,
  onClose,
  visible = false,
  testID,
}) => {
  const [selectedYear, setSelectedYear] = useState<number>(
    currentDate?.getFullYear() || new Date().getFullYear()
  );
  const [slideAnimation] = useState(new Animated.Value(0));

  // Group sections by year and month
  const yearMonthData = useMemo<YearMonth[]>(() => {
    const grouped = new Map<string, YearMonth>();
    
    sections.forEach(section => {
      const date = section.startDate;
      const year = date.getFullYear();
      const month = date.getMonth();
      const key = `${year}-${month}`;
      
      if (!grouped.has(key)) {
        grouped.set(key, {
          year,
          month,
          sections: [],
          photoCount: 0,
        });
      }
      
      const yearMonth = grouped.get(key)!;
      yearMonth.sections.push(section);
      yearMonth.photoCount += section.count;
    });
    
    return Array.from(grouped.values()).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
  }, [sections]);

  // Get available years
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    yearMonthData.forEach(ym => years.add(ym.year));
    return Array.from(years).sort((a, b) => b - a);
  }, [yearMonthData]);

  // Get months for selected year
  const monthsForYear = useMemo(() => {
    return yearMonthData.filter(ym => ym.year === selectedYear);
  }, [yearMonthData, selectedYear]);

  // Handle date selection
  const handleDateSelect = useCallback((date: Date) => {
    onDateSelect(date);
    onClose?.();
  }, [onDateSelect, onClose]);

  // Handle month selection
  const handleMonthSelect = useCallback((yearMonth: YearMonth) => {
    // Jump to the first section of this month
    if (yearMonth.sections.length > 0) {
      const firstSection = yearMonth.sections[0];
      handleDateSelect(firstSection.startDate);
    }
  }, [handleDateSelect]);

  // Handle year change
  const handleYearChange = useCallback((year: number) => {
    setSelectedYear(year);
    Animated.spring(slideAnimation, {
      toValue: 1,
      useNativeDriver: true,
    }).start(() => {
      slideAnimation.setValue(0);
    });
  }, [slideAnimation]);

  // Animation for modal appearance
  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnimation, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnimation]);

  const modalTransform = slideAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [300, 0],
  });

  const backdropOpacity = slideAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
  });

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
      testID={testID}
    >
      <Animated.View 
        style={[styles.backdrop, { opacity: backdropOpacity }]}
      >
        <TouchableOpacity 
          style={styles.backdropTouchable}
          onPress={onClose}
          activeOpacity={1}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.container,
          {
            transform: [{ translateY: modalTransform }],
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Jump to Date</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close date navigator"
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Timeline Overview */}
        {metrics && (
          <View style={styles.overview}>
            <Text style={styles.overviewText}>
              {metrics.totalPhotos} photos from{' '}
              {metrics.dateRange.start.toLocaleDateString()} to{' '}
              {metrics.dateRange.end.toLocaleDateString()}
            </Text>
          </View>
        )}

        {/* Year Selector */}
        <View style={styles.yearSelector}>
          <Text style={styles.sectionTitle}>Year</Text>
          <View style={styles.yearButtons}>
            {availableYears.map(year => (
              <TouchableOpacity
                key={year}
                style={[
                  styles.yearButton,
                  selectedYear === year && styles.yearButtonActive,
                ]}
                onPress={() => handleYearChange(year)}
                accessibilityRole="button"
                accessibilityLabel={`Year ${year}`}
                accessibilityState={{ selected: selectedYear === year }}
              >
                <Text
                  style={[
                    styles.yearButtonText,
                    selectedYear === year && styles.yearButtonTextActive,
                  ]}
                >
                  {year}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Month Grid */}
        <View style={styles.monthGrid}>
          <Text style={styles.sectionTitle}>
            {selectedYear} ({monthsForYear.length} months with photos)
          </Text>
          <View style={styles.monthContainer}>
            {monthsForYear.map(yearMonth => (
              <TouchableOpacity
                key={`${yearMonth.year}-${yearMonth.month}`}
                style={styles.monthButton}
                onPress={() => handleMonthSelect(yearMonth)}
                accessibilityRole="button"
                accessibilityLabel={`${MONTHS[yearMonth.month]} ${yearMonth.year}, ${yearMonth.photoCount} photos`}
              >
                <Text style={styles.monthName}>
                  {MONTHS[yearMonth.month]}
                </Text>
                <Text style={styles.monthPhotoCount}>
                  {yearMonth.photoCount}
                </Text>
                <View style={[
                  styles.monthIndicator,
                  {
                    height: Math.min(
                      Math.max(yearMonth.photoCount / 10, 2),
                      20
                    ),
                  }
                ]} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickButton}
            onPress={() => handleDateSelect(new Date())}
            accessibilityRole="button"
            accessibilityLabel="Go to today"
          >
            <Text style={styles.quickButtonText}>Today</Text>
          </TouchableOpacity>
          
          {metrics?.dateRange && (
            <>
              <TouchableOpacity
                style={styles.quickButton}
                onPress={() => handleDateSelect(metrics.dateRange.start)}
                accessibilityRole="button"
                accessibilityLabel="Go to first photo"
              >
                <Text style={styles.quickButtonText}>First Photo</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.quickButton}
                onPress={() => handleDateSelect(metrics.dateRange.end)}
                accessibilityRole="button"
                accessibilityLabel="Go to latest photo"
              >
                <Text style={styles.quickButtonText}>Latest</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Animated.View>
    </Modal>
  );
});

DateNavigator.displayName = 'DateNavigator';

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
  },
  
  backdropTouchable: {
    flex: 1,
  },
  
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  
  title: {
    ...typography.styles.h3,
    fontWeight: '600',
    color: colors.text,
  },
  
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.neutral[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  closeButtonText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  
  overview: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  
  overviewText: {
    ...typography.styles.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  
  yearSelector: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  
  sectionTitle: {
    ...typography.styles.h4,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  
  yearButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  
  yearButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  
  yearButtonActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  
  yearButtonText: {
    ...typography.styles.body,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  
  yearButtonTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  
  monthGrid: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  
  monthContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  
  monthButton: {
    width: (screenWidth - spacing.lg * 2 - spacing.sm * 3) / 4,
    aspectRatio: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.sm,
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  
  monthName: {
    ...typography.styles.caption,
    fontWeight: '600',
    color: colors.text,
  },
  
  monthPhotoCount: {
    ...typography.styles.caption,
    color: colors.textSecondary,
    fontSize: 11,
  },
  
  monthIndicator: {
    width: 20,
    backgroundColor: colors.primary[300],
    borderRadius: 2,
    marginTop: 2,
  },
  
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  
  quickButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary[100],
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  
  quickButtonText: {
    ...typography.styles.caption,
    fontWeight: '600',
    color: colors.primary[700],
  },
});

export default DateNavigator;