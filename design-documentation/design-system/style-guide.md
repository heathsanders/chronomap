---
title: ChronoMap Design System Style Guide
description: Complete visual language and component specifications for the privacy-first photo organization app
feature: design-system
last-updated: 2025-01-21
version: 1.0.0
related-files: 
  - ../features/timeline-navigation/README.md
  - ../features/interactive-map/README.md
  - ./components/README.md
dependencies:
  - Mobile platform design guidelines (iOS HIG, Material Design)
status: approved
---

# ChronoMap Design System Style Guide

## Overview
ChronoMap's design system creates a privacy-first photo organization experience that feels trustworthy, discoverable, and beautifully simple. Every element reinforces our core values: privacy, performance, and delightful memory exploration.

## Table of Contents
1. [Color System](#color-system)
2. [Typography System](#typography-system)
3. [Spacing & Layout](#spacing--layout-system)
4. [Component Specifications](#component-specifications)
5. [Motion & Animation](#motion--animation-system)
6. [Iconography](#iconography-system)

---

## Color System

### Primary Colors
**Purpose**: Trust, reliability, and privacy messaging

- **Primary**: `#1A365D` (Deep Ocean Blue) – Main CTAs, brand elements, privacy indicators
- **Primary Dark**: `#153E75` (Midnight Blue) – Hover states, pressed buttons, emphasis
- **Primary Light**: `#2B77AD` (Sky Blue) – Subtle backgrounds, secondary actions

**Accessibility**: All primary combinations exceed WCAG AA standards (4.5:1 minimum)

### Secondary Colors  
**Purpose**: Photo context and warm discovery moments

- **Secondary**: `#744C2C` (Rich Brown) – Location pins, earth-tone accents
- **Secondary Light**: `#A67C52` (Warm Sand) – Subtle location backgrounds
- **Secondary Pale**: `#E6D7CC` (Cream) – Selected location states, highlights

### Accent Colors
**Purpose**: Discovery, success, and engagement moments

- **Accent Primary**: `#F56565` (Coral Red) – Important actions, notifications, photo selection
- **Accent Secondary**: `#ED8936` (Warm Orange) – Warnings, timeline highlights
- **Gradient Start**: `#667EEA` (Soft Purple) – For photo overlay gradients
- **Gradient End**: `#764BA2` (Deep Purple) – For photo overlay gradients

### Semantic Colors
**Purpose**: System feedback and state communication

- **Success**: `#48BB78` (Forest Green) – Successful scanning, completed actions
- **Warning**: `#ED8936` (Amber) – Storage warnings, permission alerts
- **Error**: `#F56565` (Coral Red) – Scan failures, deletion confirmations
- **Info**: `#4299E1` (Clear Blue) – Tips, feature introductions, help text

### Neutral Palette
**Purpose**: Content hierarchy and readable text

- **Neutral-50**: `#F7FAFC` (Pure White) – App backgrounds, card surfaces
- **Neutral-100**: `#EDF2F7` (Light Gray) – Disabled states, dividers
- **Neutral-200**: `#E2E8F0` (Subtle Gray) – Input borders, inactive elements
- **Neutral-300**: `#CBD5E0` (Medium Gray) – Placeholder text, secondary borders
- **Neutral-400**: `#A0AEC0` (Cool Gray) – Supporting text, inactive icons
- **Neutral-500**: `#718096` (Text Gray) – Body text, secondary information
- **Neutral-600**: `#4A5568` (Dark Gray) – Primary text, active icons
- **Neutral-700**: `#2D3748` (Charcoal) – Headings, high emphasis text
- **Neutral-800**: `#1A202C` (Deep Charcoal) – Maximum contrast text
- **Neutral-900**: `#171923` (Near Black) – Pure black text, high contrast mode

### Privacy Context Colors
**Purpose**: Reinforcing privacy-first messaging

- **Privacy Green**: `#38A169` (Trust Green) – Privacy indicators, local processing status
- **Privacy Shield**: `#2B6CB0` (Shield Blue) – Security elements, protection states
- **Local Gold**: `#D69E2E` (Local Gold) – On-device indicators, premium features

**Accessibility Notes**
- All text combinations meet WCAG AA standards (4.5:1 normal text, 3:1 large text)
- Critical privacy messaging maintains 7:1 contrast ratio for enhanced trust
- Color-blind friendly palette tested with deuteranopia and protanopia simulators

---

## Typography System

### Font Stack
**Primary**: `SF Pro Display, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif`  
**Monospace**: `SF Mono, Consolas, JetBrains Mono, 'Courier New', monospace`

### Font Weights
- **Light**: 300 (Large displays, elegant headers)
- **Regular**: 400 (Body text, standard UI)
- **Medium**: 500 (Emphasized text, button labels)
- **Semibold**: 600 (Section headers, important labels)
- **Bold**: 700 (Page titles, strong emphasis)

### Type Scale

#### Headers
- **H1**: `32px/38px, Bold, -0.02em` – Main page titles, feature headers
- **H2**: `28px/34px, Semibold, -0.01em` – Section headers, modal titles
- **H3**: `24px/30px, Semibold, 0em` – Subsection headers, card titles
- **H4**: `20px/26px, Medium, 0em` – Component titles, list headers
- **H5**: `16px/22px, Medium, 0.01em` – Minor headers, metadata labels

#### Body Text
- **Body Large**: `18px/26px, Regular` – Primary reading text, descriptions
- **Body**: `16px/24px, Regular` – Standard UI text, form inputs
- **Body Small**: `14px/20px, Regular` – Secondary information, captions
- **Caption**: `12px/16px, Regular, 0.01em` – Timestamps, file sizes, metadata
- **Label**: `14px/18px, Medium, 0.02em, uppercase` – Form labels, categories

#### Specialized
- **Code**: `14px/20px, SF Mono` – File paths, technical information
- **Button**: `16px/24px, Medium, 0.01em` – Button text, call-to-action labels

### Responsive Typography
- **Mobile (320-767px)**: Base scale, optimized for touch interaction
- **Tablet (768-1023px)**: 110% scale for larger screens
- **Desktop (1024px+)**: 120% scale for desktop companion features

### Accessibility Considerations
- Minimum 16px base font size for comfortable reading
- 1.5 line height ratio for optimal readability
- Support for iOS Dynamic Type and Android font scaling
- High contrast mode increases font weights by one level

---

## Spacing & Layout System

### Base Unit
**Foundation**: `8px` – All spacing derives from this base unit for consistent rhythm

### Spacing Scale
- **xs**: `4px` (0.5 × base) – Micro spacing between related elements, icon padding
- **sm**: `8px` (1 × base) – Small spacing, internal component padding
- **md**: `16px` (2 × base) – Default spacing, standard margins between elements
- **lg**: `24px` (3 × base) – Medium spacing between sections, card padding
- **xl**: `32px` (4 × base) – Large spacing, major section separation
- **2xl**: `48px` (6 × base) – Extra large spacing, screen padding, hero sections
- **3xl**: `64px` (8 × base) – Maximum spacing, onboarding layouts

### Photo Grid Spacing
- **Grid Gap**: `2px` – Tight spacing for photo grids to maximize photo visibility
- **Grid Padding**: `16px` – Outer padding around photo grids
- **Cluster Spacing**: `12px` – Space between map photo clusters

### Grid System
- **Mobile Columns**: 4 columns with 16px gutters
- **Tablet Columns**: 8 columns with 20px gutters  
- **Desktop Columns**: 12 columns with 24px gutters

### Safe Areas & Margins
- **Mobile Edge Margin**: `20px` – Safe distance from screen edges
- **iPhone Notch**: Respect safe area insets for modern devices
- **Android Navigation**: Account for gesture navigation areas
- **Tablet Margins**: `32px` minimum for comfortable content areas

### Breakpoints
- **Mobile**: `320px – 767px` (Primary target for ChronoMap)
- **Tablet**: `768px – 1023px` (Future enhancement)
- **Desktop**: `1024px+` (Companion features only)

---

## Component Specifications

### Primary Button
**Purpose**: Main actions, CTAs, important user flows

**Variants**: Primary, Secondary, Tertiary, Ghost
**States**: Default, Hover, Active, Focus, Disabled, Loading

#### Visual Specifications
- **Height**: `48px` (comfortable touch target)
- **Padding**: `16px 24px` (horizontal emphasis)
- **Border Radius**: `12px` (modern, friendly feel)
- **Border**: None for primary, `1px solid Primary` for secondary
- **Shadow**: `0 2px 8px rgba(26, 54, 93, 0.15)` (subtle depth)
- **Typography**: Button style (16px/24px, Medium)

#### Primary Variant
- **Background**: `Primary` (#1A365D)
- **Text**: `Neutral-50` (white)
- **Hover**: `Primary Dark` background, lift shadow
- **Active**: `Primary Dark` with inset shadow
- **Focus**: `2px solid Accent Primary` outline

#### Secondary Variant  
- **Background**: `Neutral-50` (white)
- **Text**: `Primary` (#1A365D)
- **Border**: `1px solid Primary`
- **Hover**: `Primary Light` background, white text
- **Active**: `Primary` background with scale down

#### Usage Guidelines
- **Use for**: Primary actions, form submissions, feature onboarding
- **Don't use for**: Destructive actions, secondary navigation, bulk operations
- **Best practice**: Maximum one primary button per screen section

### Photo Card
**Purpose**: Individual photo display within grids and lists

#### Visual Specifications
- **Aspect Ratio**: `1:1` for grid view, `16:9` for detail view
- **Border Radius**: `8px` (subtle rounding for modern feel)
- **Border**: None (photos fill entire space)
- **Shadow**: `0 1px 3px rgba(0, 0, 0, 0.1)` (subtle depth)
- **Overlay Gradient**: `rgba(0, 0, 0, 0) to rgba(0, 0, 0, 0.4)` (for text readability)

#### Interaction States
- **Default**: Clean photo display with minimal chrome
- **Hover/Press**: Scale to `1.02x` with enhanced shadow
- **Selected**: `2px solid Accent Primary` border with checkmark overlay
- **Loading**: Skeleton placeholder with shimmer animation

#### Content Overlay
- **Date Label**: Caption style, white text with shadow
- **Location Label**: Body Small style, white text with shadow
- **Selection Indicator**: 24px circular checkmark, top-right corner

### Map Cluster
**Purpose**: Geographic grouping of photos on map view

#### Visual Specifications
- **Size**: `40px × 40px` (1-10 photos), `52px × 52px` (11-100), `64px × 64px` (100+)
- **Background**: `Primary` (#1A365D) with 90% opacity
- **Border**: `2px solid Neutral-50` (white)
- **Border Radius**: `50%` (perfect circle)
- **Typography**: Bold white numbers, size varies with cluster size

#### Interaction States
- **Default**: Solid appearance with photo count
- **Hover**: Scale to `1.1x` with enhanced shadow
- **Active**: Brief scale down to `0.95x` then return
- **Expanded**: Transition to photo grid layout

---

## Motion & Animation System

### Timing Functions
- **Ease-out**: `cubic-bezier(0.0, 0, 0.2, 1)` – Object entrances, sheet slides
- **Ease-in-out**: `cubic-bezier(0.4, 0, 0.6, 1)` – Property changes, transitions
- **Spring**: `tension: 300, friction: 20` – Playful interactions, photo scaling

### Duration Scale
- **Micro**: `150ms` – State changes, hover effects, selection feedback
- **Short**: `250ms` – Local transitions, button presses, option changes
- **Medium**: `350ms` – Sheet presentations, view transitions, map clustering
- **Long**: `500ms` – Page transitions, onboarding animations

### Key Animations

#### Photo Grid Loading
- **Stagger**: Photos fade in with 50ms delay between each
- **Duration**: 300ms ease-out per photo
- **Movement**: Slight upward slide (20px) combined with fade

#### View Transition (Timeline ↔ Map)
- **Duration**: 350ms ease-in-out
- **Method**: Cross-fade with subtle scale (0.95x to 1.0x)
- **Performance**: Use transform3d for hardware acceleration

#### Map Cluster Animation
- **Appearance**: Scale from 0.3x to 1.0x with spring timing
- **State Change**: Smooth scale transitions for hover effects
- **Expansion**: Cluster dissolves as individual photos animate to positions

#### Selection Feedback
- **Duration**: 150ms ease-out
- **Visual**: Scale to 1.02x briefly, then return with checkmark appearance
- **Haptic**: Light impact feedback on selection/deselection

### Performance Guidelines
- **Target**: 60fps on iPhone 8/Android equivalent and newer
- **Method**: Use transform and opacity properties only when possible
- **Optimization**: Prefer hardware acceleration with transform3d
- **Accessibility**: Respect `prefers-reduced-motion` user setting

---

## Iconography System

### Icon Family
**Style**: Outline-based with 2px stroke weight for clarity and legibility
**Grid**: 24px × 24px base grid with 2px padding
**Stroke**: Rounded caps and joins for friendly, approachable feel

### Core Icons
- **Timeline**: Calendar with subtle timeline indicator
- **Map**: Location pin with circular base
- **Photos**: Grid of squares representing photo layout
- **Settings**: Gear with clean, minimal details
- **Privacy**: Shield with checkmark for trust building
- **Search**: Magnifying glass with comfortable handle
- **Filter**: Funnel shape with clear opening
- **Delete**: Trash bin with lid, emphasizing reversibility when possible
- **Share**: Arrow pointing outward from box
- **Location**: Pin drop with circular base

### Privacy-Specific Icons
- **Local Processing**: Device icon with checkmark
- **No Cloud**: Cloud with prohibition symbol
- **Encrypted**: Lock with shield elements
- **On Device**: Phone with protective circle

### Usage Guidelines
- **Size**: Minimum 24px for touch targets, can scale up to 32px for primary actions
- **Color**: Use Neutral-600 for default state, Primary for active states
- **Accessibility**: Include proper accessibility labels for screen readers
- **Consistency**: Maintain 2px stroke weight across all custom icons

---

## Accessibility Specifications

### Color Contrast Standards
- **Normal Text**: 4.5:1 minimum ratio (WCAG AA)
- **Large Text**: 3:1 minimum ratio (18px+ or 14px+ bold)
- **Critical Actions**: 7:1 ratio for enhanced confidence (privacy features)
- **High Contrast Mode**: Automatic contrast enhancement for system setting

### Touch Target Guidelines
- **Minimum Size**: 44px × 44px (iOS) / 48px × 48px (Android)
- **Spacing**: 8px minimum between adjacent touch targets
- **Photo Selection**: Enlarged touch area beyond visual checkbox

### Screen Reader Support
- **Semantic Markup**: Proper heading hierarchy and landmark roles
- **Image Descriptions**: Auto-generated descriptions for photos when available
- **State Announcements**: Clear feedback for selection, loading, and error states
- **Navigation**: Logical tab order and skip links for efficiency

### Keyboard Navigation
- **Focus Indicators**: High-contrast 2px outlines with sufficient color contrast
- **Tab Order**: Logical progression through interface elements
- **Shortcuts**: Common shortcuts (Cmd+A for select all, etc.)

### Motion Sensitivity
- **Reduced Motion**: Alternative static transitions when user prefers
- **Essential Motion**: Preserve only functionally necessary animations
- **Duration**: Shortened animation times in reduced motion mode

---

## Platform-Specific Adaptations

### iOS
- **Design Language**: Follow iOS Human Interface Guidelines
- **Typography**: SF Pro family for native feel
- **Navigation**: iOS-style navigation patterns and gestures
- **Colors**: Adapt to iOS Dark Mode automatically
- **Haptics**: Use UIImpactFeedbackGenerator for selection feedback

### Android
- **Design Language**: Material Design 3 principles
- **Typography**: Roboto family for Android consistency
- **Navigation**: Material navigation patterns and gestures
- **Colors**: Support Android Dynamic Color when available
- **Haptics**: Android-appropriate vibration patterns

---

## Implementation Notes

### React Native Optimization
- **Image Performance**: Use FastImage for efficient photo loading
- **List Performance**: Implement FlatList with optimized rendering
- **Memory Management**: Aggressive image caching and cleanup
- **Gesture Handling**: React Native Gesture Handler for smooth interactions

### Design Token Export
All design values are available as exportable tokens for development:
- **Colors**: HEX values with opacity variants
- **Spacing**: rem/px values for multiple unit systems
- **Typography**: Font family, size, and weight combinations
- **Shadows**: Box-shadow values for depth system

### Quality Assurance
Design system compliance will be verified through:
- **Automated Testing**: Color contrast and touch target size validation
- **Visual Regression**: Screenshot comparisons for consistency
- **Accessibility Audits**: Regular screen reader and keyboard navigation testing
- **Performance Monitoring**: Animation frame rate and rendering performance

---

## Related Documentation
- [Component Library](./components/README.md)
- [Timeline Navigation Feature](../features/timeline-navigation/README.md)
- [Interactive Map Feature](../features/interactive-map/README.md)
- [Accessibility Guidelines](../accessibility/guidelines.md)

## Last Updated
January 21, 2025 - Complete design system established with privacy-first principles and mobile optimization