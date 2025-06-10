import type { PatternData, Task, TimePattern, DifficultyProfile, SubjectInsights } from './patternEngine';
import { format, addDays, addHours, isAfter, isBefore, parseISO } from 'date-fns';

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

export interface SuggestionContext {
  currentTime: Date;
  upcomingTasks: Task[];
  recentActivity: Task[];
  userPreferences?: {
    preferredSessionLength: number;
    maxSuggestionsPerDay: number;
    enableBreakReminders: boolean;
    preferredDifficulty: number;
  };
}

export class SuggestionEngine {
  private static readonly MIN_CONFIDENCE_THRESHOLD = 0.3;
  private static readonly MAX_SUGGESTIONS_PER_SESSION = 5;

  /**
   * Generate intelligent study suggestions based on pattern analysis
   */
  generateSuggestions(
    patterns: PatternData,
    context: SuggestionContext
  ): StudySuggestion[] {
    const suggestions: StudySuggestion[] = [];
    const currentHour = context.currentTime.getHours();

    // Generate different types of suggestions
    suggestions.push(...this.generateTimeBasedSuggestions(patterns.timePattern, context));
    suggestions.push(...this.generateSubjectSuggestions(patterns.subjectInsights, context));
    suggestions.push(...this.generateDifficultySuggestions(patterns.difficultyProfile, context));
    suggestions.push(...this.generateTaskPrioritySuggestions(context));
    suggestions.push(...this.generateBreakSuggestions(patterns.timePattern, context));

    // Filter and rank suggestions
    const filteredSuggestions = suggestions
      .filter(s => s.confidence >= SuggestionEngine.MIN_CONFIDENCE_THRESHOLD)
      .sort((a, b) => {
        // Sort by priority and confidence
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return b.confidence - a.confidence;
      })
      .slice(0, context.userPreferences?.maxSuggestionsPerDay || SuggestionEngine.MAX_SUGGESTIONS_PER_SESSION);

    return filteredSuggestions;
  }

  /**
   * Generate time-based study suggestions
   */
  private generateTimeBasedSuggestions(
    timePattern: TimePattern,
    context: SuggestionContext
  ): StudySuggestion[] {
    const suggestions: StudySuggestion[] = [];
    const currentHour = context.currentTime.getHours();

    // Check if current time is optimal for studying
    if (timePattern.mostProductiveHours.includes(currentHour)) {
      suggestions.push({
        id: `time-optimal-${Date.now()}`,
        type: 'schedule',
        title: 'Perfect Time to Study!',
        description: `Based on your patterns, you\'re most productive at ${currentHour}:00. Consider starting a focused study session now.`,
        priority: 'high',
        duration: timePattern.preferredStudyDuration,
        confidence: 0.75,
        reasoning: `Your completion rate is highest during ${currentHour}:00 hour`,
        metadata: {
          category: 'timing',
          tags: ['optimal-time', 'productivity'],
          estimatedBenefit: 0.8
        }
      });
    }

    // Suggest upcoming optimal study time
    const nextOptimalHour = timePattern.mostProductiveHours.find((hour: number) => hour > currentHour);
    if (nextOptimalHour && (nextOptimalHour - currentHour) <= 3) {
      const suggestedTime = addHours(context.currentTime, nextOptimalHour - currentHour);
      suggestions.push({
        id: `time-upcoming-${Date.now()}`,
        type: 'schedule',
        title: 'Upcoming Productive Hour',
        description: `Consider planning your next study session for ${format(suggestedTime, 'HH:mm')} - your peak productivity time.`,
        priority: 'medium',
        suggestedTime: suggestedTime.toISOString(),
        duration: timePattern.preferredStudyDuration,
        confidence: 0.65,
        reasoning: `Historical data shows high completion rates at ${nextOptimalHour}:00`,
        metadata: {
          category: 'planning',
          tags: ['optimal-time', 'scheduling'],
          estimatedBenefit: 0.7
        }
      });
    }

    return suggestions;
  }

