import { supabase } from '@/lib/supabase/client';
import { TutorialErrorHandler } from './TutorialErrorHandler';
import {
  TutorialStep,
  TutorialProgress,
  TutorialStepConfig,
  TutorialResult,
  TutorialError,
  TutorialAnalytics,
  StuAnimationState,
  TutorialConfig,
  DEFAULT_TUTORIAL_CONFIG,
  TUTORIAL_ERROR_CODES,
  TutorialActionDetectionConfig,
} from './types';

export class TutorialManager {
  private static instance: TutorialManager;
  private errorHandler: TutorialErrorHandler;
  private config: TutorialConfig;
  private analyticsQueue: TutorialAnalytics[] = [];
  private isProcessingAnalytics = false;

  private tutorialSteps: TutorialStepConfig[] = [
    {
      id: 'welcome',
      title: 'Welcome to StudySpark!',
      description: 'Hi there! I\'m Stu, your friendly study companion. Let me show you around!',
      stuMessage: 'Hey! Welcome to StudySpark! I\'m Stu, and I\'m here to help you become the best student you can be! Ready for a quick tour?',
      stuAnimation: 'excited',
      duration: 60,
      targetTab: 0,
      skipAllowed: true,
      autoAdvance: false,
      contextualHelp: {
        message: 'Click on me anytime for tips and encouragement!',
        position: 'bottom'
      },
      accessibility: {
        ariaLabel: 'Welcome to StudySpark tutorial step',
        screenReaderText: 'Welcome step of the StudySpark tutorial. Press Enter to continue or Escape to skip.',
        keyboardShortcut: 'Enter'
      },
      analytics: {
        trackInteractions: true,
        customEvents: ['tutorial_started', 'stu_clicked']
      }
    },
    {
      id: 'navigation',
      title: 'Getting Around',
      description: 'Try clicking on the different tabs to explore StudySpark!',
      stuMessage: 'See these tabs at the bottom? Each one unlocks amazing features! Go ahead and tap on the Tasks tab (second one) to see where the magic happens!',
      stuAnimation: 'talking',
      duration: 90,
      targetTab: 0,
      targetElements: ['.tab-navigation', '[role="tablist"]'],
      interactiveMode: true,
      waitForAction: 'tab_click',
      actionInstructions: 'Click on the Tasks tab (calendar icon) to continue',
      skipAllowed: true,
      autoAdvance: false,
      contextualHelp: {
        message: 'The tabs are at the bottom of your screen!',
        position: 'top'
      },
      actionDetection: {
        selectors: ['[role="tablist"] [role="tab"]', '.tab-navigation .tab', '[data-tab]'],
        fallbackSelectors: ['[class*="tab"]', 'button[data-testid*="tab"]'],
        events: ['click', 'keydown'],
        customEventName: 'tutorialTabChange',
        timeout: 15000,
        retries: 2
      },
      accessibility: {
        ariaLabel: 'Navigation tutorial step',
        screenReaderText: 'Learn to navigate between tabs. Use Tab key to move between tabs, then press Enter to select.',
        keyboardShortcut: 'Tab'
      }
    },
    {
      id: 'task_creation',
      title: 'Create Your First Task',
      description: 'Now create your very first task! Try something like "Study math for 1 hour".',
      stuMessage: 'Perfect! You\'re now in the Tasks section. This is where productivity magic happens! Try creating your first task - maybe something like "Study math for 1 hour" or "Read chapter 5". Just type it and hit enter!',
      stuAnimation: 'encouraging',
      duration: 120,
      targetTab: 1,
      targetElements: ['[data-testid="task-input"]', '.task-creation-form', '.task-input'],
      interactiveMode: true,
      waitForAction: 'task_created',
      actionInstructions: 'Create a task by typing in the input field and pressing Enter',
      requiredActions: ['create_task'],
      skipAllowed: true,
      autoAdvance: false,
      contextualHelp: {
        message: 'Look for the text input field to add your task!',
        position: 'bottom'
      },
      actionDetection: {
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
        timeout: 60000,
        retries: 3,
        requiresUserInteraction: true
      },
      accessibility: {
        ariaLabel: 'Task creation tutorial step',
        screenReaderText: 'Create your first task. Find the task input field and type your task, then press Enter.',
        keyboardShortcut: 'Enter'
      }
    },
    {
      id: 'ai_suggestions',
      title: 'AI-Powered Study Help',
      description: 'Great job creating a task! Now explore the AI features that can help optimize your study routine.',
      stuMessage: 'Awesome! You just created your first task! 🎉 Now here\'s where things get really cool - our AI can help you study smarter. Look around this Tasks tab and try interacting with any AI features you see!',
      stuAnimation: 'thinking',
      duration: 90,
      targetTab: 1,
      targetElements: ['.ai-suggestions', '[data-testid="ai-suggestions"]', '.ai-features', '.smart-schedule'],
      interactiveMode: true,
      waitForAction: 'ai_interaction',
      actionInstructions: 'Explore the AI features or schedule suggestions in this tab',
      skipAllowed: true,
      autoAdvance: false,
      contextualHelp: {
        message: 'Look for AI-powered buttons, smart scheduling, or suggestion features!',
        position: 'right'
      },
      actionDetection: {
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
        retries: 2
      },
      accessibility: {
        ariaLabel: 'AI features tutorial step',
        screenReaderText: 'Explore AI-powered study features. Look for buttons or sections related to AI suggestions or smart scheduling.',
      }
    },
    {
      id: 'social_features',
      title: 'Connect with Fellow Students',
      description: 'Now let\'s go back to the Connections tab to see how you can find study buddies!',
      stuMessage: 'Amazing work with the AI features! Now let\'s head back to the Connections tab (first one) to see how you can find study buddies and connect with other students. Studying together is always better!',
      stuAnimation: 'excited',
      duration: 90,
      targetTab: 0,
      targetElements: ['.social-features', '.student-connections'],
      interactiveMode: true,
      waitForAction: 'connections_explored',
      actionInstructions: 'Go back to the Connections tab and explore the social features',
      skipAllowed: true,
      autoAdvance: false,
      contextualHelp: {
        message: 'Click the first tab to explore connections!',
        position: 'left'
      },
      actionDetection: {
        selectors: ['.social-features', '.student-connections', '[data-testid="connections"]'],
        fallbackSelectors: ['[class*="social"]', '[class*="connection"]'],
        events: ['click'],
        customEventName: 'tutorialTabChange',
        timeout: 20000,
        retries: 2
      },
      accessibility: {
        ariaLabel: 'Social features tutorial step',
        screenReaderText: 'Explore social features and student connections. Navigate to the Connections tab.',
      }
    },
    {
      id: 'crashout_room',
      title: 'Stress Relief Zone',
      description: 'Now visit the Crashout Room - your safe space for when studying gets overwhelming!',
      stuMessage: 'Great! You\'ve seen the social features. Now let\'s check out something super important - the Crashout Room! Click on the fourth tab (the spa icon) to visit your stress relief zone. Everyone needs a mental break sometimes!',
      stuAnimation: 'encouraging',
      duration: 60,
      targetTab: 3,
      targetElements: ['.crashout-features', '[data-testid="crashout-room"]'],
      interactiveMode: true,
      waitForAction: 'crashout_visited',
      actionInstructions: 'Visit the Crashout Room tab and explore the stress relief features',
      skipAllowed: true,
      autoAdvance: false,
      contextualHelp: {
        message: 'Mental health is just as important as academic success!',
        position: 'top'
      },
      actionDetection: {
        selectors: ['.crashout-features', '[data-testid="crashout-room"]'],
        fallbackSelectors: ['[class*="crashout"]', '[class*="stress"]', '[class*="wellness"]'],
        events: ['click'],
        customEventName: 'tutorialTabChange',
        timeout: 20000,
        retries: 2
      },
      accessibility: {
        ariaLabel: 'Crashout room tutorial step',
        screenReaderText: 'Visit the Crashout Room for stress relief and mental health features. Navigate to the wellness tab.',
      }
    },
    {
      id: 'achievements',
      title: 'Level Up Your Studies',
      description: 'Finally, check out the Gamification tab to see your achievements and progress!',
      stuMessage: 'Awesome! You\'ve explored the Crashout Room. Now for the fun part - let\'s see your achievements! Click on the last tab (the game controller) to see your progress, coins, and achievements. You might have already earned some just from this tutorial!',
      stuAnimation: 'celebrating',
      duration: 60,
      targetTab: 4,
      targetElements: ['.gamification-features', '.achievements-display'],
      interactiveMode: true,
      waitForAction: 'achievements_viewed',
      actionInstructions: 'Visit the Gamification tab to see your achievements and progress',
      skipAllowed: true,
      autoAdvance: false,
      contextualHelp: {
        message: 'Every small step counts towards your bigger goals!',
        position: 'bottom'
      },
      actionDetection: {
        selectors: ['.gamification-features', '.achievements-display'],
        fallbackSelectors: ['[class*="achievement"]', '[class*="gamification"]', '[class*="coin"]'],
        events: ['click'],
        customEventName: 'tutorialTabChange',
        timeout: 20000,
        retries: 2
      },
      accessibility: {
        ariaLabel: 'Achievements tutorial step',
        screenReaderText: 'View your achievements and gamification progress. Navigate to the gamification tab.',
      }
    },
    {
      id: 'completion',
      title: 'You\'re All Set!',
      description: 'Congratulations! You\'re now ready to make the most of StudySpark.',
      stuMessage: 'Awesome! You\'ve completed the tour and you\'re officially ready to rock your studies! I\'ll be here whenever you need encouragement or tips. You\'ve got this! 🎉',
      stuAnimation: 'celebrating',
      duration: 60,
      targetTab: 1,
      skipAllowed: false,
      autoAdvance: true,
      contextualHelp: {
        message: 'Remember, I\'m always here to help you succeed!',
        position: 'bottom'
      },
      accessibility: {
        ariaLabel: 'Tutorial completion step',
        screenReaderText: 'Tutorial completed! You are now ready to use StudySpark effectively.',
      },
      analytics: {
        trackInteractions: true,
        customEvents: ['tutorial_completed', 'celebration_shown']
      }
    }
  ];

