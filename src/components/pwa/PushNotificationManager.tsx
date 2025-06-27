'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, AlertCircle, CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useOneSignal } from '@/components/providers/onesignal-provider';
import { useUser } from '@clerk/nextjs';

export const PushNotificationManager: React.FC = () => {
  const { toast } = useToast();
  const { user } = useUser();
  const {
    isInitialized,
    isSubscribed,
    playerId,
    error,
    subscribe,
    unsubscribe,
    isOperating
  } = useOneSignal();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      const success = await subscribe();
      if (success) {
        toast({
          title: "🔔 Notifications Enabled",
          description: "You'll now receive push notifications for task reminders and important updates. Database sync completed!",
          variant: "default",
        });
      } else {
        toast({
          title: "Subscription Failed",
          description: "Unable to enable notifications. Please check your browser settings and try again.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error('Subscription error:', err);
      toast({
        title: "Error",
        description: "An error occurred while enabling notifications.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setIsLoading(true);
    try {
      const success = await unsubscribe();
      if (success) {
        toast({
          title: "Notifications Disabled",
          description: "You'll no longer receive push notifications.",
          variant: "default",
        });
      } else {
        toast({
          title: "Unsubscribe Failed",
          description: "Unable to disable notifications. Please try again.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error('Unsubscribe error:', err);
      toast({
        title: "Error",
        description: "An error occurred while disabling notifications.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSync = async () => {
    if (!user?.id || !playerId) {
      toast({
        title: "Sync Not Available",
        description: "User must be logged in and subscribed to sync.",
        variant: "destructive",
      });
      return;
    }

    setIsSyncing(true);
    try {
      const response = await fetch('/api/notifications/sync-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          playerId,
          deviceType: 'web'
        }),
      });

      if (response.ok) {
        toast({
          title: "🔄 Sync Successful",
          description: "OneSignal subscription synced with database. Task reminders will now work!",
          variant: "default",
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to sync subscription');
      }
    } catch (err) {
      console.error('Sync error:', err);
      toast({
        title: "Sync Failed",
        description: err instanceof Error ? err.message : "Unable to sync subscription.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const sendTestNotification = async () => {
    if (!playerId) {
      toast({
        title: "No Player ID",
        description: "You need to be subscribed to receive test notifications.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/test-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerId,
          type: 'test'
        }),
      });

      if (response.ok) {
        toast({
          title: "Test Notification Sent",
          description: "Check your device for the test notification.",
          variant: "default",
        });
      } else {
        throw new Error('Failed to send test notification');
      }
    } catch (err) {
      console.error('Test notification error:', err);
      toast({
        title: "Test Failed",
        description: "Unable to send test notification.",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = () => {
    if (!isInitialized) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }
    if (error) {
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    }
    if (isSubscribed) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    return <BellOff className="h-4 w-4 text-muted-foreground" />;
  };

  const getStatusText = () => {
    if (!isInitialized) return 'Initializing...';
    if (error) return `Error: ${error}`;
    if (isSubscribed) return 'Subscribed';
    return 'Not Subscribed';
  };

  const getStatusBadge = () => {
    if (!isInitialized) return <Badge variant="secondary">Initializing</Badge>;
    if (error) return <Badge variant="destructive">Error</Badge>;
    if (isSubscribed) return <Badge variant="default">Active</Badge>;
    return <Badge variant="outline">Inactive</Badge>;
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          Manage your push notification preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Display */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="text-sm font-medium">{getStatusText()}</span>
          </div>
          {getStatusBadge()}
        </div>
        
        {/* Player ID Display */}
        {playerId && (
          <div className="text-xs text-muted-foreground break-all">
            Player ID: {playerId}
        </div>
        )}

        {/* Error Message */}
      {error && (
          <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
            {error}
        </div>
      )}

      {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          {!isSubscribed ? (
            <Button 
              onClick={handleSubscribe} 
              disabled={isLoading || !isInitialized || isOperating}
              className="w-full"
            >
              {isLoading || isOperating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Subscribing...
                </>
              ) : (
                <>
                  <Bell className="mr-2 h-4 w-4" />
                  Enable Notifications
                </>
              )}
            </Button>
          ) : (
            <Button 
              onClick={handleUnsubscribe} 
              disabled={isLoading || isOperating}
              variant="outline"
              className="w-full"
            >
              {isLoading || isOperating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Unsubscribing...
                </>
              ) : (
                <>
                  <BellOff className="mr-2 h-4 w-4" />
                  Disable Notifications
                </>
              )}
            </Button>
          )}

          {/* Manual Sync Button - for existing subscriptions that need database sync */}
          {isSubscribed && playerId && user?.id && (
            <Button 
              onClick={handleManualSync}
              disabled={isSyncing}
              variant="outline"
              size="sm"
              className="w-full"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sync to Database
                </>
              )}
            </Button>
          )}

          {/* Test Notification Button */}
          {isSubscribed && (
            <Button 
              onClick={sendTestNotification}
              variant="secondary"
              size="sm"
              className="w-full"
            >
              Send Test Notification
            </Button>
        )}
      </div>

        {/* Debug Information */}
        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
            <div>Debug Info:</div>
            <div>Initialized: {isInitialized.toString()}</div>
            <div>Subscribed: {isSubscribed.toString()}</div>
            <div>Player ID: {playerId || 'None'}</div>
            <div>Error: {error || 'None'}</div>
          </div>
      )}
      </CardContent>
    </Card>
  );
}; 