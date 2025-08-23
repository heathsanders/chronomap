/**
 * DateScrubber Component
 * Horizontal date slider/scrubber for timeline navigation
 * Provides continuous scrolling through photo timeline dates
 */

import React, { memo, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import {
  PanGestureHandler,
  State as GestureState,
  PanGestureHandlerGestureEvent,
  PanGestureHandlerStateChangeEvent,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  runOnJS,
  interpolate,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { colors, spacing, typography } from '@/config';
import { DateSection, TimelineMetrics } from '@/types';

export interface DateScrubberProps {
  sections: DateSection[];
  metrics: TimelineMetrics | null;
  currentDate?: Date;
  onDateChange: (date: Date, sectionIndex: number) => void;
  width: number;
  height?: number;
  visible?: boolean;
  testID?: string;
}

interface DateMarker {
  date: Date;
  sectionIndex: number;
  position: number;
  label: string;
  isMonthStart: boolean;
  photoCount: number;
}

const AnimatedView = Animated.View;
const SCRUBBER_HEIGHT = 60;
const TRACK_HEIGHT = 4;
const THUMB_SIZE = 20;
const LABEL_HEIGHT = 24;

export const DateScrubber: React.FC<DateScrubberProps> = memo(({
  sections,
  metrics,
  currentDate,
  onDateChange,
  width,
  height = SCRUBBER_HEIGHT,
  visible = true,
  testID,
}) => {
  const translateX = useSharedValue(0);
  const isGestureActive = useSharedValue(false);
  const lastDateChangeRef = useRef<Date | null>(null);

  // Create date markers from sections
  const dateMarkers = useMemo<DateMarker[]>(() => {
    if (!sections.length || !metrics) return [];

    const { dateRange } = metrics;
    const totalDuration = dateRange.end.getTime() - dateRange.start.getTime();
    const trackWidth = width - THUMB_SIZE;

    return sections.map((section, index) => {
      const sectionTime = section.startDate.getTime();
      const position = ((sectionTime - dateRange.start.getTime()) / totalDuration) * trackWidth;
      
      const isMonthStart = index === 0 || 
        section.startDate.getMonth() !== sections[index - 1]?.startDate.getMonth() ||
        section.startDate.getFullYear() !== sections[index - 1]?.startDate.getFullYear();

      return {
        date: section.startDate,
        sectionIndex: index,
        position,
        label: formatDateLabel(section.startDate, isMonthStart),
        isMonthStart,
        photoCount: section.count,
      };
    });
  }, [sections, metrics, width]);

  // Find current position based on currentDate
  const currentPosition = useMemo(() => {
    if (!currentDate || !metrics || !dateMarkers.length) return 0;
    
    const currentTime = currentDate.getTime();
    const { dateRange } = metrics;
    const totalDuration = dateRange.end.getTime() - dateRange.start.getTime();
    const trackWidth = width - THUMB_SIZE;
    
    return ((currentTime - dateRange.start.getTime()) / totalDuration) * trackWidth;
  }, [currentDate, metrics, dateMarkers, width]);

  // Update thumb position when currentDate changes
  useEffect(() => {
    if (!isGestureActive.value) {
      translateX.value = withSpring(currentPosition, {
        damping: 20,
        stiffness: 200,
      });
    }
  }, [currentPosition, translateX, isGestureActive]);

  // Find closest date marker to position
  const findClosestMarker = useCallback((position: number): DateMarker | null => {
    if (!dateMarkers.length) return null;
    
    let closest = dateMarkers[0];
    let minDistance = Math.abs(position - closest.position);
    
    for (const marker of dateMarkers) {
      const distance = Math.abs(position - marker.position);
      if (distance < minDistance) {
        minDistance = distance;
        closest = marker;
      }
    }
    
    return closest;
  }, [dateMarkers]);

  // Handle date change with throttling
  const handleDateChange = useCallback((position: number) => {
    const marker = findClosestMarker(position);
    if (!marker) return;
    
    // Throttle date changes to prevent too many updates
    if (lastDateChangeRef.current?.getTime() === marker.date.getTime()) return;
    
    lastDateChangeRef.current = marker.date;
    onDateChange(marker.date, marker.sectionIndex);
  }, [findClosestMarker, onDateChange]);

  // Pan gesture handler
  const gestureHandler = useAnimatedGestureHandler<
    PanGestureHandlerGestureEvent,
    { startX: number }
  >({
    onStart: (_, context) => {
      isGestureActive.value = true;
      context.startX = translateX.value;
    },
    onActive: (event, context) => {
      const trackWidth = width - THUMB_SIZE;
      const newX = Math.max(0, Math.min(trackWidth, context.startX + event.translationX));
      translateX.value = newX;
      runOnJS(handleDateChange)(newX);
    },
    onEnd: () => {
      isGestureActive.value = false;
    },
  });

  // Thumb animated style
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  // Track fill animated style
  const trackFillStyle = useAnimatedStyle(() => ({
    width: translateX.value + THUMB_SIZE / 2,
  }));

  if (!visible || !dateMarkers.length) return null;

  return (
    <View style={[styles.container, { width, height }]} testID={testID}>
      {/* Date Labels */}
      <View style={styles.labelsContainer}>
        {dateMarkers
          .filter(marker => marker.isMonthStart)
          .map((marker) => (
            <View
              key={`${marker.date.getTime()}`}
              style={[
                styles.labelContainer,
                { left: marker.position }
              ]}
            >
              <Text style={styles.label}>{marker.label}</Text>
            </View>
          ))}
      </View>

      {/* Track Container */}
      <View style={styles.trackContainer}>
        {/* Background Track */}
        <View style={[styles.track, styles.trackBackground]} />
        
        {/* Active Track Fill */}
        <AnimatedView style={[styles.track, styles.trackActive, trackFillStyle]} />
        
        {/* Section Markers */}
        {dateMarkers.map((marker) => (
          <View
            key={`marker-${marker.sectionIndex}`}
            style={[
              styles.sectionMarker,
              {
                left: marker.position,
                height: marker.isMonthStart ? 8 : 4,
                backgroundColor: marker.isMonthStart 
                  ? colors.primary 
                  : colors.primaryLight,
              }
            ]}
          />
        ))}
        
        {/* Interactive Thumb */}
        <PanGestureHandler onGestureEvent={gestureHandler}>
          <AnimatedView style={[styles.thumb, thumbStyle]}>
            <View style={styles.thumbInner} />
          </AnimatedView>
        </PanGestureHandler>
      </View>

      {/* Photo Count Indicator */}
      {currentDate && (
        <View style={styles.photoCountContainer}>
          <Text style={styles.photoCountText}>
            {formatDateForDisplay(currentDate)}
          </Text>
        </View>
      )}
    </View>
  );
});

DateScrubber.displayName = 'DateScrubber';

// Helper functions
function formatDateLabel(date: Date, isMonthStart: boolean): string {
  if (isMonthStart) {
    return date.toLocaleDateString('en', { month: 'short', year: '2-digit' });
  }
  return date.getDate().toString();
}

function formatDateForDisplay(date: Date): string {
  return date.toLocaleDateString('en', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  labelsContainer: {
    height: LABEL_HEIGHT,
    position: 'relative',
    marginBottom: spacing.xs,
  },

  labelContainer: {
    position: 'absolute',
    alignItems: 'center',
    minWidth: 40,
  },

  label: {
    ...typography.styles.caption,
    fontSize: 10,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
  },

  trackContainer: {
    height: TRACK_HEIGHT + THUMB_SIZE,
    justifyContent: 'center',
    position: 'relative',
    marginBottom: spacing.xs,
  },

  track: {
    position: 'absolute',
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
  },

  trackBackground: {
    left: 0,
    right: 0,
    backgroundColor: colors.neutral[200],
  },

  trackActive: {
    left: 0,
    backgroundColor: colors.primary,
  },

  sectionMarker: {
    position: 'absolute',
    width: 2,
    backgroundColor: colors.primaryLight,
    borderRadius: 1,
    top: (TRACK_HEIGHT + THUMB_SIZE - 8) / 2,
  },

  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    top: (TRACK_HEIGHT + THUMB_SIZE - THUMB_SIZE) / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },

  thumbInner: {
    width: THUMB_SIZE - 4,
    height: THUMB_SIZE - 4,
    borderRadius: (THUMB_SIZE - 4) / 2,
    backgroundColor: colors.white,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    borderWidth: 2,
    borderColor: colors.primary,
  },

  photoCountContainer: {
    alignItems: 'center',
  },

  photoCountText: {
    ...typography.styles.caption,
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
  },
});

export default DateScrubber;