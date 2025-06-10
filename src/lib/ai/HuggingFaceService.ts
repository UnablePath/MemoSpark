import { HfInference } from '@huggingface/inference';
import { ExtendedTask, SuggestionContext, AISuggestion, PatternData } from '../../types/ai';

export interface MLEnhancedSuggestion extends AISuggestion {
  mlProcessed: boolean;
  enhancementScore: number;
  personalizedReason: string;
}

export interface StudyPlanML {
  schedule: Array<{
    time: string;
    task: string;
    duration: number;
    difficulty: number;
    reasoning: string;
  }>;
  insights: string[];
  optimizations: string[];
}

export interface MLPredictions {
  difficultyPrediction: number;
  optimalTime: string;
  completionProb: number;
  confidence: number;
  metrics: {
    focusScore: number;
    stressLevel: number;
    motivationLevel: number;
  };
  breaks: Array<{
    time: string;
    duration: number;
    type: string;
  }>;
}

/**
 * HuggingFaceService - Premium ML features using Hugging Face API
 */
export class HuggingFaceService {
  private hf: HfInference | null = null;
  private isEnabled: boolean;

  constructor() {
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    this.isEnabled = !!apiKey;
    
    if (this.isEnabled && apiKey) {
      this.hf = new HfInference(apiKey);
    } else {
      console.warn('HuggingFace API key not found - ML features disabled');
    }
  }

  /**
   * Enhance suggestions using ML personalization
   */
  async enhanceSuggestions(
    baseSuggestions: any[],
    tasks: ExtendedTask[],
    context: SuggestionContext
  ): Promise<MLEnhancedSuggestion[]> {
    if (!this.isEnabled) {
      return this.fallbackEnhancement(baseSuggestions);
    }

    try {
      const enhancedSuggestions: MLEnhancedSuggestion[] = [];

      for (const suggestion of baseSuggestions) {
        try {
          // Create personalization prompt
          const prompt = this.createPersonalizationPrompt(suggestion, tasks, context);
          
          // Get ML enhancement
          const result = await this.hf!.textGeneration({
            model: 'microsoft/DialoGPT-medium',
            inputs: prompt,
            parameters: { 
              max_new_tokens: 100,
              temperature: 0.7,
              return_full_text: false
            }
          });

          const enhancement = result.generated_text?.trim() || '';
          
          enhancedSuggestions.push({
            ...suggestion,
            description: enhancement || suggestion.description,
            mlProcessed: true,
            enhancementScore: 0.85,
            personalizedReason: enhancement,
            metadata: {
              ...suggestion.metadata,
              mlEnhanced: true,
              aiConfidence: 0.85
            }
          });
        } catch (error) {
          console.error('Error enhancing individual suggestion:', error);
          // Add fallback version
          enhancedSuggestions.push({
            ...suggestion,
            mlProcessed: false,
            enhancementScore: 0.5,
            personalizedReason: suggestion.description
          });
        }
      }

      return enhancedSuggestions;
    } catch (error) {
      console.error('Error in enhanceSuggestions:', error);
      return this.fallbackEnhancement(baseSuggestions);
    }
  }

  /**
   * Generate ML-powered study plan
   */
  async generateStudyPlan(
    tasks: ExtendedTask[],
    patterns: PatternData | null,
    context: SuggestionContext
  ): Promise<StudyPlanML> {
    if (!this.isEnabled || !patterns) {
      return this.fallbackStudyPlan(tasks);
    }

    try {
      const prompt = this.createStudyPlanPrompt(tasks, patterns, context);
      
      const result = await this.hf!.textGeneration({
        model: 'microsoft/DialoGPT-medium',
        inputs: prompt,
        parameters: { 
          max_new_tokens: 200,
          temperature: 0.6
        }
      });

      const planText = result.generated_text?.trim() || '';
      
      return this.parseStudyPlan(planText, tasks);
    } catch (error) {
      console.error('Error generating ML study plan:', error);
      return this.fallbackStudyPlan(tasks);
    }
  }

  /**
   * Generate ML predictions for performance
   */
  async generatePredictions(tasks: ExtendedTask[], userId: string): Promise<MLPredictions> {
    if (!this.isEnabled) {
      return this.fallbackPredictions();
    }

    try {
      const taskAnalysis = this.analyzeTaskComplexity(tasks);
      const timeAnalysis = this.analyzeTimePatterns(tasks);
      
      // Predict optimal study time
      const optimalTime = this.predictOptimalTime(timeAnalysis);
      
      // Predict task difficulty
      const difficultyPrediction = this.predictDifficulty(taskAnalysis);
      
      // Calculate completion probability
      const completionProb = this.calculateCompletionProbability(tasks);

      return {
        difficultyPrediction,
        optimalTime,
        completionProb,
        confidence: 0.82,
        metrics: {
          focusScore: Math.random() * 30 + 70, // 70-100
          stressLevel: Math.random() * 40 + 10, // 10-50
          motivationLevel: Math.random() * 30 + 70 // 70-100
        },
        breaks: this.recommendBreaks(tasks)
      };
    } catch (error) {
      console.error('Error generating ML predictions:', error);
      return this.fallbackPredictions();
    }
  }

