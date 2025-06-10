import type { UserPreferences, ClassTimetableEntry } from './patternEngine';

export interface OnboardingQuestion {
  id: string;
  type: 'single-choice' | 'multi-choice' | 'time-selector' | 'slider' | 'text-input';
  question: string;
  description?: string;
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: any;
  required?: boolean;
}

export interface OnboardingResponse {
  questionId: string;
  value: any;
}

export const ONBOARDING_QUESTIONS: OnboardingQuestion[] = [
  {
    id: 'studyTimePreference',
    type: 'single-choice',
    question: 'When do you prefer to study?',
    description: 'Choose the time of day when you feel most focused and productive.',
    options: ['morning', 'afternoon', 'evening', 'night'],
    required: true
  },
  {
    id: 'sessionLengthPreference',
    type: 'single-choice',
    question: 'How long do you prefer your study sessions?',
    description: 'This helps us suggest optimal break timing and session planning.',
    options: ['short', 'medium', 'long'],
    required: true
  },
  {
    id: 'difficultyComfort',
    type: 'single-choice',
    question: 'What level of challenge do you prefer?',
    description: 'We\'ll adjust task difficulty recommendations based on your comfort level.',
    options: ['easy', 'moderate', 'challenging'],
    required: true
  },
  {
    id: 'breakFrequency',
    type: 'single-choice',
    question: 'How often do you like to take breaks?',
    description: 'This helps us suggest when you might need a rest during study sessions.',
    options: ['frequent', 'moderate', 'minimal'],
    required: true
  },
  {
    id: 'preferredSubjects',
    type: 'multi-choice',
    question: 'Which subjects do you enjoy or excel in?',
    description: 'Select all that apply. We\'ll suggest building on these strengths.',
    options: [
      'Mathematics',
      'Physics',
      'Chemistry',
      'Biology',
      'History',
      'Literature',
      'Languages',
      'Computer Science',
      'Psychology',
      'Economics',
      'Art',
      'Music',
      'Philosophy',
      'Other'
    ],
    required: false
  },
  {
    id: 'strugglingSubjects',
    type: 'multi-choice',
    question: 'Which subjects do you find challenging?',
    description: 'We\'ll provide extra support and suggestions for these areas.',
    options: [
      'Mathematics',
      'Physics',
      'Chemistry',
      'Biology',
      'History',
      'Literature',
      'Languages',
      'Computer Science',
      'Psychology',
      'Economics',
      'Art',
      'Music',
      'Philosophy',
      'Other'
    ],
    required: false
  },
  {
    id: 'availableStudyHours',
    type: 'time-selector',
    question: 'When are you typically free to study?',
    description: 'Select the hours when you\'re usually available for focused study sessions.',
    required: false
  },
  {
    id: 'studyGoals',
    type: 'multi-choice',
    question: 'What are your main study goals?',
    description: 'This helps us tailor suggestions to your objectives.',
    options: [
      'Improve grades',
      'Prepare for exams',
      'Build study habits',
      'Reduce stress',
      'Better time management',
      'Increase productivity',
      'Learn new skills',
      'Academic achievement'
    ],
    required: false
  }
];

/**
 * This class ensures that new users are guided through an initial setup
 * process to configure their AI preferences, which enhances the quality
 * of personalized suggestions from day one.
 */
export class OnboardingManager {
  private static readonly ONBOARDING_COMPLETED_KEY = 'memospark_onboarding_completed';
  private static readonly ONBOARDING_RESPONSES_KEY = 'memospark_onboarding_responses';

  /**
   * Check if user has completed onboarding
   */
  static isOnboardingCompleted(): boolean {
    try {
      return localStorage.getItem(OnboardingManager.ONBOARDING_COMPLETED_KEY) === 'true';
    } catch (error) {
      return false;
    }
  }

  /**
   * Mark onboarding as completed
   */
  static markOnboardingCompleted(): void {
    try {
      localStorage.setItem(OnboardingManager.ONBOARDING_COMPLETED_KEY, 'true');
    } catch (error) {
      console.error('Failed to mark onboarding as completed:', error);
    }
  }

  /**
   * Save onboarding responses
   */
  static saveOnboardingResponses(responses: OnboardingResponse[]): void {
    try {
      localStorage.setItem(OnboardingManager.ONBOARDING_RESPONSES_KEY, JSON.stringify(responses));
    } catch (error) {
      console.error('Failed to save onboarding responses:', error);
    }
  }

