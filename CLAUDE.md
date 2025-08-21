# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## About ChronoMap

ChronoMap is a privacy-first photo organization mobile app built with React Native and Expo SDK 51+. It helps users organize photos by timeline and location without cloud uploads - all processing happens on-device using SQLite with encryption.

## Development Commands

### Setup and Dependencies
```bash
# Install dependencies (required due to peer dependency conflicts)
npm install --legacy-peer-deps

# Clean install when dependencies are problematic
rm -rf node_modules package-lock.json && npm install --legacy-peer-deps
```

### Development Servers
```bash
# Start Expo development server
npm start

# Platform-specific development
npm run ios          # Open iOS simulator
npm run android      # Open Android emulator  
npm run web          # Open web version
```

### Code Quality
```bash
# Type checking (TypeScript)
npm run type-check

# Linting
npm run lint         # Check for lint errors
npm run lint:fix     # Auto-fix lint issues
```

### Testing
```bash
npm test             # Run Jest tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
```

### Build and Deployment
```bash
# EAS Builds
npm run build:android    # Build Android APK/AAB
npm run build:ios        # Build iOS IPA
npm run build:all        # Build for all platforms

# App Store Submission
npm run submit:android   # Submit to Google Play
npm run submit:ios       # Submit to App Store

# Over-the-air Updates
npm run update          # Push update via EAS Update
```

### Maintenance
```bash
npm run clean           # Clean node_modules and .expo
npm run analyze-bundle  # Analyze bundle size
```

## Architecture Overview

### Project Structure
```
src/
├── components/         # Reusable UI components
│   ├── common/        # Cross-feature components  
│   ├── timeline/      # Timeline-specific components
│   ├── map/           # Map-specific components
│   └── forms/         # Form and input components
├── screens/           # Screen-level components
│   ├── TimelineScreen/
│   ├── MapScreen/
│   ├── SettingsScreen/
│   └── OnboardingScreen/
├── services/          # Business logic services
│   ├── MediaScanner/  # Device photo library scanning
│   ├── LocationService/ # GPS data and geocoding
│   ├── DatabaseService/ # SQLite operations
│   └── PrivacyManager/ # Privacy compliance
├── stores/            # Zustand state management
├── hooks/             # Custom React hooks
├── utils/             # Utility functions
├── config/            # App configuration and design tokens
└── types/             # TypeScript type definitions
```

### Key Technology Decisions

**State Management**: Zustand + React Query
- Zustand for lightweight global state
- React Query for data caching and background sync
- Located in `src/stores/` directory

**Database**: SQLite with SQLCipher encryption  
- All data stays on-device for privacy
- Database service in `src/services/DatabaseService/`
- Encryption handled via expo-sqlite

**Performance**: Virtual Lists with @shopify/flash-list
- Handles 50,000+ photos efficiently
- Custom virtualization in timeline/map components
- Memory management crucial for large libraries

**Maps**: React Native Maps with offline clustering
- Custom clustering algorithms for photo grouping
- Offline tile support for privacy
- Map service in `src/services/MapService/`

### Import Aliases (Babel + TypeScript)
```typescript
import { colors } from '@/config/colors';
import { PhotoThumbnail } from '@/components/timeline';
import { usePhotoLibrary } from '@/hooks';
import { MediaScanner } from '@/services/MediaScanner';
```

## Development Guidelines

### Photo Performance Requirements
- Timeline scrolling: 60fps on all supported devices
- Photo grid loading: <2 seconds for 100 photos  
- Memory usage: <200MB during normal operation
- App launch time: <3 seconds on mid-range devices

### Privacy-First Architecture
- **No network requests for photo data** - all processing is local
- **Encrypted local storage** - SQLite database uses SQLCipher
- **Minimal permissions** - only request what's needed
- **Privacy indicators** - clear UI showing local-only processing

### Common Development Issues

**Metro File Watcher Errors** (`EMFILE: too many open files`):
```bash
# Increase file descriptor limit
ulimit -n 65536 && npm start
```

**Expo SQLite Module Issues**:
- ES modules need `.js` extensions in import paths
- Check `node_modules/expo-sqlite/build/index.js` has correct imports
- May need to manually fix: `'./SQLiteDatabase'` → `'./SQLiteDatabase.js'`

**Dependency Conflicts**:
- Always use `--legacy-peer-deps` flag for npm operations
- React Native 0.74 conflicts with React 18.3.1 - this is expected

### Testing Strategy

**Performance Testing** (Critical):
- Test with 50,000+ photos in simulator
- Monitor memory usage with large datasets
- Verify timeline scrolling performance
- Test on older devices when possible

**Privacy Testing**:
- Verify no network requests contain photo data
- Test database encryption functionality
- Validate permission handling flows

### Key Service Interfaces

**MediaScannerService** (`src/services/MediaScanner/`):
- `startFullScan()` - Initial library indexing
- `startIncrementalScan()` - Add new photos
- Progress callbacks for UI updates

**TimelineService** (`src/services/Timeline/`):
- `getPhotosForDateRange()` - Fetch photos by time period
- `getDateSections()` - Timeline navigation structure
- Virtual list optimization helpers

**LocationService** (`src/services/LocationService/`):
- `clusterPhotosByLocation()` - Geographic grouping
- `reverseGeocode()` - GPS to address conversion
- Offline geocoding support

### Configuration Files

**app.config.js**: Expo configuration with platform-specific settings
- iOS/Android permissions and capabilities
- Privacy usage descriptions
- Build properties and native modules

**metro.config.js**: Metro bundler configuration  
- File watcher settings to prevent EMFILE errors
- Performance optimizations for photo-heavy apps

**tsconfig.json**: TypeScript configuration with path mapping
- Import aliases for cleaner imports
- Strict mode enabled for better code quality

## Privacy Compliance Notes

ChronoMap is designed for privacy-first photo organization. When working on features:

1. **No external data transmission** - Photos and metadata stay on device
2. **Encrypted storage** - All databases use SQLCipher encryption  
3. **Minimal permissions** - Request only necessary device permissions
4. **User transparency** - Clear messaging about local-only processing
5. **Data deletion** - Complete removal capabilities per GDPR requirements

## Common Tasks

**Adding a new screen**:
1. Create component in `src/screens/[ScreenName]/`
2. Add to navigation configuration
3. Follow existing screen patterns for consistency
4. Consider accessibility and performance impacts

**Implementing new photo operations**:
1. Use MediaLibrary API through service layer
2. Update local database via DatabaseService
3. Invalidate relevant React Query caches
4. Test with large photo libraries

**Performance optimization**:
1. Profile memory usage with large datasets
2. Use FlashList for photo grids/lists
3. Implement progressive image loading
4. Monitor bundle size with analyze-bundle script

The codebase prioritizes performance, privacy, and user experience. All implementations should support large photo libraries (50K+ photos) while maintaining smooth 60fps performance.