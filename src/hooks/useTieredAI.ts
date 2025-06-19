'use client';

import { useState, useCallback, useEffect } from 'react';
import { AIFeatureType, TierAwareAIRequest, TierAwareAIResponse } from '@/types/ai';
import { SubscriptionTier } from '@/types/subscription';
import { useAuth } from '@clerk/nextjs';

interface TieredAIUsage {
  requestsUsed: number;
  requestsRemaining: number;
  dailyLimit: number;
  featureAvailable: boolean;
}

interface TieredAIState {
  userTier: SubscriptionTier;
  usage: TieredAIUsage;
  isLoading: boolean;
  error: string | null;
}

export const useTieredAI = () => {
  const { userId, getToken, isLoaded, isSignedIn } = useAuth();
  const [state, setState] = useState<TieredAIState>({
    userTier: 'free',
    usage: {
      requestsUsed: 0,
      requestsRemaining: 10,
      dailyLimit: 10,
      featureAvailable: true
    },
    isLoading: true,
    error: null
  });

  const checkFeatureAccess = useCallback(async (feature: AIFeatureType) => {
    // Don't proceed if auth isn't loaded or user isn't signed in
    if (!isLoaded) {
      return { canProceed: false, upgradeRequired: false, message: 'Authentication loading...' };
    }
    
    if (!isSignedIn || !userId) {
      return { canProceed: false, upgradeRequired: false, message: 'Please sign in to continue' };
    }
    
    try {
      const response = await fetch('/api/ai/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          feature,
          tasks: [], // Empty tasks array for access check only
          context: {}
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 403) {
          return {
            canProceed: false,
            upgradeRequired: true,
            tier: errorData.tier || 'free',
            usage: errorData.usage || { requestsUsed: 0, requestsRemaining: 0, featureAvailable: false },
            message: errorData.message || 'Feature access restricted'
          };
        }
        
        if (response.status === 401) {
          return {
            canProceed: false,
            upgradeRequired: false,
            message: 'Authentication required'
          };
        }
        
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        canProceed: data.success,
        upgradeRequired: false,
        tier: data.tier,
        usage: data.usage
      };
    } catch (error: any) {
      console.error('Error checking feature access:', error);
      
      // Provide more specific error messages
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        return { 
          canProceed: false, 
          upgradeRequired: false, 
          message: 'Unable to connect to AI service. Please check your internet connection.' 
        };
      }
      
      return { 
        canProceed: false, 
        upgradeRequired: false, 
        message: 'Service temporarily unavailable' 
      };
    }
  }, [userId, isLoaded, isSignedIn]);

  const refreshUsage = useCallback(async () => {
    // Don't fetch if auth isn't ready
    if (!isLoaded) {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      return;
    }
    
    if (!isSignedIn || !userId) {
      setState(prev => ({
        ...prev,
        userTier: 'free',
        usage: {
          requestsUsed: 0,
          requestsRemaining: 10,
          dailyLimit: 10,
          featureAvailable: false
        },
        isLoading: false,
        error: null
      }));
      return;
    }
    
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const access = await checkFeatureAccess('basic_suggestions');
      
      // Override tier for development mode
      const isDevelopment = process.env.NODE_ENV === 'development';
      const developmentTier = 'premium'; // Give premium access in development
      
      setState(prev => ({
        ...prev,
        userTier: isDevelopment ? developmentTier : (access.tier || 'free'),
        usage: access.usage || {
          requestsUsed: 0,
          requestsRemaining: isDevelopment ? 1000 : 10,
          dailyLimit: isDevelopment ? 1000 : 10,
          featureAvailable: access.canProceed
        },
        isLoading: false,
        error: null
      }));
    } catch (error: any) {
      console.error('Error refreshing usage:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to load tier information',
        isLoading: false
      }));
    }
  }, [userId, isLoaded, isSignedIn, checkFeatureAccess]);

  useEffect(() => {
    // Only run when auth is loaded
    if (isLoaded) {
      refreshUsage();
    }
  }, [isLoaded, isSignedIn, userId, refreshUsage]);

  const generateSuggestions = useCallback(async (
    feature: AIFeatureType,
    tasks: any[],
    context: any
  ): Promise<TierAwareAIResponse> => {
    if (!isLoaded) {
      throw new Error('Authentication is loading');
    }
    
    if (!isSignedIn || !userId) {
      throw new Error('User not authenticated');
    }
    
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await fetch('/api/ai/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          feature,
          tasks,
          context
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 403) {
          // Update state with usage information from server
          const isDevelopment = process.env.NODE_ENV === 'development';
          setState(prev => ({
            ...prev,
            userTier: isDevelopment ? 'premium' : (data.tier || prev.userTier),
            usage: data.usage || prev.usage,
            isLoading: false
          }));
          
          return {
            success: false,
            tier: data.tier,
            usage: data.usage,
            upgradeRequired: data.upgradeRequired,
            message: data.message,
            error: data.error
          };
        }
        
        if (response.status === 401) {
          setState(prev => ({ ...prev, isLoading: false, error: 'Authentication required' }));
          throw new Error('Authentication required');
        }
        
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      // Update state with successful response, override tier for development
      const isDevelopment = process.env.NODE_ENV === 'development';
      setState(prev => ({
        ...prev,
        userTier: isDevelopment ? 'premium' : data.tier,
        usage: data.usage,
        isLoading: false
      }));

      return {
        success: data.success,
        tier: data.tier,
        usage: data.usage,
        data: data.data,
        upgradeRequired: data.upgradeRequired,
        message: data.message
      };
    } catch (error: any) {
      console.error('Error generating suggestions:', error);
      setState(prev => ({
        ...prev,
        error: error.message,
        isLoading: false
      }));
      
      throw error;
    }
  }, [userId, isLoaded, isSignedIn]);

  const isFeatureAvailable = useCallback((feature: AIFeatureType) => {
    const tierHierarchy = { free: 0, premium: 1, enterprise: 2 };
    const requiredTiers: Record<AIFeatureType, SubscriptionTier> = {
      basic_suggestions: 'free',
      advanced_suggestions: 'premium',
      study_planning: 'premium',
      voice_processing: 'premium',
      stu_personality: 'premium',
      ml_predictions: 'premium',
      collaborative_filtering: 'premium',
      premium_analytics: 'premium'
    };
    
    const required = requiredTiers[feature] || 'premium';
    return tierHierarchy[state.userTier] >= tierHierarchy[required];
  }, [state.userTier]);

  return {
    userTier: state.userTier,
    usage: state.usage,
    isLoading: state.isLoading,
    error: state.error,
    checkFeatureAccess,
    refreshUsage,
    generateSuggestions,
    isFeatureAvailable,
    // Auth state info
    isAuthLoaded: isLoaded,
    isSignedIn: isSignedIn,
    // Tier limits for UI display (development-friendly)
    tierLimits: process.env.NODE_ENV === 'development' ? {
      free: { suggestions: 15, dailyRequests: 1000 },      // Dev: Very generous
      premium: { suggestions: 25, dailyRequests: 5000 },   // Dev: Very generous  
      enterprise: { suggestions: 50, dailyRequests: -1 }   // Dev: Unlimited
    } : {
      free: { suggestions: 3, dailyRequests: 10 },         // Prod: Normal limits
      premium: { suggestions: 8, dailyRequests: 100 },     // Prod: Normal limits
      enterprise: { suggestions: 15, dailyRequests: -1 }   // Prod: Unlimited
    }
  };
}; 