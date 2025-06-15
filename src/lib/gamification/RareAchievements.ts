import { achievementEngine } from './AchievementEngine';
import { supabase } from '@/lib/supabase/client';
import type { Achievement } from '@/types/achievements';

// Rare achievement definitions
export const rareAchievements: Omit<Achievement, 'id' | 'created_at'>[] = [
  // Time-based achievements
  {
    name: 'Night Owl Scholar',
    description: 'Complete 5 tasks between 11 PM and 3 AM',
    icon: '🦉',
    type: 'task_completion',
    criteria: { 
      tasks: 5, 
      timeRange: { start: '23:00', end: '03:00' },
      special: 'night_owl'
    },
    points_reward: 200
  },
  {
    name: 'Early Bird Master',
    description: 'Complete 10 tasks before 6 AM',
    icon: '🌅',
    type: 'task_completion',
    criteria: { 
      tasks: 10, 
      timeRange: { start: '04:00', end: '06:00' },
      special: 'early_bird'
    },
    points_reward: 250
  },
  {
    name: 'Weekend Warrior',
    description: 'Complete 20 tasks during weekends',
    icon: '⚔️',
    type: 'task_completion',
    criteria: { 
      tasks: 20, 
      days: ['saturday', 'sunday'],
      special: 'weekend_warrior'
    },
    points_reward: 300
  },

  // Streak-based rare achievements
  {
    name: 'Streak Perfectionist',
    description: 'Maintain a 30-day perfect study streak',
    icon: '💎',
    type: 'streak',
    criteria: { 
      days: 30, 
      perfect: true,
      special: 'perfectionist'
    },
    points_reward: 500
  },
  {
    name: 'Century Club',
    description: 'Reach a 100-day study streak',
    icon: '💯',
    type: 'streak',
    criteria: { 
      days: 100,
      special: 'century'
    },
    points_reward: 1000
  },
  {
    name: 'Streak Recovery Master',
    description: 'Break and rebuild a streak 3 times, each time reaching 14+ days',
    icon: '🔄',
    type: 'streak',
    criteria: { 
      recoveries: 3, 
      minDays: 14,
      special: 'recovery_master'
    },
    points_reward: 400
  },

  // Social achievements
  {
    name: 'Study Mentor',
    description: 'Help 10 different students complete their tasks',
    icon: '👨‍🏫',
    type: 'social',
    criteria: { 
      helpedUsers: 10,
      action: 'mentor',
      special: 'mentor'
    },
    points_reward: 350
  },
  {
    name: 'Community Builder',
    description: 'Create 3 study groups with 5+ active members each',
    icon: '🏗️',
    type: 'social',
    criteria: { 
      studyGroups: 3, 
      minMembers: 5,
      special: 'community_builder'
    },
    points_reward: 450
  },
  {
    name: 'Motivational Speaker',
    description: 'Receive 100+ positive reactions on crashout posts',
    icon: '🎤',
    type: 'social',
    criteria: { 
      positiveReactions: 100,
      special: 'motivational_speaker'
    },
    points_reward: 300
  },

  // Wellness achievements
  {
    name: 'Zen Master',
    description: 'Use stress relief features 50 times in a month',
    icon: '🧘',
    type: 'wellness',
    criteria: { 
      stressReliefSessions: 50, 
      timeframe: 'month',
      special: 'zen_master'
    },
    points_reward: 275
  },
  {
    name: 'Balance Keeper',
    description: 'Maintain healthy study-break ratio for 2 weeks',
    icon: '⚖️',
    type: 'wellness',
    criteria: { 
      balanceRatio: 0.8, 
      duration: 14,
      special: 'balance_keeper'
    },
    points_reward: 200
  },
  {
    name: 'Stress Buster',
    description: 'Complete 100 ragdoll stress game sessions',
    icon: '🎯',
    type: 'wellness',
    criteria: { 
      ragdollSessions: 100,
      special: 'stress_buster'
    },
    points_reward: 225
  },

  // Points and achievement-based
  {
    name: 'Point Millionaire',
    description: 'Accumulate 1,000,000 total points',
    icon: '💰',
    type: 'points_earned',
    criteria: { 
      points: 1000000,
      special: 'millionaire'
    },
    points_reward: 10000
  },
  {
    name: 'Achievement Hunter',
    description: 'Unlock 50 different achievements',
    icon: '🏆',
    type: 'task_completion',
    criteria: { 
      achievements: 50,
      special: 'achievement_hunter'
    },
    points_reward: 750
  },
  {
    name: 'Speed Demon',
    description: 'Complete 10 tasks in under 1 hour',
    icon: '⚡',
    type: 'task_completion',
    criteria: { 
      tasks: 10, 
      timeLimit: 3600, // 1 hour in seconds
      special: 'speed_demon'
    },
    points_reward: 400
  },

  // Special event achievements
  {
    name: 'Holiday Scholar',
    description: 'Study during 5 major holidays',
    icon: '🎄',
    type: 'task_completion',
    criteria: { 
      holidays: 5,
      special: 'holiday_scholar'
    },
    points_reward: 350
  },
  {
    name: 'New Year Commitment',
    description: 'Complete first task of the year within first 24 hours',
    icon: '🎊',
    type: 'task_completion',
    criteria: { 
      newYear: true, 
      timeframe: '24h',
      special: 'new_year_commitment'
    },
    points_reward: 500
  },
  {
    name: 'Birthday Dedication',
    description: 'Study on your birthday',
    icon: '🎂',
    type: 'task_completion',
    criteria: { 
      birthday: true,
      special: 'birthday_dedication'
    },
    points_reward: 300
  },

  // Multi-category achievements
  {
    name: 'Renaissance Scholar',
    description: 'Complete tasks in 10 different subject categories',
    icon: '🎨',
    type: 'task_completion',
    criteria: { 
      categories: 10,
      special: 'renaissance_scholar'
    },
    points_reward: 400
  },
  {
    name: 'Study Olympian',
    description: 'Achieve gold level in 5 different metrics (streak, points, social, wellness, efficiency)',
    icon: '🥇',
    type: 'task_completion',
    criteria: { 
      goldLevels: 5,
      metrics: ['streak', 'points', 'social', 'wellness', 'efficiency'],
      special: 'study_olympian'
    },
    points_reward: 1500
  }
];