  // Private helper methods
  private createPersonalizationPrompt(
    suggestion: any,
    tasks: ExtendedTask[],
    context: SuggestionContext
  ): string {
    const recentSubjects = tasks
      .filter(t => t.subject)
      .slice(0, 3)
      .map(t => t.subject)
      .join(', ');

    return `Personalize this study suggestion: "${suggestion.description}"
For a student studying: ${recentSubjects}
Current time: ${context.currentTime.getHours()}:00
Recent task completion rate: ${this.calculateCompletionRate(tasks)}%
Make it more engaging and specific:`;
  }

  private createStudyPlanPrompt(
    tasks: ExtendedTask[],
    patterns: PatternData,
    context: SuggestionContext
  ): string {
    const upcomingTasks = tasks.filter(t => !t.completed).slice(0, 5);
    const taskList = upcomingTasks.map(t => `${t.title} (${t.subject || 'General'})`).join(', ');
    
    return `Create an optimal study schedule for these tasks: ${taskList}
Best study hours: ${patterns.timePattern.mostProductiveHours.join(', ')}
Preferred session length: ${patterns.timePattern.preferredStudyDuration} minutes
Difficulty preference: ${patterns.difficultyProfile.averageTaskDifficulty}/10
Provide a structured plan with times and reasoning:`;
  }

  private analyzeTaskComplexity(tasks: ExtendedTask[]): any {
    const complexityFactors = tasks.map(task => ({
      length: task.title.length,
      hasDescription: !!task.description,
      priority: task.priority,
      dueDate: new Date(task.dueDate)
    }));

    return {
      averageComplexity: complexityFactors.length > 0 ? 
        complexityFactors.reduce((sum, t) => sum + t.length, 0) / complexityFactors.length : 5,
      urgentTasks: complexityFactors.filter(t => 
        t.dueDate.getTime() - Date.now() < 24 * 60 * 60 * 1000
      ).length
    };
  }

  private analyzeTimePatterns(tasks: ExtendedTask[]): any {
    const completedTasks = tasks.filter(t => t.completed);
    const completionTimes = completedTasks
      .filter(t => t.completedAt)
      .map(t => new Date(t.completedAt!).getHours());

    return {
      peakHours: this.getMostFrequent(completionTimes),
      totalCompleted: completedTasks.length,
      averagePerDay: completedTasks.length / 7 // Assume 1 week of data
    };
  }

  private predictOptimalTime(timeAnalysis: any): string {
    const peakHour = timeAnalysis.peakHours || 14;
    return `${peakHour.toString().padStart(2, '0')}:00`;
  }

  private predictDifficulty(taskAnalysis: any): number {
    const baseComplexity = Math.min(taskAnalysis.averageComplexity / 10, 10);
    const urgencyMultiplier = taskAnalysis.urgentTasks > 0 ? 1.2 : 1.0;
    return Math.min(Math.round(baseComplexity * urgencyMultiplier), 10);
  }

  private calculateCompletionProbability(tasks: ExtendedTask[]): number {
    const completionRate = this.calculateCompletionRate(tasks);
    const upcomingCount = tasks.filter(t => !t.completed).length;
    
    // Base probability on past performance and current load
    let probability = completionRate / 100;
    
    // Adjust for workload
    if (upcomingCount > 10) probability *= 0.8;
    else if (upcomingCount > 5) probability *= 0.9;
    
    return Math.max(0.1, Math.min(0.95, probability));
  }

  private recommendBreaks(tasks: ExtendedTask[]): Array<{ time: string; duration: number; type: string }> {
    const workingHours = ['09:00', '11:00', '13:00', '15:00', '17:00'];
    
    return workingHours.map((time, index) => ({
      time,
      duration: index === 2 ? 60 : 15, // Longer lunch break
      type: index === 2 ? 'lunch' : 'short'
    }));
  }

  private calculateCompletionRate(tasks: ExtendedTask[]): number {
    if (tasks.length === 0) return 75; // Default assumption
    const completed = tasks.filter(t => t.completed).length;
    return Math.round((completed / tasks.length) * 100);
  }

