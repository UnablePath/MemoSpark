// AI-specific TypeScript interfaces for MemoSpark
// Extends existing interfaces while maintaining backward compatibility

// Base types for consistency
export type Priority = "low" | "medium" | "high";
export type TaskType = "academic" | "personal";
export type RecurrenceRule = "none" | "daily" | "weekly" | "monthly" | "yearly";

// Base Task interface (matching TaskEventTab structure)
export interface BaseTask {
  id: string;
  title: string;
  dueDate: string; // ISO string for date and time
  priority: Priority;
  type: TaskType;
  subject?: string;
  completed: boolean;
  reminder: boolean;
  description?: string;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  // Recurrence fields
  recurrenceRule?: RecurrenceRule;
  recurrenceInterval?: number; // e.g., 1 for every day/week/month, 2 for every other day/week/month
  recurrenceEndDate?: string; // ISO date string (only date part relevant for end condition)
  originalDueDate?: string; // For instances, to know their original start time from master
  completedOverrides?: Record<string, boolean>; // Key: YYYY-MM-DD of original instance date, Value: completed status
}

// Core AI suggestion types
export type SuggestionType = 
  | 'study_time' 
  | 'break_reminder' 
  | 'task_suggestion' 
  | 'difficulty_adjustment' 
  | 'difficulty'
  | 'subject_focus' 
  | 'schedule_optimization'
  | 'task_optimization'       // Used in PatternRecognitionEngine
  | 'new_task_recommendation' // Used in PatternRecognitionEngine
  | 'resource_recommendation' // Used in PatternRecognitionEngine
  | 'study_habit_tip'         // Used in PatternRecognitionEngine
  | 'goal_setting_prompt'     // Used in PatternRecognitionEngine
  | 'positive_reinforcement'  // Future use
  | 'mascot_interaction'     // For Stu interactions
  | 'premium_analytics'
  | 'task'
  | 'break'
  | 'schedule';
export type LearningSource = 'temporal' | 'difficulty' | 'collaborative' | 'pattern_recognition' | 'user_preference';
export type AcceptanceStatus = 'pending' | 'accepted' | 'rejected' | 'dismissed';
export type DifficultyPreference = 'adaptive' | 'challenging' | 'comfortable';
export type SuggestionFrequency = 'minimal' | 'moderate' | 'frequent';

// AI metadata for tasks
export interface AITaskMetadata {
  suggestionId?: string;
  confidenceScore: number; // 0-1 score indicating AI confidence
  learningSource: LearningSource;
  acceptanceStatus?: AcceptanceStatus;
  createdAt: string; // ISO date string
  lastAnalyzed?: string; // ISO date string
  userFeedback?: {
    rating?: number; // 1-5 stars
    comment?: string;
    feedbackDate: string;
  };
}

// Extended Task interface with AI capabilities
export interface ExtendedTask extends BaseTask {
  // AI-specific fields (all optional for backward compatibility)
  aiMetadata?: AITaskMetadata;
  completedAt?: string; // ISO date string for tracking completion time
  timeSpent?: number; // Time spent in minutes
  difficultyLevel?: number; // 1-10 scale
  actualDifficulty?: number; // User-reported difficulty after completion (1-10)
  estimatedDuration?: number; // AI-estimated duration in minutes
  tags?: string[]; // AI-generated or user-added tags
}

// User AI preferences
export interface UserAIPreferences {
  preferredDifficulty?: number;  // Make optional
  maxSuggestionsPerDay?: number;  // Add missing property
  // Core settings
  enableSuggestions: boolean;
  suggestionFrequency: SuggestionFrequency;
  difficultyPreference: DifficultyPreference;
  
  // Study preferences
  preferredStudyTimes: string[]; // Array of time ranges like ["09:00-11:00", "14:00-16:00"]
  preferredStudyDuration: number; // Default study session length in minutes
  preferredBreakDuration: number; // Default break length in minutes
  maxDailyStudyHours: number; // Maximum hours per day
  
