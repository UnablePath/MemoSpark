import { supabase } from '@/lib/supabase/client';

export type TutorialStep = 
  | 'welcome'
  | 'navigation' 
  | 'task_creation'
  | 'ai_suggestions'
  | 'social_features'
  | 'crashout_room'
  | 'achievements'
  | 'completion';

export type StuAnimationState = 
  | 'idle'
  | 'talking'
  | 'excited'
  | 'thinking'
  | 'celebrating'
  | 'sleeping'
  | 'stressed'
  | 'encouraging';

export interface TutorialProgress {
  id: string;
  user_id: string;
  current_step: TutorialStep;
  completed_steps: TutorialStep[];
  is_completed: boolean;
  is_skipped: boolean;
  step_data: Record<string, any>;
  last_seen_at: string;
  started_at: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TutorialStepConfig {
  id: TutorialStep;
  title: string;
  description: string;
  stuMessage: string;
  stuAnimation: StuAnimationState;
  duration: number; // seconds
  targetElements?: string[]; // CSS selectors for highlighting
  requiredActions?: string[]; // Actions user must complete
  skipAllowed: boolean;
  autoAdvance: boolean;
  targetTab?: number; // Which dashboard tab this step should show
  interactiveMode?: boolean; // If true, tutorial waits for user action
  waitForAction?: string; // Specific action to wait for (e.g., 'click_tab', 'create_task')
  actionInstructions?: string; // Instructions for what user should do
  contextualHelp?: {
    message: string;
    position: 'top' | 'bottom' | 'left' | 'right';
  };
}

export interface TutorialReward {
  step: TutorialStep;
  reward_type: 'coins' | 'achievement' | 'unlock';
  reward_value: number;
  reward_data: {
    message: string;
    achievement_type?: string;
  };
}

export class TutorialManager {
  private static instance: TutorialManager;
  private tutorialSteps: TutorialStepConfig[] = [
    {
      id: 'welcome',
      title: 'Welcome to MemoSpark!',
      description: 'Hi there! I\'m Stu, your friendly study companion. Let me show you around!',
      stuMessage: 'Hey! Welcome to MemoSpark! I\'m Stu, and I\'m here to help you become the best student you can be! Ready for a quick tour?',
      stuAnimation: 'excited',
      duration: 60,
      targetTab: 0, // Stay on connections tab initially
      skipAllowed: true,
      autoAdvance: false,
      contextualHelp: {
        message: 'Click on me anytime for tips and encouragement!',
        position: 'bottom'
      }
    },
    {
      id: 'navigation',
      title: 'Getting Around',
      description: 'Try clicking on the different tabs to explore MemoSpark!',
      stuMessage: 'See these tabs at the bottom? Each one unlocks amazing features! Go ahead and tap on the Tasks tab (second one) to see where the magic happens!',
      stuAnimation: 'talking',
      duration: 90,
      targetTab: 0, // Stay on connections tab to show navigation
      targetElements: ['.tab-navigation', '[role="tablist"]'],
      interactiveMode: true,
      waitForAction: 'tab_click',
      actionInstructions: 'Click on the Tasks tab (calendar icon) to continue',
      skipAllowed: true,
      autoAdvance: false,
      contextualHelp: {
        message: 'The tabs are at the bottom of your screen!',
        position: 'top'
      }
    },
    {
      id: 'task_creation',
      title: 'Create Your First Task',
      description: 'Now create your very first task! Try something like "Study math for 1 hour".',
      stuMessage: 'Perfect! You\'re now in the Tasks section. This is where productivity magic happens! Try creating your first task - maybe something like "Study math for 1 hour" or "Read chapter 5". Just type it and hit enter!',
      stuAnimation: 'encouraging',
      duration: 120,
      targetTab: 1, // Switch to tasks tab
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
      }
    },
    {
      id: 'ai_suggestions',
      title: 'AI-Powered Study Help',
      description: 'Great job creating a task! Now explore the AI features that can help optimize your study routine.',
      stuMessage: 'Awesome! You just created your first task! 🎉 Now here\'s where things get really cool - our AI can help you study smarter. Look around this Tasks tab and try interacting with any AI features you see!',
      stuAnimation: 'thinking',
      duration: 90,
      targetTab: 1, // Stay on tasks tab to show AI features
      targetElements: ['.ai-suggestions', '[data-testid="ai-suggestions"]', '.ai-features', '.smart-schedule'],
      interactiveMode: true,
      waitForAction: 'ai_interaction',
      actionInstructions: 'Explore the AI features or schedule suggestions in this tab',
      skipAllowed: true,
      autoAdvance: false,
      contextualHelp: {
        message: 'Look for AI-powered buttons, smart scheduling, or suggestion features!',
        position: 'right'
      }
    },
    {
      id: 'social_features',
      title: 'Connect with Fellow Students',
      description: 'Now let\'s go back to the Connections tab to see how you can find study buddies!',
      stuMessage: 'Amazing work with the AI features! Now let\'s head back to the Connections tab (first one) to see how you can find study buddies and connect with other students. Studying together is always better!',
      stuAnimation: 'excited',
      duration: 90,
      targetTab: 0, // Switch back to connections tab
      targetElements: ['.social-features', '.student-connections'],
      interactiveMode: true,
      waitForAction: 'connections_explored',
      actionInstructions: 'Go back to the Connections tab and explore the social features',
      skipAllowed: true,
      autoAdvance: false,
      contextualHelp: {
        message: 'Click the first tab to explore connections!',
        position: 'left'
      }
    },
    {
      id: 'crashout_room',
      title: 'Stress Relief Zone',
      description: 'Now visit the Crashout Room - your safe space for when studying gets overwhelming!',
      stuMessage: 'Great! You\'ve seen the social features. Now let\'s check out something super important - the Crashout Room! Click on the fourth tab (the spa icon) to visit your stress relief zone. Everyone needs a mental break sometimes!',
      stuAnimation: 'encouraging',
      duration: 60,
      targetTab: 3, // Switch to crashout tab
      targetElements: ['.crashout-features', '[data-testid="crashout-room"]'],
      interactiveMode: true,
      waitForAction: 'crashout_visited',
      actionInstructions: 'Visit the Crashout Room tab and explore the stress relief features',
      skipAllowed: true,
      autoAdvance: false,
      contextualHelp: {
        message: 'Mental health is just as important as academic success!',
        position: 'top'
      }
    },
    {
      id: 'achievements',
      title: 'Level Up Your Studies',
      description: 'Finally, check out the Gamification tab to see your achievements and progress!',
      stuMessage: 'Awesome! You\'ve explored the Crashout Room. Now for the fun part - let\'s see your achievements! Click on the last tab (the game controller) to see your progress, coins, and achievements. You might have already earned some just from this tutorial!',
      stuAnimation: 'celebrating',
      duration: 60,
      targetTab: 4, // Switch to gamification tab
      targetElements: ['.gamification-features', '.achievements-display'],
      interactiveMode: true,
      waitForAction: 'achievements_viewed',
      actionInstructions: 'Visit the Gamification tab to see your achievements and progress',
      skipAllowed: true,
      autoAdvance: false,
      contextualHelp: {
        message: 'Every small step counts towards your bigger goals!',
        position: 'bottom'
      }
    },
    {
      id: 'completion',
      title: 'You\'re All Set!',
      description: 'Congratulations! You\'re now ready to make the most of MemoSpark.',
      stuMessage: 'Awesome! You\'ve completed the tour and you\'re officially ready to rock your studies! I\'ll be here whenever you need encouragement or tips. You\'ve got this! 🎉',
      stuAnimation: 'celebrating',
      duration: 60,
      targetTab: 1, // End on tasks tab to encourage task creation
      skipAllowed: false,
      autoAdvance: true,
      contextualHelp: {
        message: 'Remember, I\'m always here to help you succeed!',
        position: 'bottom'
      }
    }
  ];

