import { createClient } from '@/lib/supabase/client';
import type { ScheduledTask, ScheduleMetadata } from '@/types/ai';

export class ScheduleManager {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  /**
   * Save a generated schedule to the database for tracking and learning
   */
  async saveSchedule(
    userId: string,
    schedule: ScheduledTask[],
    metadata: ScheduleMetadata
  ): Promise<void> {
    try {
      // Save each scheduled task
      const scheduledTasksData = schedule.map(task => ({
        user_id: userId,
        task_id: task.id,
        scheduled_start: task.startTime.toISOString(),
        scheduled_end: task.endTime.toISOString(),
        confidence_score: task.confidence,
        reasoning: task.reasoning,
        was_rescheduled: false
      }));

      const { error } = await this.supabase
        .from('scheduled_tasks')
        .insert(scheduledTasksData);

      if (error) {
        throw new Error(`Failed to save schedule: ${error.message}`);
      }

      console.log(`Successfully saved ${schedule.length} scheduled tasks`);
    } catch (error) {
      console.error('Error saving schedule:', error);
      throw error;
    }
  }

  /**
   * Update a scheduled task when it's actually started or completed
   */
  async updateTaskProgress(
    taskId: string,
    updates: {
      actualStart?: Date;
      actualEnd?: Date;
      wasRescheduled?: boolean;
      rescheduleReason?: string;
    }
  ): Promise<void> {
    try {
      const updateData: any = {};

      if (updates.actualStart) {
        updateData.actual_start = updates.actualStart.toISOString();
      }
      if (updates.actualEnd) {
        updateData.actual_end = updates.actualEnd.toISOString();
      }
      if (updates.wasRescheduled !== undefined) {
        updateData.was_rescheduled = updates.wasRescheduled;
      }
      if (updates.rescheduleReason) {
        updateData.reschedule_reason = updates.rescheduleReason;
      }

      updateData.updated_at = new Date().toISOString();

      const { error } = await this.supabase
        .from('scheduled_tasks')
        .update(updateData)
        .eq('task_id', taskId);

      if (error) {
        throw new Error(`Failed to update task progress: ${error.message}`);
      }
    } catch (error) {
      console.error('Error updating task progress:', error);
      throw error;
    }
  }

