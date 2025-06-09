import { format, parseISO, differenceInHours, differenceInDays, getHours, getDay, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import type { 
  BaseTask, 
  ExtendedTask, 
  PatternData, 
  TimePattern, 
  DifficultyProfile, 
  SubjectInsights,
  AITaskMetadata,
  LearningSource,
  AISuggestion 
} from '@/types/ai';
import type { UserAIPreferences as AIContextUserPreferences } from './aiContext'; // Import UserAIPreferences from aiContext
import type { SupabaseClient } from '@supabase/supabase-js'; // Import SupabaseClient type

// Re-export the types needed by index.ts
export type { 
  TimePattern, 
  DifficultyProfile, 
  SubjectInsights, 
  PatternData,
  ExtendedTask as Task // Export ExtendedTask as Task
};

// Enhanced ClassTimetableEntry interface for AI analysis
export interface ClassTimetableEntry {
  id: string;
  courseName: string;
  courseCode: string;
  instructor?: string;
  location?: string;
  startTime: string; // HH:mm format
  endTime: string;   // HH:mm format
  daysOfWeek: string[];
  semesterStartDate: string;
  semesterEndDate: string;
  color?: string;
  detailedDescription?: string;
}

// New interface for first-day user preferences
export interface UserPreferences {
  studyTimePreference: 'morning' | 'afternoon' | 'evening' | 'night';
  sessionLengthPreference: 'short' | 'medium' | 'long'; // 30min, 45min, 60min+
  difficultyComfort: 'easy' | 'moderate' | 'challenging';
  breakFrequency: 'frequent' | 'moderate' | 'minimal';
  preferredSubjects: string[];
  strugglingSubjects: string[];
  studyGoals: string[];
  availableStudyHours: number[]; // Array of hours when user is typically free
}

export class PatternRecognitionEngine {
  private static readonly STORAGE_KEY = 'memospark_ai_patterns';
  private static readonly PREFERENCES_KEY = 'memospark_user_preferences';
  private static readonly MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB limit
  private patterns: PatternData | null = null;
  private supabase: SupabaseClient | null; // Add Supabase client instance variable

  constructor(supabaseClient: SupabaseClient | null = null) { // Accept Supabase client in constructor
    this.supabase = supabaseClient;
    this.loadPatterns();
  }

  /**
   * Enhanced temporal pattern analysis that works for new users
   */
  analyzeTemporalPatterns(
    tasks: ExtendedTask[], 
    timetable: ClassTimetableEntry[] = [],
    userPreferences?: UserPreferences
  ): TimePattern {
    const completedTasks = tasks.filter(task => task.completed && task.completedAt);
    
    // If we have sufficient completion history, use it
    if (completedTasks.length >= 3) {
      return this.analyzeFromCompletionHistory(completedTasks);
    }
    
    // Otherwise, infer from timetable and preferences
    return this.inferFromTimetableAndPreferences(tasks, timetable, userPreferences);
  }

  /**
   * Analyze patterns from completion history (existing logic)
   */
  private analyzeFromCompletionHistory(completedTasks: ExtendedTask[]): TimePattern {
    const hourlyCompletions: Record<number, number> = {};
    const sessionLengths: number[] = [];

    completedTasks.forEach(task => {
      if (task.completedAt) {
        const completionTime = parseISO(task.completedAt);
        const hour = getHours(completionTime);
        hourlyCompletions[hour] = (hourlyCompletions[hour] || 0) + 1;
        
        if (task.timeSpent) {
          sessionLengths.push(task.timeSpent);
        }
      }
    });

    const optimalStudyHours = Object.entries(hourlyCompletions)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => Number.parseInt(hour));

    const peakHours = optimalStudyHours.sort((a, b) => a - b);
    const peakStart = peakHours[0] || 9;
    const peakEnd = peakHours[peakHours.length - 1] || 17;

    const avgSessionLength = sessionLengths.length > 0 
      ? sessionLengths.reduce((sum, length) => sum + length, 0) / sessionLengths.length
      : 45;

    const confidence = Math.min(completedTasks.length / 20, 1);

    return {
      mostProductiveHours: optimalStudyHours.length > 0 ? optimalStudyHours : [9, 14, 19],
      preferredStudyDuration: Math.round(avgSessionLength),
      averageBreakTime: Math.round(avgSessionLength * 0.2),
      peakPerformanceDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      consistencyScore: confidence
    };
  }

  /**
   * NEW: Infer optimal study times from timetable and user preferences
   */
  private inferFromTimetableAndPreferences(
    tasks: BaseTask[],
    timetable: ClassTimetableEntry[],
    userPreferences?: UserPreferences
  ): TimePattern {
    let optimalStudyHours: number[] = [];
    let averageSessionLength = 45;

    // 1. Analyze free time gaps in timetable
    if (timetable.length > 0) {
      const freeTimeGaps = this.findFreeTimeGaps(timetable);
      optimalStudyHours = freeTimeGaps.map(gap => gap.startHour);
    }

    // 2. Apply user preferences if available
    if (userPreferences) {
      // Override with user's preferred study times
      if (userPreferences.availableStudyHours.length > 0) {
        optimalStudyHours = userPreferences.availableStudyHours.slice(0, 3);
      }

      // Adjust based on time preference
      const timePreferenceHours = this.getTimePreferenceHours(userPreferences.studyTimePreference);
      if (optimalStudyHours.length === 0) {
        optimalStudyHours = timePreferenceHours;
      }

      // Set session length based on preference
      averageSessionLength = this.getSessionLengthFromPreference(userPreferences.sessionLengthPreference);
    }

    // 3. Analyze scheduled task patterns
    const scheduledTaskHours = this.analyzeScheduledTaskTiming(tasks);
    if (optimalStudyHours.length === 0 && scheduledTaskHours.length > 0) {
      optimalStudyHours = scheduledTaskHours;
    }

    // Default fallback
    if (optimalStudyHours.length === 0) {
      optimalStudyHours = [9, 14, 19]; // Morning, afternoon, evening
    }

    return {
      mostProductiveHours: optimalStudyHours,
      preferredStudyDuration: averageSessionLength,
      averageBreakTime: Math.round(averageSessionLength * 0.2),
      peakPerformanceDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      consistencyScore: 0.5 // Medium confidence for inferred data
    };
  }

  /**
   * Find free time gaps between classes
   */
  private findFreeTimeGaps(timetable: ClassTimetableEntry[]): Array<{startHour: number, endHour: number, duration: number}> {
    const busyHours: Set<number> = new Set();
    
    // Mark all class hours as busy
    timetable.forEach(entry => {
      const startHour = Number.parseInt(entry.startTime.split(':')[0]);
      const endHour = Number.parseInt(entry.endTime.split(':')[0]);
      
      for (let hour = startHour; hour <= endHour; hour++) {
        busyHours.add(hour);
      }
    });

    // Find free gaps (minimum 1 hour)
    const freeGaps: Array<{startHour: number, endHour: number, duration: number}> = [];
    let gapStart: number | null = null;

    for (let hour = 8; hour <= 22; hour++) { // 8am to 10pm range
      if (!busyHours.has(hour)) {
        if (gapStart === null) gapStart = hour;
      } else {
        if (gapStart !== null && hour - gapStart >= 1) {
          freeGaps.push({
            startHour: gapStart,
            endHour: hour - 1,
            duration: hour - gapStart
          });
        }
        gapStart = null;
      }
    }

    // Handle gap extending to end of day
    if (gapStart !== null && 22 - gapStart >= 1) {
      freeGaps.push({
        startHour: gapStart,
        endHour: 22,
        duration: 22 - gapStart
      });
    }

    // Sort by duration (longest gaps first)
    return freeGaps.sort((a, b) => b.duration - a.duration);
  }

  /**
   * Convert time preference to hour suggestions
   */
  private getTimePreferenceHours(preference: 'morning' | 'afternoon' | 'evening' | 'night'): number[] {
    switch (preference) {
      case 'morning': return [8, 9, 10];
      case 'afternoon': return [13, 14, 15];
      case 'evening': return [18, 19, 20];
      case 'night': return [21, 22, 23];
      default: return [9, 14, 19];
    }
  }

  /**
   * Convert session length preference to minutes
   */
  private getSessionLengthFromPreference(preference: 'short' | 'medium' | 'long'): number {
    switch (preference) {
      case 'short': return 30;
      case 'medium': return 45;
      case 'long': return 60;
      default: return 45;
    }
  }

  /**
   * Analyze when tasks are typically scheduled
   */
  private analyzeScheduledTaskTiming(tasks: BaseTask[]): number[] {
    const taskHours: Record<number, number> = {};
    
    tasks.forEach(task => {
      const dueHour = getHours(parseISO(task.dueDate));
      taskHours[dueHour] = (taskHours[dueHour] || 0) + 1;
    });

    return Object.entries(taskHours)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => Number.parseInt(hour));
  }

  /**
   * Enhanced difficulty analysis for new users
   */
  analyzeDifficultyProgression(
    completedTasks: ExtendedTask[],
    allTasks: ExtendedTask[] = [],
    userPreferences?: UserPreferences
  ): DifficultyProfile {
    // If we have completion history, use existing logic
    if (completedTasks.length >= 5) {
      return this.analyzeFromTaskHistory(completedTasks);
    }

    // Otherwise, infer from planned tasks and preferences
    return this.inferDifficultyFromPlannedTasks(allTasks, userPreferences);
  }

  /**
   * Analyze difficulty from completion history (existing logic)
   */
  private analyzeFromTaskHistory(completedTasks: ExtendedTask[]): DifficultyProfile {
    const subjectDifficultyMap: Record<string, number> = {};
    let totalDifficulty = 0;
    let taskCount = 0;
    
    completedTasks.forEach(task => {
      const subject = task.subject || 'general';
      const difficulty = task.difficultyLevel || 5;
      
      if (!subjectDifficultyMap[subject]) {
        subjectDifficultyMap[subject] = 0;
      }
      
      subjectDifficultyMap[subject] += difficulty;
      totalDifficulty += difficulty;
      taskCount++;
    });

    // Calculate average difficulties per subject
    Object.keys(subjectDifficultyMap).forEach(subject => {
      const subjectTasks = completedTasks.filter(t => (t.subject || 'general') === subject);
      subjectDifficultyMap[subject] = subjectDifficultyMap[subject] / subjectTasks.length;
    });

    const averageTaskDifficulty = taskCount > 0 ? totalDifficulty / taskCount : 5;

    // Determine trend based on recent vs older tasks
    const recentTasks = completedTasks.slice(-5);
    const earlierTasks = completedTasks.slice(0, Math.min(5, completedTasks.length - 5));
    
    const recentAvgDifficulty = recentTasks.length > 0 
      ? recentTasks.reduce((sum, t) => sum + (t.difficultyLevel || 5), 0) / recentTasks.length
      : averageTaskDifficulty;
    
    const earlierAvgDifficulty = earlierTasks.length > 0
      ? earlierTasks.reduce((sum, t) => sum + (t.difficultyLevel || 5), 0) / earlierTasks.length
      : averageTaskDifficulty;

    let difficultyTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (recentAvgDifficulty > earlierAvgDifficulty + 0.5) {
      difficultyTrend = 'increasing';
    } else if (recentAvgDifficulty < earlierAvgDifficulty - 0.5) {
      difficultyTrend = 'decreasing';
    }

    // Calculate adaptation rate (how quickly difficulty increased over time)
    const adaptationRate = taskCount > 10 ? 
      Math.min((recentAvgDifficulty - earlierAvgDifficulty) / 5, 1) : 0.5;

    return {
      averageTaskDifficulty,
      difficultyTrend,
      subjectDifficultyMap,
      adaptationRate: Math.max(0, adaptationRate)
    };
  }

  /**
   * NEW: Infer difficulty profile from planned tasks and preferences
   */
  private inferDifficultyFromPlannedTasks(
    allTasks: ExtendedTask[],
    userPreferences?: UserPreferences
  ): DifficultyProfile {
    let averageTaskDifficulty = 5;
    const subjectDifficultyMap: Record<string, number> = {};

    // Analyze from user preferences if available
    if (userPreferences) {
      switch (userPreferences.difficultyComfort) {
        case 'easy':
          averageTaskDifficulty = 3;
          break;
        case 'moderate':
          averageTaskDifficulty = 5;
          break;
        case 'challenging':
          averageTaskDifficulty = 7;
          break;
      }

      // Set initial subject difficulties based on preferences
      userPreferences.preferredSubjects.forEach(subject => {
        subjectDifficultyMap[subject] = averageTaskDifficulty + 1;
      });
      userPreferences.strugglingSubjects.forEach(subject => {
        subjectDifficultyMap[subject] = Math.max(averageTaskDifficulty - 2, 1);
      });
    }

    // Analyze task complexity patterns
    const taskComplexityAnalysis = this.analyzeTaskComplexity(allTasks);
    if (taskComplexityAnalysis.avgComplexity > 6) {
      averageTaskDifficulty = Math.min(averageTaskDifficulty + 2, 10);
    } else if (taskComplexityAnalysis.avgComplexity > 4) {
      averageTaskDifficulty = Math.min(averageTaskDifficulty + 1, 8);
    }

    return {
      averageTaskDifficulty,
      difficultyTrend: 'stable',
      subjectDifficultyMap,
      adaptationRate: 0.5
    };
  }

  /**
   * Analyze complexity of planned tasks
   */
  private analyzeTaskComplexity(tasks: ExtendedTask[]): { avgComplexity: number; complexityDistribution: Record<string, number> } {
    const complexityScores = tasks.map(task => {
      let complexity = 5; // Base complexity

      // Adjust based on priority
      if (task.priority === 'high') complexity += 2;
      else if (task.priority === 'low') complexity -= 1;

      // Adjust based on type
      if (task.type === 'academic') complexity += 1;

      // Adjust based on title complexity
      const titleLength = task.title.length;
      if (titleLength > 50) complexity += 1;
      if (titleLength < 20) complexity -= 1;

      // Check for complexity keywords
      const complexityKeywords = ['exam', 'essay', 'project', 'research', 'analysis', 'presentation'];
      const hasComplexKeywords = complexityKeywords.some(keyword => 
        task.title.toLowerCase().includes(keyword) || 
        task.description?.toLowerCase().includes(keyword)
      );
      if (hasComplexKeywords) complexity += 1;

      return Math.max(1, Math.min(10, complexity));
    });

    const avgComplexity = complexityScores.length > 0 
      ? complexityScores.reduce((sum, score) => sum + score, 0) / complexityScores.length 
      : 5;

    const distribution: Record<string, number> = {};
    complexityScores.forEach(score => {
      const level = `level_${Math.floor(score)}`;
      distribution[level] = (distribution[level] || 0) + 1;
    });

    return { avgComplexity, complexityDistribution: distribution };
  }

  /**
   * Enhanced subject analysis that works for new users
   */
  analyzeSubjectPreferences(
    tasks: ExtendedTask[],
    timetable: ClassTimetableEntry[] = [],
    userPreferences?: UserPreferences
  ): SubjectInsights {
    // If we have task history, use existing analysis
    if (tasks.length >= 5) {
      return this.analyzeFromTaskData(tasks);
    }

    // Otherwise, infer from timetable and preferences
    return this.inferFromTimetableAndSubjectPreferences(tasks, timetable, userPreferences);
  }

  /**
   * Analyze subjects from task history (existing logic enhanced)
   */
  private analyzeFromTaskData(tasks: ExtendedTask[]): SubjectInsights {
    const subjectData: Record<string, {
      total: number;
      completed: number;
      timeSpent: number;
      avgPriority: number;
      difficulties: number[];
    }> = {};

    tasks.forEach(task => {
      const subject = task.subject || 'general';
      
      if (!subjectData[subject]) {
        subjectData[subject] = { 
          total: 0, 
          completed: 0, 
          timeSpent: 0, 
          avgPriority: 0,
          difficulties: []
        };
      }

      subjectData[subject].total += 1;
      subjectData[subject].completed += task.completed ? 1 : 0;
      subjectData[subject].timeSpent += task.timeSpent || 0;
      subjectData[subject].difficulties.push(task.difficultyLevel || 5);
      
      const priorityValue = task.priority === 'high' ? 3 : task.priority === 'medium' ? 2 : 1;
      subjectData[subject].avgPriority += priorityValue;
    });

    const preferredSubjects: string[] = [];
    const strugglingSubjects: string[] = [];
    const subjectPerformance: Record<string, {
      completionRate: number;
      averageTimeSpent: number;
      difficultyProgression: number[];
    }> = {};

    Object.entries(subjectData).forEach(([subject, data]) => {
      const completionRate = data.completed / data.total;
      const averageTimeSpent = data.timeSpent / data.total;
      
      subjectPerformance[subject] = {
        completionRate,
        averageTimeSpent,
        difficultyProgression: data.difficulties
      };

      // Determine preferred vs struggling based on completion rate
      if (completionRate >= 0.8) {
        preferredSubjects.push(subject);
      } else if (completionRate < 0.5) {
        strugglingSubjects.push(subject);
      }
    });

    return {
      preferredSubjects,
      strugglingSubjects,
      subjectPerformance
    };
  }

  /**
   * NEW: Infer subject insights from timetable and preferences
   */
  private inferFromTimetableAndSubjectPreferences(
    tasks: ExtendedTask[],
    timetable: ClassTimetableEntry[],
    userPreferences?: UserPreferences
  ): SubjectInsights {
    let preferredSubjects: string[] = [];
    let strugglingSubjects: string[] = [];
    const subjectPerformance: Record<string, {
      completionRate: number;
      averageTimeSpent: number;
      difficultyProgression: number[];
    }> = {};

    // Extract subjects from timetable
    const timetableSubjects = timetable.map(entry => entry.courseName);
    
    // Extract subjects from tasks
    const taskSubjects = [...new Set(tasks.map(task => task.subject).filter(Boolean))] as string[];
    
    // Combine all subjects
    const allSubjects = [...new Set([...timetableSubjects, ...taskSubjects])];

    // Apply user preferences if available
    if (userPreferences) {
      preferredSubjects = userPreferences.preferredSubjects;
      strugglingSubjects = userPreferences.strugglingSubjects;
    }

    // Initialize subject performance with neutral defaults
    allSubjects.forEach(subject => {
      subjectPerformance[subject] = {
        completionRate: 0.7, // Optimistic default
        averageTimeSpent: 45, // Default session length
        difficultyProgression: [5] // Default difficulty
      };
    });

    return {
      preferredSubjects,
      strugglingSubjects,
      subjectPerformance
    };
  }

  /**
   * Enhanced pattern analysis with multi-source intelligence
   */
  analyzePatterns(
    tasks: ExtendedTask[], 
    userId: string,
    timetable: ClassTimetableEntry[] = [],
    userPreferences?: UserPreferences
  ): PatternData {
    const startTime = Date.now();
    
    const timePattern = this.analyzeTemporalPatterns(tasks, timetable, userPreferences);
    const difficultyProfile = this.analyzeDifficultyProgression(
      tasks.filter(t => t.completed), 
      tasks, 
      userPreferences
    );
    const subjectInsights = this.analyzeSubjectPreferences(tasks, timetable, userPreferences);

    // Enhanced data quality calculation
    const completedTasks = tasks.filter(t => t.completed);
    const dataQuality = Math.min(
      (completedTasks.length / 20) * 0.3 + // Completion history (max 0.3)
      (timetable.length > 0 ? 0.3 : 0) + // Timetable data (0.3)
      (userPreferences ? 0.3 : 0) + // User preferences (0.3)
      (tasks.length / 10) * 0.1, // Task planning (max 0.1)
      1
    );

    const patterns: PatternData = {
      userId,
      lastAnalyzed: new Date().toISOString(),
      timePattern,
      difficultyProfile,
      subjectInsights,
      totalTasksAnalyzed: tasks.length,
      dataQuality
    };

    this.patterns = patterns;
    this.savePatterns(patterns);

    const endTime = Date.now();
    console.log(`Enhanced pattern analysis completed in ${endTime - startTime}ms`);

    return patterns;
  }

  /**
   * Save user preferences
   */
  saveUserPreferences(preferences: UserPreferences): void {
    // Only access localStorage on the client side
    if (typeof window === 'undefined') {
      console.log('Skipping localStorage save on server side');
      return;
    }

    try {
      localStorage.setItem(PatternRecognitionEngine.PREFERENCES_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.error('Failed to save user preferences:', error);
    }
  }

  /**
   * Load user preferences
   */
  getUserPreferences(): UserPreferences | null {
    // Only access localStorage on the client side
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      const stored = localStorage.getItem(PatternRecognitionEngine.PREFERENCES_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to load user preferences:', error);
      return null;
    }
  }

  /**
   * Get cached patterns or return null if not available
   */
  getCachedPatterns(): PatternData | null {
    return this.patterns;
  }

  /**
   * Save patterns to localStorage with size management
   */
  private savePatterns(patterns: PatternData): void {
    // Only access localStorage on the client side
    if (typeof window === 'undefined') {
      console.log('Skipping localStorage save on server side');
      return;
    }

    try {
      const serialized = JSON.stringify(patterns);
      
      // Check storage size
      if (serialized.length > PatternRecognitionEngine.MAX_STORAGE_SIZE) {
        console.warn('Pattern data exceeds storage limit, trimming data');
        // Keep only essential data if too large
        const trimmedPatterns = {
          ...patterns,
          // Remove less critical data if needed
          totalTasksAnalyzed: Math.min(patterns.totalTasksAnalyzed, 100)
        };
        localStorage.setItem(PatternRecognitionEngine.STORAGE_KEY, JSON.stringify(trimmedPatterns));
      } else {
        localStorage.setItem(PatternRecognitionEngine.STORAGE_KEY, serialized);
      }
    } catch (error) {
      console.error('Failed to save patterns to localStorage:', error);
    }
  }

  /**
   * Load patterns from localStorage
   */
  private loadPatterns(): void {
    // Only access localStorage on the client side
    if (typeof window === 'undefined') {
      console.log('Skipping localStorage access on server side');
      this.patterns = null;
      return;
    }

    try {
      const stored = localStorage.getItem(PatternRecognitionEngine.STORAGE_KEY);
      if (stored) {
        this.patterns = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load patterns from localStorage:', error);
      this.patterns = null;
    }
  }

  /**
   * Clear cached patterns (useful for testing or reset)
   */
  clearPatterns(): void {
    this.patterns = null;
    // Only access localStorage on the client side
    if (typeof window !== 'undefined') {
      localStorage.removeItem(PatternRecognitionEngine.STORAGE_KEY);
    }
  }

  /**
   * Default time pattern for new users
   */
  private getDefaultTimePattern(): TimePattern {
    return {
      mostProductiveHours: [9, 14, 19], // 9am, 2pm, 7pm
      preferredStudyDuration: 45,
      averageBreakTime: 15,
      peakPerformanceDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      consistencyScore: 0.1
    };
  }

  /**
   * Default difficulty profile for new users
   */
  private getDefaultDifficultyProfile(): DifficultyProfile {
    return {
      averageTaskDifficulty: 5,
      difficultyTrend: 'stable',
      subjectDifficultyMap: {},
      adaptationRate: 0.5
    };
  }

  /**
   * Helper method to get default user preferences
   */
  private getDefaultUserPreferences(): UserPreferences {
    return {
      studyTimePreference: 'afternoon',
      sessionLengthPreference: 'medium',
      difficultyComfort: 'moderate',
      breakFrequency: 'moderate',
      preferredSubjects: [],
      strugglingSubjects: [],
      studyGoals: [],
      availableStudyHours: [9, 14, 19] // Default morning, afternoon, evening
    };
  }

  /**
   * Fetch user timetable from Supabase
   */
  private async fetchTimetableFromSupabase(userId: string): Promise<ClassTimetableEntry[]> {
    if (!this.supabase) {
      console.warn('Supabase client not available for timetable fetch');
      return [];
    }

    try {
      const { data, error } = await this.supabase
        .from('user_timetables')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching timetable from Supabase:', error);
        return [];
      }

      // Convert Supabase format to ClassTimetableEntry format
      return (data || []).map((entry: any): ClassTimetableEntry => ({
        id: entry.id,
        courseName: entry.course_name,
        courseCode: entry.course_code || '',
        instructor: entry.instructor,
        location: entry.location,
        startTime: entry.start_time, // Already in HH:mm format
        endTime: entry.end_time,     // Already in HH:mm format
        daysOfWeek: entry.days_of_week || [],
        semesterStartDate: entry.semester_start_date || '',
        semesterEndDate: entry.semester_end_date || '',
        color: entry.color || '#2D5A27',
        detailedDescription: entry.detailed_description
      }));
    } catch (error) {
      console.error('Failed to fetch timetable from Supabase:', error);
      return [];
    }
  }

  /**
   * Save timetable to localStorage for offline access
   */
  private saveTimetableToLocalStorage(userId: string, timetable: ClassTimetableEntry[]): void {
    // Only access localStorage on the client side
    if (typeof window === 'undefined') {
      console.log('Skipping timetable localStorage save on server side');
      return;
    }

    try {
      const storageKey = `memospark_timetable_${userId}`;
      const timetableData = {
        userId,
        timetable,
        lastUpdated: new Date().toISOString(),
        version: 1
      };
      localStorage.setItem(storageKey, JSON.stringify(timetableData));
      console.log('Timetable saved to localStorage for offline access');
    } catch (error) {
      console.error('Failed to save timetable to localStorage:', error);
    }
  }

  /**
   * Load timetable from localStorage (offline fallback)
   */
  private loadTimetableFromLocalStorage(userId: string): ClassTimetableEntry[] {
    // Only access localStorage on the client side
    if (typeof window === 'undefined') {
      return [];
    }

    try {
      const storageKey = `memospark_timetable_${userId}`;
      const stored = localStorage.getItem(storageKey);
      
      if (!stored) {
        return [];
      }

      const timetableData = JSON.parse(stored);
      
      // Check if data is still fresh (within 24 hours for offline use)
      const lastUpdated = new Date(timetableData.lastUpdated);
      const daysSinceUpdate = differenceInDays(new Date(), lastUpdated);
      
      if (daysSinceUpdate > 1) {
        console.log('Cached timetable data is older than 24 hours');
      }

      return timetableData.timetable || [];
    } catch (error) {
      console.error('Failed to load timetable from localStorage:', error);
      return [];
    }
  }

  /**
   * Get user timetable with online/offline fallback
   */
  private async getTimetableData(userId: string): Promise<ClassTimetableEntry[]> {
    console.log('Fetching timetable data for user:', userId);
    
    try {
      // Try to fetch from Supabase first
      const supabaseTimetable = await this.fetchTimetableFromSupabase(userId);
      
      if (supabaseTimetable.length > 0) {
        console.log('Fetched timetable from Supabase:', supabaseTimetable.length, 'entries');
        // Save to localStorage for offline access
        this.saveTimetableToLocalStorage(userId, supabaseTimetable);
        return supabaseTimetable;
      }
      
      // Fallback to localStorage if Supabase is empty or fails
      console.log('No Supabase timetable data, trying localStorage...');
      const localTimetable = this.loadTimetableFromLocalStorage(userId);
      
      if (localTimetable.length > 0) {
        console.log('Using cached timetable from localStorage:', localTimetable.length, 'entries');
        return localTimetable;
      }
      
      console.log('No timetable data found in either source');
      return [];
      
    } catch (error) {
      console.error('Error in getTimetableData, falling back to localStorage:', error);
      return this.loadTimetableFromLocalStorage(userId);
    }
  }

  public async generateSuggestions(
    userId: string | undefined, 
    currentUserPreferences: AIContextUserPreferences
  ): Promise<AISuggestion[]> {
    console.log('PatternRecognitionEngine: Generating suggestions for', userId, currentUserPreferences);
    const suggestions: AISuggestion[] = [];
    const now = new Date().toISOString();

    if (!userId || !this.supabase) {
      console.warn('User ID or Supabase client not available for suggestion generation.');
      // Return a generic suggestion or empty array if no user/supabase
      return [{
        id: 'generic-fallback-1',
        type: 'study_habit_tip',
        title: 'Plan Your Day',
        description: 'Take a few minutes to plan your study tasks for the day.',
        priority: 'low',
        source: 'PatternRecognitionEngine',
        createdAt: now
      }];
    }

    try {
      // 1. Fetch and correctly type/process Supabase tasks (map to ExtendedTask[])
      const { data: tasksData, error: tasksError } = await this.supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId);

      if (tasksError) {
        console.error('Error fetching tasks for suggestions:', tasksError);
        throw new Error(`Failed to fetch tasks: ${tasksError.message}`);
      }

      // Convert Supabase tasks to ExtendedTask[] format
      const tasks: ExtendedTask[] = (tasksData || []).map((task: any): ExtendedTask => ({
        id: task.id,
        title: task.title,
        description: task.description || undefined,
        completed: task.completed || false,
        priority: task.priority || 'medium',
        type: task.type || 'academic',
        subject: task.subject || undefined,
        reminder: task.reminder || false,
        dueDate: task.due_date || undefined,
        completedAt: task.completed_at || undefined, // Note: may not exist in schema
        estimatedDuration: task.estimated_duration || undefined, // Note: may not exist in schema
        timeSpent: task.time_spent || undefined, // Note: may not exist in schema
        difficultyLevel: task.difficulty || 5, // Note: may not exist in schema
        aiMetadata: {
          confidenceScore: 0.9,
          learningSource: 'pattern_recognition',
          createdAt: task.created_at || new Date().toISOString()
        }
      }));

      console.log('PatternRecognitionEngine: Processed tasks:', tasks.length, tasks);

      // 2. Get timetable data with online/offline support
      const timetable: ClassTimetableEntry[] = await this.getTimetableData(userId);
      console.log('PatternRecognitionEngine: Timetable data:', timetable.length, 'entries');

      // 3. Prepare engineUserPrefs (UserPreferences type)
      let engineUserPrefs: UserPreferences | null = this.getUserPreferences();
      
      if (!engineUserPrefs) {
        // Create default UserPreferences, mapping from currentUserPreferences
        engineUserPrefs = {
          studyTimePreference: 'afternoon', // Default since suggestionTiming doesn't exist in ai_interaction_settings
          sessionLengthPreference: 'medium', // Default fallback
          difficultyComfort: this.mapDifficultyPreference(currentUserPreferences.difficulty_preference),
          breakFrequency: 'moderate', // Default fallback
          preferredSubjects: currentUserPreferences.subject_interests || [],
          strugglingSubjects: [], // Default - could be inferred from task difficulty later
          studyGoals: [], // Default - could be inferred from tasks or user input
          availableStudyHours: [9, 14, 19] // Default morning, afternoon, evening
        };
        console.log('PatternRecognitionEngine: Created default user preferences:', engineUserPrefs);
      } else {
        console.log('PatternRecognitionEngine: Using existing user preferences:', engineUserPrefs);
      }

      // Task 2: Call analyzePatterns to get PatternData
      try {
        const patternData = this.analyzePatterns(
          tasks, 
          userId, 
          timetable, 
          engineUserPrefs || this.getDefaultUserPreferences()
        );
        console.log('PatternRecognitionEngine: Generated pattern data:', patternData);

        // Task 3: Map PatternData to suggestions
        const patternBasedSuggestions = this._mapPatternDataToSuggestions(
          patternData, 
          tasks, 
          currentUserPreferences
        );
        console.log('PatternRecognitionEngine: Generated pattern-based suggestions:', patternBasedSuggestions.length);

        return patternBasedSuggestions;

      } catch (analysisError) {
        console.error('PatternRecognitionEngine: Analysis error:', analysisError);
        // Return fallback suggestion when analysis fails
        return [{
          id: `analysis-error-fallback-${Date.now()}`,
              type: 'study_habit_tip',
          title: 'Stay Consistent',
          description: 'Try to maintain a regular study schedule for better learning outcomes.',
          priority: 'low',
              source: 'PatternRecognitionEngine',
              createdAt: now
        }];
      }
      
    } catch (error) {
      console.error('Error during suggestion generation process:', error);
      return [{
            id: `error-suggestion-fallback-${Date.now()}`,
            type: 'study_habit_tip',
            title: 'Quick Tip',
            description: 'Stay hydrated and take short breaks during your study sessions!',
            priority: 'low',
            source: 'PatternRecognitionEngine',
        createdAt: now
      }];
    }
  }

  // Helper method to map AI context time preference to engine format
  private mapAIContextTimeToEngine(suggestionTiming?: string): 'morning' | 'afternoon' | 'evening' | 'night' {
    switch (suggestionTiming) {
      case 'morning': return 'morning';
      case 'afternoon': return 'afternoon';
      case 'evening': return 'evening';
      case 'night': return 'night';
      default: return 'afternoon'; // Default fallback
    }
  }

  // Helper method to map difficulty preference to engine format
  private mapDifficultyPreference(difficultyPref?: number): 'easy' | 'moderate' | 'challenging' {
    if (!difficultyPref) return 'moderate';
    if (difficultyPref <= 3) return 'easy';
    if (difficultyPref <= 7) return 'moderate';
    return 'challenging';
  }

  /**
   * Tracks user feedback on suggestions.
   * This method is called by AIProvider.
   */
  public trackFeedback(suggestionId: string, accepted: boolean): void {
    console.log(`PatternRecognitionEngine: Feedback for suggestion ${suggestionId} - ${accepted ? 'Accepted' : 'Rejected'}.`);
    // TODO: Implement feedback storage (e.g., to Supabase or local analytics)
    // This could influence future pattern analysis or suggestion weighting.
  }

  // Task 3: Implement _mapPatternDataToSuggestions Helper Method
  private _mapPatternDataToSuggestions(
    patternData: PatternData,
    tasks: ExtendedTask[], // For context, e.g., number of overdue tasks
    currentUserPreferences: AIContextUserPreferences
  ): AISuggestion[] {
    const suggestions: AISuggestion[] = [];
    const now = new Date().toISOString();

    // Suggestion generation can be limited by frequency preference
    const maxSuggestions = {
      low: 1,
      medium: 3,
      high: 5,
    }[currentUserPreferences.ai_interaction_settings?.suggestionFrequency || 'medium'];

    // 1. Temporal Pattern Suggestions
    if (suggestions.length < maxSuggestions && patternData.timePattern) {
      const { mostProductiveHours, preferredStudyDuration, consistencyScore } = patternData.timePattern;
      if (mostProductiveHours && mostProductiveHours.length > 0) {
        suggestions.push({
          id: `temporal-prod-hours-${Date.now()}`,
          type: 'task_optimization',
          title: 'Leverage Your Peak Hours',
          description: `You seem to be most productive around ${mostProductiveHours.join(', ')}h. Try scheduling demanding tasks then!`,
          priority: 'medium',
          source: 'PatternRecognitionEngine',
          createdAt: now,
        });
      }
      if (suggestions.length < maxSuggestions && preferredStudyDuration > 0 && consistencyScore < 0.5) {
         suggestions.push({
          id: `temporal-consistency-${Date.now()}`,
          type: 'study_habit_tip',
          title: 'Build a Routine',
          description: `Aim for consistent study sessions of about ${preferredStudyDuration} minutes. Building a routine can boost productivity!`,
          priority: 'low',
          source: 'PatternRecognitionEngine',
          createdAt: now,
        });
      }
    }

    // 2. Difficulty Profile Suggestions
    if (suggestions.length < maxSuggestions && patternData.difficultyProfile) {
      const { averageTaskDifficulty, difficultyTrend, subjectDifficultyMap } = patternData.difficultyProfile;
      const strugglingSubjects = Object.entries(subjectDifficultyMap)
        .filter(([,avgDiff]) => avgDiff < (currentUserPreferences.difficulty_preference || 5) - 2) // Significantly lower than preferred
        .map(([subject]) => subject);

      if (suggestions.length < maxSuggestions && difficultyTrend === 'decreasing' && averageTaskDifficulty < 4) {
        suggestions.push({
          id: `difficulty-challenge-${Date.now()}`,
          type: 'goal_setting_prompt',
          title: 'Ready for a Challenge?',
          description: 'Your tasks have been getting easier. Consider picking up a more challenging topic or task.',
          priority: 'medium',
          source: 'PatternRecognitionEngine',
          createdAt: now,
        });
      }
      if (suggestions.length < maxSuggestions && strugglingSubjects.length > 0) {
        suggestions.push({
          id: `difficulty-subject-help-${Date.now()}`,
          type: 'resource_recommendation',
          title: `Focus on ${strugglingSubjects[0]}?`,
          description: `It seems ${strugglingSubjects[0]} might be a bit tricky. How about reviewing some basics or finding extra resources?`,
          priority: 'medium',
          source: 'PatternRecognitionEngine',
          relatedEntities: [{ type: 'subject', id: strugglingSubjects[0] }],
          createdAt: now,
        });
      }
    }

    // 3. Subject Insights Suggestions
    if (suggestions.length < maxSuggestions && patternData.subjectInsights) {
      const { preferredSubjects, strugglingSubjects: insightStruggling } = patternData.subjectInsights;
      if (suggestions.length < maxSuggestions && preferredSubjects.length > 0 && Math.random() < 0.5) { // Randomly pick one
        suggestions.push({
          id: `subject-deep-dive-${Date.now()}`,
          type: 'new_task_recommendation',
          title: `Explore ${preferredSubjects[0]} Further`,
          description: `You're doing well in ${preferredSubjects[0]}! Consider exploring an advanced topic or starting a related project.`,
          priority: 'low',
          source: 'PatternRecognitionEngine',
          relatedEntities: [{ type: 'subject', id: preferredSubjects[0] }],
          createdAt: now,
        });
      }
    }

    // 4. Task-based contextual suggestions (example)
    const overdueTasks = tasks.filter(task => !task.completed && isBefore(parseISO(task.dueDate), new Date()));
    if (suggestions.length < maxSuggestions && overdueTasks.length > 2) {
      suggestions.push({
        id: `task-overdue-จัดการ-${Date.now()}`,
        type: 'task_optimization',
        title: 'Manage Overdue Tasks',
        description: `You have ${overdueTasks.length} overdue tasks. Let's prioritize or reschedule them!`,
        priority: 'high',
        source: 'PatternRecognitionEngine',
        createdAt: now,
      });
    }

    // TODO: Add more suggestion types based on other PatternData fields and currentUserPreferences (e.g., learning_style)
    
    // Ensure we don't exceed maxSuggestions overall
    return suggestions.slice(0, maxSuggestions);
  }
}

// Export a singleton instance for consistent usage across the app
export const patternEngine = new PatternRecognitionEngine(); 