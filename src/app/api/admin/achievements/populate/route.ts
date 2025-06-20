import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseServerAdmin } from '@/lib/supabase/server';

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!supabaseServerAdmin) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // First, let's check if the achievements table exists and has the right structure
    const { data: tableInfo, error: tableError } = await supabaseServerAdmin
      .from('achievements')
      .select('*')
      .limit(1);

    if (tableError) {
      console.error('Table error:', tableError);
      return NextResponse.json({ 
        error: 'Achievements table not accessible',
        details: tableError.message 
      }, { status: 500 });
    }

    // LAUNCH ACHIEVEMENTS - 50 total, designed for competition
    const launchAchievements = [
      // STARTER ACHIEVEMENTS (First 10 - total 205 points to reach ~200)
      { name: "Welcome to MemoSpark!", description: "Complete onboarding and start your learning journey!", icon: "🎉", type: "tutorial", criteria: JSON.stringify({ step: "onboarding_complete" }), points_reward: 10 },
      { name: "Bubble Pop Champion", description: "Play the bubble pop game and have some fun!", icon: "🎮", type: "wellness", criteria: JSON.stringify({ action: "bubble_game_played" }), points_reward: 10 },
      { name: "Streak Starter", description: "Begin your first study streak!", icon: "🔥", type: "streak", criteria: JSON.stringify({ days: 1 }), points_reward: 15 },
      { name: "Two Day Wonder", description: "Keep your streak alive for 2 days!", icon: "📅", type: "streak", criteria: JSON.stringify({ days: 2 }), points_reward: 20 },
      { name: "Three's Company", description: "Maintain a 3-day streak!", icon: "🌟", type: "streak", criteria: JSON.stringify({ days: 3 }), points_reward: 30 },
      { name: "Week Warrior", description: "Complete a full week streak - you're unstoppable!", icon: "⚔️", type: "streak", criteria: JSON.stringify({ days: 7 }), points_reward: 50 },
      { name: "Stress Relief Pioneer", description: "Share your feelings in the Crashout Room!", icon: "💭", type: "wellness", criteria: JSON.stringify({ action: "first_crashout_post" }), points_reward: 40 },
      { name: "Settings Explorer", description: "Check out your settings and customize your experience!", icon: "⚙️", type: "tutorial", criteria: JSON.stringify({ action: "settings_opened" }), points_reward: 5 },
      { name: "Profile Visitor", description: "Visit your profile page and see your progress!", icon: "👤", type: "tutorial", criteria: JSON.stringify({ action: "profile_opened" }), points_reward: 5 },
      { name: "Task Creator", description: "Create your very first task!", icon: "📝", type: "task_completion", criteria: JSON.stringify({ tasks: 1 }), points_reward: 20 },

      // COMMON ACHIEVEMENTS (Encourage exploration)
      { name: "Dashboard Master", description: "Explore all 5 dashboard tabs!", icon: "🗂️", type: "tutorial", criteria: JSON.stringify({ action: "all_tabs_visited" }), points_reward: 15 },
      { name: "Social Butterfly", description: "Visit the connections tab for the first time!", icon: "🦋", type: "social", criteria: JSON.stringify({ action: "connections_opened" }), points_reward: 10 },
      { name: "Reminder Setter", description: "Set your first reminder!", icon: "⏰", type: "task_completion", criteria: JSON.stringify({ action: "first_reminder" }), points_reward: 15 },
      { name: "Gamer", description: "Explore the gamification tab!", icon: "🎯", type: "tutorial", criteria: JSON.stringify({ action: "gamification_opened" }), points_reward: 10 },
      { name: "Night Owl", description: "Complete a task after 10 PM!", icon: "🦉", type: "task_completion", criteria: JSON.stringify({ action: "late_night_task" }), points_reward: 20 },
      { name: "Early Bird", description: "Complete a task before 7 AM!", icon: "🐦", type: "task_completion", criteria: JSON.stringify({ action: "early_morning_task" }), points_reward: 25 },
      { name: "Productive Day", description: "Complete 3 tasks in one day!", icon: "📈", type: "task_completion", criteria: JSON.stringify({ tasks: 3, timeframe: "day" }), points_reward: 30 },
      { name: "Tutorial Graduate", description: "Complete the full tutorial!", icon: "🎓", type: "tutorial", criteria: JSON.stringify({ step: "completion" }), points_reward: 25 },
      { name: "Theme Switcher", description: "Change your theme in settings!", icon: "🎨", type: "tutorial", criteria: JSON.stringify({ action: "theme_changed" }), points_reward: 10 },
      { name: "Notification Pro", description: "Enable notifications!", icon: "🔔", type: "tutorial", criteria: JSON.stringify({ action: "notifications_enabled" }), points_reward: 15 },

      // UNCOMMON ACHIEVEMENTS (Moderate effort)
      { name: "Task Destroyer", description: "Complete 10 tasks total!", icon: "💥", type: "task_completion", criteria: JSON.stringify({ tasks: 10 }), points_reward: 50 },
      { name: "Two Week Champion", description: "Maintain a 14-day streak!", icon: "🏆", type: "streak", criteria: JSON.stringify({ days: 14 }), points_reward: 100 },
      { name: "Mood Tracker", description: "Log your mood 5 times!", icon: "😊", type: "wellness", criteria: JSON.stringify({ action: "mood_tracking", count: 5 }), points_reward: 40 },
      { name: "Social Connector", description: "Make your first connection!", icon: "🤝", type: "social", criteria: JSON.stringify({ action: "first_connection" }), points_reward: 60 },
      { name: "Bubble Master", description: "Score 1000+ points in the bubble game!", icon: "🏅", type: "wellness", criteria: JSON.stringify({ action: "bubble_game_score", score: 1000 }), points_reward: 75 },
      { name: "Weekend Warrior", description: "Complete tasks on both Saturday and Sunday!", icon: "⚡", type: "task_completion", criteria: JSON.stringify({ action: "weekend_tasks" }), points_reward: 45 },
      { name: "Achiever", description: "Unlock 5 different achievements!", icon: "🌟", type: "task_completion", criteria: JSON.stringify({ achievements: 5 }), points_reward: 80 },
      { name: "Crashout Supporter", description: "React to 10 crashout posts!", icon: "❤️", type: "social", criteria: JSON.stringify({ action: "crashout_reactions", count: 10 }), points_reward: 50 },
      { name: "Study Planner", description: "Create 5 tasks with due dates!", icon: "📋", type: "task_completion", criteria: JSON.stringify({ action: "tasks_with_dates", count: 5 }), points_reward: 65 },
      { name: "Level Up", description: "Reach level 2!", icon: "⬆️", type: "points_earned", criteria: JSON.stringify({ level: 2 }), points_reward: 100 },

      // RARE ACHIEVEMENTS (Significant effort)
      { name: "Three Week Master", description: "Maintain a 21-day streak! Habit formed!", icon: "🧠", type: "streak", criteria: JSON.stringify({ days: 21 }), points_reward: 200 },
      { name: "Task Master", description: "Complete 25 tasks total!", icon: "🎯", type: "task_completion", criteria: JSON.stringify({ tasks: 25 }), points_reward: 150 },
      { name: "Monthly Milestone", description: "Complete a 30-day streak!", icon: "🔥", type: "streak", criteria: JSON.stringify({ days: 30 }), points_reward: 300 },
      { name: "Social Leader", description: "Create your first study group!", icon: "👥", type: "social", criteria: JSON.stringify({ action: "group_created" }), points_reward: 120 },
      { name: "Bubble Legend", description: "Score 2500+ points in bubble game!", icon: "👑", type: "wellness", criteria: JSON.stringify({ action: "bubble_game_score", score: 2500 }), points_reward: 180 },
      { name: "Point Collector", description: "Earn 500 total points!", icon: "💎", type: "points_earned", criteria: JSON.stringify({ points: 500 }), points_reward: 100 },
      { name: "Dedication", description: "Complete tasks for 10 consecutive days!", icon: "💪", type: "task_completion", criteria: JSON.stringify({ action: "consecutive_task_days", count: 10 }), points_reward: 200 },
      { name: "Community Helper", description: "Join 3 different study groups!", icon: "🌟", type: "social", criteria: JSON.stringify({ action: "groups_joined", count: 3 }), points_reward: 180 },
      { name: "Wellness Advocate", description: "Use stress relief features 20 times!", icon: "🧘", type: "wellness", criteria: JSON.stringify({ action: "stress_relief_sessions", count: 20 }), points_reward: 160 },
      { name: "Super Achiever", description: "Unlock 15 different achievements!", icon: "🏆", type: "task_completion", criteria: JSON.stringify({ achievements: 15 }), points_reward: 250 },

      // EPIC ACHIEVEMENTS (Long-term commitment)
      { name: "Productivity Machine", description: "Complete 50 tasks total!", icon: "🚀", type: "task_completion", criteria: JSON.stringify({ tasks: 50 }), points_reward: 400 },
      { name: "Two Month Legend", description: "Maintain a 60-day streak!", icon: "🌟", type: "streak", criteria: JSON.stringify({ days: 60 }), points_reward: 600 },
      { name: "Centurion", description: "Complete 100 tasks - absolute legend!", icon: "💯", type: "task_completion", criteria: JSON.stringify({ tasks: 100 }), points_reward: 1000 },
      { name: "Three Month Hero", description: "Maintain a 90-day streak!", icon: "🏛️", type: "streak", criteria: JSON.stringify({ days: 90 }), points_reward: 1000 },
      { name: "Point Millionaire", description: "Earn 1000 total points!", icon: "💰", type: "points_earned", criteria: JSON.stringify({ points: 1000 }), points_reward: 500 },
      { name: "Ultimate Bubble Master", description: "Score 5000+ points in bubble game!", icon: "👽", type: "wellness", criteria: JSON.stringify({ action: "bubble_game_score", score: 5000 }), points_reward: 500 },
      { name: "Achievement Hunter", description: "Unlock 25 different achievements!", icon: "🎖️", type: "task_completion", criteria: JSON.stringify({ achievements: 25 }), points_reward: 750 },
      { name: "Community Champion", description: "Help 10 different students!", icon: "👨‍🏫", type: "social", criteria: JSON.stringify({ action: "students_helped", count: 10 }), points_reward: 800 },
      { name: "Zen Master", description: "Use stress relief features 100 times!", icon: "☯️", type: "wellness", criteria: JSON.stringify({ action: "stress_relief_sessions", count: 100 }), points_reward: 600 },
      { name: "MemoSpark Legend", description: "Unlock 40 different achievements!", icon: "🌟", type: "task_completion", criteria: JSON.stringify({ achievements: 40 }), points_reward: 1500 }
    ];

    const first10Points = launchAchievements.slice(0, 10).reduce((sum, ach) => sum + ach.points_reward, 0);

    // Check existing achievements
    const { data: existingAchievements } = await supabaseServerAdmin
      .from('achievements')
      .select('name');

    const existingNames = existingAchievements?.map(a => a.name) || [];
    const newAchievements = launchAchievements.filter(a => !existingNames.includes(a.name));

    if (newAchievements.length === 0) {
      return NextResponse.json({ 
        message: 'All launch achievements already exist',
        existingCount: existingNames.length,
        totalDefined: launchAchievements.length,
        first10Points
      });
    }

    // Insert new achievements using direct function to bypass schema cache issues
    const insertedAchievements = [];
    const failedInserts = [];

    for (const achievement of newAchievements) {
      try {
        const { data, error } = await supabaseServerAdmin.rpc('insert_achievement_direct', {
          p_name: achievement.name,
          p_description: achievement.description,
          p_icon: achievement.icon,
          p_type: achievement.type,
          p_criteria: JSON.parse(achievement.criteria), // Parse back to object for JSONB
          p_points_reward: achievement.points_reward
        });

        if (error) {
          console.error(`Failed to insert achievement "${achievement.name}":`, error);
          failedInserts.push({ achievement: achievement.name, error: error.message });
        } else if (data) {
          insertedAchievements.push({
            id: data,
            name: achievement.name,
            description: achievement.description,
            icon: achievement.icon,
            type: achievement.type,
            points_reward: achievement.points_reward
          });
        }
      } catch (err) {
        console.error(`Exception inserting achievement "${achievement.name}":`, err);
        failedInserts.push({ achievement: achievement.name, error: 'Unknown error' });
      }
    }

    const successCount = insertedAchievements.length;
    const failureCount = failedInserts.length;

    return NextResponse.json({
      success: true,
      message: `🎉 Successfully populated ${successCount} launch achievements!${failureCount > 0 ? ` (${failureCount} failed)` : ''}`,
      newCount: successCount,
      existingCount: existingNames.length,
      totalCount: existingNames.length + successCount,
      first10Points,
      competitionNote: `First 10 achievements total ${first10Points} points - perfect for your 200-point launch competition!`,
      failedInserts: failureCount > 0 ? failedInserts : undefined,
      stats: {
        starter: 10,
        common: 10,
        uncommon: 10, 
        rare: 10,
        epic: 10
      }
    });

  } catch (error) {
    console.error('Error populating launch achievements:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 