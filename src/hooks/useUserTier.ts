'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { supabase } from '@/lib/supabase/client';
import type { SubscriptionTier } from '@/types/subscription';

interface UserTierData {
  tier: SubscriptionTier;
  isLoading: boolean;
  error: string | null;
}

export const useUserTier = (): UserTierData => {
  const { user, isLoaded } = useUser();
  const [tierData, setTierData] = useState<UserTierData>({
    tier: 'free',
    isLoading: true,
    error: null
  });

  useEffect(() => {
    const fetchUserTier = async () => {
      if (!isLoaded || !user) {
        setTierData(prev => ({ ...prev, isLoading: false }));
        return;
      }

      try {
        setTierData(prev => ({ ...prev, isLoading: true, error: null }));

        if (!supabase) {
          throw new Error('Supabase client not available');
        }

        const { data: subscription, error } = await supabase!
          .from('user_subscriptions')
          .select('tier_id')
          .eq('clerk_user_id', user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('Error fetching user tier:', error);
          setTierData({
            tier: 'free',
            isLoading: false,
            error: error.message
          });
          return;
        }

        const userTier = (subscription?.tier_id as SubscriptionTier) || 'free';
        
        setTierData({
          tier: userTier,
          isLoading: false,
          error: null
        });

      } catch (error) {
        console.error('Error in fetchUserTier:', error);
        setTierData({
          tier: 'free',
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    };

    fetchUserTier();
  }, [user, isLoaded]);

  return tierData;
}; 