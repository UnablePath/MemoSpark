'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { coinEconomy } from '@/lib/gamification/CoinEconomy';

interface CoinBalanceState {
  balance: number;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

// Global state to share across components
let globalCoinState: CoinBalanceState = {
  balance: 0,
  loading: false,
  error: null,
  lastUpdated: null
};

// Subscribers to notify when balance changes
const subscribers = new Set<(state: CoinBalanceState) => void>();

// Notify all subscribers of state changes
const notifySubscribers = (newState: CoinBalanceState) => {
  globalCoinState = newState;
  subscribers.forEach(callback => callback(newState));
};

// Cache duration (30 seconds)
const CACHE_DURATION = 30 * 1000;

/**
 * Centralized coin balance management hook
 * Ensures all components show the same coin balance and updates in real-time
 */
export const useCoinBalance = () => {
  const { user } = useUser();
  const [localState, setLocalState] = useState<CoinBalanceState>(globalCoinState);
  const loadingRef = useRef(false);

  // Subscribe to global state changes
  useEffect(() => {
    const unsubscribe = (newState: CoinBalanceState) => {
      setLocalState(newState);
    };
    
    subscribers.add(unsubscribe);
    return () => {
      subscribers.delete(unsubscribe);
    };
  }, []);

  // Load coin balance from API
  const loadBalance = useCallback(async (forceRefresh = false) => {
    if (!user?.id) return;
    
    // Prevent multiple simultaneous requests
    if (loadingRef.current) return;
    
    // Check cache validity
    const now = new Date();
    const isStale = !globalCoinState.lastUpdated || 
                   (now.getTime() - globalCoinState.lastUpdated.getTime()) > CACHE_DURATION;
    
    if (!forceRefresh && !isStale && globalCoinState.balance !== 0) {
      return; // Use cached value
    }

    try {
      loadingRef.current = true;
      
      // Only show loading if we don't have cached data
      if (!globalCoinState.lastUpdated) {
        notifySubscribers({
          ...globalCoinState,
          loading: true,
          error: null
        });
      }

      const balance = await coinEconomy.getCoinBalance(user.id);
      
      notifySubscribers({
        balance,
        loading: false,
        error: null,
        lastUpdated: now
      });
    } catch (error) {
      console.error('Error loading coin balance:', error);
      notifySubscribers({
        ...globalCoinState,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load coin balance'
      });
    } finally {
      loadingRef.current = false;
    }
  }, [user?.id]);

  // Update balance after a transaction
  const updateBalance = useCallback((newBalance: number) => {
    notifySubscribers({
      balance: newBalance,
      loading: false,
      error: null,
      lastUpdated: new Date()
    });
  }, []);

  // Spend coins and update balance
  const spendCoins = useCallback(async (amount: number, description: string) => {
    if (!user?.id) throw new Error('User not authenticated');
    
    try {
      const result = await coinEconomy.spendCoins(user.id, amount, description);
      updateBalance(result.newBalance);
      return result;
    } catch (error) {
      console.error('Error spending coins:', error);
      throw error;
    }
  }, [user?.id, updateBalance]);

  // Earn coins and update balance
  const earnCoins = useCallback(async (amount: number, source: string, metadata: Record<string, any> = {}) => {
    if (!user?.id) throw new Error('User not authenticated');
    
    try {
      const result = await coinEconomy.earnCoins(user.id, amount, source, metadata);
      updateBalance(result.newBalance);
      return result;
    } catch (error) {
      console.error('Error earning coins:', error);
      throw error;
    }
  }, [user?.id, updateBalance]);

  // Refresh balance (force reload)
  const refreshBalance = useCallback(() => {
    return loadBalance(true);
  }, [loadBalance]);

  // Auto-load on mount and user change
  useEffect(() => {
    if (user?.id) {
      loadBalance();
    }
  }, [user?.id, loadBalance]);

  return {
    balance: localState.balance,
    loading: localState.loading,
    error: localState.error,
    lastUpdated: localState.lastUpdated,
    refreshBalance,
    updateBalance,
    spendCoins,
    earnCoins,
    loadBalance
  };
};

// Helper hook for components that only need to display balance
export const useCoinBalanceDisplay = () => {
  const { balance, loading, refreshBalance } = useCoinBalance();
  return { balance, loading, refreshBalance };
};

// Helper function to invalidate cache (for use in other parts of the app)
export const invalidateCoinBalance = () => {
  globalCoinState.lastUpdated = null;
};
