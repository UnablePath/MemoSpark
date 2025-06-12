import {
  PatternRecognitionEngine,
  patternEngine,
  type PatternData,
} from './patternEngine';
import {
  SuggestionEngine,
  suggestionEngine,
} from './suggestionEngine';
import type { Task, ClassTimetableEntry, UserPreferences, StudySuggestion, SuggestionContext, UserAIPreferences } from '@/types/ai';

/**
 * Tier 4: LocalMLService - 6/10 Intelligence
 * Provides zero-cost, on-device AI capabilities including pattern recognition
 * and basic suggestion generation. This is the foundational AI layer.
 */
export class LocalMLService {
  private patternEngine: PatternRecognitionEngine;
  private suggestionEngine: SuggestionEngine;

  constructor() {
    this.patternEngine = patternEngine;
    this.suggestionEngine = suggestionEngine;
  }

  /**
   * Generates recommendations based on user tasks, schedule, and preferences.
   * This is the primary entry point for the local AI.
   */
  async generateRecommendations(
    tasks: Task[],
    userId: string,
    timetable: ClassTimetableEntry[] = [],
    userPreferences?: UserPreferences
  ): Promise<{ patterns: PatternData; suggestions: StudySuggestion[] }> {
    const patterns = this.patternEngine.analyzePatterns(tasks, userId, timetable, userPreferences);
    
    const context: SuggestionContext = {
      currentTime: new Date(),
      upcomingTasks: tasks.filter(t => !t.completed),
      recentActivity: tasks.filter(t => t.completed).slice(-10),
      userPreferences: userPreferences ? this.convertUserPrefsToContext(userPreferences) : undefined
    };

    const suggestions = this.suggestionEngine.generateSuggestions(patterns, context);

    return {
      patterns,
      suggestions,
    };
  }

  /**
   * Generates basic suggestions using the local engine.
   */
  async generateLocalMLSuggestions(
    tasks: Task[],
    userId: string,
    context: SuggestionContext
  ): Promise<StudySuggestion[]> {
    const timetable = context.timetable ?? [];
    const preferences = context.userPreferences ? this.convertContextToUserPrefs(context.userPreferences) : undefined;
    
    const patterns = this.patternEngine.analyzePatterns(tasks, userId, timetable, preferences);
    const suggestions = this.suggestionEngine.generateSuggestions(patterns, context);
    
    return suggestions;
  }

  private convertUserPrefsToContext(prefs: UserPreferences): UserAIPreferences {
    return {
      enableSuggestions: true,
      suggestionFrequency: 'moderate',
      difficultyPreference: 'adaptive',
      preferredStudyTimes: [],
      preferredStudyDuration: prefs.sessionLengthPreference === 'short' ? 30 : 
                             prefs.sessionLengthPreference === 'long' ? 60 : 45,
      preferredBreakDuration: 10,
      maxDailyStudyHours: 4,
      cloudSyncEnabled: false,
      shareAnonymousData: false,
      personalizedStuInteraction: true,
      enableBreakReminders: prefs.breakFrequency !== 'minimal',
      enableStudyReminders: true,
      reminderAdvanceTime: 15,
      adaptiveDifficulty: true,
      focusOnWeakSubjects: false,
      balanceSubjects: true,
    };
  }

  private convertContextToUserPrefs(contextPrefs: UserAIPreferences): UserPreferences {
      return {
          studyTimePreference: 'evening',
          sessionLengthPreference: (contextPrefs.preferredStudyDuration ?? 45) <= 30 ? 'short' : (contextPrefs.preferredStudyDuration ?? 45) >= 60 ? 'long' : 'medium',
          breakFrequency: contextPrefs.enableBreakReminders ? 'frequent' : 'minimal',
          difficultyComfort: (contextPrefs.adaptiveDifficulty ?? true) ? 'moderate' : 'easy',
          preferredSubjects: [],
          strugglingSubjects: [],
          studyGoals: [],
          availableStudyHours: [], // Default
      };
  }
}

export const localMLService = new LocalMLService();
 