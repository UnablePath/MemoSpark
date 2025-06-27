"use client";

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cva, type VariantProps } from 'class-variance-authority';
import { Calendar, LayoutList, Plus, Grid3X3, GraduationCap, Brain, ChevronRight, ChevronLeft, Sparkles, Crown, BrainCircuit } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ListView } from './ListView';
import { CalendarViewEnhanced } from './CalendarViewEnhanced';
import { TimetableView } from './TimetableView';
import { TaskForm } from './TaskForm';
import { TimetableEntryForm } from './TimetableEntryForm';
import { useAuth } from '@clerk/nextjs';
import { useFetchTasks, useDeleteTask, useCreateTask, useToggleTaskCompletion } from '@/hooks/useTaskQueries';
import { useToast } from '@/components/ui/use-toast';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button';
import { SuggestionList } from '@/components/ai/SuggestionList';
import { useTieredAI } from '@/hooks/useTieredAI';
import type { AISuggestion } from '@/types/ai';
import type { Task } from '@/types/taskTypes';

import { useUser } from '@clerk/nextjs';
import { SmartScheduleView } from '@/components/scheduling/SmartScheduleView';

// Dynamic AI suggestions based on user context and time of day
const getTaskCreationSuggestions = (userName?: string): AISuggestion[] => {
  const currentHour = new Date().getHours();
  const isEvening = currentHour >= 17;
  const isMorning = currentHour >= 6 && currentHour < 12;
  const userFirstName = userName?.split(' ')[0] || 'there';
  
  const suggestions: AISuggestion[] = [];
  
  if (isMorning) {
    suggestions.push({
      id: 'morning-focus',
      type: 'task_suggestion',
      title: `Good morning, ${userFirstName}! Start with a focused study session`,
      description: 'Morning is an excellent time for deep learning. Consider tackling your most challenging subject first.',
      priority: 'high' as 'low' | 'medium' | 'high',
      confidence: 0.85,
      reasoning: 'Studies show that cognitive performance is typically highest in the morning hours.',
      duration: 90,
      metadata: {
        category: 'productivity',
        tags: ['morning', 'focus', 'deep-work'],
        difficulty: 6,
        estimatedBenefit: 0.8,
        requiredAction: 'immediate'
      },
      createdAt: new Date().toISOString(),
      acceptanceStatus: 'pending'
    });
  }
  
  if (isEvening) {
    suggestions.push({
      id: 'evening-review',
      type: 'study_time',
      title: `Evening review session`,
      description: 'Perfect time to review what you learned today and prepare for tomorrow.',
      priority: 'medium',
      confidence: 0.78,
      reasoning: 'Evening review helps consolidate daily learning and improves retention.',
      duration: 45,
      metadata: {
        category: 'academic',
        tags: ['review', 'consolidation', 'evening'],
        difficulty: 4,
        estimatedBenefit: 0.7,
        requiredAction: 'scheduled'
      },
      createdAt: new Date(Date.now() - 300000).toISOString(),
      acceptanceStatus: 'pending'
    });
  }
  
  // General productivity suggestion
  suggestions.push({
    id: 'productivity-block',
    type: 'schedule_optimization',
    title: 'Create a focused study block',
    description: 'Block out uninterrupted time for deep work on your most important tasks.',
    priority: 'medium',
    confidence: 0.72,
    reasoning: 'Focused study blocks lead to better learning outcomes than fragmented sessions.',
    duration: 120,
    metadata: {
      category: 'productivity',
      tags: ['deep-work', 'focus', 'productivity'],
      estimatedBenefit: 0.85,
      requiredAction: 'optional'
    },
    createdAt: new Date(Date.now() - 600000).toISOString(),
    acceptanceStatus: 'pending'
  });
  
  return suggestions;
};

// CVA variants for view tabs
const viewTabVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  {
    variants: {
      state: {
        active: "bg-primary text-primary-foreground shadow-sm",
        inactive: "hover:bg-accent hover:text-accent-foreground",
      },
    },
  },
);

