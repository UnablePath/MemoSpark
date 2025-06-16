import { coinEconomy } from './CoinEconomy';

interface AchievementTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  points: number;
  requirements: any;
  reward: any;
  hidden: boolean;
  repeatable: boolean;
}

interface UserAchievement {
  id: string;
  userId: string;
  templateId: string;
  name: string;
  description: string;
  unlocked: boolean;
  progress: number;
  total: number;
  unlockedAt?: string;
  metadata?: any;
}

interface UserStats {
  tasksCompleted: number;
  consecutiveDays: number;
  longestStreak: number;
  level: number;
  totalPoints: number;
  subjectTasks: Record<string, number>;
  dailyTasks: number;
  studyGroupsJoined: number;
  studentsHelped: number;
  featuresUsed: number;
  totalCoinsEarned: number;
  coinsBalance: number;
  weekendTasksCompleted: number;
  lateNightTasks: number;
  earlyMorningTasks: number;
  perfectWeeks: number;
  studyMethodsUsed: number;
  dailyConsistencyDays: number;
  currentDailyMinimum: number;
  [key: string]: any;
}

export class AchievementProcessor {
  private templates: AchievementTemplate[] = [];
  private userAchievements: Map<string, UserAchievement[]> = new Map();

  constructor() {
    this.loadTemplates();
  }

  private loadTemplates(): void {
    this.templates = [
      {
        id: 'first_steps',
        name: 'First Steps',
        description: 'Complete your first task',
        category: 'streak',
        icon: 'zap',
        rarity: 'common',
        points: 10,
        requirements: { type: 'tasks_completed', count: 1 },
        reward: { coins: 50 },
        hidden: false,
        repeatable: false
      },
      {
        id: 'week_warrior',
        name: 'Week Warrior',
        description: 'Maintain a 7-day streak',
        category: 'streak',
        icon: 'fire',
        rarity: 'rare',
        points: 50,
        requirements: { type: 'consecutive_days', count: 7 },
        reward: { coins: 200 },
        hidden: false,
        repeatable: false
      },
      {
        id: 'speed_runner',
        name: 'Speed Runner',
        description: 'Complete 5 tasks in one day',
        category: 'speed',
        icon: 'zap',
        rarity: 'rare',
        points: 50,
        requirements: { type: 'daily_tasks', count: 5 },
        reward: { coins: 150 },
        hidden: false,
        repeatable: true
      },
      {
        id: 'getting_started',
        name: 'Getting Started',
        description: 'Maintain a 3-day streak',
        category: 'streak',
        icon: 'fire',
        rarity: 'common',
        points: 25,
        requirements: { type: 'consecutive_days', count: 3 },
        reward: { coins: 100 },
        hidden: false,
        repeatable: false
      },
      {
        id: 'task_rookie',
        name: 'Task Rookie',
        description: 'Complete 10 tasks',
        category: 'tasks',
        icon: 'check-circle',
        rarity: 'common',
        points: 20,
        requirements: { type: 'tasks_completed', count: 10 },
        reward: { coins: 75 },
        hidden: false,
        repeatable: false
      },
      {
        id: 'math_whiz',
        name: 'Math Whiz',
        description: 'Complete 25 math tasks',
        category: 'subjects',
        icon: 'calculator',
        rarity: 'rare',
        points: 60,
        requirements: { type: 'subject_tasks', subject: 'Mathematics', count: 25 },
        reward: { coins: 200 },
        hidden: false,
        repeatable: false
      },
      {
        id: 'night_owl',
        name: 'Night Owl',
        description: 'Complete a task after 10 PM',
        category: 'special',
        icon: 'moon',
        rarity: 'common',
        points: 25,
        requirements: { type: 'late_night_task', hour: 22 },
        reward: { coins: 75 },
        hidden: false,
        repeatable: true
      },
      {
        id: 'early_bird',
        name: 'Early Bird',
        description: 'Complete a task before 7 AM',
        category: 'special',
        icon: 'sunrise',
        rarity: 'common',
        points: 25,
        requirements: { type: 'early_task', hour: 7 },
        reward: { coins: 75 },
        hidden: false,
        repeatable: true
      },
      {
        id: 'level_up_5',
        name: 'Level Up',
        description: 'Reach level 5',
        category: 'progression',
        icon: 'trending-up',
        rarity: 'common',
        points: 30,
        requirements: { type: 'level_reached', level: 5 },
        reward: { coins: 100 },
        hidden: false,
        repeatable: false
      },
      {
        id: 'coin_collector',
        name: 'Coin Collector',
        description: 'Earn 5000 total coins',
        category: 'coins',
        icon: 'coins',
        rarity: 'epic',
        points: 150,
        requirements: { type: 'total_coins_earned', amount: 5000 },
        reward: { coins: 500 },
        hidden: false,
        repeatable: false
      }
    ];
  }

