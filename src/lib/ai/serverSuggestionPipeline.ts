import type { SupabaseClient } from '@supabase/supabase-js';
import {
  defaultAIPreferences,
  type ExtendedTask,
  type PatternData,
  type Priority,
  type StudySuggestion,
  type SuggestionContext,
  type TaskType,
  type UserAIPreferences,
} from '@/types/ai';
import { patternEngine } from '@/lib/ai/patternEngine';
import { suggestionEngine } from '@/lib/ai/suggestionEngine';
import { patternDataFromStoredRow } from '@/lib/ai/userAiPatternsToPatternData';
import { userPreferencesFromAiPatternsRow } from '@/lib/ai/userAiPatternsPreferences';

type PremiumFeature =
  | 'study_planning'
  | 'voice_processing'
  | 'stu_personality'
  | 'ml_predictions'
  | 'collaborative_filtering'
  | 'premium_analytics';

function normalizeTasksForAI(raw: unknown): ExtendedTask[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((t: Record<string, unknown>, i: number) => ({
    id: String(t.id ?? `task-${i}`),
    title: (t.title as string) ?? 'Task',
    dueDate: (t.due_date as string) ?? (t.dueDate as string) ?? new Date().toISOString(),
    priority: ((t.priority as Priority) || 'medium') as Priority,
    type: ((t.type as TaskType) || 'academic') as TaskType,
    subject: t.subject as string | undefined,
    completed: Boolean(t.completed),
    reminder: Boolean(t.reminder ?? (t.reminder_settings as { enabled?: boolean })?.enabled),
    description: (t.description as string) ?? '',
    createdAt: (t.created_at as string) ?? (t.createdAt as string) ?? new Date().toISOString(),
    updatedAt: (t.updated_at as string) ?? (t.updatedAt as string) ?? new Date().toISOString(),
    estimatedDuration: (t.estimated_duration as number) ?? (t.estimatedMinutes as number) ?? (t.estimated_time as number),
    completedAt: (t.completed_at as string) ?? (t.completedAt as string),
    timeSpent: t.time_spent as number | undefined,
  }));
}

function clamp01(n: number): number {
  if (Number.isNaN(n) || !Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function toIso(d: Date): string {
  return d.toISOString();
}

function safeDate(v: unknown, fallback: Date): Date {
  if (typeof v !== 'string') return fallback;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

function minutesBetween(a: Date, b: Date): number {
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 60000));
}

function hourFromIso(iso: string): number | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.getHours();
}

function stableHashToUnitInterval(input: string): number {
  // Deterministic lightweight hash -> [0,1)
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return (h % 10000) / 10000;
}

function parseTimeRange(s: string): { startHour: number; endHour: number } | null {
  // Expected: "09:00-11:00"
  if (typeof s !== 'string') return null;
  const [a, b] = s.split('-');
  if (!a || !b) return null;
  const h1 = Number.parseInt(a.split(':')[0] ?? '', 10);
  const h2 = Number.parseInt(b.split(':')[0] ?? '', 10);
  if (!Number.isFinite(h1) || !Number.isFinite(h2)) return null;
  return { startHour: Math.max(0, Math.min(23, h1)), endHour: Math.max(0, Math.min(23, h2)) };
}

function preferredHoursFromPatterns(row: Record<string, unknown> | null, merged: PatternData): number[] {
  const peaks = Array.isArray(row?.productivity_peaks)
    ? (row?.productivity_peaks as unknown[]).map((x) => Number.parseInt(String(x), 10)).filter((n) => Number.isFinite(n))
    : [];
  if (peaks.length) return [...new Set(peaks)].sort((a, b) => a - b).slice(0, 6);
  const hours = merged.timePattern.mostProductiveHours ?? [];
  return [...new Set(hours)].sort((a, b) => a - b).slice(0, 6);
}

function stressLoadFromSignals(
  row: Record<string, unknown> | null,
  tasks: ExtendedTask[],
  now: Date,
): { stressLoad: number; reasons: string[] } {
  const pending = tasks.filter((t) => !t.completed);
  const overdue = pending.filter((t) => new Date(t.dueDate).getTime() < now.getTime()).length;
  const dueSoon = pending.filter((t) => minutesBetween(now, safeDate(t.dueDate, now)) <= 24 * 60).length;
  const highPriority = pending.filter((t) => t.priority === 'high').length;

  const base = clamp01(0.2 + overdue * 0.12 + dueSoon * 0.06 + highPriority * 0.04);
  const deadlineResponse = String(row?.deadline_pressure_response ?? '').toLowerCase();
  const multiplier =
    deadlineResponse.includes('strugg') ? 1.15 : deadlineResponse.includes('thrive') ? 0.95 : 1.0;
  const stressLoad = clamp01(base * multiplier);
  const reasons = [
    overdue ? `${overdue} overdue tasks` : null,
    dueSoon ? `${dueSoon} due within 24h` : null,
    highPriority ? `${highPriority} high-priority tasks` : null,
    deadlineResponse ? `deadline response: ${deadlineResponse}` : null,
  ].filter(Boolean) as string[];
  return { stressLoad, reasons };
}

