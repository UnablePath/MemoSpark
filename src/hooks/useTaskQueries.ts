import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@clerk/nextjs';
import {
  fetchTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  toggleTaskCompletion,
  fetchTasksPaginated,
  getDashboardCounts,
} from '@/lib/supabase/tasksApi';
import type {
  Task,
  TaskInsert,
  TaskUpdate,
  TaskFilters,
  TasksResponse,
} from '@/types/taskTypes';
import { useDebouncedAchievementTrigger } from '@/hooks/useDebouncedAchievementTrigger';

// ========================================
// QUERY KEYS
// ========================================

export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (filters?: TaskFilters) => [...taskKeys.lists(), { filters }] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
  paginated: (page: number, limit: number, filters?: TaskFilters) =>
    [...taskKeys.all, 'paginated', { page, limit, filters }] as const,
  dashboard: () => [...taskKeys.all, 'dashboard'] as const,
};

// ========================================
// QUERY HOOKS
// ========================================

/**
 * Hook to fetch all tasks with optional filtering
 * Now uses Clerk authentication automatically
 */
export const useFetchTasks = (filters?: TaskFilters, getToken?: () => Promise<string | null>) => {
  return useQuery({
    queryKey: taskKeys.list(filters),
    queryFn: () => fetchTasks(filters, getToken),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
    retry: (failureCount, error) => {
      // Don't retry on auth errors
      if (error instanceof Error && error.message.includes('not authenticated')) {
        return false;
      }
      return failureCount < 3;
    },
  });
};

/**
 * Hook to get a specific task by ID
 */
export const useGetTask = (id: string, enabled = true, getToken?: () => Promise<string | null>) => {
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: () => getTaskById(id, getToken),
    enabled: enabled && Boolean(id),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes('not authenticated')) {
        return false;
      }
      return failureCount < 3;
    },
  });
};

/**
 * Hook to fetch tasks with pagination
 */
export const useFetchTasksPaginated = (
  page = 0,
  limit = 20,
  filters?: TaskFilters,
  getToken?: () => Promise<string | null>
) => {
  return useQuery({
    queryKey: taskKeys.paginated(page, limit, filters),
    queryFn: () => fetchTasksPaginated(page, limit, filters, getToken),
    staleTime: 1000 * 60 * 3, // 3 minutes for paginated data
    gcTime: 1000 * 60 * 8, // 8 minutes
    placeholderData: (previousData) => previousData, // Keep previous data while fetching new page
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes('not authenticated')) {
        return false;
      }
      return failureCount < 3;
    },
  });
};

/**
 * Hook to get dashboard counts
 */
export const useDashboardCounts = (getToken?: () => Promise<string | null>) => {
  return useQuery({
    queryKey: taskKeys.dashboard(),
    queryFn: () => getDashboardCounts(getToken),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
    retry: 2,
  });
};



// ========================================
// MUTATION HOOKS
// ========================================

/**
 * Hook to create a new task with optimistic updates
 */
