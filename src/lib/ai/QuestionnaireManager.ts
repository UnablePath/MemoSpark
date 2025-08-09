import { supabase as supabaseClient, createAuthenticatedSupabaseClient } from '@/lib/supabase/client';
import { consolidatedAIService } from './ConsolidatedAIService';
import { patternEngine } from './patternEngine';
import { updateUserMetadataAction } from '@/app/questionnaire/_actions';

// Types for questionnaire system  
export interface QuestionnaireQuestion {
  id: string;
  type: 'multiple_choice' | 'multiple_select' | 'slider' | 'time' | 'text' | 'rating';
  question: string;
  options?: string[];
  min?: number;
  max?: number;
  unit?: string;
  required: boolean;
  dependencies?: string[]; // Question IDs that this question depends on
}

export interface QuestionnaireTemplate {
  id: string;
  title: string;
  description?: string;
  category: 'onboarding' | 'preferences' | 'schedule' | 'habits' | 'stress';
  questions: QuestionnaireQuestion[];
  version: number;
  is_active: boolean;
  order_priority: number;
}

export interface QuestionnaireResponse {
  id: string;
  user_id: string;
  template_id: string;
  responses: Record<string, any>;
  completion_status: 'in_progress' | 'completed' | 'abandoned';
  completion_percentage: number;
  started_at: string;
  completed_at?: string;
  updated_at: string;
}

export interface UserAIPatterns {
  id: string;
  user_id: string;
  
  // Schedule patterns
  preferred_study_times?: string[];
  productivity_peaks?: string[];
  break_preferences?: {
    frequency: string;
    duration: number;
    activities: string[];
  };
  
  // Learning patterns
  learning_style?: string;
  attention_span?: number;
  difficulty_preference?: string;
  
  // Stress and wellness patterns
  stress_triggers?: string[];
  stress_relief_preferences?: string[];
  motivation_factors?: string[];
  
  // Task management patterns
  task_completion_style?: string;
  deadline_pressure_response?: string;
  collaboration_preference?: string;
  
  // Notification preferences
  notification_timing?: string[];
  reminder_frequency?: string;
  
  // Confidence scores
  pattern_confidence?: Record<string, number>;
  
  // Metadata
  last_analyzed_at: string;
  data_sources: string[];
  analysis_version: number;
}

export class QuestionnaireManager {
  private supabase: any;
  private publicSupabase: any;
  private aiService = consolidatedAIService;
  private patternEngine = patternEngine;

  constructor(getToken?: () => Promise<string | null>) {
    this.supabase = createAuthenticatedSupabaseClient(getToken);
    this.publicSupabase = supabaseClient; // For public template queries
  }

  /**
   * Get all active questionnaire templates
   */
  async getActiveTemplates(): Promise<QuestionnaireTemplate[]> {
    try {
      console.log('Fetching active questionnaire templates...');
      
      if (!this.publicSupabase) {
        console.error('Public Supabase client not initialized');
        throw new Error('Database connection not available');
      }

      const { data, error } = await this.publicSupabase
        .from('questionnaire_templates')
        .select('*')
        .eq('is_active', true)
        .order('order_priority', { ascending: true });

      console.log('Supabase query result:', { data, error });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      if (!data) {
        return [];
      }

      const templates = data.map((template: Omit<QuestionnaireTemplate, 'questions'> & { questions: string }) => ({
        ...template,
        questions: typeof template.questions === 'string' 
          ? JSON.parse(template.questions)
          : template.questions
      }));
      
      console.log('Processed templates:', templates);
      return templates;
    } catch (err: any) {
      console.error('Error fetching questionnaire templates:', {
        message: err.message,
        details: err.details,
        code: err.code,
        fullError: err
      });
      throw err;
    }
  }

