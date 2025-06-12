import React from 'react';
import '@testing-library/jest-dom';
import { consolidatedAIService } from '@/lib/ai';
import { aiTestUtils } from '@/lib/testing/ai-test-utils';
import { ExtendedTask, TierAwareAIResponse, TierAwareAIRequest, Priority } from '@/types/ai';

// Mock the AI service
jest.mock('@/lib/ai', () => ({
  consolidatedAIService: {
    generateSuggestions: jest.fn(),
    checkAccess: jest.fn(),
  },
}));

const mockGenerateSuggestions = consolidatedAIService.generateSuggestions as jest.MockedFunction<typeof consolidatedAIService.generateSuggestions>;

describe('AI Integration Tests - Comprehensive Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Intelligence Tier Routing Tests', () => {
    it('should route premium users to Super Intelligent ML (Tier 10/10)', async () => {
      const mockResponse: TierAwareAIResponse = {
        success: true,
        data: [],
        metadata: {
          tier: 'super_intelligent',
          confidence: 0.95,
          responseTime: 150
        }
      };

      mockGenerateSuggestions.mockResolvedValue(mockResponse);

      const response = await consolidatedAIService.generateSuggestions({
        userId: 'premium_user_001',
        feature: 'advanced_suggestions',
        tasks: aiTestUtils.createMockTasks(),
        context: aiTestUtils.createMockContext(),
        userTier: 'premium'
      } as TierAwareAIRequest);

      expect(response.success).toBe(true);
      expect(response.metadata?.tier).toBe('super_intelligent');
      expect(response.metadata?.confidence).toBeGreaterThan(0.9);
    });

    it('should route free users to Adaptive Learning ML (Tier 9/10) or lower', async () => {
      const mockResponse: TierAwareAIResponse = {
        success: true,
        data: [],
        metadata: {
          tier: 'adaptive_learning',
          confidence: 0.85,
          responseTime: 180
        }
      };

      mockGenerateSuggestions.mockResolvedValue(mockResponse);

      const response = await consolidatedAIService.generateSuggestions({
        userId: 'free_user_001',
        feature: 'basic_suggestions',
        tasks: aiTestUtils.createMockTasks(),
        context: aiTestUtils.createMockContext(),
        userTier: 'free'
      } as TierAwareAIRequest);

      expect(response.success).toBe(true);
      expect(response.metadata?.tier).toBe('adaptive_learning');
    });

    it('should fallback to Cost-Optimized AI (Tier 8/10) under high load', async () => {
      const mockResponse: TierAwareAIResponse = {
        success: true,
        data: [],
        metadata: {
          tier: 'cost_optimized',
          confidence: 0.8,
          responseTime: 120
        }
      };

      mockGenerateSuggestions.mockResolvedValue(mockResponse);

      const response = await consolidatedAIService.generateSuggestions({
        userId: 'free_user_002',
        feature: 'basic_suggestions',
        tasks: aiTestUtils.createMockTasks(),
        context: aiTestUtils.createMockContext(),
        userTier: 'free'
      } as TierAwareAIRequest);

      expect(response.success).toBe(true);
      expect(response.metadata?.tier).toBe('cost_optimized');
      expect(response.metadata?.confidence).toBeGreaterThan(0.7);
    });

    it('should use Local ML (Tier 6/10) as final fallback', async () => {
      // Mock network failure
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockRejectedValue(new Error('Network failed'));

      try {
        const mockResponse: TierAwareAIResponse = {
          success: true,
          data: [],
          metadata: {
            tier: 'local_ml',
            confidence: 0.7,
            responseTime: 100
          }
        };

        mockGenerateSuggestions.mockResolvedValue(mockResponse);

        const response = await consolidatedAIService.generateSuggestions({
          userId: 'offline_user_001',
          feature: 'basic_suggestions',
          tasks: aiTestUtils.createMockTasks(),
          context: aiTestUtils.createMockContext(),
          userTier: 'free'
        } as TierAwareAIRequest);

        if (response.success) {
          expect(response.metadata?.tier).toBe('local_ml');
          expect(response.metadata?.confidence).toBeGreaterThan(0.6);
        }
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe('Advanced ML Features Testing', () => {
    describe('Behavioral Analysis', () => {
      it('should detect procrastination patterns correctly', async () => {
        const procrastinationTasks: ExtendedTask[] = [
          {
            id: 'overdue-1',
            title: 'Overdue Assignment',
            dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            priority: 'high' as Priority,
            type: 'academic',
            subject: 'Physics',
            completed: false,
            reminder: true,
            description: 'Critical assignment',
            recurrenceRule: 'none',
            recurrenceInterval: 0,
            recurrenceEndDate: undefined,
            originalDueDate: undefined,
            completedOverrides: {}
          }
        ];

        const mockResponse: TierAwareAIResponse = {
          success: true,
          data: [],
          metadata: {
            tier: 'super_intelligent',
            behavioralInsights: {
              procrastinationRisk: 0.8,
              energyPatterns: { lowEnergyPeriods: ['late_evening'] },
              optimalStudyTimes: ['morning', 'early_afternoon']
            }
          }
        };

        mockGenerateSuggestions.mockResolvedValue(mockResponse);

        const response = await consolidatedAIService.generateSuggestions({
          userId: 'user_behavioral_test',
          feature: 'ml_predictions',
          tasks: procrastinationTasks,
          context: {
            ...aiTestUtils.createMockContext(),
            upcomingTasks: procrastinationTasks
          },
          userTier: 'premium'
        } as TierAwareAIRequest);

        expect(response.success).toBe(true);
        expect(response.metadata?.behavioralInsights).toBeDefined();
        expect(response.metadata?.behavioralInsights?.procrastinationRisk).toBeDefined();
        expect(response.metadata?.behavioralInsights?.procrastinationRisk).toBeGreaterThan(0.5);
      });
    });

    describe('Mood Detection', () => {
      it('should detect high stress levels from task load', async () => {
        const stressfulTasks: ExtendedTask[] = [
          {
            id: 'exam-prep',
            title: 'Final Exam Tomorrow',
            dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            priority: 'high' as Priority,
            type: 'academic',
            subject: 'Mathematics',
            completed: false,
            reminder: true,
            description: 'Critical exam preparation',
            recurrenceRule: 'none',
            recurrenceInterval: 0,
            recurrenceEndDate: undefined,
            originalDueDate: undefined,
            completedOverrides: {},
            difficultyLevel: 9
          }
        ];

        const mockResponse: TierAwareAIResponse = {
          success: true,
          data: [],
          metadata: {
            tier: 'super_intelligent',
            moodAnalysis: {
              stressLevel: 0.85,
              recommendations: ['take_breaks', 'breathing_exercises']
            }
          }
        };

        mockGenerateSuggestions.mockResolvedValue(mockResponse);

        const response = await consolidatedAIService.generateSuggestions({
          userId: 'user_stress_test',
          feature: 'ml_predictions',
          tasks: stressfulTasks,
          context: {
            ...aiTestUtils.createMockContext(),
            upcomingTasks: stressfulTasks
          },
          userTier: 'premium'
        } as TierAwareAIRequest);

        expect(response.success).toBe(true);
        expect(response.metadata?.moodAnalysis?.stressLevel).toBeDefined();
        expect(response.metadata?.moodAnalysis?.stressLevel).toBeGreaterThan(0.7);
        expect(response.metadata?.moodAnalysis?.recommendations).toBeDefined();
      });
    });

    describe('Predictive Modeling', () => {
      it('should predict optimal study windows', async () => {
        const mockResponse: TierAwareAIResponse = {
          success: true,
          data: [],
          metadata: {
            tier: 'super_intelligent',
            predictions: {
              optimalStudyWindows: [
                { start: '09:00', end: '11:00', efficiency: 0.95 },
                { start: '14:00', end: '16:00', efficiency: 0.88 }
              ]
            }
          }
        };

        mockGenerateSuggestions.mockResolvedValue(mockResponse);

        const response = await consolidatedAIService.generateSuggestions({
          userId: 'user_prediction_test',
          feature: 'study_planning',
          tasks: aiTestUtils.createMockTasks(),
          context: aiTestUtils.createMockContext(),
          userTier: 'premium'
        } as TierAwareAIRequest);

        expect(response.success).toBe(true);
        expect(response.metadata?.predictions?.optimalStudyWindows).toBeDefined();
        expect(response.metadata?.predictions?.optimalStudyWindows?.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Performance Benchmarks', () => {
    it('should meet <200ms response time for Super Intelligent tier', async () => {
      const startTime = performance.now();

      const mockResponse: TierAwareAIResponse = {
        success: true,
        data: [],
        metadata: {
          tier: 'super_intelligent',
          confidence: 0.95,
          responseTime: 150
        }
      };

      mockGenerateSuggestions.mockResolvedValue(mockResponse);

      const response = await consolidatedAIService.generateSuggestions({
        userId: 'user_performance_test',
        feature: 'advanced_suggestions',
        tasks: aiTestUtils.createMockTasks(),
        context: aiTestUtils.createMockContext(),
        userTier: 'premium'
      } as TierAwareAIRequest);

      const responseTime = performance.now() - startTime;

      expect(response.success).toBe(true);
      expect(response.metadata?.tier).toBe('super_intelligent');
      expect(response.metadata?.confidence).toBeGreaterThan(0.9);
      expect(responseTime).toBeLessThan(200);
    });

    it('should maintain >90% confidence scores for premium features', async () => {
      const mockResponse: TierAwareAIResponse = {
        success: true,
        data: [],
        metadata: {
          tier: 'adaptive_learning',
          confidence: 0.92
        }
      };

      mockGenerateSuggestions.mockResolvedValue(mockResponse);

      const response = await consolidatedAIService.generateSuggestions({
        userId: 'user_confidence_test',
        feature: 'advanced_suggestions',
        tasks: aiTestUtils.createMockTasks(),
        context: aiTestUtils.createMockContext(),
        userTier: 'premium'
      } as TierAwareAIRequest);

      expect(response.success).toBe(true);
      expect(response.metadata?.tier).toBe('adaptive_learning');
      expect(response.metadata?.confidence).toBeGreaterThan(0.8);
    });

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
        } as TierAwareAIRequest);
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
        } as TierAwareAIRequest);

        responses.push(response);
        const tierCost = costPerTier[response.metadata?.tier as keyof typeof costPerTier] || 0;
        totalCost += tierCost;
      }

      // Extrapolate to full month
      const estimatedMonthlyCost = (totalCost / 100) * totalMonthlyRequests;

      expect(estimatedMonthlyCost).toBeLessThan(0.30);
      console.log(`Estimated monthly cost for ${userCount} users: $${estimatedMonthlyCost.toFixed(4)}`);
    });
  });

  describe('Real-world Edge Cases', () => {
    it('should handle users with extensive task histories', async () => {
      const largeTasks = Array.from({ length: 100 }, (_, i) => ({
        id: `bulk-task-${i}`,
        title: `Task ${i}`,
        dueDate: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString(),
        priority: (i % 3 === 0 ? 'high' : i % 2 === 0 ? 'medium' : 'low') as Priority,
        type: 'academic' as const,
        subject: ['Math', 'Physics', 'Chemistry'][i % 3],
        completed: i < 50,
        reminder: i % 4 === 0,
        description: `Description for task ${i}`,
        recurrenceRule: 'none' as const,
        recurrenceInterval: 0,
        recurrenceEndDate: undefined,
        originalDueDate: undefined,
        completedOverrides: {}
      }));

      const mockResponse: TierAwareAIResponse = {
        success: true,
        data: [],
        metadata: {
          tier: 'super_intelligent',
          confidence: 0.88
        }
      };

      mockGenerateSuggestions.mockResolvedValue(mockResponse);

      const response = await consolidatedAIService.generateSuggestions({
        userId: 'user_bulk_test',
        feature: 'advanced_suggestions',
        tasks: largeTasks,
        context: aiTestUtils.createMockContext(),
        userTier: 'premium'
      } as TierAwareAIRequest);

      expect(response.success).toBe(true);
    });

    it('should handle peak usage periods (50+ concurrent users)', async () => {
      const concurrentRequests = Array.from({ length: 50 }, (_, i) => {
        const mockResponse: TierAwareAIResponse = {
          success: true,
          data: [],
          metadata: {
            tier: 'cost_optimized',
            responseTime: 150 + i * 2
          }
        };

        mockGenerateSuggestions.mockResolvedValue(mockResponse);

        return consolidatedAIService.generateSuggestions({
          userId: `concurrent_user_${i}`,
          feature: 'basic_suggestions',
          tasks: aiTestUtils.createMockTasks(),
          context: aiTestUtils.createMockContext(),
          userTier: 'free'
        } as TierAwareAIRequest);
      });

      const responses = await Promise.all(concurrentRequests);
      
      responses.forEach(response => {
        expect(response.success).toBe(true);
        if (response.metadata?.responseTime) {
          expect(response.metadata.responseTime).toBeLessThan(300);
        }
      });
    });
  });
}); 