import { supabase } from '@/lib/supabase/client';
import { AchievementEngine } from './AchievementEngine';
import { coinEconomy, CoinEarningResult, CoinSpendingResult } from './CoinEconomy';
import type { UserStats } from '@/types/achievements';

export interface DailyStreak {
  id: string;
  user_id: string;
  date: string; // ISO date string
  completed: boolean;
  tasks_completed: number;
  points_earned: number;
  completion_time?: string;
  created_at: string;
  updated_at: string;
}

export interface StreakMilestone {
  id: string;
  user_id: string;
  streak_length: number;
  achieved_at: string;
  milestone_type: 'weekly' | 'monthly' | 'milestone' | 'personal_best';
  rewarded: boolean;
  points_awarded: number;
  created_at: string;
}

export interface StreakRecovery {
  id: string;
  user_id: string;
  original_streak: number;
  recovery_date: string;
  recovery_type: 'freeze' | 'extend' | 'bonus_day';
  cost_coins: number;
  success: boolean;
  used_at?: string;
  expires_at?: string;
  created_at: string;
}

export interface StreakShare {
  id: string;
  user_id: string;
  streak_length: number;
  message?: string;
  platform: 'internal' | 'twitter' | 'facebook' | 'instagram';
  shared_at: string;
  likes: number;
  created_at: string;
}

export interface StreakPrediction {
  id: string;
  user_id: string;
  prediction_date: string;
  predicted_completion_probability: number;
  factors?: Record<string, any>;
  actual_completion?: boolean;
  accuracy?: number;
  created_at: string;
}

export interface StreakAnalytics {
  current_streak: number;
  longest_streak: number;
  total_days: number;
  completion_rate: number;
  average_streak_length: number;
  best_day_of_week: string;
  worst_day_of_week: string;
  recent_trends: 'improving' | 'declining' | 'stable';
  next_milestone: number;
  days_to_milestone: number;
}

export interface StreakRecoveryOption {
  type: 'freeze' | 'extend' | 'bonus_day';
  name: string;
  description: string;
  cost: number;
  icon: string;
  available: boolean;
}

export class StreakTracker {
  private achievementEngine: AchievementEngine;

  constructor() {
    this.achievementEngine = new AchievementEngine();
  }

  /**
   * Mark today as completed and update streak
   */
  async markDailyCompletion(
    userId: string,
    tasksCompleted: number = 1,
    pointsEarned: number = 10,
    date?: Date,
    getToken?: () => Promise<string | null>
  ): Promise<{ 
    success: boolean; 
    newStreak: number; 
    achievementsUnlocked: any[];
    coinRewards?: {
      dailyBonus: CoinEarningResult;
      milestoneBonus: CoinEarningResult;
      streakPenalty?: CoinSpendingResult;
    };
  }> {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    try {
      const targetDate = date || new Date();
      const dateStr = targetDate.toISOString().split('T')[0];

      // Get previous streak data for comparison (before marking completion)
      const previousStreakData = await this.getCurrentStreak(userId, getToken);
      const previousStreak = previousStreakData.current_streak;

      // Call the database function to mark completion
      const { data, error } = await supabase.rpc('mark_daily_completion', {
        p_user_id: userId,
        p_date: dateStr,
        p_tasks_completed: tasksCompleted,
        p_points_earned: pointsEarned
      });

      if (error) {
        console.error('Error marking daily completion:', error);
        throw error;
      }

      // Get updated streak information
      const streakData = await this.getCurrentStreak(userId, getToken);
      const newStreak = streakData.current_streak;
      
      // Initialize coin rewards tracking
      const coinRewards = {
        dailyBonus: { success: true, amount: 0, newBalance: 0 } as CoinEarningResult,
        milestoneBonus: { success: true, amount: 0, newBalance: 0 } as CoinEarningResult,
        streakPenalty: undefined as CoinSpendingResult | undefined
      };

      // Detect streak loss and apply penalty
      if (newStreak < previousStreak && previousStreak >= 14) {
        try {
          const penaltyResult = await coinEconomy.penalizeStreakLoss(userId, previousStreak, getToken);
          coinRewards.streakPenalty = penaltyResult;
          
          if (penaltyResult.success && penaltyResult.amount > 0) {
            console.log(`🚨 Applied streak loss penalty: ${penaltyResult.amount} coins for losing ${previousStreak}-day streak`);
          }
        } catch (error) {
          console.error('Error applying streak penalty:', error);
        }
      }

      // Award daily streak bonus coins (for streaks 7+)
      try {
        const dailyBonusResult = await coinEconomy.awardStreakBonus(userId, newStreak, getToken);
        coinRewards.dailyBonus = dailyBonusResult;
        
        if (dailyBonusResult.success && dailyBonusResult.amount > 0) {
          console.log(`🔥 Awarded daily streak bonus: ${dailyBonusResult.amount} coins for ${newStreak}-day streak`);
        }
      } catch (error) {
        console.error('Error awarding daily streak bonus:', error);
      }

      // Award milestone bonus (for specific milestones: 7, 14, 30, 60, etc.)
      try {
        const milestoneBonusResult = await coinEconomy.awardStreakMilestoneBonus(userId, newStreak, getToken);
        coinRewards.milestoneBonus = milestoneBonusResult;
        
        if (milestoneBonusResult.success && milestoneBonusResult.amount > 0) {
          console.log(`🎉 Awarded milestone bonus: ${milestoneBonusResult.amount} coins for ${newStreak}-day milestone!`);
        }
      } catch (error) {
        console.error('Error awarding milestone bonus:', error);
      }
      
      // Check for streak achievements
      const achievementsUnlocked = await this.achievementEngine.checkAchievements({
        type: 'streak',
        userId,
        payload: { streakDays: newStreak }
      }, getToken);

      return {
        success: data,
        newStreak: newStreak,
        achievementsUnlocked,
        coinRewards
      };
    } catch (error) {
      console.error('Error in markDailyCompletion:', error);
      throw error;
    }
  }

