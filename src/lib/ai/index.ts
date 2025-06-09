// Import engine classes first
import {
  PatternRecognitionEngine,
  patternEngine,
  type TimePattern,
  type DifficultyProfile,
  type SubjectInsights,
  type PatternData,
  type Task,
  type ClassTimetableEntry,
  type UserPreferences
} from './patternEngine';

import {
  SuggestionEngine,
  suggestionEngine,
  type StudySuggestion,
  type SuggestionContext
} from './suggestionEngine';

// Import onboarding functionality
import {
  OnboardingManager,
  OnboardingUtils,
  ONBOARDING_QUESTIONS,
  type OnboardingQuestion,
  type OnboardingResponse
} from './onboarding';

// Export all types and interfaces
export type {
  TimePattern,
  DifficultyProfile,
  SubjectInsights,
  PatternData,
  Task,
  ClassTimetableEntry,
  UserPreferences,
  StudySuggestion,
  SuggestionContext,
  OnboardingQuestion,
  OnboardingResponse
};

// Export engine classes and instances
export {
  PatternRecognitionEngine,
  patternEngine,
  SuggestionEngine,
  suggestionEngine
};

// Export onboarding functionality
export {
  OnboardingManager,
  OnboardingUtils,
  ONBOARDING_QUESTIONS
};

// Main AI service class that orchestrates pattern analysis and suggestion generation
export class StudySparkAI {
  private patternEngine: PatternRecognitionEngine;
  private suggestionEngine: SuggestionEngine;

  constructor() {
    this.patternEngine = patternEngine;
    this.suggestionEngine = suggestionEngine;
  }

  /**
   * Main entry point for AI functionality - Enhanced for first-day users
   */
  async generateRecommendations(
    tasks: Task[], 
    userId: string,
    timetable: ClassTimetableEntry[] = [],
    userPreferences?: UserPreferences
  ): Promise<{
    patterns: PatternData;
    suggestions: StudySuggestion[];
    newUser: boolean;
    onboardingNeeded: boolean;
  }> {
    // Check if this is a new user
    const isNewUser = !OnboardingManager.isOnboardingCompleted();
    const needsOnboarding = isNewUser && !userPreferences;

    // Get user preferences from onboarding or parameters
    let preferences = userPreferences;
    if (!preferences && !isNewUser) {
      const savedResponses = OnboardingManager.getOnboardingResponses();
      if (savedResponses.length > 0) {
        preferences = OnboardingManager.convertResponsesToPreferences(savedResponses);
      }
    }

    // Analyze patterns with enhanced multi-source intelligence
    const patterns = this.patternEngine.analyzePatterns(tasks, userId, timetable, preferences);
    
    // Generate suggestions with correct parameters
    const suggestions = this.suggestionEngine.generateSuggestions(patterns, {
      currentTime: new Date(),
      upcomingTasks: tasks.filter(t => !t.completed),
      recentActivity: tasks.filter(t => t.completed).slice(-10),
      userPreferences: preferences ? {
        preferredSessionLength: preferences.sessionLengthPreference === 'short' ? 30 : 
                               preferences.sessionLengthPreference === 'long' ? 60 : 45,
        maxSuggestionsPerDay: 5,
        enableBreakReminders: preferences.breakFrequency !== 'minimal',
        preferredDifficulty: preferences.difficultyComfort === 'easy' ? 3 :
                           preferences.difficultyComfort === 'challenging' ? 7 : 5
      } : undefined
    });

    return {
      patterns,
      suggestions,
      newUser: isNewUser,
      onboardingNeeded: needsOnboarding
    };
  }

  /**
   * Quick setup for new users using timetable data
   */
  quickSetupForNewUser(
    timetable: ClassTimetableEntry[] = [],
    studyTimePreference: 'morning' | 'afternoon' | 'evening' | 'night' = 'afternoon'
  ): UserPreferences {
    const responses = OnboardingManager.generateQuickSetupResponses(studyTimePreference, timetable);
    OnboardingManager.saveOnboardingResponses(responses);
    OnboardingManager.markOnboardingCompleted();
    
    return OnboardingManager.convertResponsesToPreferences(responses);
  }

  /**
   * Complete onboarding process
   */
  completeOnboarding(responses: OnboardingResponse[]): {
    success: boolean;
    preferences: UserPreferences;
    errors: string[];
    warnings: string[];
  } {
    const validation = OnboardingManager.validateResponses(responses);
    
    if (validation.isValid) {
      OnboardingManager.saveOnboardingResponses(responses);
      OnboardingManager.markOnboardingCompleted();
      
      const preferences = OnboardingManager.convertResponsesToPreferences(responses);
      this.patternEngine.saveUserPreferences(preferences);
      
      return {
        success: true,
        preferences,
        errors: [],
        warnings: validation.warnings
      };
    }
    
    return {
      success: false,
      preferences: OnboardingManager.getIntelligentDefaults(),
      errors: validation.errors,
      warnings: validation.warnings
    };
  }

