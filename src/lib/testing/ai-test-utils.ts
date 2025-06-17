import { consolidatedAIService } from '@/lib/ai';
import { SubscriptionTierManager } from '@/lib/subscription/SubscriptionTierManager';
import { createClient } from '@supabase/supabase-js';
import { ExtendedTask, SuggestionContext, AIFeatureType } from '@/types/ai';
import { SubscriptionTier } from '@/types/subscription';

export interface TestUser {
  id: string;
  tier: SubscriptionTier;
  email: string;
  dailyRequestsUsed: number;
}

export interface TestResult {
  testName: string;
  passed: boolean;
  error?: string;
  duration: number;
  details?: any;
}

export class AITestUtils {
  private tieredAI: typeof consolidatedAIService;
  private subscriptionManager: SubscriptionTierManager;
  
  constructor() {
    this.tieredAI = consolidatedAIService;
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    this.subscriptionManager = new SubscriptionTierManager(supabase);
  }

  // Test user creation helpers
  createTestUsers(): Record<string, TestUser> {
    return {
      freeUser: {
        id: 'user_test_free_001',
        tier: 'free',
        email: 'test.free@example.com',
        dailyRequestsUsed: 0
      },
      premiumUser: {
        id: 'user_test_premium_001',
        tier: 'premium', 
        email: 'test.premium@example.com',
        dailyRequestsUsed: 0
      },
      freeUserAtLimit: {
        id: 'user_test_free_limit_001',
        tier: 'free',
        email: 'test.free.limit@example.com',
        dailyRequestsUsed: 10
      }
    };
  }

  // Mock task data for testing
  createMockTasks(): ExtendedTask[] {
    const now = new Date().toISOString();
    return [
      {
        id: 'test-task-1',
        title: 'Study Mathematics',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        priority: 'high',
        type: 'academic',
        subject: 'Mathematics',
        completed: false,
        reminder: false,
        description: 'Review calculus concepts',
        createdAt: now,
        updatedAt: now,
        recurrenceRule: 'none',
        recurrenceInterval: 0,
        recurrenceEndDate: undefined,
        originalDueDate: undefined,
        completedOverrides: {}
      },
      {
        id: 'test-task-2',
        title: 'Physics Assignment',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // Day after tomorrow
        priority: 'medium',
        type: 'academic',
        subject: 'Physics',
        completed: false,
        reminder: false,
        description: 'Complete quantum mechanics problems',
        createdAt: now,
        updatedAt: now,
        recurrenceRule: 'none',
        recurrenceInterval: 0,
        recurrenceEndDate: undefined,
        originalDueDate: undefined,
        completedOverrides: {}
      }
    ];
  }

  createMockContext(): SuggestionContext {
    return {
      currentTime: new Date(),
      upcomingTasks: this.createMockTasks(),
      recentActivity: [],
      userPreferences: {
        enableSuggestions: true,
        suggestionFrequency: 'moderate',
        difficultyPreference: 'adaptive',
        preferredStudyTimes: [],
        preferredStudyDuration: 90,
        preferredBreakDuration: 15,
        maxDailyStudyHours: 8,
        cloudSyncEnabled: false,
        shareAnonymousData: false,
        personalizedStuInteraction: true,
        enableBreakReminders: true,
        enableStudyReminders: true,
        reminderAdvanceTime: 15,
        adaptiveDifficulty: true,
        focusOnWeakSubjects: true,
        balanceSubjects: true
      }
    };
  }