  async checkAchievements(userId: string, userStats: UserStats): Promise<string[]> {
    const newAchievements: string[] = [];
    
    for (const template of this.templates) {
      if (this.evaluateAchievement(template, userStats)) {
        newAchievements.push(template.name);
        await this.awardAchievement(userId, template);
      }
    }
    
    return newAchievements;
  }

  private evaluateAchievement(template: AchievementTemplate, stats: UserStats): boolean {
    const req = template.requirements;
    
    switch (req.type) {
      case 'tasks_completed':
        return stats.tasksCompleted >= req.count;
      case 'consecutive_days':
        return stats.consecutiveDays >= req.count;
      case 'daily_tasks':
        return stats.dailyTasks >= req.count;
      case 'subject_tasks':
        return stats.subjectTasks[req.subject] >= req.count;
      case 'late_night_task':
        return stats.lateNightTasks > 0;
      case 'early_task':
        return stats.earlyMorningTasks > 0;
      case 'level_reached':
        return stats.level >= req.level;
      case 'total_coins_earned':
        return stats.totalCoinsEarned >= req.amount;
      case 'study_groups_joined':
        return stats.studyGroupsJoined > 0;
      case 'students_helped':
        return stats.studentsHelped > 0;
      case 'features_used':
        return stats.featuresUsed > 0;
      case 'coins_saved':
        return stats.coinsBalance >= req.amount;
      default:
        return false;
    }
  }

  private async awardAchievement(userId: string, template: AchievementTemplate): Promise<void> {
    if (template.reward?.coins) {
      await coinEconomy.addCoins(
        userId,
        template.reward.coins,
        'achievement',
        `Achievement: ${template.name}`,
        template.id
      );
    }
  }

  async processUserAction(userId: string, action: string, data: any = {}): Promise<string[]> {
    const userStats = await this.getUserStats(userId);
    
    switch (action) {
      case 'task_completed':
        userStats.tasksCompleted += 1;
        userStats.dailyTasks += 1;
        
        // Check for subject-specific tasks
        if (data.subject) {
          userStats.subjectTasks[data.subject] = (userStats.subjectTasks[data.subject] || 0) + 1;
        }
        
        // Check for time-based achievements
        const hour = new Date().getHours();
        if (hour >= 22 || hour <= 2) {
          userStats.lateNightTasks += 1;
        }
        if (hour <= 7) {
          userStats.earlyMorningTasks += 1;
        }
        break;
      case 'streak_updated':
        userStats.consecutiveDays = data.currentStreak || 0;
        userStats.longestStreak = Math.max(userStats.longestStreak, userStats.consecutiveDays);
        break;
      case 'level_up':
        userStats.level = data.newLevel || userStats.level + 1;
        break;
      case 'coins_earned':
        userStats.totalCoinsEarned += data.amount || 0;
        userStats.coinsBalance = data.newBalance || userStats.coinsBalance;
        break;
      case 'study_group_joined':
        userStats.studyGroupsJoined += 1;
        break;
      case 'student_helped':
        userStats.studentsHelped += 1;
        break;
      case 'feature_used':
        userStats.featuresUsed += 1;
        break;
    }
    
    return await this.checkAchievements(userId, userStats);
  }

  private async getUserStats(userId: string): Promise<UserStats> {
    return {
      tasksCompleted: 0,
      consecutiveDays: 0,
      longestStreak: 0,
      level: 1,
      totalPoints: 0,
      subjectTasks: {},
      dailyTasks: 0,
      studyGroupsJoined: 0,
      studentsHelped: 0,
      featuresUsed: 0,
      totalCoinsEarned: 0,
      coinsBalance: 0,
      weekendTasksCompleted: 0,
      lateNightTasks: 0,
      earlyMorningTasks: 0,
      perfectWeeks: 0,
      studyMethodsUsed: 0,
      dailyConsistencyDays: 0,
      currentDailyMinimum: 0
    };
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  // Public methods for external use
  async getUserAchievements(userId: string): Promise<UserAchievement[]> {
    return this.userAchievements.get(userId) || [];
  }

  async getAchievementTemplates(): Promise<AchievementTemplate[]> {
    return this.templates;
  }

  async createCustomAchievement(template: Omit<AchievementTemplate, 'id'>): Promise<string> {
    const id = this.generateId();
    const newTemplate: AchievementTemplate = {
      id,
      ...template
    };
    
    this.templates.push(newTemplate);
    
    return id;
  }

  async updateAchievementTemplate(id: string, updates: Partial<AchievementTemplate>): Promise<boolean> {
    const index = this.templates.findIndex(t => t.id === id);
    if (index === -1) return false;
    
    this.templates[index] = { ...this.templates[index], ...updates };
    
    return true;
  }

  async deleteAchievementTemplate(id: string): Promise<boolean> {
    const index = this.templates.findIndex(t => t.id === id);
    if (index === -1) return false;
    
    this.templates.splice(index, 1);
    
    return true;
  }
}

export const achievementProcessor = new AchievementProcessor(); 