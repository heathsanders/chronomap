/**
 * ChronoMap Design System Colors
 * Privacy-first photo organization app color palette
 */

export const colors = {
  // Primary Colors - Trust, reliability, and privacy messaging
  primary: '#1A365D',
  primaryDark: '#153E75',
  primaryLight: '#2B77AD',

  // Secondary Colors - Photo context and warm discovery moments
  secondary: '#744C2C',
  secondaryLight: '#A67C52',
  secondaryPale: '#E6D7CC',

  // Accent Colors - Discovery, success, and engagement moments
  accentPrimary: '#F56565',
  accentSecondary: '#ED8936',
  gradientStart: '#667EEA',
  gradientEnd: '#764BA2',

  // Semantic Colors - System feedback and state communication
  success: '#48BB78',
  warning: '#ED8936',
  error: '#F56565',
  info: '#4299E1',

  // Neutral Palette - Content hierarchy and readable text
  neutral: {
    50: '#F7FAFC',
    100: '#EDF2F7',
    200: '#E2E8F0',
    300: '#CBD5E0',
    400: '#A0AEC0',
    500: '#718096',
    600: '#4A5568',
    700: '#2D3748',
    800: '#1A202C',
    900: '#171923',
  },

  // Privacy Context Colors - Reinforcing privacy-first messaging
  privacyGreen: '#38A169',
  privacyShield: '#2B6CB0',
  localGold: '#D69E2E',

  // Common aliases
  white: '#F7FAFC',
  black: '#171923',
  text: '#4A5568',
  textDark: '#2D3748',
  textSecondary: '#718096',
  textTertiary: '#A0AEC0',
  background: '#F7FAFC',
  surface: '#FFFFFF',
  border: '#E2E8F0',
} as const;

export type ColorKey = keyof typeof colors;