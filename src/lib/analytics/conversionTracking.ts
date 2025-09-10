'use client';

interface ConversionEvent {
  event: string;
  value?: number;
  currency?: string;
  items?: Array<{
    item_id: string;
    item_name: string;
    category: string;
    quantity?: number;
    price?: number;
  }>;
  user_data?: {
    user_id?: string;
    email?: string;
    phone?: string;
  };
  custom_parameters?: Record<string, any>;
}

class ConversionTracker {
  private sessionId: string;
  private landingSource: string | null = null;
  private campaignData: Record<string, string> = {};

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeTracking();
  }

  private generateSessionId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeTracking() {
    if (typeof window === 'undefined') return;

    // Capture UTM parameters and referrer
    const urlParams = new URLSearchParams(window.location.search);
    this.campaignData = {
      utm_source: urlParams.get('utm_source') || '',
      utm_medium: urlParams.get('utm_medium') || '',
      utm_campaign: urlParams.get('utm_campaign') || '',
      utm_term: urlParams.get('utm_term') || '',
      utm_content: urlParams.get('utm_content') || '',
      referrer: document.referrer || '',
      landing_page: window.location.pathname,
    };

    // Detect if this is from an influencer campaign
    if (this.campaignData.utm_source?.includes('influencer') || 
        this.campaignData.utm_campaign?.includes('influencer') ||
        this.campaignData.utm_medium === 'social') {
      this.landingSource = 'influencer';
    }

    // Store campaign data in localStorage for session persistence
    localStorage.setItem('campaign_data', JSON.stringify(this.campaignData));
    localStorage.setItem('session_id', this.sessionId);

    // Track page view
    this.trackEvent('page_view', {
      page_location: window.location.href,
      page_title: document.title,
    });
  }

  // Track conversion events
  trackEvent(eventName: string, parameters: Record<string, any> = {}) {
    const event: ConversionEvent = {
      event: eventName,
      custom_parameters: {
        ...parameters,
        session_id: this.sessionId,
        landing_source: this.landingSource,
        timestamp: Date.now(),
        ...this.campaignData,
      },
    };

    // Send to Google Analytics
    this.sendToGoogleAnalytics(event);

    // Send to Facebook Pixel
    this.sendToFacebookPixel(event);

    // Send to custom analytics
    this.sendToCustomAnalytics(event);

    // Store for later analysis
    this.storeEventLocally(event);
  }

  // Key conversion events
  trackLandingPageView() {
    this.trackEvent('landing_page_view', {
      source: this.landingSource,
      campaign: this.campaignData.utm_campaign,
    });
  }

  trackSignUpStarted() {
    this.trackEvent('sign_up_started', {
      conversion_stage: 'interest',
      value: 0,
    });
  }

  trackSignUpCompleted(userId: string, email?: string) {
    this.trackEvent('sign_up', {
      conversion_stage: 'registration',
      value: 10, // Assign value to registration
      user_data: {
        user_id: userId,
        email: email,
      },
    });
  }

  trackOnboardingStarted(userId: string) {
    this.trackEvent('onboarding_started', {
      conversion_stage: 'activation_start',
      user_data: { user_id: userId },
    });
  }

  trackOnboardingCompleted(userId: string, userData?: any) {
    this.trackEvent('onboarding_completed', {
      conversion_stage: 'activation_complete',
      value: 25, // Higher value for completed onboarding
      user_data: { user_id: userId },
      onboarding_data: userData,
    });
  }

  trackFirstTaskCreated(userId: string) {
    this.trackEvent('first_task_created', {
      conversion_stage: 'engagement',
      value: 15,
      user_data: { user_id: userId },
    });
  }

  trackDashboardVisit(userId: string, isFirstVisit: boolean = false) {
    this.trackEvent('dashboard_visit', {
      conversion_stage: 'retention',
      is_first_visit: isFirstVisit,
      value: isFirstVisit ? 20 : 5,
      user_data: { user_id: userId },
    });
  }

  trackPremiumUpgrade(userId: string, plan: string, value: number) {
    this.trackEvent('purchase', {
      conversion_stage: 'monetization',
      value: value,
      currency: 'USD',
      items: [{
        item_id: plan,
        item_name: `MemoSpark ${plan} Plan`,
        category: 'subscription',
        quantity: 1,
        price: value,
      }],
      user_data: { user_id: userId },
    });
  }

  trackRetention(userId: string, daysActive: number) {
    this.trackEvent('user_retention', {
      conversion_stage: 'retention',
      days_active: daysActive,
      value: Math.min(daysActive * 2, 50), // Cap at 50
      user_data: { user_id: userId },
    });
  }

  private sendToGoogleAnalytics(event: ConversionEvent) {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', event.event, {
        event_category: 'conversion',
        value: event.value || 0,
        currency: event.currency || 'USD',
        user_id: event.user_data?.user_id,
        custom_parameters: event.custom_parameters,
        // Enhanced ecommerce for purchases
        ...(event.event === 'purchase' && event.items ? {
          transaction_id: this.sessionId,
          items: event.items,
        } : {}),
      });
    }
  }

  private sendToFacebookPixel(event: ConversionEvent) {
    if (typeof window !== 'undefined' && (window as any).fbq) {
      const fbq = (window as any).fbq;
      
      // Map events to Facebook Pixel standard events
      const fbEventMap: Record<string, string> = {
        'sign_up': 'CompleteRegistration',
        'onboarding_completed': 'CompleteRegistration',
        'purchase': 'Purchase',
        'first_task_created': 'AddToCart', // Proxy for engagement
        'dashboard_visit': 'PageView',
      };

      const fbEventName = fbEventMap[event.event] || 'CustomEvent';
      
      fbq('track', fbEventName, {
        value: event.value || 0,
        currency: event.currency || 'USD',
        content_name: event.event,
        custom_data: event.custom_parameters,
      });
    }
  }

  private async sendToCustomAnalytics(event: ConversionEvent) {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('Conversion Event:', event);
        return;
      }

      await fetch('/api/analytics/conversion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });
    } catch (error) {
      console.warn('Failed to send conversion event:', error);
    }
  }

  private storeEventLocally(event: ConversionEvent) {
    try {
      const stored = localStorage.getItem('conversion_events') || '[]';
      const events = JSON.parse(stored);
      events.push(event);
      
      // Keep only last 100 events
      if (events.length > 100) {
        events.splice(0, events.length - 100);
      }
      
      localStorage.setItem('conversion_events', JSON.stringify(events));
    } catch (error) {
      console.warn('Failed to store conversion event locally:', error);
    }
  }

  // Get conversion funnel data for analysis
  getConversionFunnel() {
    try {
      const events = JSON.parse(localStorage.getItem('conversion_events') || '[]');
      const funnel = {
        landing_page_view: events.filter((e: any) => e.event === 'landing_page_view').length,
        sign_up_started: events.filter((e: any) => e.event === 'sign_up_started').length,
        sign_up_completed: events.filter((e: any) => e.event === 'sign_up').length,
        onboarding_started: events.filter((e: any) => e.event === 'onboarding_started').length,
        onboarding_completed: events.filter((e: any) => e.event === 'onboarding_completed').length,
        first_task_created: events.filter((e: any) => e.event === 'first_task_created').length,
        dashboard_visits: events.filter((e: any) => e.event === 'dashboard_visit').length,
        purchases: events.filter((e: any) => e.event === 'purchase').length,
      };

      return funnel;
    } catch {
      return {};
    }
  }

  // Calculate conversion rates
  getConversionRates() {
    const funnel = this.getConversionFunnel();
    return {
      landing_to_signup: funnel.landing_page_view ? 
        (funnel.sign_up_completed / funnel.landing_page_view * 100).toFixed(2) : '0',
      signup_to_onboarding: funnel.sign_up_completed ? 
        (funnel.onboarding_completed / funnel.sign_up_completed * 100).toFixed(2) : '0',
      onboarding_to_engagement: funnel.onboarding_completed ? 
        (funnel.first_task_created / funnel.onboarding_completed * 100).toFixed(2) : '0',
      overall_conversion: funnel.landing_page_view ? 
        (funnel.onboarding_completed / funnel.landing_page_view * 100).toFixed(2) : '0',
    };
  }
}

// Singleton instance
let conversionTracker: ConversionTracker | null = null;

export const getConversionTracker = (): ConversionTracker => {
  if (!conversionTracker) {
    conversionTracker = new ConversionTracker();
  }
  return conversionTracker;
};

// React hook
export const useConversionTracking = () => {
  return getConversionTracker();
};
