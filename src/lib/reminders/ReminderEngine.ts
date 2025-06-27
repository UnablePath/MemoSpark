import { taskReminderService } from '@/lib/notifications/TaskReminderService';
import { createServiceRoleClient, supabase } from '@/lib/supabase/client';
import { StuCelebration, type CelebrationType } from '@/lib/stu/StuCelebration';

interface Task {
  id: string;
  title: string;
  due_date: string;
  user_id: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  type?: string;
  reminder_offset_minutes?: number;
  is_completed?: boolean;
  subject?: string;
  difficulty?: number;
  description?: string;
}

interface UserPattern {
  userId: string;
  preferredStudyTimes: string[];
  averageTaskDuration: number;
  completionRate: number;
  procrastinationTendency: number;
  stressLevel: number;
  preferredReminderFrequency: 'minimal' | 'normal' | 'frequent';
  quietHours: { start: string; end: string };
  timezone: string;
}

interface SmartReminderConfig {
  baseOffsetMinutes: number;
  adaptiveMultiplier: number;
  urgencyBoost: number;
  difficultyBoost: number;
  procrastinationCompensation: number;
  stuAnimationType: 'gentle' | 'encouraging' | 'urgent';
}

interface ReminderAnalytics {
  userId: string;
  taskId: string;
  reminderType: 'scheduled' | 'snooze' | 'overdue' | 'smart';
  sentAt: Date;
  scheduledFor: Date;
  userResponse: 'ignored' | 'snoozed' | 'completed' | 'rescheduled';
  responseTime: number;
  effectiveness: number;
}

interface AnalyticsData {
  user_response: string;
  response_time_minutes: number;
  effectiveness_score: number;
}

export class ReminderEngine {
  private static instance: ReminderEngine;
  private stuCelebration: StuCelebration;
  private supabaseService: any;
  private fallbackClient: any;
  
  constructor() {
    // Only initialize StuCelebration on client side
    if (typeof window !== 'undefined') {
      this.stuCelebration = StuCelebration.getInstance();
    } else {
      // Server-side mock for StuCelebration
      this.stuCelebration = {
        // Properties
        isPlaying: false,
        currentCelebration: null,
        celebrationQueue: [],
        audioContext: null,

        // Public methods
        celebrate: async () => Promise.resolve(),
        stopCelebration: () => { },
        getCurrentCelebration: () => null,
        isCurrentlyPlaying: () => false,
        achievementUnlocked: async () => Promise.resolve(),
        streakMilestone: async () => Promise.resolve(),
        coinsEarned: async () => Promise.resolve(),
        levelUp: async () => Promise.resolve(),
        taskCompleted: async () => Promise.resolve(),
        firstTimeAchievement: async () => Promise.resolve(),
        initializeCelebrations: async () => Promise.resolve(),

        // Private methods (needed for type compatibility)
        getCelebrationMessage: () => '',
        getCelebrationConfig: () => ({
          type: 'task_completed' as CelebrationType,
          message: '',
          duration: 0,
          intensity: 'low' as const
        }),
        playSoundEffect: async () => Promise.resolve(),
        playAchievementSound: async () => Promise.resolve(),
        playLevelUpSound: async () => Promise.resolve(),
        playStreakSound: async () => Promise.resolve(),
        playCoinSound: async () => Promise.resolve(),
        playTaskCompleteSound: async () => Promise.resolve(),
        playEpicSound: async () => Promise.resolve(),
        playFirstTimeSound: async () => Promise.resolve(),
        playDefaultSound: async () => Promise.resolve(),
        playTone: () => { },
        playCelebration: async () => Promise.resolve(),
        initAudioContext: () => { }
      } as unknown as StuCelebration;
    }
    
    // Try service role client first, fallback to regular client
    this.supabaseService = createServiceRoleClient();
    this.fallbackClient = supabase;
    
    if (!this.supabaseService) {
      console.warn('⚠️ Service role client not available. Using regular client with limited permissions.');
      console.warn('📋 To fix: Add SUPABASE_SERVICE_ROLE_KEY to your .env.local file');
      console.warn('🔑 Get the key from: https://supabase.com/dashboard/project/onfnehxkglmvrorcvqcx/settings/api');
    }
  }

