import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseServerAdmin } from '@/lib/supabase/server';
import type { AchievementInsert } from '@/types/achievements';

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated (can be removed for admin-only endpoint)
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!supabaseServerAdmin) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // LAUNCH ACHIEVEMENTS - 50 total, organized by rarity
    const launchAchievements: AchievementInsert[] = [
      // === STARTER ACHIEVEMENTS (First 10 - target ~200 points total) ===
      {
        name: "Welcome to MemoSpark!",
        description: "Complete onboarding and start your learning journey!",
        icon: "🎉",
        type: "tutorial",
        criteria: { step: "onboarding_complete" },
        points_reward: 10
      },
      {
        name: "Bubble Pop Champion",
        description: "Play the bubble pop game and have some fun!",
        icon: "🎮",
        type: "wellness",
        criteria: { action: "bubble_game_played" },
        points_reward: 10
      },
      {
        name: "Streak Starter",
        description: "Begin your first study streak!",
        icon: "🔥",
        type: "streak",
        criteria: { days: 1 },
        points_reward: 15
      },
      {
        name: "Two Day Wonder",
        description: "Keep your streak alive for 2 days!",
        icon: "📅",
        type: "streak",
        criteria: { days: 2 },
        points_reward: 20
      },
      {
        name: "Three's Company",
        description: "Maintain a 3-day streak!",
        icon: "🌟",
        type: "streak",
        criteria: { days: 3 },
        points_reward: 30
      },
      {
        name: "Week Warrior",
        description: "Complete a full week streak - you're unstoppable!",
        icon: "⚔️",
        type: "streak",
        criteria: { days: 7 },
        points_reward: 50
      },
      {
        name: "Stress Relief Pioneer",
        description: "Share your feelings in the Crashout Room!",
        icon: "💭",
        type: "wellness",
        criteria: { action: "first_crashout_post" },
        points_reward: 40
      },
      {
        name: "Settings Explorer",
        description: "Check out your settings and customize your experience!",
        icon: "⚙️",
        type: "tutorial",
        criteria: { action: "settings_opened" },
        points_reward: 5
      },
      {
        name: "Profile Visitor",
        description: "Visit your profile page and see your progress!",
        icon: "👤",
        type: "tutorial",
        criteria: { action: "profile_opened" },
        points_reward: 5
      },
      {
        name: "Task Creator",
        description: "Create your very first task!",
        icon: "📝",
        type: "task_completion",
        criteria: { tasks: 1 },
        points_reward: 20
      },

      // === COMMON ACHIEVEMENTS (Easy to get, encourage exploration) ===
      {
        name: "Dashboard Master",
        description: "Explore all 5 dashboard tabs!",
        icon: "🗂️",
        type: "tutorial",
        criteria: { action: "all_tabs_visited" },
        points_reward: 15
      },
      {
        name: "Social Butterfly",
        description: "Visit the connections tab for the first time!",
        icon: "🦋",
        type: "social",
        criteria: { action: "connections_opened" },
        points_reward: 10
      },
      {
        name: "Reminder Setter",
        description: "Set your first reminder!",
        icon: "⏰",
        type: "task_completion",
        criteria: { action: "first_reminder" },
        points_reward: 15
      },
      {
        name: "Gamer",
        description: "Explore the gamification tab!",
        icon: "🎯",
        type: "tutorial",
        criteria: { action: "gamification_opened" },
        points_reward: 10
      },
      {
        name: "Night Owl",
        description: "Complete a task after 10 PM!",
        icon: "🦉",
        type: "task_completion",
        criteria: { action: "late_night_task" },
        points_reward: 20
      },
      {
        name: "Early Bird",
        description: "Complete a task before 7 AM!",
        icon: "🐦",
        type: "task_completion",
        criteria: { action: "early_morning_task" },
        points_reward: 25
      },
      {
        name: "Productive Day",
        description: "Complete 3 tasks in one day!",
        icon: "📈",
        type: "task_completion",
        criteria: { tasks: 3, timeframe: "day" },
        points_reward: 30
      },
      {
        name: "Tutorial Graduate",
        description: "Complete the full tutorial!",
        icon: "🎓",
        type: "tutorial",
        criteria: { step: "completion" },
        points_reward: 25
      },
      {
        name: "Theme Switcher",
        description: "Change your theme in settings!",
        icon: "🎨",
        type: "tutorial",
        criteria: { action: "theme_changed" },
        points_reward: 10
      },
      {
        name: "Notification Pro",
        description: "Enable notifications!",
        icon: "🔔",
        type: "tutorial",
        criteria: { action: "notifications_enabled" },
        points_reward: 15
      },

      // === UNCOMMON ACHIEVEMENTS (Moderate effort) ===
      {
        name: "Task Destroyer",
        description: "Complete 10 tasks total!",
        icon: "💥",
        type: "task_completion",
        criteria: { tasks: 10 },
        points_reward: 50
      },
      {
        name: "Two Week Champion",
        description: "Maintain a 14-day streak!",
        icon: "🏆",
        type: "streak",
        criteria: { days: 14 },
        points_reward: 100
      },
      {
        name: "Mood Tracker",
        description: "Log your mood 5 times!",
        icon: "😊",
        type: "wellness",
        criteria: { action: "mood_tracking", count: 5 },
        points_reward: 40
      },
      {
        name: "Social Connector",
        description: "Make your first connection!",
        icon: "🤝",
        type: "social",
        criteria: { action: "first_connection" },
        points_reward: 60
      },
      {
        name: "Bubble Master",
        description: "Score 1000+ points in the bubble game!",
        icon: "🏅",
        type: "wellness",
        criteria: { action: "bubble_game_score", score: 1000 },
        points_reward: 75
      },
      {
        name: "Weekend Warrior",
        description: "Complete tasks on both Saturday and Sunday!",
        icon: "⚡",
        type: "task_completion",
        criteria: { action: "weekend_tasks" },
        points_reward: 45
      },
      {
        name: "Achiever",
        description: "Unlock 5 different achievements!",
        icon: "🌟",
        type: "task_completion",
        criteria: { achievements: 5 },
        points_reward: 80
      },
      {
        name: "Crashout Supporter",
        description: "React to 10 crashout posts!",
        icon: "❤️",
        type: "social",
        criteria: { action: "crashout_reactions", count: 10 },
        points_reward: 50
      },
      {
        name: "Study Planner",
        description: "Create 5 tasks with due dates!",
        icon: "📋",
        type: "task_completion",
        criteria: { action: "tasks_with_dates", count: 5 },
        points_reward: 65
      },
      {
        name: "Level Up",
        description: "Reach level 2!",
        icon: "⬆️",
        type: "points_earned",
        criteria: { level: 2 },
        points_reward: 100
      },

      // === RARE ACHIEVEMENTS (Significant effort) ===
      {
        name: "Three Week Master",
        description: "Maintain a 21-day streak! Habit formed!",
        icon: "🧠",
        type: "streak",
        criteria: { days: 21 },
        points_reward: 200
      },
      {
        name: "Task Master",
        description: "Complete 25 tasks total!",
        icon: "🎯",
        type: "task_completion",
        criteria: { tasks: 25 },
        points_reward: 150
      },
      {
        name: "Monthly Milestone",
        description: "Complete a 30-day streak!",
        icon: "🔥",
        type: "streak",
        criteria: { days: 30 },
        points_reward: 300
      },
      {
        name: "Social Leader",
        description: "Create your first study group!",
        icon: "👥",
        type: "social",
        criteria: { action: "group_created" },
        points_reward: 120
      },
      {
        name: "Bubble Legend",
        description: "Score 2500+ points in bubble game!",
        icon: "👑",
        type: "wellness",
        criteria: { action: "bubble_game_score", score: 2500 },
        points_reward: 180
      },
      {
        name: "Point Collector",
        description: "Earn 500 total points!",
        icon: "💎",
        type: "points_earned",
        criteria: { points: 500 },
        points_reward: 100
      },
      {
        name: "Dedication",
        description: "Complete tasks for 10 consecutive days!",
        icon: "💪",
        type: "task_completion",
        criteria: { action: "consecutive_task_days", count: 10 },
        points_reward: 200
      },
      {
        name: "Community Helper",
        description: "Join 3 different study groups!",
        icon: "🌟",
        type: "social",
        criteria: { action: "groups_joined", count: 3 },
        points_reward: 180
      },
      {
        name: "Wellness Advocate",
        description: "Use stress relief features 20 times!",
        icon: "🧘",
        type: "wellness",
        criteria: { action: "stress_relief_sessions", count: 20 },
        points_reward: 160
      },
      {
        name: "Super Achiever",
        description: "Unlock 15 different achievements!",
        icon: "🏆",
        type: "task_completion",
        criteria: { achievements: 15 },
        points_reward: 250
      },

      // === EPIC ACHIEVEMENTS (Long-term commitment) ===
      {
        name: "Productivity Machine",
        description: "Complete 50 tasks total!",
        icon: "🚀",
        type: "task_completion",
        criteria: { tasks: 50 },
        points_reward: 400
      },
      {
        name: "Two Month Legend",
        description: "Maintain a 60-day streak!",
        icon: "🌟",
        type: "streak",
        criteria: { days: 60 },
        points_reward: 600
      },
      {
        name: "Centurion",
        description: "Complete 100 tasks - absolute legend!",
        icon: "💯",
        type: "task_completion",
        criteria: { tasks: 100 },
        points_reward: 1000
      },
      {
        name: "Three Month Hero",
        description: "Maintain a 90-day streak!",
        icon: "🏛️",
        type: "streak",
        criteria: { days: 90 },
        points_reward: 1000
      },
      {
        name: "Point Millionaire",
        description: "Earn 1000 total points!",
        icon: "💰",
        type: "points_earned",
        criteria: { points: 1000 },
        points_reward: 500
      },
      {
        name: "Ultimate Bubble Master",
        description: "Score 5000+ points in bubble game!",
        icon: "👽",
        type: "wellness",
        criteria: { action: "bubble_game_score", score: 5000 },
        points_reward: 500
      },
      {
        name: "Achievement Hunter",
        description: "Unlock 25 different achievements!",
        icon: "🎖️",
        type: "task_completion",
        criteria: { achievements: 25 },
        points_reward: 750
      },
      {
        name: "Community Champion",
        description: "Help 10 different students!",
        icon: "👨‍🏫",
        type: "social",
        criteria: { action: "students_helped", count: 10 },
        points_reward: 800
      },
      {
        name: "Zen Master",
        description: "Use stress relief features 100 times!",
        icon: "☯️",
        type: "wellness",
        criteria: { action: "stress_relief_sessions", count: 100 },
        points_reward: 600
      },
      {
        name: "MemoSpark Legend",
        description: "Unlock 40 different achievements!",
        icon: "🌟",
        type: "task_completion",
        criteria: { achievements: 40 },
        points_reward: 1500
      }
    ];

    // Verify we have exactly 50 achievements
    console.log(`Total achievements: ${launchAchievements.length}`);

    // Calculate points for first 10 achievements
    const first10Points = launchAchievements.slice(0, 10).reduce((sum, ach) => sum + ach.points_reward, 0);
    console.log(`First 10 achievements total points: ${first10Points}`);

    // Check existing achievements to avoid duplicates
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

    // Insert new achievements
    const { data: insertedAchievements, error } = await supabaseServerAdmin
      .from('achievements')
      .insert(newAchievements)
      .select();

    if (error) {
      console.error('Error inserting achievements:', error);
      return NextResponse.json({ error: 'Failed to insert achievements' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully populated ${newAchievements.length} new launch achievements!`,
      newCount: newAchievements.length,
      existingCount: existingNames.length,
      totalCount: existingNames.length + newAchievements.length,
      first10Points,
      stats: {
        starter: launchAchievements.slice(0, 10).length,
        common: launchAchievements.slice(10, 20).length,
        uncommon: launchAchievements.slice(20, 30).length,
        rare: launchAchievements.slice(30, 40).length,
        epic: launchAchievements.slice(40, 50).length
      },
      insertedAchievements: insertedAchievements?.map(a => ({ 
        name: a.name, 
        points: a.points_reward,
        type: a.type 
      }))
    });

  } catch (error) {
    console.error('Error populating launch achievements:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 