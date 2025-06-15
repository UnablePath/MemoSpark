import type { AchievementInsert } from '@/types/achievements';

export const STREAK_ACHIEVEMENTS: AchievementInsert[] = [
  // Early streak achievements
  {
    name: "First Steps",
    description: "Complete your first day! Every journey begins with a single step.",
    icon: "✨",
    type: "streak",
    criteria: { days: 1 },
    points_reward: 10
  },
  {
    name: "Getting Started",
    description: "Maintain a 3-day streak. You're building momentum!",
    icon: "🌱",
    type: "streak",
    criteria: { days: 3 },
    points_reward: 25
  },
  {
    name: "Week Warrior",
    description: "Complete a full week of daily goals. Consistency is key!",
    icon: "⚡",
    type: "streak",
    criteria: { days: 7 },
    points_reward: 50
  },
  {
    name: "Two Week Champion",
    description: "14 days straight! You're developing a solid habit.",
    icon: "🎯",
    type: "streak",
    criteria: { days: 14 },
    points_reward: 100
  },
  {
    name: "Three Week Master",
    description: "21 days of dedication. Scientists say it takes 21 days to form a habit!",
    icon: "🧠",
    type: "streak",
    criteria: { days: 21 },
    points_reward: 150
  },
  
  // Monthly achievements
  {
    name: "Monthly Milestone",
    description: "30 days of consistent progress. You're a habit machine!",
    icon: "🔥",
    type: "streak",
    criteria: { days: 30 },
    points_reward: 250
  },
  {
    name: "Double Down",
    description: "60 days of unwavering commitment. Truly impressive!",
    icon: "💪",
    type: "streak",
    criteria: { days: 60 },
    points_reward: 400
  },
  {
    name: "Quarter Century",
    description: "90 days strong! You've built an unshakeable routine.",
    icon: "🏛️",
    type: "streak",
    criteria: { days: 90 },
    points_reward: 600
  },
  
  // Major milestones
  {
    name: "Centurion",
    description: "100 days of excellence! You're in the top 1% of achievers.",
    icon: "💯",
    type: "streak",
    criteria: { days: 100 },
    points_reward: 1000
  },
  {
    name: "Half Year Hero",
    description: "180 days of dedication. You've transformed your life!",
    icon: "🌟",
    type: "streak",
    criteria: { days: 180 },
    points_reward: 1500
  },
  {
    name: "Annual Legend",
    description: "365 days of unstoppable progress. You are absolutely legendary!",
    icon: "🏆",
    type: "streak",
    criteria: { days: 365 },
    points_reward: 3000
  },
  {
    name: "Beyond Human",
    description: "500+ days of pure determination. You've transcended normal limits!",
    icon: "💎",
    type: "streak",
    criteria: { days: 500 },
    points_reward: 5000
  },
  {
    name: "Immortal",
    description: "1000 days of unwavering commitment. You are simply immortal!",
    icon: "♾️",
    type: "streak",
    criteria: { days: 1000 },
    points_reward: 10000
  },

  // Streak recovery achievements
  {
    name: "Phoenix Rising",
    description: "Used a streak recovery to maintain your momentum. Smart thinking!",
    icon: "🔄",
    type: "social",
    criteria: { action: "streak_recovery_used" },
    points_reward: 30
  },
  {
    name: "Streak Saver",
    description: "Successfully recovered from a missed day 3 times. Resilience is key!",
    icon: "🛡️",
    type: "social",
    criteria: { action: "multiple_recoveries", count: 3 },
    points_reward: 100
  },

  // Social streak achievements
  {
    name: "Streak Sharer",
    description: "Shared your streak to inspire others. Spread the motivation!",
    icon: "📢",
    type: "social",
    criteria: { action: "streak_share" },
    points_reward: 25
  },
  {
    name: "Inspiration Station",
    description: "Shared your streak 10 times. You're a true motivator!",
    icon: "🌈",
    type: "social",
    criteria: { action: "streak_share", count: 10 },
    points_reward: 200
  },

  // Consistency achievements
  {
    name: "Weekend Warrior",
    description: "Maintained your streak through 10 weekends. No days off!",
    icon: "🏋️",
    type: "streak",
    criteria: { weekends_maintained: 10 },
    points_reward: 300
  },
  {
    name: "Holiday Hero",
    description: "Kept your streak alive during holiday periods. Dedication knows no bounds!",
    icon: "🎄",
    type: "streak",
    criteria: { holiday_streak: true },
    points_reward: 150
  },

  // Performance achievements
  {
    name: "Overachiever",
    description: "Completed 5+ tasks in a single day during your streak.",
    icon: "🚀",
    type: "task_completion",
    criteria: { daily_tasks: 5 },
    points_reward: 75
  },
  {
    name: "Productivity Powerhouse",
    description: "Averaged 3+ tasks per day over a 30-day streak.",
    icon: "⚡",
    type: "streak",
    criteria: { avg_daily_tasks: 3, days: 30 },
    points_reward: 500
  }
];

export const getStreakAchievementByDays = (days: number): AchievementInsert | null => {
  return STREAK_ACHIEVEMENTS.find(achievement => 
    achievement.type === 'streak' && 
    achievement.criteria.days === days
  ) || null;
};

export const getNextStreakMilestone = (currentStreak: number): AchievementInsert | null => {
  const streakAchievements = STREAK_ACHIEVEMENTS
    .filter(achievement => achievement.type === 'streak' && achievement.criteria.days)
    .sort((a, b) => a.criteria.days - b.criteria.days);
    
  return streakAchievements.find(achievement => 
    achievement.criteria.days > currentStreak
  ) || null;
};

export const getAllStreakMilestones = (): number[] => {
  return STREAK_ACHIEVEMENTS
    .filter(achievement => achievement.type === 'streak' && achievement.criteria.days)
    .map(achievement => achievement.criteria.days)
    .sort((a, b) => a - b);
}; 