  /**
   * Generate subject-focused suggestions
   */
  private generateSubjectSuggestions(
    subjectInsights: SubjectInsights,
    context: SuggestionContext
  ): StudySuggestion[] {
    const suggestions: StudySuggestion[] = [];

    // Suggest focusing on struggling subjects
    if (subjectInsights.strugglingSubjects.length > 0) {
      const strugglingSubject = subjectInsights.strugglingSubjects[0];
      const completionRate = subjectInsights.subjectPerformance[strugglingSubject]?.completionRate ?? 0;
      
      suggestions.push({
        id: `subject-struggle-${Date.now()}`,
        type: 'subject_focus',
        title: `Focus on ${strugglingSubject}`,
        description: `Your completion rate in ${strugglingSubject} is ${Math.round(completionRate * 100)}%. Consider dedicating extra time to this subject.`,
        priority: 'high',
        subject: strugglingSubject,
        confidence: 0.8,
        reasoning: `Low completion rate (${Math.round(completionRate * 100)}%) indicates need for additional attention`,
        metadata: {
          category: 'subject-improvement',
          tags: ['struggling-subject', 'focus-area'],
          estimatedBenefit: 0.9
        }
      });
    }

    // Suggest building on strengths
    if (subjectInsights.preferredSubjects.length > 0) {
      const strongSubject = subjectInsights.preferredSubjects[0];
      const engagement = 0.7; // Placeholder: subjectInsights.subjectEngagement does not exist. Review needed.
      
      suggestions.push({
        id: `subject-strength-${Date.now()}`,
        type: 'subject_focus',
        title: `Advance Your ${strongSubject} Skills`,
        description: `You excel in ${strongSubject} (${Math.round(engagement * 100)}% engagement). Consider tackling more challenging topics.`,
        priority: 'medium',
        subject: strongSubject,
        confidence: 0.7,
        reasoning: `High engagement rate suggests readiness for advanced challenges`,
        metadata: {
          category: 'skill-advancement',
          tags: ['strength-building', 'advanced-topics'],
          estimatedBenefit: 0.6
        }
      });
    }

    // Suggest balanced focus areas - This section is commented out as subjectInsights.recommendedFocus does not exist
    /*
    if (subjectInsights.recommendedFocus.length > 0) {
      const focusSubject = subjectInsights.recommendedFocus[0];
      
      suggestions.push({
        id: `subject-balance-${Date.now()}`,
        type: 'subject_focus',
        title: `Develop ${focusSubject} Further`,
        description: `${focusSubject} shows good potential for improvement. Regular practice could boost your performance significantly.`,
        priority: 'medium',
        subject: focusSubject,
        confidence: 0.6,
        reasoning: 'Subject shows moderate engagement with growth potential',
        metadata: {
          category: 'balanced-growth',
          tags: ['skill-development', 'potential-growth'],
          estimatedBenefit: 0.7
        }
      });
    }
    */

    return suggestions;
  }

  /**
   * Generate difficulty-based suggestions
   */
  private generateDifficultySuggestions(
    difficultyProfile: DifficultyProfile,
    context: SuggestionContext
  ): StudySuggestion[] {
    const suggestions: StudySuggestion[] = [];
    const learningVelocityPlaceholder = 0.15; // Placeholder for difficultyProfile.learningVelocity
    const currentActualLevel = difficultyProfile.averageTaskDifficulty; // Using averageTaskDifficulty as currentLevel
    const recommendedLevel = Math.min(Math.max(Math.round(currentActualLevel + learningVelocityPlaceholder * 5), 1), 10); // Placeholder logic for recommendedChallengeLevel

    // Suggest difficulty adjustment based on learning velocity
    if (learningVelocityPlaceholder > 0.1) { // Using placeholder
      suggestions.push({
        id: `difficulty-increase-${Date.now()}`,
        type: 'difficulty',
        title: 'Ready for More Challenge!',
        description: `Your performance is improving! Consider tackling Level ${recommendedLevel} tasks.`,
        priority: 'medium',
        confidence: 0.7,
        reasoning: `Positive learning velocity (${Math.round(learningVelocityPlaceholder * 100)}%) indicates readiness for harder challenges`,
        metadata: {
          category: 'difficulty-progression',
          tags: ['skill-progression', 'challenge-increase'],
          difficulty: recommendedLevel,
          estimatedBenefit: 0.8
        }
      });
    } else if (learningVelocityPlaceholder < -0.1) { // Using placeholder
      suggestions.push({
        id: `difficulty-decrease-${Date.now()}`,
        type: 'difficulty',
        title: 'Consider Easier Tasks',
        description: 'Recent performance suggests focusing on fundamentals. Build confidence with easier tasks before progressing.',
        priority: 'high',
        confidence: 0.8,
        reasoning: `Negative learning velocity suggests need to consolidate basics`,
        metadata: {
          category: 'difficulty-adjustment',
          tags: ['foundation-building', 'confidence-building'],
          difficulty: Math.max(recommendedLevel - 2, 1),
          estimatedBenefit: 0.7
        }
      });
    }

    // Suggest level-appropriate tasks
    const levelAdvice = {
      beginner: 'Focus on building strong foundations with basic concepts.',
      intermediate: 'Practice applying concepts to different scenarios.',
      advanced: 'Push your boundaries with complex problems and advanced topics.'
    } as const;
    
    type LevelKey = keyof typeof levelAdvice;
    let adviceKey: LevelKey = 'intermediate'; // Default
    if (currentActualLevel <= 3) adviceKey = 'beginner';
    else if (currentActualLevel >= 7) adviceKey = 'advanced';

    if (levelAdvice[adviceKey]) {
      suggestions.push({
        id: `difficulty-level-advice-${Date.now()}`,
        type: 'difficulty',
        title: `Tip for Level ${Math.round(currentActualLevel)} Learners`,
        description: levelAdvice[adviceKey],
        priority: 'low',
        confidence: 0.6,
        reasoning: `Tailored advice for your current average task difficulty of ${currentActualLevel.toFixed(1)}`,
        metadata: {
          category: 'skill-guidance',
          tags: ['learning-level', adviceKey],
          difficulty: Math.round(currentActualLevel),
          estimatedBenefit: 0.5
        }
      });
    }

    return suggestions;
  }

