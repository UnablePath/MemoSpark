'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useFetchAchievements } from '@/hooks/useAchievementQueries';
import { useDebouncedAchievementTrigger } from '@/hooks/useDebouncedAchievementTrigger';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { 
  Play, 
  Square, 
  RotateCcw, 
  TestTube, 
  Zap, 
  Database,
  Timer,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface TestScenario {
  id: string;
  name: string;
  description: string;
  expectedBehavior: string;
  testFunction: () => Promise<void>;
}

export const PerformanceTestScenarios: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});
  const [progress, setProgress] = useState(0);
  
  const { refetch: refetchAchievements } = useFetchAchievements();
  const { triggerAchievement } = useDebouncedAchievementTrigger();
  const { metrics, resetMetrics, getPerformanceSummary } = usePerformanceMonitor();

  const testScenarios: TestScenario[] = [
    {
      id: 'rapid-data-fetch',
      name: 'Rapid Data Fetching',
      description: 'Fetch achievements data multiple times rapidly',
      expectedBehavior: 'Should use cached data after first request, minimal API calls',
      testFunction: async () => {
        for (let i = 0; i < 5; i++) {
          await refetchAchievements();
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    },
    {
      id: 'achievement-spam',
      name: 'Achievement Trigger Spam',
      description: 'Trigger achievements rapidly to test debouncing',
      expectedBehavior: 'Should debounce triggers, preventing spam requests',
      testFunction: async () => {
        for (let i = 0; i < 10; i++) {
          triggerAchievement('test_achievement', { showToast: false });
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        // Wait for debounce to complete
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    },
    {
      id: 'concurrent-components',
      name: 'Concurrent Component Loading',
      description: 'Simulate multiple components requesting same data',
      expectedBehavior: 'Should deduplicate requests, single API call for multiple consumers',
      testFunction: async () => {
        // Simulate multiple components requesting achievements simultaneously
        const promises = Array(5).fill(null).map(() => refetchAchievements());
        await Promise.all(promises);
      }
    },
    {
      id: 'cache-invalidation',
      name: 'Cache Invalidation Test',
      description: 'Test cache invalidation after mutations',
      expectedBehavior: 'Should invalidate cache and refetch fresh data after mutations',
      testFunction: async () => {
        // Fetch initial data
        await refetchAchievements();
        // Trigger achievement (mutation)
        await triggerAchievement('task_completed', { showToast: false });
        // Wait for invalidation
        await new Promise(resolve => setTimeout(resolve, 500));
        // Fetch again (should be fresh data)
        await refetchAchievements();
      }
    },
    {
      id: 'mixed-operations',
      name: 'Mixed Operations Scenario',
      description: 'Mix of reads, writes, and rapid interactions',
      expectedBehavior: 'Optimal balance of caching and fresh data',
      testFunction: async () => {
        // Initial fetch
        await refetchAchievements();
        // Rapid fetches (should hit cache)
        for (let i = 0; i < 3; i++) {
          await refetchAchievements();
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        // Trigger achievement
        await triggerAchievement('bubble_game_played', { showToast: false });
        // Wait for debounce
        await new Promise(resolve => setTimeout(resolve, 600));
        // Final fetch
        await refetchAchievements();
      }
    }
  ];

  const runSingleTest = async (scenario: TestScenario) => {
    setCurrentTest(scenario.id);
    
    // Reset metrics before test
    const beforeMetrics = { ...metrics };
    
    try {
      await scenario.testFunction();
      
      // Wait a moment for all async operations to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Analyze results
      const afterMetrics = { ...metrics };
      const summary = getPerformanceSummary();
      
      // Determine if test passed based on scenario expectations
      let testPassed = false;
      
      switch (scenario.id) {
        case 'rapid-data-fetch':
          // Should have high cache hit rate for repeated requests
          testPassed = summary.cacheHitRate >= 60;
          break;
        case 'achievement-spam':
          // Should have very few actual API calls due to debouncing
          testPassed = summary.achievementTriggers <= 2; // Max 2 due to debouncing
          break;
        case 'concurrent-components':
          // Should have only 1 API call despite 5 concurrent requests
          testPassed = summary.apiCalls <= 1;
          break;
        case 'cache-invalidation':
          // Should have appropriate mix of cache hits and fresh data
          testPassed = summary.totalRequests >= 2 && summary.apiCalls >= 1;
          break;
        case 'mixed-operations':
          // Should have good overall cache hit rate
          testPassed = summary.cacheHitRate >= 50;
          break;
        default:
          testPassed = true;
      }
      
      setTestResults(prev => ({ ...prev, [scenario.id]: testPassed }));
      
    } catch (error) {
      console.error(`Test ${scenario.id} failed:`, error);
      setTestResults(prev => ({ ...prev, [scenario.id]: false }));
    }
    
    setCurrentTest(null);
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setProgress(0);
    setTestResults({});
    
    // Reset metrics before starting
    resetMetrics();
    
    for (let i = 0; i < testScenarios.length; i++) {
      const scenario = testScenarios[i];
      await runSingleTest(scenario);
      setProgress(((i + 1) / testScenarios.length) * 100);
      
      // Wait between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    setIsRunning(false);
    setProgress(100);
  };

  const stopTests = () => {
    setIsRunning(false);
    setCurrentTest(null);
    setProgress(0);
  };

  const getTestResult = (testId: string) => {
    return testResults[testId];
  };

  const overallSuccess = Object.values(testResults).filter(Boolean).length;
  const totalTests = Object.keys(testResults).length;
  const successRate = totalTests > 0 ? (overallSuccess / totalTests) * 100 : 0;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <TestTube className="w-5 h-5 mr-2" />
          Performance Test Scenarios
        </CardTitle>
        <CardDescription>
          Verify 60%+ API request reduction and caching effectiveness
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Test Controls */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
          <div className="flex items-center space-x-4">
            <Button
              onClick={runAllTests}
              disabled={isRunning}
              className="flex items-center space-x-2"
            >
              <Play className="w-4 h-4" />
              <span>Run All Tests</span>
            </Button>
            
            {isRunning && (
              <Button
                onClick={stopTests}
                variant="destructive"
                className="flex items-center space-x-2"
              >
                <Square className="w-4 h-4" />
                <span>Stop</span>
              </Button>
            )}
            
            <Button
              onClick={resetMetrics}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset Metrics</span>
            </Button>
          </div>
          
          {totalTests > 0 && (
            <div className="flex items-center space-x-2">
              <Badge variant={successRate >= 80 ? "default" : "secondary"}>
                {overallSuccess}/{totalTests} Passed
              </Badge>
              <span className="text-sm text-muted-foreground">
                {successRate.toFixed(0)}% Success Rate
              </span>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {isRunning && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Test Progress</span>
              <span className="text-sm text-muted-foreground">{progress.toFixed(0)}%</span>
            </div>
            <Progress value={progress} className="w-full" />
            {currentTest && (
              <p className="text-sm text-muted-foreground">
                Running: {testScenarios.find(t => t.id === currentTest)?.name}
              </p>
            )}
          </div>
        )}

        {/* Test Scenarios */}
        <div className="space-y-4">
          {testScenarios.map((scenario) => {
            const isRunningThis = currentTest === scenario.id;
            const testResult = getTestResult(scenario.id);
            
            return (
              <Card key={scenario.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center">
                      {isRunningThis ? (
                        <Timer className="w-4 h-4 mr-2 animate-pulse text-blue-500" />
                      ) : testResult === true ? (
                        <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                      ) : testResult === false ? (
                        <AlertCircle className="w-4 h-4 mr-2 text-red-500" />
                      ) : (
                        <TestTube className="w-4 h-4 mr-2 text-gray-400" />
                      )}
                      {scenario.name}
                    </CardTitle>
                    
                    <div className="flex items-center space-x-2">
                      {testResult !== undefined && (
                        <Badge variant={testResult ? "default" : "destructive"}>
                          {testResult ? "PASS" : "FAIL"}
                        </Badge>
                      )}
                      
                      <Button
                        onClick={() => runSingleTest(scenario)}
                        disabled={isRunning}
                        variant="outline"
                        size="sm"
                      >
                        <Play className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription>{scenario.description}</CardDescription>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Zap className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm font-medium">Expected Behavior:</span>
                    </div>
                    <p className="text-sm text-muted-foreground pl-6">
                      {scenario.expectedBehavior}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Performance Summary */}
        {totalTests > 0 && (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-base flex items-center">
                <Database className="w-4 h-4 mr-2" />
                Performance Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {metrics.cacheHitRate.toFixed(1)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Cache Hit Rate</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {metrics.apiRequestCount}
                  </div>
                  <div className="text-xs text-muted-foreground">API Calls</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {metrics.achievementTriggerCount}
                  </div>
                  <div className="text-xs text-muted-foreground">Achievement Triggers</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">
                    {successRate.toFixed(0)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Test Success Rate</div>
                </div>
              </div>
              
              {metrics.cacheHitRate >= 60 && (
                <div className="mt-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800 dark:text-green-200">
                      Performance Target Achieved!
                    </span>
                  </div>
                  <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                    Cache hit rate of {metrics.cacheHitRate.toFixed(1)}% indicates successful API request reduction.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}; 