  // Privacy and sync settings
  cloudSyncEnabled: boolean;
  shareAnonymousData: boolean; // For collaborative filtering
  personalizedStuInteraction: boolean; // Enable AI-driven Stu mascot interactions
  
  // Notification preferences
  enableBreakReminders: boolean;
  enableStudyReminders: boolean;
  reminderAdvanceTime: number; // Minutes before due date
  
  // Learning preferences
  adaptiveDifficulty: boolean; // Auto-adjust difficulty based on performance
  focusOnWeakSubjects: boolean; // Prioritize subjects with lower performance
  balanceSubjects: boolean; // Ensure even distribution across subjects
}

// AI suggestion interface
export interface AISuggestion {
  id: string;
  type: SuggestionType;
  title: string;
  description: string;
  priority?: 'low' | 'medium' | 'high'; // Made optional to match aiContext
  source?: string; // Origin of the suggestion (e.g., 'PatternRecognitionEngine')
  createdAt: string; // ISO date string
  
  // Optional fields for advanced functionality
  confidence?: number; // 0-1 confidence score  
  reasoning?: string; // Explanation of why this suggestion was made
  actionableLink?: string; // Optional URL or internal route for action
  relatedEntities?: Array<{ type: 'task' | 'subject' | 'goal'; id: string }>; // Links to other entities
  feedbackProvided?: boolean; // True if user has accepted/rejected this instance
  
  // Time and scheduling (optional)
  suggestedTime?: string; // ISO date string for when to act on suggestion
  duration?: number; // Estimated duration in minutes
  expiresAt?: string; // ISO date string when suggestion becomes irrelevant
  
  // Context (optional)
  subject?: string;
  relatedTaskIds?: string[]; // Tasks this suggestion relates to
  
  // Advanced metadata (optional)
  metadata?: {
    category?: string; // 'productivity', 'wellness', 'academic', etc.
    tags?: string[];
    difficulty?: number; // 1-10 scale
    estimatedBenefit?: number; // 0-1 score of expected positive impact
    requiredAction?: 'immediate' | 'scheduled' | 'optional';
    tier?: string;
    confidence?: number; // 0-1 confidence score for metadata
    aiEnhanced?: boolean; // For SuperIntelligentMLService
    mlAlgorithm?: string; // For SuperIntelligentMLService
    mlProcessed?: boolean; // For ai-actions.ts
    voiceResult?: any; // For ai-actions.ts
    localGenerated?: boolean; // For ai-actions.ts and SuperIntelligentMLService
    stuResponse?: any; // For ai-actions.ts
    insights?: any; // For ai-actions.ts
    analytics?: any; // For ai-actions.ts
    studyPlan?: any; // For ai-actions.ts
    prediction?: any; // For ai-actions.ts
    [key: string]: any; // Allow additional properties
  };
  
  // Interaction tracking (optional)
  viewedAt?: string; // When user first saw this suggestion
  respondedAt?: string; // When user accepted/rejected
  acceptanceStatus?: AcceptanceStatus; // Made optional to match implementation
}

// Pattern recognition data types
export interface TimePattern {
  mostProductiveHours: number[]; // Hours of day (0-23)
  preferredStudyDuration: number; // Minutes
  averageBreakTime: number; // Minutes
  peakPerformanceDays: string[]; // Days of week
  consistencyScore: number; // 0-1 score
}

export interface DifficultyProfile {
  averageTaskDifficulty: number; // 1-10 scale
  difficultyTrend: 'increasing' | 'decreasing' | 'stable';
  subjectDifficultyMap: Record<string, number>; // Subject -> difficulty level
  adaptationRate: number; // How quickly user adapts to higher difficulty
}

export interface SubjectInsights {
  preferredSubjects: string[];
  strugglingSubjects: string[];
  subjectPerformance: Record<string, {
    completionRate: number; // 0-1
    averageTimeSpent: number; // Minutes
    difficultyProgression: number[]; // Historical difficulty levels
  }>;
}

