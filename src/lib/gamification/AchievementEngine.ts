import { supabase } from '@/lib/supabase/client';
import { unlockAchievement, fetchAllAchievements } from '@/lib/supabase/achievementsApi';
import { fetchUserStats, updateUserStats } from '@/lib/supabase/gamificationApi';
import type { Achievement, UserAchievement, UserStats } from '@/types/achievements';
import { coinEconomy } from './CoinEconomy';

export interface AchievementCheckData {
  type: 'task_completion' | 'streak' | 'social' | 'wellness' | 'tutorial' | 'points_earned';
  userId: string;
  payload: {
    taskCount?: number;
    streakDays?: number;
    points?: number;
    socialAction?: string;
    wellnessAction?: string;
    tutorialStep?: string;
    [key: string]: any;
  };
}

export interface AchievementUnlockResult {
  success: boolean;
  achievement?: Achievement;
  isNew: boolean;
  message: string;
  pointsEarned?: number;
}

export class AchievementEngine {
  private achievements: Achievement[] = [];
  private initialized = false;

  /**
   * Initialize the achievement engine by loading all available achievements
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      this.achievements = await fetchAllAchievements();
      this.initialized = true;
      console.log(`AchievementEngine initialized with ${this.achievements.length} achievements`);
    } catch (error) {
      console.error('Failed to initialize AchievementEngine:', error);
      throw error;
    }
  }

  /**
   * Check and potentially unlock achievements based on user action
   */
  async checkAchievements(
    data: AchievementCheckData,
    getToken?: () => Promise<string | null>
  ): Promise<AchievementUnlockResult[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    const results: AchievementUnlockResult[] = [];
    const relevantAchievements = this.achievements.filter(
      achievement => achievement.type === data.type
    );

    for (const achievement of relevantAchievements) {
      try {
        const result = await this.evaluateAchievement(achievement, data, getToken);
        if (result) {
          results.push(result);
        }
      } catch (error) {
        console.error(`Error evaluating achievement ${achievement.id}:`, error);
      }
    }

    return results;
  }

  /**
   * Evaluate a specific achievement against user data
   */
  private async evaluateAchievement(
    achievement: Achievement,
    data: AchievementCheckData,
    getToken?: () => Promise<string | null>
  ): Promise<AchievementUnlockResult | null> {
    const userStats = await fetchUserStats(data.userId, getToken);
    
    // Check if user already has this achievement using API route
    try {
      const response = await fetch('/api/achievements');
      if (response.ok) {
        const result = await response.json();
        const existingAchievement = result.achievements?.find(
          (a: any) => a.id === achievement.id && a.unlocked
        );
        
        if (existingAchievement) {
          return {
            success: false,
            achievement,
            isNew: false,
            message: 'Achievement already unlocked'
          };
        }
      }
    } catch (error) {
      console.error('Error checking existing achievements:', error);
      // Continue with achievement evaluation even if check fails
    }

    // Evaluate achievement criteria
    const meetsRequirements = this.evaluateAchievementCriteria(
      achievement,
      data,
      userStats
    );

    if (meetsRequirements) {
      return await this.unlockAchievementForUser(achievement, data.userId, getToken);
    }

    return null;
  }

  /**
   * Evaluate if achievement criteria are met
   */
  private evaluateAchievementCriteria(
    achievement: Achievement,
    data: AchievementCheckData,
    userStats: UserStats | null
  ): boolean {
    const criteria = achievement.criteria;

    switch (achievement.type) {
      case 'task_completion':
        if (criteria.tasks && data.payload.taskCount !== undefined) {
          return data.payload.taskCount >= criteria.tasks;
        }
        break;

      case 'streak':
        if (criteria.days && userStats?.current_streak !== undefined) {
          return userStats.current_streak >= criteria.days;
        }
        break;

      case 'points_earned':
        if (criteria.points && userStats?.total_points !== undefined) {
          return userStats.total_points >= criteria.points;
        }
        break;

      case 'social':
        if (criteria.action && data.payload.socialAction) {
          return data.payload.socialAction === criteria.action;
        }
        break;

      case 'wellness':
        if (criteria.action && data.payload.wellnessAction) {
          return data.payload.wellnessAction === criteria.action;
        }
        break;

      case 'tutorial':
        if (criteria.step && data.payload.tutorialStep) {
          return data.payload.tutorialStep === criteria.step;
        }
        break;

      default:
        console.warn(`Unknown achievement type: ${achievement.type}`);
        return false;
    }

    return false;
  }

  /**
   * Unlock achievement for user and award points
   */
  private async unlockAchievementForUser(
    achievement: Achievement,
    userId: string,
    getToken?: () => Promise<string | null>
  ): Promise<AchievementUnlockResult> {
    try {
      // Unlock the achievement
      const userAchievement = await unlockAchievement({
        user_id: userId,
        achievement_id: achievement.id,
        progress: {}
      }, getToken);

      // Award points to user
      await this.awardPoints(userId, achievement.points_reward, getToken);

      return {
        success: true,
        achievement,
        isNew: true,
        message: `Congratulations! You've unlocked "${achievement.name}"`,
        pointsEarned: achievement.points_reward
      };
    } catch (error) {
      console.error('Failed to unlock achievement:', error);
      return {
        success: false,
        achievement,
        isNew: false,
        message: 'Failed to unlock achievement'
      };
    }
  }