  private constructor(config: Partial<TutorialConfig> = {}) {
    this.config = { ...DEFAULT_TUTORIAL_CONFIG, ...config };
    this.errorHandler = TutorialErrorHandler.getInstance();
  }

  public static getInstance(config?: Partial<TutorialConfig>): TutorialManager {
    if (!TutorialManager.instance) {
      TutorialManager.instance = new TutorialManager(config);
    }
    return TutorialManager.instance;
  }

  /**
   * Initialize tutorial progress for a new user with enhanced error handling
   */
  async initializeTutorial(userId: string): Promise<TutorialResult<TutorialProgress>> {
    try {
      if (!supabase) {
        const error = this.errorHandler.createError(
          TUTORIAL_ERROR_CODES.INITIALIZATION_FAILED,
          'Supabase client not available',
          { metadata: { userId } }
        );
        return { success: false, error };
      }

      const { data, error: dbError } = await supabase
        .from('tutorial_progress')
        .insert({
          user_id: userId,
          current_step: 'welcome',
          completed_steps: [],
          is_completed: false,
          is_skipped: false,
          step_data: {},
          started_at: new Date().toISOString(),
          error_count: 0
        })
        .select()
        .single();

      if (dbError) {
        const error = this.errorHandler.createError(
          TUTORIAL_ERROR_CODES.DATABASE_ERROR,
          `Failed to initialize tutorial: ${dbError.message}`,
          { metadata: { userId, dbError } }
        );
        return { success: false, error };
      }

      // Log initialization analytics
      await this.logAnalytics({
        step: 'welcome',
        action: 'started',
        timestamp: new Date().toISOString(),
        metadata: { userId, initialized: true }
      });

      return { success: true, data };
    } catch (error) {
      const tutorialError = this.errorHandler.createError(
        TUTORIAL_ERROR_CODES.INITIALIZATION_FAILED,
        `Unexpected error during tutorial initialization: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { metadata: { userId, error } }
      );
      return { success: false, error: tutorialError };
    }
  }

  /**
   * Get user's tutorial progress with retry logic
   */
  async getTutorialProgress(userId: string, retries = 3): Promise<TutorialProgress | null> {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        if (!supabase) {
          throw new Error('Supabase client not available');
        }

        const { data, error } = await supabase
          .from('tutorial_progress')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        return data || null;
      } catch (error) {
        console.warn(`Attempt ${attempt + 1} failed:`, error);
        
        if (attempt === retries - 1) {
          const tutorialError = this.errorHandler.createError(
            TUTORIAL_ERROR_CODES.DATABASE_ERROR,
            `Failed to fetch tutorial progress after ${retries} attempts`,
            { metadata: { userId, error, attempts: retries } }
          );
          
          // Don't throw, just log and return null
          console.error('Final attempt failed:', tutorialError);
          return null;
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    return null;
  }

  /**
   * Update tutorial progress to next step with comprehensive error handling
   */
  async advanceToNextStep(userId: string, currentStep: TutorialStep): Promise<TutorialResult<boolean>> {
    try {
      const currentStepIndex = this.tutorialSteps.findIndex(step => step.id === currentStep);
      if (currentStepIndex === -1) {
        const error = this.errorHandler.createError(
          TUTORIAL_ERROR_CODES.INVALID_STATE,
          `Invalid current step: ${currentStep}`,
          { step: currentStep, metadata: { userId, currentStep } }
        );
        return { success: false, error };
      }

      const nextStep = currentStepIndex < this.tutorialSteps.length - 1 
        ? this.tutorialSteps[currentStepIndex + 1].id 
        : 'completion';

      // Get current progress to append to completed steps
      const currentProgress = await this.getTutorialProgress(userId);
      if (!currentProgress) {
        const error = this.errorHandler.createError(
          TUTORIAL_ERROR_CODES.INVALID_STATE,
          'No tutorial progress found for user',
          { metadata: { userId } }
        );
        return { success: false, error };
      }

      const completedSteps = currentProgress.completed_steps || [];
      
      if (!supabase) {
        const error = this.errorHandler.createError(
          TUTORIAL_ERROR_CODES.DATABASE_ERROR,
          'Supabase client not available',
          { step: currentStep, metadata: { userId } }
        );
        return { success: false, error };
      }
      
      const { error: dbError } = await supabase
        .from('tutorial_progress')
        .update({
          current_step: nextStep,
          completed_steps: [...completedSteps, currentStep],
          last_seen_at: new Date().toISOString(),
          is_completed: nextStep === 'completion',
          completed_at: nextStep === 'completion' ? new Date().toISOString() : undefined,
          error_count: 0 // Reset error count on successful advancement
        })
        .eq('user_id', userId);

      if (dbError) {
        const error = this.errorHandler.createError(
          TUTORIAL_ERROR_CODES.DATABASE_ERROR,
          `Failed to advance tutorial step: ${dbError.message}`,
          { step: currentStep, action: 'advance', metadata: { userId, nextStep, dbError } }
        );
        return { success: false, error };
      }

      // Log analytics
      await this.logAnalytics({
        step: currentStep,
        action: 'completed',
        timestamp: new Date().toISOString(),
        metadata: { userId, nextStep, completedSteps: completedSteps.length + 1 }
      });
      
      return { success: true, data: true };
    } catch (error) {
      const tutorialError = this.errorHandler.createError(
        TUTORIAL_ERROR_CODES.STEP_VALIDATION_FAILED,
        `Unexpected error advancing tutorial step: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { step: currentStep, action: 'advance', metadata: { userId, error } }
      );
      return { success: false, error: tutorialError };
    }
  }