  public static getInstance(): TutorialManager {
    if (!TutorialManager.instance) {
      TutorialManager.instance = new TutorialManager();
    }
    return TutorialManager.instance;
  }

  /**
   * Initialize tutorial progress for a new user
   */
  async initializeTutorial(userId: string): Promise<TutorialProgress | null> {
    try {
      if (!supabase) {
        console.error('Supabase client not available');
        return null;
      }

      const { data, error } = await supabase
        .from('tutorial_progress')
        .insert({
          user_id: userId,
          current_step: 'welcome',
          completed_steps: [],
          is_completed: false,
          is_skipped: false,
          step_data: {},
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error initializing tutorial:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error initializing tutorial:', error);
      return null;
    }
  }

  /**
   * Get user's tutorial progress
   */
  async getTutorialProgress(userId: string): Promise<TutorialProgress | null> {
    try {
      if (!supabase) {
        console.error('Supabase client not available');
        return null;
      }

      const { data, error } = await supabase
        .from('tutorial_progress')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching tutorial progress:', error);
        return null;
      }

      return data || null;
    } catch (error) {
      console.error('Error fetching tutorial progress:', error);
      return null;
    }
  }

  /**
   * Update tutorial progress to next step
   */
  async advanceToNextStep(userId: string, currentStep: TutorialStep): Promise<boolean> {
    try {
      const currentStepIndex = this.tutorialSteps.findIndex(step => step.id === currentStep);
      const nextStep = currentStepIndex < this.tutorialSteps.length - 1 
        ? this.tutorialSteps[currentStepIndex + 1].id 
        : 'completion';

      // Get current progress to append to completed steps
      const currentProgress = await this.getTutorialProgress(userId);
      const completedSteps = currentProgress?.completed_steps || [];
      
      if (!supabase) {
        console.error('Supabase client not available');
        return false;
      }
      
      const { error } = await supabase
        .from('tutorial_progress')
        .update({
          current_step: nextStep,
          completed_steps: [...completedSteps, currentStep],
          last_seen_at: new Date().toISOString(),
          is_completed: nextStep === 'completion',
          completed_at: nextStep === 'completion' ? new Date().toISOString() : undefined
        })
        .eq('user_id', userId);

      if (error) {
        console.error('Error advancing tutorial step:', error);
        return false;
      }

      // Log analytics
      await this.logTutorialAction(userId, currentStep, 'completed');
      
      return true;
    } catch (error) {
      console.error('Error advancing tutorial step:', error);
      return false;
    }
  }

  /**
   * Skip the current tutorial step
   */
  async skipStep(userId: string, step: TutorialStep): Promise<boolean> {
    try {
      await this.logTutorialAction(userId, step, 'skipped');
      return await this.advanceToNextStep(userId, step);
    } catch (error) {
      console.error('Error skipping tutorial step:', error);
      return false;
    }
  }

  /**
   * Skip entire tutorial
   */
  async skipTutorial(userId: string): Promise<boolean> {
    try {
      if (!supabase) {
        console.error('Supabase client not available');
        return false;
      }

      const { error } = await supabase
        .from('tutorial_progress')
        .update({
          is_skipped: true,
          is_completed: true,
          completed_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        console.error('Error skipping tutorial:', error);
        return false;
      }

      await this.logTutorialAction(userId, 'completion', 'skipped');
      return true;
    } catch (error) {
      console.error('Error skipping tutorial:', error);
      return false;
    }
  }

  /**
   * Restart tutorial from beginning
   */
  async restartTutorial(userId: string): Promise<boolean> {
    try {
      if (!supabase) {
        console.error('Supabase client not available');
        return false;
      }

      const { error } = await supabase
        .from('tutorial_progress')
        .update({
          current_step: 'welcome',
          completed_steps: [],
          is_completed: false,
          is_skipped: false,
          step_data: {},
          started_at: new Date().toISOString(),
          completed_at: null,
          last_seen_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        console.error('Error restarting tutorial:', error);
        return false;
      }

      await this.logTutorialAction(userId, 'welcome', 'replay');
      return true;
    } catch (error) {
      console.error('Error restarting tutorial:', error);
      return false;
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
    return this.tutorialSteps;
  }

  /**
   * Check if user should see tutorial
   */
  async shouldShowTutorial(userId: string): Promise<boolean> {
    const progress = await this.getTutorialProgress(userId);
    return !progress || (!progress.is_completed && !progress.is_skipped);
  }

  /**
   * Log tutorial action for analytics
   */
  private async logTutorialAction(
    userId: string, 
    step: TutorialStep, 
    action: 'started' | 'completed' | 'skipped' | 'replay',
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      if (!supabase) {
        console.error('Supabase client not available for analytics');
        return;
      }

      await supabase
        .from('tutorial_analytics')
        .insert({
          user_id: userId,
          step,
          action,
          metadata,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error logging tutorial action:', error);
    }
  }

  /**
   * Get tutorial rewards for a step
   */
  async getTutorialRewards(step: TutorialStep): Promise<TutorialReward[]> {
    try {
      if (!supabase) {
        console.error('Supabase client not available');
        return [];
      }

      const { data, error } = await supabase
        .from('tutorial_rewards')
        .select('*')
        .eq('step', step)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching tutorial rewards:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching tutorial rewards:', error);
      return [];
    }
  }

  /**
   * Update step-specific data
   */
  async updateStepData(userId: string, stepData: Record<string, any>): Promise<boolean> {
    try {
      if (!supabase) {
        console.error('Supabase client not available');
        return false;
      }

      const { error } = await supabase
        .from('tutorial_progress')
        .update({
          step_data: stepData,
          last_seen_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating step data:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating step data:', error);
      return false;
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

        return await this.updateStepData(userId, currentStepData);
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
  async checkStepActionCompletion(userId: string): Promise<{ needsAction: boolean; actionCompleted: boolean; action?: string }> {
    try {
      const progress = await this.getTutorialProgress(userId);
      if (!progress) return { needsAction: false, actionCompleted: false };

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
      console.error('Error checking step action completion:', error);
      return { needsAction: false, actionCompleted: false };
    }
  }
} 