  /**
   * Get a specific questionnaire template
   */
  async getTemplate(templateId: string): Promise<QuestionnaireTemplate | null> {
    try {
      // Use public client for template reads to avoid any RLS restrictions for end users
      const { data, error } = await this.publicSupabase
        .from('questionnaire_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error || !data) return null;
      
      return {
        ...data,
        questions: typeof data.questions === 'string' 
          ? JSON.parse(data.questions) 
          : data.questions
      };
    } catch (err: any) {
      console.error('Error fetching questionnaire template:', {
        message: err.message,
        details: err.details,
        code: err.code,
        fullError: err
      });
      return null;
    }
  }

  /**
   * Start a new questionnaire response
   */
  async startQuestionnaire(userId: string, templateId: string): Promise<QuestionnaireResponse> {
    try {
      const { data, error } = await this.supabase
        .from('user_questionnaire_responses')
        .upsert({
          user_id: userId,
          template_id: templateId,
          responses: {},
          completion_status: 'in_progress',
          completion_percentage: 0,
          started_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,template_id'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err: any) {
      console.error('Error starting questionnaire:', {
        message: err.message,
        details: err.details,
        code: err.code,
        fullError: err
      });
      throw err;
    }
  }

  /**
   * Update questionnaire response with new answers
   */
  async updateResponse(
    userId: string, 
    templateId: string, 
    allAnswers: Record<string, any>
  ): Promise<QuestionnaireResponse> {
    try {
      // Calculate completion percentage
      const template = await this.getTemplate(templateId);
      if (!template) throw new Error('Template not found');

      const requiredQuestions = template.questions.filter(q => q.required);
      const answeredRequired = requiredQuestions.filter(q => 
        allAnswers[q.id] !== undefined && allAnswers[q.id] !== null && allAnswers[q.id] !== ''
      );
      const completionPercentage = requiredQuestions.length > 0 
        ? (answeredRequired.length / requiredQuestions.length) * 100 
        : 100;

      // Update in database
      const { data, error } = await this.supabase
        .from('user_questionnaire_responses')
        .update({
          responses: allAnswers,
          completion_percentage: completionPercentage,
          completion_status: completionPercentage >= 100 ? 'completed' : 'in_progress',
          completed_at: completionPercentage >= 100 ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('template_id', templateId)
        .select()
        .single();

      if (error) throw error;

      // If completed, trigger pattern analysis and update user metadata
      if (completionPercentage >= 100) {
        await this.analyzeUserPatterns(userId);
        
        // Update Clerk public metadata
        await updateUserMetadataAction(userId, { questionnaireCompleted: true });
      }

      return data;
    } catch (err: any) {
      console.error('Error updating questionnaire response:', {
        message: err.message,
        details: err.details,
        code: err.code,
        fullError: err
      });
      throw err;
    }
  }

  /**
   * Get user's questionnaire responses
   */
  async getUserResponses(userId: string): Promise<QuestionnaireResponse[]> {
    try {
      const { data, error } = await this.supabase
        .from('user_questionnaire_responses')
        .select('*')
        .eq('user_id', userId)
        .order('started_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err: any) {
      console.error('Error fetching user responses:', {
        message: err.message,
        details: err.details,
        code: err.code,
        fullError: err
      });
      throw err;
    }
  }

  /**
   * Get user's response for a specific template
   */
  async getUserResponse(userId: string, templateId: string): Promise<QuestionnaireResponse | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_questionnaire_responses')
        .select('*')
        .eq('user_id', userId)
        .eq('template_id', templateId)
        .single();

      if (error || !data) return null;
      return data;
    } catch (err: any) {
      console.error('Error fetching user response:', {
        message: err.message,
        details: err.details,
        code: err.code,
        fullError: err
      });
      throw err;
    }
  }

  /**
   * Analyze user patterns from questionnaire responses
   */
  async analyzeUserPatterns(userId: string): Promise<UserAIPatterns> {
    try {
      // Get all user responses
      const responses = await this.getUserResponses(userId);
      const completedResponses = responses.filter(r => r.completion_status === 'completed');

      if (completedResponses.length === 0) {
        throw new Error('No completed questionnaires found for pattern analysis');
      }

      // Initialize pattern analysis
      const patterns: Partial<UserAIPatterns> = {
        user_id: userId,
        data_sources: completedResponses.map(r => r.template_id),
        analysis_version: 1,
        last_analyzed_at: new Date().toISOString(),
        pattern_confidence: {}
      };

      // Analyze each response category
      for (const response of completedResponses) {
        const template = await this.getTemplate(response.template_id);
        if (!template) continue;

        this.analyzeResponseByCategory(template.category, response.responses, patterns);
      }

      // Calculate confidence scores
      this.calculatePatternConfidence(patterns, completedResponses.length);

      // Save to database
      const { data, error } = await this.supabase
        .from('user_ai_patterns')
        .upsert(patterns, {
          onConflict: 'user_id'
        })
        .select()
        .single();

      if (error) throw error;

      // Update AI service with new patterns
      await this.updateAIServicePatterns(userId, data);

      return data;
    } catch (err: any) {
      console.error('Error analyzing user patterns:', {
        message: err.message,
        details: err.details,
        code: err.code,
        fullError: err
      });
      throw err;
    }
  }

  /**
   * Analyze response by category
   */
  private analyzeResponseByCategory(
    category: string, 
    responses: Record<string, any>, 
    patterns: Partial<UserAIPatterns>
  ): void {
    switch (category) {
      case 'preferences':
        this.analyzePreferences(responses, patterns);
        break;
      case 'schedule':
        this.analyzeSchedule(responses, patterns);
        break;
      case 'stress':
        this.analyzeStress(responses, patterns);
        break;
    }
  }

  /**
   * Analyze preferences responses
   */
  private analyzePreferences(responses: Record<string, any>, patterns: Partial<UserAIPatterns>): void {
    if (responses.study_time_preference) {
      patterns.preferred_study_times = [responses.study_time_preference];
    }
    
    if (responses.study_duration) {
      patterns.attention_span = parseInt(responses.study_duration);
    }
    
    if (responses.learning_style) {
      patterns.learning_style = responses.learning_style.toLowerCase();
    }
    
    if (responses.difficulty_approach) {
      patterns.difficulty_preference = this.mapDifficultyPreference(responses.difficulty_approach);
    }
    
    if (responses.collaboration_style) {
      patterns.collaboration_preference = this.mapCollaborationPreference(responses.collaboration_style);
    }
  }

  /**
   * Analyze schedule responses
   */
  private analyzeSchedule(responses: Record<string, any>, patterns: Partial<UserAIPatterns>): void {
    if (responses.break_frequency && responses.break_activities) {
      patterns.break_preferences = {
        frequency: responses.break_frequency,
        duration: this.mapBreakDuration(responses.break_frequency),
        activities: Array.isArray(responses.break_activities) 
          ? responses.break_activities 
          : [responses.break_activities]
      };
    }
    
    if (responses.deadline_behavior) {
      patterns.deadline_pressure_response = this.mapDeadlineBehavior(responses.deadline_behavior);
    }
    
    // Determine productivity peaks from wake/sleep times
    if (responses.wake_time && responses.sleep_time) {
      patterns.productivity_peaks = this.calculateProductivityPeaks(
        responses.wake_time, 
        responses.sleep_time
      );
    }
  }

  /**
   * Analyze stress responses
   */
  private analyzeStress(responses: Record<string, any>, patterns: Partial<UserAIPatterns>): void {
    if (responses.stress_triggers) {
      patterns.stress_triggers = Array.isArray(responses.stress_triggers) 
        ? responses.stress_triggers 
        : [responses.stress_triggers];
    }
    
    if (responses.stress_relief) {
      patterns.stress_relief_preferences = Array.isArray(responses.stress_relief) 
        ? responses.stress_relief 
        : [responses.stress_relief];
    }
    
    if (responses.motivation_factors) {
      patterns.motivation_factors = Array.isArray(responses.motivation_factors) 
        ? responses.motivation_factors 
        : [responses.motivation_factors];
    }
  }

  /**
   * Calculate pattern confidence scores
   */
  private calculatePatternConfidence(patterns: Partial<UserAIPatterns>, responseCount: number): void {
    const baseConfidence = Math.min(responseCount * 0.3, 0.9); // Max 90% confidence
    
    patterns.pattern_confidence = {
      schedule: patterns.preferred_study_times ? baseConfidence : 0,
      learning: patterns.learning_style ? baseConfidence : 0,
      stress: patterns.stress_triggers ? baseConfidence : 0,
      collaboration: patterns.collaboration_preference ? baseConfidence : 0,
      breaks: patterns.break_preferences ? baseConfidence : 0
    };
  }

  /**
   * Update AI service with new patterns
   */
  private async updateAIServicePatterns(userId: string, patterns: UserAIPatterns): Promise<void> {
    try {
      // Update the pattern engine with new user data
      await this.patternEngine.updateUserPatterns(userId, {
        studyPatterns: {
          preferredTimes: patterns.preferred_study_times || [],
          attentionSpan: patterns.attention_span || 60,
          learningStyle: patterns.learning_style || 'mixed'
        },
        stressPatterns: {
          triggers: patterns.stress_triggers || [],
          reliefMethods: patterns.stress_relief_preferences || []
        },
        collaborationPreference: patterns.collaboration_preference || 'mixed'
      });
    } catch (err: any) {
      console.error('Error in updateAIServicePatterns:', {
        message: err.message,
        details: err.details,
        code: err.code,
        fullError: err
      });
    }
  }

  /**
   * Get user's AI patterns
   */
  async getUserPatterns(userId: string): Promise<UserAIPatterns | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_ai_patterns')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error || !data) return null;
      return data;
    } catch (err: any) {
      console.error('Error getting user patterns:', {
        message: err.message,
        details: err.details,
        code: err.code,
        fullError: err
      });
      return null;
    }
  }

  /**
   * Get next recommended questionnaire for user
   */
  async getNextRecommendedQuestionnaire(userId: string): Promise<QuestionnaireTemplate | null> {
    try {
      console.log('Getting next recommended questionnaire for user:', userId);
      
      // First, get all active templates
      const allTemplates = await this.getActiveTemplates();
      console.log('All active templates:', allTemplates);
      
      if (allTemplates.length === 0) {
        console.log('No active templates found');
        return null;
      }

      // Get user responses (might be empty for new users)
      let userResponses: QuestionnaireResponse[] = [];
      try {
        userResponses = await this.getUserResponses(userId);
        console.log('User responses:', userResponses);
      } catch (error) {
        console.log('No existing responses found (new user):', error);
        // This is fine for new users - they'll have no responses
      }

      // Find completed questionnaire IDs
      const completedTemplateIds = userResponses
        .filter(r => r.completion_status === 'completed')
        .map(r => r.template_id);
      
      console.log('Completed template IDs:', completedTemplateIds);

      // Find incomplete templates
      const incompleteTemplates = allTemplates.filter(
        t => !completedTemplateIds.includes(t.id)
      );
      
      console.log('Incomplete templates:', incompleteTemplates);

      // Return the first incomplete template (sorted by priority)
      const nextTemplate = incompleteTemplates.length > 0 ? incompleteTemplates[0] : null;
      console.log('Next recommended template:', nextTemplate);
      
      return nextTemplate;
    } catch (err: any) {
      console.error('Error in getNextRecommendedQuestionnaire:', {
        message: err.message,
        details: err.details,
        code: err.code,
        fullError: err
      });
      return null;
    }
  }

  // Helper methods for mapping responses
  private mapDifficultyPreference(response: string): string {
    if (response.includes('easy')) return 'easy_to_hard';
    if (response.includes('hard')) return 'hard_first';
    if (response.includes('mix')) return 'mixed';
    if (response.includes('smaller')) return 'break_down';
    return 'mixed';
  }

  private mapCollaborationPreference(response: string): string {
    if (response.includes('alone')) return 'solo';
    if (response.includes('group')) return 'group';
    return 'mixed';
  }

  private mapBreakDuration(frequency: string): number {
    if (frequency.includes('15-20')) return 15;
    if (frequency.includes('30-45')) return 30;
    if (frequency.includes('hour')) return 60;
    if (frequency.includes('2 hours')) return 120;
    return 30;
  }

  private mapDeadlineBehavior(response: string): string {
    if (response.includes('immediately')) return 'thrives';
    if (response.includes('plenty')) return 'thrives';
    if (response.includes('last minute')) return 'struggles';
    if (response.includes('close')) return 'struggles';
    return 'balanced';
  }

  private calculateProductivityPeaks(wakeTime: string, sleepTime: string): string[] {
    // Simple algorithm to determine productivity peaks based on sleep schedule
    const wake = parseInt(wakeTime.split(':')[0]);
    const peaks: string[] = [];
    
    // Morning peak (2-4 hours after waking)
    const morningPeak = (wake + 3) % 24;
    if (morningPeak >= 6 && morningPeak <= 12) {
      peaks.push('morning');
    }
    
    // Afternoon peak (6-8 hours after waking)
    const afternoonPeak = (wake + 7) % 24;
    if (afternoonPeak >= 13 && afternoonPeak <= 18) {
      peaks.push('afternoon');
    }
    
    // Evening peak (if wake time is early)
    if (wake <= 7) {
      peaks.push('evening');
    }
    
    return peaks.length > 0 ? peaks : ['morning', 'afternoon'];
  }
}

export default QuestionnaireManager; 