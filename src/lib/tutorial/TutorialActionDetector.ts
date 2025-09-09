'use client';

import { TutorialManager } from './TutorialManager';
import { TutorialErrorHandler } from './TutorialErrorHandler';
import { TutorialActionDetectionConfig, TUTORIAL_ERROR_CODES } from './types';

interface ActionListener {
  cleanup: () => void;
  timeout?: NodeJS.Timeout;
}

export class TutorialActionDetector {
  private static instance: TutorialActionDetector;
  private tutorialManager: TutorialManager;
  private errorHandler: TutorialErrorHandler;
  private userId: string | null = null;
  private activeListeners: Map<string, ActionListener> = new Map();
  private actionTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private retryAttempts: Map<string, number> = new Map();
  private maxRetries = 3;
  private defaultTimeout = 30000; // 30 seconds

  private constructor() {
    this.tutorialManager = TutorialManager.getInstance();
    this.errorHandler = TutorialErrorHandler.getInstance();
  }

  public static getInstance(): TutorialActionDetector {
    if (!TutorialActionDetector.instance) {
      TutorialActionDetector.instance = new TutorialActionDetector();
    }
    return TutorialActionDetector.instance;
  }

  /**
   * Initialize action detection for a user
   */
  public initialize(userId: string): void {
    this.userId = userId;
    this.cleanup(); // Clean up any existing listeners
    this.setupGlobalActionListeners();
  }

  /**
   * Clean up all listeners and timeouts
   */
  public cleanup(): void {
    // Clear all active listeners
    this.activeListeners.forEach((listener) => {
      listener.cleanup();
      if (listener.timeout) {
        clearTimeout(listener.timeout);
      }
    });
    this.activeListeners.clear();

    // Clear action timeouts
    this.actionTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.actionTimeouts.clear();

    // Reset retry attempts
    this.retryAttempts.clear();
  }

  /**
   * Setup robust action detection with multiple fallback strategies
   */
  public async setupActionDetection(
    action: string,
    config: TutorialActionDetectionConfig
  ): Promise<void> {
    if (this.activeListeners.has(action)) {
      this.cleanup();
    }

    const listeners: (() => void)[] = [];
    let actionCompleted = false;

    // Primary detection strategy
    const primaryListeners = this.setupPrimaryDetection(action, config, () => {
      if (!actionCompleted) {
        actionCompleted = true;
        this.handleActionCompleted(action);
      }
    });
    listeners.push(...primaryListeners);

    // Fallback detection strategy
    if (config.fallbackSelectors) {
      const fallbackListeners = this.setupFallbackDetection(action, config, () => {
        if (!actionCompleted) {
          actionCompleted = true;
          this.handleActionCompleted(action);
        }
      });
      listeners.push(...fallbackListeners);
    }

    // Timeout handling
    const timeout = setTimeout(() => {
      if (!actionCompleted) {
        this.handleActionTimeout(action, config);
      }
    }, config.timeout || this.defaultTimeout);

    // Store listener info for cleanup
    this.activeListeners.set(action, {
      cleanup: () => {
        listeners.forEach(cleanup => cleanup());
        clearTimeout(timeout);
      },
      timeout,
    });

    // Set action timeout
    this.actionTimeouts.set(action, timeout);
  }

