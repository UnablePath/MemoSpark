'use client';

import { useState, useEffect, useCallback } from 'react';
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
  const { userId, getToken } = useAuth();
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
    if (!userId) return { canProceed: false, upgradeRequired: true };
    
    try {
      const token = await getToken();
      const response = await fetch('/api/ai/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          feature,
          tasks: [], // Empty tasks array for access check only
          context: {}
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 403) {
          return {
            canProceed: false,
            upgradeRequired: true,
            tier: errorData.tier,
            usage: errorData.usage,
            message: errorData.message
          };
        }
        throw new Error(errorData.error || 'Failed to check access');
      }

      const data = await response.json();
      return {
        canProceed: data.success,
        upgradeRequired: false,
        tier: data.tier,
        usage: data.usage
      };
    } catch (error) {
      console.error('Error checking feature access:', error);
      return { canProceed: false, upgradeRequired: true };
    }
  }, [userId, getToken]);

  const refreshUsage = useCallback(async () => {
    if (!userId) return;
    
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const access = await checkFeatureAccess('basic_suggestions');
      setState(prev => ({
        ...prev,
        userTier: access.tier || 'free',
        usage: access.usage || {
          requestsUsed: 0,
          requestsRemaining: 10,
          dailyLimit: 10,
          featureAvailable: access.canProceed
        },
        isLoading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to load tier information',
        isLoading: false
      }));
    }
  }, [userId, checkFeatureAccess]);

  useEffect(() => {
    refreshUsage();
  }, [refreshUsage]);

  const generateSuggestions = useCallback(async (
    feature: AIFeatureType,
    tasks: any[],
    context: any
  ): Promise<TierAwareAIResponse> => {
    if (!userId) {
      throw new Error('User not authenticated');
    }
    
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const token = await getToken();
      const response = await fetch('/api/ai/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
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
          setState(prev => ({
            ...prev,
            userTier: data.tier || prev.userTier,
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
        throw new Error(data.error || 'Failed to generate suggestions');
      }

      // Update state with successful response
      setState(prev => ({
        ...prev,
        userTier: data.tier,
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
      setState(prev => ({
        ...prev,
        error: error.message,
        isLoading: false
      }));
      
      throw error;
    }
  }, [userId, getToken]);

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
      premium_analytics: 'enterprise'
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
    // Tier limits for UI display
    tierLimits: {
      free: { suggestions: 3, dailyRequests: 10 },
      premium: { suggestions: 8, dailyRequests: 100 },
      enterprise: { suggestions: 15, dailyRequests: -1 }
    }
  };
}; 