'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { subscribeUser, unsubscribeUser, sendNotification } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Bell, BellOff, TestTube, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { toast } from 'sonner';

interface PushNotificationManagerProps {
  className?: string;
}

interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export const PushNotificationManager: React.FC<PushNotificationManagerProps> = ({ 
  className = '' 
}) => {
  const { user } = useUser();
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  // Check if push notifications are supported
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const supported = 'serviceWorker' in navigator && 'PushManager' in window;
      setIsSupported(supported);
      
      if (supported) {
        setPermission(Notification.permission);
        checkExistingSubscription();
      }
    }
  }, []);

  // Check for existing subscription
  const checkExistingSubscription = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const existingSubscription = await registration.pushManager.getSubscription();
      
      if (existingSubscription) {
        setSubscription({
          endpoint: existingSubscription.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(existingSubscription.getKey('p256dh')!),
            auth: arrayBufferToBase64(existingSubscription.getKey('auth')!)
          }
        });
      }
    } catch (err) {
      console.error('Error checking existing subscription:', err);
    }
  }, []);

  // Convert ArrayBuffer to Base64
  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    const binary = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
    return btoa(binary);
  };

  // Convert Base64 to Uint8Array (for VAPID key)
  const base64ToUint8Array = (base64: string): Uint8Array => {
    const padding = '='.repeat((4 - base64.length % 4) % 4);
    const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(b64);
    return new Uint8Array([...rawData].map(char => char.charCodeAt(0)));
  };

  // Request notification permission
  const requestPermission = async (): Promise<boolean> => {
    if (!isSupported) return false;

    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);
      return permission === 'granted';
    } catch (err) {
      console.error('Error requesting permission:', err);
      setError('Failed to request notification permission');
      return false;
    }
  };

  // Subscribe to push notifications
  const subscribe = async () => {
    if (!isSupported || !user?.id) {
      toast.error('Push notifications not supported or user not authenticated');
      return;
    }

    if (permission !== 'granted') {
      const granted = await requestPermission();
      if (!granted) {
        toast.error('Notification permission denied');
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Get VAPID public key from environment
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error('VAPID public key not found. Please configure environment variables.');
      }

      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64ToUint8Array(vapidPublicKey)
      });

      const subscriptionData = {
        endpoint: pushSubscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(pushSubscription.getKey('p256dh')!),
          auth: arrayBufferToBase64(pushSubscription.getKey('auth')!)
        }
      };

      // For basic version, we'll use a simple player ID based on endpoint hash
      const playerId = btoa(subscriptionData.endpoint).slice(0, 32);
      const result = await subscribeUser(playerId, navigator.userAgent);
      
      if (result.success) {
        setSubscription(subscriptionData);
        toast.success('Successfully subscribed to push notifications!');
      } else {
        throw new Error(result.error || 'Failed to subscribe');
      }
    } catch (err) {
      console.error('Error subscribing to push notifications:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to subscribe to notifications';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Unsubscribe from push notifications
  const unsubscribe = async () => {
    if (!subscription) return;

    setIsLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const pushSubscription = await registration.pushManager.getSubscription();
      
      if (pushSubscription) {
        await pushSubscription.unsubscribe();
      }

      // Remove subscription from server using the same player ID logic
      const playerId = btoa(subscription.endpoint).slice(0, 32);
      const result = await unsubscribeUser(playerId);
      
      if (result.success) {
        setSubscription(null);
        toast.success('Successfully unsubscribed from push notifications');
      } else {
        throw new Error(result.error || 'Failed to unsubscribe');
      }
    } catch (err) {
      console.error('Error unsubscribing from push notifications:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to unsubscribe from notifications';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Send different types of test notifications
  const sendTestNotification = async (type: 'general' | 'task' | 'achievement' | 'break') => {
    if (!subscription || !user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      let result;
      
      switch (type) {
        case 'task':
          // Import the specific action for task reminders
          const { sendTaskReminder } = await import('@/app/actions');
          result = await sendTaskReminder('test-task-id', 'Complete your study session', new Date(Date.now() + 30 * 60 * 1000).toISOString());
          break;
          
        case 'achievement':
          const { sendAchievementNotification } = await import('@/app/actions');
          result = await sendAchievementNotification('Early Bird', 'You successfully set up notifications!');
          break;
          
        case 'break':
          const { sendBreakSuggestion } = await import('@/app/actions');
          result = await sendBreakSuggestion();
          break;
          
        default:
          const { sendNotification } = await import('@/app/actions');
          result = await sendNotification(
            'MemoSpark Test Notification',
            'This is a test notification from MemoSpark!',
            { test: true },
            '/dashboard'
          );
      }

      if (result.success) {
        toast.success(`Test ${type} notification sent successfully!`);
      } else {
        throw new Error(result.error || 'Failed to send notification');
      }
    } catch (err) {
      console.error('Error sending test notification:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to send test notification';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSupported) {
    return (
      <Card className={`${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-800">
            <AlertCircle className="w-5 h-5" />
            Push Notifications Not Supported
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-yellow-700 text-sm">
            Your browser doesn't support push notifications. Please use a modern browser like Chrome, Firefox, or Safari.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          Enable push notifications to receive timely reminders and updates from MemoSpark.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Overview */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Permission:</span>
            <Badge variant={permission === 'granted' ? 'default' : permission === 'denied' ? 'destructive' : 'secondary'}>
              {permission === 'granted' ? (
                <>
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Granted
                </>
              ) : permission === 'denied' ? (
                <>
                  <XCircle className="w-3 h-3 mr-1" />
                  Denied
                </>
              ) : (
                <>
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Not Requested
                </>
              )}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Status:</span>
            <Badge variant={subscription ? 'default' : 'secondary'}>
              {subscription ? (
                <>
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Active
                </>
              ) : (
                <>
                  <BellOff className="w-3 h-3 mr-1" />
                  Inactive
                </>
              )}
            </Badge>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800 text-sm flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              {error}
            </p>
          </div>
        )}

        {/* Main Action */}
        <div className="flex flex-col gap-3">
          {!subscription ? (
            <Button
              onClick={subscribe}
              disabled={isLoading || !user?.id}
              className="w-full"
            >
              {isLoading ? 'Subscribing...' : 'Enable Push Notifications'}
            </Button>
          ) : (
            <div className="space-y-3">
              {/* Test Notifications */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Test Notifications</h4>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => sendTestNotification('general')}
                    disabled={isLoading}
                    className="flex items-center gap-1"
                  >
                    <TestTube className="w-3 h-3" />
                    General
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => sendTestNotification('task')}
                    disabled={isLoading}
                    className="flex items-center gap-1"
                  >
                    <TestTube className="w-3 h-3" />
                    Task Reminder
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => sendTestNotification('achievement')}
                    disabled={isLoading}
                    className="flex items-center gap-1"
                  >
                    <TestTube className="w-3 h-3" />
                    Achievement
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => sendTestNotification('break')}
                    disabled={isLoading}
                    className="flex items-center gap-1"
                  >
                    <TestTube className="w-3 h-3" />
                    Break Suggestion
                  </Button>
                </div>
              </div>
              
              {/* Unsubscribe */}
              <Button
                variant="destructive"
                onClick={unsubscribe}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Unsubscribing...' : 'Disable Push Notifications'}
              </Button>
            </div>
          )}
        </div>

        {/* Advanced Settings Link */}
        {subscription && (
          <div className="pt-3 border-t">
            <p className="text-xs text-gray-500 text-center">
              For detailed notification preferences, visit{' '}
              <a href="/settings" className="text-blue-600 hover:underline">
                Settings → Notifications
              </a>
            </p>
          </div>
        )}

        {/* Subscription Details (Debug Info) */}
        {subscription && process.env.NODE_ENV === 'development' && (
          <details className="text-xs">
            <summary className="text-gray-700 cursor-pointer hover:text-gray-900 font-medium">
              Debug Information
            </summary>
            <div className="mt-2 p-3 bg-gray-50 rounded-md">
              <pre className="text-xs text-gray-600 whitespace-pre-wrap break-all">
                {JSON.stringify(subscription, null, 2)}
              </pre>
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  );
}; 