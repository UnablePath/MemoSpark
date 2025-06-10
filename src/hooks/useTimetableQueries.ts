import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  fetchTimetableEntries,
  getTimetableEntryById,
  createTimetableEntry,
  updateTimetableEntry,
  deleteTimetableEntry,
  fetchTimetableEntriesPaginated,
} from '@/lib/supabase/tasksApi';
import type {
  TimetableEntry,
  TimetableEntryInsert,
  TimetableEntryUpdate,
  TimetableEntryFilters,
  TimetableEntriesResponse,
} from '@/types/taskTypes';

// ========================================
// QUERY KEYS
// ========================================

export const timetableKeys = {
  all: ['timetable'] as const,
  lists: () => [...timetableKeys.all, 'list'] as const,
  list: (filters?: TimetableEntryFilters) => [...timetableKeys.lists(), { filters }] as const,
  details: () => [...timetableKeys.all, 'detail'] as const,
  detail: (id: string) => [...timetableKeys.details(), id] as const,
  paginated: (page: number, limit: number, filters?: TimetableEntryFilters) =>
    [...timetableKeys.all, 'paginated', { page, limit, filters }] as const,
};

// ========================================
// QUERY HOOKS
// ========================================

/**
 * Hook to fetch all timetable entries with optional filtering
 */
export const useFetchTimetableEntries = (
  filters?: TimetableEntryFilters,
  getToken?: () => Promise<string | null>
) => {
  return useQuery({
    queryKey: timetableKeys.list(filters),
    queryFn: () => fetchTimetableEntries(filters, getToken),
    staleTime: 1000 * 60 * 10, // 10 minutes - timetable changes less frequently
    gcTime: 1000 * 60 * 20, // 20 minutes
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
 * Hook to get a specific timetable entry by ID
 */
export const useGetTimetableEntry = (
  id: string, 
  enabled = true,
  getToken?: () => Promise<string | null>
) => {
  return useQuery({
    queryKey: timetableKeys.detail(id),
    queryFn: () => getTimetableEntryById(id, getToken),
    enabled: enabled && Boolean(id),
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 20, // 20 minutes
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes('not authenticated')) {
        return false;
      }
      return failureCount < 3;
    },
  });
};

/**
 * Hook to fetch timetable entries with pagination
 */
export const useFetchTimetableEntriesPaginated = (
  page = 0,
  limit = 20,
  filters?: TimetableEntryFilters,
  getToken?: () => Promise<string | null>
) => {
  return useQuery({
    queryKey: timetableKeys.paginated(page, limit, filters),
    queryFn: () => fetchTimetableEntriesPaginated(page, limit, filters, getToken),
    staleTime: 1000 * 60 * 8, // 8 minutes for paginated data
    gcTime: 1000 * 60 * 15, // 15 minutes
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
 * Hook to get active semester timetable entries
 */
export const useActiveTimetableEntries = (getToken?: () => Promise<string | null>) => {
  return useFetchTimetableEntries({ semester_active: true }, getToken);
};

// ========================================
// MUTATION HOOKS
// ========================================

/**
 * Hook to create a new timetable entry with optimistic updates
 */
export const useCreateTimetableEntry = (getToken?: () => Promise<string | null>) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (entryData: Omit<TimetableEntryInsert, 'user_id'>) => 
      createTimetableEntry(entryData, getToken),
    onMutate: async (newEntryData) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: timetableKeys.lists() });

      // Snapshot the previous value
      const previousEntries = queryClient.getQueryData(timetableKeys.list());

      // Optimistically update to the new value
      if (previousEntries) {
        const optimisticEntry: TimetableEntry = {
          id: `temp-${Date.now()}`, // Temporary ID
          user_id: 'temp-user-id',
          ...newEntryData,
          semester_start_date: newEntryData.semester_start_date && typeof newEntryData.semester_start_date === 'object' && 'toISOString' in newEntryData.semester_start_date
            ? (newEntryData.semester_start_date as Date).toISOString().split('T')[0] 
            : newEntryData.semester_start_date,
          semester_end_date: newEntryData.semester_end_date && typeof newEntryData.semester_end_date === 'object' && 'toISOString' in newEntryData.semester_end_date
            ? (newEntryData.semester_end_date as Date).toISOString().split('T')[0] 
            : newEntryData.semester_end_date,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        queryClient.setQueryData(
          timetableKeys.list(),
          (old: TimetableEntry[] | undefined) => 
            old ? [optimisticEntry, ...old] : [optimisticEntry]
        );
      }

      return { previousEntries };
    },
    onError: (err, newEntryData, context) => {
      // Roll back optimistic update
      if (context?.previousEntries) {
        queryClient.setQueryData(timetableKeys.list(), context.previousEntries);
      }
      
      toast.error('Failed to create timetable entry. Please try again.');
      console.error('Create timetable entry error:', err);
    },
    onSuccess: (data, variables) => {
      toast.success('Timetable entry created successfully!');
      
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: timetableKeys.lists() });
      
      // Add the new entry to the cache
      queryClient.setQueryData(timetableKeys.detail(data.id), data);
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: timetableKeys.lists() });
    },
  });
};

