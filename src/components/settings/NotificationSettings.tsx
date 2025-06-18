"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Bell, BellOff, Check, X, AlertCircle, Settings, Smartphone, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { oneSignalService } from '@/lib/notifications/OneSignalService';
import { cn } from '@/lib/utils';

interface SubscriptionStatus {
  isSubscribed: boolean;
  playerId?: string;
  browserSupported: boolean;
  permissionStatus: 'granted' | 'denied' | 'default';
  platform?: string;
  lastUsed?: string;
}

interface NotificationCategory {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  icon: React.ReactNode;
}

export const NotificationSettings: React.FC = () => {
  const { userId } = useAuth();
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({
    isSubscribed: false,
    browserSupported: false,
    permissionStatus: 'default'
  });
  const [categories, setCategories] = useState<NotificationCategory[]>([
    {
      id: 'task_reminders',
      name: 'Task Reminders',
      description: 'Get notified when your tasks are due',
      enabled: true,
      icon: <Bell className="h-4 w-4" />
    },
    {
      id: 'achievements',
      name: 'Achievements',
      description: 'Celebrate your accomplishments',
      enabled: true,
      icon: <Check className="h-4 w-4" />
    },
    {
      id: 'study_breaks',
      name: 'Study Break Reminders',
      description: 'Healthy break suggestions',
      enabled: false,
      icon: <Settings className="h-4 w-4" />
    }
  ]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Check subscription status on component mount
  useEffect(() => {
    checkSubscriptionStatus();
  }, [userId]);

  const checkSubscriptionStatus = async () => {
    if (!userId) return;

    try {
      setIsLoading(true);

      // Check browser support
      const browserSupported = 'Notification' in window && 'serviceWorker' in navigator;
      
      // Check permission status
      const permissionStatus = browserSupported ? Notification.permission : 'denied';

      // Check OneSignal subscription status
      const { isSubscribed, playerId } = await oneSignalService.getSubscriptionStatus();

      // Get platform info
      const platform = getPlatformInfo();

      setSubscriptionStatus({
        isSubscribed,
        playerId,
        browserSupported,
        permissionStatus,
        platform
      });

    } catch (error) {
      console.error('Error checking subscription status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPlatformInfo = (): string => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('chrome')) return 'Chrome';
    if (userAgent.includes('firefox')) return 'Firefox';
    if (userAgent.includes('safari')) return 'Safari';
    if (userAgent.includes('edge')) return 'Edge';
    return 'Browser';
  };

  const handleSubscribe = async () => {
    if (!userId) return;

    try {
      setIsUpdating(true);

      // Request permission first
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          throw new Error('Notification permission denied');
        }
      }

      // Subscribe via OneSignal
      const playerId = await oneSignalService.subscribeUser(userId);
      
      if (playerId) {
        setSubscriptionStatus(prev => ({
          ...prev,
          isSubscribed: true,
          playerId,
          permissionStatus: 'granted'
        }));
      } else {
        throw new Error('Failed to subscribe to notifications');
      }

    } catch (error) {
      console.error('Subscription error:', error);
      alert('Failed to enable notifications. Please check your browser settings.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUnsubscribe = async () => {
    if (!subscriptionStatus.playerId) return;

    try {
      setIsUpdating(true);

      const success = await oneSignalService.unsubscribeUser(subscriptionStatus.playerId);
      
      if (success) {
        setSubscriptionStatus(prev => ({
          ...prev,
          isSubscribed: false,
          playerId: undefined
        }));
      } else {
        throw new Error('Failed to unsubscribe');
      }

    } catch (error) {
      console.error('Unsubscribe error:', error);
      alert('Failed to disable notifications. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCategoryToggle = async (categoryId: string, enabled: boolean) => {
    try {
      setCategories(prev => 
        prev.map(cat => 
          cat.id === categoryId ? { ...cat, enabled } : cat
        )
      );

      // TODO: Update preferences in database
      console.log(`Category ${categoryId} ${enabled ? 'enabled' : 'disabled'}`);
      
    } catch (error) {
      console.error('Error updating category preference:', error);
      // Revert on error
      setCategories(prev => 
        prev.map(cat => 
          cat.id === categoryId ? { ...cat, enabled: !enabled } : cat
        )
      );
    }
  };

  const getStatusBadge = () => {
    if (!subscriptionStatus.browserSupported) {
      return <Badge variant="destructive">Not Supported</Badge>;
    }
    
    if (subscriptionStatus.permissionStatus === 'denied') {
      return <Badge variant="destructive">Blocked</Badge>;
    }
    
    if (subscriptionStatus.isSubscribed) {
      return <Badge variant="default" className="bg-green-500">Active</Badge>;
    }
    
    return <Badge variant="secondary">Inactive</Badge>;
  };

  const getStatusDescription = () => {
    if (!subscriptionStatus.browserSupported) {
      return "Your browser doesn't support push notifications.";
    }
    
    if (subscriptionStatus.permissionStatus === 'denied') {
      return "Notifications are blocked. Please enable them in your browser settings.";
    }
    
    if (subscriptionStatus.isSubscribed) {
      return `Notifications are active on ${subscriptionStatus.platform}.`;
    }
    
    return "Enable notifications to receive task reminders and updates.";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Settings
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
      {/* Main Subscription Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Stay updated with task reminders and important notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Section */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">Status:</span>
                {getStatusBadge()}
              </div>
              <p className="text-sm text-muted-foreground">
                {getStatusDescription()}
              </p>
              {subscriptionStatus.playerId && (
                <p className="text-xs text-muted-foreground">
                  Device ID: {subscriptionStatus.playerId.slice(0, 8)}...
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {subscriptionStatus.platform && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  {subscriptionStatus.platform === 'Chrome' && <Globe className="h-4 w-4" />}
                  {subscriptionStatus.platform !== 'Chrome' && <Smartphone className="h-4 w-4" />}
                  {subscriptionStatus.platform}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {!subscriptionStatus.isSubscribed ? (
              <Button 
                onClick={handleSubscribe}
                disabled={!subscriptionStatus.browserSupported || isUpdating}
                className="flex items-center gap-2"
              >
                <Bell className="h-4 w-4" />
                {isUpdating ? 'Enabling...' : 'Enable Notifications'}
              </Button>
            ) : (
              <Button 
                variant="outline"
                onClick={handleUnsubscribe}
                disabled={isUpdating}
                className="flex items-center gap-2"
              >
                <BellOff className="h-4 w-4" />
                {isUpdating ? 'Disabling...' : 'Disable Notifications'}
              </Button>
            )}
            
            <Button 
              variant="ghost" 
              size="sm"
              onClick={checkSubscriptionStatus}
              disabled={isLoading}
            >
              Refresh Status
            </Button>
          </div>

          {/* Browser Permission Alert */}
          {subscriptionStatus.permissionStatus === 'denied' && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Notifications are blocked in your browser. To enable them:
                <br />
                1. Click the lock icon in your address bar
                <br />
                2. Allow notifications for this site
                <br />
                3. Refresh this page
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Notification Categories */}
      {subscriptionStatus.isSubscribed && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Notification Types
            </CardTitle>
            <CardDescription>
              Choose which types of notifications you want to receive
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {categories.map((category, index) => (
              <React.Fragment key={category.id}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-md">
                      {category.icon}
                    </div>
                    <div>
                      <Label htmlFor={category.id} className="font-medium cursor-pointer">
                        {category.name}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {category.description}
                      </p>
                    </div>
                  </div>
                  <Switch
                    id={category.id}
                    checked={category.enabled}
                    onCheckedChange={(checked) => handleCategoryToggle(category.id, checked)}
                  />
                </div>
                {index < categories.length - 1 && <Separator />}
              </React.Fragment>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Test Notification */}
      {subscriptionStatus.isSubscribed && (
        <Card>
          <CardHeader>
            <CardTitle>Test Notifications</CardTitle>
            <CardDescription>
              Send a test notification to verify everything is working
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline"
              onClick={() => {
                // Send test notification via OneSignal
                oneSignalService.sendNotification({
                  contents: { en: '🧪 Test notification from StudySpark!' },
                  headings: { en: '✅ Notifications Working!' },
                  include_external_user_ids: [userId!],
                  data: { type: 'test', url: '/settings' }
                });
              }}
              className="flex items-center gap-2"
            >
              <Bell className="h-4 w-4" />
              Send Test Notification
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}; 