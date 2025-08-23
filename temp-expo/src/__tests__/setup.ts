import '@testing-library/react-native/extend-expect';
import 'react-native-gesture-handler/jestSetup';

// Mock react-native modules that don't work in Jest
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Mock expo modules
jest.mock('expo-media-library', () => ({
  requestPermissionsAsync: jest.fn(() => 
    Promise.resolve({ granted: true, canAskAgain: true })
  ),
  getPermissionsAsync: jest.fn(() => 
    Promise.resolve({ granted: true, canAskAgain: true })
  ),
  getAssetsAsync: jest.fn(() => 
    Promise.resolve({ 
      assets: [],
      totalCount: 0,
      hasNextPage: false,
      endCursor: null
    })
  ),
  getAssetInfoAsync: jest.fn(() => 
    Promise.resolve({ exif: {}, location: null })
  ),
  MediaType: { photo: 'photo', video: 'video' },
  SortBy: { creationTime: 'creationTime', modificationTime: 'modificationTime' },
}));

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(() => 
    Promise.resolve({
      execAsync: jest.fn(() => Promise.resolve()),
      runAsync: jest.fn(() => Promise.resolve()),
      getAllAsync: jest.fn(() => Promise.resolve([])),
      getFirstAsync: jest.fn(() => Promise.resolve(null)),
      withTransactionAsync: jest.fn((fn) => fn()),
      closeAsync: jest.fn(() => Promise.resolve()),
    })
  ),
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-file-system', () => ({
  documentDirectory: '/mock/document/directory/',
  cacheDirectory: '/mock/cache/directory/',
  bundleDirectory: '/mock/bundle/directory/',
  getInfoAsync: jest.fn(() => 
    Promise.resolve({ exists: true, size: 1024, isDirectory: false })
  ),
  readAsStringAsync: jest.fn(() => Promise.resolve('')),
  writeAsStringAsync: jest.fn(() => Promise.resolve()),
  deleteAsync: jest.fn(() => Promise.resolve()),
  makeDirectoryAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'mock-uuid-12345'),
}));

// Mock FastImage
jest.mock('react-native-fast-image', () => {
  const { Image } = require('react-native');
  return {
    __esModule: true,
    default: Image,
    resizeMode: {
      contain: 'contain',
      cover: 'cover',
      stretch: 'stretch',
      center: 'center',
    },
    priority: {
      low: 'low',
      normal: 'normal',
      high: 'high',
    },
    cacheControl: {
      immutable: 'immutable',
      web: 'web',
      cacheOnly: 'cacheOnly',
    },
  };
});

// Mock FlashList
jest.mock('@shopify/flash-list', () => {
  const { FlatList } = require('react-native');
  return {
    FlashList: FlatList,
  };
});

// Mock React Native Maps
jest.mock('react-native-maps', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: View,
    Marker: View,
    Callout: View,
    Circle: View,
    Polyline: View,
    Polygon: View,
  };
});

// Mock Dimensions for consistent testing
jest.mock('react-native/Libraries/Utilities/Dimensions', () => ({
  get: jest.fn(() => ({
    width: 375,
    height: 812,
    scale: 2,
    fontScale: 1,
  })),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

// Silence warnings in tests
const originalWarn = console.warn;
beforeEach(() => {
  console.warn = (...args: any[]) => {
    const warningMessage = args[0];
    
    // Filter out known warnings that are not relevant for tests
    if (
      typeof warningMessage === 'string' &&
      (warningMessage.includes('componentWillReceiveProps') ||
       warningMessage.includes('componentWillMount') ||
       warningMessage.includes('React.createFactory'))
    ) {
      return;
    }
    
    originalWarn(...args);
  };
});

afterEach(() => {
  console.warn = originalWarn;
});

// Global test timeout for async operations
jest.setTimeout(10000);

// Mock timers if needed
// jest.useFakeTimers();

// Add custom matchers for privacy-safe testing
expect.extend({
  toBePrivacySafe(received) {
    const isPrivacySafe = 
      typeof received === 'string' &&
      !received.includes('/Users/') &&
      !received.includes('/private/') &&
      !received.includes('file://') &&
      !received.includes('@') &&
      !/\d{4}-\d{2}-\d{2}/.test(received) && // No dates
      !/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(received); // No IP addresses

    return {
      pass: isPrivacySafe,
      message: () =>
        `Expected ${received} ${isPrivacySafe ? 'not ' : ''}to be privacy-safe`,
    };
  },
  
  toHaveValidPhotoFormat(received) {
    const hasValidFormat = 
      received &&
      typeof received.id === 'string' &&
      typeof received.uri === 'string' &&
      typeof received.filename === 'string' &&
      typeof received.width === 'number' &&
      typeof received.height === 'number' &&
      typeof received.creationTime === 'number';

    return {
      pass: hasValidFormat,
      message: () =>
        `Expected ${received} ${hasValidFormat ? 'not ' : ''}to have valid photo format`,
    };
  },
});

// Export commonly used test utilities
export const mockPhoto = {
  id: 'test-photo-1',
  uri: 'file://test-photo.jpg',
  filename: 'test-photo.jpg',
  width: 1920,
  height: 1080,
  creationTime: Date.now() - 86400000, // 1 day ago
  modificationTime: Date.now() - 86400000,
  duration: null,
  mediaType: 'photo',
  isDeleted: false,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

export const mockPhotos = Array.from({ length: 10 }, (_, index) => ({
  ...mockPhoto,
  id: `test-photo-${index + 1}`,
  filename: `test-photo-${index + 1}.jpg`,
  creationTime: Date.now() - (86400000 * index), // Spread over days
}));

export const createMockPhotoWithLocation = (lat: number, lng: number) => ({
  ...mockPhoto,
  latitude: lat,
  longitude: lng,
});

export const waitForAsyncUpdates = () => 
  new Promise(resolve => setTimeout(resolve, 0));

// Helper to create mock database service
export const createMockDatabaseService = () => ({
  initialize: jest.fn(() => Promise.resolve()),
  getPhotos: jest.fn(() => Promise.resolve(mockPhotos)),
  getPhotoCount: jest.fn(() => Promise.resolve(mockPhotos.length)),
  getPhotoById: jest.fn(() => Promise.resolve(mockPhoto)),
  insertPhoto: jest.fn(() => Promise.resolve()),
  insertPhotos: jest.fn(() => Promise.resolve()),
  deletePhoto: jest.fn(() => Promise.resolve()),
  deletePhotos: jest.fn(() => Promise.resolve()),
  getPhotosByDateRange: jest.fn(() => Promise.resolve(mockPhotos)),
  getPhotosWithLocation: jest.fn(() => Promise.resolve([])),
  getHealthStatus: jest.fn(() => Promise.resolve({ connected: true, photoCount: 10 })),
  close: jest.fn(() => Promise.resolve()),
});

// Helper to create mock media scanner service
export const createMockMediaScannerService = () => ({
  scanPhotoLibrary: jest.fn(() => Promise.resolve(mockPhotos)),
  scanNewPhotos: jest.fn(() => Promise.resolve([])),
  stopScan: jest.fn(),
  isScanInProgress: false,
  getAlbums: jest.fn(() => Promise.resolve([])),
  getPhotosFromAlbum: jest.fn(() => Promise.resolve({ assets: [], hasNextPage: false })),
});