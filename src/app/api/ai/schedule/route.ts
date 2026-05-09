import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { SmartScheduler } from '@/lib/ai/SmartScheduler';
import { PatternAnalyzer } from '@/lib/ai/PatternAnalyzer';
import { ScheduleManager } from '@/lib/ai/ScheduleManager';
import { mergeScheduleIntoUserAiPatterns } from '@/lib/ai/userAiPatternsMerge';
import { patternDataFromStoredRow } from '@/lib/ai/userAiPatternsToPatternData';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import type { ExtendedTask, Priority, TaskType, UserPreferences, PatternData, ScheduleMetadata } from '@/types/ai';
import type { Task, TimetableEntry } from '@/types/taskTypes';

interface CalendarEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
}

interface ScheduleRequest {
  preferences?: Partial<UserPreferences>;
  existingEvents?: CalendarEvent[];
  scheduleHorizon?: number; // Days to schedule ahead
  forceRefresh?: boolean; // Force pattern re-analysis
}

// Parse `preferred_study_times` entries into numeric hours in [0, 23].
// Accepts numbers, numeric strings, and a few common label shapes produced
// by the onboarding questionnaire, e.g. "Evening (5-8 PM)", "9 AM", "14:00".
// Returns a deduplicated, sorted array; invalid entries are dropped.
function parsePreferredStudyTimes(raw: unknown[]): number[] {
  const LABEL_MAP: Record<string, number[]> = {
    'early morning': [6, 7, 8],
    morning: [9, 10, 11],
    midday: [12, 13],
    noon: [12],
    afternoon: [14, 15, 16],
    evening: [17, 18, 19, 20],
    night: [21, 22, 23],
    'late night': [22, 23],
  };

  const hours = new Set<number>();
  for (const entry of raw) {
    if (typeof entry === 'number' && Number.isFinite(entry) && entry >= 0 && entry <= 23) {
      hours.add(Math.floor(entry));
      continue;
    }
    if (typeof entry !== 'string') continue;
    const lower = entry.toLowerCase();

    // Try a "5-8 PM" / "5 PM" / "14:00" range inside the string.
    const rangeMatch = lower.match(/(\d{1,2})\s*(?::(\d{2}))?\s*(?:-|to|–)\s*(\d{1,2})\s*(?::(\d{2}))?\s*(am|pm)?/);
    if (rangeMatch) {
      const suffix = rangeMatch[5];
      let start = Number.parseInt(rangeMatch[1], 10);
      let end = Number.parseInt(rangeMatch[3], 10);
      if (suffix === 'pm' && start < 12) start += 12;
      if (suffix === 'pm' && end < 12) end += 12;
      if (suffix === 'am' && start === 12) start = 0;
      if (Number.isFinite(start) && Number.isFinite(end) && start >= 0 && end <= 23 && start <= end) {
        for (let h = start; h <= end; h++) hours.add(h);
        continue;
      }
    }

    const singleMatch = lower.match(/(\d{1,2})\s*(?::(\d{2}))?\s*(am|pm)?/);
    if (singleMatch) {
      let h = Number.parseInt(singleMatch[1], 10);
      const suffix = singleMatch[3];
      if (suffix === 'pm' && h < 12) h += 12;
      if (suffix === 'am' && h === 12) h = 0;
      if (Number.isFinite(h) && h >= 0 && h <= 23) {
        hours.add(h);
        continue;
      }
    }

    for (const [label, mapped] of Object.entries(LABEL_MAP)) {
      if (lower.includes(label)) {
        mapped.forEach((h) => hours.add(h));
        break;
      }
    }
  }

  return Array.from(hours).sort((a, b) => a - b);
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const body: ScheduleRequest = await request.json();
    const { preferences: requestPreferences, existingEvents = [], scheduleHorizon = 7, forceRefresh = false } = body;

    // 1. Fetch user's incomplete tasks from database
    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .eq('clerk_user_id', userId)
      .eq('completed', false)
      .order('due_date', { ascending: true, nullsFirst: false });

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError);
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
    }

    // 2. Fetch user's task completion history for pattern analysis
    const { data: taskHistory, error: historyError } = await supabase
      .from('tasks')
      .select('*')
      .eq('clerk_user_id', userId)
      .eq('completed', true)
      .order('updated_at', { ascending: false })
      .limit(100); // Last 100 completed tasks for pattern analysis

    if (historyError) {
      console.error('Error fetching task history:', historyError);
    }

    // 3. Fetch user's timetable entries for conflict detection.
    // `user_timetables.user_id` is a uuid referencing `profiles.id`, but there is
    // no FK constraint defined, so PostgREST can't embed `profiles!inner`
    // (PGRST200). Resolve the profile row first, then query by its uuid.
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .maybeSingle();

    let timetableEntries: TimetableEntry[] | null = null;
    if (profileRow?.id) {
      const { data, error: timetableError } = await supabase
        .from('user_timetables')
        .select('*')
        .eq('user_id', profileRow.id)
        .eq('is_active', true);

      if (timetableError) {
        console.error('Error fetching timetable:', timetableError);
      } else {
        timetableEntries = (data ?? []) as TimetableEntry[];
      }
    }

    // 4. Fetch existing user AI patterns and preferences
    const { data: existingPatterns, error: patternsError } = await supabase
      .from('user_ai_patterns')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (patternsError && patternsError.code !== 'PGRST116') {
      console.error('Error fetching user patterns:', patternsError);
    }

    // 5. Fetch user preferences from profiles table
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('ai_preferences, learning_style, subjects, interests')
      .eq('clerk_user_id', userId)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error fetching user profile:', profileError);
    }

    // 6. Transform database tasks to ExtendedTask format
    const aiTasks: ExtendedTask[] = (tasksData || []).map((task: Task) => ({
      id: task.id,
      title: task.title,
      description: task.description || '',
      dueDate: task.due_date || new Date().toISOString(),
      subject: task.subject,
      difficultyLevel: task.priority === 'high' ? 8 : task.priority === 'medium' ? 5 : 3,
      estimatedDuration: estimateTaskDuration(task),
      completed: task.completed,
      completedAt: task.updated_at,
      actualDuration: undefined, // Would need to track this separately
      priority: (task.priority as Priority) || 'medium',
      type: (task.type as TaskType) || 'academic',
      reminder: task.reminder_settings?.enabled || false,
      createdAt: task.created_at,
      updatedAt: task.updated_at,
      timeSpent: undefined, // Would need separate time tracking
    }));

    // 7. Transform task history for pattern analysis
    const historyTasks: ExtendedTask[] = (taskHistory || []).map((task: Task) => ({
      id: task.id,
      title: task.title,
      description: task.description || '',
      dueDate: task.due_date || new Date().toISOString(),
      subject: task.subject,
      difficultyLevel: task.priority === 'high' ? 8 : task.priority === 'medium' ? 5 : 3,
      estimatedDuration: estimateTaskDuration(task),
      completed: task.completed,
      completedAt: task.updated_at,
      actualDuration: undefined,
      priority: (task.priority as Priority) || 'medium',
      type: (task.type as TaskType) || 'academic',
      reminder: task.reminder_settings?.enabled || false,
      createdAt: task.created_at,
      updatedAt: task.updated_at,
      timeSpent: undefined,
    }));

    // 8. Build user preferences from multiple sources
    const userPreferences: UserPreferences = buildUserPreferences(
      requestPreferences,
      existingPatterns,
      userProfile,
      aiTasks
    );

    // 9. Generate or retrieve pattern analysis
    let patterns: PatternData;
    
    if (forceRefresh || !existingPatterns || shouldRefreshPatterns(existingPatterns)) {
      const patternAnalyzer = new PatternAnalyzer(userPreferences, historyTasks);
      const analyzedPatterns: Partial<PatternData> = patternAnalyzer.analyze();
      patterns = {
        userId,
        lastAnalyzed: new Date().toISOString(),
        timePattern: analyzedPatterns.timePattern || {
          mostProductiveHours: [9, 10, 14, 15],
          preferredStudyDuration: 45,
          averageBreakTime: 15,
          peakPerformanceDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          consistencyScore: 0.5
        },
        difficultyProfile: analyzedPatterns.difficultyProfile || {
          averageTaskDifficulty: 5,
          difficultyTrend: 'stable',
          subjectDifficultyMap: {},
          adaptationRate: 0.5
        },
        subjectInsights: analyzedPatterns.subjectInsights || {
          preferredSubjects: [],
          strugglingSubjects: [],
          subjectPerformance: {}
        },
        totalTasksAnalyzed: historyTasks.length,
        dataQuality: 0.7
      };

      await saveUserPatterns(supabase, userId, patterns, userPreferences, existingPatterns ?? null);
    } else {
      patterns = transformStoredPatterns(existingPatterns);
    }

    const calendarEvents: CalendarEvent[] = [
      ...existingEvents,
      ...generateTimetableEvents(timetableEntries || [], scheduleHorizon),
    ];

    const scheduler = new SmartScheduler(
      aiTasks,
      patterns,
      calendarEvents,
      userPreferences,
      historyTasks
    );

    const scheduleResult = scheduler.generate();

    // 12. Save the generated schedule for tracking and learning
    const scheduleManager = new ScheduleManager();
    const scheduleMetadata: ScheduleMetadata = {
      tasksScheduled: scheduleResult.metadata.scheduledTasks,
      conflictsResolved: scheduleResult.metadata.conflicts,
      averageConfidence: scheduleResult.metadata.confidence,
      totalTasks: scheduleResult.metadata.totalTasks,
      scheduledTasks: scheduleResult.metadata.scheduledTasks,
      conflicts: scheduleResult.metadata.conflicts,
      efficiency: scheduleResult.metadata.efficiency,
      confidence: scheduleResult.metadata.confidence
    };
    await scheduleManager.saveSchedule(userId, scheduleResult.schedule, scheduleMetadata);

    // 13. Update user interaction patterns
    await updateUserInteractionPatterns(supabase, userId, {
      scheduleGenerated: true,
      tasksScheduled: scheduleResult.schedule.length,
      efficiency: scheduleResult.metadata.efficiency,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      schedule: scheduleResult.schedule,
      adjustments: scheduleResult.adjustments,
      metadata: {
        ...scheduleResult.metadata,
        patternsUsed: patterns.lastAnalyzed,
        dataQuality: patterns.dataQuality,
        scheduleHorizon,
        calendarEventsConsidered: calendarEvents.length
      }
    });

  } catch (error) {
    console.error('Schedule generation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate schedule',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const includeHistory = searchParams.get('includeHistory') === 'true';

    // Fetch current schedule
    const scheduleManager = new ScheduleManager();
    const currentSchedule = await scheduleManager.getCurrentSchedule(userId);

    // Optionally include schedule history
    let scheduleHistory = null;
    if (includeHistory) {
      scheduleHistory = await scheduleManager.getScheduleHistory(userId, 30); // Last 30 days
    }

    // Fetch user patterns for context
    const { data: userPatterns } = await supabase
      .from('user_ai_patterns')
      .select('*')
      .eq('user_id', userId)
      .single();

    return NextResponse.json({
      success: true,
      currentSchedule,
      scheduleHistory,
      userPatterns: userPatterns ? transformStoredPatterns(userPatterns) : null,
      lastUpdated: currentSchedule?.metadata?.generatedAt || null
    });

  } catch (error) {
    console.error('Schedule fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schedule' },
      { status: 500 }
    );
  }
}