function momentumFromTasks(tasks: ExtendedTask[], merged: PatternData): { momentum: number; reasons: string[] } {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;
  const completionRate = total > 0 ? completed / total : 0;
  const consistency = clamp01(merged.timePattern.consistencyScore ?? 0.5);
  const momentum = clamp01(0.15 + 0.55 * completionRate + 0.3 * consistency);
  const reasons = [
    `completion rate ${(completionRate * 100).toFixed(0)}%`,
    `consistency ${(consistency * 100).toFixed(0)}%`,
  ];
  return { momentum, reasons };
}

function inferArchetype(row: Record<string, unknown> | null, merged: PatternData): {
  archetype: string;
  explanation: string;
  confidence: number;
} {
  const ls = String(row?.learning_style ?? '').toLowerCase();
  const dp = String(row?.difficulty_preference ?? '').toLowerCase();
  const breakPref = row?.break_preferences as { frequency?: string } | undefined;
  const breakFreq = String(breakPref?.frequency ?? '').toLowerCase();
  const hours = preferredHoursFromPatterns(row, merged);
  const earlyBias = hours.length ? hours.reduce((acc, h) => acc + (h < 12 ? 1 : 0), 0) / hours.length : 0.5;

  const features = [
    ls.includes('visual') ? 'visual' : ls.includes('auditory') ? 'auditory' : ls ? 'mixed' : 'mixed',
    dp.includes('hard') ? 'challenging' : dp.includes('easy') ? 'comfortable' : 'adaptive',
    breakFreq.includes('frequent') ? 'sprinter' : breakFreq.includes('minimal') ? 'marathon' : 'balanced',
    earlyBias > 0.6 ? 'morning' : earlyBias < 0.4 ? 'evening' : 'midday',
  ];

  const signature = features.join('|');
  const s = stableHashToUnitInterval(signature);
  const archetype =
    s < 0.2
      ? 'Morning Sprinter'
      : s < 0.4
        ? 'Steady Marathoner'
        : s < 0.6
          ? 'Deadline Crammer (tamed)'
          : s < 0.8
            ? 'Balanced Builder'
            : 'Flexible Adapter';

  const confidence = clamp01(0.55 + 0.35 * (row ? 1 : 0) + 0.1 * clamp01(merged.dataQuality ?? 0.6));
  const explanation = `Derived from learning_style=${features[0]}, difficulty=${features[1]}, break=${features[2]}, time=${features[3]}.`;
  return { archetype, explanation, confidence };
}

function mergeUserAIPreferences(
  base: UserAIPreferences,
  row: Record<string, unknown> | null,
): UserAIPreferences {
  if (!row) return base;
  const next = { ...base };
  if (typeof row.attention_span === 'number') next.preferredStudyDuration = row.attention_span;
  const bp = row.break_preferences as { duration?: number } | undefined;
  if (bp?.duration) next.preferredBreakDuration = bp.duration;
  return next;
}

/**
 * Prefer stored questionnaire/schedule patterns for timing; keep live task-derived signals for subjects.
 */
function mergePatternDataFromDbAndTasks(
  dbRow: Record<string, unknown> | null,
  live: PatternData,
  userId: string,
): PatternData {
  if (!dbRow) return live;
  const db = patternDataFromStoredRow(dbRow, userId);

  const useLiveSubjects = live.totalTasksAnalyzed > 0;

  return {
    ...live,
    timePattern: {
      ...live.timePattern,
      mostProductiveHours:
        db.timePattern.mostProductiveHours.length > 0
          ? db.timePattern.mostProductiveHours
          : live.timePattern.mostProductiveHours,
      preferredStudyDuration: db.timePattern.preferredStudyDuration || live.timePattern.preferredStudyDuration,
      averageBreakTime: db.timePattern.averageBreakTime || live.timePattern.averageBreakTime,
      consistencyScore: Math.min(
        1,
        (db.timePattern.consistencyScore + live.timePattern.consistencyScore) / 2,
      ),
    },
    difficultyProfile: {
      ...live.difficultyProfile,
      adaptationRate: db.difficultyProfile.adaptationRate || live.difficultyProfile.adaptationRate,
    },
    subjectInsights: useLiveSubjects ? live.subjectInsights : db.subjectInsights,
    dataQuality: Math.min(1, (db.dataQuality + live.dataQuality) / 2 + 0.05),
    lastAnalyzed: live.lastAnalyzed,
  };
}

