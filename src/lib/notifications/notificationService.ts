'use client';

import type { 
  NotificationPermissionState,
  ScheduledNotification,
  NotificationSettings,
  NotificationQueueItem,
  NotificationServiceConfig,
  NotificationStats,
  NotificationType,
  NotificationPriority
} from './types';
import type { UserAIPreferences } from '@/types/ai';
import { serviceWorkerManager } from './serviceWorkerManager';

export class NotificationService {
  private static instance: NotificationService;
  private notificationQueue: Map<string, NotificationQueueItem> = new Map();
  private settings: NotificationSettings;
  private stats: NotificationStats;
  private config: NotificationServiceConfig;
  private permissionState: NotificationPermissionState;
  private worker: Worker | null = null;

  private constructor() {
    this.config = {
      maxRetries: 3,
      retryDelay: 5000, // 5 seconds
      maxQueueSize: 100,
      defaultIcon: '/favicon.ico',
      defaultBadge: '/favicon.ico',
      enableServiceWorker: true // Enable service worker for background notifications
    };

    this.settings = this.loadSettings();
    this.stats = this.loadStats();
    this.permissionState = this.getPermissionState();
    
    this.initializeService();
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private initializeService(): void {
    // Initialize Service Worker for background processing if enabled
    if (this.config.enableServiceWorker) {
      try {
        // Service worker manager handles registration automatically
        console.log('Notification service initialized with service worker support');
      } catch (error) {
        console.warn('Failed to initialize service worker:', error);
      }
    }

    // Listen for visibility changes to handle notification cleanup
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    }

    // Set up periodic cleanup
    setInterval(() => {
      this.cleanupExpiredNotifications();
    }, 60000); // Every minute
  }

