'use client';

export interface UserContext {
  totalTasks: number;
  tasksCompletedToday: number;
  currentStreak: number;
  lastCompletionTime?: Date;
  averageSuggestionConfidence: number;
  preferredTaskTypes: string[];
  completionTimes: { [hour: number]: number }; // Track which hours user completes tasks
  isFirstTimeUser: boolean;
  lastLoginDate?: Date;
  stuPreferences: {
    showCelebrations: boolean;
    messageFrequency: 'minimal' | 'normal' | 'frequent';
    messageDuration: 'short' | 'medium' | 'long';
    enableSounds: boolean;
    preferredTone: 'encouraging' | 'neutral' | 'playful';
  };
}

export interface StuPersonality {
  messageCategories: {
    [key: string]: {
      [context: string]: string[];
    };
  };
  celebrationThresholds: {
    firstTask: boolean;
    dailyStreak: number[];
    weeklyGoal: number;
    difficultyMilestone: string[];
  };
}

// Enhanced message system based on user context
export const enhancedStuMessages: StuPersonality['messageCategories'] = {
  quickCapture: {
    firstTime: [
      "Welcome to MemoSpark! I'm Stu, your friendly study koala! 🐨 Let's create your very first task together!",
      "Hi there! I'm excited to help you on your learning journey! What would you like to work on first? 🌟",
      "Welcome aboard! I'm here to make studying fun and organized. Ready to create your first task? 🚀"
    ],
    returning: [
      "Welcome back! Ready to tackle another task? Let's make today productive! 📚",
      "Great to see you again! What's on your study agenda today? 💫",
      "Back for more learning? I love your dedication! What shall we work on? ⭐"
    ],
    productive: [
      "Wow! You're on fire today! 🔥 Your {count} task - you're building amazing momentum!",
      "Look at you go! Task #{count} coming up! Your productivity is inspiring! 💪",
      "You're unstoppable today! This makes {count} tasks - keep the energy flowing! ⚡"
    ],
    morning: [
      "Good morning, early bird! 🌅 Starting the day with a task is a great habit!",
      "Morning motivation time! ☀️ Let's set the tone for a productive day!",
      "Rise and shine! 🌞 I love how you're tackling tasks first thing!"
    ],
    evening: [
      "Evening study session? 🌙 Perfect time to wrap up the day with some learning!",
      "Night owl mode activated! 🦉 Let's make this evening productive!",
      "End the day strong! 🌟 What would you like to accomplish before bed?"
    ],
    streak: [
      "Amazing! Day {days} of your study streak! 🔥 You're building incredible habits!",
      "Streak master! 🏆 {days} days in a row - you're absolutely crushing it!",
      "Your {days}-day streak is inspiring! 💎 Consistency is the key to success!"
    ]
  },
  aiSuggestions: {
    highConfidence: [
      "I found some excellent suggestions! 🎯 My algorithms are very confident about these!",
      "These recommendations look perfect for you! 🌟 Based on your patterns, they'll be great!",
      "Exciting news! 🚀 I've discovered some highly-tailored suggestions just for you!"
    ],
    mediumConfidence: [
      "I have some good ideas that might help! 💡 Take a look and see what resonates!",
      "Here are some suggestions worth considering! 🤔 They align well with your style!",
      "Found a few promising options! ✨ Let's see which ones spark your interest!"
    ],
    lowConfidence: [
      "I have a few gentle suggestions! 🌱 Sometimes the simple approach works best!",
      "Here are some basic ideas to consider! 💭 Trust your instincts on what feels right!",
      "No pressure, but here are some light recommendations! 🍃 You know yourself best!"
    ],
    noSuggestions: [
      "Your task looks perfect as is! ✨ Sometimes simplicity is the best approach!",
      "No suggestions needed - you've got this covered! 👍 Your instincts are spot on!",
      "Everything looks great! 🌟 Trust your planning - it's exactly what you need!"
    ],
    contextual: [
      "Based on your {taskType} tasks, I recommend breaking this into smaller chunks! 📋",
      "Since you often work on {subject} in the {timeOfDay}, this timing looks perfect! ⏰",
      "Your success rate with {priority} priority tasks is excellent - great choice! 📈"
    ]
  },
  celebration: {
    firstTask: [
      "🎉 Congratulations on your very first task! This is the beginning of something amazing!",
      "🌟 Welcome to the world of organized learning! Your first task is complete!",
      "🚀 First task down! You're officially on your way to academic success!"
    ],
    dailyStreak: [
      "🔥 {count} tasks today! You're having an incredibly productive day!",
      "⚡ Task #{count} complete! Your energy today is absolutely infectious!",
      "💫 Another one done! That's {count} tasks - you're in the zone!"
    ],
    weeklyMilestone: [
      "🏆 Incredible! You've completed {count} tasks this week! You're a champion!",
      "👑 Weekly goal smashed! {count} tasks completed - you're royalty in my book!",
      "🎯 Bulls-eye! {count} tasks this week means you're hitting all your targets!"
    ],
    timeRecord: [
      "⏱️ New personal record! You completed this in just {time} minutes!",
      "🏃‍♂️ Speed demon! That was your fastest {taskType} task yet!",
      "⚡ Lightning fast! You're getting more efficient every day!"
    ],
    difficulty: [
      "💪 Wow! You just conquered a challenging task! Your growth is remarkable!",
      "🧠 Brain power activated! Complex tasks are no match for your dedication!",
      "🎖️ Challenge accepted and completed! You're building serious mental strength!"
    ]
  },
  encouragement: {
    general: [
      "You're building incredible study habits! 🌱 Every task is a step forward!",
      "I believe in you completely! 💙 Your dedication is truly inspiring!",
      "Keep that amazing momentum going! 🌊 You're riding the wave of success!",
      "Your consistency is your superpower! ⚡ Small steps lead to big victories!",
      "I'm so proud of your progress! 🌟 You're becoming the student you've always wanted to be!"
    ]
  }
};