export interface PatternData {
  userId: string;
  lastAnalyzed: string; // ISO date string
  timePattern: TimePattern;
  difficultyProfile: DifficultyProfile;
  subjectInsights: SubjectInsights;
  totalTasksAnalyzed: number;
  dataQuality: number; // 0-1 confidence score in the analysis
}

// Supabase MCP integration types
export interface SupabaseAIConfig {
  enabled: boolean;
  vectorEmbeddingsEnabled: boolean;
  collaborativeFilteringEnabled: boolean;
  edgeFunctionsEnabled: boolean;
  syncFrequency: 'realtime' | 'hourly' | 'daily' | 'manual';
}

export interface CollaborativeInsight {
  id: string;
  type: 'similar_users' | 'trending_subjects' | 'optimal_schedules' | 'difficulty_progression';
  data: Record<string, unknown>; // More specific type than any
  confidence: number; // 0-1 score
  relevanceScore: number; // 0-1 score for current user
  createdAt: string;
  expiresAt?: string;
}

// AI context state interface
export interface AIContextState {
  // Core state
  isEnabled: boolean;
  isLoading: boolean;
  lastUpdate: string; // ISO date string
  
  // Suggestions
  activeSuggestions: AISuggestion[];
  suggestionHistory: AISuggestion[];
  maxActiveSuggestions: number;
  
  // Patterns and insights
  userPatterns: PatternData | null;
  collaborativeInsights: CollaborativeInsight[];
  
  // Performance tracking
  suggestionAcceptanceRate: number; // 0-1 score
  averageResponseTime: number; // Milliseconds
  totalSuggestionsGenerated: number;
  totalSuggestionsAccepted: number;
}

// Extended UserProfile with AI preferences
export interface ExtendedUserProfile {
  // Existing user profile fields would be spread here
  name: string;
  email: string;
  yearOfStudy: string;
  subjects: string[];
  interests: string[];
  avatar?: string | null;
  birthDate?: string | null;
  bio?: string;
  
  // AI-specific fields (optional for backward compatibility)
  aiPreferences?: UserAIPreferences;
  aiEnabled?: boolean; // Quick toggle for all AI features
  onboardingCompleted?: boolean; // Track if AI onboarding was completed
  lastAIInteraction?: string; // ISO date string
}

// Stu mascot AI integration types
export interface StuAIPersonality {
  currentMood: 'excited' | 'focused' | 'encouraging' | 'celebratory' | 'concerned' | 'neutral';
  personalityTraits: {
    encouragement: number; // 0-1 scale
    humor: number; // 0-1 scale
    directness: number; // 0-1 scale
    empathy: number; // 0-1 scale
  };
  contextualResponses: {
    onSuggestionAccepted: string[];
    onSuggestionRejected: string[];
    onTaskCompleted: string[];
    onProductivitySlump: string[];
    onAchievementUnlocked: string[];
  };
}

export interface StuAIInteraction {
  id: string;
  type: 'suggestion_presentation' | 'celebration' | 'encouragement' | 'check_in' | 'tip_sharing';
  message: string;
  animation?: string; // Animation state identifier
  timestamp: string; // ISO date string
  userResponse?: 'positive' | 'negative' | 'neutral';
  contextData?: {
    relatedSuggestionId?: string;
    relatedTaskId?: string;
    triggerEvent?: string;
  };
}

// Error handling types
export interface AIError {
  code: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: string;
  context?: Record<string, unknown>; // Replace any with proper type
  userMessage?: string; // User-friendly error message
}

// Performance monitoring types
export interface AIPerformanceMetrics {
  responseTime: number; // Milliseconds
  memoryUsage: number; // Bytes
  suggestionGenerationTime: number; // Milliseconds
  patternAnalysisTime: number; // Milliseconds
  lastMeasurement: string; // ISO date string
}

