/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Types for ML inference
interface MLRequest {
  userVector: number[];
  contextData: {
    recentTasks: any[];
    currentTime: string;
    preferences: any;
  };
  requestType: 'similarity' | 'recommendation' | 'prediction';
}

interface MLResponse {
  suggestions: any[];
  confidence: number;
  reasoning: string;
  processingTime: number;
}

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;
const requestCounts = new Map<string, { count: number; resetTime: number }>();

// Simple in-memory cache for frequent requests
const responseCache = new Map<string, { response: MLResponse; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Rate limiting middleware
 */
function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const clientData = requestCounts.get(clientId);

  if (!clientData || now > clientData.resetTime) {
    requestCounts.set(clientId, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    });
    return true;
  }

  if (clientData.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  clientData.count++;
  return true;
}

/**
 * Generate cache key for request
 */
function generateCacheKey(request: MLRequest): string {
  // Create a simple hash of the request for caching
  const key = JSON.stringify({
    type: request.requestType,
    vector: request.userVector.slice(0, 10), // First 10 dimensions
    preferences: request.contextData.preferences?.difficultyPreference
  });
  return btoa(key).slice(0, 16);
}

/**
 * Vector similarity calculation
 */
function calculateSimilarity(vector1: number[], vector2: number[]): number {
  if (vector1.length !== vector2.length) return 0;

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < vector1.length; i++) {
    dotProduct += vector1[i] * vector2[i];
    norm1 += vector1[i] * vector1[i];
    norm2 += vector2[i] * vector2[i];
  }

  const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

/**
 * Get collaborative insights from database
 */
async function getCollaborativeInsights(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('ai_collaborative_insights')
      .select('*')
      .eq('is_active', true)
      .gte('relevance_score', 0.5)
      .order('relevance_score', { ascending: false })
      .limit(5);

    if (error) {
      console.error('Error fetching insights:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Failed to fetch collaborative insights:', error);
    return [];
  }
}

/**
 * Enhanced ML inference with database integration
 */