function mapStudySuggestionToApi(s: StudySuggestion) {
  const typeMap: Record<string, string> = {
    schedule: 'study_time',
    task: 'task_suggestion',
    subject_focus: 'subject_focus',
    break: 'break_reminder',
    difficulty: 'difficulty_adjustment',
  };
  return {
    id: s.id,
    type: typeMap[s.type] ?? 'task_suggestion',
    title: s.title,
    description: s.description,
    priority: s.priority,
    estimatedTime: s.duration,
    difficulty: 'medium',
    confidence: s.confidence,
    reasoning: s.reasoning,
    metadata: s.metadata,
  };
}

function appendWellnessFromRow(row: Record<string, unknown> | null, limit: number) {
  if (!row) return [];
  const stress = row.stress_relief_preferences;
  const motivation = row.motivation_factors;
  const out: ReturnType<typeof mapStudySuggestionToApi>[] = [];

  if (Array.isArray(stress) && stress.length > 0) {
    out.push({
      id: `wellness-stress-${Date.now()}`,
      type: 'study_habit_tip',
      title: 'Stress relief from your profile',
      description: `You mentioned ${String(stress[0])} — short resets can help before deep work.`,
      priority: 'medium' as const,
      estimatedTime: 5,
      difficulty: 'easy',
      confidence: 0.72,
      reasoning: 'From your questionnaire stress preferences',
      metadata: { category: 'wellness', tags: ['questionnaire', 'stress'], estimatedBenefit: 0.72 },
    });
  }

  if (Array.isArray(motivation) && motivation.length > 0 && out.length < limit) {
    out.push({
      id: `wellness-motivation-${Date.now()}`,
      type: 'study_habit_tip',
      title: 'Lean on what motivates you',
      description: `Your motivation signals include ${String(motivation[0])}. Tie the next task to that.`,
      priority: 'low' as const,
      estimatedTime: 10,
      difficulty: 'easy',
      confidence: 0.7,
      reasoning: 'From your questionnaire motivation factors',
      metadata: { category: 'motivation', tags: ['questionnaire'], estimatedBenefit: 0.7 },
    });
  }

  return out.slice(0, limit);
}

export interface ServerSuggestionsResult {
  success: boolean;
  data: {
    suggestions: ReturnType<typeof mapStudySuggestionToApi>[];
    patternsSource: 'postgres_and_tasks';
    hasStoredPatterns: boolean;
    processingTime: number;
    tier: 'free' | 'premium';
    patterns?: {
      patternStrength: number;
      dataQuality: number;
    };
    predictions?: {
      optimalStudyTime: string;
      difficultyRecommendation: string;
    };
  };
  message?: string;
}

export interface ServerPremiumFeatureResult {
  success: boolean;
  data: {
    feature: PremiumFeature;
    patternsSource: 'postgres_and_tasks';
    hasStoredPatterns: boolean;
    processingTime: number;
    tier: 'premium';
    usedSignals: string[];
    // feature-specific payload
    result: Record<string, unknown>;
  };
  message?: string;
}

async function buildUserAiContext(
  supabase: SupabaseClient,
  userId: string,
  rawTasks: unknown,
  context: Record<string, unknown> | undefined,
) {
  const tasks = normalizeTasksForAI(rawTasks);
  const [{ data: patternRow }, { data: profileRow }] = await Promise.all([
    supabase.from('user_ai_patterns').select('*').eq('user_id', userId).maybeSingle(),
    supabase
      .from('profiles')
      .select('ai_preferences, learning_style, subjects, interests')
      .eq('clerk_user_id', userId)
      .maybeSingle(),
  ]);

  const row = patternRow as Record<string, unknown> | null;
  const userPrefsForAnalysis = userPreferencesFromAiPatternsRow(row);
  const timetable = (context?.timetable as SuggestionContext['timetable']) ?? [];
  const livePatterns = patternEngine.analyzePatterns(tasks, userId, timetable, userPrefsForAnalysis);
  const merged = mergePatternDataFromDbAndTasks(row, livePatterns, userId);
  const prefs = mergeUserAIPreferences(defaultAIPreferences, row);
  const now = context?.currentTime ? safeDate(context.currentTime, new Date()) : new Date();
  return { tasks, row, profileRow, merged, prefs, timetable, now };
}