// Type guards for runtime type checking
export const isExtendedTask = (task: unknown): task is ExtendedTask => {
  return !!(task && typeof task === 'object' && task !== null &&
         'id' in task && typeof (task as Record<string, unknown>).id === 'string' && 
         'title' in task && typeof (task as Record<string, unknown>).title === 'string');
};

export const isAISuggestion = (suggestion: unknown): suggestion is AISuggestion => {
  return !!(suggestion && typeof suggestion === 'object' && suggestion !== null &&
         'id' in suggestion && typeof (suggestion as Record<string, unknown>).id === 'string' && 
         'type' in suggestion && typeof (suggestion as Record<string, unknown>).type === 'string' && 
         'title' in suggestion && typeof (suggestion as Record<string, unknown>).title === 'string');
};

export const hasAIMetadata = (task: unknown): task is ExtendedTask & { aiMetadata: AITaskMetadata } => {
  return isExtendedTask(task) && 'aiMetadata' in task && (task as ExtendedTask).aiMetadata !== undefined;
};

// Default AI preferences
export const defaultAIPreferences: UserAIPreferences = {
  enableSuggestions: true,
  suggestionFrequency: 'moderate',
  difficultyPreference: 'adaptive',
  preferredStudyTimes: ['09:00-11:00', '14:00-16:00'],
  preferredStudyDuration: 90, // 1.5 hours
  preferredBreakDuration: 15, // 15 minutes
  maxDailyStudyHours: 8,
  cloudSyncEnabled: false,
  shareAnonymousData: false,
  personalizedStuInteraction: true,
  enableBreakReminders: true,
  enableStudyReminders: true,
  reminderAdvanceTime: 15, // 15 minutes before
  adaptiveDifficulty: true,
  focusOnWeakSubjects: true,
  balanceSubjects: true,
  preferredDifficulty: undefined
};

// Context for AI suggestion generation
export interface SuggestionContext {
  currentTime: Date;
  upcomingTasks: ExtendedTask[];
  recentActivity?: ExtendedTask[];
  userPreferences?: UserAIPreferences;
  taskContext?: Partial<ExtendedTask>;
  suggestionTypes?: string[];
  metadata?: Record<string, unknown>;
  timetable?: ClassTimetableEntry[];
}

// Tier-aware AI types for TieredAIService
export type AIFeatureType = 
  | 'basic_suggestions' 
  | 'advanced_suggestions'
  | 'study_planning'
  | 'voice_processing'
  | 'stu_personality'
  | 'ml_predictions'
  | 'collaborative_filtering'
  | 'premium_analytics';

export interface TierAwareAIRequest {
  userId: string;
  feature: AIFeatureType;
  context?: SuggestionContext;
  tasks: ExtendedTask[];
  metadata?: Record<string, unknown>;
  userTier: 'free' | 'premium' | 'enterprise';
}

export interface TierAwareAIResponse {
  success: boolean;
  data?: AISuggestion[] | PatternData | any;
  tier?: 'free' | 'premium' | 'enterprise';
  subscriptionTier?: 'free' | 'premium' | 'enterprise'; // Actual subscription tier
  launchMode?: boolean; // Whether launch mode is active
  usage?: {
    requestsUsed: number;
    requestsRemaining: number;
    featureAvailable: boolean;
  };
  upgradePrompt?: {
    message: string;
    features: string[];
    ctaText: string;
  };
  error?: string;
  upgradeRequired?: boolean;
  message?: string;
  metadata?: {
    tier?: 'super_intelligent' | 'adaptive_learning' | 'cost_optimized' | 'local_ml';
    confidence?: number;
    responseTime?: number;
    behavioralInsights?: {
      procrastinationRisk?: number;
      energyPatterns?: any;
      optimalStudyTimes?: any;
      motivationLevel?: number;
    };
    moodAnalysis?: {
      stressLevel?: number;
      confidenceLevel?: number;
      engagementLevel?: number;
      recommendations?: any;
    };
    predictions?: {
      optimalStudyWindows?: any[];
      completionProbabilities?: Record<string, number>;
    };
    socialLearningInsights?: {
      similarUserPatterns?: any;
      anonymousPatterns?: any;
    };
    adaptiveLearning?: {
      learningCurve?: any;
      improvementRate?: number;
    };
    interventionSuggestions?: {
      timing?: any;
      type?: any;
    };
    adaptiveDifficultyRecommendations?: any;
    [key: string]: any;
  };
}

