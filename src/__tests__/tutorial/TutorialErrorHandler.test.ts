import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { TutorialErrorHandler } from '@/lib/tutorial/TutorialErrorHandler';
import { TUTORIAL_ERROR_CODES, TutorialErrorCode } from '@/lib/tutorial/types';

// Mock window.gtag for analytics
Object.defineProperty(window, 'gtag', {
  value: jest.fn(),
  writable: true
});

describe('TutorialErrorHandler', () => {
  let errorHandler: TutorialErrorHandler;

  beforeEach(() => {
    errorHandler = TutorialErrorHandler.getInstance();
    errorHandler.clearErrorHistory();
    jest.clearAllMocks();
  });

  afterEach(() => {
    errorHandler.clearErrorHistory();
  });

  describe('createError', () => {
    it('should create error with all required fields', () => {
      const error = errorHandler.createError(
        TUTORIAL_ERROR_CODES.NETWORK_ERROR,
        'Connection failed',
        {
          step: 'welcome',
          action: 'initialize',
          recoverable: true,
          retryable: true,
          metadata: { userId: 'test-123' }
        }
      );

      expect(error).toMatchObject({
        code: TUTORIAL_ERROR_CODES.NETWORK_ERROR,
        message: 'Connection failed',
        step: 'welcome',
        action: 'initialize',
        recoverable: true,
        retryable: true,
        timestamp: expect.any(String),
        metadata: { userId: 'test-123' }
      });
    });

    it('should use default values for optional fields', () => {
      const error = errorHandler.createError(
        TUTORIAL_ERROR_CODES.DATABASE_ERROR,
        'Database connection failed'
      );

      expect(error).toMatchObject({
        code: TUTORIAL_ERROR_CODES.DATABASE_ERROR,
        message: 'Database connection failed',
        recoverable: true,
        retryable: true,
        timestamp: expect.any(String)
      });
    });

    it('should determine recoverability based on error code', () => {
      const nonRecoverableError = errorHandler.createError(
        TUTORIAL_ERROR_CODES.USER_CANCELLED,
        'User cancelled tutorial'
      );

      expect(nonRecoverableError.recoverable).toBe(false);

      const recoverableError = errorHandler.createError(
        TUTORIAL_ERROR_CODES.NETWORK_ERROR,
        'Network issue'
      );

      expect(recoverableError.recoverable).toBe(true);
    });

    it('should determine retryability based on error code', () => {
      const retryableError = errorHandler.createError(
        TUTORIAL_ERROR_CODES.NETWORK_ERROR,
        'Network issue'
      );

      expect(retryableError.retryable).toBe(true);

      const nonRetryableError = errorHandler.createError(
        TUTORIAL_ERROR_CODES.USER_CANCELLED,
        'User cancelled'
      );

      expect(nonRetryableError.retryable).toBe(false);
    });
  });

  describe('handleError', () => {
    it('should handle network errors with retry strategy', async () => {
      const error = errorHandler.createError(
        TUTORIAL_ERROR_CODES.NETWORK_ERROR,
        'Connection failed'
      );

      const result = await errorHandler.handleError(error);

      expect(result).toMatchObject({
        shouldRetry: true,
        shouldRecover: true,
        userMessage: 'Network connection issue. We\'ll try again automatically.',
        recoveryAction: expect.any(Function)
      });
    });

    it('should handle database errors appropriately', async () => {
      const error = errorHandler.createError(
        TUTORIAL_ERROR_CODES.DATABASE_ERROR,
        'Database query failed'
      );

      const result = await errorHandler.handleError(error);

      expect(result).toMatchObject({
        shouldRetry: true,
        shouldRecover: true,
        userMessage: 'Temporary server issue. Retrying...',
        recoveryAction: expect.any(Function)
      });
    });

    it('should handle action timeouts without retry', async () => {
      const error = errorHandler.createError(
        TUTORIAL_ERROR_CODES.ACTION_TIMEOUT,
        'Action timed out'
      );

      const result = await errorHandler.handleError(error);

      expect(result).toMatchObject({
        shouldRetry: false,
        shouldRecover: true,
        userMessage: 'Taking too long? Let\'s try a different approach.',
        recoveryAction: expect.any(Function)
      });
    });

    it('should handle user cancellation without recovery', async () => {
      const error = errorHandler.createError(
        TUTORIAL_ERROR_CODES.USER_CANCELLED,
        'Tutorial cancelled by user'
      );

      const result = await errorHandler.handleError(error);

      expect(result).toMatchObject({
        shouldRetry: false,
        shouldRecover: false,
        userMessage: 'Tutorial cancelled. You can restart anytime!'
      });
    });

    it('should provide default handling for unknown error codes', async () => {
      const error = {
        code: 'UNKNOWN_ERROR' as TutorialErrorCode,
        message: 'Unknown error',
        recoverable: true,
        retryable: false,
        timestamp: new Date().toISOString()
      };

      const result = await errorHandler.handleError(error);

      expect(result).toMatchObject({
        shouldRetry: false,
        shouldRecover: true,
        userMessage: 'Something went wrong. Let\'s try again.'
      });
    });

    it('should execute recovery actions successfully', async () => {
      const error = errorHandler.createError(
        TUTORIAL_ERROR_CODES.ELEMENT_NOT_FOUND,
        'Element not found'
      );

      const result = await errorHandler.handleError(error);
      
      expect(result.recoveryAction).toBeDefined();
      
      if (result.recoveryAction) {
        const recoveryResult = await result.recoveryAction();
        expect(recoveryResult).toBe(true);
      }
    });
  });

  describe('getUserFriendlyMessage', () => {
    it('should return user-friendly messages for all error codes', () => {
      const errorCodes = Object.values(TUTORIAL_ERROR_CODES);
      
      errorCodes.forEach(code => {
        const error = errorHandler.createError(code, 'Test error');
        const message = errorHandler.getUserFriendlyMessage(error);
        
        expect(message).toBeDefined();
        expect(message.length).toBeGreaterThan(0);
        expect(message).not.toContain('undefined');
      });
    });

    it('should return default message for unknown error codes', () => {
      const error = {
        code: 'UNKNOWN_ERROR' as TutorialErrorCode,
        message: 'Unknown error',
        recoverable: true,
        retryable: false,
        timestamp: new Date().toISOString()
      };

      const message = errorHandler.getUserFriendlyMessage(error);
      
      expect(message).toBe('Something went wrong, but we\'ll figure it out!');
    });
  });

  describe('error history management', () => {
    it('should track error history', () => {
      errorHandler.createError(TUTORIAL_ERROR_CODES.NETWORK_ERROR, 'Error 1');
      errorHandler.createError(TUTORIAL_ERROR_CODES.DATABASE_ERROR, 'Error 2');

      const history = errorHandler.getErrorHistory();
      
      expect(history).toHaveLength(2);
      expect(history[0].message).toBe('Error 1');
      expect(history[1].message).toBe('Error 2');
    });

    it('should limit error history size', () => {
      // Create more errors than the max history size (50)
      for (let i = 0; i < 60; i++) {
        errorHandler.createError(
          TUTORIAL_ERROR_CODES.NETWORK_ERROR,
          `Error ${i}`
        );
      }

      const history = errorHandler.getErrorHistory();
      
      expect(history.length).toBeLessThanOrEqual(50);
      // Should keep the most recent errors
      expect(history[history.length - 1].message).toBe('Error 59');
    });

    it('should clear error history', () => {
      errorHandler.createError(TUTORIAL_ERROR_CODES.NETWORK_ERROR, 'Error 1');
      errorHandler.createError(TUTORIAL_ERROR_CODES.DATABASE_ERROR, 'Error 2');

      expect(errorHandler.getErrorHistory()).toHaveLength(2);

      errorHandler.clearErrorHistory();

      expect(errorHandler.getErrorHistory()).toHaveLength(0);
    });
  });

  describe('error statistics', () => {
    beforeEach(() => {
      // Create some test errors
      errorHandler.createError(TUTORIAL_ERROR_CODES.NETWORK_ERROR, 'Network 1');
      errorHandler.createError(TUTORIAL_ERROR_CODES.NETWORK_ERROR, 'Network 2');
      errorHandler.createError(TUTORIAL_ERROR_CODES.DATABASE_ERROR, 'Database 1');
      errorHandler.createError(TUTORIAL_ERROR_CODES.ACTION_TIMEOUT, 'Timeout 1');
      errorHandler.createError(TUTORIAL_ERROR_CODES.ACTION_TIMEOUT, 'Timeout 2');
      errorHandler.createError(TUTORIAL_ERROR_CODES.ACTION_TIMEOUT, 'Timeout 3');
    });

    it('should provide correct error statistics', () => {
      const stats = errorHandler.getErrorStats();

      expect(stats.totalErrors).toBe(6);
      expect(stats.errorsByCode).toEqual({
        [TUTORIAL_ERROR_CODES.NETWORK_ERROR]: 2,
        [TUTORIAL_ERROR_CODES.DATABASE_ERROR]: 1,
        [TUTORIAL_ERROR_CODES.ACTION_TIMEOUT]: 3
      });
      expect(stats.mostCommonError).toBe(TUTORIAL_ERROR_CODES.ACTION_TIMEOUT);
      expect(stats.recentErrors).toHaveLength(6);
    });

    it('should return null for most common error when no errors exist', () => {
      errorHandler.clearErrorHistory();
      
      const stats = errorHandler.getErrorStats();
      
      expect(stats.totalErrors).toBe(0);
      expect(stats.mostCommonError).toBeNull();
    });

    it('should limit recent errors to last 10', () => {
      errorHandler.clearErrorHistory();
      
      // Create 15 errors
      for (let i = 0; i < 15; i++) {
        errorHandler.createError(TUTORIAL_ERROR_CODES.NETWORK_ERROR, `Error ${i}`);
      }

      const stats = errorHandler.getErrorStats();
      
      expect(stats.recentErrors).toHaveLength(10);
      expect(stats.recentErrors[9].message).toBe('Error 14');
    });
  });

  describe('analytics integration', () => {
    it('should send errors to analytics in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      errorHandler.createError(
        TUTORIAL_ERROR_CODES.NETWORK_ERROR,
        'Network error for analytics'
      );

      // In development, errors should be logged to console
      expect(console.error).toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });

    it('should send errors to gtag when available', () => {
      errorHandler.createError(
        TUTORIAL_ERROR_CODES.DATABASE_ERROR,
        'Database error',
        {
          step: 'welcome',
          action: 'initialize',
          metadata: { userId: 'test-user' }
        }
      );

      expect(window.gtag).toHaveBeenCalledWith('event', 'tutorial_error', {
        error_code: TUTORIAL_ERROR_CODES.DATABASE_ERROR,
        error_message: 'Database error',
        tutorial_step: 'welcome',
        tutorial_action: 'initialize',
        recoverable: true,
        retryable: true
      });
    });

    it('should handle analytics errors gracefully', () => {
      // Mock gtag to throw an error
      (window.gtag as jest.Mock).mockImplementation(() => {
        throw new Error('Analytics error');
      });

      // Should not throw when analytics fails
      expect(() => {
        errorHandler.createError(TUTORIAL_ERROR_CODES.NETWORK_ERROR, 'Test error');
      }).not.toThrow();

      expect(console.warn).toHaveBeenCalledWith(
        'Failed to send error to analytics:',
        expect.any(Error)
      );
    });
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = TutorialErrorHandler.getInstance();
      const instance2 = TutorialErrorHandler.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should maintain state across getInstance calls', () => {
      const instance1 = TutorialErrorHandler.getInstance();
      instance1.createError(TUTORIAL_ERROR_CODES.NETWORK_ERROR, 'Test error');

      const instance2 = TutorialErrorHandler.getInstance();
      const history = instance2.getErrorHistory();

      expect(history).toHaveLength(1);
      expect(history[0].message).toBe('Test error');
    });
  });
});
