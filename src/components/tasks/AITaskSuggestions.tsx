'use client';

import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, RefreshCw, Clock, Target, Brain, AlertCircle, ThumbsUp, ThumbsDown } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { SuggestionCard } from '@/components/ai/SuggestionCard';
import { cn } from '@/lib/utils';
import { memoSparkAI, MemoSparkAI } from '@/lib/ai';
import type { StudySuggestion } from '@/lib/ai/suggestionEngine';
import type { ExtendedTask, AISuggestion, SuggestionType } from '@/types/ai';
import { useEnhancedUserContext, useSaveAISuggestionFeedback } from '@/lib/hooks/queries';
import { toast } from 'sonner';

// Cache duration constant
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Task-specific suggestion interface extending AISuggestion
interface TaskSuggestion extends AISuggestion {
  applicationAction?: 'modify_title' | 'adjust_priority' | 'add_subtasks' | 'optimize_timing' | 'add_description';
  suggestedChanges?: {
    title?: string;
    priority?: 'low' | 'medium' | 'high';
    description?: string;
    dueDate?: string;
    subtasks?: string[];
    timeEstimate?: number;
  };
}

// Enhanced suggestion context interface with feedback data
interface EnhancedSuggestionContext {
  currentTime: Date;
  upcomingTasks: ExtendedTask[];
  recentActivity: ExtendedTask[];
  userPreferences?: {
    preferredSessionLength: number;
    maxSuggestionsPerDay: number;
    enableBreakReminders: boolean;
    preferredDifficulty: number;
  };
  taskContext?: Partial<ExtendedTask>;
  suggestionTypes?: string[];
  // New enhanced context from Supabase
  recentCompletedTasks?: ExtendedTask[];
  timetableEntries?: any[];
  feedbackSummary?: {
    totalFeedback: number;
    likeRatio: number;
    dislikedTypes: string[];
    preferredTypes: string[];
  };
}

interface AITaskSuggestionsProps {
  currentTask: Partial<ExtendedTask>;
  onSuggestionApply: (suggestion: TaskSuggestion) => void;
  onSuggestionDismiss: (id: string) => void;
  className?: string;
  compact?: boolean;
  maxSuggestions?: number;
}