export interface AIFeatureConfig {
  name: string;
  requiredTier: 'free' | 'premium' | 'enterprise';
  description: string;
  upgradeMessage: string;
}

export interface TieredAIServiceConfig {
  enableCaching: boolean;
  maxCacheSize: number;
  defaultFeatures: AIFeatureType[];
  upgradePrompts: Record<string, string>;
}

// From suggestionEngine.ts
export interface StudySuggestion {
  id: string;
  type: 'task' | 'break' | 'subject_focus' | 'schedule' | 'difficulty';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  suggestedTime?: string; // ISO string
  duration?: number; // minutes
  subject?: string;
  confidence: number; // 0-1 score
  reasoning: string;
  metadata: {
    category: string;
    tags: string[];
    difficulty?: number;
    estimatedBenefit: number; // 0-1 score
  };
}

// From patternEngine.ts
export type Task = ExtendedTask;

// Missing types for SmartScheduler
export interface ScheduledTask extends ExtendedTask {
  scheduledStart: string; // ISO date string
  scheduledEnd: string; // ISO date string
  startTime: Date; // For compatibility with SmartScheduler
  endTime: Date; // For compatibility with SmartScheduler
  confidence: number; // 0-1 confidence score
  adjustmentReason?: string;
  reasoning: string; // Explanation for why this time was chosen
  duration: number; // Duration in minutes
  taskId: string; // Reference to the original task ID
  metadata?: {
    efficiency?: number;
    [key: string]: any;
  };
  estimatedDifficulty?: number; // 1-10 scale
}

export interface ScheduleAdjustment {
  id: string; // Unique identifier for the adjustment
  taskId: string;
  originalTime: string; // ISO date string
  suggestedTime: string; // ISO date string
  reason: string;
  confidence: number; // 0-1 confidence score
  priority: 'low' | 'medium' | 'high';
  type: 'time_optimization' | 'conflict_resolution' | 'difficulty_adjustment' | 'productivity_optimization';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  suggestedChange: string;
  affectedTasks: string[];
}

export interface TimeSlot {
  start: string; // ISO date string
  end: string; // ISO date string
  startTime: Date; // For compatibility with SmartScheduler
  endTime: Date; // For compatibility with SmartScheduler
  available: boolean;
  conflictsWith?: string[]; // Array of conflicting event IDs
  efficiency?: number; // 0-1 efficiency score for this time slot
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'late_night';
}

export interface ScheduleMetadata {
  tasksScheduled: number;
  conflictsResolved: number;
  averageConfidence: number;
  totalTasks: number;
  scheduledTasks: number;
  conflicts: number;
  efficiency: number;
  confidence: number;
  generatedAt?: string; // ISO date string when schedule was generated
}

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

export interface UserPreferences {
  studyTimePreference: 'morning' | 'afternoon' | 'evening' | 'night';
  sessionLengthPreference: 'short' | 'medium' | 'long'; // 30min, 45min, 60min+
  difficultyComfort: 'easy' | 'moderate' | 'challenging';
  breakFrequency: 'frequent' | 'moderate' | 'minimal';
  preferredSubjects: string[];
  strugglingSubjects: string[];
  studyGoals: string[];
  availableStudyHours: number[]; // Array of hours when user is typically free
  stressFactors?: string[]; // Triggers that cause stress
} 