  /**
   * Get current streak information for user
   */
  async getCurrentStreak(
    userId: string,
    getToken?: () => Promise<string | null>
  ): Promise<UserStats> {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    try {
      const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching streak:', error);
        throw error;
      }

      // Return default stats if no record exists
      return data || {
        user_id: userId,
        total_points: 0,
        current_streak: 0,
        longest_streak: 0,
        level: 1,
        updated_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error in getCurrentStreak:', error);
      throw error;
    }
  }

  /**
   * Get streak analytics for user
   */
  async getStreakAnalytics(
    userId: string,
    getToken?: () => Promise<string | null>
  ): Promise<StreakAnalytics> {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return this.getDefaultStreakAnalytics();
    }

    try {
      // Try to fetch daily streaks data
      const { data: dailyStreaks, error: streaksError } = await supabase
        .from('daily_streaks')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(90);

      if (streaksError) {
        console.error('Error fetching daily streaks:', streaksError);
        // If table doesn't exist, return default analytics
        if (streaksError.code === '42P01') {
          console.warn('daily_streaks table does not exist, returning default analytics');
          return this.getDefaultStreakAnalytics();
        }
        throw streaksError;
      }

      // Calculate analytics from the data
      const analytics = this.calculateAnalyticsFromData(dailyStreaks || []);
      return analytics;

    } catch (error) {
      console.error('Error in getStreakAnalytics:', error);
      // Return default analytics instead of throwing
      return this.getDefaultStreakAnalytics();
    }
  }

  /**
   * Get default streak analytics when database is unavailable
   */
  private getDefaultStreakAnalytics(): StreakAnalytics {
    return {
      current_streak: 0,
      longest_streak: 0,
      total_days: 0,
      completion_rate: 0,
      average_streak_length: 0,
      best_day_of_week: 'monday',
      worst_day_of_week: 'monday',
      recent_trends: 'stable',
      next_milestone: 7,
      days_to_milestone: 7
    };
  }

  /**
   * Calculate analytics from daily streaks data
   */
  private calculateAnalyticsFromData(dailyStreaks: any[]): StreakAnalytics {
    if (!dailyStreaks || dailyStreaks.length === 0) {
      return this.getDefaultStreakAnalytics();
    }

    // Sort by date descending to ensure we start from the most recent
    const sortedStreaks = [...dailyStreaks].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    // Calculate current streak - check for consecutive completed days working backwards from today
    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time for accurate date comparison
    
    // Start from today and work backwards
    let checkDate = new Date(today);
    let foundToday = false;
    
    for (let dayOffset = 0; dayOffset <= sortedStreaks.length + 1; dayOffset++) {
      const checkDateStr = checkDate.toISOString().split('T')[0];
      
      // Find streak record for this date
      const dayStreak = sortedStreaks.find(s => s.date === checkDateStr);
      
      if (dayStreak) {
        if (dayStreak.completed) {
          currentStreak++;
          foundToday = true;
        } else {
          // Found incomplete day - streak is broken
          break;
        }
      } else {
        // No record for this date
        if (foundToday) {
          // We've started counting and hit a gap - streak is broken
          break;
        }
        // If we haven't found today yet, this might be because user hasn't completed today
        // Continue checking previous days
      }
      
      // Move to previous day
      checkDate.setDate(checkDate.getDate() - 1);
      
      // Safety check to prevent infinite loops
      if (dayOffset > 365) break;
    }

    // Calculate longest streak by checking all consecutive sequences
    let longestStreak = 0;
    let currentSequenceLength = 0;
    
    // Sort by date ascending for longest streak calculation
    const ascendingStreaks = [...sortedStreaks].reverse();
    let previousDate: Date | null = null;
    
    for (const streak of ascendingStreaks) {
      const currentDate = new Date(streak.date);
      currentDate.setHours(0, 0, 0, 0);
      
      if (streak.completed) {
        if (previousDate === null) {
          // First completed day in sequence
          currentSequenceLength = 1;
        } else {
          // Check if this continues the previous streak (exactly 1 day difference)
          const daysDiff = Math.floor((currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysDiff === 1) {
            // Consecutive day
            currentSequenceLength++;
          } else if (daysDiff > 1) {
            // Gap found, end current sequence and start new one
            longestStreak = Math.max(longestStreak, currentSequenceLength);
            currentSequenceLength = 1;
          }
          // If daysDiff < 1, it means duplicate dates - skip this record
        }
        previousDate = new Date(currentDate);
        longestStreak = Math.max(longestStreak, currentSequenceLength);
      } else {
        // Incomplete day breaks the sequence
        longestStreak = Math.max(longestStreak, currentSequenceLength);
        currentSequenceLength = 0;
        previousDate = null;
      }
    }
    
    // Final check to ensure we capture the last sequence
    longestStreak = Math.max(longestStreak, currentSequenceLength);

    // Calculate other metrics
    const totalDays = dailyStreaks.filter(s => s.completed).length;
    const completionRate = dailyStreaks.length > 0 ? totalDays / dailyStreaks.length : 0;
    
    // Calculate average streak length by finding all streak sequences
    let totalStreakDays = 0;
    let streakCount = 0;
    let tempSequence = 0;
    let prevDate: Date | null = null;
    
    for (const streak of ascendingStreaks) {
      const currentDate = new Date(streak.date);
      currentDate.setHours(0, 0, 0, 0);
      
      if (streak.completed) {
        if (prevDate === null) {
          tempSequence = 1;
        } else {
          const daysDiff = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysDiff === 1) {
            tempSequence++;
          } else if (daysDiff > 1) {
            // End of sequence due to gap
            if (tempSequence > 0) {
              totalStreakDays += tempSequence;
              streakCount++;
            }
            tempSequence = 1;
          }
          // Skip duplicate dates (daysDiff < 1)
        }
        prevDate = new Date(currentDate);
      } else {
        // End of sequence due to incomplete day
        if (tempSequence > 0) {
          totalStreakDays += tempSequence;
          streakCount++;
        }
        tempSequence = 0;
        prevDate = null;
      }
    }
    
    // Don't forget the last sequence
    if (tempSequence > 0) {
      totalStreakDays += tempSequence;
      streakCount++;
    }
    
    const averageStreakLength = streakCount > 0 ? totalStreakDays / streakCount : 0;

    // Calculate day of week performance
    const dayOfWeekStats = this.calculateDayOfWeekStats(dailyStreaks || []);
    
    // Determine trend
    const recentTrend = this.calculateRecentTrend(dailyStreaks || []);

    // Calculate next milestone
    const nextMilestone = this.getNextMilestone(currentStreak);

    return {
      current_streak: currentStreak,
      longest_streak: longestStreak,
      total_days: totalDays,
      completion_rate: Math.round(completionRate * 100) / 100,
      average_streak_length: Math.round(averageStreakLength * 10) / 10,
      best_day_of_week: dayOfWeekStats.best,
      worst_day_of_week: dayOfWeekStats.worst,
      recent_trends: recentTrend,
      next_milestone: nextMilestone,
      days_to_milestone: nextMilestone - currentStreak
    };
  }

  /**
   * Calculate day of week statistics
   */
  private calculateDayOfWeekStats(dailyStreaks: DailyStreak[]): { best: string; worst: string } {
    const dayStats: Record<string, { completed: number; total: number }> = {};
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    dailyStreaks.forEach(streak => {
      const dayOfWeek = dayNames[new Date(streak.date).getDay()];
      if (!dayStats[dayOfWeek]) {
        dayStats[dayOfWeek] = { completed: 0, total: 0 };
      }
      dayStats[dayOfWeek].total++;
      if (streak.completed) {
        dayStats[dayOfWeek].completed++;
      }
    });

    let bestDay = 'monday';
    let worstDay = 'monday';
    let bestRate = 0;
    let worstRate = 1;

    Object.entries(dayStats).forEach(([day, stats]) => {
      if (stats.total > 0) {
        const rate = stats.completed / stats.total;
        if (rate > bestRate) {
          bestRate = rate;
          bestDay = day;
        }
        if (rate < worstRate) {
          worstRate = rate;
          worstDay = day;
        }
      }
    });

    return { best: bestDay, worst: worstDay };
  }

  /**
   * Calculate recent trend
   */
  private calculateRecentTrend(dailyStreaks: DailyStreak[]): 'improving' | 'declining' | 'stable' {
    if (dailyStreaks.length < 14) return 'stable';

    const recent = dailyStreaks.slice(0, 7);
    const previous = dailyStreaks.slice(7, 14);

    const recentRate = recent.filter(d => d.completed).length / recent.length;
    const previousRate = previous.filter(d => d.completed).length / previous.length;

    const difference = recentRate - previousRate;

    if (difference > 0.1) return 'improving';
    if (difference < -0.1) return 'declining';
    return 'stable';
  }

  /**
   * Get the next milestone for a given streak
   */
  private getNextMilestone(currentStreak: number): number {
    const milestones = [7, 14, 21, 30, 50, 75, 100, 150, 200, 365, 500, 1000];
    return milestones.find(milestone => milestone > currentStreak) || currentStreak + 100;
  }

  /**
   * Get available streak recovery options
   */
  async getRecoveryOptions(
    userId: string,
    getToken?: () => Promise<string | null>
  ): Promise<StreakRecoveryOption[]> {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    try {
      // Get user's current coins
      const userStats = await this.getCurrentStreak(userId, getToken);
      const userCoins = userStats.total_points || 0; // Assuming coins are tracked in user_stats

      const options: StreakRecoveryOption[] = [
        {
          type: 'freeze',
          name: 'Streak Freeze',
          description: 'Freeze your streak for one missed day',
          cost: 50,
          icon: '🧊',
          available: userCoins >= 50
        },
        {
          type: 'extend',
          name: 'Streak Extend',
          description: 'Extend your streak deadline by 12 hours',
          cost: 100,
          icon: '⏰',
          available: userCoins >= 100
        },
        {
          type: 'bonus_day',
          name: 'Bonus Day',
          description: 'Add a bonus completion day to your streak',
          cost: 75,
          icon: '✨',
          available: userCoins >= 75
        }
      ];

      return options;
    } catch (error) {
      console.error('Error in getRecoveryOptions:', error);
      throw error;
    }
  }

  /**
   * Use a streak recovery option
   */
  async useRecovery(
    userId: string,
    recoveryType: 'freeze' | 'extend' | 'bonus_day',
    targetDate?: Date,
    getToken?: () => Promise<string | null>
  ): Promise<{ success: boolean; message: string; newStreak: number }> {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    try {
      const recoveryDate = targetDate || new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
      const dateStr = recoveryDate.toISOString().split('T')[0];

      const { data, error } = await supabase.rpc('use_streak_recovery', {
        p_user_id: userId,
        p_recovery_type: recoveryType,
        p_target_date: dateStr
      });

      if (error) {
        console.error('Error using recovery:', error);
        throw error;
      }

      const newStreakData = await this.getCurrentStreak(userId, getToken);

      return {
        success: data,
        message: data 
          ? `Successfully used ${recoveryType} recovery!` 
          : 'Insufficient coins or recovery failed',
        newStreak: newStreakData.current_streak
      };
    } catch (error) {
      console.error('Error in useRecovery:', error);
      throw error;
    }
  }

  /**
   * Share streak on social media or internally
   */
  async shareStreak(
    userId: string,
    platform: 'internal' | 'twitter' | 'facebook' | 'instagram',
    message?: string,
    getToken?: () => Promise<string | null>
  ): Promise<{ success: boolean; shareId?: string }> {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    try {
      const userStats = await this.getCurrentStreak(userId, getToken);

      const { data, error } = await supabase
        .from('streak_shares')
        .insert({
          user_id: userId,
          streak_length: userStats.current_streak,
          message: message || `I'm on a ${userStats.current_streak}-day streak! 🔥`,
          platform
        })
        .select()
        .single();

      if (error) {
        console.error('Error sharing streak:', error);
        throw error;
      }

      // Check for social achievement
      await this.achievementEngine.checkAchievements({
        type: 'social',
        userId,
        payload: { socialAction: 'streak_share' }
      }, getToken);

      return {
        success: true,
        shareId: data.id
      };
    } catch (error) {
      console.error('Error in shareStreak:', error);
      throw error;
    }
  }

  /**
   * Get streak milestones achieved by user
   */
  async getStreakMilestones(
    userId: string,
    getToken?: () => Promise<string | null>
  ): Promise<StreakMilestone[]> {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    try {
      const { data, error } = await supabase
        .from('streak_milestones')
        .select('*')
        .eq('user_id', userId)
        .order('achieved_at', { ascending: false });

      if (error) {
        console.error('Error fetching milestones:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getStreakMilestones:', error);
      throw error;
    }
  }

  /**
   * Predict streak completion probability
   */
  async predictStreakCompletion(
    userId: string,
    getToken?: () => Promise<string | null>
  ): Promise<{ probability: number; factors: Record<string, any> }> {
    try {
      // Get recent completion data
      const analytics = await this.getStreakAnalytics(userId, getToken);
      
      // Simple prediction based on completion rate and recent trends
      let baseProbability = analytics.completion_rate;
      
      // Adjust based on recent trends
      switch (analytics.recent_trends) {
        case 'improving':
          baseProbability = Math.min(1, baseProbability + 0.1);
          break;
        case 'declining':
          baseProbability = Math.max(0, baseProbability - 0.1);
          break;
        default:
          // stable, no adjustment
          break;
      }

      // Adjust based on current streak length (longer streaks are harder to maintain)
      if (analytics.current_streak > 30) {
        baseProbability = Math.max(0, baseProbability - 0.05);
      }

      const factors = {
        completion_rate: analytics.completion_rate,
        recent_trends: analytics.recent_trends,
        current_streak: analytics.current_streak,
        day_of_week: new Date().toLocaleDateString('en', { weekday: 'long' }).toLowerCase()
      };

      return {
        probability: Math.round(baseProbability * 100) / 100,
        factors
      };
    } catch (error) {
      console.error('Error in predictStreakCompletion:', error);
      throw error;
    }
  }

  /**
   * Get streak leaderboard with privacy controls
   */
  async getStreakLeaderboard(
    limit: number = 10,
    includeCurrentUser: boolean = true,
    currentUserId?: string,
    getToken?: () => Promise<string | null>
  ): Promise<Array<{
    user_id: string;
    username: string;
    current_streak: number;
    longest_streak: number;
    total_points: number;
    rank: number;
    is_current_user: boolean;
    profile_visible: boolean;
  }>> {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    try {
      // Query for leaderboard data with privacy controls
      const { data, error } = await supabase.rpc('get_streak_leaderboard', {
        limit_count: limit,
        requesting_user_id: currentUserId || null
      });

      if (error) {
        console.error('Error fetching streak leaderboard:', error);
        // If RPC doesn't exist, fall back to basic query
        return this.getBasicStreakLeaderboard(limit, currentUserId, includeCurrentUser);
      }

      // Add ranking and current user flag
      const leaderboard = (data || []).map((entry: any, index: number) => ({
        ...entry,
        rank: index + 1,
        is_current_user: currentUserId ? entry.user_id === currentUserId : false
      }));

      return leaderboard;
    } catch (error) {
      console.error('Error in getStreakLeaderboard:', error);
      // Fallback to basic implementation
      return this.getBasicStreakLeaderboard(limit, currentUserId, includeCurrentUser);
    }
  }

  /**
   * Basic streak leaderboard fallback
   */
  private async getBasicStreakLeaderboard(
    limit: number = 10,
    currentUserId?: string,
    includeCurrentUser: boolean = true
  ): Promise<Array<{
    user_id: string;
    username: string;
    current_streak: number;
    longest_streak: number;
    total_points: number;
    rank: number;
    is_current_user: boolean;
    profile_visible: boolean;
  }>> {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    try {
      // Get user stats with basic privacy (only visible profiles)
      const { data: userStats, error } = await supabase
        .from('user_stats')
        .select(`
          user_id,
          current_streak,
          longest_streak,
          total_points,
          profiles!inner(
            full_name,
            streak_visibility
          )
        `)
        .eq('profiles.streak_visibility', true)
        .order('current_streak', { ascending: false })
        .order('longest_streak', { ascending: false })
        .order('total_points', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error in basicStreakLeaderboard:', error);
        return [];
      }

      // Transform data and add rankings
      const leaderboard = (userStats || []).map((stat: any, index: number) => ({
        user_id: stat.user_id,
        username: stat.profiles?.full_name || 'Anonymous',
        current_streak: stat.current_streak || 0,
        longest_streak: stat.longest_streak || 0,
        total_points: stat.total_points || 0,
        rank: index + 1,
        is_current_user: currentUserId ? stat.user_id === currentUserId : false,
        profile_visible: true
      }));

      // If current user is not in top results but should be included
      if (includeCurrentUser && currentUserId && !leaderboard.some(u => u.user_id === currentUserId)) {
                 const { data: currentUserStats } = await supabase
           .from('user_stats')
           .select(`
             user_id,
             current_streak,
             longest_streak,
             total_points,
             profiles(full_name)
           `)
           .eq('user_id', currentUserId)
           .single();

        if (currentUserStats) {
          // Calculate current user's rank
          const { count } = await supabase
            .from('user_stats')
            .select('*', { count: 'exact', head: true })
            .gt('current_streak', currentUserStats.current_streak);

                     leaderboard.push({
             user_id: currentUserStats.user_id,
             username: (currentUserStats.profiles as any)?.full_name || 'You',
             current_streak: currentUserStats.current_streak || 0,
             longest_streak: currentUserStats.longest_streak || 0,
             total_points: currentUserStats.total_points || 0,
             rank: (count || 0) + 1,
             is_current_user: true,
             profile_visible: true
           });
        }
      }

      return leaderboard;
    } catch (error) {
      console.error('Error in getBasicStreakLeaderboard:', error);
      return [];
    }
  }

  /**
   * Update user's streak visibility preference
   */
  async updateStreakVisibility(
    userId: string,
    isVisible: boolean,
    getToken?: () => Promise<string | null>
  ): Promise<{ success: boolean; message: string }> {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ streak_visibility: isVisible })
        .eq('clerk_user_id', userId);

      if (error) {
        console.error('Error updating streak visibility:', error);
        throw error;
      }

      return {
        success: true,
        message: isVisible 
          ? 'Your streaks are now visible on the leaderboard'
          : 'Your streaks are now hidden from the leaderboard'
      };
    } catch (error) {
      console.error('Error in updateStreakVisibility:', error);
      return {
        success: false,
        message: 'Failed to update privacy settings'
      };
    }
  }

  /**
   * Get user's current streak visibility setting
   */
  async getStreakVisibility(
    userId: string,
    getToken?: () => Promise<string | null>
  ): Promise<boolean> {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('streak_visibility')
        .eq('clerk_user_id', userId)
        .single();

      if (error) {
        console.error('Error getting streak visibility:', error);
        return false; // Default to private
      }

      return data?.streak_visibility ?? false;
    } catch (error) {
      console.error('Error in getStreakVisibility:', error);
      return false;
    }
  }
} 