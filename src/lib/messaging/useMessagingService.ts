'use client';

import { useAuth } from '@clerk/nextjs';
import { useMemo } from 'react';
import { MessagingService } from './MessagingService';

export function useMessagingService(): MessagingService {
  const { getToken } = useAuth();
  return useMemo(() => new MessagingService(getToken), [getToken]);
}
