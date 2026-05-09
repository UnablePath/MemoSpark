import type { UserPreferences } from '@/types/ai';

/**
 * Maps a `user_ai_patterns` row to `UserPreferences` for patternEngine / suggestion prep.
 */
export function userPreferencesFromAiPatternsRow(row: Record<string, unknown> | null): UserPreferences | undefined {
  if (!row) return undefined;

  const hours = row.preferred_study_times;
  const availableStudyHours = Array.isArray(hours)
    ? (hours as unknown[]).map((h) => (typeof h === 'number' ? h : Number.parseInt(String(h), 10))).filter((n) => !Number.isNaN(n))
    : [];

  const ls = row.learning_style as string | undefined;
  const stress = row.stress_triggers;

  return {
    studyTimePreference: 'afternoon',
    sessionLengthPreference: 'medium',
    difficultyComfort: ls === 'challenging' ? 'challenging' : 'moderate',
    breakFrequency: 'moderate',
    preferredSubjects: [],
    strugglingSubjects: [],
    studyGoals: [],
    availableStudyHours: availableStudyHours.length > 0 ? availableStudyHours : [9, 10, 11, 14, 15, 16],
    stressFactors: Array.isArray(stress) ? stress.map(String) : undefined,
  };
}