  /**
   * Award points to user and update their stats
   */
  private async awardPoints(
    userId: string,
    points: number,
    getToken?: () => Promise<string | null>
  ): Promise<void> {
    try {
      const currentStats = await fetchUserStats(userId, getToken);
      const newTotalPoints = (currentStats?.total_points || 0) + points;
      const newLevel = this.calculateLevel(newTotalPoints);

      await updateUserStats(userId, {
        total_points: newTotalPoints,
        level: newLevel
      }, getToken);

      // Award coins for achievement unlock
      try {
        await coinEconomy.awardAchievementCoins(
          userId,
          'achievement-' + Date.now(), // temporary ID since we don't have achievement ID here
          points,
          'common', // default rarity
          getToken
        );
      } catch (coinError) {
        console.error('Failed to award achievement coins:', coinError);
        // Don't fail the achievement unlock if coin awarding fails
      }
    } catch (error) {
      console.error('Failed to award points:', error);
    }
  }

  /**
   * Calculate user level based on total points
   */
  private calculateLevel(totalPoints: number): number {
    // Level calculation: Every 1000 points = 1 level
    return Math.floor(totalPoints / 1000) + 1;
  }

  /**
   * Get achievement progress for a user
   */
  async getAchievementProgress(
    userId: string,
    achievementId: string,
    getToken?: () => Promise<string | null>
  ): Promise<{progress: number; maxProgress: number} | null> {
    if (!supabase) return null;

    try {
      const { data } = await supabase
        .from('user_achievements')
        .select('progress, max_progress')
        .eq('user_id', userId)
        .eq('achievement_id', achievementId)
        .single();

      return data ? {
        progress: data.progress || 0,
        maxProgress: data.max_progress || 100
      } : null;
    } catch (error) {
      console.error('Failed to get achievement progress:', error);
      return null;
    }
  }

  /**
   * Update achievement progress for a user
   */
  async updateAchievementProgress(
    userId: string,
    achievementId: string,
    progress: number,
    getToken?: () => Promise<string | null>
  ): Promise<void> {
    if (!supabase) return;

    try {
      await supabase
        .from('user_achievements')
        .update({ progress })
        .eq('user_id', userId)
        .eq('achievement_id', achievementId);
    } catch (error) {
      console.error('Failed to update achievement progress:', error);
    }
  }

  /**
   * Get all achievements with user progress
   */
  async getAchievementsWithProgress(
    userId: string,
    getToken?: () => Promise<string | null>
  ): Promise<(Achievement & { userProgress?: number; unlocked?: boolean })[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    // Use API route instead of direct Supabase access
    try {
      const response = await fetch('/api/achievements');
      if (response.ok) {
        const result = await response.json();
        // API already returns achievements with user progress
        return result.achievements || this.achievements;
      }
    } catch (error) {
      console.error('Failed to get achievements with progress via API:', error);
    }

    // Fallback to basic achievements without progress
    return this.achievements.map(achievement => ({
      ...achievement,
      userProgress: 0,
      unlocked: false
    }));
  }

  /**
   * Create a new achievement (admin function)
   */
  async createAchievement(achievementData: Omit<Achievement, 'id' | 'created_at'>): Promise<Achievement | null> {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('achievements')
        .insert(achievementData)
        .select()
        .single();

      if (error) throw error;

      // Refresh achievements cache
      this.achievements.push(data);
      
      return data;
    } catch (error) {
      console.error('Failed to create achievement:', error);
      return null;
    }
  }

  /**
   * Quick achievement check for common actions
   */
  async quickCheck(
    userId: string,
    action: 'task_completed' | 'streak_increased' | 'tutorial_completed' | 'social_interaction',
    value?: number,
    getToken?: () => Promise<string | null>
  ): Promise<AchievementUnlockResult[]> {
    const checkData: AchievementCheckData = {
      type: this.mapActionToType(action),
      userId,
      payload: {}
    };

    switch (action) {
      case 'task_completed':
        checkData.payload.taskCount = value || 1;
        break;
      case 'streak_increased':
        checkData.payload.streakDays = value || 1;
        break;
      case 'tutorial_completed':
        checkData.payload.tutorialStep = 'completion';
        break;
      case 'social_interaction':
        checkData.payload.socialAction = 'interaction';
        break;
    }

    return this.checkAchievements(checkData, getToken);
  }

  /**
   * Map action to achievement type
   */
  private mapActionToType(action: string): AchievementCheckData['type'] {
    switch (action) {
      case 'task_completed':
        return 'task_completion';
      case 'streak_increased':
        return 'streak';
      case 'tutorial_completed':
        return 'tutorial';
      case 'social_interaction':
        return 'social';
      default:
        return 'task_completion';
    }
  }
}

// Singleton instance
export const achievementEngine = new AchievementEngine(); 