  static getInstance(): ReminderEngine {
    if (!ReminderEngine.instance) {
      ReminderEngine.instance = new ReminderEngine();
    }
    return ReminderEngine.instance;
  }

  /**
   * Get the appropriate Supabase client (service role or fallback)
   */
  private getClient() {
    return this.supabaseService || this.fallbackClient;
  }

  /**
   * Create a regular reminder entry for a task that will show up in the RemindersTab
   */
  async createTaskReminder(task: Task): Promise<boolean> {
    try {
      console.log(`📝 Creating reminder entry for task: "${task.title}"`);

      const dueDate = new Date(task.due_date);
      
      // Use API route instead of direct database access to avoid RLS issues
      try {
        const reminderData = {
          title: task.title,
          description: task.description || `Task reminder: ${task.title}`,
          due_date: dueDate.toISOString(),
          reminder_time: new Date(dueDate.getTime() - ((task.reminder_offset_minutes || 15) * 60 * 1000)).toISOString(),
          priority: task.priority === 'urgent' ? 'high' : (task.priority || 'medium'),
        };

        const response = await fetch('/api/reminders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(reminderData),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.warn('⚠️ API reminder creation failed:', errorData.error || response.statusText);
          
          // Fallback to direct database approach
          return await this.createTaskReminderDirect(task);
        }

        const data = await response.json();
        if (data.success) {
          console.log('✅ Task reminder created successfully via API');
          return true;
        } else {
          console.warn('⚠️ API reminder creation failed:', data.error);
          
          // Fallback to direct database approach
          return await this.createTaskReminderDirect(task);
        }
      } catch (apiError) {
        console.warn('⚠️ API call failed, trying direct database approach:', apiError);
        
        // Fallback to direct database approach
        return await this.createTaskReminderDirect(task);
      }
    } catch (error) {
      console.warn('⚠️ Error creating task reminder entry, continuing with notifications-only approach:', error);
      return true; // Don't fail the entire flow - notifications can still work
    }
  }

  /**
   * Fallback method for direct database access (may fail due to RLS)
   */
  private async createTaskReminderDirect(task: Task): Promise<boolean> {
    try {
      const client = this.getClient();
      if (!client) {
        console.warn('⚠️ No Supabase client available - using notifications-only approach');
        return true; // Don't fail the entire flow
      }

      const dueDate = new Date(task.due_date);
      
      // Try to create reminder in the reminders table so it shows up in RemindersTab
      const { error } = await client
        .from('reminders')
        .insert([{
          user_id: task.user_id,
          task_id: task.id,
          title: task.title,
          description: `Task reminder: ${task.title}`,
          due_date: dueDate.toISOString(),
          priority: task.priority || 'medium',
          completed: false,
          points: this.calculatePoints(task.priority || 'medium')
        }]);

      if (error) {
        console.warn('⚠️ Database reminder entry failed (RLS permissions), continuing with notifications-only approach:', error.message);
        return true; // Don't fail - we'll use notifications-only approach
      }

      console.log('✅ Task reminder created successfully via direct database access');
      return true;
    } catch (dbError) {
      console.warn('⚠️ Database reminder entry failed (RLS permissions), continuing with notifications-only approach:', dbError);
      return true; // Don't fail - we'll use notifications-only approach
    }
  }

