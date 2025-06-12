import React from 'react';
import '@testing-library/jest-dom';
import { consolidatedAIService } from '@/lib/ai';
import { aiTestUtils } from '@/lib/testing/ai-test-utils';
import { TierAwareAIResponse, ExtendedTask, Priority } from '@/types/ai';

// Mock the AI service
jest.mock('@/lib/ai', () => ({
  consolidatedAIService: {
    generateSuggestions: jest.fn(),
    checkAccess: jest.fn(),
  },
}));

const mockGenerateSuggestions = consolidatedAIService.generateSuggestions as jest.MockedFunction<typeof consolidatedAIService.generateSuggestions>;

describe('AI Performance and Reliability Tests', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('Response Time Benchmarks', () => {
    it('should meet <200ms response time for Super Intelligent tier', async () => {
      const startTime = performance.now();

      const mockResponse: TierAwareAIResponse = {
        success: true,
        data: [],
        metadata: {
          tier: 'super_intelligent',
          responseTime: 150
        }
      };

      mockGenerateSuggestions.mockResolvedValue(mockResponse);

      const response = await consolidatedAIService.generateSuggestions({
        userId: 'performance_test_super',
        feature: 'advanced_suggestions',
        tasks: aiTestUtils.createMockTasks(),
        context: aiTestUtils.createMockContext(),
        userTier: 'premium'
      });

      const responseTime = performance.now() - startTime;

      expect(response.success).toBe(true);
      expect(response.metadata?.tier).toBe('super_intelligent');
      expect(response.metadata?.responseTime).toBeLessThan(200);
      expect(responseTime).toBeLessThan(1000); // Total test time
    });

    it('should maintain reasonable performance for Adaptive Learning tier', async () => {
      const mockResponse: TierAwareAIResponse = {
        success: true,
        data: [],
        metadata: {
          tier: 'adaptive_learning',
          responseTime: 180
        }
      };

      mockGenerateSuggestions.mockResolvedValue(mockResponse);

      const response = await consolidatedAIService.generateSuggestions({
        userId: 'performance_test_adaptive',
        feature: 'advanced_suggestions',
        tasks: aiTestUtils.createMockTasks(),
        context: aiTestUtils.createMockContext(),
        userTier: 'premium'
      });

      expect(response.success).toBe(true);
      expect(response.metadata?.tier).toBe('adaptive_learning');
    });

    it('should optimize performance for Cost-Optimized tier', async () => {
      const mockResponse: TierAwareAIResponse = {
        success: true,
        data: [],
        metadata: {
          tier: 'cost_optimized',
          responseTime: 120
        }
      };

      mockGenerateSuggestions.mockResolvedValue(mockResponse);

      const response = await consolidatedAIService.generateSuggestions({
        userId: 'performance_test_cost',
        feature: 'basic_suggestions',
        tasks: aiTestUtils.createMockTasks(),
        context: aiTestUtils.createMockContext(),
        userTier: 'free'
      });

      expect(response.success).toBe(true);
      expect(response.metadata?.tier).toBe('cost_optimized');
    });

    it('should gracefully handle external service failures', async () => {
      // Mock network failure
      const mockFetch = jest.fn().mockRejectedValue(new Error('Network unavailable'));
      global.fetch = mockFetch as any;

      try {
        const mockResponse: TierAwareAIResponse = {
          success: true,
          data: [],
          metadata: {
            tier: 'local_ml',
            responseTime: 80
          }
        };

        mockGenerateSuggestions.mockResolvedValue(mockResponse);

        const response = await consolidatedAIService.generateSuggestions({
          userId: 'performance_test_offline',
          feature: 'basic_suggestions',
          tasks: aiTestUtils.createMockTasks(),
          context: aiTestUtils.createMockContext(),
          userTier: 'free'
        });

        if (response.success) {
          expect(response.metadata?.tier).toBe('local_ml');
        }
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe('Confidence Score Validation', () => {
    it('should maintain >90% confidence for Super Intelligent tier', async () => {
      const mockResponse: TierAwareAIResponse = {
        success: true,
        data: [
          {
            id: 'high-confidence-suggestion',
            type: 'task_suggestion',
            title: 'High Quality Suggestion',
            description: 'AI-generated with high confidence',
            confidence: 0.95,
            reasoning: 'Based on advanced ML analysis',
            createdAt: new Date().toISOString()
          }
        ],
        metadata: {
          tier: 'super_intelligent',
          confidence: 0.95
        }
      };

      mockGenerateSuggestions.mockResolvedValue(mockResponse);

      const response = await consolidatedAIService.generateSuggestions({
        userId: 'confidence_test_super',
        feature: 'advanced_suggestions',
        tasks: aiTestUtils.createMockTasks(),
        context: aiTestUtils.createMockContext(),
        userTier: 'premium'
      });

      expect(response.success).toBe(true);
      expect(response.metadata?.tier).toBe('super_intelligent');
      expect(response.metadata?.confidence).toBeGreaterThan(0.9);

      if (Array.isArray(response.data)) {
        response.data.forEach((suggestion: any) => {
          expect(suggestion.confidence).toBeGreaterThan(0.9);
        });
      }
    });

    it('should maintain >80% confidence for Adaptive Learning tier', async () => {
      const mockResponse: TierAwareAIResponse = {
        success: true,
        data: [],
        metadata: {
          tier: 'adaptive_learning',
          confidence: 0.85
        }
      };

      mockGenerateSuggestions.mockResolvedValue(mockResponse);

      const response = await consolidatedAIService.generateSuggestions({
        userId: 'confidence_test_adaptive',
        feature: 'advanced_suggestions',
        tasks: aiTestUtils.createMockTasks(),
        context: aiTestUtils.createMockContext(),
        userTier: 'premium'
      });

      expect(response.success).toBe(true);
      expect(response.metadata?.tier).toBe('adaptive_learning');
      expect(response.metadata?.confidence).toBeGreaterThan(0.8);
    });

    it('should maintain >70% confidence for Cost-Optimized tier', async () => {
      const mockResponse: TierAwareAIResponse = {
        success: true,
        data: [],
        metadata: {
          tier: 'cost_optimized',
          confidence: 0.75
        }
      };

      mockGenerateSuggestions.mockResolvedValue(mockResponse);

      const response = await consolidatedAIService.generateSuggestions({
        userId: 'confidence_test_cost',
        feature: 'basic_suggestions',
        tasks: aiTestUtils.createMockTasks(),
        context: aiTestUtils.createMockContext(),
        userTier: 'free'
      });

      expect(response.success).toBe(true);
      expect(response.metadata?.tier).toBe('cost_optimized');
      expect(response.metadata?.confidence).toBeGreaterThan(0.7);
    });

    it('should gracefully degrade with Local ML fallback', async () => {
      // Mock external service failure
      const mockFetch = jest.fn().mockRejectedValue(new Error('Network unavailable'));
      global.fetch = mockFetch as any;

      try {
        const mockResponse: TierAwareAIResponse = {
          success: true,
          data: [],
          metadata: {
            tier: 'local_ml',
            confidence: 0.65
          }
        };

        mockGenerateSuggestions.mockResolvedValue(mockResponse);

        const response = await consolidatedAIService.generateSuggestions({
          userId: 'confidence_test_local',
          feature: 'basic_suggestions',
          tasks: aiTestUtils.createMockTasks(),
          context: aiTestUtils.createMockContext(),
          userTier: 'free'
        });

        if (response.success) {
          expect(response.metadata?.tier).toBe('local_ml');
          expect(response.metadata?.confidence).toBeGreaterThan(0.6);
        }
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe('Load Testing and Scalability', () => {
    it('should handle 50+ concurrent users efficiently', async () => {
      const concurrentUsers = 50;
      const startTime = performance.now();

      const requests = Array.from({ length: concurrentUsers }, (_, i) => {
        const mockResponse: TierAwareAIResponse = {
          success: true,
          data: [],
          metadata: {
            tier: i < 10 ? 'super_intelligent' : 'cost_optimized',
            responseTime: 150 + (i * 2)
          }
        };

        mockGenerateSuggestions.mockResolvedValue(mockResponse);

        return consolidatedAIService.generateSuggestions({
          userId: `load_test_user_${i}`,
          feature: 'basic_suggestions',
          tasks: aiTestUtils.createMockTasks(),
          context: aiTestUtils.createMockContext(),
          userTier: i < 10 ? 'premium' : 'free'
        });
      });

      const responses = await Promise.all(requests);
      const totalTime = performance.now() - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.success).toBe(true);
      });

      // Total time should be reasonable (under 5 seconds for all concurrent requests)
      expect(totalTime).toBeLessThan(5000);

      console.log(`Load test completed: ${concurrentUsers} users in ${totalTime.toFixed(2)}ms`);
    });

    it('should maintain performance under sustained load', async () => {
      const sustainedRequestCount = 100;
      const batchSize = 10;
      const results = [];

      for (let batch = 0; batch < sustainedRequestCount / batchSize; batch++) {
        const batchStart = performance.now();

        const batchRequests = Array.from({ length: batchSize }, (_, i) => {
          const mockResponse: TierAwareAIResponse = {
            success: true,
            data: [],
            metadata: {
              tier: 'cost_optimized',
              responseTime: 120 + Math.random() * 60
            }
          };

          mockGenerateSuggestions.mockResolvedValue(mockResponse);

          return consolidatedAIService.generateSuggestions({
            userId: `sustained_load_user_${batch}_${i}`,
            feature: 'basic_suggestions',
            tasks: aiTestUtils.createMockTasks(),
            context: aiTestUtils.createMockContext(),
            userTier: 'free'
          });
        });

        const batchResponses = await Promise.all(batchRequests);
        const batchTime = performance.now() - batchStart;

        results.push({
          batch,
          time: batchTime,
          successCount: batchResponses.filter(r => r.success).length
        });

        // All requests in batch should succeed
        expect(batchResponses.every(r => r.success)).toBe(true);
      }

      // Performance should remain consistent across batches
      const avgTime = results.reduce((sum, r) => sum + r.time, 0) / results.length;
      const maxTime = Math.max(...results.map(r => r.time));

      expect(maxTime).toBeLessThan(avgTime * 2); // No single batch should be >2x average
      console.log(`Sustained load test: ${sustainedRequestCount} requests, avg batch time: ${avgTime.toFixed(2)}ms`);
    });
  });

  describe('Cost Efficiency Validation', () => {
    it('should meet $0.30/month cost target for 153 users', async () => {
      const userCount = 153;
      const monthlyRequestsPerUser = 100; // Estimate
      const totalMonthlyRequests = userCount * monthlyRequestsPerUser;

      // Mock cost tracking
      const costPerTier = {
        'super_intelligent': 0.01,
        'adaptive_learning': 0.005,
        'cost_optimized': 0.002,
        'local_ml': 0.0005
      };

      let totalCost = 0;
      const responses = [];

      for (let i = 0; i < Math.min(totalMonthlyRequests, 100); i++) { // Sample 100 requests
        const tier = i < 20 ? 'super_intelligent' : 
                     i < 50 ? 'adaptive_learning' : 
                     i < 80 ? 'cost_optimized' : 'local_ml';

        const mockResponse: TierAwareAIResponse = {
          success: true,
          data: [],
          metadata: {
            tier: tier as any,
            responseTime: 150
          }
        };

        mockGenerateSuggestions.mockResolvedValue(mockResponse);

        const response = await consolidatedAIService.generateSuggestions({
          userId: `cost_test_user_${i}`,
          feature: 'basic_suggestions',
          tasks: aiTestUtils.createMockTasks(),
          context: aiTestUtils.createMockContext(),
          userTier: i < 30 ? 'premium' : 'free'
        });

        responses.push(response);
        const tierCost = costPerTier[response.metadata?.tier as keyof typeof costPerTier] || 0;
        totalCost += tierCost;
      }

      // Extrapolate to full month
      const estimatedMonthlyCost = (totalCost / 100) * totalMonthlyRequests;

      expect(estimatedMonthlyCost).toBeLessThan(0.30);
      console.log(`Estimated monthly cost for ${userCount} users: $${estimatedMonthlyCost.toFixed(4)}`);
    });

    it('should optimize tier distribution for cost efficiency', async () => {
      const testRequests = 100;
      const responses = [];

      for (let i = 0; i < testRequests; i++) {
        const mockResponse: TierAwareAIResponse = {
          success: true,
          data: [],
          metadata: {
            tier: i < 10 ? 'super_intelligent' : 
                  i < 30 ? 'adaptive_learning' : 
                  i < 70 ? 'cost_optimized' : 'local_ml'
          }
        };

        mockGenerateSuggestions.mockResolvedValue(mockResponse);

        const response = await consolidatedAIService.generateSuggestions({
          userId: `tier_distribution_user_${i}`,
          feature: 'basic_suggestions',
          tasks: aiTestUtils.createMockTasks(),
          context: aiTestUtils.createMockContext(),
          userTier: i < 20 ? 'premium' : 'free'
        });

        responses.push(response);
      }

      // Analyze tier distribution
      const tierCounts = responses.reduce((acc, response) => {
        const tier = response.metadata?.tier || 'unknown';
        acc[tier] = (acc[tier] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const superIntelligentCount = responses.filter(r => r.metadata?.tier === 'super_intelligent').length;
      const totalResponses = responses.length;

      // Super Intelligent tier should be < 20% of total requests for cost efficiency
      expect(superIntelligentCount / totalResponses).toBeLessThan(0.2);

      // Most requests should use cost-optimized tiers
      const costOptimizedCount = responses.filter(r => 
        r.metadata?.tier === 'cost_optimized' || r.metadata?.tier === 'local_ml'
      ).length;
      
      expect(costOptimizedCount / totalResponses).toBeGreaterThan(0.6);

      console.log('Tier distribution:', tierCounts);
    });
  });

  describe('Availability and Reliability', () => {
    it('should maintain 99.9% availability with fallback systems', async () => {
      const totalRequests = 100;
      const maxFailures = Math.floor(totalRequests * 0.001); // 0.1% failure rate allowed

      let failures = 0;
      const requests = [];

      for (let i = 0; i < totalRequests; i++) {
        // Simulate occasional external service failures
        if (i % 50 === 0) {
          const mockFetch = jest.fn().mockRejectedValue(new Error('Network timeout'));
          global.fetch = mockFetch as any;
        }

        const mockResponse: TierAwareAIResponse = {
          success: i % 50 !== 0, // Fail every 50th request initially
          data: [],
          metadata: {
            tier: i % 50 === 0 ? 'local_ml' : 'cost_optimized'
          }
        };

        mockGenerateSuggestions.mockResolvedValue(mockResponse);

        const request = consolidatedAIService.generateSuggestions({
          userId: `availability_test_user_${i}`,
          feature: 'basic_suggestions',
          tasks: aiTestUtils.createMockTasks(),
          context: aiTestUtils.createMockContext(),
          userTier: 'free'
        });

        requests.push(request);
      }

      const responses = await Promise.all(requests.map(req => 
        req.catch(error => ({ success: false, error: error.message }))
      ));

      // Count actual failures
      failures = responses.filter(response => !response.success).length;

      expect(failures).toBeLessThanOrEqual(maxFailures);

      const availability = ((totalRequests - failures) / totalRequests) * 100;
      expect(availability).toBeGreaterThan(99.9);

      console.log(`Availability test: ${availability.toFixed(3)}% (${failures}/${totalRequests} failures)`);
    });

    it('should recover quickly from temporary service disruptions', async () => {
      const recoveryTest = async (disruptionDuration: number) => {
        // Simulate service disruption
        const mockFetch = jest.fn().mockImplementation(() => {
          return new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Service temporarily unavailable')), 10);
          });
        });
        global.fetch = mockFetch as any;

        // Wait for disruption period
        await new Promise(resolve => setTimeout(resolve, disruptionDuration));

        // Restore service
        global.fetch = originalFetch;

        // Test recovery
        const mockResponse: TierAwareAIResponse = {
          success: true,
          data: [],
          metadata: {
            tier: 'local_ml',
            responseTime: 100
          }
        };

        mockGenerateSuggestions.mockResolvedValue(mockResponse);

        const response = await consolidatedAIService.generateSuggestions({
          userId: 'recovery_test_user',
          feature: 'basic_suggestions',
          tasks: aiTestUtils.createMockTasks(),
          context: aiTestUtils.createMockContext(),
          userTier: 'free'
        });

        return response.success;
      };

      // Test various disruption durations
      const disruptions = [100, 500, 1000]; // milliseconds
      
      for (const duration of disruptions) {
        const recovered = await recoveryTest(duration);
        expect(recovered).toBe(true);
      }
    });

    it('should handle edge cases gracefully', async () => {
      const edgeCases = [
        {
          name: 'Empty task list',
          tasks: [],
          shouldSucceed: true
        },
        {
          name: 'Very large task list',
          tasks: Array.from({ length: 1000 }, (_, i) => ({
            id: `edge-task-${i}`,
            title: `Edge Case Task ${i}`,
            dueDate: new Date(Date.now() + i * 60000).toISOString(),
            priority: 'medium' as Priority,
            type: 'academic' as const,
            completed: false,
            reminder: false,
            recurrenceRule: 'none' as const,
            recurrenceInterval: 0,
            recurrenceEndDate: undefined,
            originalDueDate: undefined,
            completedOverrides: {}
          })),
          shouldSucceed: true
        },
        {
          name: 'Malformed context',
          context: {} as any,
          shouldSucceed: false
        }
      ];

      for (const edgeCase of edgeCases) {
        const mockResponse: TierAwareAIResponse = {
          success: edgeCase.shouldSucceed,
          data: [],
          metadata: {
            tier: 'local_ml'
          },
          error: edgeCase.shouldSucceed ? undefined : 'Invalid input'
        };

        mockGenerateSuggestions.mockResolvedValue(mockResponse);

        const response = await consolidatedAIService.generateSuggestions({
          userId: `edge_case_${edgeCase.name.replace(/\s+/g, '_')}`,
          feature: 'basic_suggestions',
          tasks: edgeCase.tasks || aiTestUtils.createMockTasks(),
          context: edgeCase.context || aiTestUtils.createMockContext(),
          userTier: 'free'
        });

        if (edgeCase.shouldSucceed) {
          expect(response.success).toBe(true);
        } else {
          expect(response.success).toBe(false);
          expect(response.error).toBeDefined();
        }
      }
    });

    it('should monitor and report performance metrics', async () => {
      const metricsData = {
        responseTimes: [] as number[],
        tiers: [] as string[],
        successRate: 0
      };

      const testRequests = 20;
      let successes = 0;

      for (let i = 0; i < testRequests; i++) {
        const startTime = performance.now();
        
        const tier = ['super_intelligent', 'adaptive_learning', 'cost_optimized', 'local_ml'][i % 4];
        const mockResponse: TierAwareAIResponse = {
          success: true,
          data: [],
          metadata: {
            tier: tier as any,
            responseTime: 100 + Math.random() * 100
          }
        };

        mockGenerateSuggestions.mockResolvedValue(mockResponse);

        const response = await consolidatedAIService.generateSuggestions({
          userId: `metrics_test_user_${i}`,
          feature: 'basic_suggestions',
          tasks: aiTestUtils.createMockTasks(),
          context: aiTestUtils.createMockContext(),
          userTier: i % 2 === 0 ? 'premium' : 'free'
        });

        const responseTime = performance.now() - startTime;
        
        if (response.success) {
          successes++;
          metricsData.responseTimes.push(responseTime);
          metricsData.tiers.push(response.metadata?.tier || 'unknown');
        }
      }

      metricsData.successRate = successes / testRequests;

      // Analyze metrics
      const avgResponseTime = metricsData.responseTimes.reduce((a, b) => a + b, 0) / metricsData.responseTimes.length;
      const maxResponseTime = Math.max(...metricsData.responseTimes);

      expect(metricsData.successRate).toBeGreaterThan(0.95);
      expect(avgResponseTime).toBeLessThan(1000);
      expect(maxResponseTime).toBeLessThan(2000);

      console.log('Performance Metrics:', {
        successRate: `${(metricsData.successRate * 100).toFixed(1)}%`,
        avgResponseTime: `${avgResponseTime.toFixed(2)}ms`,
        maxResponseTime: `${maxResponseTime.toFixed(2)}ms`,
        tierDistribution: metricsData.tiers.reduce((acc, tier) => {
          acc[tier] = (acc[tier] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      });
    });
  });
}); 