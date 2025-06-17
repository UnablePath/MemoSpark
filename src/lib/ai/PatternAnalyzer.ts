import { PatternData, UserPreferences, Task } from "@/types/ai";

export class PatternAnalyzer {
  private preferences: UserPreferences;
  private patterns: Partial<PatternData>;
  private history: Task[];

  constructor(preferences: UserPreferences, history: Task[] = []) {
    this.preferences = preferences;
    this.history = history;
    this.patterns = {
      timePattern: {
        mostProductiveHours: [],
        preferredStudyDuration: 45,
        averageBreakTime: 15,
        peakPerformanceDays: [],
        consistencyScore: 0
      },
      difficultyProfile: {
        averageTaskDifficulty: 5,
        difficultyTrend: 'stable',
        subjectDifficultyMap: {},
        adaptationRate: 0.5
      },
      subjectInsights: {
        preferredSubjects: [],
        strugglingSubjects: [],
        subjectPerformance: {}
      }
    };
  }

  public analyze(): Partial<PatternData> {
    this.analyzeProductivity();
    this.analyzeSubjects();
    this.learnFromHistory();

    return this.patterns;
  }

  private analyzeProductivity(): void {
    if (!this.patterns.timePattern) return;

    // A more sophisticated analysis would go here.
    // This is a simplified mapping from preferences.
    switch (this.preferences.studyTimePreference) {
      case 'morning':
        this.patterns.timePattern.mostProductiveHours = [9, 10, 11];
        break;
      case 'afternoon':
        this.patterns.timePattern.mostProductiveHours = [14, 15, 16];
        break;
      case 'evening':
        this.patterns.timePattern.mostProductiveHours = [19, 20, 21];
        break;
      case 'night':
          this.patterns.timePattern.mostProductiveHours = [22, 23, 0];
          break;
    }

    switch (this.preferences.sessionLengthPreference) {
      case 'short':
        this.patterns.timePattern.preferredStudyDuration = 30;
        break;
      case 'medium':
        this.patterns.timePattern.preferredStudyDuration = 45;
        break;
      case 'long':
        this.patterns.timePattern.preferredStudyDuration = 60;
        break;
    }

     switch (this.preferences.breakFrequency) {
      case 'frequent':
        this.patterns.timePattern.averageBreakTime = 5;
        break;
      case 'moderate':
        this.patterns.timePattern.averageBreakTime = 10;
        break;
      case 'minimal':
        this.patterns.timePattern.averageBreakTime = 15;
        break;
    }
  }

  private analyzeSubjects(): void {
    if (!this.patterns.subjectInsights || !this.patterns.difficultyProfile) return;

    this.patterns.subjectInsights.preferredSubjects = this.preferences.preferredSubjects;
    this.patterns.subjectInsights.strugglingSubjects = this.preferences.strugglingSubjects;

    // Initialize difficulty map
    this.preferences.preferredSubjects.forEach(sub => {
        if(this.patterns.difficultyProfile) this.patterns.difficultyProfile.subjectDifficultyMap[sub] = 3; // Easier
    });
    this.preferences.strugglingSubjects.forEach(sub => {
        if(this.patterns.difficultyProfile) this.patterns.difficultyProfile.subjectDifficultyMap[sub] = 7; // Harder
    });
  }

  private learnFromHistory(): void {
    if (this.history.length === 0) return;

    this.learnProductivityPatterns();
    this.learnDifficultyPatterns();
    this.learnSubjectPerformance();
    this.calculateConsistencyScore();
  }

  /**
   * Enhanced learning from real task completion data
   */
  public learnFromCompletionData(completedTasks: Task[]): void {
    if (completedTasks.length < 5) return; // Need minimum data for learning

    // Update productivity patterns based on actual completion times
    this.updateProductivityPatternsFromData(completedTasks);
    
    // Learn subject-specific performance patterns
    this.updateSubjectPatternsFromData(completedTasks);
    
    // Update difficulty progression based on completion success
    this.updateDifficultyPatternsFromData(completedTasks);
  }

