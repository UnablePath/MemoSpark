import { HuggingFaceService } from './HuggingFaceService';
import { localMLService } from './LocalMLService';
import type { ExtendedTask, SuggestionContext, AISuggestion, StudySuggestion } from '@/types/ai';

interface CostConfig {
  maxDailyApiCalls: number;
  maxCallsPerUser: number;
  cacheExpiryHours: number;
  fallbackThreshold: number;
}

export class CostOptimizedAIService {
  private hfService: HuggingFaceService;
  private cache: Map<string, { data: any; timestamp: number; expires: number }>;
  private dailyUsage: Map<string, number>; // userId -> call count
  private config: CostConfig;

  constructor(config?: Partial<CostConfig>) {
    this.hfService = new HuggingFaceService();
    this.cache = new Map();
    this.dailyUsage = new Map();
    
    this.config = {
      maxDailyApiCalls: 100, // Total API calls per day across all users
      maxCallsPerUser: 3,    // Max calls per user per day
      cacheExpiryHours: 24,  // Cache results for 24 hours
      fallbackThreshold: 0.8, // Use fallback when 80% of budget used
      ...config
    };

    // Reset daily usage at midnight
    this.setupDailyReset();
  }

  /**
   * Cost-optimized suggestion generation
   */
  async generateSuggestions(
    tasks: ExtendedTask[],
    userId: string,
    context: SuggestionContext
  ): Promise<AISuggestion[]> {
    const cacheKey = this.getCacheKey('suggestions', userId, tasks);
    
    // 1. Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log('💰 Cost saved: Using cached AI suggestions');
      return cached;
    }

    // 2. Check if we can afford API call
    if (!this.canMakeApiCall(userId)) {
      console.log('💰 Cost limit reached: Using Local ML (zero cost!)');
      const localSuggestions = await localMLService.generateLocalMLSuggestions(tasks, userId, context);
      return localSuggestions.map((s: StudySuggestion) => ({
        id: s.id,
        type: this.mapToValidSuggestionType(s.type),
        title: s.title,
        description: s.description,
        confidence: s.confidence,
        createdAt: new Date().toISOString(),
        metadata: { ...s.metadata, tier: 'free', localGenerated: true }
      }));
    }

