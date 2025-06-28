'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useUserTier } from '@/hooks/useUserTier';
import { usePremiumPopup } from '@/components/providers/premium-popup-provider';

interface StrategicPromptConfig {
  // Interaction-based triggers
  taskCreationCount?: number; // Show popup after X tasks created
  aiRequestCount?: number; // Show popup after X AI requests
  sessionDuration?: number; // Show popup after X minutes in session
  
  // Feature engagement triggers
  onCalendarInteraction?: boolean;
  onTimetableFullUsage?: boolean;
  onAILimitReached?: boolean;
  onFeatureDiscovery?: boolean;
  
  // Timing controls
  maxPromptsPerSession?: number;
  minTimeBetweenPrompts?: number; // Minutes between popups
  respectUserDismissals?: boolean;
}

interface EngagementMetrics {
  tasksCreated: number;
  aiRequestsMade: number;
  sessionStartTime: number;
  lastPopupTime: number;
  popupsShownThisSession: number;
  featureInteractions: Set<string>;
  calendarOpened: boolean;
  timetableViewed: boolean;
}

const DEFAULT_CONFIG: Required<StrategicPromptConfig> = {
  taskCreationCount: 3,
  aiRequestCount: 3,
  sessionDuration: 10, // 10 minutes
  onCalendarInteraction: true,
  onTimetableFullUsage: true,
  onAILimitReached: true,
  onFeatureDiscovery: true,
  maxPromptsPerSession: 3,
  minTimeBetweenPrompts: 5, // 5 minutes
  respectUserDismissals: true
};

