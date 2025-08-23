import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { QueryProvider } from '../../components/common/QueryProvider';

// Custom render function that includes common providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialState?: any;
  queryClient?: QueryClient;
}

// Create a test query client with disabled retries and shorter timeouts
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      cacheTime: 0,
      staleTime: 0,
    },
    mutations: {
      retry: false,
    },
  },
  logger: {
    log: () => {},
    warn: () => {},
    error: () => {},
  },
});

const AllTheProviders: React.FC<{ 
  children: React.ReactNode;
  queryClient?: QueryClient;
}> = ({ children, queryClient }) => {
  const testQueryClient = queryClient || createTestQueryClient();
  
  return (
    <QueryProvider client={testQueryClient}>
      {children}
    </QueryProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { queryClient, ...renderOptions } = options;
  
  return render(ui, {
    wrapper: ({ children }) => 
      <AllTheProviders queryClient={queryClient}>
        {children}
      </AllTheProviders>,
    ...renderOptions,
  });
};

// Render hook with providers
export const renderWithProviders = customRender;

// Test data generators
export const generateMockPhoto = (overrides: any = {}) => ({
  id: `photo-${Math.random().toString(36).substr(2, 9)}`,
  uri: `file://test-photo-${Date.now()}.jpg`,
  filename: `test-photo-${Date.now()}.jpg`,
  width: 1920,
  height: 1080,
  creationTime: Date.now() - Math.random() * 86400000 * 30, // Random time in last 30 days
  modificationTime: Date.now() - Math.random() * 86400000 * 30,
  duration: null,
  mediaType: 'photo',
  fileSize: Math.floor(Math.random() * 5000000) + 100000, // 100KB - 5MB
  isDeleted: false,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
});

export const generateMockPhotos = (count: number, overrides: any = {}) => 
  Array.from({ length: count }, (_, index) => 
    generateMockPhoto({ 
      id: `photo-${index + 1}`,
      filename: `photo-${index + 1}.jpg`,
      ...overrides 
    })
  );

export const generateMockPhotoWithLocation = (lat: number, lng: number, overrides: any = {}) =>
  generateMockPhoto({
    latitude: lat,
    longitude: lng,
    ...overrides,
  });

// Date utilities for testing
export const createDateRange = (daysAgo: number, daysDuration: number = 1) => {
  const endDate = Date.now() - (daysAgo * 86400000);
  const startDate = endDate - (daysDuration * 86400000);
  return { startDate, endDate };
};

export const groupPhotosByDate = (photos: any[]) => {
  const grouped: { [key: string]: any[] } = {};
  
  photos.forEach(photo => {
    const date = new Date(photo.creationTime).toDateString();
    if (!grouped[date]) {
      grouped[date] = [];
    }
    grouped[date].push(photo);
  });
  
  return Object.entries(grouped).map(([date, photos]) => ({
    id: date,
    date,
    displayDate: date,
    photos: photos.sort((a, b) => b.creationTime - a.creationTime),
  }));
};

// Performance testing utilities
export const measureRenderTime = async (renderFn: () => void) => {
  const start = performance.now();
  renderFn();
  const end = performance.now();
  return end - start;
};

export const waitForNextTick = () => new Promise(resolve => setImmediate(resolve));

export const waitFor = (condition: () => boolean, timeout: number = 5000) =>
  new Promise((resolve, reject) => {
    const startTime = Date.now();
    const check = () => {
      if (condition()) {
        resolve(true);
      } else if (Date.now() - startTime > timeout) {
        reject(new Error('Timeout waiting for condition'));
      } else {
        setTimeout(check, 10);
      }
    };
    check();
  });

// State testing utilities
export const createMockStore = () => ({
  photos: [],
  selectedPhotos: new Set(),
  isLoading: false,
  error: null,
  lastScanTime: null,
  totalPhotoCount: 0,
  setPhotos: jest.fn(),
  addPhoto: jest.fn(),
  addPhotos: jest.fn(),
  removePhoto: jest.fn(),
  updatePhoto: jest.fn(),
  togglePhotoSelection: jest.fn(),
  selectPhotos: jest.fn(),
  clearSelection: jest.fn(),
  setLoading: jest.fn(),
  setError: jest.fn(),
  updateScanTime: jest.fn(),
  setTotalPhotoCount: jest.fn(),
  reset: jest.fn(),
});

// Cache testing utilities
export const createMockCache = () => {
  const cache = new Map();
  return {
    get: jest.fn((type: string, key: string) => cache.get(`${type}:${key}`)),
    set: jest.fn((type: string, key: string, value: any) => cache.set(`${type}:${key}`, value)),
    has: jest.fn((type: string, key: string) => cache.has(`${type}:${key}`)),
    delete: jest.fn((type: string, key: string) => cache.delete(`${type}:${key}`)),
    clear: jest.fn(() => cache.clear()),
    size: () => cache.size,
  };
};

// Privacy testing utilities
export const assertNoPersonalData = (obj: any) => {
  const str = JSON.stringify(obj);
  
  // Check for common personal data patterns
  expect(str).not.toMatch(/\/Users\//);
  expect(str).not.toMatch(/\/private\//);
  expect(str).not.toMatch(/file:\/\//);
  expect(str).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // ISO dates
  expect(str).not.toMatch(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/); // IP addresses
  expect(str).not.toMatch(/@/); // Email addresses
};

export const sanitizeForTesting = (obj: any) => {
  const sanitized = JSON.parse(JSON.stringify(obj));
  
  const sanitizeValue = (value: any): any => {
    if (typeof value === 'string') {
      return value
        .replace(/\/Users\/[^/]+/, '/Users/testuser')
        .replace(/\/private\/[^/]+/, '/private/testdir')
        .replace(/file:\/\/.*/, 'file://test-file.jpg');
    }
    
    if (Array.isArray(value)) {
      return value.map(sanitizeValue);
    }
    
    if (value && typeof value === 'object') {
      const result: any = {};
      for (const [key, val] of Object.entries(value)) {
        result[key] = sanitizeValue(val);
      }
      return result;
    }
    
    return value;
  };
  
  return sanitizeValue(sanitized);
};

// Component testing utilities
export const findPhotoItems = (container: any) => 
  container.getAllByTestId(/photo-item-/);

export const findPhotoById = (container: any, photoId: string) => 
  container.getByTestId(`photo-item-${photoId}`);

export const simulatePhotoPress = (photoItem: any) => {
  // Simulate press event
  photoItem.props.onPress?.();
};

export const simulatePhotoLongPress = (photoItem: any) => {
  // Simulate long press event
  photoItem.props.onLongPress?.();
};

// Error simulation utilities
export const simulateNetworkError = () => {
  const error = new Error('Network request failed');
  error.name = 'NetworkError';
  return error;
};

export const simulatePermissionError = () => {
  const error = new Error('Permission denied');
  error.name = 'PermissionError';
  return error;
};

export const simulateStorageError = () => {
  const error = new Error('Insufficient storage space');
  error.name = 'StorageError';
  return error;
};

// Export everything from React Testing Library
export * from '@testing-library/react-native';
export { customRender as render };