export const AITaskSuggestions: React.FC<AITaskSuggestionsProps> = ({
  currentTask,
  onSuggestionApply,
  onSuggestionDismiss,
  className,
  compact = false,
  maxSuggestions = 3
}) => {
  const [suggestions, setSuggestions] = useState<TaskSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastGenerationTime, setLastGenerationTime] = useState<Date | null>(null);
  const [aiInstance] = useState(() => memoSparkAI);
  
  // Enhanced caching and performance state
  const [suggestionCache, setSuggestionCache] = useState<Map<string, {
    suggestions: TaskSuggestion[];
    timestamp: number;
    accessCount: number;
  }>>(new Map());
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [retryCount, setRetryCount] = useState(0);
  const [userAcceptanceHistory, setUserAcceptanceHistory] = useState<Map<string, number>>(new Map());

  // Enhanced user context and feedback
  const { data: enhancedContext, isLoading: contextLoading } = useEnhancedUserContext();
  const saveFeedbackMutation = useSaveAISuggestionFeedback();

  // Enhanced suggestion generation with better context and feedback filtering
  const generateTaskSuggestions = useCallback(async () => {
    if (loading || !aiInstance) return;

    const cacheKey = `suggestions-${JSON.stringify(currentTask)}-${maxSuggestions}`;
    
    // Check cache first
    const cached = suggestionCache.get(cacheKey);
    const now = Date.now();
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      setSuggestions(cached.suggestions);
      cached.accessCount++;
      return;
    }

    setLoading(true);
    setLoadingStates(prev => ({ ...prev, [cacheKey]: true }));
    setError(null);

    try {
      // Helper function to convert Task to ExtendedTask
      const convertTaskToExtendedTask = (task: any): ExtendedTask => ({
        id: task.id,
        title: task.title,
        dueDate: task.due_date || task.dueDate || new Date().toISOString(),
        priority: task.priority,
        type: task.type === 'event' ? 'academic' : task.type, // Map 'event' to 'academic'
        subject: task.subject,
        completed: task.completed,
        reminder: task.reminder ?? false,
        description: task.description,
        recurrenceRule: task.recurrence_rule || task.recurrenceRule || 'none',
        recurrenceInterval: task.recurrence_interval || task.recurrenceInterval,
        recurrenceEndDate: task.recurrence_end_date || task.recurrenceEndDate,
        originalDueDate: task.original_due_date || task.originalDueDate,
        completedOverrides: task.completed_overrides || task.completedOverrides,
      });

      // Enhanced context with user data from Supabase
      const context: EnhancedSuggestionContext = {
        currentTime: new Date(),
        upcomingTasks: enhancedContext?.upcomingTasks?.map(convertTaskToExtendedTask) || [],
        recentActivity: enhancedContext?.recentTasks?.map(convertTaskToExtendedTask) || [],
        recentCompletedTasks: enhancedContext?.recentCompletedTasks?.map(convertTaskToExtendedTask) || [],
        timetableEntries: enhancedContext?.timetableEntries || [],
        userPreferences: MemoSparkAI.getDefaultPreferences(),
        taskContext: currentTask,
        suggestionTypes: ['task_enhancement', 'time_optimization', 'priority_adjustment', 'subject_focus'],
        feedbackSummary: enhancedContext?.feedbackSummary,
      };

              // Use MemoSparkAI to generate intelligent suggestions with retry logic
      let result;
      let retryAttempts = 0;
      const maxRetries = 2;

      while (retryAttempts <= maxRetries) {
        try {
          result = await aiInstance.generateIntelligentSuggestions(
            enhancedContext?.upcomingTasks?.map(convertTaskToExtendedTask) || [],
            'current-user', // In real app, would use actual user ID
            context
          );
          break; // Success, exit retry loop
        } catch (apiError) {
          retryAttempts++;
          if (retryAttempts > maxRetries) {
            throw apiError; // Re-throw if all retries failed
          }
          // Exponential backoff: wait 1s, then 2s
          await new Promise(resolve => setTimeout(resolve, 1000 * retryAttempts));
        }
      }

      if (!result) {
        throw new Error('Failed to generate suggestions after retries');
      }

      // Transform StudySuggestion to TaskSuggestion with proper mapping
      const taskSuggestions: TaskSuggestion[] = await Promise.all(
        result.suggestions
          .slice(0, maxSuggestions)
          .map(async (suggestion) => await transformStudySuggestionToTaskSuggestion(suggestion, currentTask))
      );

      // Add task-specific enhancement suggestions
      const enhancementSuggestions = generateTaskEnhancementSuggestions(currentTask);
      
      // Intelligent ranking based on user acceptance history and feedback
      const rankedSuggestions = rankSuggestionsByUserPreferences(
        [...taskSuggestions, ...enhancementSuggestions],
        userAcceptanceHistory,
        enhancedContext?.feedbackSummary
      );

      // Filter out disliked suggestion types based on feedback
      const filteredSuggestions = rankedSuggestions
        .filter(s => {
          // If user consistently dislikes a type, filter it out
          const isDislikedType = enhancedContext?.feedbackSummary?.dislikedTypes?.includes(s.type);
          return !isDislikedType && (s.confidence || 0) >= 0.4;
        })
        .slice(0, maxSuggestions);

      // Cache the results
      setSuggestionCache(prev => new Map(prev.set(cacheKey, {
        suggestions: filteredSuggestions,
        timestamp: now,
        accessCount: 1
      })));

      setSuggestions(filteredSuggestions);
      setLastGenerationTime(new Date());
      setRetryCount(0); // Reset retry count on success
    } catch (err) {
      console.error('Failed to generate task suggestions:', err);
      const retryCountCurrent = retryCount + 1;
      setRetryCount(retryCountCurrent);
      
      // Enhanced error handling with context-aware messages
      let errorMessage = 'Unable to generate suggestions. ';
      if (retryCountCurrent >= 3) {
        errorMessage += 'AI service may be temporarily unavailable. Using fallback recommendations.';
      } else {
        errorMessage += 'Please try again or use fallback suggestions.';
      }
      setError(errorMessage);
      
      // Generate enhanced fallback suggestions
      const fallbackSuggestions = generateFallbackSuggestions(currentTask);
      setSuggestions(fallbackSuggestions.slice(0, maxSuggestions));
    } finally {
      setLoadingStates(prev => ({ ...prev, [cacheKey]: false }));
      setLoading(false);
    }
      }, [currentTask, maxSuggestions, aiInstance, suggestionCache, retryCount, userAcceptanceHistory, enhancedContext]);

  // Trigger suggestions when context is loaded and current task changes
  useEffect(() => {
    if (!contextLoading && enhancedContext) {
      generateTaskSuggestions();
    }
  }, [generateTaskSuggestions, contextLoading, enhancedContext]);

  // Enhanced ranking with feedback data
  const rankSuggestionsByUserPreferences = (
    suggestions: TaskSuggestion[],
    acceptanceHistory: Map<string, number>,
    feedbackSummary?: { preferredTypes: string[]; dislikedTypes: string[]; likeRatio: number; }
  ): TaskSuggestion[] => {
    return suggestions.sort((a, b) => {
      let scoreA = a.confidence || 0.5;
      let scoreB = b.confidence || 0.5;

      // Boost score for preferred types based on feedback
      if (feedbackSummary?.preferredTypes?.includes(a.type)) {
        scoreA += 0.2;
      }
      if (feedbackSummary?.preferredTypes?.includes(b.type)) {
        scoreB += 0.2;
      }

      // Apply acceptance history
      const historyA = acceptanceHistory.get(a.type) || 0.5;
      const historyB = acceptanceHistory.get(b.type) || 0.5;
      
      scoreA *= historyA;
      scoreB *= historyB;

      return scoreB - scoreA;
    });
  };

  // Handle feedback with database storage
  const handleFeedback = useCallback(async (suggestion: TaskSuggestion, feedback: 'liked' | 'disliked') => {
    try {
      await saveFeedbackMutation.mutateAsync({
        suggestion_id: suggestion.id,
        suggestion_type: suggestion.type,
        suggestion_title: suggestion.title,
        feedback,
        suggestion_context: {
          task_title: currentTask.title,
          task_type: currentTask.type,
          task_priority: currentTask.priority,
          confidence: suggestion.confidence,
          metadata: suggestion.metadata,
        },
      });

      // Update local acceptance history for immediate feedback
      setUserAcceptanceHistory(prev => {
        const newMap = new Map(prev);
        const currentRate = newMap.get(suggestion.type) || 0.5;
        const newRate = feedback === 'liked' 
          ? Math.min(1.0, currentRate + 0.1)
          : Math.max(0.0, currentRate - 0.05);
        newMap.set(suggestion.type, newRate);
        return newMap;
      });

      toast.success(feedback === 'liked' ? 'Thanks for the feedback!' : 'We\'ll improve our suggestions');
    } catch (error) {
      console.error('Failed to save feedback:', error);
      toast.error('Failed to save feedback');
    }
  }, [saveFeedbackMutation, currentTask]);

  // Auto-generate suggestions when task changes with improved debouncing
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      generateTaskSuggestions();
    }, 500); // Reduced debounce for better UX

    return () => clearTimeout(debounceTimer);
  }, [generateTaskSuggestions]);

  // Cache cleanup effect to prevent memory leaks
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      const maxCacheAge = 10 * 60 * 1000; // 10 minutes
      
      setSuggestionCache(prev => {
        const newCache = new Map();
        for (const [key, entry] of prev.entries()) {
          if (now - entry.timestamp < maxCacheAge) {
            newCache.set(key, entry);
          }
        }
        return newCache;
      });
    }, 5 * 60 * 1000); // Clean every 5 minutes

    return () => clearInterval(cleanupInterval);
  }, []);

  // Preload suggestions for better UX when user is typing
  useEffect(() => {
    const preloadTimer = setTimeout(() => {
      if (currentTask.title && currentTask.title.length >= 2) {
        // Only preload if not already loading
        const cacheKey = `${currentTask.title?.trim()}-${currentTask.type || 'academic'}-${currentTask.priority || 'medium'}-${currentTask.subject || 'general'}`;
        if (!loadingStates[cacheKey] && !suggestionCache.has(cacheKey)) {
          generateTaskSuggestions();
        }
      }
    }, 200); // Quick preload for responsive feel

    return () => clearTimeout(preloadTimer);
  }, [currentTask.title, loadingStates, suggestionCache, generateTaskSuggestions]);

  // Transform general AISuggestion to TaskSuggestion
  const transformToTaskSuggestion = async (
    suggestion: AISuggestion, 
    task: Partial<ExtendedTask>
  ): Promise<TaskSuggestion> => {
    const taskSuggestion: TaskSuggestion = {
      ...suggestion,
      applicationAction: getApplicationAction(suggestion.type),
      suggestedChanges: await generateSuggestedChanges(suggestion, task)
    };

    return taskSuggestion;
  };

  // Transform StudySuggestion to TaskSuggestion directly
  const transformStudySuggestionToTaskSuggestion = async (
    suggestion: StudySuggestion, 
    task: Partial<ExtendedTask>
  ): Promise<TaskSuggestion> => {
    // Map StudySuggestion type to valid SuggestionType
    let mappedType: SuggestionType;
    switch (suggestion.type) {
      case 'difficulty':
        mappedType = 'difficulty_adjustment';
        break;
      case 'subject_focus':
        mappedType = 'subject_focus';
        break;
      case 'task':
        mappedType = 'task_suggestion';
        break;
      case 'break':
        mappedType = 'break_reminder';
        break;
      case 'schedule':
        mappedType = 'schedule_optimization';
        break;
      default:
        mappedType = 'task_suggestion';
    }

    return {
      id: suggestion.id,
      type: mappedType,
      title: suggestion.title,
      description: suggestion.description,
      priority: suggestion.priority as 'low' | 'medium' | 'high' | undefined,
      confidence: suggestion.confidence,
      reasoning: suggestion.reasoning,
              source: 'MemoSparkAI',
      createdAt: new Date().toISOString(),
      applicationAction: getApplicationAction(mappedType),
      suggestedChanges: await generateSuggestedChanges(suggestion, task),
      metadata: {
        category: suggestion.metadata.category || 'productivity',
        estimatedBenefit: suggestion.confidence || 0.7,
        requiredAction: 'optional',
      },
    };
  };

  // Determine how to apply the suggestion to the task
  const getApplicationAction = (type: string): TaskSuggestion['applicationAction'] => {
    switch (type) {
      case 'task': return 'modify_title';
      case 'difficulty': return 'adjust_priority';
      case 'schedule': return 'optimize_timing';
      case 'subject_focus': return 'add_description';
      default: return 'add_description';
    }
  };

  // Generate specific changes based on suggestion
  const generateSuggestedChanges = async (
    suggestion: AISuggestion | StudySuggestion, 
    task: Partial<ExtendedTask>
  ): Promise<TaskSuggestion['suggestedChanges']> => {
    const changes: TaskSuggestion['suggestedChanges'] = {};
    
    if (suggestion.type === 'difficulty_adjustment' && task.priority !== 'high') {
      changes.priority = 'high';
    }
    
    if (suggestion.type === 'task_suggestion' && !task.description) {
      changes.description = `Consider adding specific details about ${task.title}`;
    }
    
    return changes;
  };

  // Generate task enhancement suggestions based on title and context
  const generateTaskEnhancementSuggestions = (task: Partial<ExtendedTask>): TaskSuggestion[] => {
    const suggestions: TaskSuggestion[] = [];

    // Check for task enhancement opportunities
    if (task.priority !== 'high') {
      suggestions.push({
        id: `enhance-priority-${Date.now()}`,
        type: 'difficulty_adjustment',
        title: 'Consider Higher Priority',
        description: 'This task might benefit from increased priority based on its complexity.',
        confidence: 0.6,
        source: 'TaskAnalyzer',
        createdAt: new Date().toISOString(),
        applicationAction: 'adjust_priority',
        suggestedChanges: { priority: 'high' },
      });
    }

    if (!task.description) {
      suggestions.push({
        id: `enhance-description-${Date.now()}`,
        type: 'task_suggestion',
        title: 'Add Task Description',
        description: 'Adding a description can help you stay focused and track progress better.',
        confidence: 0.8,
        source: 'TaskAnalyzer',
        createdAt: new Date().toISOString(),
        applicationAction: 'add_description',
        suggestedChanges: { description: 'Consider adding specific details about what needs to be accomplished.' },
      });
    }

    return suggestions.filter(s => Math.random() > 0.3); // Randomly show some suggestions
  };

  // Fallback suggestions when AI is unavailable
  const generateFallbackSuggestions = (task: Partial<ExtendedTask>): TaskSuggestion[] => {
    const suggestions: TaskSuggestion[] = [];

    if (task.title && !task.description) {
      suggestions.push({
        id: `fallback_description_${Date.now()}`,
        type: 'task_suggestion',
        title: 'Add Task Description',
        description: 'Adding details will help you stay focused and track progress effectively.',
        priority: 'low',
        confidence: 0.6,
        reasoning: 'Detailed descriptions improve task clarity',
        createdAt: new Date().toISOString(),
        applicationAction: 'add_description',
        metadata: {
          category: 'task-clarity',
          tags: ['description', 'clarity'],
          estimatedBenefit: 0.5
        }
      });
    }

    if (!task.dueDate) {
      suggestions.push({
        id: `fallback_timing_${Date.now()}`,
        type: 'schedule_optimization',
        title: 'Set a Deadline',
        description: 'Tasks with deadlines are 3x more likely to be completed on time.',
        priority: 'medium',
        confidence: 0.7,
        reasoning: 'Deadlines improve completion rates',
        createdAt: new Date().toISOString(),
        applicationAction: 'optimize_timing',
        metadata: {
          category: 'time-management',
          tags: ['deadline', 'completion'],
          estimatedBenefit: 0.7
        }
      });
    }

    return suggestions;
  };

  const handleSuggestionApply = (suggestion: TaskSuggestion) => {
    // Track feedback as 'liked' when accepted
    handleFeedback(suggestion, 'liked');
    onSuggestionApply(suggestion);
    setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
  };

  const handleSuggestionDismiss = (id: string) => {
    const suggestion = suggestions.find(s => s.id === id);
    if (suggestion) {
      // Track feedback as 'disliked' when dismissed
      handleFeedback(suggestion, 'disliked');
    }
    onSuggestionDismiss(id);
    setSuggestions(prev => prev.filter(s => s.id !== id));
  };

  const handleRefresh = () => {
    generateTaskSuggestions();
  };

  // Enhanced SuggestionCard with feedback buttons
  const EnhancedSuggestionCard: React.FC<{
    suggestion: TaskSuggestion;
    index: number;
  }> = ({ suggestion, index }) => (
    <motion.div
      key={suggestion.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.1 }}
      className="relative group"
    >
      <SuggestionCard
        suggestion={suggestion}
        onAccept={() => handleSuggestionApply(suggestion)}
        onReject={() => handleSuggestionDismiss(suggestion.id)}
        compact={compact}
        showReasoning={false}
        className="hover:border-primary/30 transition-colors"
      />
      
      {/* Feedback buttons overlay */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            handleFeedback(suggestion, 'liked');
          }}
          className="h-6 w-6 p-0 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/20"
          disabled={saveFeedbackMutation.isPending}
        >
          <ThumbsUp className="w-3 h-3" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            handleFeedback(suggestion, 'disliked');
          }}
          className="h-6 w-6 p-0 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20"
          disabled={saveFeedbackMutation.isPending}
        >
          <ThumbsDown className="w-3 h-3" />
        </Button>
      </div>
    </motion.div>
  );

  if (!currentTask.title || currentTask.title.trim().length < 3) {
    return (
      <div className={cn("text-center py-6", className)}>
        <Brain className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          Start typing your task title to get AI suggestions!
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h4 className="font-medium text-sm">AI Suggestions</h4>
          {enhancedContext?.feedbackSummary && enhancedContext.feedbackSummary.totalFeedback > 0 && (
            <span className="text-xs text-muted-foreground">
              ({Math.round(enhancedContext.feedbackSummary.likeRatio * 100)}% helpful)
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {lastGenerationTime && (
            <span className="text-xs text-muted-foreground">
              {lastGenerationTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleRefresh}
            disabled={loading || contextLoading}
            className="h-6 w-6 p-0"
          >
            <RefreshCw className={cn("h-3 w-3", (loading || contextLoading) && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {(loading || contextLoading) && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 border rounded-lg animate-pulse">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-muted rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-full"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Suggestions with enhanced feedback */}
      <AnimatePresence mode="popLayout">
        {!loading && !contextLoading && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {suggestions.map((suggestion, index) => (
              <EnhancedSuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                index={index}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {!loading && !contextLoading && suggestions.length === 0 && !error && (
        <div className="text-center py-4">
          <Target className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            No suggestions available for this task yet.
          </p>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={handleRefresh}
            className="mt-2 text-xs"
          >
            Try generating again
          </Button>
        </div>
      )}
    </div>
  );
};

export default AITaskSuggestions; 