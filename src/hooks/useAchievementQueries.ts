import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@clerk/nextjs';

// ========================================
// QUERY KEYS FACTORY
// ========================================

/**
 * Achievement query keys factory for React Query caching and deduplication
 * Follows the exact pattern from taskKeys for consistency
 */
export const achievementKeys = {
  /** Base key for all achievement-related queries */
  all: ['achievements'] as const,
  
  /** Keys for list-based achievement queries */
  lists: () => [...achievementKeys.all, 'list'] as const,
  
  /** Key for user-specific achievement list */
  list: (userId?: string) => [...achievementKeys.lists(), { userId }] as const,
  
  /** Key for user's coin balance */
  balance: (userId?: string) => [...achievementKeys.all, 'balance', userId] as const,
  
  /** Key for available themes (not user-specific) */
  themes: () => [...achievementKeys.all, 'themes'] as const,
  
  /** Key for user's purchased themes */
  purchasedThemes: (userId?: string) => [...achievementKeys.all, 'purchased-themes', userId] as const,
} as const;

// ========================================
// TYPE DEFINITIONS
// ========================================

export interface Achievement {
  id: string;
  name: string;
  description: string;
  type: string;
  criteria: Record<string, any>;
  points_reward: number;
  icon: string;
  category: string;
  unlocked: boolean;
  unlockedAt?: string;
  userProgress: number;
  created_at: string;
  updated_at?: string;
}

export interface AchievementStats {
  total: number;
  unlocked: number;
  remaining: number;
}

export interface AchievementsResponse {
  success: boolean;
  achievements: Achievement[];
  stats: AchievementStats;
  // Consolidated data fields (new in unified API)
  balance?: {
    success: boolean;
    balance: number;
    totalEarned?: number;
    totalSpent?: number;
    error?: string;
  };
  themes?: {
    success: boolean;
    purchasedThemes: PurchasedTheme[];
    error?: string;
  };
}

export interface BalanceResponse {
  success: boolean;
  balance: number;
  transactions?: any[];
}

export interface Theme {
  id: string;
  name: string;
  description: string;
  price: number;
  preview_url?: string;
  css_variables: Record<string, string>;
  category: string;
}

export interface ThemesResponse {
  success: boolean;
  themes: Theme[];
}

export interface PurchasedTheme {
  theme_id: string;
  purchased_at: string;
  theme: Theme;
}

export interface PurchasedThemesResponse {
  success: boolean;
  themes: PurchasedTheme[];
}

// ========================================
// QUERY HOOKS
// ========================================

/**
 * Hook to fetch user's achievements with caching and deduplication
 * Follows the exact pattern from useFetchTasks for consistency
 */
export const useFetchAchievements = (getToken?: () => Promise<string | null>) => {
  const { userId } = useAuth();
  
  return useQuery({
    queryKey: achievementKeys.list(userId || undefined),
    queryFn: async () => {
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Get token if provided
      const token = getToken ? await getToken() : null;
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch('/api/achievements', {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch achievements: ${response.statusText}`);
      }

      const data: AchievementsResponse = await response.json();
      return data;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
    retry: (failureCount, error) => {
      // Don't retry on auth errors
      if (error instanceof Error && error.message.includes('not authenticated')) {
        return false;
      }
      return failureCount < 3;
    },
  });
};

/**
 * Hook to fetch user's coin balance with caching
 * Follows the same pattern as other query hooks
 */
export const useFetchBalance = (getToken?: () => Promise<string | null>) => {
  const { userId } = useAuth();
  
  return useQuery({
    queryKey: achievementKeys.balance(userId || undefined),
    queryFn: async () => {
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Get token if provided
      const token = getToken ? await getToken() : null;
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch('/api/gamification/balance', {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch balance: ${response.statusText}`);
      }

      const data: BalanceResponse = await response.json();
      return data;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 2, // 2 minutes (balance changes more frequently)
    gcTime: 1000 * 60 * 8, // 8 minutes
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes('not authenticated')) {
        return false;
      }
      return failureCount < 3;
    },
  });
};

/**
 * Hook to fetch available themes (not user-specific, so no userId required)
 * Themes change infrequently so longer cache time
 */
export const useFetchThemes = (getToken?: () => Promise<string | null>) => {
  const { userId } = useAuth();
  
  return useQuery({
    queryKey: achievementKeys.themes(),
    queryFn: async () => {
      // Get token if provided (some theme data might be user-specific)
      const token = getToken ? await getToken() : null;
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch('/api/gamification/themes', {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch themes: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    },
    enabled: !!userId, // Still require user to be logged in for theme availability
    staleTime: 1000 * 60 * 10, // 10 minutes (themes change very infrequently)
    gcTime: 1000 * 60 * 20, // 20 minutes
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes('not authenticated')) {
        return false;
      }
      return failureCount < 3;
    },
  });
};

/**
 * Hook to fetch user's purchased themes
 */
export const useFetchPurchasedThemes = (getToken?: () => Promise<string | null>) => {
  const { userId } = useAuth();
  
  return useQuery({
    queryKey: achievementKeys.purchasedThemes(userId || undefined),
    queryFn: async () => {
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Get token if provided
      const token = getToken ? await getToken() : null;
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch('/api/user/purchased-themes', {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch purchased themes: ${response.statusText}`);
      }

      const data: PurchasedThemesResponse = await response.json();
      return data;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes('not authenticated')) {
        return false;
      }
      return failureCount < 3;
    },
  });
};

// ========================================
// UTILITY HOOKS
// ========================================

/**
 * Hook to invalidate all achievement-related queries
 * Useful for forcing refresh after mutations
 */
export const useInvalidateAchievementQueries = () => {
  const queryClient = useQueryClient();
  
  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: achievementKeys.all }),
    invalidateAchievements: () => queryClient.invalidateQueries({ queryKey: achievementKeys.lists() }),
    invalidateBalance: (userId?: string) => queryClient.invalidateQueries({ queryKey: achievementKeys.balance(userId) }),
    invalidateThemes: () => queryClient.invalidateQueries({ queryKey: achievementKeys.themes() }),
    invalidatePurchasedThemes: (userId?: string) => queryClient.invalidateQueries({ queryKey: achievementKeys.purchasedThemes(userId) }),
  };
}; 