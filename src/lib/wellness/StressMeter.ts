import { createAuthenticatedSupabaseClient } from '@/lib/supabase/client';
import { useAuth } from '@clerk/nextjs';

export interface StressReading {
  id: string;
  userId: string;
  stressLevel: number;
  stressFactors: string[];
  context: Record<string, any>;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StressIntervention {
  id: string;
  userId: string;
  stressReadingId: string;
  interventionType: string;
  interventionData: Record<string, any>;
  effectivenessRating?: number;
  durationMinutes?: number;
  completed: boolean;
  startedAt: string;
  completedAt?: string;
}

export interface StressPattern {
  id: string;
  userId: string;
  patternType: string;
  patternData: Record<string, any>;
  confidenceScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface WellnessRecommendation {
  id: string;
  userId: string;
  recommendationType: string;
  title: string;
  description: string;
  actionData: Record<string, any>;
  priority: number;
  dismissed: boolean;
  createdAt: string;
  expiresAt?: string;
}

export interface StressAnalytics {
  date: string;
  avgStressLevel: number;
  minStressLevel: number;
  maxStressLevel: number;
  readingCount: number;
  interventionCount: number;
  avgInterventionEffectiveness: number;
}

export interface PredictiveInsight {
  type: 'stress_spike' | 'stress_trend' | 'intervention_recommendation' | 'pattern_alert';
  title: string;
  description: string;
  confidence: number;
  actionable: boolean;
  suggestedActions: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class StressMeter {
  private getSupabaseClient() {
    return createAuthenticatedSupabaseClient();
  }
  
  // Core stress tracking methods
  async recordStressLevel(
    stressLevel: number,
    stressFactors: string[] = [],
    context: Record<string, any> = {},
    notes?: string
  ): Promise<StressReading | null> {
    try {
      const supabase = this.getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not available');

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('stress_tracking')
        .insert({
          user_id: user.user.id,
          stress_level: stressLevel,
          stress_factors: stressFactors,
          context,
          notes
        })
        .select()
        .single();

      if (error) throw error;

      // Generate recommendations after recording stress
      await this.generateRecommendations();
      
      return this.mapStressReading(data);
    } catch (error) {
      console.error('Error recording stress level:', error);
      return null;
    }
  }

  async getRecentStressReadings(limit: number = 10): Promise<StressReading[]> {
    try {
      const supabase = this.getSupabaseClient();
      if (!supabase) return [];

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];

      const { data, error } = await supabase
        .from('stress_tracking')
        .select('*')
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data.map(this.mapStressReading);
    } catch (error) {
      console.error('Error fetching recent stress readings:', error);
      return [];
    }
  }

  async getCurrentStressLevel(): Promise<number | null> {
    try {
      const supabase = this.getSupabaseClient();
      if (!supabase) return null;

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return null;

      const { data, error } = await supabase
        .from('stress_tracking')
        .select('stress_level')
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data?.stress_level || null;
    } catch (error) {
      console.error('Error getting current stress level:', error);
      return null;
    }
  }

  // Stress intervention methods
  async startIntervention(
    stressReadingId: string,
    interventionType: string,
    interventionData: Record<string, any> = {}
  ): Promise<StressIntervention | null> {
    try {
      const supabase = this.getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not available');

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('stress_interventions')
        .insert({
          user_id: user.user.id,
          stress_reading_id: stressReadingId,
          intervention_type: interventionType,
          intervention_data: interventionData
        })
        .select()
        .single();

      if (error) throw error;
      return this.mapStressIntervention(data);
    } catch (error) {
      console.error('Error starting intervention:', error);
      return null;
    }
  }

