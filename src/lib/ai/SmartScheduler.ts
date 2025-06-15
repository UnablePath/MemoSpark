import { 
  PatternData, 
  UserPreferences, 
  ExtendedTask, 
  ScheduledTask, 
  ScheduleAdjustment,
  TimeSlot,
  Priority,
  TaskType
} from '@/types/ai';
import { createClient } from '@/lib/supabase/client';
import { addDays, addHours, format, isAfter, isBefore, isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns';

// Get Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://onfnehxkglmvrorcvqcx.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

interface CalendarEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
}

interface ProductivityWindow {
  startHour: number;
  endHour: number;
  efficiency: number;
  dayOfWeek?: number;
}

interface ConflictResolution {
  type: 'reschedule' | 'split' | 'defer';
  originalTask: ScheduledTask;
  newSchedule: ScheduledTask[];
  reason: string;
}

export class SmartScheduler {
  private tasks: ExtendedTask[];
  private patterns: PatternData;
  private existingEvents: CalendarEvent[];
  private userPreferences: UserPreferences;
  private taskHistory: ExtendedTask[];
  private supabase = createClient(supabaseUrl, supabaseAnonKey);

  constructor(
    tasks: ExtendedTask[],
    patterns: PatternData,
    existingEvents: CalendarEvent[] = [],
    userPreferences: UserPreferences,
    taskHistory: ExtendedTask[] = []
  ) {
    this.tasks = tasks;
    this.patterns = patterns;
    this.existingEvents = existingEvents;
    this.userPreferences = userPreferences;
    this.taskHistory = taskHistory;
  }

  /**
   * Generate optimized schedule with production-ready algorithms
   */
  public generate(): {
    schedule: ScheduledTask[];
    adjustments: ScheduleAdjustment[];
    metadata: {
      totalTasks: number;
      scheduledTasks: number;
      conflicts: number;
      efficiency: number;
      confidence: number;
    };
  } {
    const startTime = Date.now();
    
    // 1. Analyze productivity windows from real data
    const productivityWindows = this.analyzeProductivityWindows();
    
    // 2. Generate time slots with intelligent allocation
    const availableSlots = this.generateOptimalTimeSlots(productivityWindows);
    
    // 3. Prioritize and sort tasks using real completion patterns
    const prioritizedTasks = this.prioritizeTasksWithHistory();
    
    // 4. Allocate tasks to optimal time slots
    const scheduledTasks = this.allocateTasksToSlots(prioritizedTasks, availableSlots);
    
    // 5. Detect and resolve conflicts with existing calendar events
    const { resolvedSchedule, conflicts } = this.detectAndResolveConflicts(scheduledTasks);
    
    // 6. Generate intelligent schedule adjustments
    const adjustments = this.generateScheduleAdjustments(resolvedSchedule, conflicts);
    
    // 7. Calculate efficiency and confidence metrics
    const efficiency = this.calculateScheduleEfficiency(resolvedSchedule);
    const confidence = this.calculateConfidenceScore(resolvedSchedule);
    
    const endTime = Date.now();
    console.log(`Smart schedule generated in ${endTime - startTime}ms`);
    
    return {
      schedule: resolvedSchedule,
      adjustments,
      metadata: {
        totalTasks: this.tasks.length,
        scheduledTasks: resolvedSchedule.length,
        conflicts: conflicts.length,
        efficiency,
        confidence
      }
    };
  }

  /**
   * Analyze productivity windows from real completion data
   */
  private analyzeProductivityWindows(): ProductivityWindow[] {
    const windows: ProductivityWindow[] = [];
    
    // Use pattern data if available
    if (this.patterns.timePattern?.mostProductiveHours) {
      this.patterns.timePattern.mostProductiveHours.forEach(hour => {
        windows.push({
          startHour: hour,
          endHour: hour + 2,
          efficiency: 0.9,
          dayOfWeek: undefined // All days
        });
      });
    }
    
    // Analyze historical completion data for more precise windows
    if (this.taskHistory.length > 10) {
      const completionAnalysis = this.analyzeHistoricalCompletions();
      windows.push(...completionAnalysis);
    }
    
    // Add user preference windows
    this.userPreferences.availableStudyHours.forEach(hour => {
      if (!windows.some(w => w.startHour === hour)) {
        windows.push({
          startHour: hour,
          endHour: hour + 1,
          efficiency: 0.7,
          dayOfWeek: undefined
        });
      }
    });
    
    // Default fallback windows
    if (windows.length === 0) {
      windows.push(
        { startHour: 9, endHour: 11, efficiency: 0.8 },
        { startHour: 14, endHour: 16, efficiency: 0.7 },
        { startHour: 19, endHour: 21, efficiency: 0.6 }
      );
    }
    
    return windows.sort((a, b) => b.efficiency - a.efficiency);
  }

