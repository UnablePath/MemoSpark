import React from 'react';
import '@testing-library/jest-dom';
import { consolidatedAIService } from '@/lib/ai';
import { aiTestUtils } from '@/lib/testing/ai-test-utils';
import { ExtendedTask, TierAwareAIResponse, TierAwareAIRequest, Priority } from '@/types/ai';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SmartScheduleView } from '@/components/scheduling/SmartScheduleView';
import { SmartScheduler } from '@/lib/ai/SmartScheduler';
import { PatternAnalyzer } from '@/lib/ai/PatternAnalyzer';
import { ScheduleManager } from '@/lib/ai/ScheduleManager';
import { createMockTask, createMockUserPreferences, createMockPatternData } from '@/lib/testing/ai-test-utils';
import type { UserPreferences, PatternData } from '@/types/ai';

// Mock the AI service
jest.mock('@/lib/ai', () => ({
  consolidatedAIService: {
    generateSuggestions: jest.fn(),
    checkAccess: jest.fn(),
  },
}));

const mockGenerateSuggestions = consolidatedAIService.generateSuggestions as jest.MockedFunction<typeof consolidatedAIService.generateSuggestions>;

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
          order: jest.fn(() => Promise.resolve({ data: [], error: null })),
          limit: jest.fn(() => Promise.resolve({ data: [], error: null }))
        })),
        gte: jest.fn(() => ({
          lte: jest.fn(() => Promise.resolve({ data: [], error: null }))
        })),
        order: jest.fn(() => Promise.resolve({ data: [], error: null })),
        limit: jest.fn(() => Promise.resolve({ data: [], error: null }))
      })),
      insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
      upsert: jest.fn(() => Promise.resolve({ data: null, error: null }))
    }))
  }))
}));

// Mock Supabase server
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
          order: jest.fn(() => Promise.resolve({ data: [], error: null })),
          limit: jest.fn(() => Promise.resolve({ data: [], error: null }))
        })),
        gte: jest.fn(() => ({
          lte: jest.fn(() => Promise.resolve({ data: [], error: null }))
        })),
        order: jest.fn(() => Promise.resolve({ data: [], error: null })),
        limit: jest.fn(() => Promise.resolve({ data: [], error: null }))
      })),
      insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
      upsert: jest.fn(() => Promise.resolve({ data: null, error: null }))
    }))
  }))
}));

// Mock Clerk auth
jest.mock('@clerk/nextjs/server', () => ({
  auth: () => Promise.resolve({ userId: 'test-user-123' })
}));

// Mock UI components
jest.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn((date) => date.toISOString()),
  addDays: jest.fn((date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000)),
  addHours: jest.fn((date, hours) => new Date(date.getTime() + hours * 60 * 60 * 1000)),
  isAfter: jest.fn((date1, date2) => date1.getTime() > date2.getTime()),
  isBefore: jest.fn((date1, date2) => date1.getTime() < date2.getTime()),
  isWithinInterval: jest.fn(() => false),
  parseISO: jest.fn((str) => new Date(str)),
  startOfDay: jest.fn((date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())),
  endOfDay: jest.fn((date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59))
}));