function studyPlanFromContext(args: {
  tasks: ExtendedTask[];
  row: Record<string, unknown> | null;
  merged: PatternData;
  prefs: UserAIPreferences;
  timetable: SuggestionContext['timetable'];
  now: Date;
}) {
  const { tasks, row, merged, prefs, timetable, now } = args;
  const usedSignals = new Set<string>();
  usedSignals.add('tasks');
  if (row) usedSignals.add('user_ai_patterns');
  if (timetable?.length) usedSignals.add('timetable');

  const pending = tasks.filter((t) => !t.completed);
  const preferredHours = preferredHoursFromPatterns(row, merged);
  if (preferredHours.length) usedSignals.add('productivity_peaks');

  const attention = typeof row?.attention_span === 'number' ? row.attention_span : prefs.preferredStudyDuration;
  if (typeof row?.attention_span === 'number') usedSignals.add('attention_span');

  const breakPrefs = row?.break_preferences as { duration?: number } | undefined;
  const breakMinutes = breakPrefs?.duration ?? prefs.preferredBreakDuration;
  if (breakPrefs?.duration) usedSignals.add('break_preferences.duration');

  const weakSubjects = Array.isArray(merged.subjectInsights.strugglingSubjects)
    ? merged.subjectInsights.strugglingSubjects
    : [];
  if (weakSubjects.length) usedSignals.add('subjectInsights.strugglingSubjects');

  const byUrgency = pending
    .map((t) => {
      const due = safeDate(t.dueDate, new Date(now.getTime() + 7 * 86400000));
      const minsToDue = minutesBetween(now, due);
      const priorityWeight = t.priority === 'high' ? 1 : t.priority === 'medium' ? 0.6 : 0.35;
      const duration = t.estimatedDuration ?? 60;
      const durationPenalty = clamp01(duration / Math.max(30, attention * 1.5));
      const weakBoost = t.subject && weakSubjects.includes(t.subject) ? 0.15 : 0;
      const urgency = clamp01(priorityWeight * 0.55 + clamp01(1 - minsToDue / (3 * 24 * 60)) * 0.4 + weakBoost - 0.1 * durationPenalty);
      return { t, urgency, due, duration };
    })
    .sort((a, b) => b.urgency - a.urgency);

  // Build simple time blocks for next 2 days within preferred hours
  const plan: Array<Record<string, unknown>> = [];
  const horizonDays = 2;
  const maxBlocks = 8;

  function slotIsBlocked(start: Date, end: Date): boolean {
    if (!timetable || !Array.isArray(timetable)) return false;
    // timetable entries are ClassTimetableEntry in types, but here it's unknown-ish; best-effort
    for (const entry of timetable as any[]) {
      const startTime = entry?.startTime as string | undefined;
      const endTime = entry?.endTime as string | undefined;
      const daysOfWeek = entry?.daysOfWeek as string[] | undefined;
      if (!startTime || !endTime || !Array.isArray(daysOfWeek)) continue;
      const day = start.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      if (!daysOfWeek.map((d) => String(d).toLowerCase()).includes(day)) continue;
      const sh = Number.parseInt(String(startTime).split(':')[0] ?? '', 10);
      const eh = Number.parseInt(String(endTime).split(':')[0] ?? '', 10);
      if (!Number.isFinite(sh) || !Number.isFinite(eh)) continue;
      const overlaps = start.getHours() < eh && end.getHours() > sh;
      if (overlaps) return true;
    }
    return false;
  }

  const candidates = byUrgency.slice(0, 12);
  let cursorTask = 0;

  for (let d = 0; d < horizonDays && plan.length < maxBlocks; d++) {
    for (const hour of preferredHours.length ? preferredHours : [9, 10, 14, 15]) {
      if (plan.length >= maxBlocks || cursorTask >= candidates.length) break;
      const start = new Date(now);
      start.setDate(start.getDate() + d);
      start.setHours(hour, 0, 0, 0);
      const end = new Date(start.getTime() + attention * 60000);
      if (slotIsBlocked(start, end)) continue;

      const item = candidates[cursorTask];
      if (!item) break;
      const taskDuration = item.duration;
      const segmentMinutes = Math.min(attention, Math.max(20, taskDuration));
      const segEnd = new Date(start.getTime() + segmentMinutes * 60000);
      plan.push({
        taskId: item.t.id,
        title: item.t.title,
        start: toIso(start),
        end: toIso(segEnd),
        duration: segmentMinutes,
        confidence: clamp01(0.6 + 0.25 * item.urgency + 0.15 * clamp01(merged.dataQuality ?? 0.6)),
        reasoning: `Ranked by urgency=${item.urgency.toFixed(2)} and placed in a preferred productivity hour.`,
        breakAfterMinutes: breakMinutes,
      });

      // Move to next task if we've allocated enough for it
      cursorTask++;
    }
  }

  const warnings: string[] = [];
  if (preferredHours.length === 0) warnings.push('No productivity peaks found; using default hours.');
  if (plan.length === 0) warnings.push('No valid slots found; try widening timetable availability.');

  return {
    usedSignals: [...usedSignals],
    result: {
      plan,
      summary: {
        blocks: plan.length,
        horizonDays,
        preferredHours,
        sessionMinutes: attention,
        breakMinutes,
      },
      warnings,
    },
  };
}

