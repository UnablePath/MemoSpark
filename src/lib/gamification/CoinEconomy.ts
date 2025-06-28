import { supabase } from '@/lib/supabase/client';

// Type definitions for coin system
export interface CoinTransaction {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: 'earned' | 'spent' | 'bonus' | 'refund';
  source: string;
  description: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface CoinEarningSource {
  id: string;
  source_name: string;
  base_amount: number;
  description: string;
  is_active: boolean;
  multiplier_factors: Record<string, any>;
}

export interface CoinSpendingCategory {
  id: string;
  category_name: string;
  item_name: string;
  cost: number;
  description: string;
  is_available: boolean;
  requirements: Record<string, any>;
  metadata: Record<string, any>;
  isPremiumOnly?: boolean;
}

export interface CoinBonusEvent {
  id: string;
  event_name: string;
  event_type: 'daily' | 'weekly' | 'special' | 'streak' | 'achievement';
  multiplier: number;
  bonus_amount: number;
  start_date?: string;
  end_date?: string;
  is_active: boolean;
  conditions: Record<string, any>;
  description?: string;
}

export interface CoinAnalytics {
  total_earned: number;
  total_spent: number;
  current_balance: number;
  transactions_count: number;
  most_common_earning_source?: string;
  most_common_spending_category?: string;
}

export interface CoinEarningResult {
  success: boolean;
  amount: number;
  newBalance: number;
  transactionId?: string;
  error?: string;
}

export interface CoinSpendingResult {
  success: boolean;
  amount: number;
  newBalance: number;
  transactionId?: string;
  error?: string;
}

/**
 * Comprehensive coin economy system for MemoSpark
 * Handles coin earning, spending, transactions, and analytics
 */
export class CoinEconomy {
  
  /**
   * Get user's current coin balance
   */
  async getCoinBalance(
    userId: string,
    getToken?: () => Promise<string | null>
  ): Promise<number> {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return 0;
    }

    try {
      // Get balance from coin_balances table (primary source of truth)
      const { data: balanceData, error: balanceError } = await supabase
        .from('coin_balances')
        .select('current_balance')
        .eq('user_id', userId)
        .single();

      if (balanceData && !balanceError) {
        return balanceData.current_balance || 0;
      }

      // If no record exists, fallback to RPC function which calculates from transactions
      if (balanceError?.code === 'PGRST116') {
        const { data, error } = await supabase.rpc('get_user_coin_balance', {
          p_user_id: userId
        });

        if (error) {
          console.error('Error getting coin balance via RPC:', error);
          return 0;
        }

        return (typeof data === 'number') ? data : 0;
      }

      // Handle RLS and authentication errors
      if (balanceError?.code === '42501' || balanceError?.code === '401' || balanceError?.code === '406') {
        console.warn('Database access restricted, returning 0 balance');
        return 0;
      }

      // Final fallback to RPC function
      const { data, error } = await supabase.rpc('get_user_coin_balance', {
        p_user_id: userId
      });

      if (error) {
        console.error('Error getting coin balance via RPC:', error);
        return 0;
      }

      return (typeof data === 'number') ? data : 0;
    } catch (error) {
      console.error('Error in getCoinBalance:', error);
      return 0;
    }
  }

  /**
   * Calculate coin earning amount with bonuses
   */
  async calculateCoinEarning(
    userId: string,
    source: string,
    metadata: Record<string, any> = {},
    getToken?: () => Promise<string | null>
  ): Promise<number> {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return 0;
    }