// Default user context for new users
export const getDefaultUserContext = (): UserContext => ({
  totalTasks: 0,
  tasksCompletedToday: 0,
  currentStreak: 0,
  averageSuggestionConfidence: 0.5,
  preferredTaskTypes: [],
  completionTimes: {},
  isFirstTimeUser: true,
  stuPreferences: {
    showCelebrations: true,
    messageFrequency: 'normal',
    messageDuration: 'medium',
    enableSounds: false,
    preferredTone: 'encouraging'
  }
});

// Utility functions for context management
export const updateUserContext = (
  context: UserContext, 
  action: 'taskCreated' | 'taskCompleted' | 'suggestionAccepted',
  data?: any
): UserContext => {
  const now = new Date();
  const today = now.toDateString();
  const lastCompletionDate = context.lastCompletionTime?.toDateString();
  
  switch (action) {
    case 'taskCreated':
      return {
        ...context,
        totalTasks: context.totalTasks + 1,
        isFirstTimeUser: context.totalTasks === 0,
        lastLoginDate: now
      };
      
    case 'taskCompleted': {
      const isNewDay = lastCompletionDate !== today;
      return {
        ...context,
        tasksCompletedToday: isNewDay ? 1 : context.tasksCompletedToday + 1,
        currentStreak: isNewDay && lastCompletionDate ? context.currentStreak + 1 : context.currentStreak || 1,
        lastCompletionTime: now,
        completionTimes: {
          ...context.completionTimes,
          [now.getHours()]: (context.completionTimes[now.getHours()] || 0) + 1
        }
      };
    }
      
    case 'suggestionAccepted': {
      const totalAcceptances = Object.values(context.completionTimes).reduce((a, b) => a + b, 0) || 1;
      return {
        ...context,
        averageSuggestionConfidence: (context.averageSuggestionConfidence * totalAcceptances + (data?.confidence || 0.5)) / (totalAcceptances + 1)
      };
    }
      
    default:
      return context;
  }
};

// Context-aware message selection
export const getContextualMessage = (
  category: string,
  subcategory: string,
  context: UserContext,
  replacements: { [key: string]: string | number } = {}
): string => {
  const messages = enhancedStuMessages[category]?.[subcategory];
  if (!messages || messages.length === 0) return '';
  
  let message = messages[Math.floor(Math.random() * messages.length)];
  
  // Replace placeholders with actual values
  Object.entries(replacements).forEach(([key, value]) => {
    message = message.replace(new RegExp(`{${key}}`, 'g'), value.toString());
  });
  
  return message;
};

// User preference utilities
export const updateStuPreferences = (
  context: UserContext,
  preferences: Partial<UserContext['stuPreferences']>
): UserContext => ({
  ...context,
  stuPreferences: {
    ...context.stuPreferences,
    ...preferences
  }
});

// Local storage helpers for persistence
export const saveUserContext = (context: UserContext): void => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('memospark_user_context', JSON.stringify(context));
    } catch (error) {
      console.warn('Failed to save user context:', error);
    }
  }
};

export const loadUserContext = (): UserContext => {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('memospark_user_context');
      if (saved) {
        return { ...getDefaultUserContext(), ...JSON.parse(saved) };
      }
    } catch (error) {
      console.warn('Failed to load user context:', error);
    }
  }
  return getDefaultUserContext();
}; 