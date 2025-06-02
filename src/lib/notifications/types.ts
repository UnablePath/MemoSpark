export interface NotificationPermissionState {
  permission: NotificationPermission;
  isSupported: boolean;
  lastChecked: string; // ISO date string
}

export interface ScheduledNotification {
  id: string;
  title: string;
  body: string;
  scheduledTime: string; // ISO date string
  type: NotificationType;
  priority: NotificationPriority;
  relatedTaskId?: string;
  relatedReminderId?: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
  actions?: NotificationAction[];
  requireInteraction?: boolean;
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export type NotificationType = 
  | 'task_due'
  | 'study_reminder' 
  | 'break_reminder'
  | 'achievement'
  | 'streak_reminder'
  | 'general';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface NotificationSettings {
  enabled: boolean;
  permission: NotificationPermission;
  types: {
    [K in NotificationType]: {
      enabled: boolean;
      advanceTime?: number; // Minutes before event
      sound?: boolean;
      vibrate?: boolean;
    };
  };
  quietHours: {
    enabled: boolean;
    startTime: string; // HH:mm format
    endTime: string; // HH:mm format
  };
  maxDailyNotifications: number;
}

export interface NotificationQueueItem {
  notification: ScheduledNotification;
  timeoutId?: number;
  retryCount: number;
  lastRetryTime?: string;
}

export interface NotificationServiceConfig {
  maxRetries: number;
  retryDelay: number; // Milliseconds
  maxQueueSize: number;
  defaultIcon: string;
  defaultBadge: string;
  enableServiceWorker: boolean;
}

export interface NotificationStats {
  totalScheduled: number;
  totalSent: number;
  totalClicked: number;
  totalDismissed: number;
  lastReset: string; // ISO date string
} 