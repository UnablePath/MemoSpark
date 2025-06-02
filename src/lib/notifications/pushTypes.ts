export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushSubscriptionWithMetadata extends PushSubscriptionData {
  id: string;
  userAgent?: string;
  createdAt: string;
  lastUsed: string;
  isActive: boolean;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: Record<string, any>;
  tag?: string;
  requireInteraction?: boolean;
  actions?: Array<{ action: string; title: string; icon?: string }>;
  vibrate?: number[];
  timestamp?: number;
}

export interface WebPushMessage {
  notification: PushNotificationPayload;
  subscriptionId?: string;
  userId?: string;
  priority?: 'normal' | 'high';
  ttl?: number; // Time to live in seconds
}

export interface PushSubscriptionStatus {
  isSupported: boolean;
  isSubscribed: boolean;
  isPushEnabled: boolean;
  subscription: PushSubscriptionWithMetadata | null;
  error?: string;
}

export interface VapidKeys {
  publicKey: string;
  privateKey: string;
  email: string;
}

export type PushSubscriptionEventType = 
  | 'subscription-created' 
  | 'subscription-deleted' 
  | 'subscription-updated';

export interface PushSubscriptionEvent {
  type: PushSubscriptionEventType;
  data: any;
  timestamp: string;
}

// Database types
export interface DatabasePushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
  user_agent?: string;
  created_at: string;
  last_used: string;
  is_active: boolean;
}

export interface NotificationLog {
  id: string;
  user_id: string;
  subscription_id?: string;
  notification_type: NotificationType;
  title: string;
  body: string;
  data: Record<string, any>;
  sent_at: string;
  delivered_at?: string;
  clicked_at?: string;
  status: 'sent' | 'delivered' | 'clicked' | 'failed';
  error_message?: string;
}

export interface ScheduledNotification {
  id: string;
  user_id: string;
  task_id?: string;
  notification_type: NotificationType;
  title: string;
  body: string;
  data: Record<string, any>;
  scheduled_for: string;
  sent_at?: string;
  created_at: string;
  is_recurring: boolean;
  recurrence_pattern?: string;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  push_enabled: boolean;
  email_enabled: boolean;
  task_reminders: boolean;
  study_sessions: boolean;
  break_reminders: boolean;
  achievements: boolean;
  daily_summary: boolean;
  reminder_minutes_before: number;
  quiet_hours_start: string;
  quiet_hours_end: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

// Rich notification types
export type NotificationType = 
  | 'task_reminder' 
  | 'study_session' 
  | 'break_reminder' 
  | 'achievement' 
  | 'daily_summary';

export interface RichNotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export interface RichNotificationData {
  url?: string;
  taskId?: string;
  achievementId?: string;
  actions?: RichNotificationAction[];
  image?: string;
  badge?: string;
  vibrate?: number[];
  silent?: boolean;
  tag?: string;
  renotify?: boolean;
  requireInteraction?: boolean;
}

export interface RichNotification {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: RichNotificationData;
  actions?: RichNotificationAction[];
  tag?: string;
  timestamp?: number;
  renotify?: boolean;
  silent?: boolean;
  requireInteraction?: boolean;
  vibrate?: number[];
}

// Analytics types
export interface NotificationAnalytics {
  total_sent: number;
  total_delivered: number;
  total_clicked: number;
  total_failed: number;
  delivery_rate: number;
  click_rate: number;
  engagement_rate: number;
  top_notification_types: Array<{
    type: NotificationType;
    count: number;
    engagement_rate: number;
  }>;
  hourly_distribution: Array<{
    hour: number;
    count: number;
    engagement_rate: number;
  }>;
  recent_activity: NotificationLog[];
}

export interface UserNotificationStats {
  user_id: string;
  total_notifications: number;
  engagement_score: number;
  preferred_times: number[];
  most_engaged_types: NotificationType[];
  last_interaction: string;
} 