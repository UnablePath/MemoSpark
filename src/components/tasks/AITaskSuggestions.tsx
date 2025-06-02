'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, RefreshCw, Clock, Target, Brain, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { SuggestionCard } from '@/components/ai/SuggestionCard';
import { cn } from '@/lib/utils';
import { StudySparkAI } from '@/lib/ai';
import type { StudySuggestion } from '@/lib/ai/suggestionEngine';
import type { ExtendedTask, AISuggestion } from '@/types/ai';

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

// Suggestion context interface matching the AI system
interface SuggestionContext {
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
  const [studySparkAI] = useState(() => new StudySparkAI());
  
  // Enhanced caching and performance state
  const [suggestionCache, setSuggestionCache] = useState<Map<string, {
    suggestions: TaskSuggestion[];
    timestamp: number;
    accessCount: number;
  }>>(new Map());
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [retryCount, setRetryCount] = useState(0);
  const [userAcceptanceHistory, setUserAcceptanceHistory] = useState<Map<string, number>>(new Map());

  // Enhanced suggestion generation with caching and performance optimizations
  const generateTaskSuggestions = useCallback(async () => {
    if (!currentTask.title || currentTask.title.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    // Create cache key based on task properties
    const cacheKey = `${currentTask.title?.trim()}-${currentTask.type || 'academic'}-${currentTask.priority || 'medium'}-${currentTask.subject || 'general'}`;
    
    // Check cache first (valid for 5 minutes)
    const cachedEntry = suggestionCache.get(cacheKey);
    const now = Date.now();
    if (cachedEntry && (now - cachedEntry.timestamp) < 5 * 60 * 1000) {
      // Update access count for cache analytics
      setSuggestionCache(prev => new Map(prev.set(cacheKey, {
        ...cachedEntry,
        accessCount: cachedEntry.accessCount + 1
      })));
      setSuggestions(cachedEntry.suggestions);
      setLastGenerationTime(new Date(cachedEntry.timestamp));
      return;
    }

    // Set loading state for this specific cache key
    setLoadingStates(prev => ({ ...prev, [cacheKey]: true }));
    setLoading(true);
    setError(null);

    try {
      // Enhanced context with user patterns and acceptance history
      const context: SuggestionContext = {
        currentTime: new Date(),
        upcomingTasks: [], // Empty for new task creation
        recentActivity: [], // Could be populated from local storage
        userPreferences: StudySparkAI.getDefaultPreferences(),
        taskContext: currentTask,
        suggestionTypes: ['task_enhancement', 'time_optimization', 'priority_adjustment', 'subject_focus']
      };

      // Use StudySparkAI to generate intelligent suggestions with retry logic
      let result;
      let retryAttempts = 0;
      const maxRetries = 2;

      while (retryAttempts <= maxRetries) {
        try {
          result = await studySparkAI.generateIntelligentSuggestions(
            [], // Empty tasks array for new task
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
      
      // Intelligent ranking based on user acceptance history
      const rankedSuggestions = rankSuggestionsByUserPreferences(
        [...taskSuggestions, ...enhancementSuggestions],
        userAcceptanceHistory
      );

      // Combine and filter suggestions
      const allSuggestions = rankedSuggestions
        .filter(s => (s.confidence || 0) >= 0.4)
        .slice(0, maxSuggestions);

      // Cache the results
      setSuggestionCache(prev => new Map(prev.set(cacheKey, {
        suggestions: allSuggestions,
        timestamp: now,
        accessCount: 1
      })));

      setSuggestions(allSuggestions);
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
      const fallbackSuggestions = generateEnhancedFallbackSuggestions(currentTask);
      setSuggestions(fallbackSuggestions.slice(0, maxSuggestions));
    } finally {
      setLoadingStates(prev => ({ ...prev, [cacheKey]: false }));
      setLoading(false);
    }
  }, [currentTask, maxSuggestions, studySparkAI, suggestionCache, retryCount, userAcceptanceHistory]);

  // Intelligent ranking based on user acceptance patterns
  const rankSuggestionsByUserPreferences = (
    suggestions: TaskSuggestion[],
    acceptanceHistory: Map<string, number>
  ): TaskSuggestion[] => {
    return suggestions.sort((a, b) => {
      // Get user acceptance rate for suggestion types
      const aAcceptanceRate = acceptanceHistory.get(a.type) || 0.5;
      const bAcceptanceRate = acceptanceHistory.get(b.type) || 0.5;
      
      // Calculate composite score: confidence + acceptance rate + priority
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const aPriority = a.priority || 'medium';
      const bPriority = b.priority || 'medium';
      
      const aScore = (a.confidence || 0) * 0.4 + aAcceptanceRate * 0.4 + priorityOrder[aPriority] * 0.2;
      const bScore = (b.confidence || 0) * 0.4 + bAcceptanceRate * 0.4 + priorityOrder[bPriority] * 0.2;
      
      return bScore - aScore;
    });
  };

  // Enhanced fallback suggestions with more intelligent defaults
  const generateEnhancedFallbackSuggestions = (task: Partial<ExtendedTask>): TaskSuggestion[] => {
    const suggestions: TaskSuggestion[] = [];
    const currentTime = new Date();

    // Smart task completion time estimation
    if (task.title && !task.description) {
      const titleWords = task.title.split(' ').length;
      const complexity = titleWords > 5 ? 'high' : titleWords > 2 ? 'medium' : 'low';
      
      suggestions.push({
        id: `fallback_smart_description_${Date.now()}`,
        type: 'task_suggestion',
        title: 'Add Smart Task Description',
        description: `Based on your task complexity (${complexity}), consider adding specific details about requirements, resources, and expected outcomes.`,
        priority: complexity === 'high' ? 'medium' : 'low',
        confidence: 0.7,
        reasoning: `Task appears to be ${complexity} complexity based on title length`,
        createdAt: currentTime.toISOString(),
        applicationAction: 'add_description',
        metadata: {
          category: 'task-clarity',
          tags: ['description', 'clarity', complexity],
          estimatedBenefit: 0.6
        }
      });
    }

    // Smart deadline suggestions based on task type
    if (!task.dueDate && task.type) {
      const suggestedHours = task.type === 'academic' ? 72 : 24; // 3 days for academic, 1 day for personal
      const suggestedDate = new Date(currentTime.getTime() + suggestedHours * 60 * 60 * 1000);
      
      suggestions.push({
        id: `fallback_smart_deadline_${Date.now()}`,
        type: 'schedule_optimization',
        title: 'Set Smart Deadline',
        description: `Based on task type (${task.type}), consider setting deadline for ${format(suggestedDate, 'MMM d, h:mm a')}.`,
        priority: 'medium',
        confidence: 0.8,
        reasoning: `${task.type} tasks typically need ${suggestedHours} hours for completion`,
        createdAt: currentTime.toISOString(),
        applicationAction: 'optimize_timing',
        suggestedChanges: {
          dueDate: suggestedDate.toISOString()
        },
        metadata: {
          category: 'time-management',
          tags: ['deadline', 'completion', task.type],
          estimatedBenefit: 0.8
        }
      });
    }

    // Priority optimization based on context
    if (task.priority === 'medium' && task.type === 'academic') {
      suggestions.push({
        id: `fallback_priority_boost_${Date.now()}`,
        type: 'difficulty_adjustment',
        title: 'Consider Higher Priority',
        description: 'Academic tasks often benefit from higher priority to ensure adequate time allocation.',
        priority: 'low',
        confidence: 0.6,
        reasoning: 'Academic tasks typically require focused attention',
        createdAt: currentTime.toISOString(),
        applicationAction: 'adjust_priority',
        suggestedChanges: {
          priority: 'high'
        },
        metadata: {
          category: 'priority-management',
          tags: ['priority', 'academic'],
          estimatedBenefit: 0.5
        }
      });
    }

    return suggestions;
  };

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
    // Map StudySuggestion to AISuggestion format
    const aiSuggestion: AISuggestion = {
      id: suggestion.id,
      type: suggestion.type === 'task' ? 'task_suggestion' :
            suggestion.type === 'break' ? 'break_reminder' :
            suggestion.type === 'subject_focus' ? 'subject_focus' :
            suggestion.type === 'schedule' ? 'schedule_optimization' :
            suggestion.type === 'difficulty' ? 'difficulty_adjustment' : 'task_suggestion',
      title: suggestion.title,
      description: suggestion.description,
      priority: suggestion.priority,
      createdAt: new Date().toISOString(), // Add required createdAt field
      confidence: suggestion.confidence,
      reasoning: suggestion.reasoning,
      suggestedTime: suggestion.suggestedTime,
      duration: suggestion.duration,
      subject: suggestion.subject,
      metadata: suggestion.metadata
    };
    return await transformToTaskSuggestion(aiSuggestion, task);
  };

  // Determine how to apply the suggestion to the task
  const getApplicationAction = (type: string): TaskSuggestion['applicationAction'] => {
    switch (type) {
      case 'task_suggestion':
        return 'modify_title';
      case 'schedule_optimization':
        return 'optimize_timing';
      case 'difficulty_adjustment':
        return 'adjust_priority';
      case 'subject_focus':
        return 'add_description';
      default:
        return 'add_description';
    }
  };

  // Generate specific changes based on suggestion
  const generateSuggestedChanges = async (
    suggestion: AISuggestion, 
    task: Partial<ExtendedTask>
  ): Promise<TaskSuggestion['suggestedChanges']> => {
    const changes: TaskSuggestion['suggestedChanges'] = {};

    switch (suggestion.type) {
      case 'task_suggestion':
        if (task.title && task.title.length < 10) {
          changes.title = `${task.title} - ${suggestion.description.split('.')[0]}`;
        }
        break;

      case 'schedule_optimization':
        if (suggestion.suggestedTime) {
          changes.dueDate = suggestion.suggestedTime;
        }
        if (suggestion.duration) {
          changes.timeEstimate = suggestion.duration;
        }
        break;

      case 'difficulty_adjustment':
        if (suggestion.metadata?.difficulty) {
          const difficultyLevel = suggestion.metadata.difficulty as number;
          changes.priority = difficultyLevel >= 7 ? 'high' : 
                           difficultyLevel >= 4 ? 'medium' : 'low';
        }
        break;

      case 'subject_focus':
        if (suggestion.description && !task.description) {
          changes.description = `Focus area: ${suggestion.description}`;
        }
        break;
    }

    return changes;
  };

  // Generate task enhancement suggestions based on title and context
  const generateTaskEnhancementSuggestions = (task: Partial<ExtendedTask>): TaskSuggestion[] => {
    const suggestions: TaskSuggestion[] = [];
    const title = task.title?.toLowerCase() || '';

    // Smart title enhancement
    if (title && title.length > 5) {
      if (title.includes('study') || title.includes('read') || title.includes('review')) {
        suggestions.push({
          id: `enhance_study_${Date.now()}`,
          type: 'task_suggestion',
          title: 'Break Into Study Sessions',
          description: 'Consider breaking this into focused 25-45 minute study sessions for better retention.',
          priority: 'medium',
          confidence: 0.8,
          reasoning: 'Study tasks benefit from time-boxed sessions',
          createdAt: new Date().toISOString(),
          applicationAction: 'add_subtasks',
          suggestedChanges: {
            subtasks: [
              'Session 1: Initial review (25 min)',
              'Session 2: Deep focus study (45 min)',
              'Session 3: Practice/application (30 min)'
            ],
            timeEstimate: 100
          },
          metadata: {
            category: 'task-optimization',
            tags: ['study-sessions', 'time-management'],
            estimatedBenefit: 0.8
          }
        });
      }

      if (title.includes('exam') || title.includes('test') || title.includes('quiz')) {
        suggestions.push({
          id: `enhance_exam_${Date.now()}`,
          type: 'task_suggestion',
          title: 'Exam Preparation Strategy',
          description: 'Upgrade to a comprehensive exam prep plan with review, practice, and mock tests.',
          priority: 'high',
          confidence: 0.9,
          reasoning: 'Exam tasks require strategic preparation',
          createdAt: new Date().toISOString(),
          applicationAction: 'modify_title',
          suggestedChanges: {
            title: `${task.title} - Complete Prep Plan`,
            priority: 'high',
            description: 'Comprehensive exam preparation including review materials, practice questions, and timed mock tests.',
            subtasks: [
              'Gather and organize study materials',
              'Create study schedule leading up to exam',
              'Complete practice questions',
              'Take timed mock test',
              'Review weak areas'
            ]
          },
          metadata: {
            category: 'exam-preparation',
            tags: ['exam', 'preparation', 'strategy'],
            estimatedBenefit: 0.9
          }
        });
      }

      if (title.includes('project') || title.includes('assignment') || title.includes('homework')) {
        suggestions.push({
          id: `enhance_project_${Date.now()}`,
          type: 'task_suggestion',
          title: 'Project Planning Approach',
          description: 'Structure this as a multi-phase project with clear milestones and deadlines.',
          priority: 'medium',
          confidence: 0.7,
          reasoning: 'Project tasks benefit from structured planning',
          createdAt: new Date().toISOString(),
          applicationAction: 'add_subtasks',
          suggestedChanges: {
            subtasks: [
              'Research and planning phase',
              'Outline and structure creation',
              'First draft/initial implementation',
              'Review and revision',
              'Final polish and submission prep'
            ],
            description: 'Multi-phase project with structured milestones and clear deliverables.'
          },
          metadata: {
            category: 'project-management',
            tags: ['project', 'planning', 'milestones'],
            estimatedBenefit: 0.7
          }
        });
      }
    }

    // Priority enhancement based on due date
    if (task.dueDate) {
      const dueDate = new Date(task.dueDate);
      const now = new Date();
      const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursUntilDue <= 24 && hoursUntilDue > 0) {
        suggestions.push({
          id: `enhance_urgent_${Date.now()}`,
          type: 'difficulty_adjustment',
          title: 'Urgent Priority Adjustment',
          description: `This task is due in ${Math.round(hoursUntilDue)} hours. Consider marking as high priority.`,
          priority: 'high',
          confidence: 0.95,
          reasoning: 'Tasks due within 24 hours require high priority',
          createdAt: new Date().toISOString(),
          applicationAction: 'adjust_priority',
          suggestedChanges: {
            priority: 'high'
          },
          metadata: {
            category: 'urgency-management',
            tags: ['urgent', 'priority', 'deadline'],
            estimatedBenefit: 1.0
          }
        });
      }
    }

    return suggestions;
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
    // Track user acceptance for learning
    setUserAcceptanceHistory(prev => {
      const newMap = new Map(prev);
      const currentRate = newMap.get(suggestion.type) || 0.5;
      const newRate = Math.min(1.0, currentRate + 0.1); // Increase acceptance rate
      newMap.set(suggestion.type, newRate);
      return newMap;
    });

    onSuggestionApply(suggestion);
    setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
  };

  const handleSuggestionDismiss = (id: string) => {
    // Track user rejection for learning
    const suggestion = suggestions.find(s => s.id === id);
    if (suggestion) {
      setUserAcceptanceHistory(prev => {
        const newMap = new Map(prev);
        const currentRate = newMap.get(suggestion.type) || 0.5;
        const newRate = Math.max(0.0, currentRate - 0.05); // Slightly decrease acceptance rate
        newMap.set(suggestion.type, newRate);
        return newMap;
      });
    }

    onSuggestionDismiss(id);
    setSuggestions(prev => prev.filter(s => s.id !== id));
  };

  const handleRefresh = () => {
    generateTaskSuggestions();
  };

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
            disabled={loading}
            className="h-6 w-6 p-0"
          >
            <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
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
      {loading && (
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

      {/* Suggestions */}
      <AnimatePresence mode="popLayout">
        {!loading && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {suggestions.map((suggestion, index) => (
              <motion.div
                key={suggestion.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.1 }}
              >
                <SuggestionCard
                  suggestion={suggestion}
                  onAccept={() => handleSuggestionApply(suggestion)}
                  onReject={() => handleSuggestionDismiss(suggestion.id)}
                  compact={compact}
                  showReasoning={false}
                  className="hover:border-primary/30 transition-colors"
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {!loading && suggestions.length === 0 && !error && (
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