  /**
   * Update productivity patterns from real completion data
   */
  private updateProductivityPatternsFromData(completedTasks: Task[]): void {
    if (!this.patterns.timePattern) return;

    const hourlyCompletions: Record<number, { count: number; avgTime: number }> = {};
    
    completedTasks.forEach(task => {
      if (task.updatedAt) { // When task was completed
        const completionHour = new Date(task.updatedAt).getHours();
        const estimatedTime = this.estimateTaskDuration(task);
        
        if (!hourlyCompletions[completionHour]) {
          hourlyCompletions[completionHour] = { count: 0, avgTime: 0 };
        }
        
        const current = hourlyCompletions[completionHour];
        current.count++;
        current.avgTime = (current.avgTime * (current.count - 1) + estimatedTime) / current.count;
      }
    });

    // Update most productive hours based on completion frequency and efficiency
    const productiveHours = Object.entries(hourlyCompletions)
      .filter(([, data]) => data.count >= 2) // At least 2 completions
      .sort(([, a], [, b]) => b.count - a.count) // Sort by frequency
      .slice(0, 4) // Top 4 hours
      .map(([hour]) => parseInt(hour));

    if (productiveHours.length > 0) {
      this.patterns.timePattern.mostProductiveHours = productiveHours;
    }

    // Update consistency score based on data reliability
    const totalCompletions = Object.values(hourlyCompletions).reduce((sum, data) => sum + data.count, 0);
    this.patterns.timePattern.consistencyScore = Math.min(totalCompletions / 50, 1); // Max score at 50+ completions
  }

  /**
   * Update subject patterns from completion data
   */
  private updateSubjectPatternsFromData(completedTasks: Task[]): void {
    if (!this.patterns.subjectInsights) return;

    const subjectStats: Record<string, { completed: number; total: number; avgTime: number }> = {};
    
    completedTasks.forEach(task => {
      if (task.subject) {
        if (!subjectStats[task.subject]) {
          subjectStats[task.subject] = { completed: 0, total: 0, avgTime: 0 };
        }
        
        const stats = subjectStats[task.subject];
        stats.completed++;
        stats.total++;
        
        const estimatedTime = this.estimateTaskDuration(task);
        stats.avgTime = (stats.avgTime * (stats.completed - 1) + estimatedTime) / stats.completed;
      }
    });

    // Update subject performance based on completion rates
    Object.entries(subjectStats).forEach(([subject, stats]) => {
      const completionRate = stats.completed / stats.total;
      
      if (this.patterns.subjectInsights?.subjectPerformance) {
        this.patterns.subjectInsights.subjectPerformance[subject] = {
          completionRate,
          averageTimeSpent: stats.avgTime,
          difficultyProgression: [5] // Default, could be enhanced
        };
      }

      // Identify struggling subjects (low completion rate or high time)
      if (completionRate < 0.7 || stats.avgTime > 90) {
        if (this.patterns.subjectInsights?.strugglingSubjects && !this.patterns.subjectInsights.strugglingSubjects.includes(subject)) {
          this.patterns.subjectInsights.strugglingSubjects.push(subject);
        }
      } else {
        // Remove from struggling if performance improved
        if (this.patterns.subjectInsights?.strugglingSubjects) {
          this.patterns.subjectInsights.strugglingSubjects = 
            this.patterns.subjectInsights.strugglingSubjects.filter(s => s !== subject);
        }
        
        // Add to preferred if performing well
        if (completionRate > 0.8 && this.patterns.subjectInsights?.preferredSubjects && !this.patterns.subjectInsights.preferredSubjects.includes(subject)) {
          this.patterns.subjectInsights.preferredSubjects.push(subject);
        }
      }
    });
  }

