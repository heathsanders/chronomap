/**
 * ChronoMap Design System Typography
 * Font sizes, weights, and text styles
 */

export const typography = {
  // Font Stack
  fontFamily: {
    primary: 'SF Pro Display, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
    mono: 'SF Mono, Consolas, JetBrains Mono, Courier New, monospace',
  },

  // Font Weights
  fontWeight: {
    light: '300',
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },

  // Font Sizes
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
  },

  // Line Heights
  lineHeight: {
    xs: 16,
    sm: 20,
    base: 24,
    lg: 26,
    xl: 26,
    '2xl': 30,
    '3xl': 34,
    '4xl': 38,
  },

  // Letter Spacing (React Native expects numbers, not em strings)
  letterSpacing: {
    tight: -0.32, // Approximate -0.02em conversion
    normal: 0,
    wide: 0.16,   // Approximate 0.01em conversion
    wider: 0.32,  // Approximate 0.02em conversion
  },

  // Text Styles
  styles: {
    h1: {
      fontSize: 32,
      lineHeight: 38,
      fontWeight: '700',
      letterSpacing: -0.64, // -0.02em converted
    },
    h2: {
      fontSize: 28,
      lineHeight: 34,
      fontWeight: '600',
      letterSpacing: -0.28, // -0.01em converted
    },
    h3: {
      fontSize: 24,
      lineHeight: 30,
      fontWeight: '600',
      letterSpacing: 0,
    },
    h4: {
      fontSize: 20,
      lineHeight: 26,
      fontWeight: '500',
      letterSpacing: 0,
    },
    h5: {
      fontSize: 16,
      lineHeight: 22,
      fontWeight: '500',
      letterSpacing: 0.16, // 0.01em converted
    },
    bodyLarge: {
      fontSize: 18,
      lineHeight: 26,
      fontWeight: '400',
    },
    body: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '400',
    },
    bodySmall: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '400',
    },
    caption: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '400',
      letterSpacing: 0.12, // 0.01em converted
    },
    label: {
      fontSize: 14,
      lineHeight: 18,
      fontWeight: '500',
      letterSpacing: 0.28, // 0.02em converted
      textTransform: 'uppercase' as const,
    },
    button: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '500',
      letterSpacing: 0.16, // 0.01em converted
    },
    code: {
      fontSize: 14,
      lineHeight: 20,
      fontFamily: 'SF Mono, Consolas, JetBrains Mono, Courier New, monospace',
    },
  },
} as const;

export type TypographyStyle = keyof typeof typography.styles;