  /**
   * Analyze historical task completions for productivity patterns
   */
  private analyzeHistoricalCompletions(): ProductivityWindow[] {
    const hourlyPerformance: Record<number, { count: number; avgDuration: number; efficiency: number }> = {};
    
    this.taskHistory.forEach(task => {
      if (task.completed && task.completedAt) {
        const completionHour = new Date(task.completedAt).getHours();
        const actualDuration = task.timeSpent || task.estimatedDuration || 60;
        const expectedDuration = task.estimatedDuration || 60;
        const efficiency = Math.min(expectedDuration / actualDuration, 2); // Cap at 2x efficiency
        
        if (!hourlyPerformance[completionHour]) {
          hourlyPerformance[completionHour] = { count: 0, avgDuration: 0, efficiency: 0 };
        }
        
        const current = hourlyPerformance[completionHour];
        current.count++;
        current.avgDuration = (current.avgDuration * (current.count - 1) + actualDuration) / current.count;
        current.efficiency = (current.efficiency * (current.count - 1) + efficiency) / current.count;
      }
    });
    
    return Object.entries(hourlyPerformance)
      .filter(([, data]) => data.count >= 3) // Need at least 3 completions for reliability
      .map(([hour, data]) => ({
        startHour: parseInt(hour),
        endHour: parseInt(hour) + 1,
        efficiency: Math.min(data.efficiency, 1), // Normalize to 0-1
        dayOfWeek: undefined
      }))
      .sort((a, b) => b.efficiency - a.efficiency);
  }

  /**
   * Generate optimal time slots based on productivity windows and constraints
   */
  private generateOptimalTimeSlots(productivityWindows: ProductivityWindow[]): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const now = new Date();
    const scheduleHorizon = 7; // Schedule for next 7 days
    
    for (let dayOffset = 0; dayOffset < scheduleHorizon; dayOffset++) {
      const currentDay = addDays(now, dayOffset);
      const dayOfWeek = currentDay.getDay();
      
      // Skip weekends if user prefers weekdays (based on patterns)
      if (this.shouldSkipWeekend(dayOfWeek)) continue;
      
      productivityWindows.forEach(window => {
        // Skip if window is specific to different day
        if (window.dayOfWeek !== undefined && window.dayOfWeek !== dayOfWeek) return;
        
        // Generate slots within the productivity window
        for (let hour = window.startHour; hour < window.endHour; hour++) {
          const slotStart = new Date(currentDay);
          slotStart.setHours(hour, 0, 0, 0);
          
          const slotEnd = new Date(slotStart);
          slotEnd.setHours(hour + 1, 0, 0, 0);
          
          // Skip past time slots
          if (isBefore(slotEnd, now)) continue;
          
          // Check if slot conflicts with existing events
          if (this.hasConflictWithExistingEvents(slotStart, slotEnd)) continue;
          
          slots.push({
            start: slotStart.toISOString(),
            end: slotEnd.toISOString(),
            startTime: slotStart,
            endTime: slotEnd,
            available: true,
            efficiency: window.efficiency,
            timeOfDay: this.categorizeTimeOfDay(hour)
          });
        }
      });
    }
    