// CVA variants for action buttons
const actionButtonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        shimmer: "text-white", // Specific for ShimmerButton
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ViewType = 'list' | 'calendar' | 'timetable' | 'smart-schedule';

interface ViewOption {
  id: ViewType;
  label: string;
  icon: React.ElementType;
  description: string;
}

interface TaskEventHubProps {
  initialView?: ViewType;
}

export const TaskEventHub: React.FC<TaskEventHubProps> = ({ initialView = 'list' }) => {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [currentView, setCurrentView] = useState<ViewType>(initialView);
  const [isTaskFormOpen, setTaskFormOpen] = useState(false);
  const [isTimetableFormOpen, setTimetableFormOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedTimetableEntry, setSelectedTimetableEntry] = useState<any>(null);
  
  // AI Suggestions state
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [aiSuggestions, setAISuggestions] = useState<AISuggestion[]>(() => 
    getTaskCreationSuggestions(user?.fullName || user?.firstName || undefined)
  );
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  // Create token provider function for Supabase integration
  const getTokenForSupabase = useCallback(() => 
    getToken({ template: 'supabase-integration' }), [getToken]
  );

  // Use proper database hooks instead of local store
  const { data: tasks = [], isLoading: isLoadingTasks, error: tasksError, refetch: refetchTasks } = useFetchTasks(undefined, getTokenForSupabase);
  const deleteTaskMutation = useDeleteTask(getTokenForSupabase);
  const createTaskMutation = useCreateTask(getTokenForSupabase);
  const toggleTaskCompletionMutation = useToggleTaskCompletion(getTokenForSupabase);
  const { toast } = useToast();
  
  // Tier-aware AI integration with backwards compatibility
  const tieredAI = useTieredAI ? useTieredAI() : null;
  const { 
    userTier = 'free', 
    usage = { requestsUsed: 0, requestsRemaining: 10, dailyLimit: 10, featureAvailable: true }, 
    isLoading: isTierLoading = false, 
    generateSuggestions = null, 
    isFeatureAvailable = () => true,
    tierLimits = {
      free: { suggestions: 3, dailyRequests: 10 },
      premium: { suggestions: 8, dailyRequests: 100 },
      enterprise: { suggestions: 15, dailyRequests: -1 }
    }
  } = tieredAI || {};

  // Update AI suggestions when user data changes
  useEffect(() => {
    if (user) {
      const userName = user.fullName || user.firstName || 'User';
      setAISuggestions(getTaskCreationSuggestions(userName));
    }
  }, [user]);

  const viewOptions: ViewOption[] = useMemo(() => [
    { id: 'list', label: 'List View', icon: LayoutList, description: 'View tasks in a sequential, organized list.' },
    { id: 'calendar', label: 'Calendar', icon: Calendar, description: 'View and manage tasks in a calendar format.' },
    { id: 'timetable', label: 'Timetable', icon: Grid3X3, description: 'View and manage your class schedule.' },
    { id: 'smart-schedule', label: 'Smart Schedule', icon: BrainCircuit, description: 'AI-powered intelligent task scheduling.' },
  ], []);

  // Tier-aware AI suggestions generation
  const generateTierAwareSuggestions = useCallback(async () => {
    if (!isFeatureAvailable('basic_suggestions') || !generateSuggestions) {
      return;
    }

    setIsLoadingSuggestions(true);
    try {
      const response = await generateSuggestions('basic_suggestions', tasks, {
        currentTime: new Date(),
        upcomingTasks: tasks,
        recentActivity: tasks.slice(-5),
        userPreferences: {
          enableSuggestions: true,
          suggestionFrequency: 'moderate',
          difficultyPreference: 'adaptive',
          preferredStudyTimes: [],
          preferredStudyDuration: 90,
          preferredBreakDuration: 15,
          maxDailyStudyHours: 8,
          cloudSyncEnabled: false,
          shareAnonymousData: false,
          personalizedStuInteraction: true,
          enableBreakReminders: true,
          enableStudyReminders: true,
          reminderAdvanceTime: 15,
          adaptiveDifficulty: true,
          focusOnWeakSubjects: true,
          balanceSubjects: true
        },
        metadata: { currentView }
      });
      
      if (response.success && response.data && Array.isArray(response.data)) {
        setAISuggestions(response.data);
      } else {
        // Fallback to static suggestions
        setAISuggestions(getTaskCreationSuggestions());
      }
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
      // Fallback to static suggestions for free users
      setAISuggestions(getTaskCreationSuggestions());
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [isFeatureAvailable, generateSuggestions, tasks, currentView]);

  const handleViewChange = (view: ViewType) => {
    setCurrentView(view);
  };

  const openTaskForm = (task: any = null) => {
    setSelectedTask(task);
    setTaskFormOpen(true);
  };

  const closeTaskForm = () => {
    setTaskFormOpen(false);
    setSelectedTask(null);
  };

  const openTimetableForm = (entry: any = null) => {
    setSelectedTimetableEntry(entry);
    setTimetableFormOpen(true);
  };

  const closeTimetableForm = () => {
    setTimetableFormOpen(false);
    setSelectedTimetableEntry(null);
  };

  const handleTaskFormSuccess = () => {
    closeTaskForm();
    toast({ 
      title: selectedTask?.id ? 'Task updated successfully' : 'Task added successfully' 
    });
  };

  const handleTimetableFormSubmit = () => {
    // TimetableEntryForm handles its own submission
    closeTimetableForm();
    toast({ title: selectedTimetableEntry ? 'Class updated successfully' : 'Class added successfully' });
  };

  const handleDelete = async (taskId: string) => {
    try {
      await deleteTaskMutation.mutateAsync(taskId);
      // The mutation already handles success toast and cache invalidation
    } catch (error) {
      // The mutation already handles error toast
      console.error('Error deleting task:', error);
    }
  };

  const handleToggleCompletion = async (taskId: string) => {
    try {
      await toggleTaskCompletionMutation.mutateAsync(taskId);
    } catch (error) {
      console.error('Error toggling task completion:', error);
    }
  };

  // AI Suggestions handlers
  const handleAcceptSuggestion = useCallback(async (suggestionId: string) => {
    const suggestion = aiSuggestions.find(s => s.id === suggestionId);
    if (!suggestion) return;

    try {
      // Create a task based on the AI suggestion
      const taskData = {
        title: suggestion.title,
        description: suggestion.description,
        priority: suggestion.priority || 'medium',
        type: 'academic' as const,
        subject: suggestion.subject,
        due_date: suggestion.suggestedTime ? new Date(suggestion.suggestedTime).toISOString() : undefined,
        completed: false, // Add missing completed field
        reminder_settings: {
          enabled: true,
          offset_minutes: 15,
          type: 'notification' as const,
        },
      };

      await createTaskMutation.mutateAsync(taskData);
      
      // Update suggestion status
      setAISuggestions(prev => 
        prev.map(s => 
          s.id === suggestionId 
            ? { ...s, acceptanceStatus: 'accepted' as const, respondedAt: new Date().toISOString() }
            : s
        )
      );

      toast({ 
        title: 'Task created from AI suggestion', 
        description: `"${suggestion.title}" has been added to your tasks.` 
      });
    } catch (error) {
      toast({ 
        title: 'Failed to create task from suggestion', 
        description: (error as Error).message, 
        variant: 'destructive' 
      });
    }
  }, [aiSuggestions, createTaskMutation, toast]);

  const handleRejectSuggestion = useCallback((suggestionId: string) => {
    setAISuggestions(prev => 
      prev.map(s => 
        s.id === suggestionId 
          ? { ...s, acceptanceStatus: 'rejected' as const, respondedAt: new Date().toISOString() }
          : s
      )
    );
    toast({ title: 'Suggestion dismissed' });
  }, [toast]);

  const handleRefreshSuggestions = useCallback(() => {
    setIsLoadingSuggestions(true);
    setTimeout(() => {
      setAISuggestions(getTaskCreationSuggestions());
      setIsLoadingSuggestions(false);
      toast({ title: 'AI suggestions refreshed' });
    }, 1000);
  }, [toast]);

  const toggleAISuggestions = useCallback(() => {
    setShowAISuggestions(prev => {
      const newState = !prev;
      if (newState && isFeatureAvailable('basic_suggestions')) {
        // Generate fresh suggestions when opening
        generateTierAwareSuggestions();
      }
      return newState;
    });
  }, [isFeatureAvailable, generateTierAwareSuggestions]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 'n') {
        event.preventDefault();
        if (currentView === 'timetable') {
          openTimetableForm();
        } else {
          openTaskForm();
        }
      }
      if (event.metaKey && event.key === 'k') {
        event.preventDefault();
        const currentIndex = viewOptions.findIndex(v => v.id === currentView);
        const nextIndex = (currentIndex + 1) % viewOptions.length;
        setCurrentView(viewOptions[nextIndex].id);
      }
      // View switching shortcuts
      if (event.ctrlKey && event.key === '1') {
        event.preventDefault();
        setCurrentView('list');
      }
      if (event.ctrlKey && event.key === '2') {
        event.preventDefault();
        setCurrentView('calendar');
      }
      if (event.ctrlKey && event.key === '3') {
        event.preventDefault();
        setCurrentView('timetable');
      }
      if (event.ctrlKey && event.key === '4') {
        event.preventDefault();
        setCurrentView('smart-schedule');
      }
      // AI Suggestions shortcut
      if (event.ctrlKey && event.key === 'i') {
        event.preventDefault();
        toggleAISuggestions();
      }
    };

    const handleSwitchToTimetable = () => {
      setCurrentView('timetable');
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('switchToTimetable', handleSwitchToTimetable);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('switchToTimetable', handleSwitchToTimetable);
    };
  }, [currentView, viewOptions, toggleAISuggestions]);

  const renderAddButton = () => {
    if (currentView === 'timetable') {
      return (
        <Button
          onClick={() => openTimetableForm()}
          className="whitespace-nowrap h-8 text-xs sm:text-sm flex-shrink-0 px-1 xs:px-2 sm:px-3 md:px-4 min-w-[28px] xs:min-w-[32px] sm:min-w-auto"
          aria-label="Add new class (Ctrl+N)"
        >
          <GraduationCap className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
          <span className="hidden xs:inline ml-1 sm:ml-2">Add Class</span>
        </Button>
      );
    }

    return (
      <Button
        onClick={() => openTaskForm()}
        className="whitespace-nowrap h-8 text-xs sm:text-sm flex-shrink-0 px-1 xs:px-2 sm:px-3 md:px-4 min-w-[28px] xs:min-w-[32px] sm:min-w-auto"
        aria-label="Create new task (Ctrl+N)"
      >
        <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
        <span className="hidden xs:inline ml-1 sm:ml-2">Add Task</span>
      </Button>
    );
  };

  return (
    <div className="flex flex-col h-full p-4 md:p-6">
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div className="flex-1">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Manage your tasks
          </h2>
          <p className="text-muted-foreground mt-1">
            Your all-in-one productivity hub.
          </p>
        </div>
        <div className="flex w-full md:w-auto items-center gap-1 xs:gap-1.5 sm:gap-2 md:gap-4">
          {renderAddButton()}

          {/* AI Suggestions Toggle - Tier Aware - becomes more compact on small screens */}
          <Button
            variant={showAISuggestions ? "default" : "outline"}
            size="default"
            onClick={toggleAISuggestions}
            className={cn(
              "whitespace-nowrap transition-all duration-200 relative h-8 text-xs sm:text-sm flex-shrink-0",
              // Responsive padding that gets smaller for screens < 440px
              "px-1 xs:px-1.5 sm:px-3 md:px-4 min-w-[28px] xs:min-w-[32px] sm:min-w-auto",
              showAISuggestions && "bg-primary hover:bg-primary/90 text-primary-foreground",
              userTier === 'premium' && "border-amber-300"
            )}
            aria-label={`Toggle AI Suggestions - ${userTier} tier (${usage.requestsRemaining} remaining)`}
          >
            <Brain className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
            {userTier !== 'free' && (
              <Crown className="h-2.5 w-2.5 sm:h-3 sm:w-3 ml-0.5 sm:ml-1 flex-shrink-0" />
            )}
            <span className="hidden sm:inline ml-1 sm:ml-2 text-xs sm:text-sm">
              {showAISuggestions ? 'Hide AI' : 'AI Suggestions'}
            </span>
            {/* Usage indicator */}
            <div className="absolute -top-1 -right-1 bg-muted text-muted-foreground text-xs px-1 rounded-full min-w-[1.25rem] h-5 flex items-center justify-center">
              {usage.requestsRemaining}
            </div>
          </Button>

          {/* Desktop view switcher */}
          <div className="hidden md:flex items-center gap-1 rounded-md bg-muted p-1 group">
            {viewOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => handleViewChange(option.id)}
                className={cn(
                  viewTabVariants({
                    state: currentView === option.id ? "active" : "inactive",
                  }),
                  // More reasonable sizing - slightly larger but not overly scaled
                  "px-3 py-2.5 md:px-4 md:py-3 lg:px-5 lg:py-3.5 xl:px-6 xl:py-4"
                )}
              >
                <option.icon className="h-4 w-4 md:h-5 md:w-5 lg:h-5 lg:w-5" />
                <span className="hidden lg:inline text-sm md:text-base lg:text-base ml-1.5 md:ml-2">{option.label}</span>
              </button>
            ))}
            <span className="text-sm text-muted-foreground pl-2 pr-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-card px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                <span className="text-xs">⌘</span>K
              </kbd>
              <span className="mx-1 text-xs">•</span>
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-card px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                <span className="text-xs">⌃</span>I
              </kbd>
              <span className="text-xs ml-1">AI</span>
            </span>
          </div>

          {/* Mobile view switcher - optimized for better balance */}
          <div className="flex md:hidden items-center gap-1 rounded-md bg-muted p-1 flex-shrink-0 overflow-x-auto max-w-full">
            {viewOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => handleViewChange(option.id)}
                className={cn(
                  viewTabVariants({
                    state: currentView === option.id ? "active" : "inactive",
                  }),
                  // More balanced sizing for mobile screens
                  "px-2 py-2 xs:px-3 xs:py-2.5 sm:px-4 sm:py-3 min-w-[40px] xs:min-w-[44px] sm:min-w-[48px] flex items-center justify-center flex-shrink-0"
                )}
                title={option.label}
              >
                <option.icon className="h-4 w-4 xs:h-4 xs:w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                {/* Only show text on larger mobile screens and use abbreviated text for smart schedule */}
                <span className="hidden xs:inline ml-1.5 text-xs xs:text-xs sm:text-sm truncate">
                  {option.id === 'smart-schedule' ? 'Smart' : 
                   option.id === 'timetable' ? 'Time' : 
                   option.id === 'calendar' ? 'Cal' : 
                   option.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="flex flex-grow gap-6 overflow-hidden">
        {/* Main Content Area */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "flex-grow overflow-auto transition-all duration-300",
              showAISuggestions ? "lg:mr-0" : "mr-0"
            )}
          >
            {currentView === 'list' && (
              <>
                {isLoadingTasks ? (
                  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4" />
                    <p className="text-lg font-medium">Loading tasks...</p>
                    <p className="text-sm">Please wait while we fetch your tasks</p>
                  </div>
                ) : tasksError ? (
                  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <p className="text-lg font-medium text-red-600">Error loading tasks</p>
                    <p className="text-sm mb-4">{tasksError.message || 'Failed to fetch tasks'}</p>
                    <Button onClick={() => refetchTasks()} variant="outline">
                      Try Again
                    </Button>
                  </div>
                ) : (
                  <ListView
                    tasks={tasks}
                    onEdit={openTaskForm}
                    onDelete={handleDelete}
                    onToggleCompletion={handleToggleCompletion}
                  />
                )}
              </>
            )}
            {currentView === 'calendar' && (
              <CalendarViewEnhanced onEditTask={openTaskForm} />
            )}
            {currentView === 'timetable' && (
              <TimetableView 
                onEditEntry={openTimetableForm}
                onAddEntry={() => openTimetableForm()}
              />
            )}
            {currentView === 'smart-schedule' && (
              <SmartScheduleView />
            )}
          </motion.div>
        </AnimatePresence>

        {/* AI Suggestions Sidebar */}
        <AnimatePresence>
          {showAISuggestions && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "auto", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="hidden lg:block w-80 xl:w-96 flex-shrink-0 overflow-hidden"
            >
              <div className="h-full bg-card border rounded-lg p-4 overflow-y-auto">
                <div className="sticky top-0 bg-card pb-4 mb-4 border-b z-10">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <Brain className="h-5 w-5 text-primary" />
                      AI Suggestions
                      {userTier !== 'free' && (
                        <Crown className="h-4 w-4 text-amber-500" />
                      )}
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleAISuggestions}
                      className="opacity-70 hover:opacity-100"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-sm text-muted-foreground">
                      {userTier === 'free' 
                        ? `${usage.requestsRemaining}/${tierLimits.free.dailyRequests} suggestions remaining` 
                        : `${userTier} tier - ${usage.requestsRemaining} remaining`
                      }
                    </p>
                    {userTier === 'free' && (
                      <Button variant="link" size="sm" className="text-xs px-2 h-6">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Upgrade
                      </Button>
                    )}
                  </div>
                </div>
                
                <SuggestionList
                  suggestions={aiSuggestions.filter(s => s.acceptanceStatus === 'pending')}
                  onAcceptSuggestion={handleAcceptSuggestion}
                  onRejectSuggestion={handleRejectSuggestion}
                  onRefresh={handleRefreshSuggestions}
                  title=""
                  showHeader={false}
                  showReasoning={true}
                  isLoading={isLoadingSuggestions}
                  layout="default"
                  maxHeight="none"
                  className="space-y-3"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile AI Suggestions Overlay */}
        {showAISuggestions && (
          <div className="lg:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-end">
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="w-full max-h-[70vh] bg-card border-t rounded-t-lg overflow-hidden"
            >
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />
                    AI Suggestions
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleAISuggestions}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="p-4 overflow-y-auto">
                <SuggestionList
                  suggestions={aiSuggestions.filter(s => s.acceptanceStatus === 'pending')}
                  onAcceptSuggestion={handleAcceptSuggestion}
                  onRejectSuggestion={handleRejectSuggestion}
                  onRefresh={handleRefreshSuggestions}
                  title=""
                  showHeader={false}
                  showReasoning={true}
                  isLoading={isLoadingSuggestions}
                  layout="compact"
                  maxHeight="none"
                />
              </div>
            </motion.div>
          </div>
        )}
      </div>

      {/* Task Form Dialog */}
      {isTaskFormOpen && (
                  <TaskForm
            taskId={selectedTask?.id}
            onSuccess={handleTaskFormSuccess}
            onCancel={closeTaskForm}
          />
      )}

      {/* Timetable Entry Form Dialog */}
      {isTimetableFormOpen && (
        <TimetableEntryForm
          entryId={selectedTimetableEntry?.id}
          onSuccess={handleTimetableFormSubmit}
          onCancel={closeTimetableForm}
        />
      )}
    </div>
  );
};
