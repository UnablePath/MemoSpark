'use client';

import { useState, useEffect, useCallback } from 'react';
import { notificationService } from '@/lib/notifications/notificationService';
import type { 
  NotificationPermissionState, 
  NotificationSettings,
  NotificationStats,
  ScheduledNotification
} from '@/lib/notifications/types';
import type { UserAIPreferences } from '@/types/ai';

export interface UseNotificationsReturn {
  // Permission state
  permissionState: NotificationPermissionState;
  requestPermission: () => Promise<NotificationPermission>;
  
  // Settings
  settings: NotificationSettings;
  updateSettings: (newSettings: Partial<NotificationSettings>) => void;
  syncWithAIPreferences: (aiPreferences: UserAIPreferences) => void;
  
  // Stats
  stats: NotificationStats;
  resetStats: () => void;
  
  // Quick actions
  scheduleTaskDueNotification: (taskId: string, taskTitle: string, dueDate: string, advanceMinutes?: number) => Promise<boolean>;
  scheduleStudyReminder: (title: string, body: string, scheduledTime: string) => Promise<boolean>;
  scheduleBreakReminder: (scheduledTime: string) => Promise<boolean>;
  sendAchievementNotification: (achievementTitle: string, description: string) => Promise<boolean>;
  getQueuedNotifications: () => Promise<ScheduledNotification[]>;
  
  // Utility
  isSupported: boolean;
  isEnabled: boolean;
  canSendNotifications: boolean;
}

export const useNotifications = (): UseNotificationsReturn => {
  const [permissionState, setPermissionState] = useState<NotificationPermissionState>(
    notificationService.getPermissionState()
  );
  const [settings, setSettings] = useState<NotificationSettings>(
    notificationService.getSettings()
  );
  const [stats, setStats] = useState<NotificationStats>(
    notificationService.getStats()
  );

  // Update permission state when it changes
  const updatePermissionState = useCallback(() => {
    setPermissionState(notificationService.getPermissionState());
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    const permission = await notificationService.requestPermission();
    updatePermissionState();
    return permission;
  }, [updatePermissionState]);

  // Update settings
  const updateSettings = useCallback((newSettings: Partial<NotificationSettings>) => {
    notificationService.updateSettings(newSettings);
    setSettings(notificationService.getSettings());
  }, []);

  // Sync with AI preferences
  const syncWithAIPreferences = useCallback((aiPreferences: UserAIPreferences) => {
    notificationService.updateSettingsFromAIPreferences(aiPreferences);
    setSettings(notificationService.getSettings());
  }, []);

  // Reset stats
  const resetStats = useCallback(() => {
    notificationService.resetStats();
    setStats(notificationService.getStats());
  }, []);

  // Quick notification actions
  const scheduleTaskDueNotification = useCallback(async (
    taskId: string, 
    taskTitle: string, 
    dueDate: string, 
    advanceMinutes = 15
  ): Promise<boolean> => {
    const result = await notificationService.scheduleTaskDueNotification(
      taskId, 
      taskTitle, 
      dueDate, 
      advanceMinutes
    );
    setStats(notificationService.getStats());
    return result;
  }, []);

  const scheduleStudyReminder = useCallback(async (
    title: string, 
    body: string, 
    scheduledTime: string
  ): Promise<boolean> => {
    const result = await notificationService.scheduleStudyReminder(title, body, scheduledTime);
    setStats(notificationService.getStats());
    return result;
  }, []);

  const scheduleBreakReminder = useCallback(async (scheduledTime: string): Promise<boolean> => {
    const result = await notificationService.scheduleBreakReminder(scheduledTime);
    setStats(notificationService.getStats());
    return result;
  }, []);

  const sendAchievementNotification = useCallback(async (
    achievementTitle: string, 
    description: string
  ): Promise<boolean> => {
    const result = await notificationService.sendAchievementNotification(achievementTitle, description);
    setStats(notificationService.getStats());
    return result;
  }, []);

  const getQueuedNotifications = useCallback(async (): Promise<ScheduledNotification[]> => {
    return notificationService.getQueuedNotifications();
  }, []);

  // Listen for permission changes (e.g., from browser settings)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Check if permission changed while app was hidden
        const currentState = notificationService.getPermissionState();
        if (currentState.permission !== permissionState.permission) {
          updatePermissionState();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Periodic check for permission changes
    const permissionCheckInterval = setInterval(() => {
      const currentState = notificationService.getPermissionState();
      if (currentState.permission !== permissionState.permission) {
        updatePermissionState();
      }
    }, 5000); // Check every 5 seconds

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(permissionCheckInterval);
    };
  }, [permissionState.permission, updatePermissionState]);

  // Computed values
  const isSupported = permissionState.isSupported;
  const isEnabled = settings.enabled;
  const canSendNotifications = isSupported && 
                              permissionState.permission === 'granted' && 
                              isEnabled;

  return {
    // Permission state
    permissionState,
    requestPermission,
    
    // Settings
    settings,
    updateSettings,
    syncWithAIPreferences,
    
    // Stats
    stats,
    resetStats,
    
    // Quick actions
    scheduleTaskDueNotification,
    scheduleStudyReminder,
    scheduleBreakReminder,
    sendAchievementNotification,
    getQueuedNotifications,
    
    // Utility
    isSupported,
    isEnabled,
    canSendNotifications
  };
}; 