  /**
   * AI-optimized reminder scheduling based on user patterns and task characteristics
   */
  async scheduleSmartReminder(task: Task, userPattern?: UserPattern, clerkUserId?: string): Promise<boolean> {
    try {
      console.log(`🧠 AI-scheduling smart reminder for task: "${task.title}"`);

      // Get the current Clerk user ID (needed for new reminder tables)
      const currentUserId = clerkUserId || await this.getCurrentClerkUserId();
      if (!currentUserId) {
        console.warn('⚠️ No Clerk user ID available - using task.user_id fallback');
        // Fallback to task user_id, but this might not work with new tables
      }

      // First, ensure the task has a regular reminder entry
      await this.createTaskReminder(task);

      // Get user patterns if not provided (use Clerk user ID if available)
      if (!userPattern) {
        userPattern = await this.getUserPattern(currentUserId || task.user_id);
      }

      // Calculate smart reminder timing
      const config = this.calculateSmartConfig(task, userPattern);
      
      // Create multiple adaptive reminders based on task importance and user patterns
      const reminderOffsets = this.generateAdaptiveReminderSequence(task, userPattern, config);
      
      console.log(`📊 Generated ${reminderOffsets.length} adaptive reminders:`, reminderOffsets);

      // Schedule each reminder with Stu mascot animations
      const results = await Promise.all(
        reminderOffsets.map(async (offset, index) => {
          const taskWithOffset = { 
            ...task, 
            reminder_offset_minutes: offset.minutes 
          };
          
          // Add Stu animation context to the reminder
          // Create task with Clerk user ID for notifications
          const taskForNotification = {
            ...taskWithOffset,
            user_id: currentUserId || task.user_id // Use Clerk ID for notifications
          };
          
          const success = await this.scheduleReminderWithStu(
            taskForNotification, 
            offset.stuAnimation,
            offset.message,
            index === reminderOffsets.length - 1 // Is final reminder
          );

          // Track analytics (only if we have proper permissions)
          if (success && this.supabaseService && currentUserId) {
            try {
              await this.trackReminderAnalytics({
                userId: currentUserId, // Use Clerk user ID for analytics
                taskId: task.id,
                reminderType: 'smart',
                sentAt: new Date(),
                scheduledFor: new Date(new Date(task.due_date).getTime() - (offset.minutes * 60 * 1000)),
                userResponse: 'ignored', // Will be updated when user responds
                responseTime: 0,
                effectiveness: 0
              });
            } catch (analyticsError) {
              console.warn('⚠️ Analytics tracking failed:', analyticsError);
            }
          }

          return success;
        })
      );

      const successCount = results.filter(r => r).length;
      console.log(`✅ Successfully scheduled ${successCount}/${results.length} smart reminders`);

      return successCount > 0;
    } catch (error) {
      console.error('❌ Error scheduling smart reminder:', error);
      return false;
    }
  }

  /**
   * Handle snooze action from notification
   */
  async snoozeReminder(taskId: string, userId: string, snoozeMinutes: number = 15): Promise<boolean> {
    try {
      console.log(`😴 Snoozing reminder for task ${taskId} by ${snoozeMinutes} minutes`);

      const client = this.getClient();
      if (!client) {
        console.error('❌ No Supabase client available');
        return false;
      }
      
      const { data: task, error } = await client
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .eq('user_id', userId)
        .single();

      if (error || !task) {
        console.error('Task not found for snooze:', error);
        return false;
      }

      // Create new reminder at snoozed time
      const snoozeTime = new Date(Date.now() + (snoozeMinutes * 60 * 1000));
      const taskForSnooze = {
        ...task,
        reminder_offset_minutes: 0 // Send immediately when snooze time arrives
      };

      // Schedule the snoozed reminder with encouraging Stu animation
      const success = await this.scheduleReminderWithStu(
        taskForSnooze,
        'encouraging',
        `🔔 Snooze time's up! Ready to tackle "${task.title}"?`,
        false
      );

      // Track snooze analytics (only if we have service role permissions)
      if (this.supabaseService) {
        try {
          await this.trackReminderAnalytics({
            userId,
            taskId,
            reminderType: 'snooze',
            sentAt: new Date(),
            scheduledFor: snoozeTime,
            userResponse: 'snoozed',
            responseTime: 0,
            effectiveness: 5 // Neutral effectiveness for snooze
          });
        } catch (analyticsError) {
          console.warn('⚠️ Analytics tracking failed:', analyticsError);
        }
      }

      // Show Stu animation for snooze confirmation
      if (success) {
        await this.stuCelebration.celebrate(
          'task_completed',
          undefined,
          `Got it! I'll remind you about "${task.title}" in ${snoozeMinutes} minutes.`
        );
      }

      return success;
    } catch (error) {
      console.error('Error snoozing reminder:', error);
      return false;
    }
  }