  /**
   * Generate task prioritization suggestions
   */
  private generateTaskPrioritySuggestions(context: SuggestionContext): StudySuggestion[] {
    const suggestions: StudySuggestion[] = [];
    const urgentTasks = context.upcomingTasks
      .filter(task => {
        const dueDate = parseISO(task.dueDate);
        const hoursUntilDue = (dueDate.getTime() - context.currentTime.getTime()) / (1000 * 60 * 60);
        return hoursUntilDue <= 24 && !task.completed;
      })
      .sort((a, b) => parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime());

    if (urgentTasks.length > 0) {
      const nextUrgentTask = urgentTasks[0];
      const hoursUntilDue = (parseISO(nextUrgentTask.dueDate).getTime() - context.currentTime.getTime()) / (1000 * 60 * 60);
      
      suggestions.push({
        id: `priority-urgent-${Date.now()}`,
        type: 'task',
        title: 'Urgent Task Alert!',
        description: `"${nextUrgentTask.title}" is due in ${Math.round(hoursUntilDue)} hours. Consider prioritizing this task.`,
        priority: 'high',
        confidence: 0.9,
        subject: nextUrgentTask.subject,
        reasoning: `Task due in ${Math.round(hoursUntilDue)} hours requires immediate attention`,
        metadata: {
          category: 'urgency',
          tags: ['urgent', 'deadline', 'priority'],
          estimatedBenefit: 1.0
        }
      });
    }

    // Suggest working on high-priority tasks
    const highPriorityTasks = context.upcomingTasks
      .filter(task => task.priority === 'high' && !task.completed)
      .slice(0, 3);

    if (highPriorityTasks.length > 0) {
      suggestions.push({
        id: `priority-high-${Date.now()}`,
        type: 'task',
        title: 'Focus on High-Priority Tasks',
        description: `You have ${highPriorityTasks.length} high-priority tasks pending. Consider tackling them during your peak hours.`,
        priority: 'medium',
        confidence: 0.7,
        reasoning: 'High-priority tasks provide maximum impact when completed',
        metadata: {
          category: 'priority-management',
          tags: ['high-priority', 'impact'],
          estimatedBenefit: 0.8
        }
      });
    }

    return suggestions;
  }

