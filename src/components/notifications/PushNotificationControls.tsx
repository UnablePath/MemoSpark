'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { pushSubscriptionManager } from '@/lib/notifications/pushSubscriptionManager';
import { NotificationAnalyticsDashboard } from './NotificationAnalytics';
import type { PushSubscriptionStatus } from '@/lib/notifications/pushTypes';
import { useUser } from '@clerk/nextjs';
import { FaBell, FaBellSlash, FaCheck, FaTimes, FaExclamationTriangle, FaChartLine } from 'react-icons/fa';
import { toast } from 'sonner';

export const PushNotificationControls: React.FC = () => {
  const { user } = useUser();
  const [status, setStatus] = useState<PushSubscriptionStatus>({
    isSupported: false,
    isSubscribed: false,
    isPushEnabled: false,
    subscription: null
  });
  const [isLoading, setIsLoading] = useState(false);

  // Load initial status
  useEffect(() => {
    loadStatus();
  }, []);

  // Listen for push subscription events
  useEffect(() => {
    const handlePushEvent = (event: CustomEvent) => {
      console.log('Push subscription event:', event.detail);
      loadStatus(); // Refresh status when subscription changes
    };

    window.addEventListener('pushSubscriptionEvent', handlePushEvent as EventListener);
    return () => {
      window.removeEventListener('pushSubscriptionEvent', handlePushEvent as EventListener);
    };
  }, []);

  const loadStatus = async () => {
    try {
      const currentStatus = await pushSubscriptionManager.getStatus();
      setStatus(currentStatus);
    } catch (error) {
      console.error('Failed to load push notification status:', error);
    }
  };

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      const result = await pushSubscriptionManager.subscribe();
      setStatus(result);
      
      if (result.isPushEnabled) {
        toast.success('🔔 Push notifications enabled! You\'ll receive study reminders and notifications.');
      } else {
        toast.error(result.error || 'Failed to enable push notifications');
      }
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      toast.error('Failed to enable push notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setIsLoading(true);
    try {
      const success = await pushSubscriptionManager.unsubscribe();
      
      if (success) {
        await loadStatus(); // Refresh status
        toast.success('🔕 Push notifications disabled');
      } else {
        toast.error('Failed to disable push notifications');
      }
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      toast.error('Failed to disable push notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = () => {
    if (!status.isSupported) {
      return <Badge variant="destructive" className="flex items-center gap-1">
        <FaTimes className="h-3 w-3" />
        Not Supported
      </Badge>;
    }
    
    if (status.isPushEnabled) {
      return <Badge variant="default" className="flex items-center gap-1">
        <FaCheck className="h-3 w-3" />
        Active
      </Badge>;
    }
    
    if (status.isSubscribed) {
      return <Badge variant="secondary" className="flex items-center gap-1">
        <FaExclamationTriangle className="h-3 w-3" />
        Subscribed (Permission Needed)
      </Badge>;
    }
    
    return <Badge variant="outline" className="flex items-center gap-1">
      <FaBellSlash className="h-3 w-3" />
      Disabled
    </Badge>;
  };

  const getInstructions = () => {
    if (!status.isSupported) {
      return {
        title: 'Push Notifications Not Supported',
        description: 'Your browser doesn\'t support push notifications. Please use a modern browser like Chrome, Firefox, or Safari.',
        variant: 'destructive' as const
      };
    }
    
    if (status.isPushEnabled) {
      return {
        title: 'Push Notifications Active',
        description: 'You\'ll receive study reminders, task alerts, and achievement notifications even when StudySpark is closed.',
        variant: 'default' as const
      };
    }
    
    if (status.error?.includes('permission')) {
      return {
        title: 'Permission Required',
        description: 'Please allow notifications in your browser settings to enable push notifications.',
        variant: 'destructive' as const
      };
    }
    
    return {
      title: 'Enable Push Notifications',
      description: 'Stay on track with study reminders, task alerts, and achievement notifications even when your browser is closed.',
      variant: 'default' as const
    };
  };

  const instructions = getInstructions();

  if (!status.isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FaBellSlash className="h-5 w-5 text-muted-foreground" />
            Push Notifications Unavailable
          </CardTitle>
          <CardDescription>
            Your browser doesn't support push notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <FaExclamationTriangle className="h-4 w-4" />
            <AlertDescription>
              {instructions.description}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="setup" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="setup" className="flex items-center gap-2">
            <FaBell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <FaChartLine className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FaBell className="h-5 w-5" />
                Push Notifications
                {getStatusBadge()}
              </CardTitle>
              <CardDescription>
                Receive study reminders and notifications even when StudySpark is closed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status Alert */}
              <Alert variant={instructions.variant}>
                <FaBell className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium">{instructions.title}</div>
                  <div className="text-sm mt-1">{instructions.description}</div>
                </AlertDescription>
              </Alert>

              {/* Main Controls */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="push-notifications" className="text-base font-medium">
                    Push Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications when browser is closed
                  </p>
                </div>
                <Switch
                  id="push-notifications"
                  checked={status.isPushEnabled}
                  onCheckedChange={status.isPushEnabled ? handleUnsubscribe : handleSubscribe}
                  disabled={isLoading || !status.isSupported}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                {!status.isPushEnabled && status.isSupported && (
                  <Button 
                    onClick={handleSubscribe} 
                    disabled={isLoading}
                    className="flex items-center gap-2"
                  >
                    <FaBell className="h-4 w-4" />
                    {isLoading ? 'Enabling...' : 'Enable Push Notifications'}
                  </Button>
                )}
                
                {status.isPushEnabled && (
                  <Button 
                    onClick={handleUnsubscribe} 
                    disabled={isLoading}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <FaBellSlash className="h-4 w-4" />
                    {isLoading ? 'Disabling...' : 'Disable Notifications'}
                  </Button>
                )}
              </div>

              {/* Help Text */}
              {status.isPushEnabled && (
                <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-md">
                  <h4 className="font-medium text-blue-900">What you'll receive:</h4>
                  <ul className="list-disc list-inside mt-1 space-y-1 text-blue-800">
                    <li>Task reminders before due dates</li>
                    <li>Study session notifications</li>
                    <li>Achievement unlocks and celebrations</li>
                    <li>Daily progress summaries (if enabled)</li>
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <NotificationAnalyticsDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}; 