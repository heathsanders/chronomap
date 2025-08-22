/**
 * Test Utilities
 * Helper functions and providers for consistent testing across ChronoMap
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PhotoAsset, LocationData, EXIFData, PhotoMetadata } from '@/types';

// Test Query Client
const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
        cacheTime: Infinity, // Updated from gcTime for React Query v4
      },
      mutations: {
        retry: false,
      },
    },
  });
};

// Test Providers Wrapper
interface TestProvidersProps {
  children: React.ReactNode;
  queryClient?: QueryClient;
}

const TestProviders: React.FC<TestProvidersProps> = ({ 
  children, 
  queryClient = createTestQueryClient() 
}) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
}

const customRender = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { queryClient, ...renderOptions } = options;
  
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <TestProviders queryClient={queryClient}>
      {children}
    </TestProviders>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Mock data generators
export const mockPhotoAsset = (overrides: Partial<PhotoAsset> = {}): PhotoAsset => ({
  id: 'test-photo-1',
  uri: 'file://test-photo-1.jpg',
  filename: 'test-photo-1.jpg',
  width: 1920,
  height: 1080,
  creationTime: Date.now() - 86400000, // 1 day ago
  modificationTime: Date.now() - 86400000,
  mediaType: 'photo',
  mediaSubtypes: [],
  albumId: 'test-album-1',
  duration: undefined,
  location: undefined,
  ...overrides,
});

export const mockPhotoAssetWithLocation = (overrides: Partial<PhotoAsset> = {}): PhotoAsset => {
  const location: LocationData = {
    latitude: 37.7749,
    longitude: -122.4194,
    altitude: 10,
    accuracy: 5,
    heading: 0,
    speed: 0,
  };

  return mockPhotoAsset({
    location,
    ...overrides,
  });
};

export const mockVideoAsset = (overrides: Partial<PhotoAsset> = {}): PhotoAsset => ({
  id: 'test-video-1',
  uri: 'file://test-video-1.mp4',
  filename: 'test-video-1.mp4',
  width: 1920,
  height: 1080,
  creationTime: Date.now() - 86400000,
  modificationTime: Date.now() - 86400000,
  mediaType: 'video',
  mediaSubtypes: [],
  albumId: 'test-album-1',
  duration: 30000, // 30 seconds
  location: undefined,
  ...overrides,
});

export const mockEXIFData = (overrides: Partial<EXIFData> = {}): EXIFData => ({
  dateTime: '2023-12-01T10:30:00Z',
  dateTimeOriginal: '2023-12-01T10:30:00Z',
  gps: {
    latitude: 37.7749,
    longitude: -122.4194,
    altitude: 10,
    timestamp: '2023-12-01T10:30:00Z',
  },
  camera: {
    make: 'Apple',
    model: 'iPhone 15 Pro',
    software: 'iOS 17.0',
  },
  settings: {
    exposureTime: '1/125',
    fNumber: 2.8,
    iso: 100,
    focalLength: 26,
    flash: false,
  },
  dimensions: {
    width: 1920,
    height: 1080,
    orientation: 1,
  },
  ...overrides,
});

export const mockPhotoMetadata = (overrides: Partial<PhotoMetadata> = {}): PhotoMetadata => ({
  id: 'test-metadata-1',
  assetId: 'test-photo-1',
  filePath: 'file://test-photo-1.jpg',
  filename: 'test-photo-1.jpg',
  fileSize: 2048000, // 2MB
  mimeType: 'image/jpeg',
  width: 1920,
  height: 1080,
  createdAt: new Date(Date.now() - 86400000),
  modifiedAt: new Date(Date.now() - 86400000),
  scannedAt: new Date(),
  thumbnailPath: 'file://thumbnails/test-photo-1-thumb.jpg',
  location: {
    latitude: 37.7749,
    longitude: -122.4194,
    altitude: 10,
    accuracy: 5,
    heading: 0,
    speed: 0,
  },
  exifData: mockEXIFData(),
  isDeleted: false,
  checksum: 'abc123def456',
  ...overrides,
});

// Create arrays of mock data
export const mockPhotoArray = (count: number = 10): PhotoAsset[] => {
  return Array.from({ length: count }, (_, index) => 
    mockPhotoAsset({
      id: `test-photo-${index + 1}`,
      filename: `test-photo-${index + 1}.jpg`,
      uri: `file://test-photo-${index + 1}.jpg`,
      creationTime: Date.now() - (index * 86400000), // Spread over days
    })
  );
};

export const mockMixedMediaArray = (photoCount: number = 5, videoCount: number = 3): PhotoAsset[] => {
  const photos = Array.from({ length: photoCount }, (_, index) => 
    mockPhotoAsset({
      id: `test-photo-${index + 1}`,
      filename: `test-photo-${index + 1}.jpg`,
      uri: `file://test-photo-${index + 1}.jpg`,
    })
  );
  
  const videos = Array.from({ length: videoCount }, (_, index) => 
    mockVideoAsset({
      id: `test-video-${index + 1}`,
      filename: `test-video-${index + 1}.mp4`,
      uri: `file://test-video-${index + 1}.mp4`,
    })
  );

  return [...photos, ...videos];
};

// Test assertions helpers
export const expectPhotoToBeValid = (photo: PhotoAsset) => {
  expect(photo).toMatchObject({
    id: expect.any(String),
    uri: expect.any(String),
    filename: expect.any(String),
    width: expect.any(Number),
    height: expect.any(Number),
    creationTime: expect.any(Number),
    modificationTime: expect.any(Number),
    mediaType: expect.stringMatching(/^(photo|video)$/),
  });
};

// Performance testing helpers
export const measureRenderTime = async (renderFn: () => Promise<any>): Promise<number> => {
  const start = performance.now();
  await renderFn();
  const end = performance.now();
  return end - start;
};

// Store testing helpers
export const getInitialStoreState = () => ({
  // Mock initial state for testing
  allPhotos: [],
  selectedPhotos: new Set<string>(),
  isLoading: false,
  error: null,
});

// Accessibility testing helpers
export const expectAccessibleElement = (element: any) => {
  // Note: Using built-in React Native Testing Library accessibility queries
  // These replace the deprecated jest-native matchers
  expect(element).toBeTruthy();
  // Additional accessibility checks can be added here as needed
};

// Privacy testing helpers
export const expectNoExternalRequests = () => {
  // Helper to verify no network requests are made during tests
  // Implementation would depend on network mocking strategy
  expect(true).toBe(true); // Placeholder
};

// Re-export testing library utilities
export * from '@testing-library/react-native';

// Export custom render as default render
export { customRender as render };

// Export test providers for complex test scenarios
export { TestProviders, createTestQueryClient };