  async completeIntervention(
    interventionId: string,
    effectivenessRating: number,
    durationMinutes?: number
  ): Promise<boolean> {
    try {
      const supabase = this.getSupabaseClient();
      if (!supabase) return false;

      const { error } = await supabase
        .from('stress_interventions')
        .update({
          completed: true,
          effectiveness_rating: effectivenessRating,
          duration_minutes: durationMinutes,
          completed_at: new Date().toISOString()
        })
        .eq('id', interventionId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error completing intervention:', error);
      return false;
    }
  }

  // Predictive analytics methods
  async generatePredictiveInsights(): Promise<PredictiveInsight[]> {
    try {
      const recentReadings = await this.getRecentStressReadings(20);
      const insights: PredictiveInsight[] = [];

      // Analyze trends
      if (recentReadings.length >= 5) {
        const trendInsight = this.analyzeTrend(recentReadings);
        if (trendInsight) insights.push(trendInsight);
      }

      // Check for stress spikes
      const spikeInsight = this.detectStressSpikes(recentReadings);
      if (spikeInsight) insights.push(spikeInsight);

      // Generate intervention recommendations
      const interventionInsight = await this.generateInterventionRecommendations(recentReadings);
      if (interventionInsight) insights.push(interventionInsight);

      return insights.sort((a, b) => this.getSeverityWeight(b.severity) - this.getSeverityWeight(a.severity));
    } catch (error) {
      console.error('Error generating predictive insights:', error);
      return [];
    }
  }

  private analyzeTrend(readings: StressReading[]): PredictiveInsight | null {
    if (readings.length < 5) return null;

    const recent5 = readings.slice(0, 5);
    const previous5 = readings.slice(5, 10);

    const recentAvg = recent5.reduce((sum, r) => sum + r.stressLevel, 0) / recent5.length;
    const previousAvg = previous5.length > 0 
      ? previous5.reduce((sum, r) => sum + r.stressLevel, 0) / previous5.length 
      : recentAvg;

    const trendChange = recentAvg - previousAvg;
    const trendPercentage = Math.abs(trendChange / previousAvg) * 100;

    if (trendPercentage < 10) return null; // No significant trend

    if (trendChange > 0) {
      return {
        type: 'stress_trend',
        title: 'Rising Stress Trend Detected',
        description: `Your stress levels have increased by ${trendPercentage.toFixed(1)}% recently.`,
        confidence: Math.min(trendPercentage / 30, 1),
        actionable: true,
        suggestedActions: [
          'Schedule more breaks',
          'Review current workload',
          'Practice stress relief techniques'
        ],
        severity: trendPercentage > 25 ? 'high' : trendPercentage > 15 ? 'medium' : 'low'
      };
    } else {
      return {
        type: 'stress_trend',
        title: 'Improving Stress Trend',
        description: `Great! Your stress levels have decreased by ${trendPercentage.toFixed(1)}% recently.`,
        confidence: Math.min(trendPercentage / 30, 1),
        actionable: false,
        suggestedActions: [
          'Keep up the good work',
          'Maintain current strategies'
        ],
        severity: 'low'
      };
    }
  }

  private detectStressSpikes(readings: StressReading[]): PredictiveInsight | null {
    if (readings.length < 3) return null;

    const recent3 = readings.slice(0, 3);
    const recentHigh = recent3.filter(r => r.stressLevel > 70);

    if (recentHigh.length >= 2) {
      return {
        type: 'stress_spike',
        title: 'High Stress Episodes Detected',
        description: `You've had ${recentHigh.length} high stress readings recently.`,
        confidence: 0.8,
        actionable: true,
        suggestedActions: [
          'Take immediate stress relief action',
          'Use the ragdoll game for quick relief',
          'Practice breathing exercises'
        ],
        severity: 'high'
      };
    }

    const currentStress = readings[0]?.stressLevel || 0;
    if (currentStress > 85) {
      return {
        type: 'stress_spike',
        title: 'Critical Stress Level',
        description: 'Your current stress level is very high. Immediate intervention recommended.',
        confidence: 1.0,
        actionable: true,
        suggestedActions: [
          'Stop current activity',
          'Take deep breaths',
          'Use stress relief tools'
        ],
        severity: 'critical'
      };
    }

    return null;
  }

  private async generateInterventionRecommendations(readings: StressReading[]): Promise<PredictiveInsight | null> {
    if (readings.length === 0) return null;

    const currentStress = readings[0].stressLevel;
    
    if (currentStress < 40) return null;

    let recommendedInterventions: string[] = [];
    
    if (currentStress > 70) {
      recommendedInterventions = [
        'Play the ragdoll stress game',
        'Take a 5-minute breathing break',
        'Write in your stress journal'
      ];
    } else {
      recommendedInterventions = [
        'Take a short break',
        'Do a quick breathing exercise',
        'Listen to calming music'
      ];
    }

    return {
      type: 'intervention_recommendation',
      title: 'Recommended Stress Relief',
      description: `Based on your current stress level (${currentStress}), here are some recommendations.`,
      confidence: 0.7,
      actionable: true,
      suggestedActions: recommendedInterventions,
      severity: currentStress > 70 ? 'medium' : 'low'
    };
  }

  private getSeverityWeight(severity: string): number {
    const weights = { critical: 4, high: 3, medium: 2, low: 1 };
    return weights[severity as keyof typeof weights] || 0;
  }

  // Wellness recommendations
  async getWellnessRecommendations(): Promise<WellnessRecommendation[]> {
    try {
      const supabase = this.getSupabaseClient();
      if (!supabase) return [];

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];

      const { data, error } = await supabase
        .from('wellness_recommendations')
        .select('*')
        .eq('user_id', user.user.id)
        .eq('dismissed', false)
        .order('priority', { ascending: false });

      if (error) throw error;
      return data.map(this.mapWellnessRecommendation);
    } catch (error) {
      console.error('Error fetching wellness recommendations:', error);
      return [];
    }
  }

  async dismissRecommendation(recommendationId: string): Promise<boolean> {
    try {
      const supabase = this.getSupabaseClient();
      if (!supabase) return false;

      const { error } = await supabase
        .from('wellness_recommendations')
        .update({ dismissed: true })
        .eq('id', recommendationId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error dismissing recommendation:', error);
      return false;
    }
  }

  private async generateRecommendations(): Promise<void> {
    try {
      const supabase = this.getSupabaseClient();
      if (!supabase) return;

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      await supabase.rpc('generate_wellness_recommendations', {
        target_user_id: user.user.id
      });
    } catch (error) {
      console.error('Error generating recommendations:', error);
    }
  }

  // Mapping functions
  private mapStressReading(data: any): StressReading {
    return {
      id: data.id,
      userId: data.user_id,
      stressLevel: data.stress_level,
      stressFactors: data.stress_factors || [],
      context: data.context || {},
      notes: data.notes,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  private mapStressIntervention(data: any): StressIntervention {
    return {
      id: data.id,
      userId: data.user_id,
      stressReadingId: data.stress_reading_id,
      interventionType: data.intervention_type,
      interventionData: data.intervention_data || {},
      effectivenessRating: data.effectiveness_rating,
      durationMinutes: data.duration_minutes,
      completed: data.completed,
      startedAt: data.started_at,
      completedAt: data.completed_at
    };
  }

  private mapWellnessRecommendation(data: any): WellnessRecommendation {
    return {
      id: data.id,
      userId: data.user_id,
      recommendationType: data.recommendation_type,
      title: data.title,
      description: data.description,
      actionData: data.action_data || {},
      priority: data.priority,
      dismissed: data.dismissed,
      createdAt: data.created_at,
      expiresAt: data.expires_at
    };
  }
}

// Export singleton instance
export const stressMeter = new StressMeter(); 