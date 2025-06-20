import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseServerAdmin } from '@/lib/supabase/server';

// GET /api/achievements - Fetch user's achievements
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!supabaseServerAdmin) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Get all available achievements
    const { data: allAchievements } = await supabaseServerAdmin
      .from('achievements')
      .select('*')
      .order('points_reward', { ascending: true });

    // Get user's unlocked achievements (using clerk_user_id directly)
    const { data: userAchievements } = await supabaseServerAdmin
      .from('user_achievements')
      .select('achievement_id, unlocked_at, progress')
      .eq('user_id', userId);

    // Combine achievements with user progress
    const achievementsWithProgress = (allAchievements || []).map(achievement => {
      const userAchievement = userAchievements?.find(ua => ua.achievement_id === achievement.id);
      return {
        ...achievement,
        unlocked: !!userAchievement,
        unlockedAt: userAchievement?.unlocked_at,
        userProgress: userAchievement?.progress || 0
      };
    });

    return NextResponse.json({
      success: true,
      achievements: achievementsWithProgress,
      stats: {
        total: allAchievements?.length || 0,
        unlocked: userAchievements?.length || 0,
        remaining: (allAchievements?.length || 0) - (userAchievements?.length || 0)
      }
    });

  } catch (error) {
    console.error('Error fetching achievements:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST /api/achievements - Trigger achievement check
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!supabaseServerAdmin) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const body = await request.json();
    const { action, value, metadata } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    // Get user profile - create if doesn't exist
    let { data: profile } = await supabaseServerAdmin
      .from('profiles')
      .select('id, clerk_user_id')
      .eq('clerk_user_id', userId)
      .single();

    if (!profile) {
      // Create profile if it doesn't exist
      const { data: newProfile, error: createError } = await supabaseServerAdmin
        .from('profiles')
        .insert({
          clerk_user_id: userId,
          email: '', // Will be updated by webhook
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id, clerk_user_id')
        .single();

      if (createError || !newProfile) {
        console.error('Error creating profile:', createError);
        return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 });
      }
      
      profile = newProfile;
    }

    // Handle points recalculation
    if (action === 'recalculate_points') {
      try {
        // Get all user achievements with their point values
        const { data: userAchievementsWithPoints } = await supabaseServerAdmin
          .from('user_achievements')
          .select(`
            achievement_id,
            achievements!inner(points_reward)
          `)
          .eq('user_id', userId); // Use clerk_user_id directly

        // Calculate total points
        const totalPoints = userAchievementsWithPoints?.reduce((sum, ua: any) => 
          sum + (ua.achievements?.points_reward || 0), 0) || 0;

        // Update user stats with correct points - using clerk_user_id directly
        const { error: updateError } = await supabaseServerAdmin
          .from('user_stats')
          .upsert({
            user_id: userId, // Use clerk_user_id directly
            total_points: totalPoints,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });

        if (updateError) {
          console.error('Error updating user stats:', updateError);
          return NextResponse.json({ 
            error: 'Failed to update stats', 
            details: updateError.message,
            userId: userId 
          }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          message: `Points recalculated: ${totalPoints} points from ${userAchievementsWithPoints?.length || 0} achievements`,
          totalPoints,
          achievementsCount: userAchievementsWithPoints?.length || 0
        });

      } catch (error) {
        console.error('Error recalculating points:', error);
        return NextResponse.json({ error: 'Failed to recalculate points' }, { status: 500 });
      }
    }

    // Handle test coin awards
    if (action === 'test_coins') {
      const coinsToAward = value || 100;
      
      const { error: coinError } = await supabaseServerAdmin
        .from('coin_transactions')
        .insert({
          user_id: userId, // Use clerk_user_id for coin transactions
          amount: coinsToAward,
          transaction_type: 'earned',
          source: 'bonus_event',
          description: `Test coin award: ${coinsToAward} coins`,
          metadata: { testReward: true, ...metadata }
        });

      if (coinError) {
        console.error('Error awarding test coins:', coinError);
        return NextResponse.json({ error: 'Failed to award test coins' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: `Awarded ${coinsToAward} test coins!`,
        coinsAwarded: coinsToAward
      });
    }

    // Handle direct achievement unlock
    if (action === 'direct_unlock') {
      const { achievementId, progress } = body;
      
      if (!achievementId) {
        return NextResponse.json({ error: 'Achievement ID is required for direct unlock' }, { status: 400 });
      }

      // Check if user already has this achievement
      const { data: existingUserAchievement } = await supabaseServerAdmin
        .from('user_achievements')
        .select('id')
        .eq('user_id', userId)
        .eq('achievement_id', achievementId)
        .single();

      if (existingUserAchievement) {
        return NextResponse.json({ 
          success: false, 
          error: 'Achievement already unlocked',
          message: 'Achievement already unlocked'
        }, { status: 400 });
      }

      // Get the achievement details
      const { data: achievement } = await supabaseServerAdmin
        .from('achievements')
        .select('*')
        .eq('id', achievementId)
        .single();

      if (!achievement) {
        return NextResponse.json({ error: 'Achievement not found' }, { status: 404 });
      }

      // Unlock the achievement
      const { error: unlockError } = await supabaseServerAdmin
        .from('user_achievements')
        .insert({
          user_id: userId,
          achievement_id: achievementId,
          unlocked_at: new Date().toISOString(),
          progress: progress || {}
        });

      if (unlockError) {
        console.error('Error unlocking achievement:', unlockError);
        return NextResponse.json({ error: 'Failed to unlock achievement' }, { status: 500 });
      }

      // Award coins
      const coinsAwarded = Math.floor(achievement.points_reward / 2);
      
      const { error: coinError } = await supabaseServerAdmin
        .from('coin_transactions')
        .insert({
          user_id: userId,
          amount: coinsAwarded,
          transaction_type: 'earned',
          source: 'achievement_unlock',
          description: `Achievement: ${achievement.name}`,
          metadata: { achievementId: achievement.id }
        });

      if (coinError) {
        console.error('Error awarding coins for achievement:', coinError);
        // Don't fail the whole operation, just log the error
      }

      return NextResponse.json({
        success: true,
        message: `Achievement "${achievement.name}" unlocked!`,
        unlockedAchievements: [{
          ...achievement,
          coinsEarned: coinsAwarded
        }],
        totalCoinsEarned: coinsAwarded
      });
    }

    // No need for profile validation - using clerk_user_id directly

    // Get user stats - create if doesn't exist (using clerk_user_id directly)
    let { data: userStats } = await supabaseServerAdmin
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Create user stats if it doesn't exist
    if (!userStats) {
      console.log('Creating user stats for user:', userId);
      const { data: newUserStats, error: createError } = await supabaseServerAdmin
        .from('user_stats')
        .insert({
          user_id: userId, // Use clerk_user_id directly
          total_points: 0,
          current_streak: 0,
          longest_streak: 0,
          level: 1,
          tasks_completed: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (createError) {
        console.error('Error creating user stats:', createError);
        return NextResponse.json({ error: 'Failed to create user stats' }, { status: 500 });
      }
      
      if (newUserStats) {
        userStats = newUserStats;
      }
    }

    // Get all achievements that match this action type
    const { data: relevantAchievements } = await supabaseServerAdmin
      .from('achievements')
      .select('*')
      .eq('type', mapActionToType(action));

    if (!relevantAchievements || relevantAchievements.length === 0) {
      return NextResponse.json({ 
        success: true,
        message: 'No matching achievements found', 
        action,
        unlockedAchievements: [],
        totalCoinsEarned: 0
      });
    }

    const unlockedAchievements = [];
    const coinsEarned = [];

    for (const achievement of relevantAchievements) {
      // Check if user already has this achievement
      const { data: existingUserAchievement } = await supabaseServerAdmin
        .from('user_achievements')
        .select('id')
        .eq('user_id', userId) // Use clerk_user_id directly
        .eq('achievement_id', achievement.id)
        .single();

      if (existingUserAchievement) {
        continue; // Already unlocked
      }

      // Check if criteria is met
      const criteriaCheck = checkAchievementCriteria(achievement, action, value, userStats, metadata);
      
      if (criteriaCheck) {
        // Unlock achievement
        const { error: unlockError } = await supabaseServerAdmin
          .from('user_achievements')
          .insert({
            user_id: userId, // Use clerk_user_id directly
            achievement_id: achievement.id,
            unlocked_at: new Date().toISOString(),
            progress: achievement.criteria
          });

        if (!unlockError) {
          // Award coins
          const coinsAwarded = Math.floor(achievement.points_reward / 2); // Convert points to coins
          
          const { error: coinError } = await supabaseServerAdmin
            .from('coin_transactions')
            .insert({
              user_id: userId, // Use clerk_user_id for coin transactions
              amount: coinsAwarded,
              transaction_type: 'earned',
              source: 'achievement_unlock',
              description: `Achievement: ${achievement.name}`,
              metadata: { achievementId: achievement.id }
            });

          if (!coinError) {
            coinsEarned.push(coinsAwarded);
          }

          // Update user stats - using clerk_user_id directly
          const newTotalPoints = (userStats?.total_points || 0) + achievement.points_reward;
          
          const { error: statsUpdateError } = await supabaseServerAdmin
            .from('user_stats')
            .upsert({
              user_id: userId, // Use clerk_user_id directly
              total_points: newTotalPoints,
              level: Math.floor(newTotalPoints / 1000) + 1,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_id'
            });
            
          if (statsUpdateError) {
            console.error('Error updating user stats:', statsUpdateError);
            // Don't fail the whole operation, just log the error
          }

          unlockedAchievements.push({
            ...achievement,
            coinsEarned: coinsAwarded
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: unlockedAchievements.length > 0 
        ? `🎉 Unlocked ${unlockedAchievements.length} achievement(s)!`
        : 'No new achievements unlocked',
      unlockedAchievements,
      totalCoinsEarned: coinsEarned.reduce((sum, coins) => sum + coins, 0),
      action,
      value
    });

  } catch (error) {
    console.error('Error checking achievements:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper functions
function mapActionToType(action: string): string {
  const actionMap: Record<string, string> = {
    'task_completed': 'task_completion',
    'streak_increased': 'streak',
    'tutorial_step': 'tutorial',
    'social_action': 'social',
    'wellness_action': 'wellness',
    'bubble_game_played': 'wellness',
    'bubble_score_reached': 'wellness',
    'settings_opened': 'tutorial',
    'profile_opened': 'tutorial',
    'dashboard_visited': 'tutorial',
    'gamification_opened': 'tutorial',
    'connections_opened': 'tutorial',
    'tasks_opened': 'tutorial',
    'reminders_opened': 'tutorial',
    'crashout_opened': 'tutorial',
    'all_tabs_visited': 'tutorial'
  };
  
  return actionMap[action] || 'task_completion';
}

function checkAchievementCriteria(
  achievement: any,
  action: string,
  value: any,
  userStats: any,
  metadata: any
): boolean {
  const criteria = achievement.criteria;
  
  switch (achievement.type) {
    case 'task_completion':
      if (criteria.tasks && userStats?.tasks_completed) {
        return userStats.tasks_completed >= criteria.tasks;
      }
      if (action === 'task_completed') {
        return true; // First task completion
      }
      break;
      
    case 'streak':
      if (criteria.days && userStats?.current_streak) {
        return userStats.current_streak >= criteria.days;
      }
      if (action === 'streak_increased' && value) {
        return value >= (criteria.days || 1);
      }
      break;
      
    case 'tutorial':
      if (criteria.step && action === 'tutorial_step') {
        return value === criteria.step || criteria.step === 'completion';
      }
      if (criteria.action && action.includes(criteria.action)) {
        return true;
      }
      // Handle specific tutorial actions
      if (criteria.action === 'onboarding_complete' && action === 'tutorial_step' && value === 'onboarding_complete') {
        return true;
      }
      if (criteria.action === 'settings_opened' && action === 'settings_opened') {
        return true;
      }
      if (criteria.action === 'profile_opened' && action === 'profile_opened') {
        return true;
      }
      if (criteria.action === 'all_tabs_visited' && action === 'all_tabs_visited') {
        return true;
      }
      break;
      
    case 'wellness':
      if (criteria.action === 'bubble_game_played' && action === 'bubble_game_played') {
        return true;
      }
      if (criteria.score && action === 'bubble_score_reached' && value) {
        return value >= criteria.score;
      }
      if (criteria.action === 'first_crashout_post' && action === 'wellness_action' && metadata?.wellnessAction === 'first_crashout_post') {
        return true;
      }
      break;
      
    case 'social':
      if (criteria.action && action === 'social_action' && metadata?.socialAction === criteria.action) {
        return true;
      }
      break;
      
    case 'points_earned':
      if (criteria.points && userStats?.total_points) {
        return userStats.total_points >= criteria.points;
      }
      break;
  }
  
  return false;
} 