export const useStrategicUpgradePrompts = (config: Partial<StrategicPromptConfig> = {}) => {
  const { tier } = useUserTier();
  const { showGeneralPopup, showFeatureGatePopup } = usePremiumPopup();
  
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const metricsRef = useRef<EngagementMetrics>({
    tasksCreated: 0,
    aiRequestsMade: 0,
    sessionStartTime: Date.now(),
    lastPopupTime: 0,
    popupsShownThisSession: 0,
    featureInteractions: new Set(),
    calendarOpened: false,
    timetableViewed: false
  });

  const isPremium = tier === 'premium';

  // Check if we can show a popup (respect timing and limits)
  const canShowPopup = useCallback(() => {
    if (isPremium) return false;
    
    const metrics = metricsRef.current;
    const now = Date.now();
    const timeSinceLastPopup = (now - metrics.lastPopupTime) / (1000 * 60); // Minutes
    
    // Respect popup limits
    if (metrics.popupsShownThisSession >= finalConfig.maxPromptsPerSession) {
      return false;
    }
    
    // Respect timing between popups
    if (metrics.lastPopupTime > 0 && timeSinceLastPopup < finalConfig.minTimeBetweenPrompts) {
      return false;
    }
    
    return true;
  }, [isPremium, finalConfig.maxPromptsPerSession, finalConfig.minTimeBetweenPrompts]);

  // Show popup and update metrics
  const triggerPopup = useCallback((type: 'general' | 'feature', featureName?: string) => {
    if (!canShowPopup()) return;
    
    const metrics = metricsRef.current;
    metrics.lastPopupTime = Date.now();
    metrics.popupsShownThisSession += 1;
    
    if (type === 'feature' && featureName) {
      showFeatureGatePopup(featureName);
    } else {
      showGeneralPopup();
    }
    
    // Analytics could be added here
    console.log('Strategic upgrade prompt triggered:', { type, featureName, metrics: { ...metrics } });
  }, [canShowPopup, showGeneralPopup, showFeatureGatePopup]);

  // Task creation tracking
  const onTaskCreated = useCallback(() => {
    if (isPremium) return;
    
    const metrics = metricsRef.current;
    metrics.tasksCreated += 1;
    
    if (metrics.tasksCreated >= finalConfig.taskCreationCount) {
      triggerPopup('general');
    }
  }, [isPremium, finalConfig.taskCreationCount, triggerPopup]);

  // AI request tracking
  const onAIRequestMade = useCallback(() => {
    if (isPremium) return;
    
    const metrics = metricsRef.current;
    metrics.aiRequestsMade += 1;
    
    if (metrics.aiRequestsMade >= finalConfig.aiRequestCount) {
      triggerPopup('feature', 'Unlimited AI Requests');
    }
  }, [isPremium, finalConfig.aiRequestCount, triggerPopup]);

  // Feature interaction tracking
  const onFeatureInteraction = useCallback((featureName: string, isRestricted = false) => {
    if (isPremium) return;
    
    const metrics = metricsRef.current;
    
    if (!metrics.featureInteractions.has(featureName)) {
      metrics.featureInteractions.add(featureName);
      
      if (finalConfig.onFeatureDiscovery) {
        // Show popup for premium features with 30% chance
        if (isRestricted && Math.random() < 0.3) {
          triggerPopup('feature', featureName);
        }
      }
    }
  }, [isPremium, finalConfig.onFeatureDiscovery, triggerPopup]);

  // Calendar interaction
  const onCalendarOpened = useCallback(() => {
    if (isPremium) return;
    
    const metrics = metricsRef.current;
    
    if (!metrics.calendarOpened && finalConfig.onCalendarInteraction) {
      metrics.calendarOpened = true;
      
      // 40% chance to show popup on first calendar interaction
      if (Math.random() < 0.4) {
        triggerPopup('general');
      }
    }
  }, [isPremium, finalConfig.onCalendarInteraction, triggerPopup]);

  // Timetable usage tracking
  const onTimetableViewed = useCallback(() => {
    if (isPremium) return;
    
    const metrics = metricsRef.current;
    
    if (!metrics.timetableViewed && finalConfig.onTimetableFullUsage) {
      metrics.timetableViewed = true;
      
      // 50% chance to show popup on first timetable view
      if (Math.random() < 0.5) {
        triggerPopup('feature', 'Advanced Schedule Management');
      }
    }
  }, [isPremium, finalConfig.onTimetableFullUsage, triggerPopup]);

  // AI limit reached
  const onAILimitReached = useCallback(() => {
    if (isPremium) return;
    
    if (finalConfig.onAILimitReached) {
      triggerPopup('feature', 'Unlimited AI Requests');
    }
  }, [isPremium, finalConfig.onAILimitReached, triggerPopup]);

  // Session duration tracking
  useEffect(() => {
    if (isPremium) return;
    
    const checkSessionDuration = () => {
      const metrics = metricsRef.current;
      const sessionMinutes = (Date.now() - metrics.sessionStartTime) / (1000 * 60);
      
      if (sessionMinutes >= finalConfig.sessionDuration && metrics.popupsShownThisSession === 0) {
        triggerPopup('general');
      }
    };
    
    const timer = setTimeout(checkSessionDuration, finalConfig.sessionDuration * 60 * 1000);
    
    return () => clearTimeout(timer);
  }, [isPremium, finalConfig.sessionDuration, triggerPopup]);

  // Engagement-based popup (every 15 minutes if user is active)
  useEffect(() => {
    if (isPremium) return;
    
    const showEngagementPopup = () => {
      const metrics = metricsRef.current;
      const sessionMinutes = (Date.now() - metrics.sessionStartTime) / (1000 * 60);
      
      // Show popup every 15 minutes if user has been active
      if (sessionMinutes > 15 && (metrics.tasksCreated > 0 || metrics.aiRequestsMade > 0)) {
        if (Math.random() < 0.3) { // 30% chance
          triggerPopup('general');
        }
      }
    };
    
    const interval = setInterval(showEngagementPopup, 15 * 60 * 1000); // Every 15 minutes
    
    return () => clearInterval(interval);
  }, [isPremium, triggerPopup]);

  // Return tracking functions for components to use
  return {
    // Main tracking functions
    onTaskCreated,
    onAIRequestMade,
    onFeatureInteraction,
    onCalendarOpened,
    onTimetableViewed,
    onAILimitReached,
    
    // Manual trigger for specific scenarios
    triggerUpgradePrompt: triggerPopup,
    
    // Current metrics (for debugging/analytics)
    getMetrics: () => ({ ...metricsRef.current }),
    
    // Configuration
    canShowPopup,
    isPremium
  };
}; 