  /**
   * Setup primary action detection
   */
  private setupPrimaryDetection(
    action: string,
    config: TutorialActionDetectionConfig,
    onComplete: () => void
  ): (() => void)[] {
    const cleanupFunctions: (() => void)[] = [];

    // DOM event listeners
    config.events.forEach(eventType => {
      const handler = (event: Event) => {
        if (this.isTargetElement(event.target as Element, config.selectors)) {
          onComplete();
        }
      };

      document.addEventListener(eventType, handler, { passive: true });
      cleanupFunctions.push(() => document.removeEventListener(eventType, handler));
    });

    // Custom event listeners
    if (config.customEventName) {
      const customHandler = () => onComplete();
      window.addEventListener(config.customEventName, customHandler);
      cleanupFunctions.push(() => window.removeEventListener(config.customEventName!, customHandler));
    }

    // Mutation observer for dynamic content
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          const addedNodes = Array.from(mutation.addedNodes);
          for (const node of addedNodes) {
            if (node instanceof Element && this.isTargetElement(node, config.selectors)) {
              // Element appeared, check if it matches our criteria
              setTimeout(() => {
                if (this.checkElementState(node, action)) {
                  onComplete();
                }
              }, 100);
            }
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    cleanupFunctions.push(() => observer.disconnect());

    return cleanupFunctions;
  }

  /**
   * Setup fallback detection strategies
   */
  private setupFallbackDetection(
    action: string,
    config: TutorialActionDetectionConfig,
    onComplete: () => void
  ): (() => void)[] {
    const cleanupFunctions: (() => void)[] = [];

    // Polling strategy as ultimate fallback
    const pollInterval = setInterval(() => {
      if (this.checkActionCompletionByPolling(action, config)) {
        onComplete();
      }
    }, 2000); // Poll every 2 seconds

    cleanupFunctions.push(() => clearInterval(pollInterval));

    // Keyboard shortcuts for accessibility
    const keyHandler = (event: KeyboardEvent) => {
      if (this.isAccessibilityShortcut(event, action)) {
        onComplete();
      }
    };

    document.addEventListener('keydown', keyHandler);
    cleanupFunctions.push(() => document.removeEventListener('keydown', keyHandler));

    return cleanupFunctions;
  }

  /**
   * Check if element matches target selectors
   */
  private isTargetElement(element: Element | null, selectors: string[]): boolean {
    if (!element) return false;

    return selectors.some(selector => {
      try {
        return element.matches(selector) || element.closest(selector) !== null;
      } catch (error) {
        console.warn(`Invalid selector: ${selector}`, error);
        return false;
      }
    });
  }

  /**
   * Check element state for specific actions
   */
  private checkElementState(element: Element, action: string): boolean {
    switch (action) {
      case 'task_created':
        return this.checkTaskCreated();
      case 'tab_click':
        return this.checkTabClicked(element);
      case 'ai_interaction':
        return this.checkAIInteraction(element);
      default:
        return true;
    }
  }

  /**
   * Check if task was created by looking for task elements
   */
  private checkTaskCreated(): boolean {
    const taskElements = document.querySelectorAll(
      '[data-testid="task-item"], .task-item, .todo-item, [class*="task"]'
    );
    return taskElements.length > 0;
  }

  /**
   * Check if tab was clicked
   */
  private checkTabClicked(element: Element): boolean {
    const tabSelectors = ['[role="tab"]', '.tab', '[data-tab]', '[class*="tab"]'];
    return this.isTargetElement(element, tabSelectors);
  }

  /**
   * Check for AI interaction
   */
  private checkAIInteraction(element: Element): boolean {
    const aiSelectors = [
      '[data-testid*="ai"]',
      '[class*="ai"]',
      '[class*="smart"]',
      '[class*="suggestion"]'
    ];
    return this.isTargetElement(element, aiSelectors);
  }

  /**
   * Polling-based completion check
   */
  private checkActionCompletionByPolling(action: string, config: TutorialActionDetectionConfig): boolean {
    switch (action) {
      case 'task_created':
        return this.checkTaskCreated();
      case 'tab_click':
        // Check if we're on the expected tab
        return this.checkCurrentTab();
      case 'ai_interaction':
        // Check for AI-related UI changes
        return this.checkAIUIChanges();
      default:
        // Generic check for element presence
        return config.selectors.some(selector => {
          try {
            return document.querySelector(selector) !== null;
          } catch {
            return false;
          }
        });
    }
  }

  /**
   * Check current tab state
   */
  private checkCurrentTab(): boolean {
    const activeTab = document.querySelector('[role="tab"][aria-selected="true"], .tab.active, .tab-active');
    return activeTab !== null;
  }

  /**
   * Check for AI UI changes
   */
  private checkAIUIChanges(): boolean {
    const aiElements = document.querySelectorAll('[data-testid*="ai"], [class*="ai-"], [class*="suggestion"]');
    return aiElements.length > 0;
  }

  /**
   * Check for accessibility shortcuts
   */
  private isAccessibilityShortcut(event: KeyboardEvent, action: string): boolean {
    // Define keyboard shortcuts for different actions
    const shortcuts = {
      'task_created': { key: 'Enter', ctrlKey: false },
      'tab_click': { key: 'Tab', ctrlKey: true },
      'skip_step': { key: 'Escape', ctrlKey: false },
    };

    const shortcut = shortcuts[action as keyof typeof shortcuts];
    if (!shortcut) return false;

    return event.key === shortcut.key && event.ctrlKey === shortcut.ctrlKey;
  }

  /**
   * Handle action completion
   */
  private async handleActionCompleted(action: string): Promise<void> {
    if (!this.userId) return;

    try {
      // Clean up listeners for this action
      const listener = this.activeListeners.get(action);
      if (listener) {
        listener.cleanup();
        this.activeListeners.delete(action);
      }

      // Clear timeout
      const timeout = this.actionTimeouts.get(action);
      if (timeout) {
        clearTimeout(timeout);
        this.actionTimeouts.delete(action);
      }

      // Reset retry count
      this.retryAttempts.delete(action);

      console.log(`Tutorial action completed: ${action}`);
      
      await this.tutorialManager.markActionCompleted(this.userId, action);
      await this.tutorialManager.resumeTutorial(this.userId);
    } catch (error) {
      console.error('Error handling action completion:', error);
      const tutorialError = this.errorHandler.createError(
        TUTORIAL_ERROR_CODES.STEP_VALIDATION_FAILED,
        `Failed to process completed action: ${action}`,
        { action, metadata: { error: error instanceof Error ? error.message : 'Unknown error' } }
      );
      
      // Try to recover
      await this.handleError(tutorialError, action);
    }
  }

  /**
   * Handle action timeout
   */
  private async handleActionTimeout(action: string, config: TutorialActionDetectionConfig): Promise<void> {
    const retryCount = this.retryAttempts.get(action) || 0;
    
    if (retryCount < this.maxRetries && config.retries !== 0) {
      // Retry the action detection
      this.retryAttempts.set(action, retryCount + 1);
      console.log(`Retrying action detection for ${action} (attempt ${retryCount + 1})`);
      
      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 2000));
      await this.setupActionDetection(action, config);
    } else {
      // Max retries reached, handle as error
      const error = this.errorHandler.createError(
        TUTORIAL_ERROR_CODES.ACTION_TIMEOUT,
        `Action '${action}' timed out after ${config.timeout || this.defaultTimeout}ms`,
        { action, metadata: { retryCount, config } }
      );

      await this.handleError(error, action);
    }
  }

  /**
   * Handle errors with recovery strategies
   */
  private async handleError(error: any, action: string): Promise<void> {
    try {
      const recovery = await this.errorHandler.handleError(error);
      
      if (recovery.shouldRecover && recovery.recoveryAction) {
        const recovered = await recovery.recoveryAction();
        if (recovered && recovery.shouldRetry) {
          // Try the action again
          const currentProgress = await this.tutorialManager.getTutorialProgress(this.userId!);
          if (currentProgress) {
            const stepConfig = this.tutorialManager.getStepConfig(currentProgress.current_step);
            if (stepConfig?.actionDetection) {
              await this.setupActionDetection(action, stepConfig.actionDetection);
            }
          }
        }
      }

      // Notify the UI about the error
      window.dispatchEvent(new CustomEvent('tutorialError', {
        detail: { error, recovery }
      }));
    } catch (recoveryError) {
      console.error('Error during recovery:', recoveryError);
    }
  }

  /**
   * Setup global action listeners for common actions
   */
  private setupGlobalActionListeners(): void {
    // Listen for common tutorial actions
    this.setupTabClickListener();
    this.setupTaskCreationListener();
    this.setupAIInteractionListener();
    this.setupConnectionsExplorationListener();
    this.setupCrashoutVisitListener();
    this.setupAchievementsViewListener();
  }

  /**
   * Setup tab click listener with improved detection
   */
  private setupTabClickListener(): void {
    const config: TutorialActionDetectionConfig = {
      selectors: ['[role="tablist"] [role="tab"]', '.tab-navigation .tab', '[data-tab]'],
      fallbackSelectors: ['[class*="tab"]', 'button[data-testid*="tab"]'],
      events: ['click', 'keydown'],
      customEventName: 'tutorialTabChange',
      timeout: 15000,
    };

    this.setupActionDetection('tab_click', config);
  }

  /**
   * Setup task creation listener with multiple detection strategies
   */
  private setupTaskCreationListener(): void {
    const config: TutorialActionDetectionConfig = {
      selectors: [
        '[data-testid="task-input"]',
        '.task-creation-form',
        '.task-input',
        'input[placeholder*="task"]',
        'input[placeholder*="todo"]'
      ],
      fallbackSelectors: ['form input[type="text"]', 'textarea'],
      events: ['submit', 'keydown'],
      customEventName: 'taskCreated',
      timeout: 60000, // Give more time for task creation
    };

    this.setupActionDetection('task_created', config);
  }

  /**
   * Setup AI interaction listener
   */
  private setupAIInteractionListener(): void {
    const config: TutorialActionDetectionConfig = {
      selectors: [
        '.ai-suggestions',
        '[data-testid="ai-suggestions"]',
        '.ai-features',
        '.smart-schedule',
        'button[data-testid*="ai"]'
      ],
      fallbackSelectors: ['[class*="ai"]', '[class*="smart"]', '[class*="suggestion"]'],
      events: ['click'],
      timeout: 30000,
    };

    this.setupActionDetection('ai_interaction', config);
  }

  /**
   * Setup connections exploration listener
   */
  private setupConnectionsExplorationListener(): void {
    const config: TutorialActionDetectionConfig = {
      selectors: ['.social-features', '.student-connections', '[data-testid="connections"]'],
      fallbackSelectors: ['[class*="social"]', '[class*="connection"]'],
      events: ['click'],
      customEventName: 'tutorialTabChange',
      timeout: 20000,
    };

    this.setupActionDetection('connections_explored', config);
  }

  /**
   * Setup crashout room visit listener
   */
  private setupCrashoutVisitListener(): void {
    const config: TutorialActionDetectionConfig = {
      selectors: ['.crashout-features', '[data-testid="crashout-room"]'],
      fallbackSelectors: ['[class*="crashout"]', '[class*="stress"]', '[class*="wellness"]'],
      events: ['click'],
      customEventName: 'tutorialTabChange',
      timeout: 20000,
    };

    this.setupActionDetection('crashout_visited', config);
  }

  /**
   * Setup achievements view listener
   */
  private setupAchievementsViewListener(): void {
    const config: TutorialActionDetectionConfig = {
      selectors: ['.gamification-features', '.achievements-display'],
      fallbackSelectors: ['[class*="achievement"]', '[class*="gamification"]', '[class*="coin"]'],
      events: ['click'],
      customEventName: 'tutorialTabChange',
      timeout: 20000,
    };

    this.setupActionDetection('achievements_viewed', config);
  }

  /**
   * Manually trigger an action completion (for testing or forced completion)
   */
  public async triggerActionCompleted(action: string): Promise<void> {
    await this.handleActionCompleted(action);
  }

  /**
   * Get current detection status
   */
  public getDetectionStatus(): {
    activeActions: string[];
    retryAttempts: Record<string, number>;
    hasTimeouts: boolean;
  } {
    return {
      activeActions: Array.from(this.activeListeners.keys()),
      retryAttempts: Object.fromEntries(this.retryAttempts),
      hasTimeouts: this.actionTimeouts.size > 0,
    };
  }
}