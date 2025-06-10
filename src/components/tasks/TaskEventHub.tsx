"use client";

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cva, type VariantProps } from 'class-variance-authority';
import { Calendar, LayoutList, Plus, Grid3X3, GraduationCap, Brain, ChevronRight, ChevronLeft, Sparkles, Crown } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ListView } from './ListView';
import { CalendarViewEnhanced } from './CalendarViewEnhanced';
import { TimetableView } from './TimetableView';
import { TaskForm } from './TaskForm';
import { TimetableEntryForm } from './TimetableEntryForm';
import { useTaskStore } from '@/hooks/useTaskStore';
import { useToast } from '@/components/ui/use-toast';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button';
import { SuggestionList } from '@/components/ai/SuggestionList';
import { useTieredAI } from '@/hooks/useTieredAI';
import type { AISuggestion } from '@/types/ai';

import { useUser } from '@clerk/nextjs';

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
      priority: 'high',
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

type ViewType = 'list' | 'calendar' | 'timetable';

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
  const [currentView, setCurrentView] = useState<ViewType>(initialView);
  const [isTaskFormOpen, setTaskFormOpen] = useState(false);
  const [isTimetableFormOpen, setTimetableFormOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [selectedTimetableEntry, setSelectedTimetableEntry] = useState<any>(null);
  
  // AI Suggestions state
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [aiSuggestions, setAISuggestions] = useState<AISuggestion[]>(() => 
    getTaskCreationSuggestions(user?.fullName || user?.firstName || undefined)
  );
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  const { tasks, addTask, updateTask, deleteTask } = useTaskStore();
  const { toast } = useToast();
  
  // Tier-aware AI integration with backwards compatibility
  const tieredAI = useTieredAI ? useTieredAI() : null;
  const { 
    userTier = 'free', 
    usage = { requestsUsed: 0, requestsRemaining: 10, dailyLimit: 10, featureAvailable: true }, 
    isLoading: isTierLoading = false, 
    generateSuggestions = null, 
    isFeatureAvailable = () => true,
    tierLimits = {}
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
      await deleteTask(taskId);
      toast({ title: 'Task deleted successfully' });
    } catch (error) {
      toast({ title: 'Error deleting task', description: (error as Error).message, variant: 'destructive' });
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
        completed: false,
        due_date: suggestion.suggestedTime ? new Date(suggestion.suggestedTime).toISOString() : undefined,
        reminder_settings: {
          enabled: true,
          offset_minutes: 15,
          type: 'notification' as const,
        },
      };

      await addTask(taskData);
      
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
  }, [aiSuggestions, addTask, toast]);

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
        <ShimmerButton
          onClick={() => openTimetableForm()}
          className="whitespace-nowrap"
          aria-label="Add new class (Ctrl+N)"
        >
          <GraduationCap className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Add Class</span>
          <span className="sm:hidden">Add</span>
        </ShimmerButton>
      );
    }

    return (
      <ShimmerButton
        onClick={() => openTaskForm()}
        className="whitespace-nowrap"
        aria-label="Create new task (Ctrl+N)"
      >
        <Plus className="h-4 w-4 mr-2" />
        <span className="hidden sm:inline">Add Task</span>
        <span className="sm:hidden">Add</span>
      </ShimmerButton>
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
        <div className="flex w-full md:w-auto items-center gap-4">
          {renderAddButton()}

          {/* AI Suggestions Toggle - Tier Aware */}
          <Button
            variant={showAISuggestions ? "default" : "outline"}
            size="default"
            onClick={toggleAISuggestions}
            className={cn(
              "whitespace-nowrap transition-all duration-200 relative",
              showAISuggestions && "bg-primary hover:bg-primary/90 text-primary-foreground",
              userTier === 'premium' && "border-amber-300",
              userTier === 'enterprise' && "border-purple-300"
            )}
            aria-label={`Toggle AI Suggestions - ${userTier} tier (${usage.requestsRemaining} remaining)`}
          >
            <Brain className="h-4 w-4 mr-2" />
            {userTier !== 'free' && (
              <Crown className="h-3 w-3 mr-1 text-amber-500" />
            )}
            <span className="hidden sm:inline">
              {showAISuggestions ? 'Hide AI' : 'AI Suggestions'}
            </span>
            <span className="sm:hidden">AI</span>
            {/* Usage indicator */}
            <div className="absolute -top-1 -right-1 bg-muted text-muted-foreground text-xs px-1 rounded-full min-w-[1.25rem] h-5 flex items-center justify-center">
              {usage.requestsRemaining}
            </div>
          </Button>

          {/* Desktop view switcher */}
          <div className="hidden md:flex items-center gap-1 rounded-md bg-muted p-1 group">
            {viewOptions.map((option) => (
              <InteractiveHoverButton
                key={option.id}
                onClick={() => handleViewChange(option.id)}
              >
                <div
                  className={cn(
                    viewTabVariants({
                      state: currentView === option.id ? "active" : "inactive",
                    }),
                  )}
                >
                  <option.icon className="h-4 w-4" />
                  <span className="hidden lg:inline">{option.label}</span>
                </div>
              </InteractiveHoverButton>
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

          {/* Mobile view switcher - icons only */}
          <div className="flex md:hidden items-center gap-1 rounded-md bg-muted p-1">
            {viewOptions.map((option) => (
              <InteractiveHoverButton
                key={option.id}
                onClick={() => handleViewChange(option.id)}
              >
                <div
                  className={cn(
                    viewTabVariants({
                      state: currentView === option.id ? "active" : "inactive",
                    }),
                    "px-2 py-2" // Smaller padding for mobile icons
                  )}
                  title={option.label}
                >
                  <option.icon className="h-4 w-4" />
                </div>
              </InteractiveHoverButton>
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
              <ListView
                tasks={tasks}
                onEdit={openTaskForm}
                onDelete={handleDelete}
              />
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
