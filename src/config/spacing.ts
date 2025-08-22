/**
 * ChronoMap Design System Spacing
 * 8px base unit spacing system
 */

const BASE_UNIT = 8;

export const spacing = {
  // Base unit
  unit: BASE_UNIT,

  // Spacing scale
  xs: BASE_UNIT * 0.5, // 4px
  sm: BASE_UNIT * 1, // 8px
  md: BASE_UNIT * 2, // 16px
  lg: BASE_UNIT * 3, // 24px
  xl: BASE_UNIT * 4, // 32px
  "2xl": BASE_UNIT * 6, // 48px
  "3xl": BASE_UNIT * 8, // 64px

  // Photo grid specific spacing
  gridGap: 2,
  gridPadding: 16,
  clusterSpacing: 12,

  // Safe areas and margins
  mobileEdge: 20,
  tabletMargin: 32,

  // Common use cases
  screenPadding: BASE_UNIT * 2.5, // 20px
  sectionSpacing: BASE_UNIT * 3, // 24px
  itemSpacing: BASE_UNIT * 2, // 16px
  microSpacing: BASE_UNIT * 0.5, // 4px
} as const;

export type SpacingKey = keyof typeof spacing;
