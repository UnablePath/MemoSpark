/**
 * Questionnaire-primary merge for `user_ai_patterns` when the schedule route
 * (behavior/task inference) also writes the same row. See plan §4C.1.
 */
export const QUESTIONNAIRE_PROTECTED_KEYS = [
  'preferred_study_times',
  'learning_style',
  'attention_span',
  'difficulty_preference',
  'break_preferences',
  'collaboration_preference',
  'stress_triggers',
  'stress_relief_preferences',
  'motivation_factors',
  'deadline_pressure_response',
  'productivity_peaks',
  'notification_timing',
  'reminder_frequency',
  'task_completion_style',
] as const;

function isMeaningfulValue(val: unknown): boolean {
  if (val == null) return false;
  if (Array.isArray(val)) return val.length > 0;
  if (typeof val === 'object') return Object.keys(val as object).length > 0;
  if (typeof val === 'string') return val.trim().length > 0;
  return true;
}

/**
 * Merge schedule-derived patch into existing row: questionnaire-sourced columns
 * are preserved when already set; schedule fills gaps and always supplies
 * behavior-scoped fields (e.g. merged pattern_confidence from tasks).
 */
export function mergeScheduleIntoUserAiPatterns(
  existing: Record<string, unknown> | null,
  schedulePatch: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...schedulePatch };

  if (!existing) {
    return out;
  }

  for (const key of QUESTIONNAIRE_PROTECTED_KEYS) {
    if (isMeaningfulValue(existing[key])) {
      out[key] = existing[key];
    }
  }

  const existingPc =
    typeof existing.pattern_confidence === 'object' && existing.pattern_confidence !== null
      ? (existing.pattern_confidence as Record<string, unknown>)
      : {};
  const patchPc =
    typeof schedulePatch.pattern_confidence === 'object' && schedulePatch.pattern_confidence !== null
      ? (schedulePatch.pattern_confidence as Record<string, unknown>)
      : {};
  if (Object.keys(existingPc).length || Object.keys(patchPc).length) {
    out.pattern_confidence = { ...existingPc, ...patchPc };
  }

  const dsExisting = Array.isArray(existing.data_sources) ? existing.data_sources.map(String) : [];
  const dsPatch = Array.isArray(schedulePatch.data_sources) ? schedulePatch.data_sources.map(String) : [];
  out.data_sources = [...new Set([...dsExisting, ...dsPatch])];

  return out;
}
