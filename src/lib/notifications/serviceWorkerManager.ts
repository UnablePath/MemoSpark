'use client';

import type { ScheduledNotification } from './types';

export class ServiceWorkerManager {
  private static instance: ServiceWorkerManager;
  private registration: ServiceWorkerRegistration | null = null;
  private isSupported: boolean = false;
  private isRegistered: boolean = false;

  private constructor() {
    this.isSupported = this.checkServiceWorkerSupport();
    if (this.isSupported) {
      this.registerServiceWorker();
    }
  }

  static getInstance(): ServiceWorkerManager {
    if (!ServiceWorkerManager.instance) {
      ServiceWorkerManager.instance = new ServiceWorkerManager();
    }
    return ServiceWorkerManager.instance;
  }

  private checkServiceWorkerSupport(): boolean {
    return typeof window !== 'undefined' && 
           'serviceWorker' in navigator && 
           'PushManager' in window &&
           'Notification' in window;
  }

  private async registerServiceWorker(): Promise<void> {
    try {
      if (!this.isSupported) {
        console.warn('Service Workers are not supported in this browser');
        return;
      }

      this.registration = await navigator.serviceWorker.register('/sw-notifications.js', {
        scope: '/'
      });

      this.isRegistered = true;

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage.bind(this));

      console.log('StudySpark Notification Service Worker registered successfully');

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;
      
    } catch (error) {
      console.error('Failed to register service worker:', error);
      this.isRegistered = false;
    }
  }

  private handleServiceWorkerMessage(event: MessageEvent): void {
    const { type, data } = event.data;

    switch (type) {
      case 'NOTIFICATION_CLICKED':
        this.handleNotificationClick(data);
        break;
      case 'SCHEDULED_NOTIFICATIONS_RESPONSE':
        // Handle scheduled notifications response
        break;
      case 'SCHEDULED_NOTIFICATIONS_ERROR':
        console.error('Service Worker error:', data);
        break;
      default:
        console.log('Unknown service worker message:', type, data);
    }
  }

  private handleNotificationClick(data: any): void {
    // Trigger custom event for main application to handle
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('notificationClicked', {
        detail: { notification: { data } }
      }));
    }
  }

  // Public API for notification scheduling via service worker
  async scheduleNotification(notification: ScheduledNotification): Promise<boolean> {
    if (!this.isRegistered || !this.registration?.active) {
      console.warn('Service worker not available, falling back to main thread scheduling');
      return false;
    }

    try {
      this.registration.active.postMessage({
        type: 'SCHEDULE_NOTIFICATION',
        data: { notification }
      });
      
      console.log('Notification scheduled via service worker:', notification.title);
      return true;
    } catch (error) {
      console.error('Failed to schedule notification via service worker:', error);
      return false;
    }
  }

  async cancelNotification(notificationId: string): Promise<boolean> {
    if (!this.isRegistered || !this.registration?.active) {
      return false;
    }

    try {
      this.registration.active.postMessage({
        type: 'CANCEL_NOTIFICATION',
        data: { notificationId }
      });
      
      console.log('Notification cancelled via service worker:', notificationId);
      return true;
    } catch (error) {
      console.error('Failed to cancel notification via service worker:', error);
      return false;
    }
  }

  async cancelAllNotifications(): Promise<boolean> {
    if (!this.isRegistered || !this.registration?.active) {
      return false;
    }

    try {
      this.registration.active.postMessage({
        type: 'CANCEL_ALL_NOTIFICATIONS'
      });
      
      console.log('All notifications cancelled via service worker');
      return true;
    } catch (error) {
      console.error('Failed to cancel all notifications via service worker:', error);
      return false;
    }
  }

  async getScheduledNotifications(): Promise<ScheduledNotification[]> {
    if (!this.isRegistered || !this.registration?.active) {
      return [];
    }

    return new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      
      channel.port1.onmessage = (event) => {
        const { type, data, error } = event.data;
        
        if (type === 'SCHEDULED_NOTIFICATIONS_RESPONSE') {
          resolve(data || []);
        } else if (type === 'SCHEDULED_NOTIFICATIONS_ERROR') {
          reject(new Error(error));
        }
      };

      this.registration!.active!.postMessage({
        type: 'GET_SCHEDULED_NOTIFICATIONS'
      }, [channel.port2]);

      // Timeout after 5 seconds
      setTimeout(() => {
        reject(new Error('Timeout getting scheduled notifications'));
      }, 5000);
    });
  }

  // Check if service worker is available and active
  isAvailable(): boolean {
    return this.isSupported && 
           this.isRegistered && 
           this.registration?.active !== null;
  }

  // Get service worker registration
  getRegistration(): ServiceWorkerRegistration | null {
    return this.registration;
  }

  // Unregister service worker (for cleanup)
  async unregister(): Promise<boolean> {
    if (this.registration) {
      try {
        const result = await this.registration.unregister();
        this.registration = null;
        this.isRegistered = false;
        console.log('Service worker unregistered successfully');
        return result;
      } catch (error) {
        console.error('Failed to unregister service worker:', error);
        return false;
      }
    }
    return true;
  }
}

// Export singleton instance
export const serviceWorkerManager = ServiceWorkerManager.getInstance(); 