  /**
   * Get saved onboarding responses
   */
  static getOnboardingResponses(): OnboardingResponse[] {
    try {
      const stored = localStorage.getItem(OnboardingManager.ONBOARDING_RESPONSES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load onboarding responses:', error);
      return [];
    }
  }

  /**
   * Convert onboarding responses to UserPreferences
   */
  static convertResponsesToPreferences(responses: OnboardingResponse[]): UserPreferences {
    const responseMap = new Map(responses.map(r => [r.questionId, r.value]));

    return {
      studyTimePreference: responseMap.get('studyTimePreference') || 'morning',
      sessionLengthPreference: responseMap.get('sessionLengthPreference') || 'medium',
      difficultyComfort: responseMap.get('difficultyComfort') || 'moderate',
      breakFrequency: responseMap.get('breakFrequency') || 'moderate',
      preferredSubjects: responseMap.get('preferredSubjects') || [],
      strugglingSubjects: responseMap.get('strugglingSubjects') || [],
      studyGoals: responseMap.get('studyGoals') || [],
      availableStudyHours: responseMap.get('availableStudyHours') || []
    };
  }

  /**
   * Generate smart default preferences from existing timetable data
   */
  static generateDefaultsFromTimetable(timetable: ClassTimetableEntry[]): Partial<UserPreferences> {
    if (timetable.length === 0) {
      return {};
    }

    // Extract subjects from timetable
    const timetableSubjects = timetable.map(entry => entry.courseName);

    // Analyze class times to suggest free study hours
    const busyHours = new Set<number>();
    timetable.forEach(entry => {
      const startHour = Number.parseInt(entry.startTime.split(':')[0]);
      const endHour = Number.parseInt(entry.endTime.split(':')[0]);
      for (let hour = startHour; hour <= endHour; hour++) {
        busyHours.add(hour);
      }
    });

    // Find free hours (8am to 10pm)
    const availableStudyHours: number[] = [];
    for (let hour = 8; hour <= 22; hour++) {
      if (!busyHours.has(hour)) {
        availableStudyHours.push(hour);
      }
    }

    // Determine time preference based on free slots
    let studyTimePreference: 'morning' | 'afternoon' | 'evening' | 'night' = 'afternoon';
    const morningFree = availableStudyHours.some(h => h >= 8 && h <= 11);
    const afternoonFree = availableStudyHours.some(h => h >= 12 && h <= 17);
    const eveningFree = availableStudyHours.some(h => h >= 18 && h <= 21);

    if (morningFree && !afternoonFree) studyTimePreference = 'morning';
    else if (eveningFree && !afternoonFree) studyTimePreference = 'evening';
    else if (afternoonFree) studyTimePreference = 'afternoon';

    return {
      preferredSubjects: timetableSubjects.slice(0, 3), // Take first 3 subjects as default preferences
      availableStudyHours: availableStudyHours.slice(0, 6), // Limit to 6 hours
      studyTimePreference
    };
  }

  /**
   * Get intelligent defaults for quick setup
   */
  static getIntelligentDefaults(timetable: ClassTimetableEntry[] = []): UserPreferences {
    const timetableDefaults = OnboardingManager.generateDefaultsFromTimetable(timetable);

    return {
      studyTimePreference: timetableDefaults.studyTimePreference || 'afternoon',
      sessionLengthPreference: 'medium',
      difficultyComfort: 'moderate',
      breakFrequency: 'moderate',
      preferredSubjects: timetableDefaults.preferredSubjects || [],
      strugglingSubjects: [],
      studyGoals: ['Build study habits', 'Better time management'],
      availableStudyHours: timetableDefaults.availableStudyHours || [9, 14, 19]
    };
  }

  /**
   * Validate onboarding responses
   */
  static validateResponses(responses: OnboardingResponse[]): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const responseMap = new Map(responses.map(r => [r.questionId, r.value]));

    // Check required questions
    const requiredQuestions = ONBOARDING_QUESTIONS.filter(q => q.required);
    requiredQuestions.forEach(question => {
      if (!responseMap.has(question.id) || !responseMap.get(question.id)) {
        errors.push(`${question.question} is required`);
      }
    });

    // Validate specific responses
    const preferredSubjects = responseMap.get('preferredSubjects') || [];
    const strugglingSubjects = responseMap.get('strugglingSubjects') || [];
    
    // Check for overlap between preferred and struggling subjects
    const overlap = preferredSubjects.filter((subject: string) => strugglingSubjects.includes(subject));
    if (overlap.length > 0) {
      warnings.push(`You selected ${overlap.join(', ')} as both preferred and struggling subjects`);
    }

    // Check for reasonable available study hours
    const availableHours = responseMap.get('availableStudyHours') || [];
    if (availableHours.length === 0) {
      warnings.push('No study hours selected. We\'ll use smart defaults based on your preferences.');
    } else if (availableHours.length > 12) {
      warnings.push('You selected many study hours. Consider focusing on your most productive times.');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Reset onboarding (for testing or re-setup)
   */
  static resetOnboarding(): void {
    try {
      localStorage.removeItem(OnboardingManager.ONBOARDING_COMPLETED_KEY);
      localStorage.removeItem(OnboardingManager.ONBOARDING_RESPONSES_KEY);
    } catch (error) {
      console.error('Failed to reset onboarding:', error);
    }
  }

  /**
   * Get onboarding progress (for progress indicators)
   */
  static getOnboardingProgress(responses: OnboardingResponse[]): {
    completed: number;
    total: number;
    percentage: number;
    nextQuestion?: OnboardingQuestion;
  } {
    const answeredQuestionIds = new Set(responses.map(r => r.questionId));
    const requiredQuestions = ONBOARDING_QUESTIONS.filter(q => q.required);
    const requiredCompleted = requiredQuestions.filter(q => answeredQuestionIds.has(q.id)).length;
    
    const totalAnswered = responses.length;
    const totalQuestions = ONBOARDING_QUESTIONS.length;
    
    const nextQuestion = ONBOARDING_QUESTIONS.find(q => !answeredQuestionIds.has(q.id));
    
    return {
      completed: totalAnswered,
      total: totalQuestions,
      percentage: Math.round((totalAnswered / totalQuestions) * 100),
      nextQuestion
    };
  }

  /**
   * Quick setup with minimal questions (for users who want to skip detailed onboarding)
   */
  static generateQuickSetupResponses(
    studyTimePreference: 'morning' | 'afternoon' | 'evening' | 'night' = 'afternoon',
    timetable: ClassTimetableEntry[] = []
  ): OnboardingResponse[] {
    const defaults = OnboardingManager.getIntelligentDefaults(timetable);
    
    return [
      { questionId: 'studyTimePreference', value: studyTimePreference },
      { questionId: 'sessionLengthPreference', value: defaults.sessionLengthPreference },
      { questionId: 'difficultyComfort', value: defaults.difficultyComfort },
      { questionId: 'breakFrequency', value: defaults.breakFrequency },
      { questionId: 'preferredSubjects', value: defaults.preferredSubjects },
      { questionId: 'strugglingSubjects', value: defaults.strugglingSubjects },
      { questionId: 'availableStudyHours', value: defaults.availableStudyHours },
      { questionId: 'studyGoals', value: defaults.studyGoals }
    ];
  }
}

// Utility functions for UI components
export const OnboardingUtils = {
  /**
   * Format question options for display
   */
  formatOption(option: string, context?: string): string {
    const formatMap: Record<string, string> = {
      'morning': '🌅 Morning (6AM - 11AM)',
      'afternoon': '☀️ Afternoon (12PM - 5PM)',
      'evening': '🌆 Evening (6PM - 9PM)',
      'night': '🌙 Night (10PM - 12AM)',
      'short': '⚡ Short (30 minutes)',
      'medium': '⏰ Medium (45 minutes)',
      'long': '📚 Long (60+ minutes)',
      'easy': '🟢 Easy - Build confidence',
      'moderate_difficulty': '🟡 Moderate - Balanced challenge',
      'challenging': '🔴 Challenging - Push limits',
      'frequent': '🔄 Frequent (every 25-30 min)',
      'moderate_breaks': '⏱️ Moderate (every 45-60 min)',
      'minimal': '🎯 Minimal (90+ min sessions)'
    };
    
    // Handle context-specific formatting for 'moderate'
    if (option === 'moderate') {
      if (context === 'difficulty') {
        return formatMap['moderate_difficulty'];
      } else if (context === 'breaks') {
        return formatMap['moderate_breaks'];
      }
      // Default for moderate
      return '🟡 Moderate';
    }
    
    return formatMap[option] || option;
  },

  /**
   * Get time options for time selector
   */
  getTimeOptions(): Array<{value: number, label: string}> {
    const options = [];
    for (let hour = 6; hour <= 23; hour++) {
      const label = hour < 12 
        ? `${hour}:00 AM` 
        : hour === 12 
          ? '12:00 PM' 
          : `${hour - 12}:00 PM`;
      options.push({ value: hour, label });
    }
    return options;
  },

  /**
   * Estimate completion time for onboarding
   */
  estimateCompletionTime(questionCount: number = ONBOARDING_QUESTIONS.length): string {
    const estimatedMinutes = Math.ceil(questionCount * 0.5); // 30 seconds per question
    return `${estimatedMinutes} minute${estimatedMinutes !== 1 ? 's' : ''}`;
  },

  /**
   * Get completion benefits text
   */
  getCompletionBenefits(): string[] {
    return [
      '📊 Personalized study schedule recommendations',
      '🎯 Smart task difficulty suggestions',
      '⏰ Optimal break timing reminders',
      '📈 Subject-specific improvement tips',
      '🚀 Productivity insights from day one'
    ];
  }
}; 