function stuPersonalityFromContext(args: {
  tasks: ExtendedTask[];
  row: Record<string, unknown> | null;
  merged: PatternData;
  now: Date;
}) {
  const { tasks, row, merged, now } = args;
  const usedSignals = new Set<string>(['tasks']);
  if (row) usedSignals.add('user_ai_patterns');
  const { stressLoad, reasons: stressReasons } = stressLoadFromSignals(row, tasks, now);
  usedSignals.add('deadline_pressure_response');
  usedSignals.add('stress_triggers');
  usedSignals.add('stress_relief_preferences');
  usedSignals.add('motivation_factors');

  const { momentum, reasons: momentumReasons } = momentumFromTasks(tasks, merged);
  usedSignals.add('timePattern.consistencyScore');

  const stressRelief = Array.isArray(row?.stress_relief_preferences)
    ? (row?.stress_relief_preferences as unknown[]).map(String)
    : [];
  const motivation = Array.isArray(row?.motivation_factors)
    ? (row?.motivation_factors as unknown[]).map(String)
    : [];
  const learningStyle = String(row?.learning_style ?? '').toLowerCase();
  if (learningStyle) usedSignals.add('learning_style');

  const mood =
    stressLoad > 0.75
      ? 'concerned'
      : momentum > 0.75
        ? 'celebratory'
        : momentum > 0.55
          ? 'encouraging'
          : 'focused';

  const reliefLine =
    stressRelief.length > 0
      ? `Quick reset idea: try ${stressRelief[0]} for 3–5 minutes, then start.`
      : 'Quick reset idea: stand up, drink water, and start with a tiny 10-minute win.';
  const motivationLine =
    motivation.length > 0
      ? `Tie your next block to what motivates you: ${motivation[0]}.`
      : 'Tie your next block to one simple reward you can actually claim today.';

  const styleNudge =
    learningStyle.includes('visual')
      ? 'Make it visual: draw a quick diagram before you read.'
      : learningStyle.includes('auditory')
        ? 'Say it out loud: teach the concept to an imaginary class.'
        : 'Mix it: read → explain → practice one question.';

  const message = [
    mood === 'concerned'
      ? "Hey—I'm here. Your workload looks heavy, but we can make it manageable."
      : mood === 'celebratory'
        ? "You’re on a roll. Let’s use that momentum and lock in another win."
        : mood === 'encouraging'
          ? "You’re building consistency. One focused block will move things forward."
          : "Let’s focus. Pick the next task and commit to one clean session.",
    reliefLine,
    motivationLine,
    styleNudge,
  ].join(' ');

  return {
    usedSignals: [...new Set([...usedSignals])],
    result: {
      mood,
      message,
      nextAction: {
        type: 'start_focus_block',
        suggestedMinutes: typeof row?.attention_span === 'number' ? row.attention_span : merged.timePattern.preferredStudyDuration,
      },
      reasoning: {
        stressLoad,
        stressReasons,
        momentum,
        momentumReasons,
      },
    },
  };
}