// Helper methods (these would be class methods in a real implementation)
function estimateTaskDuration(task: Task): number {
  // Estimate duration based on task properties
  let baseDuration = 60; // Default 1 hour
  
  // Adjust based on priority
  if (task.priority === 'high') baseDuration *= 1.5;
  else if (task.priority === 'low') baseDuration *= 0.75;
  
  // Adjust based on type
  if (task.type === 'academic') baseDuration *= 1.2;
  else if (task.type === 'personal') baseDuration *= 0.8;
  
  // Adjust based on description length (rough complexity indicator)
  if (task.description && task.description.length > 200) baseDuration *= 1.3;
  
  return Math.round(baseDuration);
}

function buildUserPreferences(
  requestPreferences: Partial<UserPreferences> | undefined,
  existingPatterns: any,
  userProfile: any,
  tasks: ExtendedTask[]
): UserPreferences {
  // Default preferences
  const defaults: UserPreferences = {
    studyTimePreference: 'afternoon',
    sessionLengthPreference: 'medium',
    difficultyComfort: 'moderate',
    breakFrequency: 'moderate',
    preferredSubjects: [],
    strugglingSubjects: [],
    studyGoals: [],
    availableStudyHours: [9, 10, 11, 14, 15, 16, 17, 18, 19, 20]
  };

  // Merge with stored patterns. `preferred_study_times` may contain either
  // numeric hours (legacy) or human-readable labels like "Evening (5-8 PM)"
  // from the questionnaire. Coerce to numeric hours; fall back to defaults
  // if nothing parseable is found. Without this guard, non-numeric values
  // propagate into SmartScheduler and trigger `Invalid time value` via
  // setHours(NaN) when generating time slots.
  if (Array.isArray(existingPatterns?.preferred_study_times)) {
    const parsed = parsePreferredStudyTimes(existingPatterns.preferred_study_times);
    if (parsed.length > 0) {
      defaults.availableStudyHours = parsed;
    }
  }
  
  if (existingPatterns?.learning_style) {
    defaults.difficultyComfort = existingPatterns.learning_style === 'challenging' ? 'challenging' : 'moderate';
  }

  // Merge with user profile
  if (userProfile?.subjects) {
    defaults.preferredSubjects = userProfile.subjects.filter((subject: string | undefined): subject is string => Boolean(subject));
  }
  
  if (userProfile?.learning_style) {
    defaults.sessionLengthPreference = userProfile.learning_style === 'focused' ? 'long' : 'medium';
  }

  // Infer from tasks
  const taskSubjects = [...new Set(tasks.map(t => t.subject).filter((subject): subject is string => Boolean(subject)))];
  if (taskSubjects.length > 0 && defaults.preferredSubjects.length === 0) {
    defaults.preferredSubjects = taskSubjects;
  }

  // Merge with request preferences (highest priority)
  return { ...defaults, ...requestPreferences };
}

