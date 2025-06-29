'use client';

import type React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

// Create a client
const createQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Time before refetching on window focus
        staleTime: 1000 * 60 * 5, // 5 minutes
        // Time before garbage collection
        gcTime: 1000 * 60 * 30, // 30 minutes (was cacheTime)
        // Retry configuration
        retry: (failureCount, error) => {
          // Don't retry on 4xx errors except for 408, 429
          if (error instanceof Error) {
            const message = error.message.toLowerCase();
            if (message.includes('unauthorized') || message.includes('forbidden')) {
              return false;
            }
          }
          return failureCount < 3;
        },
        // Retry delay with exponential backoff
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        // Refetch on window focus (useful for keeping data fresh)
        refetchOnWindowFocus: false,
        // Don't refetch on reconnect by default (to avoid excessive requests)
        refetchOnReconnect: 'always',
        // Network mode for handling offline scenarios
        networkMode: 'online',
      },
      mutations: {
        // Retry mutations on network errors
        retry: (failureCount, error) => {
          if (error instanceof Error) {
            const message = error.message.toLowerCase();
            // Don't retry on auth or validation errors
            if (message.includes('unauthorized') || 
                message.includes('forbidden') || 
                message.includes('validation')) {
              return false;
            }
          }
          return failureCount < 2;
        },
        // Retry delay for mutations
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
        // Network mode for mutations
        networkMode: 'online',
      },
    },
  });
};

let clientSingleton: QueryClient | undefined = undefined;

const getQueryClient = () => {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return createQueryClient();
  } else {
    // Browser: make a new query client if we don't already have one
    // This is very important, so we don't re-make a new client if React
    // suspends during the initial render. This may not be needed if we
    // have a suspense boundary BELOW the creation of the query client
    if (!clientSingleton) clientSingleton = createQueryClient();
    return clientSingleton;
  }
};

interface QueryProviderProps {
  children: React.ReactNode;
}

export const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
  const [queryClient] = useState(() => getQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools 
        initialIsOpen={false} 
        buttonPosition="bottom-left"
        position="bottom"
      />
    </QueryClientProvider>
  );
}; 