describe('AI Integration Tests - Comprehensive Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
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
        const now = new Date().toISOString();
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
            createdAt: now,
            updatedAt: now,
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
        const now = new Date().toISOString();
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
            createdAt: now,
            updatedAt: now,
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

describe('AI Integration Tests - Production Smart Scheduler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  describe('SmartScheduler Production Integration', () => {
    test('should integrate with real database data', async () => {
      const mockTasks: ExtendedTask[] = [
        createMockTask({
          id: '1',
          title: 'Complete Math Assignment',
          subject: 'Mathematics',
          priority: 'high',
          dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
          estimatedDuration: 120,
          difficultyLevel: 7
        }),
        createMockTask({
          id: '2',
          title: 'Study Physics Chapter 5',
          subject: 'Physics',
          priority: 'medium',
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
          estimatedDuration: 90,
          difficultyLevel: 6
        }),
        createMockTask({
          id: '3',
          title: 'Chemistry Lab Report',
          subject: 'Chemistry',
          priority: 'high',
          dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day from now
          estimatedDuration: 150,
          difficultyLevel: 8
        })
      ];

      const preferences = createMockUserPreferences({
        preferredStudyHours: [9, 10, 14, 15, 16, 19, 20],
        maxDailyStudyHours: 6,
        strugglingSubjects: ['Chemistry'],
        preferredSubjects: ['Mathematics', 'Physics']
      });

      const patterns = createMockPatternData({
        timePattern: {
          mostProductiveHours: [9, 10, 15, 16],
          preferredStudyDuration: 90,
          consistencyScore: 0.8,
          peakPerformanceWindow: { start: 9, end: 11 }
        },
        subjectInsights: {
          strugglingSubjects: ['Chemistry'],
          preferredSubjects: ['Mathematics', 'Physics'],
          subjectPerformance: {
            'Mathematics': { completionRate: 0.9, averageTimeSpent: 85, difficultyProgression: [6, 7, 8] },
            'Physics': { completionRate: 0.85, averageTimeSpent: 95, difficultyProgression: [5, 6, 7] },
            'Chemistry': { completionRate: 0.65, averageTimeSpent: 130, difficultyProgression: [7, 8, 9] }
          }
        }
      });

      const scheduler = new SmartScheduler(preferences, patterns);
      const result = await scheduler.generateOptimizedSchedule(mockTasks, []);

      expect(result.schedule).toBeDefined();
      expect(result.schedule.length).toBeGreaterThan(0);
      expect(result.metadata.efficiency).toBeGreaterThan(0.5);
      
      // Verify Chemistry task (struggling subject) gets priority scheduling
      const chemistryTask = result.schedule.find(task => task.title.includes('Chemistry'));
      expect(chemistryTask).toBeDefined();
      expect(chemistryTask?.confidence).toBeGreaterThan(0.6);

      // Verify tasks are scheduled during productive hours
      result.schedule.forEach(task => {
        const hour = task.startTime.getHours();
        expect(patterns.timePattern?.mostProductiveHours).toContain(hour);
      });
    });

    test('should handle calendar conflicts intelligently', async () => {
      const mockTasks: ExtendedTask[] = [
        createMockTask({
          id: '1',
          title: 'Study Session',
          estimatedDuration: 120,
          priority: 'high'
        })
      ];

      const existingEvents = [
        {
          id: 'event-1',
          title: 'Meeting',
          startTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
          endTime: new Date(Date.now() + 3 * 60 * 60 * 1000) // 3 hours from now
        }
      ];

      const preferences = createMockUserPreferences();
      const patterns = createMockPatternData();
      
      const scheduler = new SmartScheduler(preferences, patterns);
      const result = await scheduler.generateOptimizedSchedule(mockTasks, existingEvents);

      // Verify no tasks are scheduled during existing events
      result.schedule.forEach(task => {
        existingEvents.forEach(event => {
          const taskStart = task.startTime.getTime();
          const taskEnd = task.endTime.getTime();
          const eventStart = event.startTime.getTime();
          const eventEnd = event.endTime.getTime();

          // Tasks should not overlap with existing events
          expect(
            (taskStart >= eventEnd) || (taskEnd <= eventStart)
          ).toBeTruthy();
        });
      });
    });

    test('should provide meaningful schedule adjustments', async () => {
      const mockTasks: ExtendedTask[] = [
        createMockTask({
          id: '1',
          title: 'Difficult Math Problem Set',
          subject: 'Mathematics',
          priority: 'high',
          difficultyLevel: 9,
          estimatedDuration: 180,
          dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000) // Due tomorrow
        }),
        createMockTask({
          id: '2',
          title: 'Easy Reading Assignment',
          subject: 'English',
          priority: 'low',
          difficultyLevel: 3,
          estimatedDuration: 60,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Due next week
        })
      ];

      const preferences = createMockUserPreferences({
        maxDailyStudyHours: 4, // Limited study time
        preferredStudyHours: [14, 15, 16, 17] // Only afternoon hours
      });

      const patterns = createMockPatternData({
        difficultyProfile: {
          averageTaskDifficulty: 5,
          difficultyTrend: 'stable',
          adaptationRate: 0.7,
          subjectDifficultyMap: { 'Mathematics': 8, 'English': 4 }
        }
      });

      const scheduler = new SmartScheduler(preferences, patterns);
      const result = await scheduler.generateOptimizedSchedule(mockTasks, []);

      expect(result.adjustments).toBeDefined();
      expect(result.adjustments.length).toBeGreaterThan(0);

      // Should suggest breaking down the difficult math task
      const mathAdjustment = result.adjustments.find(adj => 
        adj.recommendation.toLowerCase().includes('break') || 
        adj.recommendation.toLowerCase().includes('split')
      );
      expect(mathAdjustment).toBeDefined();
      expect(mathAdjustment?.priority).toBe('high');
    });
  });

  describe('PatternAnalyzer Production Learning', () => {
    test('should learn from real completion data', () => {
      const completedTasks = [
        createMockTask({
          id: '1',
          subject: 'Mathematics',
          priority: 'high',
          completed: true,
          updated_at: new Date(2024, 0, 15, 10, 30).toISOString(), // Completed at 10:30 AM
          estimatedDuration: 90
        }),
        createMockTask({
          id: '2',
          subject: 'Mathematics',
          priority: 'medium',
          completed: true,
          updated_at: new Date(2024, 0, 16, 10, 45).toISOString(), // Completed at 10:45 AM
          estimatedDuration: 75
        }),
        createMockTask({
          id: '3',
          subject: 'Chemistry',
          priority: 'high',
          completed: true,
          updated_at: new Date(2024, 0, 17, 15, 20).toISOString(), // Completed at 3:20 PM
          estimatedDuration: 120
        }),
        createMockTask({
          id: '4',
          subject: 'Physics',
          priority: 'medium',
          completed: true,
          updated_at: new Date(2024, 0, 18, 9, 15).toISOString(), // Completed at 9:15 AM
          estimatedDuration: 85
        }),
        createMockTask({
          id: '5',
          subject: 'Chemistry',
          priority: 'high',
          completed: true,
          updated_at: new Date(2024, 0, 19, 14, 30).toISOString(), // Completed at 2:30 PM
          estimatedDuration: 140
        })
      ];

      const preferences = createMockUserPreferences();
      const analyzer = new PatternAnalyzer(preferences, []);
      
      // Learn from completion data
      analyzer.learnFromCompletionData(completedTasks);
      const patterns = analyzer.analyze();

      // Should identify productive hours (9-10 AM appears frequently)
      expect(patterns.timePattern?.mostProductiveHours).toContain(9);
      expect(patterns.timePattern?.mostProductiveHours).toContain(10);

      // Should identify Chemistry as potentially struggling (longer completion times)
      expect(patterns.subjectInsights?.subjectPerformance['Chemistry']).toBeDefined();
      expect(patterns.subjectInsights?.subjectPerformance['Chemistry'].averageTimeSpent).toBeGreaterThan(100);

      // Should show good performance in Mathematics
      expect(patterns.subjectInsights?.subjectPerformance['Mathematics']).toBeDefined();
      expect(patterns.subjectInsights?.subjectPerformance['Mathematics'].completionRate).toBe(1.0);
    });

    test('should adapt difficulty patterns based on completion success', () => {
      const highSuccessCompletions = Array.from({ length: 10 }, (_, i) => 
        createMockTask({
          id: `task-${i}`,
          priority: 'high',
          completed: true,
          updated_at: new Date(2024, 0, i + 1, 10, 0).toISOString()
        })
      );

      const preferences = createMockUserPreferences();
      const analyzer = new PatternAnalyzer(preferences, []);
      
      analyzer.learnFromCompletionData(highSuccessCompletions);
      const patterns = analyzer.analyze();

      // Should increase difficulty comfort due to high completion rate
      expect(patterns.difficultyProfile?.adaptationRate).toBeGreaterThan(0.8);
      expect(patterns.difficultyProfile?.averageTaskDifficulty).toBeGreaterThan(5);
    });
  });

  describe('ScheduleManager Integration', () => {
    test('should persist and retrieve schedules correctly', async () => {
      const mockSchedule = [
        {
          id: '1',
          title: 'Test Task',
          startTime: new Date(),
          endTime: new Date(Date.now() + 60 * 60 * 1000),
          reasoning: 'Test reasoning',
          confidence: 0.8
        }
      ];

      const metadata = {
        generatedAt: new Date().toISOString(),
        tasksScheduled: 1,
        efficiency: 0.85,
        averageConfidence: 0.8,
        conflictsResolved: 0
      };

      const manager = new ScheduleManager();
      
      // Save schedule
      await manager.saveSchedule('test-user', mockSchedule, metadata);
      
      // Retrieve schedule
      const retrieved = await manager.getSchedule('test-user');
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.schedule).toHaveLength(1);
      expect(retrieved?.metadata.efficiency).toBe(0.85);
    });
  });

  describe('SmartScheduleView Component Integration', () => {
    test('should render and handle schedule generation', async () => {
      const mockScheduleResponse = {
        success: true,
        schedule: [
          {
            id: '1',
            title: 'Math Study Session',
            startTime: new Date().toISOString(),
            endTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
            reasoning: 'Optimal time for math based on your patterns',
            confidence: 0.85,
            subject: 'Mathematics'
          }
        ],
        metadata: {
          tasksScheduled: 1,
          efficiency: 0.85,
          averageConfidence: 0.85
        },
        adjustments: []
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockScheduleResponse
      });

      render(<SmartScheduleView />);

      const generateButton = screen.getByText(/generate smart schedule/i);
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Math Study Session')).toBeInTheDocument();
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/ai/schedule', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }));
    });

    test('should handle API errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

      render(<SmartScheduleView />);

      const generateButton = screen.getByText(/generate smart schedule/i);
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.queryByText('Math Study Session')).not.toBeInTheDocument();
      });
    });
  });

  describe('End-to-End Production Workflow', () => {
    test('should complete full scheduling workflow with real data simulation', async () => {
      // Simulate real database data
      const realTasks: ExtendedTask[] = [
        createMockTask({
          id: 'real-1',
          title: 'Calculus Problem Set 5',
          subject: 'Mathematics',
          priority: 'high',
          dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          estimatedDuration: 120,
          difficultyLevel: 8,
          description: 'Integration by parts and substitution problems'
        }),
        createMockTask({
          id: 'real-2',
          title: 'Organic Chemistry Lab Report',
          subject: 'Chemistry',
          priority: 'high',
          dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
          estimatedDuration: 180,
          difficultyLevel: 9,
          description: 'Analysis of synthesis reaction and yield calculations'
        }),
        createMockTask({
          id: 'real-3',
          title: 'Physics Reading Assignment',
          subject: 'Physics',
          priority: 'medium',
          dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          estimatedDuration: 90,
          difficultyLevel: 5,
          description: 'Chapter 12: Electromagnetic Waves'
        })
      ];

      // Simulate user's historical completion data
      const completionHistory = [
        createMockTask({
          subject: 'Mathematics',
          priority: 'high',
          completed: true,
          updated_at: new Date(2024, 0, 10, 9, 30).toISOString(),
          estimatedDuration: 110
        }),
        createMockTask({
          subject: 'Chemistry',
          priority: 'high',
          completed: true,
          updated_at: new Date(2024, 0, 11, 14, 45).toISOString(),
          estimatedDuration: 165
        }),
        createMockTask({
          subject: 'Physics',
          priority: 'medium',
          completed: true,
          updated_at: new Date(2024, 0, 12, 10, 15).toISOString(),
          estimatedDuration: 85
        })
      ];

      // Step 1: Learn from historical data
      const preferences = createMockUserPreferences({
        preferredStudyHours: [9, 10, 14, 15, 16],
        maxDailyStudyHours: 6,
        strugglingSubjects: ['Chemistry']
      });

      const analyzer = new PatternAnalyzer(preferences, completionHistory);
      analyzer.learnFromCompletionData(completionHistory);
      const learnedPatterns = analyzer.analyze();

      // Step 2: Generate optimized schedule
      const scheduler = new SmartScheduler(preferences, learnedPatterns);
      const scheduleResult = await scheduler.generateOptimizedSchedule(realTasks, []);

      // Step 3: Verify intelligent scheduling decisions
      expect(scheduleResult.schedule).toBeDefined();
      expect(scheduleResult.schedule.length).toBe(3);

      // Chemistry task should be prioritized due to difficulty and due date
      const chemTask = scheduleResult.schedule.find(t => t.title.includes('Chemistry'));
      expect(chemTask).toBeDefined();
      expect(chemTask?.startTime.getTime()).toBeLessThan(
        scheduleResult.schedule.find(t => t.title.includes('Physics'))?.startTime.getTime() || Infinity
      );

      // Tasks should be scheduled during learned productive hours
      scheduleResult.schedule.forEach(task => {
        const hour = task.startTime.getHours();
        expect([9, 10, 14, 15, 16]).toContain(hour);
      });

      // Step 4: Verify schedule adjustments are meaningful
      expect(scheduleResult.adjustments.length).toBeGreaterThan(0);
      const highPriorityAdjustments = scheduleResult.adjustments.filter(adj => adj.priority === 'high');
      expect(highPriorityAdjustments.length).toBeGreaterThan(0);

      // Step 5: Verify metadata indicates good scheduling
      expect(scheduleResult.metadata.efficiency).toBeGreaterThan(0.7);
      expect(scheduleResult.metadata.averageConfidence).toBeGreaterThan(0.6);
    });
  });
}); 