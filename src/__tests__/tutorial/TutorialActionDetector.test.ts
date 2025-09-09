import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { TutorialActionDetector } from '@/lib/tutorial/TutorialActionDetector';
import { TutorialManager } from '@/lib/tutorial/TutorialManager';
import { TutorialErrorHandler } from '@/lib/tutorial/TutorialErrorHandler';

// Mock DOM methods
Object.defineProperty(window, 'addEventListener', {
  value: jest.fn(),
  writable: true
});

Object.defineProperty(window, 'removeEventListener', {
  value: jest.fn(),
  writable: true
});

Object.defineProperty(document, 'addEventListener', {
  value: jest.fn(),
  writable: true
});

Object.defineProperty(document, 'removeEventListener', {
  value: jest.fn(),
  writable: true
});

Object.defineProperty(document, 'querySelector', {
  value: jest.fn(),
  writable: true
});

Object.defineProperty(document, 'querySelectorAll', {
  value: jest.fn(),
  writable: true
});

// Mock MutationObserver
global.MutationObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  takeRecords: jest.fn()
}));

// Mock TutorialManager
jest.mock('@/lib/tutorial/TutorialManager');
jest.mock('@/lib/tutorial/TutorialErrorHandler');

describe('TutorialActionDetector', () => {
  let actionDetector: TutorialActionDetector;
  let mockTutorialManager: jest.Mocked<TutorialManager>;
  let mockErrorHandler: jest.Mocked<TutorialErrorHandler>;
  const mockUserId = 'test-user-123';

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock TutorialManager instance
    mockTutorialManager = {
      markActionCompleted: jest.fn().mockResolvedValue(true),
      resumeTutorial: jest.fn().mockResolvedValue(true),
      getTutorialProgress: jest.fn(),
      getStepConfig: jest.fn()
    } as any;

    (TutorialManager.getInstance as jest.Mock).mockReturnValue(mockTutorialManager);

    // Mock ErrorHandler instance
    mockErrorHandler = {
      createError: jest.fn().mockReturnValue({
        code: 'TEST_ERROR',
        message: 'Test error',
        recoverable: true,
        retryable: true
      }),
      handleError: jest.fn().mockResolvedValue({
        shouldRetry: true,
        shouldRecover: true,
        userMessage: 'Test recovery message'
      })
    } as any;

    (TutorialErrorHandler.getInstance as jest.Mock).mockReturnValue(mockErrorHandler);

    actionDetector = TutorialActionDetector.getInstance();
  });

  afterEach(() => {
    actionDetector.cleanup();
  });

  describe('initialization', () => {
    it('should initialize with user ID', () => {
      actionDetector.initialize(mockUserId);
      
      // Should set up global listeners
      expect(document.addEventListener).toHaveBeenCalled();
      expect(window.addEventListener).toHaveBeenCalled();
    });

    it('should cleanup existing listeners before initializing', () => {
      actionDetector.initialize(mockUserId);
      actionDetector.initialize(mockUserId); // Initialize again
      
      // Should have cleaned up and re-initialized
      expect(document.removeEventListener).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should remove all event listeners', () => {
      actionDetector.initialize(mockUserId);
      actionDetector.cleanup();
      
      expect(document.removeEventListener).toHaveBeenCalled();
      expect(window.removeEventListener).toHaveBeenCalled();
    });

    it('should clear all active listeners', () => {
      actionDetector.initialize(mockUserId);
      
      const status = actionDetector.getDetectionStatus();
      expect(status.activeActions.length).toBeGreaterThan(0);
      
      actionDetector.cleanup();
      
      const statusAfterCleanup = actionDetector.getDetectionStatus();
      expect(statusAfterCleanup.activeActions.length).toBe(0);
    });
  });

  describe('action detection setup', () => {
    beforeEach(() => {
      actionDetector.initialize(mockUserId);
    });

    it('should setup primary detection listeners', async () => {
      const config = {
        selectors: ['.test-selector'],
        events: ['click'],
        timeout: 5000
      };

      await actionDetector.setupActionDetection('test_action', config);
      
      expect(document.addEventListener).toHaveBeenCalledWith(
        'click',
        expect.any(Function),
        { passive: true }
      );
    });

    it('should setup fallback detection when configured', async () => {
      const config = {
        selectors: ['.test-selector'],
        fallbackSelectors: ['.fallback-selector'],
        events: ['click'],
        timeout: 5000
      };

      await actionDetector.setupActionDetection('test_action', config);
      
      // Should set up both primary and fallback detection
      expect(document.addEventListener).toHaveBeenCalledTimes(2); // click + keydown for fallback
    });

    it('should setup custom event listeners', async () => {
      const config = {
        selectors: ['.test-selector'],
        events: ['click'],
        customEventName: 'customTestEvent',
        timeout: 5000
      };

      await actionDetector.setupActionDetection('test_action', config);
      
      expect(window.addEventListener).toHaveBeenCalledWith(
        'customTestEvent',
        expect.any(Function)
      );
    });

    it('should setup mutation observer for dynamic content', async () => {
      const config = {
        selectors: ['.test-selector'],
        events: ['click'],
        timeout: 5000
      };

      await actionDetector.setupActionDetection('test_action', config);
      
      expect(MutationObserver).toHaveBeenCalled();
    });
  });

  describe('element matching', () => {
    beforeEach(() => {
      actionDetector.initialize(mockUserId);
    });

    it('should match elements by selector', async () => {
      // Mock element that matches selector
      const mockElement = {
        matches: jest.fn().mockReturnValue(true),
        closest: jest.fn().mockReturnValue(null)
      };

      const config = {
        selectors: ['.test-selector'],
        events: ['click'],
        timeout: 5000
      };

      await actionDetector.setupActionDetection('test_action', config);

      // Simulate click event
      const clickHandler = (document.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'click')[1];

      clickHandler({ target: mockElement });

      expect(mockElement.matches).toHaveBeenCalledWith('.test-selector');
    });

    it('should use closest selector as fallback', async () => {
      const mockElement = {
        matches: jest.fn().mockReturnValue(false),
        closest: jest.fn().mockReturnValue(document.createElement('div'))
      };

      const config = {
        selectors: ['.test-selector'],
        events: ['click'],
        timeout: 5000
      };

      await actionDetector.setupActionDetection('test_action', config);

      const clickHandler = (document.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'click')[1];

      clickHandler({ target: mockElement });

      expect(mockElement.closest).toHaveBeenCalledWith('.test-selector');
    });
  });

  describe('action completion', () => {
    beforeEach(() => {
      actionDetector.initialize(mockUserId);
    });

    it('should mark action as completed and resume tutorial', async () => {
      await actionDetector.triggerActionCompleted('test_action');

      expect(mockTutorialManager.markActionCompleted).toHaveBeenCalledWith(
        mockUserId,
        'test_action'
      );
      expect(mockTutorialManager.resumeTutorial).toHaveBeenCalledWith(mockUserId);
    });

    it('should handle errors during action completion', async () => {
      mockTutorialManager.markActionCompleted.mockRejectedValue(
        new Error('Database error')
      );

      await actionDetector.triggerActionCompleted('test_action');

      expect(mockErrorHandler.createError).toHaveBeenCalled();
    });
  });

  describe('timeout handling', () => {
    beforeEach(() => {
      actionDetector.initialize(mockUserId);
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should handle action timeout with retries', async () => {
      const config = {
        selectors: ['.test-selector'],
        events: ['click'],
        timeout: 1000,
        retries: 2
      };

      const setupPromise = actionDetector.setupActionDetection('test_action', config);
      
      // Fast-forward time to trigger timeout
      jest.advanceTimersByTime(1000);
      
      await setupPromise;

      // Should retry the action detection
      expect(setTimeout).toHaveBeenCalled();
    });

    it('should create error after max retries exceeded', async () => {
      const config = {
        selectors: ['.test-selector'],
        events: ['click'],
        timeout: 1000,
        retries: 1
      };

      await actionDetector.setupActionDetection('test_action', config);
      
      // Trigger timeout twice to exceed retries
      jest.advanceTimersByTime(1000);
      await Promise.resolve(); // Let async operations complete
      jest.advanceTimersByTime(2000);
      await Promise.resolve();

      expect(mockErrorHandler.createError).toHaveBeenCalledWith(
        'ACTION_TIMEOUT',
        expect.stringContaining('timed out'),
        expect.any(Object)
      );
    });
  });

  describe('polling-based detection', () => {
    beforeEach(() => {
      actionDetector.initialize(mockUserId);
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should check task creation by polling', () => {
      // Mock querySelector to return task elements
      (document.querySelectorAll as jest.Mock).mockReturnValue([
        document.createElement('div')
      ]);

      const config = {
        selectors: ['.task-input'],
        fallbackSelectors: ['.task-item'],
        events: ['submit'],
        timeout: 5000
      };

      actionDetector.setupActionDetection('task_created', config);

      // Fast-forward polling interval
      jest.advanceTimersByTime(2000);

      expect(document.querySelectorAll).toHaveBeenCalledWith(
        expect.stringContaining('task')
      );
    });

    it('should check current tab state', () => {
      // Mock active tab element
      (document.querySelector as jest.Mock).mockReturnValue(
        document.createElement('div')
      );

      const config = {
        selectors: ['[role="tab"]'],
        events: ['click'],
        timeout: 5000
      };

      actionDetector.setupActionDetection('tab_click', config);

      // Fast-forward polling interval
      jest.advanceTimersByTime(2000);

      expect(document.querySelector).toHaveBeenCalledWith(
        expect.stringContaining('tab')
      );
    });
  });

  describe('accessibility shortcuts', () => {
    beforeEach(() => {
      actionDetector.initialize(mockUserId);
    });

    it('should handle Enter key for task creation', async () => {
      const config = {
        selectors: ['.task-input'],
        events: ['keydown'],
        timeout: 5000
      };

      await actionDetector.setupActionDetection('task_created', config);

      const keyHandler = (document.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'keydown')[1];

      keyHandler({
        key: 'Enter',
        ctrlKey: false
      });

      // Should trigger action completion (with delay for task creation)
      expect(setTimeout).toHaveBeenCalled();
    });

    it('should handle Ctrl+Tab for tab navigation', async () => {
      const config = {
        selectors: ['[role="tab"]'],
        events: ['keydown'],
        timeout: 5000
      };

      await actionDetector.setupActionDetection('tab_click', config);

      const keyHandler = (document.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'keydown')[1];

      keyHandler({
        key: 'Tab',
        ctrlKey: true
      });

      expect(mockTutorialManager.markActionCompleted).toHaveBeenCalledWith(
        mockUserId,
        'tab_click'
      );
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      actionDetector.initialize(mockUserId);
    });

    it('should handle invalid selectors gracefully', async () => {
      const config = {
        selectors: ['invalid[selector'],
        events: ['click'],
        timeout: 5000
      };

      // Should not throw error
      await expect(
        actionDetector.setupActionDetection('test_action', config)
      ).resolves.not.toThrow();
    });

    it('should handle recovery after errors', async () => {
      const error = {
        code: 'TEST_ERROR',
        message: 'Test error',
        recoverable: true,
        retryable: true
      };

      mockErrorHandler.handleError.mockResolvedValue({
        shouldRetry: true,
        shouldRecover: true,
        recoveryAction: jest.fn().mockResolvedValue(true),
        userMessage: 'Recovering...'
      });

      // Simulate error handling
      await actionDetector['handleError'](error, 'test_action');

      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(error);
    });
  });

  describe('detection status', () => {
    beforeEach(() => {
      actionDetector.initialize(mockUserId);
    });

    it('should track active actions', async () => {
      const config = {
        selectors: ['.test-selector'],
        events: ['click'],
        timeout: 5000
      };

      await actionDetector.setupActionDetection('test_action', config);

      const status = actionDetector.getDetectionStatus();
      expect(status.activeActions).toContain('test_action');
    });

    it('should track retry attempts', async () => {
      const config = {
        selectors: ['.test-selector'],
        events: ['click'],
        timeout: 100,
        retries: 2
      };

      await actionDetector.setupActionDetection('test_action', config);

      const status = actionDetector.getDetectionStatus();
      expect(status.retryAttempts).toBeDefined();
    });

    it('should track active timeouts', async () => {
      const config = {
        selectors: ['.test-selector'],
        events: ['click'],
        timeout: 5000
      };

      await actionDetector.setupActionDetection('test_action', config);

      const status = actionDetector.getDetectionStatus();
      expect(status.hasTimeouts).toBe(true);
    });
  });
});
