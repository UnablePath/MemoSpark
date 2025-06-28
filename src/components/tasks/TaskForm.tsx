"use client";

import type React from 'react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Clock, AlertCircle, Repeat, Info, Target, Brain, Sparkles, Crown, X } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import { useCreateTask, useUpdateTask, useGetTask } from '@/hooks/useTaskQueries';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { SuggestionCard } from '@/components/ai/SuggestionCard';
import { useTieredAI } from '@/hooks/useTieredAI';
import type { AISuggestion } from '@/types/ai';
import type {
  TaskFormData,
  Priority,
  TaskType,
  ReminderSettings,
} from '@/types/taskTypes';
import { PRIORITY_OPTIONS, TASK_TYPE_OPTIONS } from '@/types/taskTypes';
import {
  RECURRENCE_FREQUENCIES,
  DAYS_OF_WEEK,
  RECURRENCE_END_TYPES,
  createRRuleFromSettings,
  parseRRuleToSettings,
  defaultRecurrenceSettings,
  type RecurrenceSettings,
} from '@/lib/recurrence';

// Validation schema for task form
const taskFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().optional(),
  due_date: z.date().optional(),
  priority: z.enum(['low', 'medium', 'high']),
  type: z.enum(['academic', 'personal', 'event']),
  subject: z.string().optional(),
  reminder_settings: z.object({
    enabled: z.boolean(),
    offset_minutes: z.number().min(0).optional(),
    type: z.enum(['notification', 'email', 'both']).optional(),
  }).optional(),
  recurrence_settings: z.object({
    frequency: z.enum(['none', 'daily', 'weekly', 'monthly', 'yearly']),
    interval: z.number().min(1).max(999),
    daysOfWeek: z.array(z.number()).optional(),
    endType: z.enum(['never', 'count', 'until']),
    count: z.number().min(1).optional(),
    until: z.date().optional(),
  }).optional(),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

interface TaskFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId?: string | null;
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
}

