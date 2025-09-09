import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { TutorialManager } from '@/lib/tutorial/TutorialManager';
import { TutorialErrorHandler } from '@/lib/tutorial/TutorialErrorHandler';
import { TUTORIAL_ERROR_CODES } from '@/lib/tutorial/types';

// Mock Supabase
const mockSupabase = {
  from: jest.fn(() => ({
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn()
      }))
    })),
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn()
      }))
    })),
    update: jest.fn(() => ({
      eq: jest.fn()
    }))
  }))
};

jest.mock('@/lib/supabase/client', () => ({
  supabase: mockSupabase
}));

describe('TutorialManager', () => {
  let tutorialManager: TutorialManager;
  let errorHandler: TutorialErrorHandler;
  const mockUserId = 'test-user-123';

  beforeEach(() => {
    tutorialManager = TutorialManager.getInstance();
    errorHandler = TutorialErrorHandler.getInstance();
    jest.clearAllMocks();
  });

  afterEach(() => {
    errorHandler.clearErrorHistory();
  });

  describe('initializeTutorial', () => {
    it('should successfully initialize tutorial for new user', async () => {
      const mockProgressData = {
        id: 'progress-123',
        user_id: mockUserId,
        current_step: 'welcome',
        completed_steps: [],
        is_completed: false,
        is_skipped: false,
        step_data: {},
        started_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: mockProgressData,
        error: null
      });

      const result = await tutorialManager.initializeTutorial(mockUserId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockProgressData);
      expect(mockSupabase.from).toHaveBeenCalledWith('tutorial_progress');
    });

    it('should handle database error during initialization', async () => {
      const dbError = { message: 'Database connection failed', code: 'DB_ERROR' };
      
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: null,
        error: dbError
      });

      const result = await tutorialManager.initializeTutorial(mockUserId);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe(TUTORIAL_ERROR_CODES.DATABASE_ERROR);
    });

    it('should handle missing Supabase client', async () => {
      // Temporarily mock supabase as null
      jest.doMock('@/lib/supabase/client', () => ({
        supabase: null
      }));

      const result = await tutorialManager.initializeTutorial(mockUserId);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(TUTORIAL_ERROR_CODES.INITIALIZATION_FAILED);
    });
  });

  describe('getTutorialProgress', () => {
    it('should retrieve existing tutorial progress', async () => {
      const mockProgressData = {
        id: 'progress-123',
        user_id: mockUserId,
        current_step: 'navigation',
        completed_steps: ['welcome'],
        is_completed: false
      };

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: mockProgressData,
        error: null
      });

      const progress = await tutorialManager.getTutorialProgress(mockUserId);

      expect(progress).toEqual(mockProgressData);
      expect(mockSupabase.from().select().eq).toHaveBeenCalledWith('user_id', mockUserId);
    });

    it('should return null for non-existent progress', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' } // No rows returned
      });

      const progress = await tutorialManager.getTutorialProgress(mockUserId);

      expect(progress).toBeNull();
    });

    it('should retry on failure and eventually return null', async () => {
      mockSupabase.from().select().eq().single
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'));

      const progress = await tutorialManager.getTutorialProgress(mockUserId, 3);

      expect(progress).toBeNull();
      expect(mockSupabase.from).toHaveBeenCalledTimes(3);
    });
  });

  describe('advanceToNextStep', () => {
    it('should advance from welcome to navigation step', async () => {
      const mockCurrentProgress = {
        completed_steps: [],
        current_step: 'welcome'
      };

      // Mock getTutorialProgress
      jest.spyOn(tutorialManager, 'getTutorialProgress')
        .mockResolvedValue(mockCurrentProgress as any);

      mockSupabase.from().update().eq.mockResolvedValue({
        error: null
      });

      const result = await tutorialManager.advanceToNextStep(mockUserId, 'welcome');

      expect(result.success).toBe(true);
      expect(mockSupabase.from().update).toHaveBeenCalledWith({
        current_step: 'navigation',
        completed_steps: ['welcome'],
        last_seen_at: expect.any(String),
        is_completed: false,
        completed_at: undefined,
        error_count: 0
      });
    });

    it('should mark tutorial as completed on final step', async () => {
      const mockCurrentProgress = {
        completed_steps: ['welcome', 'navigation', 'task_creation', 'ai_suggestions', 'social_features', 'crashout_room'],
        current_step: 'achievements'
      };

      jest.spyOn(tutorialManager, 'getTutorialProgress')
        .mockResolvedValue(mockCurrentProgress as any);

      mockSupabase.from().update().eq.mockResolvedValue({
        error: null
      });

      const result = await tutorialManager.advanceToNextStep(mockUserId, 'achievements');

      expect(result.success).toBe(true);
      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          current_step: 'completion',
          is_completed: true,
          completed_at: expect.any(String)
        })
      );
    });

    it('should handle invalid step error', async () => {
      const result = await tutorialManager.advanceToNextStep(mockUserId, 'invalid_step' as any);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(TUTORIAL_ERROR_CODES.INVALID_STATE);
    });
  });

  describe('skipStep', () => {
    it('should skip current step and advance', async () => {
      const mockCurrentProgress = {
        completed_steps: [],
        current_step: 'welcome'
      };

      jest.spyOn(tutorialManager, 'getTutorialProgress')
        .mockResolvedValue(mockCurrentProgress as any);

      mockSupabase.from().update().eq.mockResolvedValue({
        error: null
      });

      const result = await tutorialManager.skipStep(mockUserId, 'welcome');

      expect(result.success).toBe(true);
      // Should advance to next step
      expect(mockSupabase.from().update).toHaveBeenCalled();
    });
  });

  describe('skipTutorial', () => {
    it('should mark entire tutorial as skipped and completed', async () => {
      mockSupabase.from().update().eq.mockResolvedValue({
        error: null
      });

      const result = await tutorialManager.skipTutorial(mockUserId);

      expect(result.success).toBe(true);
      expect(mockSupabase.from().update).toHaveBeenCalledWith({
        is_skipped: true,
        is_completed: true,
        completed_at: expect.any(String),
        last_seen_at: expect.any(String)
      });
    });
  });

  describe('restartTutorial', () => {
    it('should reset tutorial to initial state', async () => {
      mockSupabase.from().update().eq.mockResolvedValue({
        error: null
      });

      const result = await tutorialManager.restartTutorial(mockUserId);

      expect(result.success).toBe(true);
      expect(mockSupabase.from().update).toHaveBeenCalledWith({
        current_step: 'welcome',
        completed_steps: [],
        is_completed: false,
        is_skipped: false,
        step_data: {},
        started_at: expect.any(String),
        completed_at: null,
        last_seen_at: expect.any(String),
        error_count: 0,
        last_error: null
      });
    });
  });

  describe('getStepConfig', () => {
    it('should return correct step configuration', () => {
      const welcomeConfig = tutorialManager.getStepConfig('welcome');
      
      expect(welcomeConfig).toBeDefined();
      expect(welcomeConfig?.id).toBe('welcome');
      expect(welcomeConfig?.title).toBe('Welcome to StudySpark!');
    });

    it('should return null for invalid step', () => {
      const invalidConfig = tutorialManager.getStepConfig('invalid_step' as any);
      
      expect(invalidConfig).toBeNull();
    });
  });

  describe('shouldShowTutorial', () => {
    it('should return true for new users', async () => {
      jest.spyOn(tutorialManager, 'getTutorialProgress')
        .mockResolvedValue(null);

      const shouldShow = await tutorialManager.shouldShowTutorial(mockUserId);
      
      expect(shouldShow).toBe(true);
    });

    it('should return false for completed tutorials', async () => {
      const mockProgress = {
        is_completed: true,
        is_skipped: false
      };

      jest.spyOn(tutorialManager, 'getTutorialProgress')
        .mockResolvedValue(mockProgress as any);

      const shouldShow = await tutorialManager.shouldShowTutorial(mockUserId);
      
      expect(shouldShow).toBe(false);
    });

    it('should return false for skipped tutorials', async () => {
      const mockProgress = {
        is_completed: false,
        is_skipped: true
      };

      jest.spyOn(tutorialManager, 'getTutorialProgress')
        .mockResolvedValue(mockProgress as any);

      const shouldShow = await tutorialManager.shouldShowTutorial(mockUserId);
      
      expect(shouldShow).toBe(false);
    });

    it('should return true on error (fail-safe)', async () => {
      jest.spyOn(tutorialManager, 'getTutorialProgress')
        .mockRejectedValue(new Error('Database error'));

      const shouldShow = await tutorialManager.shouldShowTutorial(mockUserId);
      
      expect(shouldShow).toBe(true);
    });
  });

  describe('markActionCompleted', () => {
    it('should mark action as completed in step data', async () => {
      const mockProgress = {
        step_data: { completedActions: ['previous_action'] }
      };

      jest.spyOn(tutorialManager, 'getTutorialProgress')
        .mockResolvedValue(mockProgress as any);

      jest.spyOn(tutorialManager, 'updateStepData')
        .mockResolvedValue({ success: true, data: true });

      const result = await tutorialManager.markActionCompleted(mockUserId, 'new_action');

      expect(result).toBe(true);
      expect(tutorialManager.updateStepData).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          completedActions: ['previous_action', 'new_action'],
          lastActionCompleted: 'new_action',
          lastActionTime: expect.any(String)
        })
      );
    });

    it('should not duplicate already completed actions', async () => {
      const mockProgress = {
        step_data: { completedActions: ['existing_action'] }
      };

      jest.spyOn(tutorialManager, 'getTutorialProgress')
        .mockResolvedValue(mockProgress as any);

      const result = await tutorialManager.markActionCompleted(mockUserId, 'existing_action');

      expect(result).toBe(true);
      // Should not call updateStepData since action already exists
    });
  });

  describe('isActionCompleted', () => {
    it('should return true for completed action', async () => {
      const mockProgress = {
        step_data: { completedActions: ['test_action'] }
      };

      jest.spyOn(tutorialManager, 'getTutorialProgress')
        .mockResolvedValue(mockProgress as any);

      const isCompleted = await tutorialManager.isActionCompleted(mockUserId, 'test_action');

      expect(isCompleted).toBe(true);
    });

    it('should return false for non-completed action', async () => {
      const mockProgress = {
        step_data: { completedActions: ['other_action'] }
      };

      jest.spyOn(tutorialManager, 'getTutorialProgress')
        .mockResolvedValue(mockProgress as any);

      const isCompleted = await tutorialManager.isActionCompleted(mockUserId, 'test_action');

      expect(isCompleted).toBe(false);
    });

    it('should return false when no progress exists', async () => {
      jest.spyOn(tutorialManager, 'getTutorialProgress')
        .mockResolvedValue(null);

      const isCompleted = await tutorialManager.isActionCompleted(mockUserId, 'test_action');

      expect(isCompleted).toBe(false);
    });
  });

  describe('checkStepActionCompletion', () => {
    it('should return correct status for interactive step', async () => {
      const mockProgress = {
        current_step: 'navigation',
        step_data: { completedActions: ['tab_click'] }
      };

      jest.spyOn(tutorialManager, 'getTutorialProgress')
        .mockResolvedValue(mockProgress as any);

      const result = await tutorialManager.checkStepActionCompletion(mockUserId);

      expect(result.needsAction).toBe(true);
      expect(result.actionCompleted).toBe(true);
      expect(result.action).toBe('tab_click');
    });

    it('should return no action needed for non-interactive step', async () => {
      const mockProgress = {
        current_step: 'welcome'
      };

      jest.spyOn(tutorialManager, 'getTutorialProgress')
        .mockResolvedValue(mockProgress as any);

      const result = await tutorialManager.checkStepActionCompletion(mockUserId);

      expect(result.needsAction).toBe(false);
      expect(result.actionCompleted).toBe(true);
    });
  });
});