    return slots.sort((a, b) => (b.efficiency || 0.5) - (a.efficiency || 0.5));
  }

  /**
   * Check if time slot conflicts with existing calendar events
   */
  private hasConflictWithExistingEvents(startTime: Date, endTime: Date): boolean {
    return this.existingEvents.some(event => 
      isWithinInterval(startTime, { start: event.startTime, end: event.endTime }) ||
      isWithinInterval(endTime, { start: event.startTime, end: event.endTime }) ||
      (isBefore(startTime, event.startTime) && isAfter(endTime, event.endTime))
    );
  }

  /**
   * Prioritize tasks using historical completion patterns and current context
   */
  private prioritizeTasksWithHistory(): ExtendedTask[] {
    return this.tasks
      .filter(task => !task.completed)
      .map(task => ({
        ...task,
        priorityScore: this.calculateTaskPriorityScore(task)
      }))
      .sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));
  }

  /**
   * Calculate comprehensive priority score for a task
   */
  private calculateTaskPriorityScore(task: ExtendedTask): number {
    let score = 0;
    
    // Base priority weight
    const priorityWeights = { high: 10, medium: 5, low: 2 };
    score += priorityWeights[task.priority] || 5;
    
    // Due date urgency
    if (task.dueDate) {
      const dueDate = new Date(task.dueDate);
      const now = new Date();
      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilDue <= 1) score += 15; // Due today/tomorrow
      else if (daysUntilDue <= 3) score += 10; // Due this week
      else if (daysUntilDue <= 7) score += 5; // Due next week
      else if (daysUntilDue < 0) score += 20; // Overdue
    }
    
    // Subject difficulty and performance history
    if (task.subject && this.patterns.subjectInsights) {
      const subjectPerf = this.patterns.subjectInsights.subjectPerformance[task.subject];
      if (subjectPerf) {
        // Prioritize struggling subjects if user preference is set
        if (this.userPreferences.strugglingSubjects.includes(task.subject)) {
          score += 8;
        }
        // Adjust based on completion rate
        score += (1 - subjectPerf.completionRate) * 5;
      }
    }
    
    // Task complexity and estimated duration
    const duration = task.estimatedDuration || 60;
    if (duration > 120) score += 3; // Long tasks get slight priority boost
    
    // Historical completion patterns
    const similarTaskHistory = this.findSimilarCompletedTasks(task);
    if (similarTaskHistory.length > 0) {
      const avgCompletionTime = similarTaskHistory.reduce((sum, t) => 
        sum + (t.timeSpent || t.estimatedDuration || 60), 0) / similarTaskHistory.length;
      
      // Boost score if similar tasks typically take longer than estimated
      if (avgCompletionTime > duration * 1.2) {
        score += 4;
      }
    }
    
    return score;
  }

  /**
   * Find similar completed tasks for pattern analysis
   */
  private findSimilarCompletedTasks(task: ExtendedTask): ExtendedTask[] {
    return this.taskHistory.filter(historyTask => 
      historyTask.completed &&
      (historyTask.subject === task.subject ||
       historyTask.type === task.type ||
       historyTask.priority === task.priority)
    );
  }

  /**
   * Allocate prioritized tasks to optimal time slots
   */
  private allocateTasksToSlots(tasks: ExtendedTask[], slots: TimeSlot[]): ScheduledTask[] {
    const scheduledTasks: ScheduledTask[] = [];
    const usedSlots = new Set<string>();
    
    for (const task of tasks) {
      const taskDuration = task.estimatedDuration || 60;
      const requiredSlots = Math.ceil(taskDuration / 60);
      
      // Find optimal slot sequence for this task
      const optimalSlots = this.findOptimalSlotSequence(task, slots, usedSlots, requiredSlots);
      
      if (optimalSlots.length > 0) {
        const scheduledTask: ScheduledTask = {
          // ExtendedTask properties
          id: task.id,
          title: task.title,
          description: task.description || '',
          dueDate: task.dueDate,
          priority: task.priority,
          type: task.type,
          subject: task.subject,
          completed: task.completed,
          reminder: task.reminder,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
          difficultyLevel: task.difficultyLevel || 5,
          estimatedDuration: task.estimatedDuration || 60,
          
          // ScheduledTask specific properties
          scheduledStart: optimalSlots[0].startTime.toISOString(),
          scheduledEnd: optimalSlots[optimalSlots.length - 1].endTime.toISOString(),
          startTime: optimalSlots[0].startTime,
          endTime: optimalSlots[optimalSlots.length - 1].endTime,
          confidence: this.calculateTaskScheduleConfidence(task, optimalSlots),
          reasoning: `Scheduled during optimal productivity window with ${Math.round(optimalSlots.reduce((sum, slot) => sum + (slot.efficiency || 0.5), 0) / optimalSlots.length * 100)}% efficiency`,
          duration: taskDuration,
          taskId: task.id,
          estimatedDifficulty: task.difficultyLevel || 5,
          metadata: {
            efficiency: optimalSlots.reduce((sum, slot) => sum + (slot.efficiency || 0.5), 0) / optimalSlots.length,
            allocatedSlots: optimalSlots.length,
            originalTask: task
          }
        };
        
        scheduledTasks.push(scheduledTask);
        
        // Mark slots as used
        optimalSlots.forEach(slot => {
          usedSlots.add(`${slot.startTime.getTime()}-${slot.endTime.getTime()}`);
        });
      }
    }
    
    return scheduledTasks;
  }

  /**
   * Find optimal sequence of time slots for a task
   */
  private findOptimalSlotSequence(
    task: ExtendedTask, 
    availableSlots: TimeSlot[], 
    usedSlots: Set<string>, 
    requiredSlots: number
  ): TimeSlot[] {
    const taskDuration = task.estimatedDuration || 60;
    
    // For short tasks (≤60 min), find single best slot
    if (requiredSlots === 1) {
      const bestSlot = availableSlots.find(slot => 
        !usedSlots.has(`${slot.startTime.getTime()}-${slot.endTime.getTime()}`) &&
        this.isSlotSuitableForTask(task, slot)
      );
      return bestSlot ? [bestSlot] : [];
    }
    
    // For longer tasks, find consecutive slots or split intelligently
    const consecutiveSlots = this.findConsecutiveSlots(availableSlots, usedSlots, requiredSlots);
    if (consecutiveSlots.length >= requiredSlots) {
      return consecutiveSlots.slice(0, requiredSlots);
    }
    
    // If no consecutive slots, split task if appropriate
    if (this.canSplitTask(task)) {
      return this.findSplitSlots(task, availableSlots, usedSlots, taskDuration);
    }
    
    return [];
  }

  /**
   * Check if a time slot is suitable for a specific task
   */
  private isSlotSuitableForTask(task: ExtendedTask, slot: TimeSlot): boolean {
    // Check time of day preference for task type
    if (task.type === 'academic' && slot.timeOfDay === 'late_night') return false;
    
    // Check subject-specific preferences
    if (task.subject && this.userPreferences.strugglingSubjects.includes(task.subject)) {
      // Schedule struggling subjects during high-efficiency slots
      return (slot.efficiency || 0.5) > 0.7;
    }
    
    // Check difficulty vs time slot efficiency
    const taskDifficulty = task.difficultyLevel || 5;
    if (taskDifficulty > 7 && (slot.efficiency || 0.5) < 0.6) return false;
    
    return true;
  }

  /**
   * Find consecutive available time slots
   */
  private findConsecutiveSlots(
    slots: TimeSlot[], 
    usedSlots: Set<string>, 
    requiredCount: number
  ): TimeSlot[] {
    const availableSlots = slots.filter(slot => 
      !usedSlots.has(`${slot.startTime.getTime()}-${slot.endTime.getTime()}`)
    );
    
    for (let i = 0; i <= availableSlots.length - requiredCount; i++) {
      const sequence = availableSlots.slice(i, i + requiredCount);
      
      // Check if slots are consecutive
      let isConsecutive = true;
      for (let j = 1; j < sequence.length; j++) {
        const prevEnd = sequence[j - 1].endTime.getTime();
        const currentStart = sequence[j].startTime.getTime();
        if (currentStart !== prevEnd) {
          isConsecutive = false;
          break;
        }
      }
      
      if (isConsecutive) return sequence;
    }
    
    return [];
  }

  /**
   * Detect and resolve scheduling conflicts
   */
  private detectAndResolveConflicts(scheduledTasks: ScheduledTask[]): {
    resolvedSchedule: ScheduledTask[];
    conflicts: ConflictResolution[];
  } {
    const conflicts: ConflictResolution[] = [];
    const resolvedSchedule: ScheduledTask[] = [];
    
    // Sort by start time for conflict detection
    const sortedTasks = [...scheduledTasks].sort((a, b) => 
      a.startTime.getTime() - b.startTime.getTime()
    );
    
    for (let i = 0; i < sortedTasks.length; i++) {
      const currentTask = sortedTasks[i];
      let hasConflict = false;
      
      // Check for conflicts with already resolved tasks
      for (const resolvedTask of resolvedSchedule) {
        if (this.tasksOverlap(currentTask, resolvedTask)) {
          hasConflict = true;
          
          // Resolve conflict based on priority and flexibility
          const resolution = this.resolveTaskConflict(currentTask, resolvedTask);
          conflicts.push(resolution);
          
          // Apply resolution
          if (resolution.type === 'reschedule') {
            resolvedSchedule.push(...resolution.newSchedule);
          } else if (resolution.type === 'split') {
            resolvedSchedule.push(...resolution.newSchedule);
          }
          // For 'defer', task is not scheduled
          
          break;
        }
      }
      
      if (!hasConflict) {
        resolvedSchedule.push(currentTask);
      }
    }
    
    return { resolvedSchedule, conflicts };
  }

  /**
   * Check if two scheduled tasks overlap in time
   */
  private tasksOverlap(task1: ScheduledTask, task2: ScheduledTask): boolean {
    return isWithinInterval(task1.startTime, { start: task2.startTime, end: task2.endTime }) ||
           isWithinInterval(task1.endTime, { start: task2.startTime, end: task2.endTime }) ||
           (isBefore(task1.startTime, task2.startTime) && isAfter(task1.endTime, task2.endTime));
  }

  /**
   * Resolve conflict between two tasks
   */
  private resolveTaskConflict(task1: ScheduledTask, task2: ScheduledTask): ConflictResolution {
    // Higher priority task wins
    if (this.getTaskPriorityValue(task1.priority) > this.getTaskPriorityValue(task2.priority)) {
      return {
        type: 'reschedule',
        originalTask: task2,
        newSchedule: [task1], // Keep task1, reschedule task2 later
        reason: `Higher priority task (${task1.title}) takes precedence`
      };
    }
    
    // If same priority, check due dates
    const task1Due = task1.metadata?.originalTask?.dueDate;
    const task2Due = task2.metadata?.originalTask?.dueDate;
    
    if (task1Due && task2Due) {
      const task1DueDate = new Date(task1Due);
      const task2DueDate = new Date(task2Due);
      
      if (isBefore(task1DueDate, task2DueDate)) {
        return {
          type: 'reschedule',
          originalTask: task2,
          newSchedule: [task1],
          reason: `Earlier due date (${format(task1DueDate, 'MMM dd')})`
        };
      }
    }
    
    // Default: split the longer task if possible
    if (task1.duration > task2.duration && task1.duration > 90) {
      return {
        type: 'split',
        originalTask: task1,
        newSchedule: [task2], // Keep task2, split task1
        reason: 'Split longer task to accommodate both'
      };
    }
    
    return {
      type: 'defer',
      originalTask: task1,
      newSchedule: [task2],
      reason: 'Defer to next available slot'
    };
  }

  /**
   * Generate intelligent schedule adjustment recommendations
   */
  private generateScheduleAdjustments(
    schedule: ScheduledTask[], 
    conflicts: ConflictResolution[]
  ): ScheduleAdjustment[] {
    const adjustments: ScheduleAdjustment[] = [];
    
    // Analyze schedule efficiency
    const efficiencyAnalysis = this.analyzeScheduleEfficiency(schedule);
    
    // Suggest break optimization
    if (efficiencyAnalysis.consecutiveHours > 3) {
      adjustments.push({
        id: `break-${Date.now()}`,
        taskId: schedule.find(task => task.duration > 120)?.taskId || '',
        originalTime: new Date().toISOString(),
        suggestedTime: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        reason: 'Consider adding 15-minute breaks between long study sessions to maintain focus',
        confidence: 0.8,
        priority: 'medium',
        type: 'productivity_optimization',
        title: 'Add Strategic Breaks',
        description: `Consider adding 15-minute breaks between long study sessions to maintain focus`,
        impact: 'medium',
        effort: 'low',
        suggestedChange: 'Insert breaks after every 2-3 hours of continuous work',
        affectedTasks: schedule.filter(task => task.duration > 120).map(task => task.taskId)
      });
    }
    
    // Suggest subject balancing
    const subjectDistribution = this.analyzeSubjectDistribution(schedule);
    if (subjectDistribution.imbalance > 0.7) {
      adjustments.push({
        id: `balance-${Date.now()}`,
        taskId: schedule[0]?.taskId || '',
        originalTime: new Date().toISOString(),
        suggestedTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        reason: 'Your schedule is heavily focused on one subject. Consider spreading subjects throughout the week',
        confidence: 0.7,
        priority: 'high',
        type: 'productivity_optimization',
        title: 'Balance Subject Distribution',
        description: 'Your schedule is heavily focused on one subject. Consider spreading subjects throughout the week',
        impact: 'high',
        effort: 'medium',
        suggestedChange: 'Redistribute tasks to ensure no subject dominates any single day',
        affectedTasks: schedule.map(task => task.taskId)
      });
    }
    
    // Suggest difficulty progression
    const difficultyProgression = this.analyzeDifficultyProgression(schedule);
    if (difficultyProgression.needsOptimization) {
      adjustments.push({
        id: `difficulty-${Date.now()}`,
        taskId: schedule[0]?.taskId || '',
        originalTime: new Date().toISOString(),
        suggestedTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        reason: 'Start with easier tasks to build momentum, then tackle harder ones during peak hours',
        confidence: 0.75,
        priority: 'medium',
        type: 'difficulty_adjustment',
        title: 'Optimize Difficulty Progression',
        description: 'Start with easier tasks to build momentum, then tackle harder ones during peak hours',
        impact: 'medium',
        effort: 'low',
        suggestedChange: 'Reorder tasks by difficulty within each study session',
        affectedTasks: schedule.map(task => task.taskId)
      });
    }
    
    // Add conflict-based adjustments
    conflicts.forEach(conflict => {
      adjustments.push({
        id: `conflict-${Date.now()}-${Math.random()}`,
        taskId: conflict.originalTask.taskId,
        originalTime: conflict.originalTask.startTime.toISOString(),
        suggestedTime: new Date(conflict.originalTask.startTime.getTime() + 60 * 60 * 1000).toISOString(),
        reason: conflict.reason,
        confidence: 0.6,
        priority: 'high',
        type: 'conflict_resolution',
        title: `Resolve: ${conflict.originalTask.title}`,
        description: conflict.reason,
        impact: 'high',
        effort: 'medium',
        suggestedChange: `${conflict.type} the conflicting task`,
        affectedTasks: [conflict.originalTask.taskId]
      });
    });
    
    return adjustments;
  }

  /**
   * Calculate overall schedule efficiency
   */
  private calculateScheduleEfficiency(schedule: ScheduledTask[]): number {
    if (schedule.length === 0) return 0;
    
    let totalEfficiency = 0;
    let totalDuration = 0;
    
    schedule.forEach(task => {
      const efficiency = task.metadata?.efficiency || 0.5;
      totalEfficiency += efficiency * task.duration;
      totalDuration += task.duration;
    });
    
    return totalDuration > 0 ? totalEfficiency / totalDuration : 0;
  }

  /**
   * Calculate confidence score for the generated schedule
   */
  private calculateConfidenceScore(schedule: ScheduledTask[]): number {
    if (schedule.length === 0) return 0;
    
    const factors = {
      dataQuality: this.patterns.dataQuality || 0.5,
      taskCoverage: Math.min(schedule.length / this.tasks.length, 1),
      timeSlotOptimization: this.calculateTimeSlotOptimization(schedule),
      conflictResolution: this.calculateConflictResolutionScore(schedule)
    };
    
    return (factors.dataQuality * 0.3 + 
            factors.taskCoverage * 0.3 + 
            factors.timeSlotOptimization * 0.2 + 
            factors.conflictResolution * 0.2);
  }

  // Helper methods
  private shouldSkipWeekend(dayOfWeek: number): boolean {
    return (dayOfWeek === 0 || dayOfWeek === 6) && 
           !this.userPreferences.availableStudyHours.some(hour => hour >= 0);
  }

  private categorizeTimeOfDay(hour: number): 'morning' | 'afternoon' | 'evening' | 'late_night' {
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 22) return 'evening';
    return 'late_night';
  }

  private canSplitTask(task: ExtendedTask): boolean {
    return task.type !== 'personal' && (task.estimatedDuration || 60) > 90;
  }

  private findSplitSlots(
    task: ExtendedTask, 
    slots: TimeSlot[], 
    usedSlots: Set<string>, 
    duration: number
  ): TimeSlot[] {
    // Implementation for finding split slots
    const availableSlots = slots.filter(slot => 
      !usedSlots.has(`${slot.startTime.getTime()}-${slot.endTime.getTime()}`)
    );
    
    return availableSlots.slice(0, Math.ceil(duration / 60));
  }

  private calculateTaskScheduleConfidence(task: ExtendedTask, slots: TimeSlot[]): number {
    const avgEfficiency = slots.reduce((sum, slot) => sum + (slot.efficiency || 0.5), 0) / slots.length;
    const suitabilityScore = this.isSlotSuitableForTask(task, slots[0]) ? 1 : 0.5;
    return (avgEfficiency + suitabilityScore) / 2;
  }

  private getTaskPriorityValue(priority: Priority): number {
    const values = { high: 3, medium: 2, low: 1 };
    return values[priority] || 2;
  }

  private analyzeScheduleEfficiency(schedule: ScheduledTask[]): { consecutiveHours: number } {
    // Simplified implementation
    let maxConsecutive = 0;
    let currentConsecutive = 0;
    
    const sortedSchedule = [...schedule].sort((a, b) => 
      a.startTime.getTime() - b.startTime.getTime()
    );
    
    for (let i = 0; i < sortedSchedule.length; i++) {
      const task = sortedSchedule[i];
      const duration = task.duration / 60; // Convert to hours
      
      if (i === 0) {
        currentConsecutive = duration;
      } else {
        const prevTask = sortedSchedule[i - 1];
        const gap = (task.startTime.getTime() - prevTask.endTime.getTime()) / (1000 * 60); // Gap in minutes
        
        if (gap <= 30) { // Consider tasks within 30 minutes as consecutive
          currentConsecutive += duration;
        } else {
          maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
          currentConsecutive = duration;
        }
      }
    }
    
    maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
    return { consecutiveHours: maxConsecutive };
  }

  private analyzeSubjectDistribution(schedule: ScheduledTask[]): { imbalance: number } {
    const subjectHours: Record<string, number> = {};
    let totalHours = 0;
    
    schedule.forEach(task => {
      const subject = task.subject || 'Other';
      const hours = task.duration / 60;
      subjectHours[subject] = (subjectHours[subject] || 0) + hours;
      totalHours += hours;
    });
    
    if (totalHours === 0) return { imbalance: 0 };
    
    const subjects = Object.keys(subjectHours);
    if (subjects.length <= 1) return { imbalance: 0 };
    
    const expectedHoursPerSubject = totalHours / subjects.length;
    const variance = subjects.reduce((sum, subject) => {
      const deviation = Math.abs(subjectHours[subject] - expectedHoursPerSubject);
      return sum + deviation;
    }, 0);
    
    return { imbalance: variance / totalHours };
  }

  private analyzeDifficultyProgression(schedule: ScheduledTask[]): { needsOptimization: boolean } {
    if (schedule.length < 2) return { needsOptimization: false };
    
    const sortedByTime = [...schedule].sort((a, b) => 
      a.startTime.getTime() - b.startTime.getTime()
    );
    
    // Check if hardest tasks are scheduled during low-efficiency times
    let needsOptimization = false;
    
    sortedByTime.forEach(task => {
      const difficulty = task.estimatedDifficulty || 5;
      const efficiency = task.metadata?.efficiency || 0.5;
      
      if (difficulty > 7 && efficiency < 0.6) {
        needsOptimization = true;
      }
    });
    
    return { needsOptimization };
  }

  private calculateTimeSlotOptimization(schedule: ScheduledTask[]): number {
    if (schedule.length === 0) return 0;
    
    const totalOptimization = schedule.reduce((sum, task) => {
      const efficiency = task.metadata?.efficiency || 0.5;
      const difficulty = task.estimatedDifficulty || 5;
      const match = efficiency * (difficulty / 10); // Higher efficiency for harder tasks is better
      return sum + match;
    }, 0);
    
    return totalOptimization / schedule.length;
  }

  private calculateConflictResolutionScore(schedule: ScheduledTask[]): number {
    // Simplified: assume fewer overlaps = better conflict resolution
    let overlaps = 0;
    
    for (let i = 0; i < schedule.length; i++) {
      for (let j = i + 1; j < schedule.length; j++) {
        if (this.tasksOverlap(schedule[i], schedule[j])) {
          overlaps++;
        }
      }
    }
    
    return Math.max(0, 1 - (overlaps / schedule.length));
  }
}