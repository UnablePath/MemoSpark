'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { 
  Activity, 
  Database, 
  Zap, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown,
  Clock,
  Target,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getAPIMonitor, type APICallData } from '@/lib/performance/api-monitor';

interface PerformanceMonitorDashboardProps {
  isVisible?: boolean;
  onToggle?: () => void;
}

interface APIStats {
  totalCalls: number;
  achievementCalls: number;
  gamificationCalls: number;
  cacheHitRate: number;
  avgResponseTime: number;
  callsPerMinute: number;
  uptime: number;
}

export const PerformanceMonitorDashboard: React.FC<PerformanceMonitorDashboardProps> = ({
  isVisible = false,
  onToggle
}) => {
  const { metrics, resetMetrics, getPerformanceSummary, logMetrics } = usePerformanceMonitor();
  const [summary, setSummary] = useState(getPerformanceSummary());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [apiStats, setApiStats] = useState<APIStats | null>(null);
  const [apiLog, setApiLog] = useState<APICallData[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);

  // Auto-refresh summary every 5 seconds
  useEffect(() => {
    if (!autoRefresh || !isVisible) return;

    const interval = setInterval(() => {
      setSummary(getPerformanceSummary());
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh, isVisible, getPerformanceSummary]);

  // Manual refresh
  const handleRefresh = () => {
    setSummary(getPerformanceSummary());
  };

  // Determine performance status
  const getPerformanceStatus = () => {
    if (metrics.cacheHitRate >= 80) return { status: 'excellent', color: 'text-green-600', icon: CheckCircle };
    if (metrics.cacheHitRate >= 60) return { status: 'good', color: 'text-blue-600', icon: TrendingUp };
    if (metrics.cacheHitRate >= 40) return { status: 'fair', color: 'text-yellow-600', icon: AlertTriangle };
    return { status: 'poor', color: 'text-red-600', icon: TrendingDown };
  };

  const performanceStatus = getPerformanceStatus();
  const StatusIcon = performanceStatus.icon;

  // Calculate improvement metrics
  const totalRequests = metrics.cacheHitCount + metrics.cacheMissCount;
  const apiReduction = totalRequests > 0 ? ((metrics.cacheHitCount / totalRequests) * 100) : 0;
  const targetMet = apiReduction >= 60;

  useEffect(() => {
    const monitor = getAPIMonitor();
    if (monitor) {
      setIsMonitoring(true);
      
      const interval = setInterval(() => {
        setApiStats(monitor.getStats());
        setApiLog(monitor.getDetailedLog());
      }, 1000);

      return () => clearInterval(interval);
    }
  }, []);

  const resetMonitoring = () => {
    const monitor = getAPIMonitor();
    if (monitor) {
      monitor.reset();
      setApiStats(null);
      setApiLog([]);
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-green-600';
    if (status >= 400) return 'text-red-600';
    return 'text-yellow-600';
  };

  const getCacheHitColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={onToggle}
          variant="outline"
          size="sm"
          className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
        >
          <Activity className="w-4 h-4 mr-2" />
          Performance
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-[80vh] overflow-y-auto">
      <Card className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              Performance Monitor
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                onClick={handleRefresh}
                variant="ghost"
                size="sm"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button
                onClick={onToggle}
                variant="ghost"
                size="sm"
              >
                ×
              </Button>
            </div>
          </div>
          <CardDescription>
            Real-time API request and cache performance metrics
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Performance Status */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center space-x-2">
              <StatusIcon className={`w-5 h-5 ${performanceStatus.color}`} />
              <span className="font-medium">Cache Performance</span>
            </div>
            <Badge 
              variant={targetMet ? "default" : "secondary"}
              className={targetMet ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : ""}
            >
              {performanceStatus.status.toUpperCase()}
            </Badge>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-muted/30">
              <div className="flex items-center space-x-2 mb-1">
                <Database className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium">Cache Hit Rate</span>
              </div>
              <div className="text-2xl font-bold">
                {metrics.cacheHitRate.toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground">
                {metrics.cacheHitCount} hits / {totalRequests} total
              </div>
            </div>

            <div className="p-3 rounded-lg bg-muted/30">
              <div className="flex items-center space-x-2 mb-1">
                <Target className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium">API Reduction</span>
              </div>
              <div className="text-2xl font-bold">
                {apiReduction.toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground">
                Target: 60%+ {targetMet ? '✓' : '✗'}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-muted/30">
              <div className="flex items-center space-x-2 mb-1">
                <Zap className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-medium">API Calls</span>
              </div>
              <div className="text-2xl font-bold">
                {metrics.apiRequestCount}
              </div>
              <div className="text-xs text-muted-foreground">
                Since {metrics.lastResetTime.toLocaleTimeString()}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-muted/30">
              <div className="flex items-center space-x-2 mb-1">
                <Clock className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-medium">Triggers</span>
              </div>
              <div className="text-2xl font-bold">
                {metrics.achievementTriggerCount}
              </div>
              <div className="text-xs text-muted-foreground">
                Achievement POSTs
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Recent Activity (5min)</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span>Total Requests:</span>
                <span className="font-mono">{summary.totalRequests}</span>
              </div>
              <div className="flex justify-between">
                <span>API Calls:</span>
                <span className="font-mono">{summary.apiCalls}</span>
              </div>
              <div className="flex justify-between">
                <span>Cache Hits:</span>
                <span className="font-mono">{summary.cacheHits}</span>
              </div>
              <div className="flex justify-between">
                <span>Req/Min:</span>
                <span className="font-mono">{summary.requestsPerMinute.toFixed(1)}</span>
              </div>
            </div>
          </div>

          {/* Performance Recommendations */}
          {metrics.cacheHitRate < 60 && (
            <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center space-x-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Performance Recommendation
                </span>
              </div>
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                Cache hit rate is below 60%. Consider increasing staleTime or checking for redundant API calls.
              </p>
            </div>
          )}

          {targetMet && (
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <div className="flex items-center space-x-2 mb-1">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-800 dark:text-green-200">
                  Target Achieved!
                </span>
              </div>
              <p className="text-xs text-green-700 dark:text-green-300">
                Successfully reduced API requests by {apiReduction.toFixed(1)}% through caching optimization.
              </p>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-between pt-2 border-t">
            <Button
              onClick={() => setAutoRefresh(!autoRefresh)}
              variant="ghost"
              size="sm"
            >
              {autoRefresh ? 'Pause' : 'Resume'} Auto-refresh
            </Button>
            <div className="flex space-x-2">
              <Button
                onClick={logMetrics}
                variant="ghost"
                size="sm"
              >
                Log to Console
              </Button>
              <Button
                onClick={resetMetrics}
                variant="ghost"
                size="sm"
              >
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 