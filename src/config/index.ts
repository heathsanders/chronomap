/**
 * ChronoMap Design System Configuration
 * Centralized export of all design tokens
 */

export { colors, type ColorKey } from './colors';
export { typography, type TypographyStyle } from './typography';
export { spacing, type SpacingKey } from './spacing';

// Application constants
export const APP_CONFIG = {
  name: 'ChronoMap',
  version: '1.0.0',
  description: 'Privacy-first photo organization',
  
  // Performance targets
  performance: {
    launchTime: 3000, // 3 seconds
    photoGridLoading: 2000, // 2 seconds for 100 photos
    mapClustering: 1000, // 1 second for 1000+ photos
    targetFPS: 60,
  },

  // Scalability limits
  limits: {
    maxPhotos: 50000,
    maxMemoryUsage: 200 * 1024 * 1024, // 200MB
    batchSize: 50,
  },

  // Privacy settings
  privacy: {
    localOnly: true,
    encryptionRequired: true,
    noAnalytics: true,
    noCrashReporting: false, // Opt-in only
  },
} as const;