  /**
   * Get intelligent first-day suggestions for new users
   */
  getFirstDaySuggestions(
    tasks: Task[] = [],
    timetable: ClassTimetableEntry[] = [],
    preferences?: UserPreferences
  ): StudySuggestion[] {
    // Use preferences or intelligent defaults
    const userPrefs = preferences || OnboardingManager.getIntelligentDefaults(timetable);
    
    // Create temporary patterns for first-day users
    const temporaryPatterns: PatternData = {
      userId: 'temp',
      lastAnalyzed: new Date().toISOString(),
      timePattern: {
        mostProductiveHours: userPrefs.availableStudyHours.slice(0, 3),
        preferredStudyDuration: userPrefs.sessionLengthPreference === 'short' ? 30 :
                            userPrefs.sessionLengthPreference === 'long' ? 60 : 45,
        averageBreakTime: userPrefs.breakFrequency === 'frequent' ? 25 :
                               userPrefs.breakFrequency === 'minimal' ? 90 : 45,
        peakPerformanceDays: ['Monday', 'Tuesday', 'Wednesday'],
        consistencyScore: 0.6
      },
      difficultyProfile: {
        averageTaskDifficulty: userPrefs.difficultyComfort === 'easy' ? 3 :
                                  userPrefs.difficultyComfort === 'challenging' ? 7 : 5,
        difficultyTrend: 'stable',
        subjectDifficultyMap: {},
        adaptationRate: 0.5
      },
      subjectInsights: {
        preferredSubjects: userPrefs.preferredSubjects,
        strugglingSubjects: userPrefs.strugglingSubjects,
        subjectPerformance: {}
      },
      totalTasksAnalyzed: 0,
      dataQuality: 0.6
    };

    // Generate first-day suggestions with correct parameters
    return this.suggestionEngine.generateSuggestions(temporaryPatterns, {
      currentTime: new Date(),
      upcomingTasks: tasks.filter(t => !t.completed),
      recentActivity: [],
      userPreferences: {
        preferredSessionLength: userPrefs.sessionLengthPreference === 'short' ? 30 : 
                               userPrefs.sessionLengthPreference === 'long' ? 60 : 45,
        maxSuggestionsPerDay: 5,
        enableBreakReminders: userPrefs.breakFrequency !== 'minimal',
        preferredDifficulty: userPrefs.difficultyComfort === 'easy' ? 3 :
                           userPrefs.difficultyComfort === 'challenging' ? 7 : 5
      }
    });
  }

  /**
   * Get onboarding status and progress
   */
  getOnboardingStatus(): {
    completed: boolean;
    progress?: {
      completed: number;
      total: number;
      percentage: number;
    };
    preferences?: UserPreferences;
  } {
    const completed = OnboardingManager.isOnboardingCompleted();
    
    if (completed) {
      const responses = OnboardingManager.getOnboardingResponses();
      const preferences = OnboardingManager.convertResponsesToPreferences(responses);
      return { completed: true, preferences };
    }
    
    const responses = OnboardingManager.getOnboardingResponses();
    const progress = OnboardingManager.getOnboardingProgress(responses);
    
    return {
      completed: false,
      progress: {
        completed: progress.completed,
        total: progress.total,
        percentage: progress.percentage
      }
    };
  }

  /**
   * Main entry point for AI functionality
   * Analyzes patterns and generates suggestions in one call
   */
  async generateIntelligentSuggestions(
    tasks: Task[],
    userId: string,
    context: SuggestionContext
  ): Promise<{
    patterns: PatternData;
    suggestions: StudySuggestion[];
    performance: {
      analysisTime: number;
      suggestionTime: number;
      totalTime: number;
    };
  }> {
    const startTime = Date.now();

    // First, analyze patterns
    const patternStartTime = Date.now();
    const patterns = this.patternEngine.analyzePatterns(tasks, userId);
    const patternEndTime = Date.now();

    // Then, generate suggestions based on patterns
    const suggestionStartTime = Date.now();
    let suggestions = this.suggestionEngine.generateSuggestions(patterns, context);
    
    // Filter suggestions by context
    suggestions = this.suggestionEngine.filterSuggestionsByContext(suggestions, context);
    const suggestionEndTime = Date.now();

    const endTime = Date.now();

    return {
      patterns,
      suggestions,
      performance: {
        analysisTime: patternEndTime - patternStartTime,
        suggestionTime: suggestionEndTime - suggestionStartTime,
        totalTime: endTime - startTime
      }
    };
  }

  /**
   * Get cached patterns without re-analysis (for performance)
   */
  getCachedPatterns(): PatternData | null {
    return this.patternEngine.getCachedPatterns();
  }

  /**
   * Generate suggestions using cached patterns
   */
  generateQuickSuggestions(context: SuggestionContext): StudySuggestion[] {
    const cachedPatterns = this.getCachedPatterns();
    if (!cachedPatterns) {
      return [];
    }

    const suggestions = this.suggestionEngine.generateSuggestions(cachedPatterns, context);
    return this.suggestionEngine.filterSuggestionsByContext(suggestions, context);
  }