function voiceProcessingFromContext(args: {
  row: Record<string, unknown> | null;
  profileRow: any;
  context: Record<string, unknown> | undefined;
}) {
  const { row, profileRow, context } = args;
  const usedSignals = new Set<string>();
  if (row) usedSignals.add('user_ai_patterns');
  if (profileRow) usedSignals.add('profiles');
  usedSignals.add('context.transcript');

  const transcript = typeof context?.transcript === 'string' ? context.transcript.trim() : '';
  const lower = transcript.toLowerCase();

  const subjects: string[] = Array.isArray(profileRow?.subjects) ? profileRow.subjects.map(String) : [];
  const subjectHit =
    subjects.find((s) => lower.includes(String(s).toLowerCase())) ??
    (lower.includes('math') ? 'Mathematics' : lower.includes('bio') ? 'Biology' : undefined);

  const priority =
    lower.includes('urgent') || lower.includes('asap') || lower.includes('high priority')
      ? 'high'
      : lower.includes('low priority')
        ? 'low'
        : 'medium';

  const durationMatch = lower.match(/(\d+)\s*(hour|hours|hr|hrs|minute|minutes|min|mins)\b/);
  let minutes = 60;
  if (durationMatch) {
    const n = Number.parseInt(durationMatch[1] ?? '', 10);
    const unit = durationMatch[2] ?? '';
    if (Number.isFinite(n)) {
      minutes = unit.startsWith('hour') || unit.startsWith('hr') ? n * 60 : n;
      usedSignals.add('duration_phrase');
    }
  } else if (typeof row?.attention_span === 'number') {
    minutes = Math.max(30, Math.min(180, row.attention_span));
    usedSignals.add('attention_span');
  }

  const hasCreateIntent = /\b(create|add|set up|make)\b/.test(lower);
  const hasCompleteIntent = /\b(done|complete|finished|mark done)\b/.test(lower);
  const intents = [
    hasCreateIntent ? 'create_task' : null,
    hasCompleteIntent ? 'complete_task' : null,
    lower.includes('remind') ? 'set_reminder' : null,
    lower.includes('schedule') || lower.includes('plan') ? 'schedule' : null,
  ].filter(Boolean);

  const extractedTasks =
    hasCreateIntent && transcript
      ? [
          {
            title: transcript.replace(/^.*?(create|add|make)\s+/i, '').slice(0, 80) || 'New task',
            subject: subjectHit,
            priority,
            estimatedMinutes: minutes,
          },
        ]
      : [];

  const confidenceBreakdown = {
    transcriptPresent: transcript ? 0.35 : 0,
    subjectDetected: subjectHit ? 0.2 : 0,
    durationDetected: durationMatch ? 0.2 : 0,
    intentDetected: intents.length ? 0.25 : 0,
  };
  const confidence = clamp01(Object.values(confidenceBreakdown).reduce((a, b) => a + b, 0));

  return {
    usedSignals: [...usedSignals],
    result: {
      transcript,
      intents,
      extractedTasks,
      confidence,
      confidenceBreakdown,
    },
  };
}

function mlPredictionsFromContext(args: {
  tasks: ExtendedTask[];
  row: Record<string, unknown> | null;
  merged: PatternData;
  now: Date;
}) {
  const { tasks, row, merged, now } = args;
  const usedSignals = new Set<string>(['tasks', 'timePattern.mostProductiveHours', 'attention_span', 'difficulty_preference']);
  if (row) usedSignals.add('user_ai_patterns');

  const pending = tasks.filter((t) => !t.completed);
  const preferredHours = preferredHoursFromPatterns(row, merged);
  const attention = typeof row?.attention_span === 'number' ? row.attention_span : merged.timePattern.preferredStudyDuration;
  const consistency = clamp01(merged.timePattern.consistencyScore ?? 0.5);
  const { stressLoad } = stressLoadFromSignals(row, tasks, now);

  const completionProbabilities: Record<string, number> = {};
  for (const t of pending) {
    const due = safeDate(t.dueDate, new Date(now.getTime() + 7 * 86400000));
    const minsToDue = minutesBetween(now, due);
    const dueScore = clamp01(1 - minsToDue / (5 * 24 * 60));
    const prio = t.priority === 'high' ? 1 : t.priority === 'medium' ? 0.6 : 0.35;
    const duration = t.estimatedDuration ?? 60;
    const durationFit = clamp01(1 - Math.max(0, duration - attention) / Math.max(60, attention * 2));
    const hour = hourFromIso(t.dueDate);
    const timeFit =
      hour == null || preferredHours.length === 0 ? 0.5 : preferredHours.includes(hour) ? 0.9 : 0.55;
    const p = clamp01(0.15 + 0.35 * prio + 0.25 * dueScore + 0.15 * durationFit + 0.15 * timeFit + 0.1 * consistency - 0.15 * stressLoad);
    completionProbabilities[t.id] = p;
  }

  const probs = Object.values(completionProbabilities);
  const avgP = probs.length ? probs.reduce((a, b) => a + b, 0) / probs.length : 0.6;
  const procrastinationRisk = clamp01(0.85 - avgP + 0.25 * stressLoad);

  const optimalStudyWindows = (preferredHours.length ? preferredHours : [9, 10, 14, 15])
    .slice(0, 4)
    .map((h) => ({
      startHour: h,
      endHour: Math.min(23, h + 2),
      score: clamp01(0.6 + 0.2 * consistency + 0.2 * (h < 12 ? 0.5 : 0.3)),
    }));

  return {
    usedSignals: [...usedSignals],
    result: {
      completionProbabilities,
      procrastinationRisk,
      optimalStudyWindows,
      reasoning: {
        attentionSpanMinutes: attention,
        consistency,
        stressLoad,
      },
    },
  };
}