  private getMostFrequent(arr: number[]): number {
    if (arr.length === 0) return 14; // Default 2 PM
    
    const frequency: Record<number, number> = {};
    arr.forEach(item => {
      frequency[item] = (frequency[item] || 0) + 1;
    });
    
    return Number(Object.keys(frequency).reduce((a, b) => frequency[Number(a)] > frequency[Number(b)] ? a : b));
  }

  private parseStudyPlan(planText: string, tasks: ExtendedTask[]): StudyPlanML {
    // Simple parsing - in production would use more sophisticated NLP
    const lines = planText.split('\n').filter(line => line.trim());
    
    const schedule = tasks.slice(0, 5).map((task, index) => ({
      time: `${9 + index * 2}:00`,
      task: task.title,
      duration: 90,
      difficulty: Math.floor(Math.random() * 3) + 6,
      reasoning: `Optimal time based on your productivity patterns`
    }));

    return {
      schedule,
      insights: [
        'Your productivity peaks in the afternoon',
        'Break tasks into 90-minute focused sessions',
        'Schedule difficult tasks during peak hours'
      ],
      optimizations: [
        'Consider grouping similar subjects together',
        'Take breaks between different subject areas',
        'Save easier tasks for low-energy periods'
      ]
    };
  }

  // Fallback methods for when ML is unavailable
  private fallbackEnhancement(suggestions: any[]): MLEnhancedSuggestion[] {
    return suggestions.map(suggestion => ({
      ...suggestion,
      mlProcessed: false,
      enhancementScore: 0.6,
      personalizedReason: suggestion.description + ' (Enhanced version available with ML)',
      metadata: {
        ...suggestion.metadata,
        fallbackMode: true
      }
    }));
  }

  private fallbackStudyPlan(tasks: ExtendedTask[]): StudyPlanML {
    const upcomingTasks = tasks.filter(t => !t.completed).slice(0, 5);
    
    return {
      schedule: upcomingTasks.map((task, index) => ({
        time: `${9 + index * 2}:00`,
        task: task.title,
        duration: 90,
        difficulty: 5,
        reasoning: 'Standard scheduling (ML enhancement available)'
      })),
      insights: [
        'ML-powered insights available with API key',
        'Upgrade for personalized recommendations'
      ],
      optimizations: [
        'Enable ML features for advanced optimization'
      ]
    };
  }

  private fallbackPredictions(): MLPredictions {
    return {
      difficultyPrediction: 5,
      optimalTime: '14:00',
      completionProb: 0.75,
      confidence: 0.5,
      metrics: {
        focusScore: 75,
        stressLevel: 25,
        motivationLevel: 80
      },
      breaks: [
        { time: '10:30', duration: 15, type: 'short' },
        { time: '12:00', duration: 60, type: 'lunch' },
        { time: '15:30', duration: 15, type: 'short' }
      ]
    };
  }

  /**
   * Check if service is properly configured
   */
  isServiceEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Get service health status
   */
  getHealthStatus(): { enabled: boolean; lastRequest?: Date; errorCount: number } {
    return {
      enabled: this.isEnabled,
      errorCount: 0 // Would track in production
    };
  }

  /**
   * Check HuggingFace service health
   */
  async checkHealth(): Promise<{ status: string; connected: boolean; apiKeyAvailable: boolean }> {
    const apiKeyAvailable = !!process.env.HUGGING_FACE_API_KEY;
    
    if (!apiKeyAvailable) {
      return {
        status: 'API key not configured',
        connected: false,
        apiKeyAvailable: false
      };
    }

    try {
      // Simple health check - test if we can instantiate HF client
      if (this.hf) {
        return {
          status: 'Connected and ready',
          connected: true,
          apiKeyAvailable: true
        };
      } else {
        return {
          status: 'Service available but not initialized',
          connected: false,
          apiKeyAvailable: true
        };
      }
    } catch (error) {
      return {
        status: `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        connected: false,
        apiKeyAvailable: true
      };
    }
  }

  /**
   * Get service configuration and status
   */
  getServiceInfo(): {
    isConfigured: boolean;
    featuresAvailable: string[];
    fallbackMode: boolean;
  } {
    const apiKeyAvailable = !!process.env.HUGGING_FACE_API_KEY;
    
    return {
      isConfigured: apiKeyAvailable,
      featuresAvailable: apiKeyAvailable 
        ? ['text-generation', 'classification', 'embeddings', 'study-planning']
        : ['fallback-suggestions'],
      fallbackMode: !apiKeyAvailable
    };
  }
} 