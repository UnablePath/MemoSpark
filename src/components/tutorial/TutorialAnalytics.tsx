'use client';

import React, { memo, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TutorialErrorHandler } from '@/lib/tutorial/TutorialErrorHandler';
import { cn } from '@/lib/utils';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  SkipForward
} from 'lucide-react';

interface TutorialAnalyticsProps {
  className?: string;
}

interface AnalyticsData {
  totalUsers: number;
  completionRate: number;
  averageTimeToComplete: number;
  mostSkippedStep: string | null;
  errorStats: {
    totalErrors: number;
    errorsByCode: Record<string, number>;
    recentErrors: any[];
    mostCommonError: string | null;
  };
}

// Mock data - in a real app, this would come from your analytics service
const mockAnalyticsData: AnalyticsData = {
  totalUsers: 1247,
  completionRate: 73.2,
  averageTimeToComplete: 8.5, // minutes
  mostSkippedStep: 'task_creation',
  errorStats: {
    totalErrors: 89,
    errorsByCode: {
      'ACTION_TIMEOUT': 32,
      'ELEMENT_NOT_FOUND': 28,
      'NETWORK_ERROR': 15,
      'DATABASE_ERROR': 8,
      'INVALID_STATE': 6
    },
    recentErrors: [],
    mostCommonError: 'ACTION_TIMEOUT'
  }
};

export const TutorialAnalytics: React.FC<TutorialAnalyticsProps> = memo(({ 
  className 
}) => {
  const errorHandler = useMemo(() => TutorialErrorHandler.getInstance(), []);
  
  // Get real error stats
  const errorStats = useMemo(() => errorHandler.getErrorStats(), [errorHandler]);
  
  // Combine mock data with real error stats for demo
  const analyticsData = useMemo((): AnalyticsData => ({
    ...mockAnalyticsData,
    errorStats: errorStats.totalErrors > 0 ? errorStats : mockAnalyticsData.errorStats
  }), [errorStats]);

  const completionRateColor = useMemo(() => {
    if (analyticsData.completionRate >= 80) return 'text-green-600';
    if (analyticsData.completionRate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  }, [analyticsData.completionRate]);

  const formatTime = (minutes: number): string => {
    if (minutes < 1) return `${Math.round(minutes * 60)}s`;
    if (minutes < 60) return `${minutes.toFixed(1)}m`;
    return `${Math.floor(minutes / 60)}h ${Math.round(minutes % 60)}m`;
  };

  const getErrorSeverity = (errorCode: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    const criticalErrors = ['DATABASE_ERROR', 'NETWORK_ERROR'];
    const warningErrors = ['ACTION_TIMEOUT', 'ELEMENT_NOT_FOUND'];
    
    if (criticalErrors.includes(errorCode)) return 'destructive';
    if (warningErrors.includes(errorCode)) return 'secondary';
    return 'outline';
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Users who started tutorial
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", completionRateColor)}>
              {analyticsData.completionRate}%
            </div>
            <Progress 
              value={analyticsData.completionRate} 
              className="mt-2 h-2" 
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatTime(analyticsData.averageTimeToComplete)}
            </div>
            <p className="text-xs text-muted-foreground">
              To complete tutorial
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Errors</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {analyticsData.errorStats.totalErrors}
            </div>
            <p className="text-xs text-muted-foreground">
              Errors encountered
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Error Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Error Breakdown
            </CardTitle>
            <CardDescription>
              Most common errors encountered during tutorial
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(analyticsData.errorStats.errorsByCode)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 5)
              .map(([errorCode, count]) => (
                <div key={errorCode} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={getErrorSeverity(errorCode)}>
                      {errorCode.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-muted-foreground">
                      {count} errors
                    </div>
                    <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-red-500 transition-all duration-300"
                        style={{ 
                          width: `${(count / analyticsData.errorStats.totalErrors) * 100}%` 
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>

        {/* Step Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Step Performance
            </CardTitle>
            <CardDescription>
              How users interact with each tutorial step
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Most Skipped Step */}
            <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center gap-2">
                <SkipForward className="h-4 w-4 text-yellow-600" />
                <div>
                  <p className="text-sm font-medium">Most Skipped Step</p>
                  <p className="text-xs text-muted-foreground">
                    {analyticsData.mostSkippedStep?.replace(/_/g, ' ') || 'None'}
                  </p>
                </div>
              </div>
              <Badge variant="outline">
                Needs Review
              </Badge>
            </div>

            {/* Success Metrics */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Welcome Step</span>
                <span className="text-green-600">98% completion</span>
              </div>
              <Progress value={98} className="h-1" />
              
              <div className="flex justify-between text-sm">
                <span>Navigation</span>
                <span className="text-green-600">94% completion</span>
              </div>
              <Progress value={94} className="h-1" />
              
              <div className="flex justify-between text-sm">
                <span>Task Creation</span>
                <span className="text-yellow-600">67% completion</span>
              </div>
              <Progress value={67} className="h-1" />
              
              <div className="flex justify-between text-sm">
                <span>AI Features</span>
                <span className="text-green-600">89% completion</span>
              </div>
              <Progress value={89} className="h-1" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Recommendations</CardTitle>
          <CardDescription>
            Suggested improvements based on analytics data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {analyticsData.errorStats.mostCommonError === 'ACTION_TIMEOUT' && (
            <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <AlertTriangle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Reduce Action Timeouts
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  Consider increasing timeout durations or providing better visual cues for required actions.
                </p>
              </div>
            </div>
          )}

          {analyticsData.completionRate < 75 && (
            <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <TrendingUp className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                  Improve Completion Rate
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                  Current completion rate is below target. Consider simplifying steps or adding more engagement.
                </p>
              </div>
            </div>
          )}

          {analyticsData.mostSkippedStep && (
            <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
              <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-900 dark:text-red-100">
                  Review Skipped Steps
                </p>
                <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                  The "{analyticsData.mostSkippedStep.replace(/_/g, ' ')}" step is frequently skipped. 
                  Consider revising its content or making it optional.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
});

TutorialAnalytics.displayName = 'TutorialAnalytics';