function premiumAnalyticsFromContext(args: {
  tasks: ExtendedTask[];
  row: Record<string, unknown> | null;
  merged: PatternData;
  now: Date;
}) {
  const { tasks, row, merged, now } = args;
  const usedSignals = new Set<string>(['tasks', 'subjectInsights', 'timePattern']);
  if (row) usedSignals.add('user_ai_patterns');

  const total = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;
  const pending = tasks.filter((t) => !t.completed);
  const overdue = pending.filter((t) => safeDate(t.dueDate, now).getTime() < now.getTime()).length;
  const dueSoon = pending.filter((t) => minutesBetween(now, safeDate(t.dueDate, now)) < 48 * 60).length;

  const completionRate = total > 0 ? completed / total : 0;
  const overdueRate = pending.length > 0 ? overdue / pending.length : 0;

  const preferredHours = preferredHoursFromPatterns(row, merged);
  const dueHours = pending.map((t) => hourFromIso(t.dueDate)).filter((h): h is number => h != null);
  const fitScore =
    dueHours.length && preferredHours.length
      ? dueHours.filter((h) => preferredHours.includes(h)).length / dueHours.length
      : 0.5;

  const weakSubjects = merged.subjectInsights.strugglingSubjects ?? [];
  const pendingWeak = pending.filter((t) => t.subject && weakSubjects.includes(t.subject)).length;
  const weakFocusScore = pending.length ? pendingWeak / pending.length : 0;

  const consistency = clamp01(merged.timePattern.consistencyScore ?? 0.5);
  const dataQuality = clamp01(merged.dataQuality ?? 0.6);

  const insights: string[] = [];
  if (overdue) insights.push(`You have ${overdue} overdue tasks — clear one today to reduce stress load.`);
  if (dueSoon) insights.push(`${dueSoon} tasks are due within 48 hours — schedule them into your best hours first.`);
  if (weakSubjects.length) insights.push(`Weak-subject focus detected: ${weakSubjects.slice(0, 2).join(', ')}.`);
  if (consistency < 0.45) insights.push('Consistency looks low — shorter daily blocks will beat one big session.');

  const recommendations: string[] = [];
  const attention = typeof row?.attention_span === 'number' ? row.attention_span : merged.timePattern.preferredStudyDuration;
  recommendations.push(`Use ${Math.max(25, Math.min(120, attention))} minute focus blocks as your default.`);
  if (preferredHours.length) recommendations.push(`Aim for your best hours: ${preferredHours.slice(0, 4).join(', ')}.`);
  recommendations.push(`Target: complete 1 overdue task + 1 due-soon task today.`);

  return {
    usedSignals: [...usedSignals],
    result: {
      metrics: {
        completionRate,
        overdueRate,
        dueSoonCount: dueSoon,
        planFitScore: fitScore,
        weakFocusScore,
        consistencyScore: consistency,
        dataQuality,
      },
      insights,
      recommendations,
    },
  };
}

function collaborativeFilteringFromContext(args: {
  row: Record<string, unknown> | null;
  merged: PatternData;
}) {
  const { row, merged } = args;
  const { archetype, explanation, confidence } = inferArchetype(row, merged);
  const usedSignals = ['learning_style', 'difficulty_preference', 'break_preferences.frequency', 'productivity_peaks'];

  const routines =
    archetype === 'Morning Sprinter'
      ? ['2× short morning blocks (30–45m) before classes', '5m break, then one practice question']
      : archetype === 'Steady Marathoner'
        ? ['1× longer block (60–90m) + structured notes', '15m break + quick recap']
        : archetype.includes('Deadline')
          ? ['Start earlier with a “minimum viable session” (20m)', 'Use checklists + pre-commit the first task']
          : archetype === 'Balanced Builder'
            ? ['One block in best hours + one lighter block later', 'Rotate subjects to avoid burnout']
            : ['Mix block lengths: 25m + 60m depending on difficulty', 'Use the next due task as your anchor'];

  const pitfalls =
    archetype.includes('Deadline')
      ? ['Overloading the last 6 hours', 'Skipping breaks entirely']
      : archetype === 'Morning Sprinter'
        ? ['Taking on hard tasks late at night', 'Too many context switches']
        : ['Ignoring weak subjects until the week ends'];

  return {
    usedSignals,
    result: {
      archetype,
      confidence,
      explanation,
      recommendedRoutines: routines,
      commonPitfalls: pitfalls,
    },
  };
}