/**
 * Hook to update a timetable entry with optimistic updates
 */
export const useUpdateTimetableEntry = (getToken?: () => Promise<string | null>) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: TimetableEntryUpdate }) =>
      updateTimetableEntry(id, updates, getToken),
    onMutate: async ({ id, updates }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: timetableKeys.detail(id) });
      await queryClient.cancelQueries({ queryKey: timetableKeys.lists() });

      // Snapshot the previous values
      const previousEntry = queryClient.getQueryData(timetableKeys.detail(id));
      const previousEntries = queryClient.getQueryData(timetableKeys.list());

      // Optimistically update the individual entry
      if (previousEntry) {
        const updatedEntry = {
          ...previousEntry as TimetableEntry,
          ...updates,
          semester_start_date: updates.semester_start_date && typeof updates.semester_start_date === 'object' && 'toISOString' in updates.semester_start_date
            ? (updates.semester_start_date as Date).toISOString().split('T')[0] 
            : updates.semester_start_date || (previousEntry as TimetableEntry).semester_start_date,
          semester_end_date: updates.semester_end_date && typeof updates.semester_end_date === 'object' && 'toISOString' in updates.semester_end_date
            ? (updates.semester_end_date as Date).toISOString().split('T')[0] 
            : updates.semester_end_date || (previousEntry as TimetableEntry).semester_end_date,
          updated_at: new Date().toISOString(),
        };

        queryClient.setQueryData(timetableKeys.detail(id), updatedEntry);

        // Update the entry in the list as well
        queryClient.setQueryData(
          timetableKeys.list(),
          (old: TimetableEntry[] | undefined) =>
            old?.map((entry) => entry.id === id ? updatedEntry : entry)
        );
      }

      return { previousEntry, previousEntries };
    },
    onError: (err, { id }, context) => {
      // Roll back optimistic updates
      if (context?.previousEntry) {
        queryClient.setQueryData(timetableKeys.detail(id), context.previousEntry);
      }
      if (context?.previousEntries) {
        queryClient.setQueryData(timetableKeys.list(), context.previousEntries);
      }
      
      toast.error('Failed to update timetable entry. Please try again.');
      console.error('Update timetable entry error:', err);
    },
    onSuccess: (data, { id }) => {
      toast.success('Timetable entry updated successfully!');
      
      // Update the cache with the real data
      queryClient.setQueryData(timetableKeys.detail(id), data);
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: timetableKeys.lists() });
    },
  });
};

/**
 * Hook to delete a timetable entry with optimistic updates
 */