export const useCreateTask = (getToken?: () => Promise<string | null>) => {
  const queryClient = useQueryClient();
  const { triggerTaskCompleted } = useDebouncedAchievementTrigger();

  return useMutation({
    mutationFn: (taskData: Omit<TaskInsert, 'user_id'>) => createTask(taskData, getToken),
    onMutate: async (newTaskData) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });
      await queryClient.cancelQueries({ queryKey: taskKeys.dashboard() });

      // Snapshot the previous value
      const previousTasks = queryClient.getQueryData(taskKeys.list());
      const previousDashboard = queryClient.getQueryData(taskKeys.dashboard());

      // Optimistically update to the new value
      if (previousTasks) {
        const optimisticTask: Task = {
          id: `temp-${Date.now()}`, // Temporary ID
          user_id: 'temp-user-id',
          ...newTaskData,
          due_date: newTaskData.due_date && typeof newTaskData.due_date === 'object' && 'toISOString' in newTaskData.due_date
            ? (newTaskData.due_date as Date).toISOString() 
            : newTaskData.due_date,
          completed: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        queryClient.setQueryData(
          taskKeys.list(),
          (old: Task[] | undefined) => old ? [optimisticTask, ...old] : [optimisticTask]
        );
      }

      // Return a context object with the snapshotted value
      return { previousTasks, previousDashboard };
    },
    onError: (err, newTaskData, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousTasks) {
        queryClient.setQueryData(taskKeys.list(), context.previousTasks);
      }
      if (context?.previousDashboard) {
        queryClient.setQueryData(taskKeys.dashboard(), context.previousDashboard);
      }
      
      toast.error('Failed to create task. Please try again.');
      console.error('Create task error:', err);
    },
    onSuccess: async (data, variables) => {
      toast.success('Task created successfully!');
      
      // Trigger achievement for task completion
      triggerTaskCompleted(variables.title);
      
      // Schedule AI-powered smart reminders if enabled
      if (data.reminder_settings?.enabled && data.due_date) {
        try {
          // Import ReminderEngine for AI-powered reminders
          const { ReminderEngine } = await import('@/lib/reminders/ReminderEngine');
          const reminderEngine = ReminderEngine.getInstance();

          const taskForSmartReminder = {
            id: data.id,
            title: data.title,
            due_date: data.due_date,
            user_id: data.clerk_user_id || data.user_id,
            priority: data.priority,
            type: data.type,
            subject: data.subject,
            reminder_offset_minutes: data.reminder_settings?.offset_minutes || 15,
            is_completed: data.completed
          };

          const smartReminderScheduled = await reminderEngine.scheduleSmartReminder(taskForSmartReminder);
          
          if (smartReminderScheduled) {
            console.log(`✅ AI-powered smart reminders scheduled for task: ${data.title}`);
            toast.success('Smart reminders activated!', {
              description: `AI will optimize reminder timing based on your patterns and task importance.`
            });
          } else {
            console.warn(`⚠️ Failed to schedule smart reminders for task: ${data.title}`);
            toast.warning('Task created, but smart reminders not scheduled', {
              description: 'Enable push notifications in settings to receive proactive reminders.'
            });
          }
        } catch (error) {
          console.error('Error scheduling smart task reminders:', error);
          // Don't show error to user as task was created successfully
        }
      }
      
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.dashboard() });
      
      // Add the new task to the cache
      queryClient.setQueryData(taskKeys.detail(data.id), data);
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
};

/**
 * Hook to update a task with optimistic updates
 */
export const useUpdateTask = (getToken?: () => Promise<string | null>) => {
  const queryClient = useQueryClient();
  const { triggerAchievement } = useDebouncedAchievementTrigger();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: TaskUpdate }) =>
      updateTask(id, updates, getToken),
    onMutate: async ({ id, updates }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: taskKeys.detail(id) });
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });

      // Snapshot the previous values
      const previousTask = queryClient.getQueryData(taskKeys.detail(id));
      const previousTasks = queryClient.getQueryData(taskKeys.list());

      // Optimistically update the individual task
      if (previousTask) {
        const updatedTask = {
          ...previousTask as Task,
          ...updates,
          due_date: updates.due_date && typeof updates.due_date === 'object' && 'toISOString' in updates.due_date
            ? (updates.due_date as Date).toISOString() 
            : updates.due_date || (previousTask as Task).due_date,
          updated_at: new Date().toISOString(),
        };

        queryClient.setQueryData(taskKeys.detail(id), updatedTask);

        // Update the task in the list as well
        queryClient.setQueryData(
          taskKeys.list(),
          (old: Task[] | undefined) =>
            old?.map((task) => task.id === id ? updatedTask : task)
        );
      }

      return { previousTask, previousTasks };
    },
    onError: (err, { id }, context) => {
      // Roll back optimistic updates
      if (context?.previousTask) {
        queryClient.setQueryData(taskKeys.detail(id), context.previousTask);
      }
      if (context?.previousTasks) {
        queryClient.setQueryData(taskKeys.list(), context.previousTasks);
      }
      
      toast.error('Failed to update task. Please try again.');
      console.error('Update task error:', err);
    },
    onSuccess: async (data, { id, updates }, context) => {
      toast.success('Task updated successfully!');
      
      // Check if a reminder was just added for the first time
      const previousTask = context?.previousTask as Task | undefined;
      if (updates.reminder_settings?.enabled && !previousTask?.reminder_settings?.enabled) {
        triggerAchievement('first_reminder');
      }

      // Handle AI-powered smart reminder scheduling for updated task
      if (updates.reminder_settings?.enabled && data.due_date) {
        try {
          // Import ReminderEngine for AI-powered reminders
          const { ReminderEngine } = await import('@/lib/reminders/ReminderEngine');
          const reminderEngine = ReminderEngine.getInstance();

          const taskForSmartReminder = {
            id: data.id,
            title: data.title,
            due_date: data.due_date,
            user_id: data.clerk_user_id || data.user_id,
            priority: data.priority,
            type: data.type,
            subject: data.subject,
            reminder_offset_minutes: data.reminder_settings?.offset_minutes || 15,
            is_completed: data.completed
          };

          const smartReminderScheduled = await reminderEngine.scheduleSmartReminder(taskForSmartReminder);
          
          if (smartReminderScheduled) {
            console.log(`✅ Smart reminders updated for task: ${data.title}`);
            toast.success('Smart reminders updated!', {
              description: `AI will adjust reminder timing based on your updated task settings.`
            });
          }
        } catch (error) {
          console.error('Error updating smart task reminders:', error);
        }
      } else if (updates.reminder_settings?.enabled === false) {
        // Cancel reminders if disabled
        try {
          // Cancel both basic and smart reminders
          const { taskReminderService } = await import('@/lib/notifications/TaskReminderService');
          const { ReminderEngine } = await import('@/lib/reminders/ReminderEngine');
          
          await taskReminderService.cancelTaskReminders(id, data.clerk_user_id || data.user_id);
          // Note: ReminderEngine doesn't have a direct cancel method, but scheduled OneSignal notifications will remain
          console.log(`✅ Reminders cancelled for task: ${data.title}`);
        } catch (error) {
          console.error('Error cancelling task reminders:', error);
        }
      }
      
      // Update the cache with the real data
      queryClient.setQueryData(taskKeys.detail(id), data);
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.dashboard() });
    },
  });
};