function shouldRefreshPatterns(existingPatterns: any): boolean {
  if (!existingPatterns?.last_analyzed_at) return true;
  
  const lastAnalyzed = new Date(existingPatterns.last_analyzed_at);
  const daysSinceAnalysis = (Date.now() - lastAnalyzed.getTime()) / (1000 * 60 * 60 * 24);
  
  // Refresh patterns if older than 7 days
  return daysSinceAnalysis > 7;
}

async function saveUserPatterns(
  supabase: any,
  userId: string,
  patterns: PatternData,
  preferences: UserPreferences,
  existingRow: Record<string, unknown> | null,
): Promise<void> {
  try {
    const schedulePatch: Record<string, unknown> = {
      user_id: userId,
      preferred_study_times: preferences.availableStudyHours,
      productivity_peaks: patterns.timePattern?.mostProductiveHours || [],
      learning_style: preferences.difficultyComfort,
      attention_span: patterns.timePattern?.preferredStudyDuration || 45,
      difficulty_preference: preferences.difficultyComfort,
      break_preferences: {
        frequency: preferences.breakFrequency,
        duration: patterns.timePattern?.averageBreakTime || 15,
      },
      pattern_confidence: {
        time_pattern: patterns.timePattern?.consistencyScore ?? 0.5,
        difficulty_profile: patterns.difficultyProfile?.adaptationRate ?? 0.5,
        subject_insights: patterns.dataQuality ?? 0.5,
      },
      last_analyzed_at: new Date().toISOString(),
      data_sources: ['task_history', 'user_preferences', 'timetable'],
      analysis_version: 2,
    };

    const merged = mergeScheduleIntoUserAiPatterns(existingRow, schedulePatch);

    await supabase.from('user_ai_patterns').upsert(merged, {
      onConflict: 'user_id',
    });
  } catch (error) {
    console.error('Error saving user patterns:', error);
  }
}

