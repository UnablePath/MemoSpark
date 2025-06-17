import { NextRequest, NextResponse } from 'next/server';
import { SmartScheduler } from '@/lib/ai/SmartScheduler';
import { PatternAnalyzer } from '@/lib/ai/PatternAnalyzer';
import { ScheduleManager } from '@/lib/ai/ScheduleManager';
import { createClient } from '@/lib/supabase/server';

// Get Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://onfnehxkglmvrorcvqcx.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
import { auth } from '@clerk/nextjs/server';
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

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
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
      // Don't fail the request, just log the error
    }

    // 3. Fetch user's timetable entries for conflict detection
    // Note: user_timetables uses user_id that references profiles.id, not clerk_user_id
    // So we need to join with profiles table to get the correct user_id
    const { data: timetableEntries, error: timetableError } = await supabase
      .from('user_timetables')
      .select(`
        *,
        profiles!inner(clerk_user_id)
      `)
      .eq('profiles.clerk_user_id', userId);

    if (timetableError) {
      console.error('Error fetching timetable:', timetableError);
      // Don't fail the request, continue without timetable data
    }

    // 4. Fetch existing user AI patterns and preferences
    const { data: existingPatterns, error: patternsError } = await supabase
      .from('user_ai_patterns')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (patternsError && patternsError.code !== 'PGRST116') { // PGRST116 = no rows found
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
      // Analyze patterns with historical data and timetable
      const patternAnalyzer = new PatternAnalyzer(userPreferences, historyTasks);
      const analyzedPatterns = patternAnalyzer.analyze();
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
      
      // Save updated patterns to database
      await saveUserPatterns(supabase, userId, patterns, userPreferences);
    } else {
      // Use existing patterns
      patterns = transformStoredPatterns(existingPatterns);
    }

    // 10. Convert timetable entries to calendar events for conflict detection
    const calendarEvents: CalendarEvent[] = [
      ...existingEvents,
      ...generateTimetableEvents(timetableEntries || [], scheduleHorizon)
    ];

    // 11. Generate smart schedule
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

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
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

  // Merge with stored patterns
  if (existingPatterns?.preferred_study_times) {
    defaults.availableStudyHours = existingPatterns.preferred_study_times;
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
  preferences: UserPreferences
): Promise<void> {
  try {
    await supabase
      .from('user_ai_patterns')
      .upsert({
        user_id: userId,
        preferred_study_times: preferences.availableStudyHours,
        productivity_peaks: patterns.timePattern?.mostProductiveHours || [],
        learning_style: preferences.difficultyComfort,
        attention_span: patterns.timePattern?.preferredStudyDuration || 45,
        difficulty_preference: preferences.difficultyComfort,
        break_preferences: {
          frequency: preferences.breakFrequency,
          duration: patterns.timePattern?.averageBreakTime || 15
        },
        pattern_confidence: {
          time_pattern: patterns.timePattern?.consistencyScore || 0.5,
          difficulty_profile: patterns.difficultyProfile?.adaptationRate || 0.5,
          subject_insights: patterns.dataQuality || 0.5
        },
        last_analyzed_at: new Date().toISOString(),
        data_sources: ['task_history', 'user_preferences', 'timetable'],
        analysis_version: 2
      });
  } catch (error) {
    console.error('Error saving user patterns:', error);
  }
}

function transformStoredPatterns(storedPatterns: any): PatternData {
  return {
    userId: storedPatterns.user_id,
    lastAnalyzed: storedPatterns.last_analyzed_at,
    timePattern: {
      mostProductiveHours: storedPatterns.productivity_peaks || [],
      preferredStudyDuration: storedPatterns.attention_span || 45,
      averageBreakTime: storedPatterns.break_preferences?.duration || 15,
      peakPerformanceDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      consistencyScore: storedPatterns.pattern_confidence?.time_pattern || 0.5
    },
    difficultyProfile: {
      averageTaskDifficulty: 5,
      difficultyTrend: 'stable',
      subjectDifficultyMap: {},
      adaptationRate: storedPatterns.pattern_confidence?.difficulty_profile || 0.5
    },
    subjectInsights: {
      preferredSubjects: [],
      strugglingSubjects: [],
      subjectPerformance: {}
    },
    totalTasksAnalyzed: 0,
    dataQuality: storedPatterns.pattern_confidence?.subject_insights || 0.5
  };
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