// Special achievement evaluator for complex criteria
export class RareAchievementEngine {
  /**
   * Initialize rare achievements in the database
   */
  static async initializeRareAchievements(): Promise<void> {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return;
    }

    try {
      // Check which achievements already exist
      const { data: existingAchievements } = await supabase
        .from('achievements')
        .select('name')
        .in('name', rareAchievements.map(a => a.name));

      const existingNames = existingAchievements?.map(a => a.name) || [];
      const newAchievements = rareAchievements.filter(a => !existingNames.includes(a.name));

      if (newAchievements.length > 0) {
        const { error } = await supabase
          .from('achievements')
          .insert(newAchievements);

        if (error) throw error;
        console.log(`Initialized ${newAchievements.length} rare achievements`);
      }
    } catch (error) {
      console.error('Failed to initialize rare achievements:', error);
    }
  }

  /**
   * Check for rare achievement unlocks based on complex criteria
   */
  static async checkRareAchievements(
    userId: string,
    actionData: {
      type: string;
      timestamp?: Date;
      metadata?: Record<string, any>;
    },
    getToken?: () => Promise<string | null>
  ): Promise<void> {
    if (!supabase) return;

    try {
      // Get user's task completion history, stats, etc.
      const [userStats, userTasks, userAchievements] = await Promise.all([
        supabase.from('user_stats').select('*').eq('user_id', userId).single(),
        supabase.from('tasks').select('*').eq('user_id', userId),
        supabase.from('user_achievements').select('*').eq('user_id', userId)
      ]);

      // Check each rare achievement
      for (const achievement of rareAchievements) {
        try {
          const shouldUnlock = await this.evaluateRareAchievement(
            achievement,
            userId,
            actionData,
            {
              userStats: userStats.data,
              userTasks: userTasks.data || [],
              userAchievements: userAchievements.data || []
            }
          );

          if (shouldUnlock) {
            await achievementEngine.createAchievement(achievement);
          }
        } catch (error) {
          console.error(`Failed to evaluate rare achievement ${achievement.name}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to check rare achievements:', error);
    }
  }

  /**
   * Evaluate specific rare achievement criteria
   */
  private static async evaluateRareAchievement(
    achievement: Omit<Achievement, 'id' | 'created_at'>,
    userId: string,
    actionData: any,
    userData: {
      userStats: any;
      userTasks: any[];
      userAchievements: any[];
    }
  ): Promise<boolean> {
    const { criteria } = achievement;
    const { userStats, userTasks, userAchievements } = userData;

    // Check if user already has this achievement
    if (userAchievements.some(ua => ua.achievement_id === achievement.name)) {
      return false;
    }

    switch (criteria.special) {
      case 'night_owl':
        return this.checkTimeBasedAchievement(userTasks, criteria);
      
      case 'early_bird':
        return this.checkTimeBasedAchievement(userTasks, criteria);
      
      case 'weekend_warrior':
        return this.checkWeekendAchievement(userTasks, criteria);
      
      case 'perfectionist':
        return this.checkPerfectStreakAchievement(userStats, criteria);
      
      case 'century':
        return userStats?.current_streak >= criteria.days;
      
      case 'millionaire':
        return userStats?.total_points >= criteria.points;
      
      case 'achievement_hunter':
        return userAchievements.length >= criteria.achievements;
      
      case 'speed_demon':
        return this.checkSpeedAchievement(userTasks, criteria, actionData);
      
      case 'renaissance_scholar':
        return this.checkCategoryDiversityAchievement(userTasks, criteria);
      
      default:
        return false;
    }
  }

  private static checkTimeBasedAchievement(userTasks: any[], criteria: any): boolean {
    const { timeRange, tasks: requiredTasks } = criteria;
    const [startHour] = timeRange.start.split(':').map(Number);
    const [endHour] = timeRange.end.split(':').map(Number);

    const qualifyingTasks = userTasks.filter(task => {
      if (!task.completed_at) return false;
      
      const completionTime = new Date(task.completed_at);
      const hour = completionTime.getHours();
      
      if (startHour > endHour) {
        // Crosses midnight
        return hour >= startHour || hour <= endHour;
      } else {
        return hour >= startHour && hour <= endHour;
      }
    });

    return qualifyingTasks.length >= requiredTasks;
  }

  private static checkWeekendAchievement(userTasks: any[], criteria: any): boolean {
    const weekendTasks = userTasks.filter(task => {
      if (!task.completed_at) return false;
      
      const completionTime = new Date(task.completed_at);
      const dayOfWeek = completionTime.getDay(); // 0 = Sunday, 6 = Saturday
      
      return dayOfWeek === 0 || dayOfWeek === 6;
    });

    return weekendTasks.length >= criteria.tasks;
  }

  private static checkPerfectStreakAchievement(userStats: any, criteria: any): boolean {
    // This would require additional tracking of "perfect" days
    // For now, use current streak as approximation
    return userStats?.current_streak >= criteria.days;
  }

  private static checkSpeedAchievement(userTasks: any[], criteria: any, actionData: any): boolean {
    if (actionData.type !== 'task_completed') return false;

    // Get tasks completed in the last hour
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - criteria.timeLimit * 1000);

    const recentTasks = userTasks.filter(task => {
      if (!task.completed_at) return false;
      const completionTime = new Date(task.completed_at);
      return completionTime >= oneHourAgo && completionTime <= now;
    });

    return recentTasks.length >= criteria.tasks;
  }

  private static checkCategoryDiversityAchievement(userTasks: any[], criteria: any): boolean {
    const categories = new Set(userTasks.map(task => task.category).filter(Boolean));
    return categories.size >= criteria.categories;
  }
}

// Auto-initialize rare achievements
RareAchievementEngine.initializeRareAchievements();