  /**
   * Skip the current tutorial step
   */
  async skipStep(userId: string, step: TutorialStep): Promise<TutorialResult<boolean>> {
    try {
      await this.logAnalytics({
        step,
        action: 'skipped',
        timestamp: new Date().toISOString(),
        metadata: { userId }
      });

      return await this.advanceToNextStep(userId, step);
    } catch (error) {
      const tutorialError = this.errorHandler.createError(
        TUTORIAL_ERROR_CODES.STEP_VALIDATION_FAILED,
        `Failed to skip tutorial step: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { step, action: 'skip', metadata: { userId, error } }
      );
      return { success: false, error: tutorialError };
    }
  }

  /**
   * Skip entire tutorial
   */
  async skipTutorial(userId: string): Promise<TutorialResult<boolean>> {
    try {
      if (!supabase) {
        const error = this.errorHandler.createError(
          TUTORIAL_ERROR_CODES.DATABASE_ERROR,
          'Supabase client not available',
          { action: 'skip_tutorial', metadata: { userId } }
        );
        return { success: false, error };
      }

      const { error: dbError } = await supabase
        .from('tutorial_progress')
        .update({
          is_skipped: true,
          is_completed: true,
          completed_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (dbError) {
        const error = this.errorHandler.createError(
          TUTORIAL_ERROR_CODES.DATABASE_ERROR,
          `Failed to skip tutorial: ${dbError.message}`,
          { action: 'skip_tutorial', metadata: { userId, dbError } }
        );
        return { success: false, error };
      }

      await this.logAnalytics({
        step: 'completion',
        action: 'skipped',
        timestamp: new Date().toISOString(),
        metadata: { userId, skippedEntireTutorial: true }
      });

      return { success: true, data: true };
    } catch (error) {
      const tutorialError = this.errorHandler.createError(
        TUTORIAL_ERROR_CODES.STEP_VALIDATION_FAILED,
        `Unexpected error skipping tutorial: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { action: 'skip_tutorial', metadata: { userId, error } }
      );
      return { success: false, error: tutorialError };
    }
  }

