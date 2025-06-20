import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { HuggingFaceService } from '@/lib/ai/HuggingFaceService';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    console.log(`🧪 Starting AI services test for user: ${userId}`);

    const testResults = {
      timestamp: new Date().toISOString(),
      userId,
      environment: {
        launchMode: process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_ENABLE_LAUNCH_MODE === 'true',
        huggingFaceApiKey: !!process.env.HUGGINGFACE_API_KEY,
        supabaseConfigured: !!process.env.NEXT_PUBLIC_SUPABASE_URL
      },
      tests: {
        huggingFaceService: {
          status: 'testing',
          configured: false,
          connected: false,
          error: null as string | null,
          testResult: null as any
        },
        supabaseEdgeFunction: {
          status: 'testing',
          deployed: false,
          working: false,
          error: null as string | null,
          testResult: null as any
        },
        aiSuggestionsEndpoint: {
          status: 'testing',
          working: false,
          error: null as string | null,
          testResult: null as any
        }
      },
      summary: {
        totalTests: 3,
        passed: 0,
        failed: 0,
        recommendations: [] as string[]
      }
    };

    // Test 1: HuggingFace Service
    console.log('🤖 Testing HuggingFace Service...');
    try {
      const hfService = new HuggingFaceService();
      const health = await hfService.checkHealth();
      
      testResults.tests.huggingFaceService = {
        status: 'completed',
        configured: health.apiKeyAvailable,
        connected: health.connected,
        error: health.connected ? null : health.status,
        testResult: health
      };

      if (health.connected) {
        testResults.summary.passed++;
        console.log('✅ HuggingFace: Connected and working');
      } else {
        testResults.summary.failed++;
        console.log('❌ HuggingFace: Not configured or connected');
        testResults.summary.recommendations.push('Set HUGGINGFACE_API_KEY environment variable for ML features');
      }
    } catch (error) {
      testResults.tests.huggingFaceService.status = 'failed';
      testResults.tests.huggingFaceService.error = error instanceof Error ? error.message : 'Unknown error';
      testResults.summary.failed++;
      console.log('❌ HuggingFace: Error occurred -', error);
    }

    // Test 2: Supabase Edge Function
    console.log('🚀 Testing Supabase ML Edge Function...');
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const supabase = createClient(supabaseUrl, supabaseAnonKey);

      const testRequest = {
        userVector: Array.from({ length: 24 }, () => Math.random()),
        contextData: {
          recentTasks: [{ id: 'test', title: 'Test Task' }],
          currentTime: new Date().toISOString(),
          preferences: { difficultyPreference: 5 }
        },
        requestType: 'recommendation' as const
      };

      const { data, error } = await supabase.functions.invoke('ml-inference', {
        body: testRequest,
      });

      if (error) {
        throw error;
      }

      testResults.tests.supabaseEdgeFunction = {
        status: 'completed',
        deployed: true,
        working: true,
        error: null,
        testResult: {
          suggestionsCount: data?.suggestions?.length || 0,
          confidence: data?.confidence || 0,
          processingTime: data?.processingTime || 0
        }
      };

      testResults.summary.passed++;
      console.log('✅ Supabase Edge Function: Working correctly');
      console.log(`   Generated ${data?.suggestions?.length || 0} suggestions with ${data?.confidence || 0} confidence`);

    } catch (error) {
      testResults.tests.supabaseEdgeFunction.status = 'failed';
      testResults.tests.supabaseEdgeFunction.error = error instanceof Error ? error.message : 'Unknown error';
      testResults.summary.failed++;
      console.log('❌ Supabase Edge Function: Error occurred -', error);
      testResults.summary.recommendations.push('Edge function may need redeployment or configuration');
    }

    // Test 3: AI Suggestions API Endpoint
    console.log('🎯 Testing AI Suggestions API Endpoint...');
    try {
      const testBody = {
        feature: 'basic_suggestions',
        tasks: [
          { id: 'test1', title: 'Test Task 1', priority: 'medium' },
          { id: 'test2', title: 'Test Task 2', priority: 'high' }
        ],
        context: {
          currentTime: new Date().toISOString(),
          preferences: { difficulty: 5 }
        }
      };

      const response = await fetch(`${request.nextUrl.origin}/api/ai/suggestions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': request.headers.get('Cookie') || ''
        },
        body: JSON.stringify(testBody)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        testResults.tests.aiSuggestionsEndpoint = {
          status: 'completed',
          working: true,
          error: null,
          testResult: {
            tier: result.tier,
            requestsUsed: result.usage?.requestsUsed || 0,
            requestsRemaining: result.usage?.requestsRemaining || 0,
            suggestionsGenerated: result.data?.suggestions?.length || 0
          }
        };

        testResults.summary.passed++;
        console.log('✅ AI Suggestions Endpoint: Working correctly');
        console.log(`   User tier: ${result.tier}, Requests: ${result.usage?.requestsUsed}/${result.usage?.requestsUsed + result.usage?.requestsRemaining}`);

      } else {
        throw new Error(result.error || 'API returned error');
      }

    } catch (error) {
      testResults.tests.aiSuggestionsEndpoint.status = 'failed';
      testResults.tests.aiSuggestionsEndpoint.error = error instanceof Error ? error.message : 'Unknown error';
      testResults.summary.failed++;
      console.log('❌ AI Suggestions Endpoint: Error occurred -', error);
    }

    // Generate summary and recommendations
    const allPassed = testResults.summary.passed === testResults.summary.totalTests;
    
    if (allPassed) {
      testResults.summary.recommendations.push('🎉 All AI services are working correctly!');
      testResults.summary.recommendations.push('✨ Premium AI features are fully operational');
    } else {
      if (testResults.summary.passed > 0) {
        testResults.summary.recommendations.push(`✅ ${testResults.summary.passed}/${testResults.summary.totalTests} AI services working`);
      }
      
      if (!testResults.environment.huggingFaceApiKey) {
        testResults.summary.recommendations.push('🔑 Add HUGGINGFACE_API_KEY for advanced ML features');
      }
      
      if (testResults.tests.supabaseEdgeFunction.error) {
        testResults.summary.recommendations.push('🚀 Check Supabase edge function deployment');
      }
    }

    // Launch mode info
    if (testResults.environment.launchMode) {
      testResults.summary.recommendations.push('🚀 Launch mode active - premium features available for all users during launch period');
    }

    console.log(`\n📊 Test Summary: ${testResults.summary.passed}/${testResults.summary.totalTests} passed`);
    console.log('🎯 Status:', allPassed ? 'ALL SYSTEMS OPERATIONAL' : 'SOME ISSUES DETECTED');

    return NextResponse.json({
      success: true,
      allSystemsOperational: allPassed,
      results: testResults,
      nextSteps: testResults.summary.recommendations
    });

  } catch (error) {
    console.error('❌ AI test suite failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Test suite failed to execute',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 