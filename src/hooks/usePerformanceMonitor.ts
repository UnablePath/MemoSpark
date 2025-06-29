'use client';

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface PerformanceMetrics {
  apiRequestCount: number;
  cacheHitCount: number;
  cacheMissCount: number;
  cacheHitRate: number;
  achievementTriggerCount: number;
  lastResetTime: Date;
}

interface RequestLog {
  timestamp: Date;
  endpoint: string;
  method: string;
  cached: boolean;
  source: 'api' | 'cache';
}

/**
 * Performance monitoring hook to track API requests and cache efficiency
 * Provides real-time metrics for performance optimization analysis
 */
export const usePerformanceMonitor = () => {
  const queryClient = useQueryClient();
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    apiRequestCount: 0,
    cacheHitCount: 0,
    cacheMissCount: 0,
    cacheHitRate: 0,
    achievementTriggerCount: 0,
    lastResetTime: new Date()
  });
  
  const requestLogs = useRef<RequestLog[]>([]);
  const originalFetch = useRef<typeof fetch>(fetch);

  useEffect(() => {
    // Store original fetch function
    if (!originalFetch.current) {
      originalFetch.current = window.fetch;
    }

    // Intercept fetch calls to track API requests
    window.fetch = async (...args) => {
      const [resource, options] = args;
      const url = resource.toString();
      const method = options?.method || 'GET';
      
      // Track achievement-related API calls
      if (url.includes('/api/achievements') || 
          url.includes('/api/gamification/balance') || 
          url.includes('/api/gamification/themes') ||
          url.includes('/api/gamification/purchase')) {
        
        // Check if this might be served from cache
        const queryKey = getQueryKeyFromUrl(url);
        const cachedData = queryKey ? queryClient.getQueryData(queryKey) : null;
        const isFromCache = cachedData !== undefined && method === 'GET';
        
        // Log the request
        const log: RequestLog = {
          timestamp: new Date(),
          endpoint: url,
          method,
          cached: isFromCache,
          source: isFromCache ? 'cache' : 'api'
        };
        
        requestLogs.current.push(log);
        
        // Update metrics
        setMetrics(prev => {
          const newApiCount = isFromCache ? prev.apiRequestCount : prev.apiRequestCount + 1;
          const newCacheHits = isFromCache ? prev.cacheHitCount + 1 : prev.cacheHitCount;
          const newCacheMisses = isFromCache ? prev.cacheMissCount : prev.cacheMissCount + 1;
          const totalRequests = newCacheHits + newCacheMisses;
          const newCacheHitRate = totalRequests > 0 ? (newCacheHits / totalRequests) * 100 : 0;
          
          // Track achievement triggers specifically
          const newAchievementTriggers = url.includes('/api/achievements') && method === 'POST' 
            ? prev.achievementTriggerCount + 1 
            : prev.achievementTriggerCount;
          
          return {
            ...prev,
            apiRequestCount: newApiCount,
            cacheHitCount: newCacheHits,
            cacheMissCount: newCacheMisses,
            cacheHitRate: newCacheHitRate,
            achievementTriggerCount: newAchievementTriggers
          };
        });
        
        // If served from cache, don't make actual API call
        if (isFromCache && method === 'GET') {
          console.log(`🎯 Cache hit for ${url}`);
          return new Response(JSON.stringify(cachedData), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
      
      // Make the actual API call
      const response = await originalFetch.current!(...args);
      
      // Log successful API calls
      if (url.includes('/api/achievements') || 
          url.includes('/api/gamification/balance') || 
          url.includes('/api/gamification/themes') ||
          url.includes('/api/gamification/purchase')) {
        console.log(`🌐 API call to ${url} - Status: ${response.status}`);
      }
      
      return response;
    };

    // Cleanup on unmount
    return () => {
      if (originalFetch.current) {
        window.fetch = originalFetch.current;
      }
    };
  }, [queryClient]);

  // Helper function to map URLs to query keys
  const getQueryKeyFromUrl = (url: string) => {
    if (url.includes('/api/achievements')) {
      return ['achievements', 'list'];
    }
    if (url.includes('/api/gamification/balance')) {
      return ['achievements', 'balance'];
    }
    if (url.includes('/api/gamification/themes')) {
      return ['achievements', 'themes'];
    }
    return null;
  };

  // Reset metrics
  const resetMetrics = () => {
    setMetrics({
      apiRequestCount: 0,
      cacheHitCount: 0,
      cacheMissCount: 0,
      cacheHitRate: 0,
      achievementTriggerCount: 0,
      lastResetTime: new Date()
    });
    requestLogs.current = [];
    console.log('📊 Performance metrics reset');
  };

  // Get recent request logs
  const getRecentLogs = (minutes: number = 5) => {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return requestLogs.current.filter(log => log.timestamp > cutoff);
  };

  // Get performance summary
  const getPerformanceSummary = () => {
    const recentLogs = getRecentLogs();
    const apiCalls = recentLogs.filter(log => log.source === 'api').length;
    const cacheHits = recentLogs.filter(log => log.source === 'cache').length;
    const achievementTriggers = recentLogs.filter(log => 
      log.endpoint.includes('/api/achievements') && log.method === 'POST'
    ).length;
    
    return {
      totalRequests: recentLogs.length,
      apiCalls,
      cacheHits,
      cacheHitRate: recentLogs.length > 0 ? (cacheHits / recentLogs.length) * 100 : 0,
      achievementTriggers,
      requestsPerMinute: recentLogs.length / 5,
      timeRange: '5 minutes'
    };
  };

  // Log performance metrics to console
  const logMetrics = () => {
    const summary = getPerformanceSummary();
    console.group('📊 Performance Metrics');
    console.log('Overall Metrics:', metrics);
    console.log('Recent Activity (5min):', summary);
    console.log('Recent Request Logs:', getRecentLogs());
    console.groupEnd();
  };

  return {
    metrics,
    resetMetrics,
    getRecentLogs,
    getPerformanceSummary,
    logMetrics,
    requestLogs: requestLogs.current
  };
}; 