  /**
   * Update difficulty patterns from completion data
   */
  private updateDifficultyPatternsFromData(completedTasks: Task[]): void {
    if (!this.patterns.difficultyProfile) return;

    const difficultyStats = {
      high: { completed: 0, total: 0 },
      medium: { completed: 0, total: 0 },
      low: { completed: 0, total: 0 }
    };

    completedTasks.forEach(task => {
      const priority = task.priority || 'medium';
      if (difficultyStats[priority]) {
        difficultyStats[priority].completed++;
        difficultyStats[priority].total++;
      }
    });

    // Calculate average difficulty comfort based on completion rates
    const highRate = difficultyStats.high.total > 0 ? difficultyStats.high.completed / difficultyStats.high.total : 0;
    const mediumRate = difficultyStats.medium.total > 0 ? difficultyStats.medium.completed / difficultyStats.medium.total : 0;
    const lowRate = difficultyStats.low.total > 0 ? difficultyStats.low.completed / difficultyStats.low.total : 0;

    // Update average task difficulty based on what user completes successfully
    if (this.patterns.difficultyProfile) {
      if (highRate > 0.8) {
        this.patterns.difficultyProfile.averageTaskDifficulty = Math.min(this.patterns.difficultyProfile.averageTaskDifficulty + 1, 10);
      } else if (highRate < 0.5 && mediumRate > 0.8) {
        this.patterns.difficultyProfile.averageTaskDifficulty = Math.max(this.patterns.difficultyProfile.averageTaskDifficulty - 1, 1);
      }

      // Update adaptation rate based on completion consistency
      const overallRate = (highRate + mediumRate + lowRate) / 3;
      this.patterns.difficultyProfile.adaptationRate = Math.min(overallRate, 1);
    }
  }