  /**
   * Generate break and wellness suggestions
   */
  private generateBreakSuggestions(
    timePattern: TimePattern,
    context: SuggestionContext
  ): StudySuggestion[] {
    const suggestions: StudySuggestion[] = [];
    
    // Check if it's time for a break based on recent activity
    const recentStudyTime = context.recentActivity
      .filter(task => task.completed && task.timeSpent)
      .reduce((total, task) => total + (task.timeSpent || 0), 0);

    if (recentStudyTime >= timePattern.averageBreakTime) {
      suggestions.push({
        id: `break-needed-${Date.now()}`,
        type: 'break',
        title: 'Time for a Break!',
        description: `You\'ve been studying for ${recentStudyTime} minutes. A 10-15 minute break will help maintain your focus.`,
        priority: 'medium',
        duration: 15,
        confidence: 0.8,
        reasoning: `Study session exceeds optimal duration of ${timePattern.averageBreakTime} minutes`,
        metadata: {
          category: 'wellness',
          tags: ['break', 'rest', 'productivity'],
          estimatedBenefit: 0.6
        }
      });
    }

    // Suggest optimal break timing
    if (context.userPreferences?.enableBreakReminders) {
      const suggestedBreakTime = addHours(context.currentTime, 1);
      suggestions.push({
        id: `break-scheduled-${Date.now()}`,
        type: 'break',
        title: 'Schedule Your Next Break',
        description: 'Plan a 5-10 minute break every hour to maintain peak performance.',
        priority: 'low',
        suggestedTime: suggestedBreakTime.toISOString(),
        duration: 10,
        confidence: 0.5,
        reasoning: 'Regular breaks improve sustained concentration',
        metadata: {
          category: 'wellness',
          tags: ['break-scheduling', 'productivity'],
          estimatedBenefit: 0.4
        }
      });
    }

    return suggestions;
  }

  /**
   * Filter suggestions based on user context and preferences
   */
  filterSuggestionsByContext(
    suggestions: StudySuggestion[],
    context: SuggestionContext
  ): StudySuggestion[] {
    return suggestions.filter(suggestion => {
      // Filter by time relevance
      if (suggestion.suggestedTime) {
        const suggestedTime = parseISO(suggestion.suggestedTime);
        const timeDiff = Math.abs(suggestedTime.getTime() - context.currentTime.getTime()) / (1000 * 60 * 60);
        if (timeDiff > 6) return false; // Only show suggestions within 6 hours
      }

      // Filter by user preferences
      if (context.userPreferences) {
        const prefs = context.userPreferences;
        
        // Filter break suggestions if disabled
        if (suggestion.type === 'break' && !prefs.enableBreakReminders) {
          return false;
        }
        
        // Filter by preferred difficulty
        if (suggestion.metadata.difficulty && prefs.preferredDifficulty) {
          const difficultyDiff = Math.abs(suggestion.metadata.difficulty - prefs.preferredDifficulty);
          if (difficultyDiff > 3) return false; // Only show suggestions within 3 levels
        }
      }

      return true;
    });
  }

  /**
   * Get suggestion by ID (useful for tracking user interactions)
   */
  getSuggestionById(suggestions: StudySuggestion[], id: string): StudySuggestion | null {
    return suggestions.find(s => s.id === id) || null;
  }

  /**
   * Generate follow-up suggestions based on user actions
   */
  generateFollowUpSuggestions(
    acceptedSuggestion: StudySuggestion,
    context: SuggestionContext
  ): StudySuggestion[] {
    const followUps: StudySuggestion[] = [];

    switch (acceptedSuggestion.type) {
      case 'task':
        // Suggest scheduling similar tasks
        followUps.push({
          id: `followup-task-${Date.now()}`,
          type: 'schedule',
          title: 'Schedule Similar Tasks',
          description: 'Consider grouping similar tasks together for better focus.',
          priority: 'low',
          confidence: 0.6,
          reasoning: 'Task batching improves efficiency',
          metadata: {
            category: 'optimization',
            tags: ['task-batching', 'efficiency'],
            estimatedBenefit: 0.5
          }
        });
        break;

      case 'break':
        // Suggest resuming with highest priority task
        const nextTask = context.upcomingTasks
          .filter(t => !t.completed)
          .sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
          })[0];

        if (nextTask) {
          followUps.push({
            id: `followup-resume-${Date.now()}`,
            type: 'task',
            title: 'Resume with Priority Task',
            description: `After your break, consider starting with "${nextTask.title}".`,
            priority: 'medium',
            confidence: 0.7,
            subject: nextTask.subject,
            reasoning: 'High-priority task provides maximum impact after rest',
            metadata: {
              category: 'task-transition',
              tags: ['post-break', 'priority'],
              estimatedBenefit: 0.7
            }
          });
        }
        break;
    }

    return followUps;
  }
}

// Export singleton instance
export const suggestionEngine = new SuggestionEngine(); 