  // Test execution helpers
  async runTest(testName: string, testFn: () => Promise<void>): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      await testFn();
      return {
        testName,
        passed: true,
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        testName,
        passed: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      };
    }
  }

  // Critical path test functions
  async testFreeUserBasicSuggestions(userId: string): Promise<void> {
    const tasks = this.createMockTasks();
    const context = this.createMockContext();
    
    const response = await this.tieredAI.generateSuggestions({
      userId,
      feature: 'basic_suggestions',
      tasks,
      context,
      userTier: 'free'
    });

    if (!response.success) {
      throw new Error(`Basic suggestions failed: ${response.error}`);
    }

    if (!response.data || !Array.isArray(response.data)) {
      throw new Error('Expected array of suggestions');
    }

    // Free tier should get limited suggestions
    if (response.data.length > 3) {
      throw new Error(`Free tier should get max 3 suggestions, got ${response.data.length}`);
    }
  }

  async testPremiumUserAdvancedSuggestions(userId: string): Promise<void> {
    const tasks = this.createMockTasks();
    const context = this.createMockContext();
    
    const response = await this.tieredAI.generateSuggestions({
      userId,
      feature: 'advanced_suggestions',
      tasks,
      context,
      userTier: 'premium'
    });

    if (!response.success) {
      throw new Error(`Advanced suggestions failed: ${response.error}`);
    }

    if (!response.data || !Array.isArray(response.data)) {
      throw new Error('Expected array of suggestions');
    }

    // Premium tier should get more suggestions
    if (response.data.length > 8) {
      throw new Error(`Premium tier should get max 8 suggestions, got ${response.data.length}`);
    }
  }

  async testFreeUserLimitReached(userId: string): Promise<void> {
    const access = await this.tieredAI.checkAccess(userId, 'basic_suggestions');
    
    if (access.canProceed) {
      throw new Error('Free user at limit should not be able to proceed');
    }

    if (!access.upgradeRequired) {
      throw new Error('Free user at limit should require upgrade');
    }

    if (access.usage.requestsRemaining > 0) {
      throw new Error('User at limit should have 0 remaining requests');
    }
  }

  async testUpgradePromptForFreeUser(userId: string): Promise<void> {
    const tasks = this.createMockTasks();
    const context = this.createMockContext();
    
    // Try to access premium feature as free user
    const response = await this.tieredAI.generateSuggestions({
      userId,
      feature: 'advanced_suggestions',
      tasks,
      context,
      userTier: 'free'
    });

    if (response.success) {
      throw new Error('Free user should not access premium features');
    }

    if (!response.upgradePrompt) {
      throw new Error('Should show upgrade prompt for premium features');
    }

    if (!response.upgradePrompt.message.includes('Premium')) {
      throw new Error('Upgrade prompt should mention Premium');
    }
  }

  async testErrorHandling(): Promise<void> {
    // Test with invalid user ID
    const response = await this.tieredAI.generateSuggestions({
      userId: 'invalid_user_id',
      feature: 'basic_suggestions',
      tasks: [],
      context: this.createMockContext(),
      userTier: 'free'
    });

    if (response.success) {
      throw new Error('Should fail with invalid user ID');
    }

    if (!response.error) {
      throw new Error('Should provide error message');
    }
  }

  async testPerformance(userId: string): Promise<{ responseTime: number }> {
    const tasks = this.createMockTasks();
    const context = this.createMockContext();
    
    const startTime = Date.now();
    
    await this.tieredAI.generateSuggestions({
      userId,
      feature: 'basic_suggestions',
      tasks,
      context,
      userTier: 'free'
    });

    const responseTime = Date.now() - startTime;
    
    // Performance expectation: should respond within 3 seconds
    if (responseTime > 3000) {
      throw new Error(`Response too slow: ${responseTime}ms`);
    }

    return { responseTime };
  }

  // Advanced testing methods for comprehensive integration
  async testIntelligenceTierRouting(userId: string, userTier: SubscriptionTier): Promise<void> {
    const response = await this.tieredAI.generateSuggestions({
      userId,
      feature: userTier === 'premium' || userTier === 'enterprise' ? 'advanced_suggestions' : 'basic_suggestions',
      tasks: this.createMockTasks(),
      context: this.createMockContext(),
      userTier
    });

    if (!response.success) {
      throw new Error(`Tier routing failed: ${response.error}`);
    }

    const expectedTiers: Record<SubscriptionTier, string[]> = {
      'free': ['adaptive_learning', 'cost_optimized', 'local_ml'],
      'premium': ['super_intelligent', 'adaptive_learning'],
      'enterprise': ['super_intelligent', 'adaptive_learning']
    };

    if (!expectedTiers[userTier].includes(response.metadata?.tier || '')) {
      throw new Error(`Unexpected tier: ${response.metadata?.tier} for ${userTier} user`);
    }
  }

  async testBehavioralAnalysis(userId: string): Promise<void> {
    const now = new Date().toISOString();
    const contextWithHistory = {
      ...this.createMockContext(),
      recentActivity: [
        {
          id: 'overdue-1',
          title: 'Overdue Assignment',
          dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          priority: 'high' as const,
          type: 'academic' as const,
          subject: 'Physics',
          completed: false,
          reminder: true,
          description: 'Critical assignment',
          createdAt: now,
          updatedAt: now,
          recurrenceRule: 'none' as const,
          recurrenceInterval: 0,
          recurrenceEndDate: undefined,
          originalDueDate: undefined,
          completedOverrides: {}
        }
      ]
    };

    const response = await this.tieredAI.generateSuggestions({
      userId,
      feature: 'advanced_suggestions',
      tasks: this.createMockTasks(),
      context: contextWithHistory,
      userTier: 'premium'
    });

    if (!response.success) {
      throw new Error(`Behavioral analysis failed: ${response.error}`);
    }

    if (!response.metadata?.behavioralInsights?.procrastinationRisk) {
      throw new Error('Procrastination detection not working');
    }
  }

  async testMoodDetection(userId: string): Promise<void> {
    const now = new Date().toISOString();
    const stressfulContext = {
      ...this.createMockContext(),
      upcomingTasks: [
        {
          id: 'exam-prep',
          title: 'Final Exam Tomorrow',
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          priority: 'high' as const,
          type: 'academic' as const,
          subject: 'Mathematics',
          completed: false,
          reminder: true,
          description: 'Critical exam preparation',
          createdAt: now,
          updatedAt: now,
          recurrenceRule: 'none' as const,
          recurrenceInterval: 0,
          recurrenceEndDate: undefined,
          originalDueDate: undefined,
          completedOverrides: {},
          difficulty: 9
        }
      ]
    };

    const response = await this.tieredAI.generateSuggestions({
      userId,
      feature: 'advanced_suggestions',
      tasks: this.createMockTasks(),
      context: stressfulContext,
      userTier: 'premium'
    });

    if (!response.success) {
      throw new Error(`Mood detection failed: ${response.error}`);
    }

    if (!response.metadata?.moodAnalysis?.stressLevel || 
        response.metadata.moodAnalysis.stressLevel < 0.7) {
      throw new Error('Stress level detection not working properly');
    }
  }

  async testPerformanceBenchmarks(userId: string): Promise<{
    responseTime: number;
    confidence: number;
    tier: string;
  }> {
    const startTime = performance.now();
    
    const response = await this.tieredAI.generateSuggestions({
      userId,
      feature: 'advanced_suggestions',
      tasks: this.createMockTasks(),
      context: this.createMockContext(),
      userTier: 'premium'
    });

    const responseTime = performance.now() - startTime;

    if (!response.success) {
      throw new Error(`Performance benchmark failed: ${response.error}`);
    }

    return {
      responseTime,
      confidence: response.metadata?.confidence || 0,
      tier: response.metadata?.tier || 'unknown'
    };
  }

  async testFallbackChain(userId: string): Promise<void> {
    const originalFetch = global.fetch;
    
    try {
      global.fetch = jest.fn().mockRejectedValue(new Error('External services unavailable'));

      const response = await this.tieredAI.generateSuggestions({
        userId,
        feature: 'basic_suggestions',
        tasks: this.createMockTasks(),
        context: this.createMockContext(),
        userTier: 'free'
      });

      if (!response.success) {
        throw new Error(`Fallback chain failed: ${response.error}`);
      }

      if (response.metadata?.tier !== 'local_ml') {
        throw new Error(`Expected local_ml tier, got: ${response.metadata?.tier}`);
      }
    } finally {
      global.fetch = originalFetch;
    }
  }

  // Comprehensive test suite
  async runAllCriticalPathTests(): Promise<TestResult[]> {
    const users = this.createTestUsers();
    const results: TestResult[] = [];

    console.log('🧪 Starting Critical Path Testing...');

    // Test 1: Free user basic suggestions
    results.push(await this.runTest(
      'Free User Basic Suggestions',
      () => this.testFreeUserBasicSuggestions(users.freeUser.id)
    ));

    // Test 2: Premium user advanced suggestions  
    results.push(await this.runTest(
      'Premium User Advanced Suggestions',
      () => this.testPremiumUserAdvancedSuggestions(users.premiumUser.id)
    ));

    // Test 3: Free user at limit
    results.push(await this.runTest(
      'Free User Limit Reached',
      () => this.testFreeUserLimitReached(users.freeUserAtLimit.id)
    ));

    // Test 4: Upgrade prompt
    results.push(await this.runTest(
      'Upgrade Prompt for Free User',
      () => this.testUpgradePromptForFreeUser(users.freeUser.id)
    ));

    // Test 5: Error handling
    results.push(await this.runTest(
      'Error Handling',
      () => this.testErrorHandling()
    ));

    // Test 6: Performance
    results.push(await this.runTest(
      'Performance Test',
      async () => {
        const result = await this.testPerformance(users.freeUser.id);
        console.log(`Response time: ${result.responseTime}ms`);
      }
    ));

    return results;
  }

  // Comprehensive AI integration test suite
  async runComprehensiveAITests(): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const testUsers = this.createTestUsers();

    console.log('🧪 Starting Comprehensive AI Integration Testing...');

    // Intelligence Tier Tests
    results.push(await this.runTest(
      'Intelligence Tier Routing - Premium',
      () => this.testIntelligenceTierRouting(testUsers.premiumUser.id, 'premium')
    ));

    results.push(await this.runTest(
      'Intelligence Tier Routing - Free',
      () => this.testIntelligenceTierRouting(testUsers.freeUser.id, 'free')
    ));

    // Advanced ML Feature Tests
    results.push(await this.runTest(
      'Behavioral Analysis',
      () => this.testBehavioralAnalysis(testUsers.premiumUser.id)
    ));

    results.push(await this.runTest(
      'Mood Detection',
      () => this.testMoodDetection(testUsers.premiumUser.id)
    ));

    // Performance and Reliability Tests
    const performanceResult = await this.testPerformanceBenchmarks(testUsers.premiumUser.id);
    results.push({
      testName: 'Performance Benchmarks',
      passed: performanceResult.responseTime < 200 && performanceResult.confidence > 0.9,
      duration: performanceResult.responseTime,
      details: performanceResult
    });

    results.push(await this.runTest(
      'Fallback Chain',
      () => this.testFallbackChain(testUsers.freeUser.id)
    ));

    return results;
  }

  // Helper to print test results
  printTestResults(results: TestResult[]): void {
    console.log('\n🧪 Test Results Summary:');
    console.log('========================');
    
    let passed = 0;
    let failed = 0;
    
    results.forEach(result => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      const duration = `${result.duration}ms`;
      
      console.log(`${status} ${result.testName} (${duration})`);
      
      if (!result.passed && result.error) {
        console.log(`   Error: ${result.error}`);
      }
      
      result.passed ? passed++ : failed++;
    });
    
    console.log('========================');
    console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);
  }
}

// Export singleton instance
export const aiTestUtils = new AITestUtils();