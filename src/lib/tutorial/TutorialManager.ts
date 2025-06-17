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
      title: 'Welcome to StudySpark!',
      description: 'Hi there! I\'m Stu, your friendly study companion. Let me show you around!',
      stuMessage: 'Hey! Welcome to StudySpark! I\'m Stu, and I\'m here to help you become the best student you can be! Ready for a quick tour?',
      stuAnimation: 'excited',
      duration: 30,
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
      description: 'Let me show you how to navigate through different sections of StudySpark.',
      stuMessage: 'See these tabs? They\'re your gateway to becoming organized! Each one has special tools to help you succeed.',
      stuAnimation: 'talking',
      duration: 45,
      targetElements: ['.tab-navigation', '[role="tablist"]'],
      skipAllowed: true,
      autoAdvance: false,
      contextualHelp: {
        message: 'Try clicking on different tabs to explore!',
        position: 'top'
      }
    },
    {
      id: 'task_creation',
      title: 'Create Your First Task',
      description: 'Tasks are the building blocks of your productivity. Let\'s create one together!',
      stuMessage: 'This is where the magic happens! Creating tasks helps you stay organized and focused. Go ahead, give it a try!',
      stuAnimation: 'encouraging',
      duration: 90,
      targetElements: ['[data-testid="task-input"]', '.task-creation-form'],
      requiredActions: ['create_task'],
      skipAllowed: true,
      autoAdvance: false,
      contextualHelp: {
        message: 'Type something like "Study math for 1 hour" and hit enter!',
        position: 'bottom'
      }
    },
    {
      id: 'ai_suggestions',
      title: 'AI-Powered Study Help',
      description: 'Our AI analyzes your patterns and suggests the perfect study routine for you.',
      stuMessage: 'I have an AI friend who\'s really smart about studying! It learns how you work best and gives amazing suggestions. Pretty cool, right?',
      stuAnimation: 'thinking',
      duration: 60,
      targetElements: ['.ai-suggestions', '[data-testid="ai-suggestions"]'],
      skipAllowed: true,
      autoAdvance: false,
      contextualHelp: {
        message: 'The AI gets smarter as you use StudySpark more!',
        position: 'right'
      }
    },
    {
      id: 'social_features',
      title: 'Connect with Fellow Students',
      description: 'Study buddies make everything better! Find study partners and join groups.',
      stuMessage: 'Studying alone can be tough. That\'s why you can connect with other students here! Find study buddies, share tips, and motivate each other!',
      stuAnimation: 'excited',
      duration: 45,
      targetElements: ['.social-features', '.student-connections'],
      skipAllowed: true,
      autoAdvance: false,
      contextualHelp: {
        message: 'Building a study network is one of the best things you can do!',
        position: 'left'
      }
    },
    {
      id: 'crashout_room',
      title: 'Stress Relief Zone',
      description: 'When studying gets overwhelming, we\'ve got your back with stress relief tools.',
      stuMessage: 'Feeling stressed? Don\'t worry - it happens to everyone! The Crashout Room is your safe space to vent, relax, and get back on track.',
      stuAnimation: 'encouraging',
      duration: 30,
      targetElements: ['.crashout-features', '[data-testid="crashout-room"]'],
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
      description: 'Earn coins, unlock achievements, and track your progress as you study.',
      stuMessage: 'Who says studying can\'t be fun? Earn coins for completing tasks, unlock cool achievements, and see your progress grow!',
      stuAnimation: 'celebrating',
      duration: 30,
      targetElements: ['.gamification-features', '.achievements-display'],
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
      description: 'Congratulations! You\'re now ready to make the most of StudySpark.',
      stuMessage: 'Awesome! You\'ve completed the tour and you\'re officially ready to rock your studies! I\'ll be here whenever you need encouragement or tips. You\'ve got this! 🎉',
      stuAnimation: 'celebrating',
      duration: 30,
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
} 