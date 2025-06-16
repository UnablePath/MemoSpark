'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { subscribeUser, unsubscribeUser, sendNotification } from '@/app/actions';

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
    if (!isSupported || permission !== 'granted') {
      const granted = await requestPermission();
      if (!granted) return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Get VAPID public key from environment
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error('VAPID public key not found');
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

      // Send subscription to server
      const result = await subscribeUser(subscriptionData);
      
      if (result.success) {
        setSubscription(subscriptionData);
      } else {
        throw new Error(result.error || 'Failed to subscribe');
      }
    } catch (err) {
      console.error('Error subscribing to push notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to subscribe to notifications');
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

      // Remove subscription from server
      const result = await unsubscribeUser(subscription.endpoint);
      
      if (result.success) {
        setSubscription(null);
      } else {
        throw new Error(result.error || 'Failed to unsubscribe');
      }
    } catch (err) {
      console.error('Error unsubscribing from push notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to unsubscribe from notifications');
    } finally {
      setIsLoading(false);
    }
  };

  // Send test notification
  const sendTestNotification = async () => {
    if (!subscription) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await sendNotification({
        title: 'MemoSpark Test Notification',
        body: 'This is a test notification from MemoSpark!',
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        data: { url: '/dashboard' }
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to send notification');
      }
    } catch (err) {
      console.error('Error sending test notification:', err);
      setError(err instanceof Error ? err.message : 'Failed to send test notification');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSupported) {
    return (
      <div className={`p-4 bg-yellow-50 border border-yellow-200 rounded-lg ${className}`}>
        <h3 className="font-semibold text-yellow-800 mb-2">Push Notifications Not Supported</h3>
        <p className="text-yellow-700 text-sm">
          Your browser doesn't support push notifications. Please use a modern browser like Chrome, Firefox, or Safari.
        </p>
      </div>
    );
  }

  return (
    <div className={`p-6 bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Push Notifications</h3>
      
      {/* Permission Status */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium text-gray-700">Permission Status:</span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            permission === 'granted' 
              ? 'bg-green-100 text-green-800' 
              : permission === 'denied'
              ? 'bg-red-100 text-red-800'
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {permission === 'granted' ? 'Granted' : permission === 'denied' ? 'Denied' : 'Not Requested'}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Subscription Status:</span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            subscription 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {subscription ? 'Subscribed' : 'Not Subscribed'}
          </span>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col gap-3">
        {!subscription ? (
          <button
            onClick={subscribe}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Subscribing...' : 'Enable Push Notifications'}
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={sendTestNotification}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Sending...' : 'Send Test Notification'}
            </button>
            <button
              onClick={unsubscribe}
              disabled={isLoading}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Unsubscribing...' : 'Disable'}
            </button>
          </div>
        )}
      </div>

      {/* Subscription Details (Debug Info) */}
      {subscription && (
        <details className="mt-4">
          <summary className="text-sm font-medium text-gray-700 cursor-pointer hover:text-gray-900">
            Subscription Details
          </summary>
          <div className="mt-2 p-3 bg-gray-50 rounded-md">
            <pre className="text-xs text-gray-600 whitespace-pre-wrap break-all">
              {JSON.stringify(subscription, null, 2)}
            </pre>
          </div>
        </details>
      )}
    </div>
  );
}; 