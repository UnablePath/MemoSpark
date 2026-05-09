import type { PatternData } from '@/types/ai';

/**
 * Maps a `user_ai_patterns` row (Supabase) to `PatternData` for suggestion/analysis.
 * Shared by schedule route and `/api/ai/suggestions`.
 */
export function patternDataFromStoredRow(
  stored: Record<string, unknown>,
  userId: string,
): PatternData {
  const peaks = stored.productivity_peaks;
  const mostProductiveHours = Array.isArray(peaks)
    ? (peaks as unknown[]).map((n) => Number(n)).filter((n) => !Number.isNaN(n))
    : [];

  const breakPrefs = stored.break_preferences as { duration?: number; frequency?: string } | undefined;

  return {
    userId,
    lastAnalyzed: (stored.last_analyzed_at as string) || new Date().toISOString(),
    timePattern: {
      mostProductiveHours: mostProductiveHours.length > 0 ? mostProductiveHours : [9, 14, 19],
      preferredStudyDuration: (stored.attention_span as number) || 45,
      averageBreakTime: breakPrefs?.duration ?? 15,
      peakPerformanceDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      consistencyScore: (stored.pattern_confidence as Record<string, number> | undefined)?.time_pattern ?? 0.5,
    },
    difficultyProfile: {
      averageTaskDifficulty: 5,
      difficultyTrend: 'stable',
      subjectDifficultyMap: {},
      adaptationRate:
        (stored.pattern_confidence as Record<string, number> | undefined)?.difficulty_profile ?? 0.5,
    },
    subjectInsights: {
      preferredSubjects: [],
      strugglingSubjects: [],
      subjectPerformance: {},
    },
    totalTasksAnalyzed: 0,
    dataQuality: (stored.pattern_confidence as Record<string, number> | undefined)?.subject_insights ?? 0.5,
  };
}