  /**
   * Handle task completion from notification
   */
  async completeTaskFromReminder(taskId: string, userId: string): Promise<boolean> {
    try {
      console.log(`✅ Completing task ${taskId} from reminder`);

      const client = this.getClient();
      if (!client) {
        console.error('❌ No Supabase client available');
        return false;
      }

      // Update task as completed
      const { error } = await client
        .from('tasks')
        .update({ 
          completed: true,
          completed_at: new Date().toISOString()
        })
        .eq('id', taskId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error completing task:', error);
        return false;
      }

      // Track completion analytics (only if we have service role permissions)
      if (this.supabaseService) {
        try {
          await this.trackReminderAnalytics({
            userId,
            taskId,
            reminderType: 'scheduled',
            sentAt: new Date(),
            scheduledFor: new Date(),
            userResponse: 'completed',
            responseTime: 0,
            effectiveness: 10 // High effectiveness for completion
          });
        } catch (analyticsError) {
          console.warn('⚠️ Analytics tracking failed:', analyticsError);
        }
      }

      // Trigger Stu celebration
      await this.stuCelebration.celebrate(
        'task_completed',
        undefined,
        'Awesome! Another task conquered! 🎉'
      );

      return true;
    } catch (error) {
      console.error('Error completing task from reminder:', error);
      return false;
    }
  }

  /**
   * Generate adaptive reminder sequence based on AI analysis
   */
  private generateAdaptiveReminderSequence(
    task: Task, 
    userPattern: UserPattern, 
    config: SmartReminderConfig
  ): Array<{ minutes: number; stuAnimation: string; message: string }> {
    const reminders: Array<{ minutes: number; stuAnimation: string; message: string }> = [];
    
    // Calculate time until due date
    const dueDate = new Date(task.due_date);
    const now = new Date();
    const timeUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60); // minutes
    
    console.log(`⏰ Time until due: ${timeUntilDue} minutes (${Math.round(timeUntilDue / 60 * 10) / 10} hours)`);
    
    // Enhanced logic for same-day reminders with more granular timeframes
    let baseReminders: number[] = [];
    
    if (timeUntilDue > 2 * 24 * 60) { // More than 2 days
      baseReminders = [1440, 240, 30]; // 1 day, 4 hours, 30 minutes
    } else if (timeUntilDue > 24 * 60) { // More than 1 day
      baseReminders = [480, 120, 15]; // 8 hours, 2 hours, 15 minutes
    } else if (timeUntilDue > 4 * 60) { // More than 4 hours (same-day long)
      baseReminders = [120, 30, 10]; // 2 hours, 30 minutes, 10 minutes
    } else if (timeUntilDue > 2 * 60) { // More than 2 hours (same-day medium)
      baseReminders = [60, 15, 5]; // 1 hour, 15 minutes, 5 minutes
    } else if (timeUntilDue > 30) { // More than 30 minutes (same-day short)
      baseReminders = [15, 5]; // 15 minutes, 5 minutes
    } else if (timeUntilDue > 10) { // More than 10 minutes (same-day urgent)
      baseReminders = [5, 2]; // 5 minutes, 2 minutes
    } else if (timeUntilDue > 3) { // More than 3 minutes (immediate)
      baseReminders = [2]; // 2 minutes only
    } else if (timeUntilDue > 1) { // Very urgent (1-3 minutes)
      baseReminders = [1]; // 1 minute only
    } else {
      // Less than 1 minute - send immediate notification
      console.log('⚡ Task due in less than 1 minute - triggering immediate notification');
      reminders.push({
        minutes: 0.1, // Immediate (6 seconds)
        stuAnimation: 'urgent',
        message: `🚨 URGENT: "${task.title}" is due RIGHT NOW!`
      });
      return reminders;
    }

    // Apply priority adjustments for same-day reminders
    const priorityAdjustment = {
      low: -2,     // 2 minutes earlier for same-day
      medium: 0,   // No change
      high: 2,     // 2 minutes later (more advance notice)
      urgent: 5    // 5 minutes later (even more advance notice)
    }[task.priority || 'medium'];