export const useDeleteTimetableEntry = (getToken?: () => Promise<string | null>) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteTimetableEntry(id, getToken),
    onMutate: async (id) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: timetableKeys.lists() });

      // Snapshot the previous value
      const previousEntries = queryClient.getQueryData(timetableKeys.list());

      // Optimistically update to remove the entry
      queryClient.setQueryData(
        timetableKeys.list(),
        (old: TimetableEntry[] | undefined) => 
          old?.filter((entry) => entry.id !== id)
      );

      return { previousEntries };
    },
    onError: (err, id, context) => {
      // Roll back optimistic update
      if (context?.previousEntries) {
        queryClient.setQueryData(timetableKeys.list(), context.previousEntries);
      }
      
      toast.error('Failed to delete timetable entry. Please try again.');
      console.error('Delete timetable entry error:', err);
    },
    onSuccess: (data, id) => {
      toast.success('Timetable entry deleted successfully!');
      
      // Remove from cache
      queryClient.removeQueries({ queryKey: timetableKeys.detail(id) });
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: timetableKeys.lists() });
    },
  });
};

// ========================================
// UTILITY HOOKS
// ========================================

/**
 * Hook to invalidate all timetable-related queries
 */
export const useInvalidateTimetableQueries = () => {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: timetableKeys.all }),
    invalidateLists: () => queryClient.invalidateQueries({ queryKey: timetableKeys.lists() }),
    invalidateDetails: () => queryClient.invalidateQueries({ queryKey: timetableKeys.details() }),
    invalidateEntry: (id: string) => 
      queryClient.invalidateQueries({ queryKey: timetableKeys.detail(id) }),
  };
};

/**
 * Hook to prefetch timetable data
 */
export const usePrefetchTimetable = (getToken?: () => Promise<string | null>) => {
  const queryClient = useQueryClient();

  return {
    prefetchEntry: (id: string) =>
      queryClient.prefetchQuery({
        queryKey: timetableKeys.detail(id),
        queryFn: () => getTimetableEntryById(id, getToken),
        staleTime: 1000 * 60 * 10,
      }),
    prefetchEntries: (filters?: TimetableEntryFilters) =>
      queryClient.prefetchQuery({
        queryKey: timetableKeys.list(filters),
        queryFn: () => fetchTimetableEntries(filters, getToken),
        staleTime: 1000 * 60 * 10,
      }),
  };
};

/**
 * Hook to get timetable entries by day of week
 */
export const useTimetableByDay = (
  dayOfWeek: string,
  getToken?: () => Promise<string | null>
) => {
  const { data: allEntries = [], ...rest } = useFetchTimetableEntries({
    semester_active: true,
  }, getToken);

  const entriesForDay = allEntries.filter(entry => 
    entry.days_of_week.includes(dayOfWeek.toLowerCase())
  );

  return {
    data: entriesForDay,
    ...rest,
  };
};

/**
 * Hook to get current day's timetable entries
 */
export const useTodaysTimetable = (getToken?: () => Promise<string | null>) => {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  return useTimetableByDay(today, getToken);
};

/**
 * Hook to get upcoming timetable entries for the week
 */
export const useWeeklyTimetable = (getToken?: () => Promise<string | null>) => {
  const { data: allEntries = [], ...rest } = useFetchTimetableEntries({
    semester_active: true,
  }, getToken);

  // Group entries by day of week
  const weeklySchedule = allEntries.reduce((acc, entry) => {
    entry.days_of_week.forEach(day => {
      if (!acc[day]) acc[day] = [];
      acc[day].push(entry);
    });
    return acc;
  }, {} as Record<string, TimetableEntry[]>);

  // Sort entries within each day by start time
  Object.keys(weeklySchedule).forEach(day => {
    weeklySchedule[day].sort((a, b) => {
      const timeA = a.start_time || '00:00';
      const timeB = b.start_time || '00:00';
      return timeA.localeCompare(timeB);
    });
  });

  return {
    data: weeklySchedule,
    ...rest,
  };
}; 