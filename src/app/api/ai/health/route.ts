import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { HuggingFaceService } from '@/lib/ai/HuggingFaceService';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    // Basic auth check
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const healthStatus = {
      timestamp: new Date().toISOString(),
      userId,
      services: {
        huggingFace: {
          configured: false,
          connected: false,
          error: null as string | null,
          features: [] as string[]
        },
        supabaseAI: {
          configured: false,
          connected: false,
          error: null as string | null,
          edgeFunctions: false
        },
        aiEndpoints: {
          suggestions: true,
          health: true,
          configured: false
        }
      },
      environment: {
        huggingFaceApiKey: !!process.env.HUGGINGFACE_API_KEY,
        supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        developmentMode: process.env.NODE_ENV === 'development'
      },
      recommendations: [] as string[]
    };

    // Test Hugging Face Service
    try {
      const hfService = new HuggingFaceService();
      const hfHealth = await hfService.checkHealth();
      
      healthStatus.services.huggingFace = {
        configured: hfHealth.apiKeyAvailable,
        connected: hfHealth.connected,
        error: hfHealth.connected ? null : hfHealth.status,
        features: hfHealth.connected ? ['text-generation', 'embeddings', 'classification'] : []
      };

      if (!hfHealth.apiKeyAvailable) {
        healthStatus.recommendations.push('Add HUGGINGFACE_API_KEY to environment variables for ML features');
      }
    } catch (error) {
      healthStatus.services.huggingFace.error = error instanceof Error ? error.message : 'Unknown error';
    }

    // Test Supabase Connection
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const supabase = createClient(supabaseUrl, supabaseAnonKey);

      // Test basic connection
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);

      healthStatus.services.supabaseAI = {
        configured: !error,
        connected: !error,
        error: error?.message || null,
        edgeFunctions: true // Assume edge functions are available if Supabase works
      };

      if (error) {
        healthStatus.recommendations.push('Check Supabase configuration and database setup');
      }
    } catch (error) {
      healthStatus.services.supabaseAI.error = error instanceof Error ? error.message : 'Unknown error';
      healthStatus.recommendations.push('Verify Supabase environment variables');
    }

    // Test AI endpoints
    healthStatus.services.aiEndpoints.configured = 
      healthStatus.services.huggingFace.configured || 
      healthStatus.services.supabaseAI.configured;

    // Add recommendations based on findings
    if (!healthStatus.services.huggingFace.configured && !healthStatus.services.supabaseAI.configured) {
      healthStatus.recommendations.push('No AI services configured - add HuggingFace API key or configure Supabase edge functions');
    }

    if (healthStatus.environment.developmentMode) {
      healthStatus.recommendations.push('Development mode active - premium features unlocked for testing');
    }

    const overallHealth = {
      isHealthy: healthStatus.services.aiEndpoints.configured,
      servicesOnline: Object.values(healthStatus.services).filter(s => 
        typeof s === 'object' && s !== null && 'connected' in s && s.connected
      ).length,
      totalServices: 3,
      readyForProduction: healthStatus.services.huggingFace.configured && healthStatus.services.supabaseAI.configured
    };

    return NextResponse.json({
      success: true,
      health: overallHealth,
      details: healthStatus,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('AI health check error:', error);
    return NextResponse.json({
      success: false,
      error: 'Health check failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 