  /**
   * Restart tutorial from beginning
   */
  async restartTutorial(userId: string): Promise<TutorialResult<boolean>> {
    try {
      if (!supabase) {
        const error = this.errorHandler.createError(
          TUTORIAL_ERROR_CODES.DATABASE_ERROR,
          'Supabase client not available',
          { action: 'restart', metadata: { userId } }
        );
        return { success: false, error };
      }

      const { error: dbError } = await supabase
        .from('tutorial_progress')
        .update({
          current_step: 'welcome',
          completed_steps: [],
          is_completed: false,
          is_skipped: false,
          step_data: {},
          started_at: new Date().toISOString(),
          completed_at: null,
          last_seen_at: new Date().toISOString(),
          error_count: 0,
          last_error: null
        })
        .eq('user_id', userId);

      if (dbError) {
        const error = this.errorHandler.createError(
          TUTORIAL_ERROR_CODES.DATABASE_ERROR,
          `Failed to restart tutorial: ${dbError.message}`,
          { action: 'restart', metadata: { userId, dbError } }
        );
        return { success: false, error };
      }

      await this.logAnalytics({
        step: 'welcome',
        action: 'started',
        timestamp: new Date().toISOString(),
        metadata: { userId, restarted: true }
      });

      return { success: true, data: true };
    } catch (error) {
      const tutorialError = this.errorHandler.createError(
        TUTORIAL_ERROR_CODES.INITIALIZATION_FAILED,
        `Unexpected error restarting tutorial: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { action: 'restart', metadata: { userId, error } }
      );
      return { success: false, error: tutorialError };
    }
  }

  /**
   * Get tutorial step configuration
   */
  getStepConfig(step: TutorialStep): TutorialStepConfig | null {
    return this.tutorialSteps.find(s => s.id === step) || null;
  }

  /**
   * Get all tutorial steps
   */
  getAllSteps(): TutorialStepConfig[] {
    return [...this.tutorialSteps];
  }

  /**
   * Check if user should see tutorial
   */
  async shouldShowTutorial(userId: string): Promise<boolean> {
    try {
      const progress = await this.getTutorialProgress(userId);
      return !progress || (!progress.is_completed && !progress.is_skipped);
    } catch (error) {
      // If we can't determine, err on the side of showing tutorial
      console.warn('Could not determine tutorial status:', error);
      return true;
    }
  }

  /**
   * Enhanced analytics logging with queue
   */
  private async logAnalytics(analytics: TutorialAnalytics): Promise<void> {
    if (!this.config.enableAnalytics) return;

    this.analyticsQueue.push(analytics);

    // Process queue if not already processing
    if (!this.isProcessingAnalytics) {
      this.processAnalyticsQueue();
    }
  }

  /**
   * Process analytics queue with batch processing
   */
  private async processAnalyticsQueue(): Promise<void> {
    if (this.isProcessingAnalytics || this.analyticsQueue.length === 0) {
      return;
    }

    this.isProcessingAnalytics = true;

    try {
      const batch = this.analyticsQueue.splice(0, 10); // Process in batches of 10

      if (supabase && batch.length > 0) {
        const { error } = await supabase
          .from('tutorial_analytics')
          .insert(
            batch.map(item => ({
              user_id: item.metadata?.userId || 'unknown',
              step: item.step,
              action: item.action,
              time_spent_seconds: item.timeSpent,
              interaction_count: item.interactionCount,
              metadata: item.metadata || {},
              created_at: item.timestamp
            }))
          );

        if (error) {
          console.error('Failed to log analytics:', error);
          // Put failed items back in queue for retry
          this.analyticsQueue.unshift(...batch);
        }
      }
    } catch (error) {
      console.error('Error processing analytics queue:', error);
    } finally {
      this.isProcessingAnalytics = false;

      // Continue processing if there are more items
      if (this.analyticsQueue.length > 0) {
        setTimeout(() => this.processAnalyticsQueue(), 1000);
      }
    }
  }

  /**
   * Update step-specific data with error handling
   */
  async updateStepData(userId: string, stepData: Record<string, any>): Promise<TutorialResult<boolean>> {
    try {
      if (!supabase) {
        const error = this.errorHandler.createError(
          TUTORIAL_ERROR_CODES.DATABASE_ERROR,
          'Supabase client not available',
          { action: 'update_step_data', metadata: { userId } }
        );
        return { success: false, error };
      }

      const { error: dbError } = await supabase
        .from('tutorial_progress')
        .update({
          step_data: stepData,
          last_seen_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (dbError) {
        const error = this.errorHandler.createError(
          TUTORIAL_ERROR_CODES.DATABASE_ERROR,
          `Failed to update step data: ${dbError.message}`,
          { action: 'update_step_data', metadata: { userId, stepData, dbError } }
        );
        return { success: false, error };
      }

      return { success: true, data: true };
    } catch (error) {
      const tutorialError = this.errorHandler.createError(
        TUTORIAL_ERROR_CODES.STEP_VALIDATION_FAILED,
        `Unexpected error updating step data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { action: 'update_step_data', metadata: { userId, stepData, error } }
      );
      return { success: false, error: tutorialError };
    }
  }

