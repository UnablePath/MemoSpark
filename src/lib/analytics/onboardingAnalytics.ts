'use client';

interface OnboardingEvent {
  event: string;
  step?: number;
  stepName?: string;
  userId?: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

class OnboardingAnalytics {
  private events: OnboardingEvent[] = [];
  private sessionId: string;
  private startTime: number;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
  }

  private generateSessionId(): string {
    return `onboarding_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Track step entry
  trackStepEntered(step: number, stepName: string, userId?: string) {
    const event: OnboardingEvent = {
      event: 'step_entered',
      step,
      stepName,
      userId,
      timestamp: Date.now(),
      metadata: {
        sessionId: this.sessionId,
        timeFromStart: Date.now() - this.startTime,
      }
    };

    this.events.push(event);
    this.sendToAnalytics(event);
    
    // Store in localStorage for persistence
    this.persistEvent(event);
  }

  // Track step completion
  trackStepCompleted(step: number, stepName: string, userId?: string, data?: any) {
    const event: OnboardingEvent = {
      event: 'step_completed',
      step,
      stepName,
      userId,
      timestamp: Date.now(),
      metadata: {
        sessionId: this.sessionId,
        timeFromStart: Date.now() - this.startTime,
        stepData: data,
      }
    };

    this.events.push(event);
    this.sendToAnalytics(event);
    this.persistEvent(event);
  }

  // Track step skipped
  trackStepSkipped(step: number, stepName: string, userId?: string) {
    const event: OnboardingEvent = {
      event: 'step_skipped',
      step,
      stepName,
      userId,
      timestamp: Date.now(),
      metadata: {
        sessionId: this.sessionId,
        timeFromStart: Date.now() - this.startTime,
      }
    };

    this.events.push(event);
    this.sendToAnalytics(event);
    this.persistEvent(event);
  }

  // Track drop-off (user leaves without completing)
  trackDropOff(step: number, stepName: string, userId?: string, reason?: string) {
    const event: OnboardingEvent = {
      event: 'onboarding_dropped_off',
      step,
      stepName,
      userId,
      timestamp: Date.now(),
      metadata: {
        sessionId: this.sessionId,
        timeFromStart: Date.now() - this.startTime,
        reason,
        completedSteps: this.getCompletedSteps(),
      }
    };

    this.events.push(event);
    this.sendToAnalytics(event);
    this.persistEvent(event);
  }

  // Track successful completion
  trackOnboardingCompleted(userId: string, finalData?: any) {
    const event: OnboardingEvent = {
      event: 'onboarding_completed',
      userId,
      timestamp: Date.now(),
      metadata: {
        sessionId: this.sessionId,
        totalTime: Date.now() - this.startTime,
        completedSteps: this.getCompletedSteps(),
        skippedSteps: this.getSkippedSteps(),
        finalData,
      }
    };

    this.events.push(event);
    this.sendToAnalytics(event);
    this.persistEvent(event);
    
    // Clear stored events after successful completion
    this.clearStoredEvents();
  }

  // Track validation errors
  trackValidationError(step: number, stepName: string, errors: Record<string, string[]>, userId?: string) {
    const event: OnboardingEvent = {
      event: 'validation_error',
      step,
      stepName,
      userId,
      timestamp: Date.now(),
      metadata: {
        sessionId: this.sessionId,
        errors,
        timeFromStart: Date.now() - this.startTime,
      }
    };

    this.events.push(event);
    this.sendToAnalytics(event);
    this.persistEvent(event);
  }

  private getCompletedSteps(): number[] {
    return this.events
      .filter(e => e.event === 'step_completed')
      .map(e => e.step!)
      .filter(Boolean);
  }

  private getSkippedSteps(): number[] {
    return this.events
      .filter(e => e.event === 'step_skipped')
      .map(e => e.step!)
      .filter(Boolean);
  }

  private sendToAnalytics(event: OnboardingEvent) {
    // Send to Google Analytics if available
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', event.event, {
        event_category: 'onboarding',
        event_label: event.stepName || `step_${event.step}`,
        value: event.step,
        custom_parameters: {
          session_id: this.sessionId,
          user_id: event.userId,
          ...event.metadata,
        },
      });
    }

    // Send to custom analytics endpoint
    this.sendToCustomAnalytics(event);
  }

  private async sendToCustomAnalytics(event: OnboardingEvent) {
    try {
      // Only send in production or if explicitly enabled
      if (process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_ENABLE_ANALYTICS) {
        console.log('Onboarding Analytics (dev):', event);
        return;
      }

      await fetch('/api/analytics/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });
    } catch (error) {
      console.warn('Failed to send onboarding analytics:', error);
    }
  }

  private persistEvent(event: OnboardingEvent) {
    try {
      const stored = localStorage.getItem('onboarding_analytics') || '[]';
      const events = JSON.parse(stored);
      events.push(event);
      
      // Keep only last 50 events to prevent storage bloat
      if (events.length > 50) {
        events.splice(0, events.length - 50);
      }
      
      localStorage.setItem('onboarding_analytics', JSON.stringify(events));
    } catch (error) {
      console.warn('Failed to persist onboarding event:', error);
    }
  }

  private clearStoredEvents() {
    try {
      localStorage.removeItem('onboarding_analytics');
    } catch (error) {
      console.warn('Failed to clear stored onboarding events:', error);
    }
  }

  // Get analytics summary for debugging
  getAnalyticsSummary() {
    return {
      sessionId: this.sessionId,
      startTime: this.startTime,
      totalTime: Date.now() - this.startTime,
      events: this.events.length,
      completedSteps: this.getCompletedSteps(),
      skippedSteps: this.getSkippedSteps(),
      lastEvent: this.events[this.events.length - 1],
    };
  }

  // Restore from localStorage on page refresh
  restoreFromStorage() {
    try {
      const stored = localStorage.getItem('onboarding_analytics');
      if (stored) {
        const events = JSON.parse(stored);
        // Only restore events from the last hour to avoid stale data
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        this.events = events.filter((e: OnboardingEvent) => e.timestamp > oneHourAgo);
      }
    } catch (error) {
      console.warn('Failed to restore onboarding analytics from storage:', error);
    }
  }
}

// Singleton instance
let onboardingAnalytics: OnboardingAnalytics | null = null;

export const getOnboardingAnalytics = (): OnboardingAnalytics => {
  if (!onboardingAnalytics) {
    onboardingAnalytics = new OnboardingAnalytics();
    onboardingAnalytics.restoreFromStorage();
  }
  return onboardingAnalytics;
};

// Hook for React components
export const useOnboardingAnalytics = () => {
  return getOnboardingAnalytics();
};
