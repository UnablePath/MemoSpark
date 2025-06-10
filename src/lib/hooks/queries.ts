import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as tasksApi from '@/lib/supabase/tasksApi';

/**
 * Custom hook for testing database connection
 */
export const useDatabaseConnection = () => {
  return useQuery({
    queryKey: ['database-connection'],
    queryFn: tasksApi.testDatabaseConnection,
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// ========================================
// AI SUGGESTION FEEDBACK HOOKS
// ========================================

/**
 * Hook for saving AI suggestion feedback
 */
export const useSaveAISuggestionFeedback = (getToken?: () => Promise<string | null>) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => tasksApi.saveAISuggestionFeedback(data, getToken),
    onSuccess: () => {
      // Invalidate feedback queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['ai-suggestion-feedback'] });
      queryClient.invalidateQueries({ queryKey: ['ai-feedback-summary'] });
      queryClient.invalidateQueries({ queryKey: ['enhanced-user-context'] });
    },
    onError: (error: any) => {
      console.error('Failed to save AI suggestion feedback:', error);
    },
  });
};

/**
 * Hook for fetching AI suggestion feedback
 */
export const useAISuggestionFeedback = (
  filters?: {
    suggestion_type?: string;
    feedback?: 'liked' | 'disliked';
    limit?: number;
    days_back?: number;
  },
  getToken?: () => Promise<string | null>
) => {
  return useQuery({
    queryKey: ['ai-suggestion-feedback', filters],
    queryFn: () => tasksApi.getAISuggestionFeedback(filters, getToken),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook for fetching AI suggestion feedback summary
 */
export const useAISuggestionFeedbackSummary = (getToken?: () => Promise<string | null>) => {
  return useQuery({
    queryKey: ['ai-feedback-summary'],
    queryFn: () => tasksApi.getAISuggestionFeedbackSummary(getToken),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

/**
 * Hook for fetching enhanced user context for AI suggestions
 */
export const useEnhancedUserContext = (getToken?: () => Promise<string | null>) => {
  return useQuery({
    queryKey: ['enhanced-user-context'],
    queryFn: () => tasksApi.getEnhancedUserContext(getToken),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook for updating AI suggestion feedback
 */
export const useUpdateAISuggestionFeedback = (getToken?: () => Promise<string | null>) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ suggestionId, feedback }: { suggestionId: string; feedback: 'liked' | 'disliked' }) =>
      tasksApi.updateAISuggestionFeedback(suggestionId, feedback, getToken),
    onSuccess: () => {
      // Invalidate feedback queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['ai-suggestion-feedback'] });
      queryClient.invalidateQueries({ queryKey: ['ai-feedback-summary'] });
      queryClient.invalidateQueries({ queryKey: ['enhanced-user-context'] });
    },
    onError: (error: any) => {
      console.error('Failed to update AI suggestion feedback:', error);
    },
  });
};

/**
 * Hook for deleting AI suggestion feedback
 */
export const useDeleteAISuggestionFeedback = (getToken?: () => Promise<string | null>) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => tasksApi.deleteAISuggestionFeedback(id, getToken),
    onSuccess: () => {
      // Invalidate feedback queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['ai-suggestion-feedback'] });
      queryClient.invalidateQueries({ queryKey: ['ai-feedback-summary'] });
      queryClient.invalidateQueries({ queryKey: ['enhanced-user-context'] });
    },
    onError: (error: any) => {
      console.error('Failed to delete AI suggestion feedback:', error);
    },
  });
}; 