    baseReminders.forEach((minutes, index) => {
      // Apply smaller adjustments for same-day reminders
      let adjustedMinutes = minutes + priorityAdjustment;
      
      // More flexible bounds for same-day reminders
      adjustedMinutes = Math.max(0.5, Math.min(adjustedMinutes, timeUntilDue - 1));

      // Skip if reminder would be in the past or too close to due date
      if (adjustedMinutes >= timeUntilDue || adjustedMinutes < 0.5) {
        console.log(`⚠️ Skipping reminder ${adjustedMinutes} minutes (would be invalid for ${timeUntilDue} minutes until due)`);
        return;
      }

      // Determine Stu animation and message based on urgency and timeframe
      let stuAnimation = 'idle';
      let message = '';

      // Enhanced messaging for same-day reminders
      const isUrgent = timeUntilDue < 60; // Less than 1 hour
      const isVeryUrgent = timeUntilDue < 30; // Less than 30 minutes

      if (index === 0) { // First reminder (furthest out)
        stuAnimation = isUrgent ? 'encouraging' : 'gentle';
        if (isVeryUrgent) {
          message = `⏰ "${task.title}" is due in ${Math.round(timeUntilDue)} minutes! Time to get started!`;
        } else if (isUrgent) {
          message = `📅 "${task.title}" is due within the hour. Ready to tackle it?`;
        } else {
          message = `📅 Heads up! "${task.title}" is due later today. You've got this!`;
        }
      } else if (index === 1) { // Second reminder
        stuAnimation = isVeryUrgent ? 'urgent' : 'encouraging';
        if (isVeryUrgent) {
          message = `🔔 Final notice! "${task.title}" is due in ${Math.round(timeUntilDue)} minutes!`;
        } else {
          message = `⏰ "${task.title}" is due soon. Time to focus!`;
        }
      } else { // Final reminder
        stuAnimation = 'urgent';
        if (isVeryUrgent) {
          message = `🚨 LAST CALL! "${task.title}" is due in just ${Math.round(timeUntilDue)} minutes!`;
        } else {
          message = `🚨 Last call! "${task.title}" is due very soon!`;
        }
      }

      console.log(`✅ Adding same-day reminder: ${adjustedMinutes} minutes before due (${Math.round(timeUntilDue - adjustedMinutes)} minutes from now)`);
      
      reminders.push({
        minutes: adjustedMinutes,
        stuAnimation,
        message
      });
    });

    // Enhanced fallback for same-day reminders
    if (reminders.length === 0 && timeUntilDue > 1) {
      let fallbackMinutes;
      let fallbackMessage;
      let fallbackAnimation;

      if (timeUntilDue > 60) { // More than 1 hour
        fallbackMinutes = Math.max(5, Math.min(30, Math.floor(timeUntilDue / 3)));
        fallbackAnimation = 'encouraging';
        fallbackMessage = `⏰ Don't forget: "${task.title}" is due today!`;
      } else if (timeUntilDue > 15) { // 15-60 minutes
        fallbackMinutes = Math.max(2, Math.min(10, Math.floor(timeUntilDue / 2)));
        fallbackAnimation = 'encouraging';
        fallbackMessage = `⏰ "${task.title}" is due in ${Math.round(timeUntilDue)} minutes!`;
      } else { // Less than 15 minutes
        fallbackMinutes = Math.max(1, Math.floor(timeUntilDue / 2));
        fallbackAnimation = 'urgent';
        fallbackMessage = `🚨 "${task.title}" is due in ${Math.round(timeUntilDue)} minutes!`;
      }

      console.log(`🔄 Adding fallback same-day reminder: ${fallbackMinutes} minutes before due`);
      
      reminders.push({
        minutes: fallbackMinutes,
        stuAnimation: fallbackAnimation,
        message: fallbackMessage
      });
    }