  /**
   * Mark a specific action as completed for the current step
   */
  async markActionCompleted(userId: string, action: string): Promise<boolean> {
    try {
      const progress = await this.getTutorialProgress(userId);
      if (!progress) return false;

      const currentStepData = progress.step_data || {};
      const completedActions = currentStepData.completedActions || [];
      
      if (!completedActions.includes(action)) {
        completedActions.push(action);
        currentStepData.completedActions = completedActions;
        currentStepData.lastActionCompleted = action;
        currentStepData.lastActionTime = new Date().toISOString();

        const result = await this.updateStepData(userId, currentStepData);
        return result.success;
      }

      return true;
    } catch (error) {
      console.error('Error marking action completed:', error);
      return false;
    }
  }

  /**
   * Check if a specific action is completed for the current step
   */
  async isActionCompleted(userId: string, action: string): Promise<boolean> {
    try {
      const progress = await this.getTutorialProgress(userId);
      if (!progress) return false;

      const completedActions = progress.step_data?.completedActions || [];
      return completedActions.includes(action);
    } catch (error) {
      console.error('Error checking action completion:', error);
      return false;
    }
  }

  /**
   * Resume tutorial after required action is completed
   */
  async resumeTutorial(userId: string): Promise<boolean> {
    try {
      // Dispatch event to show tutorial overlay again
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tutorialActionCompleted', {
          detail: { userId }
        }));
      }
      return true;
    } catch (error) {
      console.error('Error resuming tutorial:', error);
      return false;
    }
  }

  /**
   * Check if current step requires user action and if it's completed
   */
  async checkStepActionCompletion(userId: string): Promise<{ 
    needsAction: boolean; 
    actionCompleted: boolean; 
    action?: string;
    error?: TutorialError;
  }> {
    try {
      const progress = await this.getTutorialProgress(userId);
      if (!progress) {
        const error = this.errorHandler.createError(
          TUTORIAL_ERROR_CODES.INVALID_STATE,
          'No tutorial progress found',
          { action: 'check_action_completion', metadata: { userId } }
        );
        return { needsAction: false, actionCompleted: false, error };
      }

      const stepConfig = this.getStepConfig(progress.current_step);
      if (!stepConfig?.interactiveMode || !stepConfig.waitForAction) {
        return { needsAction: false, actionCompleted: true };
      }

      const actionCompleted = await this.isActionCompleted(userId, stepConfig.waitForAction);
      return {
        needsAction: true,
        actionCompleted,
        action: stepConfig.waitForAction
      };
    } catch (error) {
      const tutorialError = this.errorHandler.createError(
        TUTORIAL_ERROR_CODES.STEP_VALIDATION_FAILED,
        `Error checking step action completion: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { action: 'check_action_completion', metadata: { userId, error } }
      );
      return { needsAction: false, actionCompleted: false, error: tutorialError };
    }
  }

  /**
   * Get tutorial configuration
   */
  getConfig(): TutorialConfig {
    return { ...this.config };
  }

  /**
   * Update tutorial configuration
   */
  updateConfig(newConfig: Partial<TutorialConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get tutorial statistics
   */
  async getTutorialStats(): Promise<{
    totalUsers: number;
    completionRate: number;
    averageTimeToComplete: number;
    mostSkippedStep: string | null;
    errorStats: any;
  }> {
    try {
      if (!supabase) {
        throw new Error('Supabase client not available');
      }

      // This would require additional database queries
      // Implementation depends on your analytics requirements
      return {
        totalUsers: 0,
        completionRate: 0,
        averageTimeToComplete: 0,
        mostSkippedStep: null,
        errorStats: this.errorHandler.getErrorStats()
      };
    } catch (error) {
      console.error('Error getting tutorial stats:', error);
      return {
        totalUsers: 0,
        completionRate: 0,
        averageTimeToComplete: 0,
        mostSkippedStep: null,
        errorStats: this.errorHandler.getErrorStats()
      };
    }
  }
}