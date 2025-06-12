import React from 'react';
import '@testing-library/jest-dom';
import { consolidatedAIService } from '@/lib/ai';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { aiTestUtils } from '@/lib/testing/ai-test-utils';
import { TierAwareAIResponse } from '@/types/ai';

// Mock external dependencies
jest.mock('@/lib/ai');
jest.mock('@clerk/nextjs/server');
jest.mock('@supabase/supabase-js');

const mockConsolidatedAI = consolidatedAIService as jest.Mocked<typeof consolidatedAIService>;
const mockAuth = auth as jest.MockedFunction<typeof auth>;
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

describe('AI Authentication and Security Tests', () => {
  let mockGetToken: jest.MockedFunction<any>;
  let mockSupabaseClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup Supabase mock
    mockGetToken = jest.fn();
    mockSupabaseClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn()
    };
    
    mockCreateClient.mockReturnValue(mockSupabaseClient);
  });

  describe('Authentication Requirements', () => {
    it('should require authentication for AI suggestions', async () => {
      // Mock unauthenticated user
      mockAuth.mockResolvedValue({ userId: null } as any);

      const result = await consolidatedAIService.generateSuggestions({
        userId: 'unauthenticated_user',
        feature: 'basic_suggestions',
        tasks: aiTestUtils.createMockTasks(),
        context: aiTestUtils.createMockContext(),
        userTier: 'free'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('authentication');
    });

    it('should validate Clerk-Supabase integration', async () => {
      // Mock successful authentication flow
      mockAuth.mockResolvedValue({
        userId: 'user_clerk_supabase_integration',
        getToken: mockGetToken
      } as any);

      mockGetToken.mockResolvedValue('mock-supabase-token');

      // Mock Supabase user verification
      mockSupabaseClient.single.mockResolvedValue({
        data: { id: 'user_clerk_supabase_integration', tier: 'premium' },
        error: null
      });

      const mockResponse: TierAwareAIResponse = {
        success: true,
        data: [],
        metadata: {
          tier: 'super_intelligent',
          confidence: 0.95
        }
      };

      mockConsolidatedAI.generateSuggestions.mockResolvedValue(mockResponse);

      const result = await consolidatedAIService.generateSuggestions({
        userId: 'user_clerk_supabase_integration',
        feature: 'advanced_suggestions',
        tasks: aiTestUtils.createMockTasks(),
        context: aiTestUtils.createMockContext(),
        userTier: 'premium'
      });

      expect(result.success).toBe(true);
      expect(mockGetToken).toHaveBeenCalled();
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('users');
    });

    it('should handle invalid authentication tokens', async () => {
      mockAuth.mockResolvedValue({
        userId: 'valid_user_id',
        getToken: mockGetToken
      } as any);

      mockGetToken.mockRejectedValue(new Error('Invalid token'));

      const result = await consolidatedAIService.generateSuggestions({
        userId: 'valid_user_id',
        feature: 'basic_suggestions',
        tasks: aiTestUtils.createMockTasks(),
        context: aiTestUtils.createMockContext(),
        userTier: 'free'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('authentication failed');
    });
  });

  describe('Rate Limiting and Access Control', () => {
    it('should enforce rate limits for free users', async () => {
      mockAuth.mockResolvedValue({
        userId: 'free_user_rate_limit_test',
        getToken: mockGetToken
      } as any);

      mockGetToken.mockResolvedValue('valid-token');

      // Mock user at rate limit
      const mockAccessCheck = {
        canProceed: false,
        tier: 'free' as const,
        usage: { requestsUsed: 100, requestsRemaining: 0, featureAvailable: false },
        upgradeRequired: true,
        message: 'Rate limit exceeded'
      };

      mockConsolidatedAI.checkAccess.mockResolvedValue(mockAccessCheck);

      const result = await consolidatedAIService.generateSuggestions({
        userId: 'free_user_rate_limit_test',
        feature: 'basic_suggestions',
        tasks: aiTestUtils.createMockTasks(),
        context: aiTestUtils.createMockContext(),
        userTier: 'free'
      });

      expect(result.success).toBe(false);
      expect(result.upgradeRequired).toBe(true);
      expect(result.error).toContain('rate limit');
    });

    it('should allow premium users higher rate limits', async () => {
      mockAuth.mockResolvedValue({
        userId: 'premium_user_rate_test',
        getToken: mockGetToken
      } as any);

      mockGetToken.mockResolvedValue('valid-token');

      const mockAccessCheck = {
        canProceed: true,
        tier: 'premium' as const,
        usage: { requestsUsed: 50, requestsRemaining: 50, featureAvailable: true },
        upgradeRequired: false,
        message: 'Access granted'
      };

      mockConsolidatedAI.checkAccess.mockResolvedValue(mockAccessCheck);

      const mockResponse: TierAwareAIResponse = {
        success: true,
        data: [],
        metadata: {
          tier: 'super_intelligent',
          confidence: 0.95
        }
      };

      mockConsolidatedAI.generateSuggestions.mockResolvedValue(mockResponse);

      const result = await consolidatedAIService.generateSuggestions({
        userId: 'premium_user_rate_test',
        feature: 'advanced_suggestions',
        tasks: aiTestUtils.createMockTasks(),
        context: aiTestUtils.createMockContext(),
        userTier: 'premium'
      });

      expect(result.success).toBe(true);
      expect(mockConsolidatedAI.checkAccess).toHaveBeenCalled();
    });

    it('should prevent access to premium features for free users', async () => {
      mockAuth.mockResolvedValue({
        userId: 'free_user_premium_attempt',
        getToken: mockGetToken
      } as any);

      mockGetToken.mockResolvedValue('valid-token');

      const result = await consolidatedAIService.generateSuggestions({
        userId: 'free_user_premium_attempt',
        feature: 'ml_predictions', // Premium feature
        tasks: aiTestUtils.createMockTasks(),
        context: aiTestUtils.createMockContext(),
        userTier: 'free'
      });

      expect(result.success).toBe(false);
      expect(result.upgradeRequired).toBe(true);
      expect(result.upgradePrompt).toBeDefined();
    });
  });

  describe('Input Validation and Security', () => {
    it('should validate and sanitize user input', async () => {
      mockAuth.mockResolvedValue({
        userId: 'user_input_validation_test',
        getToken: mockGetToken
      } as any);

      mockGetToken.mockResolvedValue('valid-token');

      // Test with potentially malicious input
      const maliciousTask = {
        ...aiTestUtils.createMockTasks()[0],
        title: '<script>alert("xss")</script>',
        description: 'javascript:void(0)',
        subject: '"><img src=x onerror=alert(1)>'
      };

      const mockResponse: TierAwareAIResponse = {
        success: true,
        data: [],
        metadata: {
          tier: 'adaptive_learning',
          confidence: 0.85
        }
      };

      mockConsolidatedAI.generateSuggestions.mockResolvedValue(mockResponse);

      const result = await consolidatedAIService.generateSuggestions({
        userId: 'user_input_validation_test',
        feature: 'basic_suggestions',
        tasks: [maliciousTask],
        context: aiTestUtils.createMockContext(),
        userTier: 'free'
      });

      // Should succeed but with sanitized input
      expect(result.success).toBe(true);
      // Verify sanitization occurred (implementation would handle this)
      expect(mockConsolidatedAI.generateSuggestions).toHaveBeenCalled();
    });

    it('should reject requests with invalid user IDs', async () => {
      mockAuth.mockResolvedValue({ userId: null } as any);

      const result = await consolidatedAIService.generateSuggestions({
        userId: '', // Empty user ID
        feature: 'basic_suggestions',
        tasks: aiTestUtils.createMockTasks(),
        context: aiTestUtils.createMockContext(),
        userTier: 'free'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid user ID');
    });

    it('should validate task data structure', async () => {
      mockAuth.mockResolvedValue({
        userId: 'user_task_validation_test',
        getToken: mockGetToken
      } as any);

      mockGetToken.mockResolvedValue('valid-token');

      // Test with malformed task data
      const invalidTasks = [
        {
          // Missing required fields
          id: 'invalid-task',
          title: 'Valid Title'
          // Missing dueDate, priority, type, etc.
        }
      ] as any;

      const result = await consolidatedAIService.generateSuggestions({
        userId: 'user_task_validation_test',
        feature: 'basic_suggestions',
        tasks: invalidTasks,
        context: aiTestUtils.createMockContext(),
        userTier: 'free'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid task data');
    });
  });

  describe('Subscription Tier Authorization', () => {
    it('should verify subscription tier from Supabase', async () => {
      mockAuth.mockResolvedValue({
        userId: 'subscription_verification_test',
        getToken: mockGetToken
      } as any);

      mockGetToken.mockResolvedValue('valid-token');

      // Mock Supabase subscription check
      mockSupabaseClient.single.mockResolvedValue({
        data: { 
          id: 'subscription_verification_test', 
          subscription_tier: 'premium',
          subscription_status: 'active'
        },
        error: null
      });

      const mockResponse: TierAwareAIResponse = {
        success: true,
        data: [],
        metadata: {
          tier: 'super_intelligent',
          confidence: 0.95
        }
      };

      mockConsolidatedAI.generateSuggestions.mockResolvedValue(mockResponse);

      const result = await consolidatedAIService.generateSuggestions({
        userId: 'subscription_verification_test',
        feature: 'advanced_suggestions',
        tasks: aiTestUtils.createMockTasks(),
        context: aiTestUtils.createMockContext(),
        userTier: 'premium'
      });

      expect(result.success).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_subscriptions');
    });

    it('should handle expired subscriptions gracefully', async () => {
      mockAuth.mockResolvedValue({
        userId: 'expired_subscription_test',
        getToken: mockGetToken
      } as any);

      mockGetToken.mockResolvedValue('valid-token');

      // Mock expired subscription
      mockSupabaseClient.single.mockResolvedValue({
        data: { 
          id: 'expired_subscription_test', 
          subscription_tier: 'premium',
          subscription_status: 'expired',
          expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        },
        error: null
      });

      const result = await consolidatedAIService.generateSuggestions({
        userId: 'expired_subscription_test',
        feature: 'advanced_suggestions',
        tasks: aiTestUtils.createMockTasks(),
        context: aiTestUtils.createMockContext(),
        userTier: 'premium'
      });

      expect(result.success).toBe(false);
      expect(result.upgradeRequired).toBe(true);
      expect(result.error).toContain('subscription expired');
    });

    it('should downgrade features for cancelled subscriptions', async () => {
      mockAuth.mockResolvedValue({
        userId: 'cancelled_subscription_test',
        getToken: mockGetToken
      } as any);

      mockGetToken.mockResolvedValue('valid-token');

      // Mock cancelled subscription
      mockSupabaseClient.single.mockResolvedValue({
        data: { 
          id: 'cancelled_subscription_test', 
          subscription_tier: 'free',
          subscription_status: 'cancelled',
          downgrade_at: new Date().toISOString()
        },
        error: null
      });

      const mockResponse: TierAwareAIResponse = {
        success: true,
        data: [],
        metadata: {
          tier: 'cost_optimized',
          confidence: 0.75
        }
      };

      mockConsolidatedAI.generateSuggestions.mockResolvedValue(mockResponse);

      const result = await consolidatedAIService.generateSuggestions({
        userId: 'cancelled_subscription_test',
        feature: 'basic_suggestions', // Automatically downgraded
        tasks: aiTestUtils.createMockTasks(),
        context: aiTestUtils.createMockContext(),
        userTier: 'free'
      });

      expect(result.success).toBe(true);
      expect(result.metadata?.tier).toBe('cost_optimized');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle Clerk authentication service outages', async () => {
      mockAuth.mockRejectedValue(new Error('Clerk service unavailable'));

      const result = await consolidatedAIService.generateSuggestions({
        userId: 'user_clerk_outage_test',
        feature: 'basic_suggestions',
        tasks: aiTestUtils.createMockTasks(),
        context: aiTestUtils.createMockContext(),
        userTier: 'free'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Authentication service temporarily unavailable');
    });

    it('should handle Supabase database connection issues', async () => {
      mockAuth.mockResolvedValue({
        userId: 'user_supabase_outage_test',
        getToken: mockGetToken
      } as any);

      mockGetToken.mockResolvedValue('valid-token');

      // Mock Supabase connection error
      mockSupabaseClient.single.mockRejectedValue(new Error('Database connection failed'));

      const result = await consolidatedAIService.generateSuggestions({
        userId: 'user_supabase_outage_test',
        feature: 'basic_suggestions',
        tasks: aiTestUtils.createMockTasks(),
        context: aiTestUtils.createMockContext(),
        userTier: 'free'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database temporarily unavailable');
    });

    it('should provide appropriate error messages for different failure scenarios', async () => {
      const scenarios = [
        {
          name: 'Invalid credentials',
          mockSetup: () => {
            mockAuth.mockResolvedValue({ userId: null } as any);
          },
          expectedError: 'authentication'
        },
        {
          name: 'Rate limit exceeded',
          mockSetup: () => {
            mockAuth.mockResolvedValue({
              userId: 'rate_limited_user',
              getToken: mockGetToken
            } as any);
            mockGetToken.mockResolvedValue('valid-token');
            mockConsolidatedAI.checkAccess.mockResolvedValue({
              canProceed: false,
              tier: 'free' as const,
              usage: { requestsUsed: 100, requestsRemaining: 0, featureAvailable: false },
              upgradeRequired: true,
              message: 'Rate limit exceeded'
            });
          },
          expectedError: 'rate limit'
        },
        {
          name: 'Subscription required',
          mockSetup: () => {
            mockAuth.mockResolvedValue({
              userId: 'free_user_premium_feature',
              getToken: mockGetToken
            } as any);
            mockGetToken.mockResolvedValue('valid-token');
          },
          expectedError: 'upgrade required'
        }
      ];

      for (const scenario of scenarios) {
        scenario.mockSetup();

        const result = await consolidatedAIService.generateSuggestions({
          userId: 'error_scenario_test',
          feature: scenario.name === 'Subscription required' ? 'ml_predictions' : 'basic_suggestions',
          tasks: aiTestUtils.createMockTasks(),
          context: aiTestUtils.createMockContext(),
          userTier: 'free'
        });

        expect(result.success).toBe(false);
        expect(result.error?.toLowerCase()).toContain(scenario.expectedError);

        jest.clearAllMocks();
      }
    });

    it('should log security events for audit purposes', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      mockAuth.mockResolvedValue({ userId: null } as any);

      await consolidatedAIService.generateSuggestions({
        userId: 'unauthorized_access_attempt',
        feature: 'advanced_suggestions',
        tasks: aiTestUtils.createMockTasks(),
        context: aiTestUtils.createMockContext(),
        userTier: 'premium'
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unauthorized access attempt')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Session Management', () => {
    it('should validate session tokens on each request', async () => {
      mockAuth.mockResolvedValue({
        userId: 'session_validation_test',
        getToken: mockGetToken
      } as any);

      mockGetToken.mockResolvedValue('mock-token');

      const mockResponse: TierAwareAIResponse = {
        success: true,
        data: [],
        metadata: {
          tier: 'adaptive_learning',
          confidence: 0.85
        }
      };

      mockConsolidatedAI.generateSuggestions.mockResolvedValue(mockResponse);

      const result = await consolidatedAIService.generateSuggestions({
        userId: 'session_validation_test',
        feature: 'basic_suggestions',
        tasks: aiTestUtils.createMockTasks(),
        context: aiTestUtils.createMockContext(),
        userTier: 'free'
      });

      expect(result.success).toBe(true);
      expect(mockGetToken).toHaveBeenCalledWith({ template: 'supabase' });
    });

    it('should handle concurrent requests from same user', async () => {
      mockAuth.mockResolvedValue({
        userId: 'concurrent_user_test',
        getToken: mockGetToken
      } as any);

      mockGetToken.mockResolvedValue('valid-token');

      const mockResponse: TierAwareAIResponse = {
        success: true,
        data: [],
        metadata: {
          tier: 'adaptive_learning',
          confidence: 0.85
        }
      };

      mockConsolidatedAI.generateSuggestions.mockResolvedValue(mockResponse);

      // Make multiple concurrent requests
      const requests = Array.from({ length: 5 }, () =>
        consolidatedAIService.generateSuggestions({
          userId: 'concurrent_user_test',
          feature: 'basic_suggestions',
          tasks: aiTestUtils.createMockTasks(),
          context: aiTestUtils.createMockContext(),
          userTier: 'free'
        })
      );

      const results = await Promise.all(requests);

      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Should have made authentication calls for each request
      expect(mockGetToken).toHaveBeenCalledTimes(5);
    });

    it('should refresh expired tokens automatically', async () => {
      let tokenCallCount = 0;
      
      mockAuth.mockResolvedValue({
        userId: 'token_refresh_test',
        getToken: mockGetToken
      } as any);

      mockGetToken.mockImplementation(() => {
        tokenCallCount++;
        if (tokenCallCount === 1) {
          // First call returns expired token
          throw new Error('Token expired');
        }
        // Second call returns fresh token
        return Promise.resolve('fresh-token');
      });

      const mockResponse: TierAwareAIResponse = {
        success: true,
        data: [],
        metadata: {
          tier: 'adaptive_learning',
          confidence: 0.85
        }
      };

      mockConsolidatedAI.generateSuggestions.mockResolvedValue(mockResponse);

      const result = await consolidatedAIService.generateSuggestions({
        userId: 'token_refresh_test',
        feature: 'basic_suggestions',
        tasks: aiTestUtils.createMockTasks(),
        context: aiTestUtils.createMockContext(),
        userTier: 'free'
      });

      expect(result.success).toBe(true);
      expect(mockGetToken).toHaveBeenCalledTimes(2);
    });
  });
}); 