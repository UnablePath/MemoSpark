'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, TrendingUp, Clock, CheckCircle } from 'lucide-react';

interface NotificationStats {
  totalSent: number;
  totalOpened: number;
  totalDismissed: number;
  openRate: number;
  recentNotifications: Array<{
    id: string;
    title: string;
    type: string;
    sentAt: string;
    opened: boolean;
  }>;
}

export function NotificationAnalytics() {
  const { user } = useUser();
  const [stats, setStats] = useState<NotificationStats>({
    totalSent: 0,
    totalOpened: 0,
    totalDismissed: 0,
    openRate: 0,
    recentNotifications: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadAnalytics();
    }
  }, [user?.id]);

  const loadAnalytics = async () => {
    try {
      // TODO: Implement analytics API endpoint
      // For now, show mock data
      const mockStats: NotificationStats = {
        totalSent: 12,
        totalOpened: 8,
        totalDismissed: 4,
        openRate: 66.7,
        recentNotifications: [
          {
            id: '1',
            title: 'Task reminder: Complete assignment',
            type: 'task_reminder',
            sentAt: '2025-01-18T15:30:00Z',
            opened: true
          },
          {
            id: '2',
            title: 'Study break suggestion',
            type: 'study_break',
            sentAt: '2025-01-18T14:00:00Z',
            opened: false
          },
          {
            id: '3',
            title: 'Achievement unlocked!',
            type: 'achievement',
            sentAt: '2025-01-18T12:15:00Z',
            opened: true
          }
        ]
      };

      setStats(mockStats);
    } catch (error) {
      console.error('Error loading notification analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'task_reminder':
        return <Clock className="h-3 w-3" />;
      case 'achievement':
        return <CheckCircle className="h-3 w-3" />;
      case 'study_break':
        return <Bell className="h-3 w-3" />;
      default:
        return <Bell className="h-3 w-3" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'task_reminder':
        return <Badge variant="default">Task</Badge>;
      case 'achievement':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Achievement</Badge>;
      case 'study_break':
        return <Badge variant="outline">Break</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Notification Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Notification Analytics
          </CardTitle>
          <CardDescription>
            Track how well your notifications are performing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">{stats.totalSent}</div>
              <div className="text-sm text-muted-foreground">Total Sent</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.totalOpened}</div>
              <div className="text-sm text-muted-foreground">Opened</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{stats.totalDismissed}</div>
              <div className="text-sm text-muted-foreground">Dismissed</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.openRate}%</div>
              <div className="text-sm text-muted-foreground">Open Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Notifications</CardTitle>
          <CardDescription>
            Your last few notifications and their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.recentNotifications.map((notification) => (
              <div 
                key={notification.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-md">
                    {getTypeIcon(notification.type)}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{notification.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(notification.sentAt).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getTypeBadge(notification.type)}
                  <Badge 
                    variant={notification.opened ? "default" : "secondary"}
                    className={notification.opened ? "bg-green-500" : ""}
                  >
                    {notification.opened ? "Opened" : "Sent"}
                  </Badge>
                </div>
              </div>
            ))}
            
            {stats.recentNotifications.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No notifications sent yet
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 