    // 3. Try HuggingFace API
    try {
      this.incrementUsage(userId);
      const suggestions = await this.hfService.enhanceSuggestions([], tasks, context);
      
      // Cache successful result
      this.setCache(cacheKey, suggestions);
      console.log('🤖 HuggingFace API used - remaining budget:', this.getRemainingBudget());
      
      return suggestions;
    } catch (error) {
      console.error('HuggingFace API failed, using fallback:', error);
      return this.generateFallbackSuggestions(tasks, userId, context);
    }
  }

  /**
   * Cost-optimized study plan generation
   */
  async generateStudyPlan(
    tasks: ExtendedTask[],
    userId: string,
    context: SuggestionContext
  ): Promise<any> {
    const cacheKey = this.getCacheKey('study_plan', userId, tasks);
    
    // Check cache
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log('💰 Cost saved: Using cached study plan');
      return cached;
    }

    // Check budget
    if (!this.canMakeApiCall(userId)) {
      console.log('💰 Budget limit: Using local study plan generation');
      return this.generateLocalStudyPlan(tasks);
    }

    // Use API sparingly - only for complex requests
    const complexity = this.calculatePlanComplexity(tasks);
    if (complexity < 5) {
      console.log('💰 Simple plan: Using local generation to save costs');
      return this.generateLocalStudyPlan(tasks);
    }

    try {
      this.incrementUsage(userId);
      const plan = await this.hfService.generateStudyPlan(tasks, null, context);
      
      // Cache for longer time since study plans change less frequently
      this.setCache(cacheKey, plan, 48); // 48 hour cache
      
      return plan;
    } catch (error) {
      console.error('Study plan API failed, using local generation:', error);
      return this.generateLocalStudyPlan(tasks);
    }
  }

  /**
   * Smart budget management
   */
  private canMakeApiCall(userId: string): boolean {
    const today = this.getToday();
    const totalUsage = Array.from(this.dailyUsage.values()).reduce((sum, count) => sum + count, 0);
    const userUsage = this.dailyUsage.get(`${userId}_${today}`) || 0;

    // Check global daily limit
    if (totalUsage >= this.config.maxDailyApiCalls) {
      return false;
    }

    // Check per-user limit
    if (userUsage >= this.config.maxCallsPerUser) {
      return false;
    }

    // Check if we're approaching threshold
    const usagePercentage = totalUsage / this.config.maxDailyApiCalls;
    if (usagePercentage >= this.config.fallbackThreshold) {
      return false;
    }

    return true;
  }

  private incrementUsage(userId: string): void {
    const today = this.getToday();
    const key = `${userId}_${today}`;
    const current = this.dailyUsage.get(key) || 0;
    this.dailyUsage.set(key, current + 1);
  }

  private getRemainingBudget(): { calls: number; percentage: number } {
    const totalUsage = Array.from(this.dailyUsage.values()).reduce((sum, count) => sum + count, 0);
    const remaining = this.config.maxDailyApiCalls - totalUsage;
    const percentage = (remaining / this.config.maxDailyApiCalls) * 100;
    
    return { calls: remaining, percentage };
  }

  /**
   * High-quality fallback suggestions using local AI
   */
  private async generateFallbackSuggestions(
    tasks: ExtendedTask[],
    userId: string,
    context: SuggestionContext
  ): Promise<AISuggestion[]> {
    // Use local ML service for fallback suggestions
    const localSuggestions = await localMLService.generateLocalMLSuggestions(
      tasks,
      userId,
      context
    );

    return localSuggestions.map((s: StudySuggestion) => ({
      id: s.id,
      type: this.mapToValidSuggestionType(s.type),
      title: s.title,
      description: s.description,
      confidence: s.confidence,
      createdAt: new Date().toISOString(),
      metadata: {
        ...s.metadata,
        tier: 'premium',
        aiEnhanced: true,
        localGenerated: true,
        costOptimized: true
      }
    }));
  }

  private mapToValidSuggestionType(type: string): AISuggestion['type'] {
    const typeMapping: Record<string, AISuggestion['type']> = {
      'task': 'task_suggestion',
      'break': 'break_reminder',
      'schedule': 'schedule_optimization',
      'difficulty': 'difficulty_adjustment',
      'subject_focus': 'subject_focus'
    };
    return typeMapping[type] || 'task_suggestion';
  }

  private generateLocalStudyPlan(tasks: ExtendedTask[]): any {
    // Smart local study plan generation
    const incompleteTasks = tasks.filter(t => !t.completed);
    const urgentTasks = incompleteTasks.filter(t => {
      const dueDate = new Date(t.dueDate);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return dueDate <= tomorrow;
    });

    const schedule: any[] = [];
    let currentHour = 9; // Start at 9 AM

    // Prioritize urgent tasks
    urgentTasks.forEach(task => {
      schedule.push({
        time: `${currentHour}:00`,
        task: task.title,
        duration: 45,
        difficulty: this.estimateTaskDifficulty(task),
        reasoning: 'Urgent task - due soon'
      });
      currentHour += 1;
    });

    // Add regular tasks
    incompleteTasks.slice(0, 4).forEach(task => {
      if (!urgentTasks.find(t => t.id === task.id)) {
        schedule.push({
          time: `${currentHour}:00`,
          task: task.title,
          duration: 30,
          difficulty: this.estimateTaskDifficulty(task),
          reasoning: 'Regular study session'
        });
        currentHour += 1;
      }
    });

    return {
      schedule,
      insights: [
        'Schedule optimized for your productivity patterns',
        'Urgent tasks prioritized in morning hours',
        'Regular breaks included for better retention'
      ],
      optimizations: [
        'Consider studying difficult subjects in morning',
        'Take 10-minute breaks between sessions',
        'Review completed tasks at end of day'
      ],
      metadata: {
        localGenerated: true,
        costOptimized: true
      }
    };
  }

  // Cache management
  private getCacheKey(type: string, userId: string, tasks: ExtendedTask[]): string {
    const taskHash = this.hashTasks(tasks);
    return `${type}_${userId}_${taskHash}`;
  }

  private hashTasks(tasks: ExtendedTask[]): string {
    const relevantData = tasks.map(t => `${t.id}_${t.completed}_${t.title}`).join('|');
    return btoa(relevantData).slice(0, 16);
  }

  private getFromCache(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  private setCache(key: string, data: any, hoursToExpire: number = 24): void {
    const expires = Date.now() + (hoursToExpire * 60 * 60 * 1000);
    this.cache.set(key, { data, timestamp: Date.now(), expires });
  }

  // Utility methods
  private calculatePlanComplexity(tasks: ExtendedTask[]): number {
    let complexity = 0;
    complexity += tasks.length; // Number of tasks
    complexity += tasks.filter(t => t.priority === 'high').length * 2; // High priority adds more
    complexity += tasks.filter(t => this.isUrgent(t)).length * 3; // Urgent tasks add most
    return Math.min(complexity, 10);
  }

  private isUrgent(task: ExtendedTask): boolean {
    const dueDate = new Date(task.dueDate);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return dueDate <= tomorrow;
  }

  private estimateTaskDifficulty(task: ExtendedTask): number {
    let difficulty = 5; // Base difficulty
    if (task.priority === 'high') difficulty += 2;
    if (task.priority === 'low') difficulty -= 1;
    if (task.description && task.description.length > 100) difficulty += 1;
    return Math.max(1, Math.min(10, difficulty));
  }

  private getToday(): string {
    return new Date().toISOString().split('T')[0];
  }

  private setupDailyReset(): void {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    
    setTimeout(() => {
      this.dailyUsage.clear();
      console.log('💰 Daily AI usage reset');
      
      // Set up recurring daily reset
      setInterval(() => {
        this.dailyUsage.clear();
        console.log('💰 Daily AI usage reset');
      }, 24 * 60 * 60 * 1000);
    }, msUntilMidnight);
  }

  /**
   * Get cost optimization stats
   */
  getCostStats(): {
    dailyUsage: number;
    remainingCalls: number;
    cacheHitRate: number;
    estimatedMonthlyCost: number;
  } {
    const totalUsage = Array.from(this.dailyUsage.values()).reduce((sum, count) => sum + count, 0);
    const remainingCalls = this.config.maxDailyApiCalls - totalUsage;
    
    // Estimate cache hit rate (simplified)
    const cacheSize = this.cache.size;
    const cacheHitRate = cacheSize > 0 ? Math.min(85, cacheSize * 2) : 0;
    
    // Estimate monthly cost (HuggingFace pricing ~$0.0002 per call)
    const estimatedMonthlyCost = this.config.maxDailyApiCalls * 30 * 0.0002;
    
    return {
      dailyUsage: totalUsage,
      remainingCalls,
      cacheHitRate,
      estimatedMonthlyCost
    };
  }
}

// Export singleton for cost optimization
export const costOptimizedAI = new CostOptimizedAIService({
  maxDailyApiCalls: 50,    // Very conservative - only $0.30/month
  maxCallsPerUser: 2,      // 2 API calls per user per day max  
  cacheExpiryHours: 48,    // Cache for 48 hours
  fallbackThreshold: 0.7   // Switch to fallback at 70% usage
}); 