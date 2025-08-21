---
title: ChronoMap Component Library
description: Comprehensive mobile-optimized component specifications for the privacy-first photo organization app
last-updated: 2025-01-21
version: 1.0.0
related-files: 
  - ../style-guide.md
  - ../../features/timeline-navigation/README.md
  - ../../features/interactive-map/README.md
dependencies:
  - ChronoMap Design System
  - React Native platform requirements
status: approved
---

# ChronoMap Component Library

## Overview
The ChronoMap component library provides mobile-optimized, accessible, and privacy-focused interface elements designed specifically for photo organization and memory exploration. Every component reinforces trust, performance, and delightful user interactions.

## Table of Contents
1. [Design Principles](#design-principles)
2. [Core Components](#core-components)
3. [Photo-Specific Components](#photo-specific-components)
4. [Navigation Components](#navigation-components)
5. [Feedback Components](#feedback-components)
6. [Form Components](#form-components)
7. [Implementation Guidelines](#implementation-guidelines)

---

## Design Principles

### Privacy-First Design
All components include privacy considerations, with visual indicators for local processing and data security where relevant.

### Mobile-Optimized
Components are designed for touch interaction with appropriate sizing, spacing, and gesture support for mobile devices.

### Performance-Conscious
All components are optimized for smooth performance with large photo libraries, including efficient memory usage and 60fps animations.

### Accessibility-Complete
Every component meets WCAG AA standards with full screen reader support, keyboard navigation, and motor accessibility considerations.

---

## Core Components

### Primary Button
**Purpose**: Main actions, CTAs, important user flows

#### Component Specification

**Variants**:
- `primary` - Main actions (photo scanning, view changes)
- `secondary` - Supporting actions (cancel, secondary options)
- `tertiary` - Subtle actions (help, additional options)
- `ghost` - Minimal actions (close, dismiss)

**States**:
- `default` - Normal interactive state
- `hover` - Touch down state (brief visual feedback)
- `active` - Currently pressed state
- `focus` - Keyboard focus state
- `disabled` - Non-interactive state
- `loading` - Processing state with activity indicator

#### Visual Specifications

**Primary Variant**:
```
Height: 48px
Padding: 16px horizontal, 12px vertical
Border Radius: 12px
Background: Primary (#1A365D)
Text: Neutral-50 (white)
Typography: Button (16px/24px, Medium)
Shadow: 0 2px 8px rgba(26, 54, 93, 0.15)
```

**Touch Feedback**:
```
Press Down: Scale to 0.98x, enhance shadow depth
Release: Spring back to 1.0x with 150ms ease-out
Loading: Spinner animation with 300ms fade-in
```

**Accessibility**:
```
Minimum Touch Target: 44px × 44px
Focus Indicator: 3px Primary outline with 2px offset
Screen Reader: Proper role, state, and label announcements
Voice Control: Clear labeling for voice commands
```

#### Usage Guidelines
- **Use for**: Primary actions, form submissions, key user flows
- **Don't use for**: Destructive actions, navigation, bulk operations
- **Best practices**: 
  - Maximum one primary button per screen section
  - Use loading state for operations >500ms
  - Provide clear feedback for all interactions

#### React Native Implementation
```jsx
<TouchableOpacity
  style={[styles.button, styles.primary]}
  onPress={handlePress}
  disabled={isLoading}
  accessibilityRole="button"
  accessibilityLabel="Start photo scanning"
>
  <Text style={styles.buttonText}>
    {isLoading ? 'Processing...' : 'Get Started'}
  </Text>
</TouchableOpacity>
```

---

## Photo-Specific Components

### Photo Card
**Purpose**: Individual photo display within grids, lists, and collections

#### Component Specification

**Variants**:
- `grid` - Square aspect ratio for timeline grids
- `preview` - Larger size for featured photos
- `cluster` - Small size for map cluster previews
- `detail` - Full-screen aspect ratio for photo viewing

**States**:
- `default` - Clean photo display
- `selected` - Multi-select mode selection
- `loading` - Photo loading with skeleton
- `error` - Failed to load with retry option
- `hover` - Brief touch feedback

#### Visual Specifications

**Grid Variant**:
```
Aspect Ratio: 1:1 (square)
Border Radius: 8px
Border: None (photo fills space)
Shadow: 0 1px 3px rgba(0, 0, 0, 0.1)
Overlay: Gradient for text readability when needed
```

**Selection State**:
```
Border: 3px solid Accent Primary (#F56565)
Overlay: Semi-transparent blue (Primary 20% opacity)
Checkmark: 24px white circle with checkmark, top-right
Animation: 150ms ease-out scale and border appearance
```

**Loading State**:
```
Background: Neutral-100 with shimmer animation
Animation: Left-to-right shimmer with 1.5s duration
Placeholder: Subtle camera icon in center
```

#### Interaction Specifications

**Touch Feedback**:
```
Press: Scale to 1.02x with enhanced shadow
Release: Quick transition to photo detail view
Duration: 250ms ease-out animation
```

**Selection Mode**:
```
Long Press: 300ms to enter selection mode
Toggle: Tap to select/deselect with visual feedback
Exit: Tap outside or cancel button
```

**Accessibility**:
```
Role: Image with descriptive label
Labels: Auto-generated from metadata when available
Navigation: Logical tab order within grids
Actions: Double-tap for full screen, long press for selection
```

#### Usage Guidelines
- **Use for**: All photo display contexts throughout the app
- **Don't use for**: Non-photo content or purely decorative images
- **Best practices**:
  - Maintain consistent aspect ratios within grids
  - Provide meaningful alt text for screen readers
  - Handle loading states gracefully
  - Support both single and multi-select interactions

### Photo Cluster (Map)
**Purpose**: Geographic grouping of photos on map interface

#### Component Specification

**Size Variants**:
- `small` - 1-10 photos (40px diameter)
- `medium` - 11-100 photos (52px diameter) 
- `large` - 100+ photos (64px diameter)

**States**:
- `default` - Solid cluster with photo count
- `hover` - Enlarged with enhanced shadow
- `active` - Brief press feedback
- `expanding` - Animation to photo grid view

#### Visual Specifications

**Small Cluster**:
```
Size: 40px × 40px
Background: Primary (#1A365D) with 90% opacity
Border: 2px solid Neutral-50 (white)
Border Radius: 50% (perfect circle)
Typography: Bold white count, 14px
Shadow: 0 2px 4px rgba(0, 0, 0, 0.2)
```

**Interaction States**:
```
Hover: Scale to 1.1x with enhanced shadow
Press: Brief scale to 0.95x then return
Duration: 150ms spring animation
```

#### Usage Guidelines
- **Use for**: Geographic photo grouping on map view
- **Don't use for**: Timeline organization or non-geographic clustering
- **Best practices**:
  - Adjust size based on photo count
  - Provide clear count indication
  - Smooth zoom-to-fit behavior on tap

---

## Navigation Components

### View Toggle (Timeline/Map)
**Purpose**: Primary navigation between timeline and map views

#### Component Specification

**States**:
- `timeline_active` - Timeline view selected
- `map_active` - Map view selected
- `transition` - Animated transition between views

#### Visual Specifications

**Segmented Control Style**:
```
Container: 200px width, 40px height
Border Radius: 20px (pill shape)
Background: Neutral-200
Active Segment: Primary background, white text
Inactive Segment: Transparent background, Neutral-600 text
Typography: Label (14px/18px, Medium)
```

**Transition Animation**:
```
Duration: 350ms ease-in-out
Movement: Sliding pill animation between segments
View Change: Cross-fade with subtle scale effect
```

#### Accessibility Specifications
```
Role: Tab list with proper ARIA attributes
Labels: "Timeline view" and "Map view"
State: Clear indication of active view
Keyboard: Arrow key navigation between options
```

### Date Picker
**Purpose**: Quick navigation to specific dates in timeline

#### Component Specification

**Variants**:
- `compact` - Header button showing current date
- `expanded` - Full calendar picker modal
- `quick` - Preset date ranges (Today, Week, Month)

#### Visual Specifications

**Compact Button**:
```
Height: 36px
Padding: 8px 12px
Background: Transparent
Border: 1px solid Neutral-300
Border Radius: 8px
Text: Current date in Body Small style
Icon: Small calendar icon (16px)
```

**Expanded Modal**:
```
Presentation: Bottom sheet covering 60% of screen
Background: Neutral-50 with rounded top corners
Calendar: Native iOS/Android date picker
Actions: Cancel and Select buttons
```

#### Usage Guidelines
- **Use for**: Direct date navigation in timeline view
- **Don't use for**: Form date inputs or scheduling
- **Best practices**:
  - Show current visible date range
  - Smooth animation to selected date
  - Respect platform date picker conventions

---

## Feedback Components

### Progress Indicator
**Purpose**: Communicate system status during photo scanning and processing

#### Component Specification

**Variants**:
- `linear` - Horizontal progress bar for defined processes
- `circular` - Circular indicator for indefinite loading
- `stepped` - Multi-step process indicator

#### Visual Specifications

**Linear Progress**:
```
Height: 4px
Background: Neutral-200
Fill: Primary color with smooth animation
Border Radius: 2px (pill shape)
Animation: Smooth 0-100% fill with easing
```

**Progress Text**:
```
Typography: Caption (12px/16px, Regular)
Content: "Processing 1,247 of 3,582 photos"
Position: Below progress bar with 8px spacing
Color: Neutral-500
```

**Circular Loading**:
```
Size: 24px diameter
Stroke: 2px width
Color: Primary
Animation: Continuous rotation with ease-in-out
```

#### Accessibility Specifications
```
Role: Progress bar with current value
Labels: Descriptive text of current operation
Updates: Regular announcements of progress changes
Focus: Non-focusable but announced by screen readers
```

### Privacy Indicator
**Purpose**: Reinforce local processing and data security

#### Component Specification

**Variants**:
- `shield` - Privacy protection indicator
- `local` - On-device processing indicator
- `encrypted` - Data security indicator

#### Visual Specifications

**Shield Indicator**:
```
Icon: Shield with checkmark (16px)
Color: Privacy Green (#38A169)
Text: "Processing locally"
Typography: Caption (12px/16px, Regular)
Layout: Icon + text horizontal arrangement
```

**Usage Guidelines**:
- **Use for**: Reinforcing privacy messaging throughout app
- **Don't use for**: General status or non-privacy information
- **Best practices**:
  - Place prominently during sensitive operations
  - Use consistently across features
  - Combine with clear privacy language

---

## Form Components

### Search Bar
**Purpose**: Location search and photo filtering

#### Component Specification

**States**:
- `default` - Empty search field
- `focused` - Active input with keyboard
- `searching` - Active search with loading
- `results` - Showing search suggestions

#### Visual Specifications

**Default State**:
```
Height: 44px
Padding: 12px 16px
Background: Neutral-100
Border: 1px solid Neutral-200
Border Radius: 22px (pill shape)
Placeholder: "Search places..." in Neutral-400
Icon: Search icon (16px) on left side
```

**Focus State**:
```
Border: 2px solid Primary
Background: Neutral-50 (white)
Shadow: 0 2px 8px rgba(26, 54, 93, 0.1)
Clear Button: X icon on right when text present
```

#### Usage Guidelines
- **Use for**: Location search, photo filtering, place names
- **Don't use for**: General text input or form fields
- **Best practices**:
  - Provide relevant search suggestions
  - Clear search results when appropriate
  - Support voice input where available

---

## Implementation Guidelines

### React Native Optimization

#### Performance Considerations
```jsx
// Efficient photo rendering with FastImage
import FastImage from 'react-native-fast-image';

const PhotoCard = React.memo(({ photo, onPress }) => {
  return (
    <Pressable onPress={onPress} style={styles.photoCard}>
      <FastImage
        source={{ uri: photo.uri }}
        style={styles.photoImage}
        resizeMode={FastImage.resizeMode.cover}
      />
    </Pressable>
  );
});
```

#### Gesture Handling
```jsx
// Smooth gesture recognition
import { GestureDetector, Gesture } from 'react-native-gesture-handler';

const longPress = Gesture.LongPress()
  .minDuration(300)
  .onStart(() => {
    'worklet';
    runOnJS(enterSelectionMode)();
  });
```

### Accessibility Implementation

#### Screen Reader Support
```jsx
const PhotoCard = ({ photo, isSelected }) => (
  <Pressable
    accessibilityRole="image"
    accessibilityLabel={`Photo taken on ${photo.date} at ${photo.location}`}
    accessibilityState={{ selected: isSelected }}
    accessibilityActions={[
      { name: 'select', label: 'Select photo' },
      { name: 'view', label: 'View full photo' }
    ]}
  >
    {/* Photo content */}
  </Pressable>
);
```

### Platform Adaptations

#### iOS-Specific Features
- Use SF Symbols for consistent iconography
- Implement haptic feedback for selections
- Support Dynamic Type for accessibility
- Follow iOS Human Interface Guidelines

#### Android-Specific Features
- Use Material Design 3 principles
- Implement Android haptic patterns
- Support system font scaling
- Follow Android accessibility guidelines

---

## Quality Assurance

### Component Testing Checklist
- [ ] All touch targets meet 44px minimum size
- [ ] Color contrast ratios verified (4.5:1 minimum)
- [ ] Screen reader labels accurate and helpful
- [ ] Keyboard navigation logical and complete
- [ ] Animations maintain 60fps performance
- [ ] Loading states provide clear feedback
- [ ] Error states offer recovery paths
- [ ] Platform-specific adaptations implemented

### Performance Validation
- [ ] Component rendering under 16ms (60fps)
- [ ] Memory usage stable during interactions
- [ ] Gesture recognition responsive and accurate
- [ ] Image loading optimized for mobile networks
- [ ] Animation performance maintained on older devices

---

## Related Documentation
- [Design System Style Guide](../style-guide.md)
- [Accessibility Guidelines](../../accessibility/guidelines.md)
- [Timeline Navigation Components](../../features/timeline-navigation/implementation.md)
- [Interactive Map Components](../../features/interactive-map/implementation.md)

## Future Component Roadmap
- **Advanced Photo Grid**: AI-powered photo grouping and smart layouts
- **Timeline Scrubber**: Smooth timeline navigation with haptic feedback
- **Location Labels**: Custom location naming and organization
- **Sharing Components**: Privacy-conscious photo sharing interfaces

## Last Updated
January 21, 2025 - Complete component library for privacy-first photo organization mobile app