  // Permission Management
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isNotificationSupported()) {
      console.warn('Notifications are not supported in this browser');
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      this.permissionState = {
        permission,
        isSupported: this.isNotificationSupported(),
        lastChecked: new Date().toISOString()
      };
      
      this.settings.permission = permission;
      this.saveSettings();
      
      return permission;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return 'denied';
    }
  }

  getPermissionState(): NotificationPermissionState {
    const isSupported = this.isNotificationSupported();
    const permission = isSupported ? Notification.permission : 'denied';
    
    return {
      permission,
      isSupported,
      lastChecked: new Date().toISOString()
    };
  }

  private isNotificationSupported(): boolean {
    return typeof window !== 'undefined' && 
           'Notification' in window && 
           typeof Notification.requestPermission === 'function';
  }

  // Notification Scheduling
  async scheduleNotification(notification: ScheduledNotification): Promise<boolean> {
    if (!this.canScheduleNotification(notification)) {
      return false;
    }

    const scheduledTime = new Date(notification.scheduledTime);
    const now = new Date();
    const delay = scheduledTime.getTime() - now.getTime();

    if (delay <= 0) {
      // Send immediately if scheduled time has passed
      return this.sendNotification(notification);
    }

    // Check if we're within quiet hours
    if (this.isQuietHours(scheduledTime)) {
      console.log('Notification scheduled for quiet hours, will be delayed');
      // Reschedule for after quiet hours
      const newTime = this.getNextAvailableTime(scheduledTime);
      notification.scheduledTime = newTime.toISOString();
      return this.scheduleNotification(notification);
    }

    // Try to use service worker first for better reliability
    if (this.config.enableServiceWorker && serviceWorkerManager.isAvailable()) {
      const swScheduled = await serviceWorkerManager.scheduleNotification(notification);
      if (swScheduled) {
        this.stats.totalScheduled++;
        this.saveStats();
        console.log(`Notification scheduled via service worker for ${notification.scheduledTime}:`, notification.title);
        return true;
      }
    }

    // Fallback to main thread scheduling
    const timeoutId = window.setTimeout(() => {
      this.sendNotification(notification);
      this.notificationQueue.delete(notification.id);
    }, delay);

    const queueItem: NotificationQueueItem = {
      notification,
      timeoutId,
      retryCount: 0
    };

    this.notificationQueue.set(notification.id, queueItem);
    this.stats.totalScheduled++;
    this.saveStats();

    console.log(`Notification scheduled via main thread for ${notification.scheduledTime}:`, notification.title);
    return true;
  }

  private canScheduleNotification(notification: ScheduledNotification): boolean {
    // Check if notifications are enabled
    if (!this.settings.enabled) {
      console.log('Notifications are disabled');
      return false;
    }

    // Check if this notification type is enabled
    const typeSettings = this.settings.types[notification.type];
    if (!typeSettings?.enabled) {
      console.log(`Notifications for type ${notification.type} are disabled`);
      return false;
    }

    // Check permission
    if (this.permissionState.permission !== 'granted') {
      console.log('Notification permission not granted');
      return false;
    }

    // Check queue size
    if (this.notificationQueue.size >= this.config.maxQueueSize) {
      console.warn('Notification queue is full');
      return false;
    }

    // Check daily limit
    if (this.stats.totalSent >= this.settings.maxDailyNotifications) {
      console.log('Daily notification limit reached');
      return false;
    }

    return true;
  }

  private async sendNotification(notification: ScheduledNotification): Promise<boolean> {
    try {
      const notificationOptions: NotificationOptions = {
        body: notification.body,
        icon: notification.icon || this.config.defaultIcon,
        badge: notification.badge || this.config.defaultBadge,
        data: {
          ...notification.data,
          notificationId: notification.id,
          relatedTaskId: notification.relatedTaskId,
          relatedReminderId: notification.relatedReminderId,
          type: notification.type
        },
        requireInteraction: notification.requireInteraction || false
        // Note: actions are not supported in all browsers, so we'll handle them through click events
      };

      // Add vibration for mobile if enabled
      const typeSettings = this.settings.types[notification.type];
      if (typeSettings?.vibrate && 'vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }

      const browserNotification = new Notification(notification.title, notificationOptions);

      // Handle notification click
      browserNotification.onclick = (event) => {
        event.preventDefault();
        this.handleNotificationClick(notification);
        browserNotification.close();
      };

      // Handle notification close
      browserNotification.onclose = () => {
        this.stats.totalDismissed++;
        this.saveStats();
      };

      // Auto-close notification after 10 seconds if not requiring interaction
      if (!notification.requireInteraction) {
        setTimeout(() => {
          browserNotification.close();
        }, 10000);
      }

      this.stats.totalSent++;
      this.saveStats();

      console.log('Notification sent:', notification.title);
      return true;
    } catch (error) {
      console.error('Failed to send notification:', error);
      return false;
    }
  }

  private handleNotificationClick(notification: ScheduledNotification): void {
    this.stats.totalClicked++;
    this.saveStats();

    // Focus the window
    if (typeof window !== 'undefined') {
      window.focus();
    }

    // Navigate to related content
    if (notification.relatedTaskId) {
      // Navigate to task or trigger task-related action
      this.navigateToTask(notification.relatedTaskId);
    } else if (notification.relatedReminderId) {
      // Navigate to reminders tab
      this.navigateToReminders();
    }

    // Trigger custom event for other components to listen to
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('notificationClicked', {
        detail: { notification }
      }));
    }
  }

  private navigateToTask(taskId: string): void {
    // This would integrate with your router
    if (typeof window !== 'undefined') {
      // For now, we'll just trigger a custom event
      window.dispatchEvent(new CustomEvent('navigateToTask', {
        detail: { taskId }
      }));
    }
  }

  private navigateToReminders(): void {
    // Navigate to reminders tab
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('navigateToReminders'));
    }
  }

  // Utility Methods
  private isQuietHours(date: Date): boolean {
    if (!this.settings.quietHours.enabled) {
      return false;
    }

    const timeStr = date.toTimeString().substring(0, 5); // HH:mm format
    const { startTime, endTime } = this.settings.quietHours;

    // Handle quiet hours that span midnight
    if (startTime > endTime) {
      return timeStr >= startTime || timeStr <= endTime;
    } else {
      return timeStr >= startTime && timeStr <= endTime;
    }
  }

  private getNextAvailableTime(date: Date): Date {
    if (!this.settings.quietHours.enabled) {
      return date;
    }

    const nextDay = new Date(date);
    const [endHour, endMinute] = this.settings.quietHours.endTime.split(':').map(Number);
    
    nextDay.setHours(endHour, endMinute, 0, 0);
    
    // If end time is today and hasn't passed yet, use it
    if (nextDay > new Date()) {
      return nextDay;
    }
    
    // Otherwise, use tomorrow's end time
    nextDay.setDate(nextDay.getDate() + 1);
    return nextDay;
  }

  private handleVisibilityChange(): void {
    if (document.visibilityState === 'visible') {
      // App became visible, check for any missed notifications
      this.checkMissedNotifications();
    }
  }

  private checkMissedNotifications(): void {
    // Implementation for checking and handling missed notifications
    // This could involve checking with a backend service or local storage
    console.log('Checking for missed notifications...');
  }

  private cleanupExpiredNotifications(): void {
    const now = new Date();
    const expiredIds: string[] = [];

    this.notificationQueue.forEach((item, id) => {
      const scheduledTime = new Date(item.notification.scheduledTime);
      // Clean up notifications that are more than 1 hour past their scheduled time
      if (now.getTime() - scheduledTime.getTime() > 3600000) {
        if (item.timeoutId) {
          clearTimeout(item.timeoutId);
        }
        expiredIds.push(id);
      }
    });

    expiredIds.forEach(id => {
      this.notificationQueue.delete(id);
    });

    if (expiredIds.length > 0) {
      console.log(`Cleaned up ${expiredIds.length} expired notifications`);
    }
  }

  // Settings Management
  updateSettings(newSettings: Partial<NotificationSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
  }

  updateSettingsFromAIPreferences(aiPreferences: UserAIPreferences): void {
    const updatedSettings: Partial<NotificationSettings> = {
      types: {
        ...this.settings.types,
        study_reminder: {
          ...this.settings.types.study_reminder,
          enabled: aiPreferences.enableStudyReminders,
          advanceTime: aiPreferences.reminderAdvanceTime
        },
        break_reminder: {
          ...this.settings.types.break_reminder,
          enabled: aiPreferences.enableBreakReminders,
          advanceTime: aiPreferences.reminderAdvanceTime
        }
      }
    };

    this.updateSettings(updatedSettings);
  }

  getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  private loadSettings(): NotificationSettings {
    if (typeof window === 'undefined') {
      return this.getDefaultSettings();
    }

    try {
      const saved = localStorage.getItem('studyspark_notification_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...this.getDefaultSettings(), ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load notification settings:', error);
    }

    return this.getDefaultSettings();
  }

  private saveSettings(): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('studyspark_notification_settings', JSON.stringify(this.settings));
      } catch (error) {
        console.warn('Failed to save notification settings:', error);
      }
    }
  }

  private getDefaultSettings(): NotificationSettings {
    return {
      enabled: true,
      permission: this.getPermissionState().permission,
      types: {
        task_due: { enabled: true, advanceTime: 15, sound: true, vibrate: true },
        study_reminder: { enabled: true, advanceTime: 5, sound: true, vibrate: false },
        break_reminder: { enabled: true, advanceTime: 0, sound: false, vibrate: true },
        achievement: { enabled: true, sound: true, vibrate: true },
        streak_reminder: { enabled: true, sound: false, vibrate: false },
        general: { enabled: true, sound: false, vibrate: false }
      },
      quietHours: {
        enabled: false,
        startTime: '22:00',
        endTime: '07:00'
      },
      maxDailyNotifications: 20
    };
  }

  // Stats Management
  getStats(): NotificationStats {
    return { ...this.stats };
  }

  resetStats(): void {
    this.stats = {
      totalScheduled: 0,
      totalSent: 0,
      totalClicked: 0,
      totalDismissed: 0,
      lastReset: new Date().toISOString()
    };
    this.saveStats();
  }

  private loadStats(): NotificationStats {
    if (typeof window === 'undefined') {
      return this.getDefaultStats();
    }

    try {
      const saved = localStorage.getItem('studyspark_notification_stats');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Reset stats daily
        const lastReset = new Date(parsed.lastReset);
        const now = new Date();
        if (now.getDate() !== lastReset.getDate() || 
            now.getMonth() !== lastReset.getMonth() || 
            now.getFullYear() !== lastReset.getFullYear()) {
          return this.getDefaultStats();
        }
        return parsed;
      }
    } catch (error) {
      console.warn('Failed to load notification stats:', error);
    }

    return this.getDefaultStats();
  }

  private saveStats(): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('studyspark_notification_stats', JSON.stringify(this.stats));
      } catch (error) {
        console.warn('Failed to save notification stats:', error);
      }
    }
  }

  private getDefaultStats(): NotificationStats {
    return {
      totalScheduled: 0,
      totalSent: 0,
      totalClicked: 0,
      totalDismissed: 0,
      lastReset: new Date().toISOString()
    };
  }

  // Public API for creating common notification types
  async scheduleTaskDueNotification(taskId: string, taskTitle: string, dueDate: string, advanceMinutes = 15): Promise<boolean> {
    const scheduledTime = new Date(new Date(dueDate).getTime() - (advanceMinutes * 60 * 1000));
    
    const notification: ScheduledNotification = {
      id: `task_due_${taskId}_${scheduledTime.getTime()}`,
      title: '📚 Task Due Soon',
      body: `"${taskTitle}" is due in ${advanceMinutes} minutes`,
      scheduledTime: scheduledTime.toISOString(),
      type: 'task_due',
      priority: 'high',
      relatedTaskId: taskId,
      requireInteraction: true,
      actions: [
        { action: 'view', title: 'View Task' },
        { action: 'complete', title: 'Mark Complete' }
      ]
    };

    return this.scheduleNotification(notification);
  }

  async scheduleStudyReminder(title: string, body: string, scheduledTime: string): Promise<boolean> {
    const notification: ScheduledNotification = {
      id: `study_reminder_${Date.now()}`,
      title: `🎯 ${title}`,
      body,
      scheduledTime,
      type: 'study_reminder',
      priority: 'medium',
      actions: [
        { action: 'start', title: 'Start Studying' },
        { action: 'snooze', title: 'Snooze 10min' }
      ]
    };

    return this.scheduleNotification(notification);
  }

  async scheduleBreakReminder(scheduledTime: string): Promise<boolean> {
    const notification: ScheduledNotification = {
      id: `break_reminder_${Date.now()}`,
      title: '☕ Time for a Break',
      body: 'You\'ve been studying hard! Take a short break to recharge.',
      scheduledTime,
      type: 'break_reminder',
      priority: 'low',
      actions: [
        { action: 'break', title: 'Take Break' },
        { action: 'continue', title: 'Keep Studying' }
      ]
    };

    return this.scheduleNotification(notification);
  }

  async sendAchievementNotification(achievementTitle: string, description: string): Promise<boolean> {
    const notification: ScheduledNotification = {
      id: `achievement_${Date.now()}`,
      title: `🏆 Achievement Unlocked!`,
      body: `${achievementTitle}: ${description}`,
      scheduledTime: new Date().toISOString(),
      type: 'achievement',
      priority: 'medium',
      requireInteraction: true
    };

    return this.scheduleNotification(notification);
  }

  // Cleanup methods
  cancelNotification(notificationId: string): boolean {
    // Try to cancel via service worker first
    if (this.config.enableServiceWorker && serviceWorkerManager.isAvailable()) {
      serviceWorkerManager.cancelNotification(notificationId);
    }

    // Also cancel from main thread queue
    const queueItem = this.notificationQueue.get(notificationId);
    if (queueItem) {
      if (queueItem.timeoutId) {
        clearTimeout(queueItem.timeoutId);
      }
      this.notificationQueue.delete(notificationId);
      console.log(`Cancelled notification: ${notificationId}`);
      return true;
    }
    return false;
  }

  cancelAllNotifications(): void {
    // Try to cancel via service worker first
    if (this.config.enableServiceWorker && serviceWorkerManager.isAvailable()) {
      serviceWorkerManager.cancelAllNotifications();
    }

    // Also cancel from main thread queue
    this.notificationQueue.forEach((item, id) => {
      if (item.timeoutId) {
        clearTimeout(item.timeoutId);
      }
    });
    this.notificationQueue.clear();
    console.log('All notifications cancelled');
  }

  // Get queued notifications
  async getQueuedNotifications(): Promise<ScheduledNotification[]> {
    const mainThreadNotifications = Array.from(this.notificationQueue.values()).map(item => item.notification);
    
    // Also get notifications from service worker if available
    if (this.config.enableServiceWorker && serviceWorkerManager.isAvailable()) {
      try {
        const swNotifications = await serviceWorkerManager.getScheduledNotifications();
        return [...mainThreadNotifications, ...swNotifications];
      } catch (error) {
        console.warn('Failed to get service worker notifications:', error);
      }
    }
    
    return mainThreadNotifications;
  }

  // Destroy the service
  destroy(): void {
    this.cancelAllNotifications();
    
    // Unregister service worker if needed
    if (this.config.enableServiceWorker && serviceWorkerManager.isAvailable()) {
      serviceWorkerManager.unregister();
    }
    
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    }
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance(); 