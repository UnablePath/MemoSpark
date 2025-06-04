"use client";

import type React from 'react';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Clock, AlertCircle, Repeat, Info, Target } from 'lucide-react';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
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
  taskId?: string | null;
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
}

export const TaskForm: React.FC<TaskFormProps> = ({
  taskId,
  onSuccess,
  onCancel,
  className,
}) => {
  // Hooks for task operations
  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const { data: existingTask, isLoading: isLoadingTask } = useGetTask(
    taskId || '',
    Boolean(taskId)
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

      onSuccess?.();
    } catch (error) {
      console.error('Error saving task:', error);
      // Error handling is done by the mutation hooks with toast notifications
    }
  };

  // Calculate loading state
  const isLoading = 
    createTaskMutation.isPending || 
    updateTaskMutation.isPending || 
    isLoadingTask;

  return (
    <div className={cn("w-full max-w-2xl mx-auto", className)}>
      <Form {...form}>
        <form 
          onSubmit={form.handleSubmit(onSubmit)} 
          className="space-y-6"
          role="form"
          aria-label={taskId ? "Edit task form" : "Create new task form"}
        >
          {/* Form Header */}
          <div className="text-center space-y-2">
            <h2 className="text-xl sm:text-2xl font-semibold">
              {taskId ? 'Edit Task' : 'Create New Task'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {taskId ? 'Update your task details below' : 'Fill in the details to create a new task'}
            </p>
            <Separator className="mt-4" />
          </div>

          {/* Basic Information Section */}
          <section aria-labelledby="basic-info-heading">
            <h3 id="basic-info-heading" className="sr-only">Basic Task Information</h3>
            
            {/* Title Field */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">
                    Task Title <span className="text-red-500" aria-label="required">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter a clear, descriptive title..."
                      {...field}
                      disabled={isLoading}
                      aria-describedby="title-description"
                      className="text-base h-11"
                    />
                  </FormControl>
                  <FormDescription id="title-description">
                    A concise title that clearly describes what needs to be done.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description Field */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="mt-4">
                  <FormLabel className="text-base font-medium">Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any additional details, notes, or requirements..."
                      className="min-h-[100px] text-base resize-none"
                      {...field}
                      disabled={isLoading}
                      aria-describedby="description-help"
                    />
                  </FormControl>
                  <FormDescription id="description-help">
                    Optional: Provide more context, requirements, or notes about the task.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>

          {/* Task Properties Section */}
          <section aria-labelledby="properties-heading">
            <h3 id="properties-heading" className="text-lg font-medium mb-4 flex items-center gap-2">
              <Target className="h-5 w-5" />
              Task Properties
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Priority Level</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                      <FormControl>
                        <SelectTrigger aria-describedby="priority-help">
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
                                aria-hidden="true"
                              />
                              {priority.charAt(0).toUpperCase() + priority.slice(1)}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription id="priority-help">
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
                        <SelectTrigger aria-describedby="type-help">
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
                    <FormDescription id="type-help">
                      What type of task is this?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Subject Field */}
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
                      aria-describedby="subject-help"
                    />
                  </FormControl>
                  <FormDescription id="subject-help">
                    For academic tasks, specify the course or subject area. For personal tasks, you can categorize by area of focus.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>

          {/* Scheduling Section */}
          <section aria-labelledby="scheduling-heading">
            <h3 id="scheduling-heading" className="text-lg font-medium mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Scheduling
            </h3>
            
            <Card>
              <CardContent className="p-4 space-y-4">
                {/* Due Date Field */}
                <FormField
                  control={form.control}
                  name="due_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-sm font-medium">Due Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                'w-full pl-3 text-left font-normal justify-start',
                                !field.value && 'text-muted-foreground'
                              )}
                              disabled={isLoading}
                              aria-describedby="due-date-help"
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
                      <FormDescription id="due-date-help">
                        When does this task need to be completed?
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Time Picker (conditional) */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="show-time"
                      checked={showTimePicker}
                      onCheckedChange={(checked: boolean | "indeterminate") => setShowTimePicker(checked === true)}
                      disabled={isLoading}
                      aria-describedby="time-picker-help"
                    />
                    <Label htmlFor="show-time" className="text-sm font-normal cursor-pointer">
                      Set specific time
                    </Label>
                  </div>
                  <FormDescription id="time-picker-help" className="text-xs">
                    Enable to set a specific deadline time, otherwise the task will be due by end of day.
                  </FormDescription>

                  {showTimePicker && (
                    <div className="flex items-center space-x-2 pl-6">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor="time-input" className="sr-only">Time</Label>
                      <Input
                        id="time-input"
                        type="time"
                        value={timeValue}
                        onChange={(e) => setTimeValue(e.target.value)}
                        className="w-32"
                        disabled={isLoading}
                        aria-describedby="time-input-help"
                      />
                      <FormDescription id="time-input-help" className="text-xs">
                        Select the specific time when this task is due.
                      </FormDescription>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Reminder Settings Section */}
          <section aria-labelledby="reminders-heading">
            <h3 id="reminders-heading" className="text-lg font-medium mb-4 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Reminders
            </h3>
            
            <Card>
              <CardContent className="p-4 space-y-4">
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
                          aria-describedby="reminder-help"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm font-medium cursor-pointer">
                          Enable Reminders
                        </FormLabel>
                        <FormDescription id="reminder-help">
                          Get notified before the task is due to help you stay on track.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                {/* Reminder Details (conditional) */}
                {form.watch('reminder_settings.enabled') && (
                  <div className="ml-6 space-y-4 border-l-2 border-muted pl-4" role="group" aria-labelledby="reminder-details">
                    <h4 id="reminder-details" className="sr-only">Reminder Configuration</h4>
                    
                    <FormField
                      control={form.control}
                      name="reminder_settings.offset_minutes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Remind me</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(Number(value))}
                            defaultValue={field.value?.toString()}
                            disabled={isLoading}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select reminder time" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="5">5 minutes before</SelectItem>
                              <SelectItem value="15">15 minutes before</SelectItem>
                              <SelectItem value="30">30 minutes before</SelectItem>
                              <SelectItem value="60">1 hour before</SelectItem>
                              <SelectItem value="120">2 hours before</SelectItem>
                              <SelectItem value="1440">1 day before</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="reminder_settings.type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Reminder Method</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select reminder type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="notification">In-app notification</SelectItem>
                              <SelectItem value="email">Email notification</SelectItem>
                              <SelectItem value="both">Both notification types</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Recurrence Settings Section */}
          <section aria-labelledby="recurrence-heading">
            <h3 id="recurrence-heading" className="text-lg font-medium mb-4 flex items-center gap-2">
              <Repeat className="h-5 w-5" />
              Repeat Settings
            </h3>
            
            <Card>
              <CardContent className="p-4 space-y-4">
                <FormField
                  control={form.control}
                  name="recurrence_settings.frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Repeat Pattern</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                        <FormControl>
                          <SelectTrigger aria-describedby="frequency-help">
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
                      <FormDescription id="frequency-help">
                        Choose how often this task should repeat. Select "None" for one-time tasks.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Recurrence Details (conditional) */}
                {form.watch('recurrence_settings.frequency') !== 'none' && (
                  <div className="ml-6 space-y-4 border-l-2 border-muted pl-4" role="group" aria-labelledby="recurrence-details">
                    <h4 id="recurrence-details" className="sr-only">Recurrence Configuration</h4>
                    
                    {/* Interval */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-muted-foreground">Every</span>
                      <FormField
                        control={form.control}
                        name="recurrence_settings.interval"
                        render={({ field }) => (
                          <FormItem className="flex-1 min-w-0">
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                max="999"
                                className="w-20"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                                disabled={isLoading}
                                aria-label="Recurrence interval"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <span className="text-sm text-muted-foreground">
                        {form.watch('recurrence_settings.frequency') === 'daily' && 'day(s)'}
                        {form.watch('recurrence_settings.frequency') === 'weekly' && 'week(s)'}
                        {form.watch('recurrence_settings.frequency') === 'monthly' && 'month(s)'}
                        {form.watch('recurrence_settings.frequency') === 'yearly' && 'year(s)'}
                      </span>
                    </div>

                    {/* Days of week (for weekly recurrence) */}
                    {form.watch('recurrence_settings.frequency') === 'weekly' && (
                      <FormField
                        control={form.control}
                        name="recurrence_settings.daysOfWeek"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">Repeat on these days</FormLabel>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="group" aria-labelledby="days-of-week">
                              {DAYS_OF_WEEK.map((day) => (
                                <div key={day.value} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`day-${day.value}`}
                                    checked={field.value?.includes(day.value) || false}
                                    onCheckedChange={(checked) => {
                                      const currentDays = field.value || [];
                                      if (checked) {
                                        field.onChange([...currentDays, day.value]);
                                      } else {
                                        field.onChange(currentDays.filter(d => d !== day.value));
                                      }
                                    }}
                                    disabled={isLoading}
                                  />
                                  <Label 
                                    htmlFor={`day-${day.value}`} 
                                    className="text-xs font-normal cursor-pointer select-none"
                                  >
                                    {day.short}
                                  </Label>
                                </div>
                              ))}
                            </div>
                            <FormDescription>
                              Select which days of the week this task should repeat.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* End condition */}
                    <FormField
                      control={form.control}
                      name="recurrence_settings.endType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Stop repeating</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select end condition" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {RECURRENCE_END_TYPES.map((endType) => (
                                <SelectItem key={endType.value} value={endType.value}>
                                  {endType.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Count field (conditional) */}
                    {form.watch('recurrence_settings.endType') === 'count' && (
                      <FormField
                        control={form.control}
                        name="recurrence_settings.count"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">Number of occurrences</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                placeholder="e.g., 10"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                                disabled={isLoading}
                                aria-describedby="count-help"
                              />
                            </FormControl>
                            <FormDescription id="count-help">
                              How many times should this task repeat in total?
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Until date field (conditional) */}
                    {form.watch('recurrence_settings.endType') === 'until' && (
                      <FormField
                        control={form.control}
                        name="recurrence_settings.until"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel className="text-sm font-medium">End date</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      'w-full pl-3 text-left font-normal justify-start',
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
                                        <span>Pick end date</span>
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
                            <FormDescription>
                              The last date this task should repeat.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Form Actions */}
          <section aria-labelledby="form-actions">
            <h3 id="form-actions" className="sr-only">Form Actions</h3>
            <Separator className="mb-6" />
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1 h-11"
                aria-describedby="submit-help"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
                    <span>{taskId ? 'Updating task...' : 'Creating task...'}</span>
                  </div>
                ) : (
                  <span>{taskId ? 'Update Task' : 'Create Task'}</span>
                )}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
                className="flex-1 h-11"
              >
                Cancel
              </Button>
            </div>
            <FormDescription id="submit-help" className="text-center mt-2">
              {taskId ? 'Save your changes to update this task.' : 'Click Create Task to add this task to your list.'}
            </FormDescription>
          </section>
        </form>
      </Form>
    </div>
  );
}; 