    return reminders;
  }

  /**
   * Calculate smart configuration based on task and user patterns
   */
  private calculateSmartConfig(task: Task, userPattern: UserPattern): SmartReminderConfig {
    return {
      baseOffsetMinutes: 30,
      adaptiveMultiplier: userPattern.completionRate < 0.7 ? 1.5 : 1.0,
      urgencyBoost: task.priority === 'urgent' ? 2 : 1,
      difficultyBoost: (task.difficulty || 5) > 7 ? 1.5 : 1.0,
      procrastinationCompensation: userPattern.procrastinationTendency,
      stuAnimationType: userPattern.stressLevel > 7 ? 'gentle' : 'encouraging'
    };
  }

  /**
   * Get or create user pattern data
   */
  private async getUserPattern(userId: string): Promise<UserPattern> {
    try {
      const client = this.getClient();
      if (!client) {
        console.warn('⚠️ No Supabase client available for user patterns - using defaults');
        return this.getDefaultUserPattern(userId);
      }
      
      try {
        const { data, error } = await client
          .from('user_reminder_patterns')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (error || !data) {
          console.log('📋 No user pattern found or RLS permissions issue - using defaults');
          return this.getDefaultUserPattern(userId);
        }

        return {
          userId: data.user_id,
          preferredStudyTimes: data.preferred_study_times || ['09:00', '14:00', '20:00'],
          averageTaskDuration: data.average_task_duration || 60,
          completionRate: data.completion_rate || 0.8,
          procrastinationTendency: data.procrastination_tendency || 0.3,
          stressLevel: data.stress_level || 5,
          preferredReminderFrequency: data.preferred_reminder_frequency || 'normal',
          quietHours: data.quiet_hours || { start: '22:00', end: '08:00' },
          timezone: data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
        };
      } catch (dbError) {
        console.warn('⚠️ Database access failed for user patterns (RLS permissions) - using defaults:', dbError);
        return this.getDefaultUserPattern(userId);
      }
    } catch (error) {
      console.warn('⚠️ Error getting user pattern - using defaults:', error);
      return this.getDefaultUserPattern(userId);
    }
  }

  /**
   * Get default user pattern for new users or when data is unavailable
   */
  private getDefaultUserPattern(userId: string): UserPattern {
    return {
      userId,
      preferredStudyTimes: ['09:00', '14:00', '20:00'],
      averageTaskDuration: 60,
      completionRate: 0.8,
      procrastinationTendency: 0.3,
      stressLevel: 5,
      preferredReminderFrequency: 'normal',
      quietHours: { start: '22:00', end: '08:00' },
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }

  /**
   * Track reminder analytics for AI improvement
   */
  private async trackReminderAnalytics(analytics: ReminderAnalytics): Promise<void> {
    try {
      // Only track analytics if we have service role permissions
      if (!this.supabaseService) {
        console.log('📊 Analytics tracking skipped (service role required)');
        return;
      }
      
      const { error } = await this.supabaseService
        .from('reminder_analytics')
        .insert([{
          user_id: analytics.userId,
          task_id: analytics.taskId,
          reminder_type: analytics.reminderType,
          sent_at: analytics.sentAt.toISOString(),
          scheduled_for: analytics.scheduledFor.toISOString(),
          user_response: analytics.userResponse,
          response_time_minutes: analytics.responseTime,
          effectiveness_score: analytics.effectiveness
        }]);

      if (error) {
        console.error('Error tracking reminder analytics:', error);
      }
    } catch (error) {
      console.error('Error tracking reminder analytics:', error);
    }
  }

  /**
   * Get reminder effectiveness statistics for AI learning
   */
  async getReminderStats(userId: string): Promise<{
    totalReminders: number;
    completionRate: number;
    averageResponseTime: number;
    effectivenessScore: number;
    snoozeRate: number;
  }> {
    try {
      // Only get stats if we have service role permissions
      if (!this.supabaseService) {
        console.log('📊 Stats unavailable (service role required)');
        return this.getDefaultStats();
      }
      
      const { data, error } = await this.supabaseService
        .from('reminder_analytics')
        .select('*')
        .eq('user_id', userId)
        .gte('sent_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days

      if (error || !data || data.length === 0) {
        return this.getDefaultStats();
      }

      const totalReminders = data.length;
      const completions = data.filter((r: AnalyticsData) => r.user_response === 'completed').length;
      const snoozes = data.filter((r: AnalyticsData) => r.user_response === 'snoozed').length;
      const averageResponseTime = data.reduce((sum: number, r: AnalyticsData) => sum + (r.response_time_minutes || 0), 0) / totalReminders;
      const effectivenessScore = data.reduce((sum: number, r: AnalyticsData) => sum + (r.effectiveness_score || 0), 0) / totalReminders;

      return {
        totalReminders,
        completionRate: completions / totalReminders,
        averageResponseTime,
        effectivenessScore,
        snoozeRate: snoozes / totalReminders
      };
    } catch (error) {
      console.error('Error getting reminder stats:', error);
      return this.getDefaultStats();
    }
  }

  /**
   * Get default stats when data is unavailable
   */
  private getDefaultStats() {
    return {
      totalReminders: 0,
      completionRate: 0,
      averageResponseTime: 0,
      effectivenessScore: 0,
      snoozeRate: 0
    };
  }

  /**
   * Calculate points based on task priority
   */
  private calculatePoints(priority: string): number {
    const pointMap = {
      low: 5,
      medium: 10,
      high: 15,
      urgent: 20
    };
    return pointMap[priority as keyof typeof pointMap] || 10;
  }

  /**
   * Schedule a reminder with Stu mascot integration
   */
  private async scheduleReminderWithStu(
    task: Task, 
    stuAnimation: string, 
    message: string, 
    isFinalReminder: boolean
  ): Promise<boolean> {
    try {
      console.log(`📱 Scheduling reminder with Stu: ${message}`);

      // Calculate reminder time
      const dueDate = new Date(task.due_date);
      const reminderTime = new Date(dueDate.getTime() - (task.reminder_offset_minutes || 15) * 60 * 1000);
      const now = new Date();

      // Use the same direct API approach as test reminders
      try {
        if (reminderTime <= now) {
          // Send immediate notification using direct API (same as test reminders)
          console.log(`⚡ Sending immediate notification via API`);
          
          const response = await fetch('/api/notifications/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: task.user_id,
              notification: {
                contents: { en: message },
                headings: { en: '📋 Task Reminder' },
                data: {
                  type: 'smart_reminder',
                  taskId: task.id,
                  taskTitle: task.title,
                  stuAnimation: stuAnimation,
                  url: '/dashboard'
                },
                url: '/dashboard',
                priority: isFinalReminder ? 8 : 5
              }
            })
          });

          const result = await response.json();
          if (response.ok && result.success) {
            console.log('✅ Immediate notification sent via API:', result.oneSignalId);
            return true;
          } else {
            console.warn('⚠️ Immediate notification failed:', result.error);
          }
        } else {
          // Schedule future notification using direct API (same as test reminders)
          console.log(`📅 Scheduling notification via API for: ${reminderTime.toISOString()}`);
          
          const response = await fetch('/api/notifications/schedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: task.user_id,
              notification: {
                contents: { en: message },
                headings: { en: '📋 Task Reminder' },
                data: {
                  type: 'smart_reminder',
                  taskId: task.id,
                  taskTitle: task.title,
                  stuAnimation: stuAnimation,
                  url: '/dashboard'
                },
                url: '/dashboard',
                priority: isFinalReminder ? 8 : 5
              },
              deliveryTime: reminderTime.toISOString()
            })
          });

          const result = await response.json();
          if (response.ok && result.success) {
            console.log('✅ Notification scheduled via API:', result.oneSignalId);
            return true;
          } else {
            console.warn('⚠️ Scheduled notification failed:', result.error);
          }
        }
      } catch (apiError) {
        console.error('❌ Direct API notification failed:', apiError);
      }

      // Final fallback to TaskReminderService (original approach)
      try {
        console.log('🔄 Falling back to TaskReminderService...');
        await taskReminderService.scheduleTaskReminder(task);
        console.log('✅ Fallback notification scheduled successfully');
        return true;
      } catch (fallbackError) {
        console.error('❌ All notification methods failed:', fallbackError);
        return false;
      }
    } catch (error) {
      console.error('❌ Error in scheduleReminderWithStu:', error);
      return false;
    }
  }

  /**
   * Get current Clerk user ID from auth context
   */
  private async getCurrentClerkUserId(): Promise<string | null> {
    try {
      // In a client-side context, we'd use Clerk's useUser hook
      // In a server context, we'd use auth() from @clerk/nextjs/server
      // For now, return null and let the caller handle it
      // This method should be called with the clerkUserId parameter instead
      return null;
    } catch (error) {
      console.warn('⚠️ Could not get current Clerk user ID:', error);
      return null;
    }
  }
}

// Export singleton instance
export const reminderEngine = ReminderEngine.getInstance(); 