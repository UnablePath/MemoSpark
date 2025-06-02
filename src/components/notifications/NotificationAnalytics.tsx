'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabasePushService } from '@/lib/notifications/supabasePushService';
import type { NotificationAnalytics as NotificationAnalyticsType, UserNotificationStats, NotificationLog } from '@/lib/notifications/pushTypes';
import { useUser } from '@clerk/nextjs';
import { 
  FaBell, 
  FaChartLine, 
  FaEye, 
  FaMousePointer, 
  FaClock, 
  FaTrophy,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimesCircle,
  FaSync
} from 'react-icons/fa';
import { toast } from 'sonner';

export const NotificationAnalyticsDashboard: React.FC = () => {
  const { user } = useUser();
  const [analytics, setAnalytics] = useState<NotificationAnalyticsType | null>(null);
  const [userStats, setUserStats] = useState<UserNotificationStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  useEffect(() => {
    if (user?.id) {
      loadAnalytics();
    }
  }, [user?.id, timeRange]);

  const loadAnalytics = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const endDate = new Date().toISOString();
      let startDate: string | undefined;
      
      if (timeRange !== 'all') {
        const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
        startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      }

      const [analyticsData, statsData] = await Promise.all([
        supabasePushService.getNotificationAnalytics(user.id, startDate, endDate),
        supabasePushService.getUserNotificationStats(user.id)
      ]);

      setAnalytics(analyticsData);
      setUserStats(statsData);
    } catch (error) {
      console.error('Failed to load notification analytics:', error);
      toast.error('Failed to load notification analytics');
    } finally {
      setIsLoading(false);
    }
  };

  const formatPercentage = (value: number): string => {
    return `${Math.round(value * 10) / 10}%`;
  };

  const formatHour = (hour: number): string => {
    const date = new Date();
    date.setHours(hour, 0, 0, 0);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
  };

  const getEngagementColor = (rate: number): string => {
    if (rate >= 70) return 'text-green-600';
    if (rate >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusIcon = (status: NotificationLog['status']) => {
    switch (status) {
      case 'sent': return <FaBell className="h-4 w-4 text-blue-500" />;
      case 'delivered': return <FaEye className="h-4 w-4 text-green-500" />;
      case 'clicked': return <FaMousePointer className="h-4 w-4 text-purple-500" />;
      case 'failed': return <FaTimesCircle className="h-4 w-4 text-red-500" />;
      default: return <FaBell className="h-4 w-4 text-gray-500" />;
    }
  };

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FaChartLine className="h-5 w-5" />
            Notification Analytics
          </CardTitle>
          <CardDescription>Please sign in to view your notification analytics</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FaChartLine className="h-6 w-6" />
            Notification Analytics
          </h2>
          <p className="text-muted-foreground">Track your notification engagement and performance</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Tabs value={timeRange} onValueChange={(value) => setTimeRange(value as any)}>
            <TabsList>
              <TabsTrigger value="7d">7 Days</TabsTrigger>
              <TabsTrigger value="30d">30 Days</TabsTrigger>
              <TabsTrigger value="90d">90 Days</TabsTrigger>
              <TabsTrigger value="all">All Time</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <Button 
            onClick={loadAnalytics} 
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            <FaSync className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            <FaBell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.total_sent || 0}</div>
            <p className="text-xs text-muted-foreground">Push notifications sent</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
            <FaCheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getEngagementColor(analytics?.delivery_rate || 0)}`}>
              {formatPercentage(analytics?.delivery_rate || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Successfully delivered</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
            <FaMousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getEngagementColor(analytics?.click_rate || 0)}`}>
              {formatPercentage(analytics?.click_rate || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Notifications clicked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement Score</CardTitle>
            <FaTrophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getEngagementColor(userStats?.engagement_score || 0)}`}>
              {userStats?.engagement_score || 0}
            </div>
            <p className="text-xs text-muted-foreground">Overall engagement</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="types">Notification Types</TabsTrigger>
          <TabsTrigger value="timing">Best Times</TabsTrigger>
          <TabsTrigger value="recent">Recent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {analytics && analytics.total_sent > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Performance Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance Summary</CardTitle>
                  <CardDescription>Your notification engagement metrics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Total Sent</span>
                      <span className="font-semibold">{analytics.total_sent}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Successfully Delivered</span>
                      <span className="font-semibold text-green-600">{analytics.total_delivered}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Clicked</span>
                      <span className="font-semibold text-purple-600">{analytics.total_clicked}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Failed</span>
                      <span className="font-semibold text-red-600">{analytics.total_failed}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* User Insights */}
              <Card>
                <CardHeader>
                  <CardTitle>Your Preferences</CardTitle>
                  <CardDescription>Based on your engagement patterns</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {userStats && (
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-medium mb-2">Best Times for You</h4>
                        <div className="flex flex-wrap gap-2">
                          {userStats.preferred_times.map((hour) => (
                            <Badge key={hour} variant="secondary">
                              {formatHour(hour)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2">Most Engaging Types</h4>
                        <div className="flex flex-wrap gap-2">
                          {userStats.most_engaged_types.map((type) => (
                            <Badge key={type} variant="default">
                              {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Alert>
              <FaExclamationTriangle className="h-4 w-4" />
              <AlertDescription>
                No notification data available for the selected time period. 
                Enable push notifications and start receiving notifications to see analytics.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="types" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Types Performance</CardTitle>
              <CardDescription>Engagement rates by notification type</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics && analytics.top_notification_types.length > 0 ? (
                <div className="space-y-4">
                  {analytics.top_notification_types.map((type) => (
                    <div key={type.type} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">
                          {type.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </h4>
                        <p className="text-sm text-muted-foreground">{type.count} notifications</p>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-semibold ${getEngagementColor(type.engagement_rate)}`}>
                          {formatPercentage(type.engagement_rate)}
                        </div>
                        <p className="text-xs text-muted-foreground">engagement</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Alert>
                  <FaExclamationTriangle className="h-4 w-4" />
                  <AlertDescription>
                    No notification type data available for the selected time period.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Hourly Distribution</CardTitle>
              <CardDescription>When you're most likely to engage with notifications</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics && analytics.hourly_distribution.some(h => h.count > 0) ? (
                <div className="grid grid-cols-6 gap-2">
                  {analytics.hourly_distribution.map((hour) => (
                    <div 
                      key={hour.hour} 
                      className={`p-2 text-center border rounded ${
                        hour.count > 0 ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="text-xs font-medium">{formatHour(hour.hour)}</div>
                      <div className="text-xs">{hour.count}</div>
                      {hour.count > 0 && (
                        <div className={`text-xs ${getEngagementColor(hour.engagement_rate)}`}>
                          {formatPercentage(hour.engagement_rate)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <Alert>
                  <FaExclamationTriangle className="h-4 w-4" />
                  <AlertDescription>
                    No timing data available for the selected time period.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your latest notification interactions</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics && analytics.recent_activity.length > 0 ? (
                <div className="space-y-3">
                  {analytics.recent_activity.map((log) => (
                    <div key={log.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      {getStatusIcon(log.status)}
                      <div className="flex-1">
                        <h4 className="font-medium">{log.title}</h4>
                        <p className="text-sm text-muted-foreground">{log.body}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(log.sent_at).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant={
                        log.status === 'clicked' ? 'default' :
                        log.status === 'delivered' ? 'secondary' :
                        log.status === 'failed' ? 'destructive' :
                        'outline'
                      }>
                        {log.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <Alert>
                  <FaExclamationTriangle className="h-4 w-4" />
                  <AlertDescription>
                    No recent activity to display.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}; 