  /**
   * Estimate task duration based on task properties
   */
  private estimateTaskDuration(task: Task): number {
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

  private learnProductivityPatterns(): void {
    if (!this.patterns.timePattern) return;

    const completionData: { hour: number; duration: number; difficulty: number }[] = [];
    
    this.history.forEach(task => {
      if (task.completed && task.completedAt) {
        const completionHour = new Date(task.completedAt).getHours();
        const actualDuration = task.timeSpent || task.estimatedDuration || 60;
        const difficulty = task.difficultyLevel || 5;
        
        completionData.push({
          hour: completionHour,
          duration: actualDuration,
          difficulty
        });
      }
    });

    if (completionData.length > 10) { // Need substantial data for learning
      // Analyze productivity by hour
      const hourlyPerformance = this.analyzeHourlyPerformance(completionData);
      
      // Update productive hours based on actual performance
      const topPerformanceHours = Object.entries(hourlyPerformance)
        .sort(([,a], [,b]) => b.efficiency - a.efficiency)
        .slice(0, 4)
        .map(([hour]) => parseInt(hour));
      
      // Blend with user preferences (70% learned, 30% stated preference)
      const currentProductiveHours = this.patterns.timePattern.mostProductiveHours || [];
      const blendedHours = [...new Set([...topPerformanceHours, ...currentProductiveHours])];
      
      this.patterns.timePattern.mostProductiveHours = blendedHours.slice(0, 5);
      
      // Learn optimal session duration
      const avgDuration = completionData.reduce((sum, d) => sum + d.duration, 0) / completionData.length;
      this.patterns.timePattern.preferredStudyDuration = Math.round(avgDuration);
    }
  }

  private analyzeHourlyPerformance(data: { hour: number; duration: number; difficulty: number }[]): Record<number, { efficiency: number; count: number }> {
    const hourlyStats: Record<number, { totalDuration: number; totalDifficulty: number; count: number }> = {};
    
    data.forEach(({ hour, duration, difficulty }) => {
      if (!hourlyStats[hour]) {
        hourlyStats[hour] = { totalDuration: 0, totalDifficulty: 0, count: 0 };
      }
      
      hourlyStats[hour].totalDuration += duration;
      hourlyStats[hour].totalDifficulty += difficulty;
      hourlyStats[hour].count += 1;
    });
    
    // Calculate efficiency score (difficulty handled per minute)
    const performance: Record<number, { efficiency: number; count: number }> = {};
    
    Object.entries(hourlyStats).forEach(([hour, stats]) => {
      const avgDifficulty = stats.totalDifficulty / stats.count;
      const avgDuration = stats.totalDuration / stats.count;
      const efficiency = avgDifficulty / avgDuration; // Higher difficulty per minute = more efficient
      
      performance[parseInt(hour)] = {
        efficiency,
        count: stats.count
      };
    });
    
    return performance;
  }

  private learnDifficultyPatterns(): void {
    if (!this.patterns.difficultyProfile) return;

    const completedTasks = this.history.filter(task => task.completed);
    if (completedTasks.length < 5) return;

    // Calculate average difficulty of completed tasks
    const avgDifficulty = completedTasks.reduce((sum, task) => 
      sum + (task.difficultyLevel || 5), 0) / completedTasks.length;
    
    this.patterns.difficultyProfile.averageTaskDifficulty = avgDifficulty;

    // Analyze difficulty trend over time
    const recentTasks = completedTasks.slice(-10);
    const olderTasks = completedTasks.slice(-20, -10);
    
    if (olderTasks.length > 0 && recentTasks.length > 0) {
      const recentAvg = recentTasks.reduce((sum, task) => 
        sum + (task.difficultyLevel || 5), 0) / recentTasks.length;
      const olderAvg = olderTasks.reduce((sum, task) => 
        sum + (task.difficultyLevel || 5), 0) / olderTasks.length;
      
      if (recentAvg > olderAvg + 0.5) {
        this.patterns.difficultyProfile.difficultyTrend = 'increasing';
      } else if (recentAvg < olderAvg - 0.5) {
        this.patterns.difficultyProfile.difficultyTrend = 'decreasing';
      } else {
        this.patterns.difficultyProfile.difficultyTrend = 'stable';
      }
    }

    // Calculate adaptation rate (how quickly user adapts to difficulty)
    const adaptationRate = this.calculateAdaptationRate(completedTasks);
    this.patterns.difficultyProfile.adaptationRate = adaptationRate;
  }

  private calculateAdaptationRate(tasks: Task[]): number {
    if (tasks.length < 10) return 0.5; // Default rate

    // Group tasks by difficulty level and analyze completion patterns
    const difficultyGroups: Record<number, Task[]> = {};
    
    tasks.forEach(task => {
      const difficulty = Math.round(task.difficultyLevel || 5);
      if (!difficultyGroups[difficulty]) {
        difficultyGroups[difficulty] = [];
      }
      difficultyGroups[difficulty].push(task);
    });

    // Calculate how performance improves within each difficulty level
    let totalAdaptation = 0;
    let groupCount = 0;

    Object.values(difficultyGroups).forEach(group => {
      if (group.length >= 3) {
        const early = group.slice(0, Math.ceil(group.length / 2));
        const later = group.slice(Math.ceil(group.length / 2));
        
        const earlyAvgDuration = early.reduce((sum, task) => 
          sum + (task.timeSpent || task.estimatedDuration || 60), 0) / early.length;
        const laterAvgDuration = later.reduce((sum, task) => 
          sum + (task.timeSpent || task.estimatedDuration || 60), 0) / later.length;
        
        // Improvement = reduction in time needed
        const improvement = (earlyAvgDuration - laterAvgDuration) / earlyAvgDuration;
        totalAdaptation += Math.max(0, improvement);
        groupCount++;
      }
    });

    return groupCount > 0 ? Math.min(1, totalAdaptation / groupCount) : 0.5;
  }

  private learnSubjectPerformance(): void {
    if (!this.patterns.subjectInsights) return;

    const subjectStats: Record<string, { 
      completed: number; 
      total: number; 
      avgDuration: number; 
      avgDifficulty: number 
    }> = {};

    this.history.forEach(task => {
      if (task.subject) {
        if (!subjectStats[task.subject]) {
          subjectStats[task.subject] = { completed: 0, total: 0, avgDuration: 0, avgDifficulty: 0 };
        }
        
        subjectStats[task.subject].total++;
        if (task.completed) {
          subjectStats[task.subject].completed++;
        }
        
        subjectStats[task.subject].avgDuration += (task.timeSpent || task.estimatedDuration || 60);
        subjectStats[task.subject].avgDifficulty += (task.difficultyLevel || 5);
      }
    });

    // Calculate performance metrics for each subject
    const subjectPerformance: Record<string, {
      completionRate: number;
      averageTimeSpent: number;
      difficultyProgression: number[];
    }> = {};
    const strugglingSubjects: string[] = [];
    const preferredSubjects: string[] = [];

    Object.entries(subjectStats).forEach(([subject, stats]) => {
      if (stats.total > 0) {
        const completionRate = stats.completed / stats.total;
        const avgDuration = stats.avgDuration / stats.total;
        const avgDifficulty = stats.avgDifficulty / stats.total;
        
        // Create proper performance object
        subjectPerformance[subject] = {
          completionRate,
          averageTimeSpent: avgDuration,
          difficultyProgression: [avgDifficulty] // Simplified for now
        };
        
        // Performance score: completion rate weighted by efficiency
        const efficiency = avgDifficulty / (avgDuration / 60); // difficulty per hour
        const performance = completionRate * 0.7 + (efficiency / 10) * 0.3;
        
        if (completionRate < 0.7 || efficiency < 0.05) {
          strugglingSubjects.push(subject);
        } else if (completionRate > 0.9 && efficiency > 0.1) {
          preferredSubjects.push(subject);
        }
      }
    });

    this.patterns.subjectInsights.subjectPerformance = subjectPerformance;
    
    // Update struggling and preferred subjects based on learned data
    if (strugglingSubjects.length > 0) {
      this.patterns.subjectInsights.strugglingSubjects = [
        ...new Set([...strugglingSubjects, ...(this.patterns.subjectInsights.strugglingSubjects || [])])
      ];
    }
    
    if (preferredSubjects.length > 0) {
      this.patterns.subjectInsights.preferredSubjects = [
        ...new Set([...preferredSubjects, ...(this.patterns.subjectInsights.preferredSubjects || [])])
      ];
    }
  }

  private calculateConsistencyScore(): void {
    if (!this.patterns.timePattern || this.history.length < 7) return;

    const completedTasks = this.history.filter(task => task.completed && task.completedAt);
    if (completedTasks.length < 7) return;

    // Group tasks by day of week
    const dailyTaskCounts: Record<number, number> = {};
    
    completedTasks.forEach(task => {
      const dayOfWeek = new Date(task.completedAt!).getDay();
      dailyTaskCounts[dayOfWeek] = (dailyTaskCounts[dayOfWeek] || 0) + 1;
    });

    // Calculate consistency (lower variance = higher consistency)
    const counts = Object.values(dailyTaskCounts);
    const mean = counts.reduce((sum, count) => sum + count, 0) / counts.length;
    const variance = counts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / counts.length;
    
    // Convert to 0-1 score (lower variance = higher score)
    const consistencyScore = Math.max(0, 1 - (variance / (mean + 1)));
    
    this.patterns.timePattern.consistencyScore = consistencyScore;
    
    // Identify peak performance days
    const sortedDays = Object.entries(dailyTaskCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([day]) => {
        const dayNum = parseInt(day);
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return dayNames[dayNum] || 'Monday';
      });
    
    this.patterns.timePattern.peakPerformanceDays = sortedDays;
  }
} 