export const TaskForm: React.FC<TaskFormProps> = ({
  open,
  onOpenChange,
  taskId,
  onSuccess,
  onCancel,
  className,
}) => {
  // Authentication hook for Clerk integration
  const { getToken } = useAuth();
  
  // Create token provider function for Supabase integration
  const getTokenForSupabase = useCallback(() => 
    getToken({ template: 'supabase-integration' }), [getToken]
  );

  // Hooks for task operations
  const createTaskMutation = useCreateTask(getTokenForSupabase);
  const updateTaskMutation = useUpdateTask(getTokenForSupabase);
  const { data: existingTask, isLoading: isLoadingTask } = useGetTask(
    taskId || '',
    Boolean(taskId),
    getTokenForSupabase
  );

  // Form setup
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'medium',
      type: 'academic',
      subject: '',
      reminder_settings: {
        enabled: false,
        offset_minutes: 15,
        type: 'notification',
      },
      recurrence_settings: {
        frequency: 'none',
        interval: 1,
        daysOfWeek: [],
        endType: 'never',
      },
    },
  });

  // State for date/time picker
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timeValue, setTimeValue] = useState('09:00');

  // AI Suggestions state
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [aiSuggestions, setAISuggestions] = useState<AISuggestion[]>([]);
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(new Set());

  // Tier-aware AI integration
  const { 
    userTier, 
    usage, 
    isLoading: isTierLoading, 
    generateSuggestions, 
    isFeatureAvailable,
    tierLimits 
  } = useTieredAI();

  // Watch form values for AI suggestions - use individual watches to avoid array reference changes
  const watchedTitle = form.watch('title');
  const watchedSubject = form.watch('subject');
  const watchedType = form.watch('type');

  // Tier-aware AI suggestions generation
  const generateTierAwareContextualSuggestions = useCallback(async (title: string, subject: string, type: string): Promise<AISuggestion[]> => {
    if (!isFeatureAvailable('basic_suggestions')) {
      return [];
    }

    try {
      const response = await generateSuggestions('basic_suggestions', [], {
        currentTime: new Date(),
        upcomingTasks: [],
        recentActivity: [],
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
        metadata: { formData: { title, subject, type }, currentContext: 'task_creation' }
      });
      
      if (response.success && response.data && Array.isArray(response.data)) {
        return response.data;
      } else {
        // Fallback to contextual suggestions for free users
        return generateContextualSuggestions(title, subject, type);
      }
    } catch (error) {
      console.error('Error generating tier-aware suggestions:', error);
      // Fallback to contextual suggestions for free users
      return generateContextualSuggestions(title, subject, type);
    }
  }, [isFeatureAvailable, generateSuggestions]);
  
  // Generate contextual AI suggestions based on form input
  const generateContextualSuggestions = useCallback((title: string, subject: string, type: string): AISuggestion[] => {
    const suggestions: AISuggestion[] = [];
    const titleLower = title.toLowerCase();
    const subjectLower = subject.toLowerCase();

    // Early return if no input
    if (!title.trim() && !subject.trim()) return [];

    // Title-based suggestions
    if (titleLower.includes('math') || subjectLower.includes('math')) {
      suggestions.push({
        id: 'math-suggestion-1',
        type: 'task_suggestion',
        title: 'Schedule spaced practice sessions',
        description: 'For math topics, breaking into 30-minute practice sessions over multiple days improves retention by 40%.',
        priority: 'medium',
        confidence: 0.85,
        reasoning: 'Research shows spaced repetition is highly effective for mathematical concepts.',
        metadata: {
          category: 'academic',
          tags: ['math', 'practice', 'spaced-repetition'],
          estimatedBenefit: 0.8,
          requiredAction: 'optional'
        },
        createdAt: new Date().toISOString(),
        acceptanceStatus: 'pending'
      });
    }

    if (titleLower.includes('study') || titleLower.includes('review')) {
      suggestions.push({
        id: 'study-suggestion-1',
        type: 'study_time',
        title: 'Add active recall techniques',
        description: 'Include flashcards or practice questions in your study session for better retention.',
        priority: 'high',
        confidence: 0.92,
        reasoning: 'Active recall improves learning effectiveness by 50% compared to passive reading.',
        metadata: {
          category: 'productivity',
          tags: ['study', 'active-recall', 'flashcards'],
          estimatedBenefit: 0.9,
          requiredAction: 'immediate'
        },
        createdAt: new Date().toISOString(),
        acceptanceStatus: 'pending'
      });
    }

    if (titleLower.includes('project') || titleLower.includes('assignment')) {
      suggestions.push({
        id: 'project-suggestion-1',
        type: 'schedule_optimization',
        title: 'Break into smaller milestones',
        description: 'Split this into 3-4 smaller tasks with specific deadlines to avoid last-minute stress.',
        priority: 'high',
        confidence: 0.88,
        reasoning: 'Breaking large projects into smaller tasks increases completion rates by 60%.',
        metadata: {
          category: 'productivity',
          tags: ['project', 'milestones', 'planning'],
          estimatedBenefit: 0.85,
          requiredAction: 'immediate'
        },
        createdAt: new Date().toISOString(),
        acceptanceStatus: 'pending'
      });
    }

    // Subject-based suggestions
    if (subjectLower.includes('physics')) {
      suggestions.push({
        id: 'physics-suggestion-1',
        type: 'difficulty_adjustment',
        title: 'Start with concept review',
        description: 'Begin with fundamental concepts before tackling complex problems to build confidence.',
        priority: 'medium',
        confidence: 0.78,
        reasoning: 'Physics concepts build on each other - solid foundations improve problem-solving success.',
        metadata: {
          category: 'academic',
          tags: ['physics', 'concepts', 'foundation'],
          estimatedBenefit: 0.75,
          requiredAction: 'optional'
        },
        createdAt: new Date().toISOString(),
        acceptanceStatus: 'pending'
      });
    }

    // General productivity suggestions
    if (type === 'academic' && suggestions.length === 0 && title.trim()) {
      suggestions.push({
        id: 'general-academic-1',
        type: 'study_time',
        title: 'Set a focused time block',
        description: 'Academic tasks benefit from dedicated 45-90 minute focused sessions with short breaks.',
        priority: 'medium',
        confidence: 0.82,
        reasoning: 'Focused time blocks improve academic performance and reduce cognitive fatigue.',
        metadata: {
          category: 'productivity',
          tags: ['focus', 'time-block', 'academic'],
          estimatedBenefit: 0.7,
          requiredAction: 'optional'
        },
        createdAt: new Date().toISOString(),
        acceptanceStatus: 'pending'
      });
    }

    return suggestions.slice(0, 2); // Limit to 2 suggestions to avoid overwhelming
  }, []);
  
  // Generate contextual suggestions based on form input
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  
  // Update AI suggestions when form values change - use tier-aware generation
  useEffect(() => {
    const generateFormSuggestions = async () => {
      if (!watchedTitle || watchedTitle.length < 3) {
        setAISuggestions([]);
        setShowAISuggestions(false);
        return;
      }

      setIsGeneratingSuggestions(true);
      try {
        let suggestions: AISuggestion[];
        if (isFeatureAvailable('basic_suggestions')) {
          // Use tier-aware AI service
          suggestions = await generateTierAwareContextualSuggestions(
            watchedTitle || '', 
            watchedSubject || '', 
            watchedType || ''
          );
        } else {
          // Use fallback contextual suggestions
          suggestions = generateContextualSuggestions(
            watchedTitle || '', 
            watchedSubject || '', 
            watchedType || ''
          );
        }
        
        const filteredSuggestions = suggestions.filter(
          suggestion => !appliedSuggestions.has(suggestion.id)
        );
        
        setAISuggestions(filteredSuggestions);
        if (filteredSuggestions.length > 0) {
          setShowAISuggestions(true);
        }
      } catch (error) {
        console.error('Error generating form suggestions:', error);
        // Fallback to basic suggestions
        const fallbackSuggestions = generateContextualSuggestions(
          watchedTitle || '', 
          watchedSubject || '', 
          watchedType || ''
        ).filter(suggestion => !appliedSuggestions.has(suggestion.id));
        
        setAISuggestions(fallbackSuggestions);
      } finally {
        setIsGeneratingSuggestions(false);
      }
    };

    const debounceTimer = setTimeout(generateFormSuggestions, 500);
    return () => clearTimeout(debounceTimer);
  }, [watchedTitle, watchedSubject, watchedType, appliedSuggestions, isFeatureAvailable, generateTierAwareContextualSuggestions, generateContextualSuggestions]);

  // AI suggestion handlers
  const handleAcceptSuggestion = useCallback((suggestionId: string) => {
    const suggestion = aiSuggestions.find(s => s.id === suggestionId);
    if (!suggestion) return;

    // Apply suggestion to form
    if (suggestion.type === 'task_suggestion' && suggestion.metadata?.tags?.includes('spaced-repetition')) {
      // Suggest adding recurring sessions
      form.setValue('recurrence_settings.frequency', 'daily');
      form.setValue('recurrence_settings.interval', 2); // Every other day
    }
    
    if (suggestion.metadata?.tags?.includes('active-recall')) {
      // Enhance description with active recall techniques
      const currentDesc = form.getValues('description') || '';
      const enhancedDesc = currentDesc + 
        (currentDesc ? '\n\n' : '') + 
        '📚 Include active recall techniques:\n' +
        '• Create flashcards for key concepts\n' +
        '• Practice problems without looking at solutions\n' +
        '• Explain concepts out loud';
      form.setValue('description', enhancedDesc);
    }

    if (suggestion.metadata?.tags?.includes('milestones')) {
      // Suggest breaking into phases
      const currentDesc = form.getValues('description') || '';
      const enhancedDesc = currentDesc + 
        (currentDesc ? '\n\n' : '') + 
        '🎯 Project Milestones:\n' +
        '• Phase 1: Research and planning\n' +
        '• Phase 2: Initial implementation\n' +
        '• Phase 3: Review and refinement\n' +
        '• Phase 4: Final submission';
      form.setValue('description', enhancedDesc);
    }

    // Mark suggestion as applied
    setAppliedSuggestions(prev => new Set([...prev, suggestionId]));
    
    // Remove from current suggestions
    setAISuggestions(prev => prev.filter(s => s.id !== suggestionId));
  }, [aiSuggestions, form]);

  const handleRejectSuggestion = useCallback((suggestionId: string) => {
    setAISuggestions(prev => prev.filter(s => s.id !== suggestionId));
    setAppliedSuggestions(prev => new Set([...prev, suggestionId]));
  }, []);

  const toggleAISuggestions = useCallback(() => {
    setShowAISuggestions(prev => !prev);
  }, []);

  // Load existing task data for editing
  useEffect(() => {
    if (existingTask && taskId) {
      // Parse recurrence settings from existing task
      let recurrenceSettings = defaultRecurrenceSettings;
      if (existingTask.recurrence_rule) {
        recurrenceSettings = parseRRuleToSettings(existingTask.recurrence_rule);
      }

      form.reset({
        title: existingTask.title,
        description: existingTask.description || '',
        due_date: existingTask.due_date ? new Date(existingTask.due_date) : undefined,
        priority: existingTask.priority,
        type: existingTask.type,
        subject: existingTask.subject || '',
        reminder_settings: existingTask.reminder_settings || {
          enabled: false,
          offset_minutes: 15,
          type: 'notification',
        },
        recurrence_settings: recurrenceSettings,
      });

      // Set time value if due_date exists
      if (existingTask.due_date) {
        const date = new Date(existingTask.due_date);
        setTimeValue(format(date, 'HH:mm'));
        setShowTimePicker(true);
      }
    }
  }, [existingTask, taskId, form]);

  // Handle form submission
  const onSubmit = async (values: TaskFormValues) => {
    try {
      // Combine date and time if both are provided
      let finalDueDate: Date | undefined = values.due_date;
      if (values.due_date && showTimePicker && timeValue) {
        const [hours, minutes] = timeValue.split(':').map(Number);
        finalDueDate = new Date(values.due_date);
        finalDueDate.setHours(hours, minutes, 0, 0);
      }

      // Generate RRULE string from recurrence settings
      let recurrenceRule: string | undefined;
      if (values.recurrence_settings && finalDueDate) {
        const recurrenceSettings = {
          ...values.recurrence_settings,
          daysOfWeek: values.recurrence_settings.daysOfWeek || [],
        };
        recurrenceRule = createRRuleFromSettings(recurrenceSettings, finalDueDate) || undefined;
      }

      const taskData = {
        title: values.title,
        description: values.description || undefined,
        due_date: finalDueDate?.toISOString(),
        priority: values.priority,
        type: values.type,
        subject: values.subject || undefined,
        reminder_settings: values.reminder_settings,
        recurrence_rule: recurrenceRule,
      };

      if (taskId && existingTask) {
        // Update existing task
        await updateTaskMutation.mutateAsync({
          id: taskId,
          updates: taskData,
        });
      } else {
        // Create new task
        await createTaskMutation.mutateAsync({
          ...taskData,
          completed: false, // New tasks start as incomplete
        });
      }

      handleSuccess();
    } catch (error) {
      console.error('Error saving task:', error);
      // Error handling is done by the mutation hooks with toast notifications
    }
  };

  // Handle close with optional callback
  const handleClose = () => {
    onCancel?.();
    onOpenChange(false);
  };

  // Handle successful form submission
  const handleSuccess = () => {
    onSuccess?.();
    onOpenChange(false);
  };

  // Calculate loading state
  const isLoading = 
    createTaskMutation.isPending || 
    updateTaskMutation.isPending || 
    isLoadingTask;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {taskId ? 'Edit Task' : 'Create New Task'}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {taskId ? 'Update your task details below' : 'Fill in the details to create a new task'}
          </p>
        </DialogHeader>

        <Form {...form}>
          <form 
            onSubmit={form.handleSubmit(onSubmit)} 
            className="space-y-6"
            role="form"
            aria-label={taskId ? "Edit task form" : "Create new task form"}
          >
            {/* Basic Task Information */}
            <section>
              <h3 className="text-lg font-semibold mb-4">Basic Task Information</h3>
              
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Task Title <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter a clear, descriptive title..."
                          {...field}
                          disabled={isLoading}
                          className="h-11"
                        />
                      </FormControl>
                      <FormDescription className="text-xs text-muted-foreground">
                        A concise title that clearly describes what needs to be done.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Add any additional details, notes, or requirements..."
                          className="min-h-[80px] resize-none"
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormDescription className="text-xs text-muted-foreground">
                        Optional: Provide more context, requirements, or notes about the task.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            {/* Task Properties */}
            <section>
              <h3 className="text-lg font-semibold mb-4">Task Properties</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Priority Level</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                        <FormControl>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PRIORITY_OPTIONS.map((priority) => (
                            <SelectItem key={priority} value={priority}>
                              <div className="flex items-center gap-2">
                                <div
                                  className={cn(
                                    'w-2 h-2 rounded-full',
                                    priority === 'high' && 'bg-red-500',
                                    priority === 'medium' && 'bg-yellow-500',
                                    priority === 'low' && 'bg-green-500'
                                  )}
                                />
                                {priority.charAt(0).toUpperCase() + priority.slice(1)}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-xs text-muted-foreground">
                        How urgent or important is this task?
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Task Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                        <FormControl>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TASK_TYPE_OPTIONS.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type.charAt(0).toUpperCase() + type.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-xs text-muted-foreground">
                        What type of task is this?
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem className="mt-4">
                    <FormLabel className="text-sm font-medium">Subject/Course</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Mathematics, Computer Science, Personal Development..."
                        {...field}
                        disabled={isLoading}
                        className="h-11"
                      />
                    </FormControl>
                    <FormDescription className="text-xs text-muted-foreground">
                      For academic tasks, specify the course or subject area. For personal tasks, you can categorize by area of focus.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </section>

            {/* Scheduling */}
            <section>
              <h3 className="text-lg font-semibold mb-4">Scheduling</h3>
              
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="due_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Due Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                'w-full h-11 pl-3 text-left font-normal justify-start',
                                !field.value && 'text-muted-foreground'
                              )}
                              disabled={isLoading}
                            >
                              {field.value ? (
                                <>
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {format(field.value, 'PPP')}
                                </>
                              ) : (
                                <>
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  <span>Pick a due date</span>
                                </>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription className="text-xs text-muted-foreground">
                        When does this task need to be completed?
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="show-time"
                      checked={showTimePicker}
                      onCheckedChange={(checked: boolean | "indeterminate") => setShowTimePicker(checked === true)}
                      disabled={isLoading}
                    />
                    <Label htmlFor="show-time" className="text-sm font-medium cursor-pointer">
                      Set specific time
                    </Label>
                  </div>
                  <FormDescription className="text-xs text-muted-foreground">
                    Enable to set a specific deadline time, otherwise the task will be due by end of day.
                  </FormDescription>

                  {showTimePicker && (
                    <div className="flex items-center space-x-2 pl-6">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <Input
                        type="time"
                        value={timeValue}
                        onChange={(e) => setTimeValue(e.target.value)}
                        className="w-32 h-9"
                        disabled={isLoading}
                      />
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Reminders */}
            <section>
              <h3 className="text-lg font-semibold mb-4">Reminders</h3>
              
              <FormField
                control={form.control}
                name="reminder_settings.enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none flex-1">
                      <FormLabel className="text-sm font-medium cursor-pointer">
                        Enable Reminders
                      </FormLabel>
                      <FormDescription className="text-xs text-muted-foreground">
                        Get notified before the task is due to help you stay on track.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </section>

            {/* Repeat Settings */}
            <section>
              <h3 className="text-lg font-semibold mb-4">Repeat Settings</h3>
              
              <FormField
                control={form.control}
                name="recurrence_settings.frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Repeat Pattern</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                      <FormControl>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select recurrence pattern" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {RECURRENCE_FREQUENCIES.map((freq) => (
                          <SelectItem key={freq.value} value={freq.value}>
                            {freq.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-xs text-muted-foreground">
                      Choose how often this task should repeat. Select "None" for one-time tasks.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </section>

            {/* Form Actions */}
            <section>
              <h3 className="text-lg font-semibold mb-4">Form Actions</h3>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 h-11"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      <span>{taskId ? 'Updating task...' : 'Creating task...'}</span>
                    </div>
                  ) : (
                    <span>{taskId ? 'Update Task' : 'Create Task'}</span>
                  )}
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="flex-1 h-11"
                >
                  Cancel
                </Button>
              </div>
              
              <FormDescription className="text-center text-xs text-muted-foreground mt-2">
                {taskId ? 'Save your changes to update this task.' : 'Click Create Task to add this task to your list.'}
              </FormDescription>
            </section>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}; 