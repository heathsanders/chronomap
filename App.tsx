import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import 'react-native-gesture-handler';

import AppNavigator from '@/navigation/AppNavigator';
import { ErrorBoundary } from '@/components/common';

// Create React Query client for data caching and state management
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AppNavigator />
        <StatusBar style="auto" />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}