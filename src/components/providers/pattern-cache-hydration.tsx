'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, useRef } from 'react';
import { hydratePatternEngineCacheForUser } from '@/lib/ai/patternEngineHydration';

/**
 * On sign-in, hydrates patternEngine localStorage from Postgres `user_ai_patterns`.
 */
export function PatternCacheHydration() {
  const { userId, isLoaded, getToken } = useAuth();
  const lastUser = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !userId) {
      lastUser.current = null;
      return;
    }
    if (lastUser.current === userId) return;
    lastUser.current = userId;
    void hydratePatternEngineCacheForUser(userId, getToken);
  }, [isLoaded, userId, getToken]);

  return null;
}