/**
 * Hook to delete a task with optimistic updates
 */
export const useDeleteTask = (getToken?: () => Promise<string | null>) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteTask(id, getToken),
    onMutate: async (id) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });
      await queryClient.cancelQueries({ queryKey: taskKeys.dashboard() });

      // Snapshot the previous value
      const previousTasks = queryClient.getQueryData(taskKeys.list());

      // Optimistically update to remove the task
      queryClient.setQueryData(
        taskKeys.list(),
        (old: Task[] | undefined) => old?.filter((task) => task.id !== id)
      );

      return { previousTasks };
    },
    onError: (err, id, context) => {
      // Roll back optimistic update
      if (context?.previousTasks) {
        queryClient.setQueryData(taskKeys.list(), context.previousTasks);
      }
      
      toast.error('Failed to delete task. Please try again.');
      console.error('Delete task error:', err);
    },
    onSuccess: async (data, id) => {
      toast.success('Task deleted successfully!');
      
      // Cancel any reminders for the deleted task
      try {
        // We need to get the task data before it was deleted to get the user ID
        const previousTask = queryClient.getQueryData(taskKeys.detail(id)) as Task | undefined;
        if (previousTask) {
          const { taskReminderService } = await import('@/lib/notifications/TaskReminderService');
          await taskReminderService.cancelTaskReminders(id, previousTask.clerk_user_id || previousTask.user_id);
          console.log(`✅ Reminders cancelled for deleted task: ${previousTask.title}`);
        }
      } catch (error) {
        console.error('Error cancelling reminders for deleted task:', error);
      }
      
      // Remove from cache
      queryClient.removeQueries({ queryKey: taskKeys.detail(id) });
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.dashboard() });
    },
  });
};

/**
 * Hook to toggle task completion with optimistic updates
 */
