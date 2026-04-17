'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { useMemo } from 'react';
import { wrapClerkTokenForSupabase } from '@/lib/clerk/clerkSupabaseToken';
import {
  saveAISuggestionFeedback,
  type AISuggestionFeedbackInsert,
} from '@/lib/supabase/tasksApi';

/**
 * Persists user feedback on a single AI suggestion to Supabase.
 * Silently no-ops on auth errors so we never block the accept/dismiss UX.
 */
export function useSaveAISuggestionFeedback() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const wrapped = useMemo(() => wrapClerkTokenForSupabase(getToken), [getToken]);

  return useMutation({
    mutationFn: (payload: AISuggestionFeedbackInsert) =>
      saveAISuggestionFeedback(payload, wrapped),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai_suggestion_feedback'] });
    },
    onError: (error) => {
      console.warn('[ai:feedback] failed to save suggestion feedback', error);
    },
  });
}
