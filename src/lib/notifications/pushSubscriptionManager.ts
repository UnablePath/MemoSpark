'use client';

import type { 
  PushSubscriptionData, 
  PushSubscriptionWithMetadata, 
  PushSubscriptionStatus,
  PushSubscriptionEvent,
  PushSubscriptionEventType,
  RichNotification,
  NotificationType
} from './pushTypes';
import { supabasePushService } from './supabasePushService';

export class PushSubscriptionManager {
  private static instance: PushSubscriptionManager;
  private subscription: PushSubscriptionWithMetadata | null = null;
  private isSupported: boolean = false;
  private isSubscribed: boolean = false;
  private vapidPublicKey: string;

  private constructor() {
    this.isSupported = this.checkPushSupport();
    this.vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
    
    if (this.isSupported) {
      this.loadExistingSubscription();
    }
  }

  static getInstance(): PushSubscriptionManager {
    if (!PushSubscriptionManager.instance) {
      PushSubscriptionManager.instance = new PushSubscriptionManager();
    }
    return PushSubscriptionManager.instance;
  }

  private checkPushSupport(): boolean {
    return typeof window !== 'undefined' && 
           'serviceWorker' in navigator && 
           'PushManager' in window &&
           'Notification' in window;
  }

  // Load existing subscription from localStorage and validate it
  private async loadExistingSubscription(): Promise<void> {
    try {
      const stored = localStorage.getItem('studyspark_push_subscription');
      if (stored) {
        const parsed = JSON.parse(stored);
        
        // Validate that the subscription is still active
        const registration = await navigator.serviceWorker.ready;
        const currentSub = await registration.pushManager.getSubscription();
        
        if (currentSub && currentSub.endpoint === parsed.endpoint) {
          this.subscription = parsed;
          this.isSubscribed = true;
        } else {
          // Clean up stale subscription data
          localStorage.removeItem('studyspark_push_subscription');
        }
      }
    } catch (error) {
      console.error('Failed to load existing subscription:', error);
    }
  }

  // Subscribe to push notifications
  async subscribe(): Promise<PushSubscriptionStatus> {
    if (!this.isSupported) {
      return {
        isSupported: false,
        isSubscribed: false,
        isPushEnabled: false,
        subscription: null,
        error: 'Push notifications are not supported in this browser'
      };
    }

    if (!this.vapidPublicKey) {
      return {
        isSupported: true,
        isSubscribed: false,
        isPushEnabled: false,
        subscription: null,
        error: 'VAPID public key not configured'
      };
    }

    try {
      // Request notification permission first
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        return {
          isSupported: true,
          isSubscribed: false,
          isPushEnabled: false,
          subscription: null,
          error: 'Notification permission denied'
        };
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;
      
      // Check if already subscribed
      let pushSubscription = await registration.pushManager.getSubscription();
      
      if (!pushSubscription) {
        // Subscribe to push notifications
        pushSubscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
        });
      }

      // Convert to our format
      const subscriptionData: PushSubscriptionData = {
        endpoint: pushSubscription.endpoint,
        keys: {
          p256dh: this.arrayBufferToBase64(pushSubscription.getKey('p256dh')!),
          auth: this.arrayBufferToBase64(pushSubscription.getKey('auth')!)
        }
      };

      // Create subscription with metadata
      const subscriptionWithMetadata: PushSubscriptionWithMetadata = {
        ...subscriptionData,
        id: this.generateSubscriptionId(subscriptionData.endpoint),
        userAgent: navigator.userAgent,
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
        isActive: true
      };

      // Save to localStorage
      localStorage.setItem('studyspark_push_subscription', JSON.stringify(subscriptionWithMetadata));
      
      // Send to server for storage
      await this.sendSubscriptionToServer(subscriptionWithMetadata);
      
      this.subscription = subscriptionWithMetadata;
      this.isSubscribed = true;

      // Emit event
      this.emitEvent('subscription-created', subscriptionWithMetadata);

