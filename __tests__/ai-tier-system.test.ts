import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { aiTestUtils, TestResult } from '@/lib/testing/ai-test-utils';

describe('AI Tier System Critical Path Tests', () => {
  let testResults: TestResult[] = [];

  beforeAll(async () => {
    console.log('🚀 Starting AI Tier System Testing...');
    
    // Run all critical path tests
    testResults = await aiTestUtils.runAllCriticalPathTests();
    
    // Print results for immediate feedback
    aiTestUtils.printTestResults(testResults);
  });

  test('All critical paths should pass', () => {
    const failedTests = testResults.filter(result => !result.passed);
    
    if (failedTests.length > 0) {
      const failureMessages = failedTests.map(test => 
        `${test.testName}: ${test.error}`
      ).join('\n');
      
      throw new Error(`${failedTests.length} tests failed:\n${failureMessages}`);
    }
    
    expect(testResults.every(result => result.passed)).toBe(true);
  });

  test('Free user should get basic suggestions', () => {
    const freeUserTest = testResults.find(r => r.testName === 'Free User Basic Suggestions');
    expect(freeUserTest?.passed).toBe(true);
  });

  test('Premium user should get advanced suggestions', () => {
    const premiumUserTest = testResults.find(r => r.testName === 'Premium User Advanced Suggestions');
    expect(premiumUserTest?.passed).toBe(true);
  });

  test('Free user at limit should be blocked', () => {
    const limitTest = testResults.find(r => r.testName === 'Free User Limit Reached');
    expect(limitTest?.passed).toBe(true);
  });

  test('Upgrade prompts should work correctly', () => {
    const upgradeTest = testResults.find(r => r.testName === 'Upgrade Prompt for Free User');
    expect(upgradeTest?.passed).toBe(true);
  });

  test('Error handling should be graceful', () => {
    const errorTest = testResults.find(r => r.testName === 'Error Handling');
    expect(errorTest?.passed).toBe(true);
  });

  test('Performance should be acceptable', () => {
    const performanceTest = testResults.find(r => r.testName === 'Performance Test');
    expect(performanceTest?.passed).toBe(true);
    
    // Additional check: all tests should complete in reasonable time
    const slowTests = testResults.filter(r => r.duration > 5000);
    expect(slowTests).toHaveLength(0);
  });

  afterAll(() => {
    console.log('✅ AI Tier System Testing Complete!');
    
    const passedCount = testResults.filter(r => r.passed).length;
    const totalCount = testResults.length;
    const successRate = ((passedCount / totalCount) * 100).toFixed(1);
    
    console.log(`Final Results: ${passedCount}/${totalCount} passed (${successRate}%)`);
  });
});

// Manual testing helpers for browser testing
export const runManualTests = async () => {
  if (typeof window === 'undefined') {
    console.log('Manual tests can only run in browser environment');
    return;
  }

  console.log('🔧 Running Manual Browser Tests...');
  
  const results = await aiTestUtils.runAllCriticalPathTests();
  aiTestUtils.printTestResults(results);
  
  return results;
};

// Utility for quick testing during development
export const quickTest = async (testName?: string) => {
  const users = aiTestUtils.createTestUsers();
  
  if (!testName) {
    console.log('Available tests: freeUser, premiumUser, limitReached, upgradePrompt, errorHandling, performance');
    return;
  }

  try {
    switch (testName) {
      case 'freeUser':
        await aiTestUtils.testFreeUserBasicSuggestions(users.freeUser.id);
        console.log('✅ Free user test passed');
        break;
      case 'premiumUser':
        await aiTestUtils.testPremiumUserAdvancedSuggestions(users.premiumUser.id);
        console.log('✅ Premium user test passed');
        break;
      case 'limitReached':
        await aiTestUtils.testFreeUserLimitReached(users.freeUserAtLimit.id);
        console.log('✅ Limit reached test passed');
        break;
      case 'upgradePrompt':
        await aiTestUtils.testUpgradePromptForFreeUser(users.freeUser.id);
        console.log('✅ Upgrade prompt test passed');
        break;
      case 'errorHandling':
        await aiTestUtils.testErrorHandling();
        console.log('✅ Error handling test passed');
        break;
      case 'performance':
        const result = await aiTestUtils.testPerformance(users.freeUser.id);
        console.log(`✅ Performance test passed (${result.responseTime}ms)`);
        break;
      default:
        console.log('❌ Unknown test name');
    }
  } catch (error) {
    console.log(`❌ Test failed: ${error}`);
  }
}; 