async function generateStudyRecommendations(request: MLRequest): Promise<any[]> {
  const { userVector, contextData, requestType } = request;
  const preferences = contextData.preferences;
  const suggestions: any[] = [];

  // Extract features from user vector
  const studyTimePrefs = userVector.slice(0, 24); // First 24 dimensions
  const preferredHours = studyTimePrefs
    .map((value, index) => ({ hour: index, preference: value }))
    .filter(item => item.preference > 0.5)
    .map(item => item.hour);

  const currentHour = new Date(contextData.currentTime).getHours();

  // Get collaborative insights from database
  const collaborativeInsights = await getCollaborativeInsights();

  // Incorporate collaborative insights into suggestions
  collaborativeInsights.forEach(insight => {
    if (insight.insight_type === 'optimal_schedules') {
      const data = insight.insight_data;
      const isOptimalTime = data.recommendedTimes?.some((timeRange: string) => {
        const [start] = timeRange.split('-')[0].split(':');
        const startHour = parseInt(start);
        return Math.abs(currentHour - startHour) <= 1;
      });

      if (isOptimalTime) {
        suggestions.push({
          id: `collab_schedule_${Date.now()}`,
          type: 'study_time',
          title: 'Optimal Study Time - Community Insight',
          description: data.description || 'Based on successful patterns from similar learners',
          priority: 'high',
          confidence: insight.relevance_score,
          reasoning: 'Collaborative filtering from community data',
          suggestedTime: new Date().toISOString(),
          duration: data.avgSessionLength || 60,
          metadata: {
            category: 'productivity',
            tags: ['collaborative', 'optimal-timing'],
            difficulty: 5,
            estimatedBenefit: insight.relevance_score,
            requiredAction: 'scheduled',
            source: 'collaborative_insights'
          },
          acceptanceStatus: 'pending',
          createdAt: new Date().toISOString()
        });
      }
    }

    if (insight.insight_type === 'difficulty_progression') {
      const data = insight.insight_data;
      suggestions.push({
        id: `collab_difficulty_${Date.now()}`,
        type: 'difficulty_adjustment',
        title: 'Optimize Task Difficulty - Community Insight',
        description: data.description || 'Gradual difficulty progression improves learning',
        priority: 'medium',
        confidence: insight.relevance_score,
        reasoning: 'Based on successful learning patterns from community',
        metadata: {
          category: 'academic',
          tags: ['collaborative', 'difficulty', 'progression'],
          estimatedBenefit: insight.relevance_score,
          requiredAction: 'optional',
          recommendedSteps: data.recommendedSteps,
          source: 'collaborative_insights'
        },
        acceptanceStatus: 'pending',
        createdAt: new Date().toISOString()
      });
    }
  });

  // Time-based recommendations (existing logic)
  if (requestType === 'recommendation' || requestType === 'prediction') {
    // Study session recommendation
    if (preferredHours.includes(currentHour) || preferredHours.includes(currentHour + 1)) {
      suggestions.push({
        id: `ml_study_${Date.now()}`,
        type: 'study_time',
        title: 'Optimal Study Time Detected',
        description: 'Based on your patterns, now is a great time for a focused study session.',
        priority: 'high',
        confidence: 0.85,
        reasoning: 'Your productivity patterns indicate high focus during this time',
        suggestedTime: new Date().toISOString(),
        duration: preferences?.preferredStudyDuration || 60,
        metadata: {
          category: 'productivity',
          tags: ['optimal-timing', 'focus'],
          difficulty: 5,
          estimatedBenefit: 0.8,
          requiredAction: 'scheduled',
          source: 'ml_inference'
        },
        acceptanceStatus: 'pending',
        createdAt: new Date().toISOString()
      });
    }

    // Break recommendation
    const lastActivityHour = currentHour - 1;
    if (preferredHours.includes(lastActivityHour)) {
      suggestions.push({
        id: `ml_break_${Date.now()}`,
        type: 'break_reminder',
        title: 'Take a Strategic Break',
        description: 'You\'ve been in a productive zone. A short break will help maintain focus.',
        priority: 'medium',
        confidence: 0.7,
        reasoning: 'Productivity patterns suggest break timing for sustained performance',
        duration: preferences?.preferredBreakDuration || 15,
        metadata: {
          category: 'wellness',
          tags: ['break', 'sustained-focus'],
          estimatedBenefit: 0.6,
          requiredAction: 'immediate',
          source: 'ml_inference'
        },
        acceptanceStatus: 'pending',
        createdAt: new Date().toISOString()
      });
    }

    // Subject focus recommendation
    if (contextData.recentTasks && contextData.recentTasks.length > 0) {
      const subjectCounts: Record<string, number> = {};
      contextData.recentTasks.forEach((task: any) => {
        if (task.subject) {
          subjectCounts[task.subject] = (subjectCounts[task.subject] || 0) + 1;
        }
      });

      const leastStudiedSubject = Object.entries(subjectCounts)
        .sort(([, a], [, b]) => a - b)[0];

      if (leastStudiedSubject) {
        suggestions.push({
          id: `ml_subject_${Date.now()}`,
          type: 'subject_focus',
          title: `Focus on ${leastStudiedSubject[0]}`,
          description: 'Balance your study schedule by giving attention to this subject.',
          priority: 'medium',
          confidence: 0.65,
          reasoning: 'Subject distribution analysis suggests rebalancing',
          subject: leastStudiedSubject[0],
          metadata: {
            category: 'academic',
            tags: ['subject-balance', 'planning'],
            estimatedBenefit: 0.7,
            requiredAction: 'scheduled',
            source: 'ml_inference'
          },
          acceptanceStatus: 'pending',
          createdAt: new Date().toISOString()
        });
      }
    }
  }

  // Difficulty adjustment recommendations
  if (preferences?.adaptiveDifficulty) {
    const difficultyLevel = preferences.difficultyPreference === 'challenging' ? 7 :
                           preferences.difficultyPreference === 'adaptive' ? 5 : 3;

    suggestions.push({
      id: `ml_difficulty_${Date.now()}`,
      type: 'difficulty_adjustment',
      title: 'Optimize Task Difficulty',
      description: `Consider tasks at level ${difficultyLevel + 1} to maintain growth.`,
      priority: 'low',
      confidence: 0.6,
      reasoning: 'Adaptive difficulty progression based on preferences',
      metadata: {
        category: 'academic',
        tags: ['difficulty', 'progression'],
        difficulty: difficultyLevel + 1,
        estimatedBenefit: 0.5,
        requiredAction: 'optional',
        source: 'ml_inference'
      },
      acceptanceStatus: 'pending',
      createdAt: new Date().toISOString()
    });
  }

  return suggestions;
}

/**
 * Main handler function
 */
Deno.serve(async (req: Request) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  const startTime = Date.now();

  try {
    // Parse request body
    const request: MLRequest = await req.json();

    // Validate request
    if (!request.userVector || !Array.isArray(request.userVector)) {
      return new Response(
        JSON.stringify({ error: 'Invalid user vector' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get client identifier for rate limiting
    const clientId = req.headers.get('x-client-info') || 
                     req.headers.get('user-agent') || 
                     'anonymous';

    // Check rate limit
    if (!checkRateLimit(clientId)) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check cache
    const cacheKey = generateCacheKey(request);
    const cached = responseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('Returning cached response');
      return new Response(
        JSON.stringify(cached.response),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Generate ML recommendations
    const suggestions = await generateStudyRecommendations(request);
    
    // Calculate overall confidence based on data quality
    const dataQualityScore = Math.min(
      (request.contextData.recentTasks?.length || 0) / 10, // Recent activity
      1
    );
    const overallConfidence = Math.max(0.3, dataQualityScore * 0.8);

    const response: MLResponse = {
      suggestions,
      confidence: overallConfidence,
      reasoning: `Generated ${suggestions.length} recommendations based on temporal patterns, user preferences, recent activity, and collaborative insights from the community.`,
      processingTime: Date.now() - startTime
    };

    // Cache the response
    responseCache.set(cacheKey, {
      response,
      timestamp: Date.now()
    });

    // Clean up old cache entries periodically
    if (responseCache.size > 100) {
      const now = Date.now();
      for (const [key, value] of responseCache.entries()) {
        if (now - value.timestamp > CACHE_DURATION) {
          responseCache.delete(key);
        }
      }
    }

    console.log(`ML inference completed in ${response.processingTime}ms`);

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('ML inference error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        processingTime: Date.now() - startTime
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}); 