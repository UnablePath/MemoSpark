import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import type { Reminder, ReminderCreateInput, ReminderUpdate, ReminderFilters } from '@/types/reminders';

export const useReminders = (filters?: ReminderFilters) => {
  const { getToken, userId } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadReminders = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const response = await fetch('/api/reminders');
      if (!response.ok) {
        throw new Error(`Failed to fetch reminders: ${response.statusText}`);
      }
      const data = await response.json();
      if (data.success) {
        setReminders(data.reminders || []);
      } else {
        throw new Error(data.error || 'Failed to fetch reminders');
      }
    } catch (e: any) {
      setError(e);
      console.error('Error loading reminders:', e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  // Real-time updates removed for now - using direct API calls for reliability

  const addReminder = async (reminderData: ReminderCreateInput) => {
    try {
      const response = await fetch('/api/reminders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reminderData),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create reminder: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.success) {
        const newReminder = data.reminder;
        setReminders((prev) => [newReminder, ...prev]);
        return newReminder;
      } else {
        throw new Error(data.error || 'Failed to create reminder');
      }
    } catch (error) {
      console.error('Error creating reminder:', error);
      throw error;
    }
  };

  const editReminder = async (id: string, updates: ReminderUpdate) => {
    // Optimistic update
    const originalReminders = reminders;
    setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
    
    try {
      const response = await fetch('/api/reminders', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, ...updates }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update reminder: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.success) {
        const updated = data.reminder;
        // Replace with final data from server
        setReminders((prev) => prev.map((r) => (r.id === id ? updated : r)));
        return updated;
      } else {
        throw new Error(data.error || 'Failed to update reminder');
      }
    } catch (e) {
      // Revert on error
      console.error('Error updating reminder:', e);
      setReminders(originalReminders);
      throw e;
    }
  };

  const removeReminder = async (id: string) => {
    try {
      const response = await fetch(`/api/reminders?id=${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete reminder: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.success) {
        setReminders((prev) => prev.filter((r) => r.id !== id));
      } else {
        throw new Error(data.error || 'Failed to delete reminder');
      }
    } catch (error) {
      console.error('Error deleting reminder:', error);
      throw error;
    }
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