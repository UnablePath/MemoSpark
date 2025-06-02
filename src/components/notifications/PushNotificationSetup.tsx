'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, BellOff, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@clerk/nextjs';

interface PushNotificationSetupProps {
  onSubscriptionChange?: (isSubscribed: boolean) => void;
}

export const PushNotificationSetup: React.FC<PushNotificationSetupProps> = ({
  onSubscriptionChange
}) => {
  const { userId } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = () => {
      const supported = 
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window;
      
      setIsSupported(supported);
      
      if (supported) {
        setPermission(Notification.permission);
        registerServiceWorker();
        checkExistingSubscription();
      }
    };

    checkSupport();
  }, []);

  // Register service worker
  const registerServiceWorker = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.register('/sw-notifications.js');
        console.log('Service Worker registered:', registration);
        setSwRegistration(registration);
        
        // Wait for service worker to be ready
        await navigator.serviceWorker.ready;
      }
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      toast.error('Failed to register notification service');
    }
  };

  // Check if user already has an active subscription
  const checkExistingSubscription = async () => {
    try {
      if (!swRegistration && 'serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        setSwRegistration(registration);
      }

      const registration = swRegistration || await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        setIsSubscribed(true);
        onSubscriptionChange?.(true);
      }
    } catch (error) {
      console.error('Failed to check existing subscription:', error);
    }
  };

  // Request notification permission
  const requestPermission = async (): Promise<boolean> => {
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        toast.success('Notification permission granted!');
        return true;
      } else if (result === 'denied') {
        toast.error('Notification permission denied. Please enable in browser settings.');
        return false;
      } else {
        toast.warning('Notification permission dismissed.');
        return false;
      }
    } catch (error) {
      console.error('Failed to request permission:', error);
      toast.error('Failed to request notification permission');
      return false;
    }
  };

  // Subscribe to push notifications
  const subscribeToPush = async () => {
    if (!userId) {
      toast.error('You must be logged in to enable notifications');
      return;
    }

    setIsLoading(true);
    
    try {
      // Request permission first if needed
      if (permission !== 'granted') {
        const granted = await requestPermission();
        if (!granted) {
          setIsLoading(false);
          return;
        }
      }

      // Get service worker registration
      const registration = swRegistration || await navigator.serviceWorker.ready;
      
      // Create push subscription
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      });

      // Send subscription to server
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))),
              auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!)))
            }
          },
          userAgent: navigator.userAgent,
          userId
        }),
      });

      if (response.ok) {
        setIsSubscribed(true);
        onSubscriptionChange?.(true);
        toast.success('Push notifications enabled successfully! 🔔');
        
        // Send a test notification
        setTimeout(() => {
          sendTestNotification();
        }, 2000);
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to subscribe');
      }
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      toast.error(`Failed to enable notifications: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Unsubscribe from push notifications
  const unsubscribeFromPush = async () => {
    setIsLoading(true);
    
    try {
      const registration = swRegistration || await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        
        // Notify server (optional - could be handled by webhook)
        try {
          await fetch('/api/push/unsubscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              endpoint: subscription.endpoint,
              userId 
            })
          });
        } catch (error) {
          console.warn('Failed to notify server of unsubscription:', error);
        }
      }
      
      setIsSubscribed(false);
      onSubscriptionChange?.(false);
      toast.success('Push notifications disabled');
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
      toast.error('Failed to disable notifications');
    } finally {
      setIsLoading(false);
    }
  };

  // Send test notification
  const sendTestNotification = async () => {
    try {
      const response = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          notificationType: 'test',
          title: '🎉 Notifications Enabled!',
          body: 'Great! Your push notifications are working perfectly.',
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          actions: [
            { action: 'view', title: '👀 View App', icon: '/icons/view.png' },
            { action: 'dismiss', title: '✅ Got it', icon: '/icons/check.png' }
          ],
          data: {
            url: '/dashboard',
            type: 'test'
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send test notification');
      }
    } catch (error) {
      console.error('Failed to send test notification:', error);
    }
  };

  // Toggle subscription
  const handleToggle = async (enabled: boolean) => {
    if (enabled) {
      await subscribeToPush();
    } else {
      await unsubscribeFromPush();
    }
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5 text-muted-foreground" />
            Push Notifications Not Supported
          </CardTitle>
          <CardDescription>
            Your browser doesn't support push notifications. Please use a modern browser like Chrome, Firefox, or Safari.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          Get notified about upcoming tasks, study sessions, and important reminders.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Permission Status */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            {permission === 'granted' ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : permission === 'denied' ? (
              <AlertCircle className="h-4 w-4 text-red-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-orange-600" />
            )}
            <span className="text-sm font-medium">
              Permission: {permission === 'granted' ? 'Granted' : permission === 'denied' ? 'Denied' : 'Not Requested'}
            </span>
          </div>
        </div>

        {/* Main Toggle */}
        <div className="flex items-center justify-between">
          <Label htmlFor="notifications-toggle" className="flex flex-col gap-1">
            <span className="font-medium">Enable Push Notifications</span>
            <span className="text-sm text-muted-foreground">
              Receive task reminders and study session alerts
            </span>
          </Label>
          <div className="flex items-center gap-2">
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            <Switch
              id="notifications-toggle"
              checked={isSubscribed}
              onCheckedChange={handleToggle}
              disabled={isLoading || permission === 'denied'}
            />
          </div>
        </div>

        {/* Additional Actions */}
        {permission === 'denied' && (
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-sm text-orange-800">
              Notifications are blocked. To enable them:
            </p>
            <ol className="text-sm text-orange-700 mt-1 ml-4 list-decimal">
              <li>Click the lock icon in your browser's address bar</li>
              <li>Set "Notifications" to "Allow"</li>
              <li>Refresh this page</li>
            </ol>
          </div>
        )}

        {isSubscribed && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={sendTestNotification}
              disabled={isLoading}
            >
              Test Notification
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PushNotificationSetup; 