export async function generatePremiumFeature(
  supabase: SupabaseClient,
  userId: string,
  feature: PremiumFeature,
  rawTasks: unknown,
  context: Record<string, unknown> | undefined,
): Promise<ServerPremiumFeatureResult> {
  const started = Date.now();
  const ctx = await buildUserAiContext(supabase, userId, rawTasks, context);

  let out: { usedSignals: string[]; result: Record<string, unknown> };
  switch (feature) {
    case 'study_planning':
      out = studyPlanFromContext(ctx);
      break;
    case 'stu_personality':
      out = stuPersonalityFromContext(ctx);
      break;
    case 'voice_processing':
      out = voiceProcessingFromContext(ctx);
      break;
    case 'ml_predictions':
      out = mlPredictionsFromContext(ctx);
      break;
    case 'premium_analytics':
      out = premiumAnalyticsFromContext(ctx);
      break;
    case 'collaborative_filtering':
      out = collaborativeFilteringFromContext(ctx);
      break;
    default:
      out = { usedSignals: ['tasks'], result: { error: 'Unsupported premium feature' } };
  }

  return {
    success: true,
    data: {
      feature,
      patternsSource: 'postgres_and_tasks',
      hasStoredPatterns: Boolean(ctx.row),
      processingTime: Date.now() - started,
      tier: 'premium',
      usedSignals: out.usedSignals,
      result: out.result,
    },
  };
}

export async function generatePostgresBackedSuggestions(
  supabase: SupabaseClient,
  userId: string,
  rawTasks: unknown,
  context: Record<string, unknown> | undefined,
  options: { advanced: boolean; effectiveTier: 'free' | 'premium' },
): Promise<ServerSuggestionsResult> {
  const started = Date.now();
  const tasks = normalizeTasksForAI(rawTasks);

  const [{ data: patternRow }, { data: profileRow }] = await Promise.all([
    supabase.from('user_ai_patterns').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('profiles').select('ai_preferences, learning_style, subjects').eq('clerk_user_id', userId).maybeSingle(),
  ]);

  const row = patternRow as Record<string, unknown> | null;
  const userPrefsForAnalysis = userPreferencesFromAiPatternsRow(row);

  const timetable = (context?.timetable as SuggestionContext['timetable']) ?? [];
  const livePatterns = patternEngine.analyzePatterns(tasks, userId, timetable, userPrefsForAnalysis);

  const merged = mergePatternDataFromDbAndTasks(row, livePatterns, userId);

  let userPrefs = mergeUserAIPreferences(defaultAIPreferences, row);
  if (profileRow?.subjects && Array.isArray(profileRow.subjects) && profileRow.subjects.length) {
    userPrefs = {
      ...userPrefs,
      focusOnWeakSubjects: true,
    };
  }

  const suggestionContext: SuggestionContext = {
    currentTime: context?.currentTime ? new Date(context.currentTime as string) : new Date(),
    upcomingTasks: tasks.filter((t) => !t.completed).slice(0, 12),
    recentActivity: tasks.filter((t) => t.completed).slice(0, 8),
    userPreferences: userPrefs,
    timetable,
    metadata: {
      ...(typeof context?.metadata === 'object' && context?.metadata !== null
        ? (context.metadata as Record<string, unknown>)
        : {}),
      profileLearningStyle: profileRow?.learning_style,
    },
  };

  const studySuggestions = suggestionEngine.generateSuggestions(merged, suggestionContext);
  let mapped = studySuggestions.map(mapStudySuggestionToApi);

  if (options.advanced) {
    mapped = [...mapped, ...appendWellnessFromRow(row, 3)];
  }

  const maxOut = options.advanced ? 8 : 5;
  mapped = mapped.slice(0, maxOut);

  if (mapped.length === 0) {
    mapped.push({
      id: `fallback-${Date.now()}`,
      type: 'study_habit_tip',
      title: 'Start with one focused block',
      description: 'Pick your smallest task and work on it for one focused session.',
      priority: 'medium',
      estimatedTime: merged.timePattern.preferredStudyDuration || 25,
      difficulty: 'medium',
      confidence: 0.55,
      reasoning: 'Default guidance when pattern data is sparse',
      metadata: { category: 'fallback', tags: ['default'], estimatedBenefit: 0.5 },
    });
  }

  const optimalHours = merged.timePattern.mostProductiveHours.slice(0, 2);
  const optimalStudyTime =
    optimalHours.length >= 2
      ? `${String(optimalHours[0]).padStart(2, '0')}:00–${String(optimalHours[1]).padStart(2, '0')}:00`
      : `${String(optimalHours[0] ?? 9).padStart(2, '0')}:00–11:00`;

  return {
    success: true,
    data: {
      suggestions: mapped,
      patternsSource: 'postgres_and_tasks',
      hasStoredPatterns: Boolean(row),
      processingTime: Date.now() - started,
      tier: options.effectiveTier === 'premium' ? 'premium' : 'free',
      ...(options.advanced
        ? {
            patterns: {
              patternStrength: merged.dataQuality,
              dataQuality: merged.dataQuality,
            },
            predictions: {
              optimalStudyTime,
              difficultyRecommendation: (row?.difficulty_preference as string) || 'moderate',
            },
          }
        : {}),
    },
  };
}