function transformStoredPatterns(storedPatterns: Record<string, unknown>): PatternData {
  return patternDataFromStoredRow(storedPatterns, String(storedPatterns.user_id ?? ''));
}

function generateTimetableEvents(
  timetableEntries: TimetableEntry[],
  scheduleHorizon: number
): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const now = new Date();
  const endDate = new Date(now.getTime() + scheduleHorizon * 24 * 60 * 60 * 1000);

  timetableEntries.forEach(entry => {
    if (!entry.days_of_week || !entry.start_time || !entry.end_time) return;

    // Generate recurring events for the schedule horizon
    for (let date = new Date(now); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];
      
      if (entry.days_of_week.includes(dayName)) {
        const [startHour, startMinute] = entry.start_time.split(':').map(Number);
        const [endHour, endMinute] = entry.end_time.split(':').map(Number);
        
        const startTime = new Date(date);
        startTime.setHours(startHour, startMinute, 0, 0);
        
        const endTime = new Date(date);
        endTime.setHours(endHour, endMinute, 0, 0);
        
        events.push({
          id: `timetable-${entry.id}-${date.toISOString().split('T')[0]}`,
          title: entry.course_name,
          startTime,
          endTime
        });
      }
    }
  });

  return events;
}

async function updateUserInteractionPatterns(
  supabase: any,
  userId: string,
  interaction: {
    scheduleGenerated: boolean;
    tasksScheduled: number;
    efficiency: number;
    timestamp: string;
  }
): Promise<void> {
  try {
    // This could be expanded to track user interaction patterns
    // For now, just log the interaction
    console.log(`User ${userId} generated schedule with ${interaction.tasksScheduled} tasks at ${interaction.efficiency} efficiency`);
  } catch (error) {
    console.error('Error updating interaction patterns:', error);
  }
} 