  /**
   * Generate follow-up suggestions after user accepts a suggestion
   */
  generateFollowUpSuggestions(
    acceptedSuggestion: StudySuggestion,
    context: SuggestionContext
  ): StudySuggestion[] {
    return this.suggestionEngine.generateFollowUpSuggestions(acceptedSuggestion, context);
  }

  /**
   * Clear all cached data (useful for testing or user reset)
   */
  clearCache(): void {
    this.patternEngine.clearPatterns();
  }

  /**
   * Get AI system health and data quality information
   */
  getSystemHealth(): {
    hasPatterns: boolean;
    dataQuality: number;
    lastAnalyzed: string | null;
    totalTasksAnalyzed: number;
    storageUsage: number; // bytes
  } {
    const patterns = this.getCachedPatterns();
    const storageUsage = this.calculateStorageUsage();

    return {
      hasPatterns: !!patterns,
      dataQuality: patterns?.dataQuality || 0,
      lastAnalyzed: patterns?.lastAnalyzed || null,
      totalTasksAnalyzed: patterns?.totalTasksAnalyzed || 0,
      storageUsage
    };
  }

  /**
   * Calculate current localStorage usage for AI data
   */
  private calculateStorageUsage(): number {
    try {
      const stored = localStorage.getItem('memospark_ai_patterns');
      return stored ? new Blob([stored]).size : 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Validate task data for AI processing
   */
  validateTaskData(tasks: Task[]): {
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    if (tasks.length === 0) {
      issues.push('No tasks provided for analysis');
      recommendations.push('Add some tasks to get AI suggestions');
      return { isValid: false, issues, recommendations };
    }

    const completedTasks = tasks.filter(t => t.completed);
    if (completedTasks.length < 3) {
      issues.push('Insufficient completed tasks for meaningful analysis');
      recommendations.push('Complete more tasks to improve AI accuracy');
    }

    const tasksWithSubjects = tasks.filter(t => t.subject);
    if (tasksWithSubjects.length / tasks.length < 0.5) {
      issues.push('Many tasks lack subject categorization');
      recommendations.push('Add subjects to tasks for better recommendations');
    }

    const tasksWithTimeData = completedTasks.filter(t => t.completedAt || t.timeSpent);
    if (tasksWithTimeData.length / Math.max(completedTasks.length, 1) < 0.3) {
      issues.push('Limited time tracking data available');
      recommendations.push('Track completion times and time spent for better insights');
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations
    };
  }

  /**
   * Get default user preferences for AI functionality
   */
  static getDefaultPreferences(): SuggestionContext['userPreferences'] {
    return {
      preferredSessionLength: 45,
      maxSuggestionsPerDay: 5,
      enableBreakReminders: true,
      preferredDifficulty: 5
    };
  }
}

// Export utility functions for easy access
export const AIUtils = {
  /**
   * Calculate optimal study time based on current schedule
   */
  calculateOptimalStudyTime(patterns: PatternData, currentTime: Date = new Date()): number {
    const currentHour = currentTime.getHours();
    const optimalHours = patterns.timePattern.mostProductiveHours;
    
    // Find the next optimal hour
    const nextOptimalHour = optimalHours.find((hour: number) => hour > currentHour) || optimalHours[0];
    return nextOptimalHour;
  },

  /**
   * Get study session recommendations based on patterns
   */
  getSessionRecommendation(patterns: PatternData): {
    duration: number;
    breakInterval: number;
    difficulty: number;
  } {
    return {
      duration: patterns.timePattern.preferredStudyDuration,
      breakInterval: patterns.timePattern.averageBreakTime,
      difficulty: patterns.difficultyProfile.averageTaskDifficulty
    };
  },

  /**
   * Format confidence score for display
   */
  formatConfidence(confidence: number): string {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.5) return 'Medium';
    return 'Building...';
  },

  /**
   * Check if user needs onboarding
   */
  needsOnboarding(): boolean {
    return !OnboardingManager.isOnboardingCompleted();
  },

  /**
   * Get quick setup options for new users
   */
  getQuickSetupOptions(): Array<{
    id: string;
    title: string;
    description: string;
    timePreference: 'morning' | 'afternoon' | 'evening' | 'night';
    icon: string;
  }> {
    return [
      {
        id: 'morning-learner',
        title: 'Morning Learner',
        description: 'I\'m most productive in the early hours',
        timePreference: 'morning',
        icon: '🌅'
      },
      {
        id: 'afternoon-achiever',
        title: 'Afternoon Achiever',
        description: 'I focus best during midday hours',
        timePreference: 'afternoon',
        icon: '☀️'
      },
      {
        id: 'evening-explorer',
        title: 'Evening Explorer',
        description: 'I prefer studying in the evening',
        timePreference: 'evening',
        icon: '🌆'
      },
      {
        id: 'night-ninja',
        title: 'Night Ninja',
        description: 'Late night is my power time',
        timePreference: 'night',
        icon: '🌙'
      }
    ];
  }
};

// Export singleton instance
export const memoSparkAI = new StudySparkAI();
// Maintain backwards compatibility
export const studySparkAI = memoSparkAI; 