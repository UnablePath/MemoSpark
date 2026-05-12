'use client';

import type React from 'react';
import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export const PushNotificationManager: React.FC = () => {
  const { toast } = useToast();
  const { user } = useUser();
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
  } = usePushNotifications();

  const [isTestSending, setIsTestSending] = useState(false);

  const handleSubscribe = async (): Promise<void> => {
    try {
      const success = await subscribe();
      if (success) {
        toast({
          title: 'Notifications enabled',
          description:
            'MemoSpark saved your subscription. Task reminders queue in the background.',
          variant: 'default',
        });
      } else {
        toast({
          title: 'Could not subscribe',
          description:
            permission === 'denied'
              ? 'Unblock notifications for this site in your browser settings, then try again.'
              : 'Check your connection and try again.',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('[notifications:subscribe]', err);
      toast({
        title: 'Error',
        description: 'Could not finish enabling notifications.',
        variant: 'destructive',
      });
    }
  };

  const handleUnsubscribe = async (): Promise<void> => {
    try {
      const success = await unsubscribe();
      if (success) {
        toast({
          title: 'Notifications turned off',
          description: 'We removed this device from push delivery.',
          variant: 'default',
        });
      } else {
        toast({
          title: 'Could not unsubscribe',
          description: 'Try again in a moment.',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('[notifications:unsubscribe]', err);
      toast({
        title: 'Error',
        description: 'Could not disable notifications.',
        variant: 'destructive',
      });
    }
  };

  const sendTestPush = async (): Promise<void> => {
    if (!user?.id || !isSubscribed) return;
    setIsTestSending(true);
    try {
      const response = await fetch('/api/push/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientUserId: user.id,
          category: 'system',
          title: 'Test notification',
          body: 'MemoSpark push pipeline is wired up correctly.',
          url: '/dashboard',
          sourceType: 'system',
        }),
      });

      if (response.ok) {
        toast({
          title: 'Test queued',
          description:
            'If you are subscribed on this browser, delivery should arrive within a minute.',
          variant: 'default',
        });
      } else {
        const errBody = await response.json().catch(() => ({}));
        throw new Error((errBody as { error?: string }).error ?? 'Request failed');
      }
    } catch (err) {
      console.error('[notifications:test-push]', err);
      toast({
        title: 'Test failed',
        description:
          err instanceof Error ? err.message : 'Unable to enqueue test.',
        variant: 'destructive',
      });
    } finally {
      setIsTestSending(false);
    }
  };

  const getStatusIcon = () => {
    if (!isSupported) {
      return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
    if (permission === 'denied') {
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    }
    if (isSubscribed) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    return <BellOff className="h-4 w-4 text-muted-foreground" />;
  };

  const getStatusText = () => {
    if (!isSupported) return 'Not supported';
    if (permission === 'denied') return 'Blocked in browser settings';
    if (isSubscribed) return 'Subscribed on this device';
    return permission === 'granted'
      ? 'Permission granted — finish setup below'
      : 'Not subscribed';
  };

  const getStatusBadge = () => {
    if (!isSupported) return <Badge variant="destructive">Unsupported</Badge>;
    if (permission === 'denied') return <Badge variant="destructive">Blocked</Badge>;
    if (isSubscribed) return <Badge variant="default">Active</Badge>;
    return <Badge variant="outline">Inactive</Badge>;
  };

  const busySubscribe = isLoading;

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Push notifications
        </CardTitle>
        <CardDescription>
          Register the MemoSpark service worker and save this device with Web Push (VAPID).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="text-sm font-medium">{getStatusText()}</span>
          </div>
          {getStatusBadge()}
        </div>

        <div className="flex flex-col gap-2">
          {!isSupported ? (
            <p className="text-xs text-muted-foreground">
              This browser cannot register Web Push. Try Chrome or Edge on desktop.
            </p>
          ) : !isSubscribed ? (
            <Button
              onClick={() => void handleSubscribe()}
              disabled={busySubscribe || permission === 'denied'}
              className="w-full"
            >
              {busySubscribe ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting…
                </>
              ) : (
                <>
                  <Bell className="mr-2 h-4 w-4" />
                  Enable notifications
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={() => void handleUnsubscribe()}
              disabled={busySubscribe}
              variant="outline"
              className="w-full"
            >
              {busySubscribe ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Turning off…
                </>
              ) : (
                <>
                  <BellOff className="mr-2 h-4 w-4" />
                  Disable notifications
                </>
              )}
            </Button>
          )}

          {isSubscribed && user?.id && (
            <Button
              type="button"
              onClick={() => void sendTestPush()}
              variant="secondary"
              size="sm"
              disabled={isTestSending || busySubscribe}
              className="w-full"
            >
              {isTestSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Queuing test…
                </>
              ) : (
                'Queue test notification'
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