    try {
      // Try RPC function first
      const { data, error } = await supabase.rpc('calculate_coin_earning', {
        p_user_id: userId,
        p_source: source,
        p_metadata: metadata
      });

      if (error) {
        console.error('Error calculating coin earning via RPC:', error);
        // Fallback to basic calculation
        return this.getBasicCoinEarning(source);
      }

      return (typeof data === 'number') ? data : this.getBasicCoinEarning(source);
    } catch (error) {
      console.error('Error in calculateCoinEarning:', error);
      return this.getBasicCoinEarning(source);
    }
  }

  /**
   * Fallback basic coin earning calculation
   */
  private getBasicCoinEarning(source: string): number {
    const basicAmounts: Record<string, number> = {
      'task_completion': 10,
      'daily_login': 5,
      'achievement_unlock': 25,
      'daily_streak': 5,        // +5 coins per day for streaks 7+
      'streak_milestone': 25,   // +25 coins for milestones (7,14,30,60 days)
      'study_session': 8,
      'quiz_completion': 12,
      'goal_achievement': 20,
      'social_interaction': 3
    };
    
    return basicAmounts[source] || 5;
  }

  /**
   * Award coins to user
   */
  async awardCoins(
    userId: string,
    source: string,
    description: string,
    metadata: Record<string, any> = {},
    getToken?: () => Promise<string | null>
  ): Promise<CoinEarningResult> {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return {
        success: false,
        amount: 0,
        newBalance: 0,
        error: 'Supabase client not initialized'
      };
    }

    try {
      // Calculate earning amount with bonuses
      const amount = await this.calculateCoinEarning(userId, source, metadata, getToken);
      
      if (amount <= 0) {
        return {
          success: false,
          amount: 0,
          newBalance: await this.getCoinBalance(userId, getToken),
          error: 'No coins to award for this source'
        };
      }

      // Try RPC function first
      const { data, error } = await supabase.rpc('add_coins_to_user', {
        p_user_id: userId,
        p_amount: amount,
        p_source: source,
        p_description: description,
        p_metadata: metadata
      });

      if (error) {
        console.error('Error awarding coins via RPC:', error);
        // Fallback to direct table operations
        return await this.awardCoinsDirectly(userId, amount, source, description, metadata);
      }

      const newBalance = await this.getCoinBalance(userId, getToken);

      return {
        success: Boolean(data),
        amount,
        newBalance,
        transactionId: `${userId}-${Date.now()}`
      };
    } catch (error) {
      console.error('Error in awardCoins:', error);
      // Try fallback method
      try {
        const amount = this.getBasicCoinEarning(source);
        return await this.awardCoinsDirectly(userId, amount, source, description, metadata);
      } catch (fallbackError) {
        console.error('Fallback award coins also failed:', fallbackError);
        return {
          success: false,
          amount: 0,
          newBalance: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  }

  /**
   * Fallback method to award coins using direct table operations
   */
  private async awardCoinsDirectly(
    userId: string,
    amount: number,
    source: string,
    description: string,
    metadata: Record<string, any> = {}
  ): Promise<CoinEarningResult> {
    try {
      // Get current balance
      const currentBalance = await this.getCoinBalance(userId);
      const newBalance = currentBalance + amount;

      // Update coin_balances table (primary source of truth)
      const { error: balanceError } = await supabase!
        .from('coin_balances')
        .upsert({
          user_id: userId,
          current_balance: newBalance,
          lifetime_earned: currentBalance + amount,
          last_updated: new Date().toISOString()
        });

      if (balanceError) {
        console.error('Error updating coin balance:', balanceError);
        throw balanceError;
      }

      // Record transaction
      const { error: transactionError } = await supabase!
        .from('coin_transactions')
        .insert({
          user_id: userId,
          amount: amount,
          transaction_type: 'earned',
          source: source,
          description: description,
          metadata: metadata
        });

      if (transactionError) {
        console.error('Error recording transaction:', transactionError);
        // Don't fail the whole operation for transaction logging
      }

      return {
        success: true,
        amount,
        newBalance,
        transactionId: `${userId}-${Date.now()}`
      };
    } catch (error) {
      console.error('Error in awardCoinsDirectly:', error);
      return {
        success: false,
        amount: 0,
        newBalance: await this.getCoinBalance(userId),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Spend coins from user account
   */
  async spendCoins(
    userId: string,
    amount: number,
    source: string,
    description: string,
    metadata: Record<string, any> = {},
    getToken?: () => Promise<string | null>
  ): Promise<CoinSpendingResult> {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    try {
      // Check if user has enough coins
      const currentBalance = await this.getCoinBalance(userId, getToken);
      
      if (currentBalance < amount) {
        return {
          success: false,
          amount: 0,
          newBalance: currentBalance,
          error: `Insufficient coins. Current balance: ${currentBalance}, Required: ${amount}`
        };
      }

      // Spend coins
      const { data, error } = await supabase.rpc('spend_user_coins', {
        p_user_id: userId,
        p_amount: amount,
        p_source: source,
        p_description: description,
        p_metadata: metadata
      });

      if (error) {
        console.error('Error spending coins:', error);
        return {
          success: false,
          amount: 0,
          newBalance: currentBalance,
          error: error.message
        };
      }

      const newBalance = await this.getCoinBalance(userId, getToken);

      return {
        success: Boolean(data),
        amount,
        newBalance,
        transactionId: `${userId}-${Date.now()}`
      };
    } catch (error) {
      console.error('Error in spendCoins:', error);
      return {
        success: false,
        amount: 0,
        newBalance: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get user's coin transaction history
   */
  async getTransactionHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0,
    getToken?: () => Promise<string | null>
  ): Promise<CoinTransaction[]> {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return [];
    }

    try {
      // Try RPC function first
      const { data, error } = await supabase.rpc('get_user_coin_history', {
        p_user_id: userId,
        p_limit: limit,
        p_offset: offset
      });

      if (error) {
        console.error('Error getting transaction history via RPC:', error);
        // Fallback to direct table query
        const { data: directData, error: directError } = await supabase
          .from('coin_transactions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (directError) {
          console.error('Error getting transaction history via direct query:', directError);
          return [];
        }

        return Array.isArray(directData) ? directData as CoinTransaction[] : [];
      }

      return Array.isArray(data) ? data as CoinTransaction[] : [];
    } catch (error) {
      console.error('Error in getTransactionHistory:', error);
      return [];
    }
  }

  /**
   * Get user's coin analytics
   */
  async getCoinAnalytics(
    userId: string,
    getToken?: () => Promise<string | null>
  ): Promise<CoinAnalytics> {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return {
        total_earned: 0,
        total_spent: 0,
        current_balance: 0,
        transactions_count: 0
      };
    }

    try {
      // Try RPC function first
      const { data, error } = await supabase.rpc('get_coin_analytics', {
        p_user_id: userId
      });

      if (error) {
        console.error('Error getting coin analytics via RPC:', error);
        // Fallback to manual calculation
        return await this.calculateAnalyticsDirectly(userId);
      }

      if (!data || (Array.isArray(data) && data.length === 0)) {
        return await this.calculateAnalyticsDirectly(userId);
      }

      const analytics = Array.isArray(data) ? data[0] : data;
      return {
        total_earned: analytics.total_earned || 0,
        total_spent: analytics.total_spent || 0,
        current_balance: analytics.current_balance || 0,
        transactions_count: analytics.transactions_count || 0,
        most_common_earning_source: analytics.most_common_earning_source,
        most_common_spending_category: analytics.most_common_spending_category
      };
    } catch (error) {
      console.error('Error in getCoinAnalytics:', error);
      return await this.calculateAnalyticsDirectly(userId);
    }
  }

  /**
   * Fallback method to calculate analytics directly from tables
   */
  private async calculateAnalyticsDirectly(userId: string): Promise<CoinAnalytics> {
    try {
      const currentBalance = await this.getCoinBalance(userId);
      
      // Get transaction data
      const { data: transactions, error } = await supabase!
        .from('coin_transactions')
        .select('amount, transaction_type, source')
        .eq('user_id', userId);

      if (error || !transactions) {
        return {
          total_earned: 0,
          total_spent: 0,
          current_balance: currentBalance,
          transactions_count: 0
        };
      }

      const totalEarned = transactions
        .filter(t => t.amount > 0)
        .reduce((sum, t) => sum + t.amount, 0);

      const totalSpent = transactions
        .filter(t => t.amount < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

      // Find most common sources
      const earningSources = transactions
        .filter(t => t.amount > 0)
        .reduce((acc, t) => {
          acc[t.source] = (acc[t.source] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

      const spendingSources = transactions
        .filter(t => t.amount < 0)
        .reduce((acc, t) => {
          acc[t.source] = (acc[t.source] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

      const mostCommonEarning = Object.keys(earningSources).length > 0
        ? Object.keys(earningSources).reduce((a, b) => earningSources[a] > earningSources[b] ? a : b)
        : undefined;

      const mostCommonSpending = Object.keys(spendingSources).length > 0
        ? Object.keys(spendingSources).reduce((a, b) => spendingSources[a] > spendingSources[b] ? a : b)
        : undefined;

      return {
        total_earned: totalEarned,
        total_spent: totalSpent,
        current_balance: currentBalance,
        transactions_count: transactions.length,
        most_common_earning_source: mostCommonEarning,
        most_common_spending_category: mostCommonSpending
      };
    } catch (error) {
      console.error('Error in calculateAnalyticsDirectly:', error);
      return {
        total_earned: 0,
        total_spent: 0,
        current_balance: 0,
        transactions_count: 0
      };
    }
  }

  /**
   * Get all available earning sources
   */
  async getEarningSources(
    getToken?: () => Promise<string | null>
  ): Promise<CoinEarningSource[]> {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('coin_earning_sources')
        .select('*')
        .eq('is_active', true);

      if (error) {
        console.error('Error getting earning sources:', error);
        return [];
      }

      return Array.isArray(data) ? data as CoinEarningSource[] : [];
    } catch (error) {
      console.error('Error in getEarningSources:', error);
      return [];
    }
  }

  /**
   * Get all available spending categories
   */
  async getSpendingCategories(
    getToken?: () => Promise<string | null>
  ): Promise<CoinSpendingCategory[]> {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('coin_spending_categories')
        .select('*')
        .eq('is_available', true);

      if (error) {
        console.error('Error getting spending categories:', error);
        return [];
      }

      return Array.isArray(data) ? data as CoinSpendingCategory[] : [];
    } catch (error) {
      console.error('Error in getSpendingCategories:', error);
      return [];
    }
  }

  /**
   * Get active bonus events
   */
  async getActiveBonusEvents(
    getToken?: () => Promise<string | null>
  ): Promise<CoinBonusEvent[]> {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('coin_bonus_events')
        .select('*')
        .eq('is_active', true)
        .or('start_date.is.null,start_date.lte.now()')
        .or('end_date.is.null,end_date.gte.now()');

      if (error) {
        console.error('Error getting bonus events:', error);
        return [];
      }

      return Array.isArray(data) ? data as CoinBonusEvent[] : [];
    } catch (error) {
      console.error('Error in getActiveBonusEvents:', error);
      return [];
    }
  }

  /**
   * Purchase an item from the coin shop
   */
  async purchaseItem(
    userId: string,
    itemId: string,
    getToken?: () => Promise<string | null>
  ): Promise<CoinSpendingResult> {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    try {
      // Get item details
      const { data: item, error: itemError } = await supabase
        .from('coin_spending_categories')
        .select('*')
        .eq('id', itemId)
        .eq('is_available', true)
        .single();

      if (itemError || !item) {
        return {
          success: false,
          amount: 0,
          newBalance: await this.getCoinBalance(userId, getToken),
          error: 'Item not found or unavailable'
        };
      }

      // Check requirements (if any)
      if (item.requirements && Object.keys(item.requirements).length > 0) {
        // TODO: Implement requirement checking based on user stats
        // For now, we'll skip requirement validation
      }

      // Spend coins
      return await this.spendCoins(
        userId,
        Number(item.cost),
        `shop_purchase`,
        `Purchased ${item.item_name}`,
        { 
          item_id: itemId, 
          item_name: item.item_name,
          category: item.category_name,
          ...item.metadata 
        },
        getToken
      );
    } catch (error) {
      console.error('Error in purchaseItem:', error);
      return {
        success: false,
        amount: 0,
        newBalance: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Trigger daily login bonus
   */
  async triggerDailyLoginBonus(
    userId: string,
    getToken?: () => Promise<string | null>
  ): Promise<CoinEarningResult> {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    // Check if user already claimed today
    const today = new Date().toISOString().split('T')[0];
    
    try {
      const { data: existingClaim, error: checkError } = await supabase
        .from('coin_transactions')
        .select('id')
        .eq('user_id', userId)
        .eq('source', 'first_login_daily')
        .gte('created_at', `${today}T00:00:00.000Z`)
        .lt('created_at', `${today}T23:59:59.999Z`)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking daily bonus:', checkError);
        throw checkError;
      }

      if (existingClaim) {
        return {
          success: false,
          amount: 0,
          newBalance: await this.getCoinBalance(userId, getToken),
          error: 'Daily bonus already claimed today'
        };
      }

      // Award daily login bonus
      return await this.awardCoins(
        userId,
        'first_login_daily',
        'Daily login bonus',
        { date: today },
        getToken
      );
    } catch (error) {
      console.error('Error in triggerDailyLoginBonus:', error);
      return {
        success: false,
        amount: 0,
        newBalance: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Award coins for task completion
   */
  async awardTaskCompletionCoins(
    userId: string,
    taskId: string,
    difficulty: 'easy' | 'medium' | 'hard' = 'medium',
    getToken?: () => Promise<string | null>
  ): Promise<CoinEarningResult> {
    return await this.awardCoins(
      userId,
      'task_completion',
      `Completed ${difficulty} task`,
      { task_id: taskId, difficulty },
      getToken
    );
  }

  /**
   * Award coins for achievement unlock
   */
  async awardAchievementCoins(
    userId: string,
    achievementId: string,
    achievementPoints: number,
    rarity: 'common' | 'rare' | 'legendary' = 'common',
    getToken?: () => Promise<string | null>
  ): Promise<CoinEarningResult> {
    return await this.awardCoins(
      userId,
      'achievement_unlock',
      `Unlocked ${rarity} achievement`,
      { 
        achievement_id: achievementId, 
        achievement_points: achievementPoints,
        rarity 
      },
      getToken
    );
  }

  /**
   * Award streak bonus coins (enhanced with milestone system)
   */
  async awardStreakBonus(
    userId: string,
    streakLength: number,
    getToken?: () => Promise<string | null>
  ): Promise<CoinEarningResult> {
    // Calculate daily bonus: +5 coins per day for streaks 7+
    let bonusAmount = 0;
    let description = `Daily check-in`;
    
    if (streakLength >= 7) {
      bonusAmount = 5;
      description = `${streakLength} day streak bonus (+5 coins)`;
    }

    if (bonusAmount > 0) {
      return await this.awardCoins(
        userId,
        'daily_streak',
        description,
        { streak_length: streakLength, bonus_type: 'daily' },
        getToken
      );
    }

    // No bonus for streaks under 7 days
    return {
      success: true,
      amount: 0,
      newBalance: await this.getCoinBalance(userId, getToken),
      transactionId: `${userId}-${Date.now()}`
    };
  }

  /**
   * Award milestone bonus coins for reaching specific streak milestones
   */
  async awardStreakMilestoneBonus(
    userId: string,
    streakLength: number,
    getToken?: () => Promise<string | null>
  ): Promise<CoinEarningResult> {
    // Milestone bonuses: +25 coins at specific milestones
    const milestones = [7, 14, 30, 60, 100, 200, 365];
    const milestoneBonus = 25;

    if (milestones.includes(streakLength)) {
      const description = `🎉 ${streakLength}-day streak milestone bonus!`;
      
      return await this.awardCoins(
        userId,
        'streak_milestone',
        description,
        { 
          streak_length: streakLength, 
          milestone: true,
          bonus_type: 'milestone',
          amount: milestoneBonus
        },
        getToken
      );
    }

    // No milestone bonus for this streak length
    return {
      success: true,
      amount: 0,
      newBalance: await this.getCoinBalance(userId, getToken),
      transactionId: `${userId}-${Date.now()}`
    };
  }

  /**
   * Penalize user for losing a streak (moderate fixed penalty for 14+ day streaks)
   */
  async penalizeStreakLoss(
    userId: string,
    lostStreakLength: number,
    getToken?: () => Promise<string | null>
  ): Promise<CoinSpendingResult> {
    // Only penalize if streak was 14+ days
    if (lostStreakLength < 14) {
      return {
        success: true,
        amount: 0,
        newBalance: await this.getCoinBalance(userId, getToken),
        transactionId: `${userId}-${Date.now()}`
      };
    }

    try {
      const currentBalance = await this.getCoinBalance(userId, getToken);
      
      // More reasonable fixed penalty based on streak length
      let penaltyAmount = 0;
      if (lostStreakLength >= 30) {
        penaltyAmount = 50; // 50 coins for 30+ day streaks
      } else if (lostStreakLength >= 21) {
        penaltyAmount = 35; // 35 coins for 21+ day streaks  
      } else if (lostStreakLength >= 14) {
        penaltyAmount = 25; // 25 coins for 14+ day streaks
      }
      
      // Don't take more than 25% of current balance
      const maxPenalty = Math.floor(currentBalance * 0.25);
      penaltyAmount = Math.min(penaltyAmount, maxPenalty);
      
      // Don't penalize if user has less than 20 coins
      if (currentBalance < 20 || penaltyAmount <= 0) {
        return {
          success: true,
          amount: 0,
          newBalance: currentBalance,
          transactionId: `${userId}-${Date.now()}`
        };
      }

      const description = `💔 Lost ${lostStreakLength}-day streak penalty (-${penaltyAmount} coins)`;
      
      return await this.spendCoins(
        userId,
        penaltyAmount,
        'streak_penalty',
        description,
        { 
          lost_streak_length: lostStreakLength,
          penalty_type: 'streak_loss',
          penalty_amount: penaltyAmount
        },
        getToken
      );
    } catch (error) {
      console.error('Error in penalizeStreakLoss:', error);
      return {
        success: false,
        amount: 0,
        newBalance: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get earning summary for dashboard
   */
  async getEarningSummary(
    userId: string,
    getToken?: () => Promise<string | null>
  ): Promise<{
    balance: number;
    todayEarned: number;
    weeklyEarned: number;
    activeBonuses: CoinBonusEvent[];
  }> {
    try {
      const [balance, bonuses] = await Promise.all([
        this.getCoinBalance(userId, getToken),
        this.getActiveBonusEvents(getToken)
      ]);

      // Get today's earnings
      const today = new Date().toISOString().split('T')[0];
      const { data: todayTransactions } = await supabase!
        .from('coin_transactions')
        .select('amount')
        .eq('user_id', userId)
        .eq('transaction_type', 'earned')
        .gte('created_at', `${today}T00:00:00.000Z`)
        .lt('created_at', `${today}T23:59:59.999Z`);

      const todayEarned = todayTransactions?.reduce((sum, t) => sum + t.amount, 0) || 0;

      // Get weekly earnings
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const { data: weeklyTransactions } = await supabase!
        .from('coin_transactions')
        .select('amount')
        .eq('user_id', userId)
        .eq('transaction_type', 'earned')
        .gte('created_at', weekAgo.toISOString());

      const weeklyEarned = weeklyTransactions?.reduce((sum, t) => sum + t.amount, 0) || 0;

      return {
        balance,
        todayEarned,
        weeklyEarned,
        activeBonuses: bonuses
      };
    } catch (error) {
      console.error('Error in getEarningSummary:', error);
      return {
        balance: 0,
        todayEarned: 0,
        weeklyEarned: 0,
        activeBonuses: []
      };
    }
  }

  /**
   * Compensate user for unfair penalty (bug fix compensation)
   */
  async compensateUnfairPenalty(
    userId: string,
    compensationAmount: number = 200,
    getToken?: () => Promise<string | null>
  ): Promise<CoinEarningResult> {
    return await this.awardCoins(
      userId,
      'bug_compensation',
      `🎁 Compensation for unfair streak penalty bug (sorry!)`,
      { 
        compensation_type: 'penalty_bug_fix',
        original_penalty_system: '50_percent_balance',
        new_penalty_system: 'fixed_amount'
      },
      getToken
    );
  }
}

// Export singleton instance
export const coinEconomy = new CoinEconomy();