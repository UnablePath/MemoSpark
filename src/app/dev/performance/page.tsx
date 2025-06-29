'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PerformanceMonitorDashboard } from '@/components/dev/PerformanceMonitorDashboard';
import { PerformanceTestScenarios } from '@/components/dev/PerformanceTestScenarios';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { getAPIMonitor, type APICallData } from '@/lib/performance/api-monitor';
import { 
  Activity, 
  Database, 
  Zap, 
  Clock,
  Target,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  TrendingUp,
  BarChart3
} from 'lucide-react';

interface APIStats {
  totalCalls: number;
  achievementCalls: number;
  gamificationCalls: number;
  cacheHitRate: number;
  avgResponseTime: number;
  callsPerMinute: number;
  uptime: number;
}

export default function PerformancePage() {
  const { metrics, resetMetrics, getPerformanceSummary } = usePerformanceMonitor();
  const [summary, setSummary] = useState(getPerformanceSummary());
  const [apiStats, setApiStats] = useState<APIStats | null>(null);
  const [apiLog, setApiLog] = useState<APICallData[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    const monitor = getAPIMonitor();
    if (monitor) {
      setIsMonitoring(true);
      
      const interval = setInterval(() => {
        setApiStats(monitor.getStats());
        setApiLog(monitor.getDetailedLog());
        setSummary(getPerformanceSummary());
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [getPerformanceSummary]);

  const resetMonitoring = () => {
    const monitor = getAPIMonitor();
    if (monitor) {
      monitor.reset();
      setApiStats(null);
      setApiLog([]);
    }
    resetMetrics();
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

  // Calculate performance metrics
  const totalRequests = metrics.cacheHitCount + metrics.cacheMissCount;
  const apiReduction = totalRequests > 0 ? ((metrics.cacheHitCount / totalRequests) * 100) : 0;
  const targetMet = apiReduction >= 60;
  const effectiveCacheRate = apiStats?.cacheHitRate || metrics.cacheHitRate;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Performance Testing Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor API performance, cache effectiveness, and verify 60%+ request reduction goal
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant={isMonitoring ? "default" : "secondary"}>
            {isMonitoring ? "Monitoring Active" : "Monitoring Inactive"}
          </Badge>
          <Button onClick={resetMonitoring} variant="outline" size="sm">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset All Stats
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="api">API Monitor</TabsTrigger>
          <TabsTrigger value="testing">Test Scenarios</TabsTrigger>
          <TabsTrigger value="logs">Request Logs</TabsTrigger>
          <TabsTrigger value="analysis">Performance Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Performance Goal Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                60% API Reduction Goal Status
              </CardTitle>
              <CardDescription>
                Tracking progress toward the primary performance optimization target
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className={`p-4 rounded-lg border-2 ${targetMet ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {targetMet ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    )}
                    <span className="font-medium">API Reduction</span>
                  </div>
                  <div className={`text-3xl font-bold ${targetMet ? 'text-green-600' : 'text-yellow-600'}`}>
                    {Math.round(apiReduction)}%
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {targetMet ? 'Target achieved!' : 'Target: 60%+'}
                  </p>
                </div>

                <div className="p-4 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="h-5 w-5 text-blue-500" />
                    <span className="font-medium">Cache Hit Rate</span>
                  </div>
                  <div className={`text-3xl font-bold ${getCacheHitColor(effectiveCacheRate)}`}>
                    {Math.round(effectiveCacheRate)}%
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {metrics.cacheHitCount} hits / {totalRequests} total
                  </p>
                </div>

                <div className="p-4 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="h-5 w-5 text-purple-500" />
                    <span className="font-medium">API Calls (1min)</span>
                  </div>
                  <div className="text-3xl font-bold">
                    {apiStats?.totalCalls || summary.totalRequests}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {apiStats?.callsPerMinute || 0} calls/min
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Achievement API</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{apiStats?.achievementCalls || 0}</div>
                <p className="text-xs text-muted-foreground">requests/min</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Gamification API</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{apiStats?.gamificationCalls || 0}</div>
                <p className="text-xs text-muted-foreground">requests/min</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{apiStats?.avgResponseTime || 0}ms</div>
                <p className="text-xs text-muted-foreground">network calls</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Session Uptime</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{apiStats?.uptime || 0}s</div>
                <p className="text-xs text-muted-foreground">monitoring time</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="api" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>API Request Breakdown</CardTitle>
                <CardDescription>Real-time monitoring of API endpoint usage</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 border rounded">
                  <span className="font-medium">/api/achievements</span>
                  <Badge variant="outline">{apiStats?.achievementCalls || 0} calls</Badge>
                </div>
                <div className="flex justify-between items-center p-3 border rounded">
                  <span className="font-medium">/api/gamification/*</span>
                  <Badge variant="outline">{apiStats?.gamificationCalls || 0} calls</Badge>
                </div>
                <div className="flex justify-between items-center p-3 border rounded">
                  <span className="font-medium">Total API Requests</span>
                  <Badge>{apiStats?.totalCalls || 0} calls</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cache Performance</CardTitle>
                <CardDescription>React Query caching effectiveness</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 border rounded">
                  <span className="font-medium">Cache Hit Rate</span>
                  <Badge className={getCacheHitColor(effectiveCacheRate)}>
                    {Math.round(effectiveCacheRate)}%
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-3 border rounded">
                  <span className="font-medium">Cache Hits</span>
                  <Badge variant="outline">{metrics.cacheHitCount}</Badge>
                </div>
                <div className="flex justify-between items-center p-3 border rounded">
                  <span className="font-medium">Cache Misses</span>
                  <Badge variant="outline">{metrics.cacheMissCount}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="testing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance Test Scenarios</CardTitle>
              <CardDescription>
                Run different scenarios to test API performance and caching behavior
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PerformanceTestScenarios />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>API Request Log</CardTitle>
              <CardDescription>
                Detailed log of recent API requests with timing and cache status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {apiLog.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No API requests logged yet</p>
                    <p className="text-sm">Navigate around the app to see requests appear here</p>
                  </div>
                ) : (
                  apiLog.map((call, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                      <div className="flex-1">
                        <div className="font-mono text-sm">
                          <span className="font-bold">{call.method}</span> {call.endpoint.split('/api')[1] || call.endpoint}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatTime(call.timestamp)}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={call.cached ? "default" : "secondary"}>
                          {call.cached ? "Cached" : "Network"}
                        </Badge>
                        <span className={`text-sm font-mono ${getStatusColor(call.status || 0)}`}>
                          {call.status}
                        </span>
                        <span className="text-sm text-muted-foreground font-mono">
                          {call.responseTime}ms
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Performance Assessment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className={`p-3 rounded-lg border-l-4 ${
                  effectiveCacheRate >= 80 ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 
                  effectiveCacheRate >= 60 ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' :
                  'border-red-500 bg-red-50 dark:bg-red-900/20'
                }`}>
                  <div className="font-medium">Cache Performance</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {effectiveCacheRate >= 80 
                      ? '✅ Excellent cache hit rate - API requests are being effectively cached'
                      : effectiveCacheRate >= 60
                      ? '⚠️ Good cache performance - some room for improvement'
                      : '❌ Cache hit rate below target - review caching strategy'
                    }
                  </div>
                </div>
                
                <div className={`p-3 rounded-lg border-l-4 ${
                  targetMet ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-red-500 bg-red-50 dark:bg-red-900/20'
                }`}>
                  <div className="font-medium">60% API Reduction Goal</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {targetMet
                      ? '✅ Target achieved! API requests reduced by 60%+ through effective caching'
                      : '❌ Target not met - need to improve caching and reduce redundant API calls'
                    }
                  </div>
                </div>
                
                <div className={`p-3 rounded-lg border-l-4 ${
                  (apiStats?.avgResponseTime || 0) < 200 ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                }`}>
                  <div className="font-medium">Response Time</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {(apiStats?.avgResponseTime || 0) < 200
                      ? '✅ Fast response times - good network performance'
                      : '⚠️ Response times could be improved - check network conditions'
                    }
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Optimization Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!targetMet && (
                  <div className="p-3 border rounded-lg">
                    <div className="font-medium text-sm">Increase Cache Duration</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Consider increasing staleTime in React Query configuration
                    </div>
                  </div>
                )}
                
                {effectiveCacheRate < 80 && (
                  <div className="p-3 border rounded-lg">
                    <div className="font-medium text-sm">Review Query Keys</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Ensure proper query key structure for better cache hits
                    </div>
                  </div>
                )}
                
                {(apiStats?.callsPerMinute || 0) > 20 && (
                  <div className="p-3 border rounded-lg">
                    <div className="font-medium text-sm">High Request Frequency</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Consider debouncing user interactions or increasing cache time
                    </div>
                  </div>
                )}
                
                <div className="p-3 border rounded-lg">
                  <div className="font-medium text-sm">Enable React Query DevTools</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Use the DevTools panel (bottom-left) to inspect cache behavior
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 