      return {
        isSupported: true,
        isSubscribed: true,
        isPushEnabled: true,
        subscription: subscriptionWithMetadata
      };

    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return {
        isSupported: true,
        isSubscribed: false,
        isPushEnabled: false,
        subscription: null,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Unsubscribe from push notifications
  async unsubscribe(): Promise<boolean> {
    try {
      if (!this.isSupported) {
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      const pushSubscription = await registration.pushManager.getSubscription();
      
      if (pushSubscription) {
        const success = await pushSubscription.unsubscribe();
        
        if (success) {
          // Remove from server
          if (this.subscription) {
            await this.removeSubscriptionFromServer(this.subscription.id);
          }
          
          // Clear local storage
          localStorage.removeItem('studyspark_push_subscription');
          
          // Emit event
          this.emitEvent('subscription-deleted', this.subscription);
          
          this.subscription = null;
          this.isSubscribed = false;
          
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      return false;
    }
  }

  // Get current subscription status
  async getStatus(): Promise<PushSubscriptionStatus> {
    if (!this.isSupported) {
      return {
        isSupported: false,
        isSubscribed: false,
        isPushEnabled: false,
        subscription: null
      };
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const pushSubscription = await registration.pushManager.getSubscription();
      const permission = Notification.permission;
      
      const isSubscribed = !!pushSubscription && !!this.subscription;
      const isPushEnabled = permission === 'granted' && isSubscribed;

      return {
        isSupported: true,
        isSubscribed,
        isPushEnabled,
        subscription: this.subscription
      };
    } catch (error) {
      return {
        isSupported: true,
        isSubscribed: false,
        isPushEnabled: false,
        subscription: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Utility methods
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  private generateSubscriptionId(endpoint: string): string {
    // Generate a unique ID based on endpoint
    return `sub_${Date.now()}_${endpoint.slice(-10)}`;
  }

  // Server communication
  private async sendSubscriptionToServer(subscription: PushSubscriptionWithMetadata): Promise<void> {
    try {
      // Try Supabase first
      const userId = await this.getCurrentUserId();
      if (userId) {
        try {
          await supabasePushService.saveSubscription(userId, subscription);
          console.log('✅ Subscription saved to Supabase');
          return;
        } catch (supabaseError) {
          console.warn('⚠️ Failed to save to Supabase, falling back to API:', supabaseError);
        }
      }

      // Fallback to API route
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...subscription, userId })
      });

      if (!response.ok) {
        throw new Error(`Failed to save subscription: ${response.statusText}`);
      }

    } catch (error) {
      console.warn('Failed to save subscription to server:', error);
      // Don't throw - local subscription still works
    }
  }

  private async removeSubscriptionFromServer(subscriptionId: string): Promise<void> {
    try {
      const response = await fetch(`/api/push/unsubscribe/${subscriptionId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Failed to remove subscription: ${response.statusText}`);
      }

    } catch (error) {
      console.warn('Failed to remove subscription from server:', error);
      // Don't throw - local unsubscription still works
    }
  }

  // Event system
  private emitEvent(type: PushSubscriptionEventType, data: any): void {
    const event: PushSubscriptionEvent = {
      type,
      data,
      timestamp: new Date().toISOString()
    };

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pushSubscriptionEvent', {
        detail: event
      }));
    }
  }

  // Public getters
  getSubscription(): PushSubscriptionWithMetadata | null {
    return this.subscription;
  }

  getIsSupported(): boolean {
    return this.isSupported;
  }

  getIsSubscribed(): boolean {
    return this.isSubscribed;
  }

  // Get current user ID (works in browser context)
  private async getCurrentUserId(): Promise<string | null> {
    try {
      // Try to get user from window object (set by Clerk)
      if (typeof window !== 'undefined' && (window as any).__clerk_user) {
        return (window as any).__clerk_user.id;
      }

      // Try to get from Clerk's public API
      if (typeof window !== 'undefined' && (window as any).Clerk) {
        const user = await (window as any).Clerk.user;
        return user?.id || null;
      }

      return null;
    } catch (error) {
      console.warn('Failed to get current user ID:', error);
      return null;
    }
  }

  // Send rich push notification
  async sendRichNotification(
    notification: RichNotification,
    notificationType: NotificationType
  ): Promise<boolean> {
    try {
      const status = await this.getStatus();
      
      if (!status.isPushEnabled) {
        console.error('Push notifications not enabled');
        return false;
      }

      if (!this.subscription) {
        console.error('No active subscription for push notification');
        return false;
      }

      const userId = await this.getCurrentUserId();

      // Log notification to database
      if (userId) {
        await supabasePushService.logNotification(
          userId,
          this.subscription.id,
          notification,
          notificationType
        );
      }

      const payload = {
        subscriptionId: this.subscription.id,
        userId,
        notificationType,
        ...notification
      };

      const response = await fetch('/api/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Push notification failed:', response.status, errorText);
        return false;
      }
      
      return response.ok;
    } catch (error) {
      console.error('Failed to send push notification:', error);
      return false;
    }
  }



  // Schedule task reminder
  async scheduleTaskReminder(
    taskId: string,
    taskTitle: string,
    dueDate: string,
    reminderMinutes: number = 15
  ): Promise<string | null> {
    const userId = await this.getCurrentUserId();
    if (!userId) {
      console.error('User not authenticated');
      return null;
    }

    return await supabasePushService.scheduleTaskReminder(
      userId,
      taskId,
      taskTitle,
      dueDate,
      reminderMinutes
    );
  }

  // Send achievement notification
  async sendAchievementNotification(
    achievementTitle: string,
    achievementDescription: string
  ): Promise<boolean> {
    const notification: RichNotification = {
      title: '🏆 Achievement Unlocked!',
      body: `${achievementTitle} - ${achievementDescription}`,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      image: '/achievements/celebration.png',
      data: {
        url: '/dashboard?tab=achievements',
        requireInteraction: true,
        actions: [
          { action: 'view', title: 'View Achievement', icon: '👀' },
          { action: 'share', title: 'Share', icon: '📤' }
        ]
      },
      actions: [
        { action: 'view', title: 'View Achievement', icon: '👀' },
        { action: 'share', title: 'Share', icon: '📤' }
      ],
      requireInteraction: true,
      timestamp: Date.now()
    };

    return await this.sendRichNotification(notification, 'achievement');
  }
}

// Export singleton instance
export const pushSubscriptionManager = PushSubscriptionManager.getInstance(); 