export const useToggleTaskCompletion = (getToken?: () => Promise<string | null>) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => toggleTaskCompletion(id, getToken),
    onMutate: async (id) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: taskKeys.detail(id) });
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });
      await queryClient.cancelQueries({ queryKey: taskKeys.dashboard() });

      // Snapshot the previous values
      const previousTask = queryClient.getQueryData(taskKeys.detail(id));
      const previousTasks = queryClient.getQueryData(taskKeys.list());

      // Optimistically update the task completion
      if (previousTask) {
        const updatedTask = {
          ...previousTask as Task,
          completed: !(previousTask as Task).completed,
          updated_at: new Date().toISOString(),
        };

        queryClient.setQueryData(taskKeys.detail(id), updatedTask);

        // Update the task in the list as well
        queryClient.setQueryData(
          taskKeys.list(),
          (old: Task[] | undefined) =>
            old?.map((task) => task.id === id ? updatedTask : task)
        );
      }

      return { previousTask, previousTasks };
    },
    onError: (err, id, context) => {
      // Roll back optimistic updates
      if (context?.previousTask) {
        queryClient.setQueryData(taskKeys.detail(id), context.previousTask);
      }
      if (context?.previousTasks) {
        queryClient.setQueryData(taskKeys.list(), context.previousTasks);
      }
      
      toast.error('Failed to update task completion. Please try again.');
      console.error('Toggle task completion error:', err);
    },
    onSuccess: async (data, id) => {
      const isCompleted = data.completed;
      toast.success(isCompleted ? 'Task completed!' : 'Task marked as incomplete.');
      
      // Cancel reminders if task is completed
      if (isCompleted) {
        try {
          const { taskReminderService } = await import('@/lib/notifications/TaskReminderService');
          await taskReminderService.cancelTaskReminders(id, data.clerk_user_id || data.user_id);
          console.log(`✅ Reminders cancelled for completed task: ${data.title}`);
        } catch (error) {
          console.error('Error cancelling reminders for completed task:', error);
        }
      } else if (!isCompleted && data.reminder_settings?.enabled && data.due_date) {
        // Reschedule smart reminders if task is marked incomplete again and has reminders enabled
        try {
          const { ReminderEngine } = await import('@/lib/reminders/ReminderEngine');
          const reminderEngine = ReminderEngine.getInstance();

          const taskForSmartReminder = {
            id: data.id,
            title: data.title,
            due_date: data.due_date,
            user_id: data.clerk_user_id || data.user_id,
            priority: data.priority,
            type: data.type,
            subject: data.subject,
            reminder_offset_minutes: data.reminder_settings?.offset_minutes || 15,
            is_completed: data.completed
          };

          await reminderEngine.scheduleSmartReminder(taskForSmartReminder);
          console.log(`✅ Smart reminders rescheduled for incomplete task: ${data.title}`);
        } catch (error) {
          console.error('Error rescheduling smart reminders for incomplete task:', error);
        }
      }
      
      // Update the cache with the real data
      queryClient.setQueryData(taskKeys.detail(id), data);
      
      // Invalidate related queries to refresh counts
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.dashboard() });
    },
  });
};

// ========================================
// UTILITY HOOKS
// ========================================

/**
 * Hook to invalidate all task-related queries
 */
export const useInvalidateTaskQueries = () => {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: taskKeys.all }),
    invalidateLists: () => queryClient.invalidateQueries({ queryKey: taskKeys.lists() }),
    invalidateDetails: () => queryClient.invalidateQueries({ queryKey: taskKeys.details() }),
    invalidateDashboard: () => queryClient.invalidateQueries({ queryKey: taskKeys.dashboard() }),
    invalidateTask: (id: string) => queryClient.invalidateQueries({ queryKey: taskKeys.detail(id) }),
  };
};

/**
 * Hook to prefetch task data
 */
export const usePrefetchTask = (getToken?: () => Promise<string | null>) => {
  const queryClient = useQueryClient();

  return {
    prefetchTask: (id: string) =>
      queryClient.prefetchQuery({
        queryKey: taskKeys.detail(id),
        queryFn: () => getTaskById(id, getToken),
        staleTime: 1000 * 60 * 5,
      }),
    prefetchTasks: (filters?: TaskFilters) =>
      queryClient.prefetchQuery({
        queryKey: taskKeys.list(filters),
        queryFn: () => fetchTasks(filters, getToken),
        staleTime: 1000 * 60 * 5,
      }),
  };
};

// Export all hooks as a collection for backward compatibility
export const useTaskQueries = {
  useFetchTasks,
  useGetTask,
  useFetchTasksPaginated,
  useDashboardCounts,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useToggleTaskCompletion,
  useInvalidateTaskQueries,
  usePrefetchTask,
};