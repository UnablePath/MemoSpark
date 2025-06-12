import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import {
  fetchReminders,
  createReminder,
  updateReminder,
  deleteReminder,
  subscribeToReminders,
} from '@/lib/supabase/client';
import type { Reminder, ReminderInsert, ReminderUpdate, ReminderFilters } from '@/types/reminders';

export const useReminders = (filters?: ReminderFilters) => {
  const { getToken, userId } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadReminders = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const token = await getToken({ template: 'supabase-integration' });
      const data = await fetchReminders(filters, () => Promise.resolve(token));
      setReminders(data);
    } catch (e: any) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [userId, getToken, JSON.stringify(filters)]);

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  useEffect(() => {
    if (!userId) return;

    const handleUpdate = (payload: any) => {
      console.log('Real-time update received:', payload);
      loadReminders(); // Simple reload for now
    };
    
    const tokenProvider = async () => getToken({ template: 'supabase-integration' });
    const unsubscribe = subscribeToReminders(handleUpdate, tokenProvider);

    return () => {
      unsubscribe();
    };
  }, [userId, getToken, loadReminders]);

  const addReminder = async (reminderData: ReminderInsert) => {
    const token = await getToken({ template: 'supabase-integration' });
    const newReminder = await createReminder(reminderData, () => Promise.resolve(token));
    setReminders((prev) => [newReminder, ...prev]);
    return newReminder;
  };

  const editReminder = async (id: string, updates: ReminderUpdate) => {
    // Optimistic update
    const originalReminders = reminders;
    setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
    
    try {
      const token = await getToken({ template: 'supabase-integration' });
      const updated = await updateReminder(id, updates, () => Promise.resolve(token));
      // Replace with final data from server
      setReminders((prev) => prev.map((r) => (r.id === id ? updated : r)));
      return updated;
    } catch (e) {
      // Revert on error
      setReminders(originalReminders);
      throw e;
    }
  };

  const removeReminder = async (id: string) => {
    const token = await getToken({ template: 'supabase-integration' });
    await deleteReminder(id, () => Promise.resolve(token));
    setReminders((prev) => prev.filter((r) => r.id !== id));
  };

  return {
    reminders,
    loading,
    error,
    addReminder,
    editReminder,
    removeReminder,
    reload: loadReminders,
  };
}; 