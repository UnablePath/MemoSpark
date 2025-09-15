'use client';

import { useState, useCallback, useRef } from 'react';

interface RetryConfig {
  maxRetries?: number;
  retryDelay?: number;
  backoffMultiplier?: number;
  retryCondition?: (error: Error) => boolean;
}

interface RetryState<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  retryCount: number;
  isRetrying: boolean;
}

const defaultConfig: Required<RetryConfig> = {
  maxRetries: 3,
  retryDelay: 1000,
  backoffMultiplier: 2,
  retryCondition: (error: Error) => {
    // Retry on network errors, timeouts, and 5xx server errors
    const retryableErrors = [
      'fetch',
      'network',
      'timeout',
      'ERR_NETWORK',
      'ERR_INTERNET_DISCONNECTED',
    ];
    
    const errorMessage = error.message.toLowerCase();
    const isNetworkError = retryableErrors.some(msg => errorMessage.includes(msg));
    
    // Check for HTTP status codes that should be retried
    const isServerError = error.message.includes('500') || 
                          error.message.includes('502') || 
                          error.message.includes('503') || 
                          error.message.includes('504');
    
    return isNetworkError || isServerError;
  },
};

export function useRetryableRequest<T>(
  requestFn: () => Promise<T>,
  config: RetryConfig = {}
) {
  const mergedConfig = { ...defaultConfig, ...config };
  const [state, setState] = useState<RetryState<T>>({
    data: null,
    error: null,
    isLoading: false,
    retryCount: 0,
    isRetrying: false,
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const execute = useCallback(async (isRetry = false) => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      isRetrying: isRetry,
      error: isRetry ? prev.error : null,
    }));

    try {
      const data = await requestFn();
      setState(prev => ({
        ...prev,
        data,
        error: null,
        isLoading: false,
        isRetrying: false,
        retryCount: 0,
      }));
      return data;
    } catch (error) {
      const err = error as Error;
      console.error('Request failed:', err);

      setState(prev => {
        const newRetryCount = isRetry ? prev.retryCount + 1 : 1;
        const shouldRetry = 
          newRetryCount <= mergedConfig.maxRetries && 
          mergedConfig.retryCondition(err);

        if (shouldRetry) {
          // Schedule retry with exponential backoff
          const delay = mergedConfig.retryDelay * 
            Math.pow(mergedConfig.backoffMultiplier, newRetryCount - 1);
          
          timeoutRef.current = setTimeout(() => {
            execute(true);
          }, delay);

          console.log(`Retrying request in ${delay}ms (attempt ${newRetryCount}/${mergedConfig.maxRetries})`);
        }

        return {
          ...prev,
          error: err,
          isLoading: shouldRetry,
          isRetrying: shouldRetry,
          retryCount: newRetryCount,
        };
      });

      throw err;
    }
  }, [requestFn, mergedConfig]);

  const retry = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setState(prev => ({ ...prev, retryCount: 0 }));
    execute();
  }, [execute]);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setState(prev => ({
      ...prev,
      isLoading: false,
      isRetrying: false,
    }));
  }, []);

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    ...state,
    execute,
    retry,
    cancel,
    canRetry: state.retryCount < mergedConfig.maxRetries,
    nextRetryIn: state.isRetrying ? 
      mergedConfig.retryDelay * Math.pow(mergedConfig.backoffMultiplier, state.retryCount - 1) : 
      null,
  };
}

// Specialized hook for fetch requests
export function useRetryableFetch<T>(
  url: string,
  options?: RequestInit,
  config?: RetryConfig
) {
  const requestFn = useCallback(async (): Promise<T> => {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }, [url, options]);

  return useRetryableRequest(requestFn, config);
}

// Hook for retrying React Query requests
export function useRetryableQuery<T>(
  queryFn: () => Promise<T>,
  config?: RetryConfig & {
    staleTime?: number;
    cacheTime?: number;
  }
) {
  const [lastSuccessTime, setLastSuccessTime] = useState<number>(0);
  const retryableRequest = useRetryableRequest(queryFn, config);

  const executeWithCache = useCallback(async () => {
    const now = Date.now();
    const staleTime = config?.staleTime || 5 * 60 * 1000; // 5 minutes default
    
    // Return cached data if still fresh
    if (
      retryableRequest.data && 
      now - lastSuccessTime < staleTime
    ) {
      return retryableRequest.data;
    }

    const result = await retryableRequest.execute();
    setLastSuccessTime(now);
    return result;
  }, [retryableRequest, lastSuccessTime, config?.staleTime]);

  return {
    ...retryableRequest,
    execute: executeWithCache,
    isFresh: Date.now() - lastSuccessTime < (config?.staleTime || 5 * 60 * 1000),
  };
}

