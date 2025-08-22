/**
 * Jest Test Setup
 * Global configuration and mocks for ChronoMap testing
 */

import 'react-native-gesture-handler/jestSetup';
// Note: Accessibility matchers are now built into @testing-library/react-native v12.4+
// No need to import jest-native/extend-expect separately

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock Expo modules
jest.mock('expo-media-library', () => ({
  requestPermissionsAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  getAssetsAsync: jest.fn(),
  getAssetInfoAsync: jest.fn(),
  createAssetAsync: jest.fn(),
  addAssetsToAlbumAsync: jest.fn(),
  removeAssetsFromAlbumAsync: jest.fn(),
  deleteAssetsAsync: jest.fn(),
  getAlbumsAsync: jest.fn(),
  getAlbumAsync: jest.fn(),
  createAlbumAsync: jest.fn(),
  deleteAlbumsAsync: jest.fn(),
  MediaType: {
    audio: 'audio',
    photo: 'photo',
    video: 'video',
    unknown: 'unknown',
  },
  SortBy: {
    default: 'default',
    creationTime: 'creationTime',
    modificationTime: 'modificationTime',
    mediaType: 'mediaType',
    width: 'width',
    height: 'height',
    duration: 'duration',
  },
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  requestBackgroundPermissionsAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(),
  getBackgroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
  geocodeAsync: jest.fn(),
  Accuracy: {
    Lowest: 1,
    Low: 2,
    Balanced: 3,
    High: 4,
    Highest: 5,
    BestForNavigation: 6,
  },
}));

jest.mock('expo-file-system', () => ({
  documentDirectory: 'file://mock-document-directory/',
  cacheDirectory: 'file://mock-cache-directory/',
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  deleteAsync: jest.fn(),
  moveAsync: jest.fn(),
  copyAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  readDirectoryAsync: jest.fn(),
  downloadAsync: jest.fn(),
  createDownloadResumable: jest.fn(),
  getInfoAsync: jest.fn(),
  uploadAsync: jest.fn(),
}));

jest.mock('expo-sqlite', () => ({
  openDatabase: jest.fn(() => ({
    transaction: jest.fn(),
    readTransaction: jest.fn(),
    closeAsync: jest.fn(),
    deleteAsync: jest.fn(),
  })),
  openDatabaseAsync: jest.fn(() => Promise.resolve({
    closeAsync: jest.fn(),
    execAsync: jest.fn(),
    getFirstAsync: jest.fn(),
    getAllAsync: jest.fn(),
    runAsync: jest.fn(),
    prepareAsync: jest.fn(),
  })),
  deleteDatabaseAsync: jest.fn(),
}));

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
}));

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    canGoBack: jest.fn(() => true),
    dispatch: jest.fn(),
    reset: jest.fn(),
    setParams: jest.fn(),
    setOptions: jest.fn(),
  }),
  useRoute: () => ({
    key: 'mock-route-key',
    name: 'MockRoute',
    params: {},
  }),
  useFocusEffect: jest.fn(),
  useIsFocused: () => true,
}));

// Mock React Native Fast Image
jest.mock('react-native-fast-image', () => {
  const mockComponent = require('react-native/jest/mockComponent');
  return {
    __esModule: true,
    default: mockComponent('FastImage'),
    priority: {
      low: 'low',
      normal: 'normal',
      high: 'high',
    },
    resizeMode: {
      contain: 'contain',
      cover: 'cover',
      stretch: 'stretch',
      center: 'center',
    },
    cacheControl: {
      immutable: 'immutable',
      web: 'web',
      cacheOnly: 'cacheOnly',
    },
  };
});

// Mock React Native Maps
jest.mock('react-native-maps', () => {
  const mockComponent = require('react-native/jest/mockComponent');
  return {
    __esModule: true,
    default: mockComponent('MapView'),
    Marker: mockComponent('Marker'),
    Callout: mockComponent('Callout'),
    Polygon: mockComponent('Polygon'),
    Polyline: mockComponent('Polyline'),
    Circle: mockComponent('Circle'),
    Overlay: mockComponent('Overlay'),
    AnimatedRegion: jest.fn(),
  };
});

// Mock FlashList
jest.mock('@shopify/flash-list', () => {
  const mockComponent = require('react-native/jest/mockComponent');
  return {
    FlashList: mockComponent('FlashList'),
  };
});

// Mock React Native Reanimated
jest.mock('react-native-reanimated', () => {
  const mockReanimated = {
    default: {
      Value: jest.fn(),
      event: jest.fn(),
      add: jest.fn(),
      eq: jest.fn(),
      set: jest.fn(),
      cond: jest.fn(),
      interpolate: jest.fn(),
      View: require('react-native').View,
      Extrapolate: { CLAMP: jest.fn() },
      Transition: {
        Together: 'Together',
        In: 'In',
        Out: 'Out',
      },
    },
    Easing: {
      in: jest.fn(),
      out: jest.fn(),
      inOut: jest.fn(),
    },
    useSharedValue: jest.fn(() => ({ value: 0 })),
    useAnimatedStyle: jest.fn(() => ({})),
    withTiming: jest.fn((value) => value),
    withSpring: jest.fn((value) => value),
    withDelay: jest.fn((_, value) => value),
    withRepeat: jest.fn((value) => value),
    withSequence: jest.fn((...values) => values[values.length - 1]),
    runOnJS: jest.fn((fn) => fn),
    interpolate: jest.fn(),
  };
  return mockReanimated;
});

// Mock Gesture Handler
jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native/Libraries/Components/View/View');
  return {
    Swipeable: View,
    DrawerLayout: View,
    State: {},
    ScrollView: View,
    Slider: View,
    Switch: View,
    TextInput: View,
    ToolbarAndroid: View,
    ViewPagerAndroid: View,
    DrawerLayoutAndroid: View,
    WebView: View,
    NativeViewGestureHandler: View,
    TapGestureHandler: View,
    FlingGestureHandler: View,
    ForceTouchGestureHandler: View,
    LongPressGestureHandler: View,
    PanGestureHandler: View,
    PinchGestureHandler: View,
    RotationGestureHandler: View,
    RawButton: View,
    BaseButton: View,
    RectButton: View,
    BorderlessButton: View,
    FlatList: View,
    gestureHandlerRootHOC: jest.fn(component => component),
    Directions: {},
  };
});

// Mock Haptic Feedback
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

// Global test utilities
declare global {
  var __TEST__: boolean;
}
(global as any).__TEST__ = true;

// Suppress console warnings in tests unless explicitly testing them
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.error = (...args: any[]) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning:') || 
     args[0].includes('ComponentsProvider') ||
     args[0].includes('useNativeDriver'))
  ) {
    return;
  }
  originalConsoleError.call(console, ...args);
};

console.warn = (...args: any[]) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning:') || 
     args[0].includes('ComponentsProvider'))
  ) {
    return;
  }
  originalConsoleWarn.call(console, ...args);
};

// Privacy-safe test environment
process.env.NODE_ENV = 'test';
process.env.EXPO_NO_CACHE = '1';
process.env.EXPO_NO_TELEMETRY = '1';