  /**
   * Get scheduling analytics for a user
   */
  async getSchedulingAnalytics(userId: string, days: number = 30): Promise<{
    totalScheduled: number;
    completedOnTime: number;
    averageActualVsScheduled: number;
    mostProductiveHours: number[];
    rescheduleRate: number;
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: scheduledTasks, error } = await this.supabase
        .from('scheduled_tasks')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString());

      if (error) {
        throw new Error(`Failed to fetch analytics: ${error.message}`);
      }

      if (!scheduledTasks || scheduledTasks.length === 0) {
        return {
          totalScheduled: 0,
          completedOnTime: 0,
          averageActualVsScheduled: 0,
          mostProductiveHours: [],
          rescheduleRate: 0
        };
      }

      const totalScheduled = scheduledTasks.length;
      const completedTasks = scheduledTasks.filter(task => task.actual_end);
      const rescheduledTasks = scheduledTasks.filter(task => task.was_rescheduled);

      // Calculate completion rate
      const completedOnTime = completedTasks.filter(task => {
        if (!task.actual_end || !task.scheduled_end) return false;
        const actualEnd = new Date(task.actual_end);
        const scheduledEnd = new Date(task.scheduled_end);
        // Consider "on time" if completed within 30 minutes of scheduled end
        return actualEnd.getTime() <= scheduledEnd.getTime() + (30 * 60 * 1000);
      }).length;

      // Calculate average actual vs scheduled duration
      const durationDifferences = completedTasks
        .filter((task: any) => task.actual_start && task.actual_end)
        .map((task: any) => {
          const actualDuration = new Date(task.actual_end!).getTime() - new Date(task.actual_start!).getTime();
          const scheduledDuration = new Date(task.scheduled_end).getTime() - new Date(task.scheduled_start).getTime();
          return actualDuration / scheduledDuration;
        });

      const averageActualVsScheduled = durationDifferences.length > 0
        ? durationDifferences.reduce((sum: number, ratio: number) => sum + ratio, 0) / durationDifferences.length
        : 1;

      // Find most productive hours
      const completionHours = completedTasks
        .filter((task: any) => task.actual_end)
        .map((task: any) => new Date(task.actual_end!).getHours());

      const hourCounts = completionHours.reduce((acc: Record<number, number>, hour: number) => {
        acc[hour] = (acc[hour] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);

      const mostProductiveHours = Object.keys(hourCounts)
        .map(Number)
        .sort((a, b) => hourCounts[b] - hourCounts[a])
        .slice(0, 3);

      const rescheduleRate = totalScheduled > 0 ? rescheduledTasks.length / totalScheduled : 0;

      return {
        totalScheduled,
        completedOnTime,
        averageActualVsScheduled,
        mostProductiveHours,
        rescheduleRate
      };
    } catch (error) {
      console.error('Error fetching scheduling analytics:', error);
      throw error;
    }
  }

  /**
   * Get recent scheduling patterns for learning
   */
  async getRecentPatterns(userId: string, limit: number = 50): Promise<{
    preferredStartTimes: number[];
    averageSessionLength: number;
    subjectPerformance: Record<string, { completed: number; total: number; avgConfidence: number }>;
  }> {
    try {
      const { data: recentTasks, error } = await this.supabase
        .from('scheduled_tasks')
        .select(`
          *,
          tasks!inner(subject, title)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to fetch recent patterns: ${error.message}`);
      }

      if (!recentTasks || recentTasks.length === 0) {
        return {
          preferredStartTimes: [],
          averageSessionLength: 0,
          subjectPerformance: {}
        };
      }

      // Analyze preferred start times
      const startTimes = recentTasks.map((task: any) => new Date(task.scheduled_start).getHours());
      const preferredStartTimes: number[] = [...new Set(startTimes)].sort();

      // Calculate average session length
      const sessionLengths = recentTasks.map((task: any) => {
        const start = new Date(task.scheduled_start);
        const end = new Date(task.scheduled_end);
        return (end.getTime() - start.getTime()) / (1000 * 60); // in minutes
      });

      const averageSessionLength = sessionLengths.reduce((sum: number, length: number) => sum + length, 0) / sessionLengths.length;

      // Analyze subject performance
      const subjectPerformance: Record<string, { completed: number; total: number; avgConfidence: number }> = {};

      recentTasks.forEach((task: any) => {
        const subject = task.tasks?.subject || 'Unknown';
        
        if (!subjectPerformance[subject]) {
          subjectPerformance[subject] = { completed: 0, total: 0, avgConfidence: 0 };
        }

        subjectPerformance[subject].total++;
        if (task.actual_end) {
          subjectPerformance[subject].completed++;
        }
        subjectPerformance[subject].avgConfidence += task.confidence_score || 0;
      });

      // Calculate average confidence for each subject
      Object.keys(subjectPerformance).forEach(subject => {
        const data = subjectPerformance[subject];
        data.avgConfidence = data.avgConfidence / data.total;
      });

      return {
        preferredStartTimes,
        averageSessionLength,
        subjectPerformance
      };
    } catch (error) {
      console.error('Error fetching recent patterns:', error);
      throw error;
    }
  }

  /**
   * Get current schedule for a user
   */
  async getCurrentSchedule(userId: string): Promise<{
    schedule: ScheduledTask[];
    metadata: ScheduleMetadata;
  } | null> {
    try {
      const today = new Date();
      const endOfWeek = new Date(today);
      endOfWeek.setDate(today.getDate() + 7);

      const { data: scheduledTasks, error } = await this.supabase
        .from('scheduled_tasks')
        .select('*')
        .eq('user_id', userId)
        .gte('scheduled_start', today.toISOString())
        .lte('scheduled_start', endOfWeek.toISOString())
        .order('scheduled_start', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch current schedule: ${error.message}`);
      }

      if (!scheduledTasks || scheduledTasks.length === 0) {
        return null;
      }

      const schedule: ScheduledTask[] = scheduledTasks.map(task => ({
        // ExtendedTask properties
        id: task.task_id,
        title: task.title || 'Scheduled Task',
        description: task.description || '',
        dueDate: task.due_date || new Date().toISOString(),
        priority: (task.priority as any) || 'medium',
        type: (task.type as any) || 'academic',
        subject: task.subject,
        completed: false,
        reminder: false,
        createdAt: task.created_at || new Date().toISOString(),
        updatedAt: task.updated_at || new Date().toISOString(),
        difficultyLevel: task.difficulty_level || 5,
        estimatedDuration: task.estimated_duration || 60,
        
        // ScheduledTask specific properties
        scheduledStart: task.scheduled_start,
        scheduledEnd: task.scheduled_end,
        startTime: new Date(task.scheduled_start),
        endTime: new Date(task.scheduled_end),
        confidence: task.confidence_score || 0.5,
        reasoning: task.reasoning || '',
        duration: task.estimated_duration || 60,
        taskId: task.task_id,
        estimatedDifficulty: task.difficulty_level || 5
      }));

      const metadata: ScheduleMetadata = {
        tasksScheduled: scheduledTasks.length,
        totalTasks: scheduledTasks.length,
        conflictsResolved: 0,
        averageConfidence: scheduledTasks.reduce((sum, task) => sum + (task.confidence_score || 0.5), 0) / scheduledTasks.length,
        scheduledTasks: scheduledTasks.length,
        conflicts: 0,
        efficiency: 0.8, // Default efficiency score
        confidence: scheduledTasks.reduce((sum, task) => sum + (task.confidence_score || 0.5), 0) / scheduledTasks.length,
        generatedAt: new Date().toISOString()
      };

      return { schedule, metadata };
    } catch (error) {
      console.error('Error fetching current schedule:', error);
      return null;
    }
  }

  /**
   * Get schedule history for a user
   */
  async getScheduleHistory(userId: string, days: number = 30): Promise<{
    schedules: Array<{
      date: string;
      schedule: ScheduledTask[];
      metadata: ScheduleMetadata;
    }>;
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: scheduledTasks, error } = await this.supabase
        .from('scheduled_tasks')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch schedule history: ${error.message}`);
      }

      if (!scheduledTasks || scheduledTasks.length === 0) {
        return { schedules: [] };
      }

      // Group by date
      const schedulesByDate: Record<string, any[]> = {};
      scheduledTasks.forEach(task => {
        const date = new Date(task.created_at).toISOString().split('T')[0];
        if (!schedulesByDate[date]) {
          schedulesByDate[date] = [];
        }
        schedulesByDate[date].push(task);
      });

      const schedules = Object.entries(schedulesByDate).map(([date, tasks]) => {
        const schedule: ScheduledTask[] = tasks.map(task => ({
          // ExtendedTask properties
          id: task.task_id,
          title: task.title || 'Scheduled Task',
          description: task.description || '',
          dueDate: task.due_date || new Date().toISOString(),
          priority: (task.priority as any) || 'medium',
          type: (task.type as any) || 'academic',
          subject: task.subject,
          completed: false,
          reminder: false,
          createdAt: task.created_at || new Date().toISOString(),
          updatedAt: task.updated_at || new Date().toISOString(),
          difficultyLevel: task.difficulty_level || 5,
          estimatedDuration: task.estimated_duration || 60,
          
          // ScheduledTask specific properties
          scheduledStart: task.scheduled_start,
          scheduledEnd: task.scheduled_end,
          startTime: new Date(task.scheduled_start),
          endTime: new Date(task.scheduled_end),
          confidence: task.confidence_score || 0.5,
          reasoning: task.reasoning || '',
          duration: task.estimated_duration || 60,
          taskId: task.task_id,
          estimatedDifficulty: task.difficulty_level || 5
        }));

        const metadata: ScheduleMetadata = {
          tasksScheduled: tasks.length,
          totalTasks: tasks.length,
          conflictsResolved: 0,
          averageConfidence: tasks.reduce((sum, task) => sum + (task.confidence_score || 0.5), 0) / tasks.length,
          scheduledTasks: tasks.length,
          conflicts: 0,
          efficiency: 0.8, // Default efficiency score
          confidence: tasks.reduce((sum, task) => sum + (task.confidence_score || 0.5), 0) / tasks.length,
          generatedAt: new Date(tasks[0]?.created_at || new Date()).toISOString()
        };

        return { date, schedule, metadata };
      });

      return { schedules };
    } catch (error) {
      console.error('Error fetching schedule history:', error);
      return { schedules: [] };
    }
  }

  /**
   * Clean up old scheduled tasks (older than 90 days)
   */
  async cleanupOldSchedules(userId: string): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90);

      const { error } = await this.supabase
        .from('scheduled_tasks')
        .delete()
        .eq('user_id', userId)
        .lt('created_at', cutoffDate.toISOString());

      if (error) {
        throw new Error(`Failed to cleanup old schedules: ${error.message}`);
      }

      console.log('Successfully cleaned up old scheduled tasks');
    } catch (error) {
      console.error('Error cleaning up old schedules:', error);
      throw error;
    }
  }
} 