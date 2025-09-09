import { 
  TutorialStepConfig, 
  TutorialConfig, 
  DEFAULT_TUTORIAL_CONFIG,
  TutorialStep,
  StuAnimationState,
  TutorialActionDetectionConfig
} from './types';

export interface TutorialTemplate {
  id: string;
  name: string;
  description: string;
  steps: TutorialStepConfig[];
  config: Partial<TutorialConfig>;
  targetAudience: 'new_user' | 'returning_user' | 'power_user' | 'all';
  estimatedDuration: number; // minutes
}

export interface TutorialVariant {
  id: string;
  name: string;
  description: string;
  baseTemplate: string;
  modifications: {
    stepModifications?: Partial<TutorialStepConfig>[];
    configOverrides?: Partial<TutorialConfig>;
    additionalSteps?: TutorialStepConfig[];
    removedSteps?: TutorialStep[];
  };
  testGroup?: string;
}

export class TutorialConfigManager {
  private static instance: TutorialConfigManager;
  private templates: Map<string, TutorialTemplate> = new Map();
  private variants: Map<string, TutorialVariant> = new Map();
  private activeVariants: Map<string, string> = new Map(); // userId -> variantId

  private constructor() {
    this.initializeDefaultTemplates();
  }

  public static getInstance(): TutorialConfigManager {
    if (!TutorialConfigManager.instance) {
      TutorialConfigManager.instance = new TutorialConfigManager();
    }
    return TutorialConfigManager.instance;
  }

  /**
   * Initialize default tutorial templates
   */
  private initializeDefaultTemplates(): void {
    // Standard tutorial template
    const standardTemplate: TutorialTemplate = {
      id: 'standard',
      name: 'Standard Tutorial',
      description: 'Complete tutorial covering all features',
      targetAudience: 'new_user',
      estimatedDuration: 10,
      config: DEFAULT_TUTORIAL_CONFIG,
      steps: [
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
          }
        },
        {
          id: 'navigation',
          title: 'Getting Around',
          description: 'Learn to navigate between different sections',
          stuMessage: 'See these tabs at the bottom? Each one unlocks amazing features! Go ahead and tap on the Tasks tab to see where the magic happens!',
          stuAnimation: 'talking',
          duration: 90,
          targetTab: 0,
          targetElements: ['.tab-navigation', '[role="tablist"]'],
          interactiveMode: true,
          waitForAction: 'tab_click',
          actionInstructions: 'Click on the Tasks tab to continue',
          skipAllowed: true,
          autoAdvance: false,
          actionDetection: {
            selectors: ['[role="tablist"] [role="tab"]', '.tab-navigation .tab'],
            events: ['click'],
            timeout: 15000,
            retries: 2
          },
          accessibility: {
            ariaLabel: 'Navigation tutorial step',
            screenReaderText: 'Learn to navigate between tabs. Use Tab key to move between tabs, then press Enter to select.',
          }
        },
        // ... other steps would be defined here
      ]
    };

    // Quick start template for returning users
    const quickStartTemplate: TutorialTemplate = {
      id: 'quick_start',
      name: 'Quick Start',
      description: 'Abbreviated tutorial for users who want the basics',
      targetAudience: 'returning_user',
      estimatedDuration: 5,
      config: {
        ...DEFAULT_TUTORIAL_CONFIG,
        defaultTimeout: 15000, // Shorter timeouts
        maxRetries: 2,
      },
      steps: [
        {
          id: 'welcome',
          title: 'Welcome Back!',
          description: 'Quick refresher on key features',
          stuMessage: 'Welcome back! Let me quickly show you the key features you\'ll need.',
          stuAnimation: 'excited',
          duration: 30,
          targetTab: 0,
          skipAllowed: true,
          autoAdvance: true, // Auto-advance for quick start
          accessibility: {
            ariaLabel: 'Quick start welcome step',
            screenReaderText: 'Quick start tutorial. This will auto-advance in 30 seconds.',
          }
        },
        {
          id: 'task_creation',
          title: 'Create Tasks Quickly',
          description: 'The fastest way to add tasks',
          stuMessage: 'Here\'s the quickest way to add tasks and stay organized!',
          stuAnimation: 'encouraging',
          duration: 60,
          targetTab: 1,
          targetElements: ['[data-testid="task-input"]'],
          interactiveMode: true,
          waitForAction: 'task_created',
          actionInstructions: 'Try creating a quick task',
          skipAllowed: true,
          autoAdvance: false,
          actionDetection: {
            selectors: ['[data-testid="task-input"]', '.task-input'],
            events: ['submit', 'keydown'],
            timeout: 30000,
            retries: 1
          },
          accessibility: {
            ariaLabel: 'Quick task creation step',
            screenReaderText: 'Learn to create tasks quickly. Find the task input and create a sample task.',
          }
        }
      ]
    };

    // Accessibility-focused template
    const accessibilityTemplate: TutorialTemplate = {
      id: 'accessibility',
      name: 'Accessibility Tutorial',
      description: 'Tutorial optimized for screen readers and keyboard navigation',
      targetAudience: 'all',
      estimatedDuration: 12,
      config: {
        ...DEFAULT_TUTORIAL_CONFIG,
        enableAccessibility: true,
        enableKeyboardNavigation: true,
        defaultTimeout: 45000, // Longer timeouts for accessibility
      },
      steps: [
        {
          id: 'welcome',
          title: 'Accessible StudySpark Tour',
          description: 'Learn StudySpark with full accessibility support',
          stuMessage: 'Welcome to StudySpark! This tutorial is designed with accessibility in mind. You can navigate using your keyboard and screen reader.',
          stuAnimation: 'talking',
          duration: 90,
          targetTab: 0,
          skipAllowed: true,
          autoAdvance: false,
          accessibility: {
            ariaLabel: 'Accessible tutorial welcome step',
            screenReaderText: 'Welcome to the accessible StudySpark tutorial. You can use keyboard shortcuts throughout this tutorial. Press H for help, Enter to continue, or Escape to exit.',
            keyboardShortcut: 'Enter'
          },
          contextualHelp: {
            message: 'Press ? at any time to see keyboard shortcuts, or H for contextual help.',
            position: 'bottom'
          }
        }
      ]
    };

    // Store templates
    this.templates.set('standard', standardTemplate);
    this.templates.set('quick_start', quickStartTemplate);
    this.templates.set('accessibility', accessibilityTemplate);

    // Initialize some test variants
    this.initializeDefaultVariants();
  }

  /**
   * Initialize default tutorial variants for A/B testing
   */
  private initializeDefaultVariants(): void {
    // Variant with shorter timeouts
    const fastPacedVariant: TutorialVariant = {
      id: 'fast_paced',
      name: 'Fast-Paced Tutorial',
      description: 'Tutorial with shorter timeouts and auto-advancement',
      baseTemplate: 'standard',
      testGroup: 'pace_test',
      modifications: {
        configOverrides: {
          defaultTimeout: 10000,
          maxRetries: 1,
        },
        stepModifications: [
          {
            id: 'welcome',
            duration: 30,
            autoAdvance: true
          }
        ]
      }
    };

    // Variant with more detailed explanations
    const detailedVariant: TutorialVariant = {
      id: 'detailed',
      name: 'Detailed Tutorial',
      description: 'Tutorial with more explanations and help',
      baseTemplate: 'standard',
      testGroup: 'detail_test',
      modifications: {
        configOverrides: {
          defaultTimeout: 60000,
          maxRetries: 5,
        },
        stepModifications: [
          {
            id: 'welcome',
            stuMessage: 'Hey there! Welcome to StudySpark! I\'m Stu, your personal study companion, and I\'m absolutely thrilled to meet you! I\'m here to guide you through every step of your learning journey and help you become the most effective and confident student you can be. Are you ready to discover all the amazing features that will transform how you study?',
            duration: 120
          }
        ]
      }
    };

    this.variants.set('fast_paced', fastPacedVariant);
    this.variants.set('detailed', detailedVariant);
  }

  /**
   * Get tutorial template by ID
   */
  getTemplate(templateId: string): TutorialTemplate | null {
    return this.templates.get(templateId) || null;
  }

  /**
   * Get all available templates
   */
  getAllTemplates(): TutorialTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get templates filtered by target audience
   */
  getTemplatesForAudience(audience: TutorialTemplate['targetAudience']): TutorialTemplate[] {
    return Array.from(this.templates.values())
      .filter(template => template.targetAudience === audience || template.targetAudience === 'all');
  }

  /**
   * Get tutorial variant by ID
   */
  getVariant(variantId: string): TutorialVariant | null {
    return this.variants.get(variantId) || null;
  }

  /**
   * Get all variants for a specific template
   */
  getVariantsForTemplate(templateId: string): TutorialVariant[] {
    return Array.from(this.variants.values())
      .filter(variant => variant.baseTemplate === templateId);
  }

  /**
   * Assign a variant to a user (for A/B testing)
   */
  assignVariantToUser(userId: string, variantId: string): boolean {
    if (!this.variants.has(variantId)) {
      return false;
    }
    
    this.activeVariants.set(userId, variantId);
    return true;
  }

  /**
   * Get the active variant for a user
   */
  getUserVariant(userId: string): TutorialVariant | null {
    const variantId = this.activeVariants.get(userId);
    return variantId ? this.getVariant(variantId) : null;
  }

  /**
   * Generate tutorial configuration for a user
   */
  generateTutorialForUser(
    userId: string, 
    templateId?: string,
    userPreferences?: Partial<TutorialConfig>
  ): { steps: TutorialStepConfig[]; config: TutorialConfig } | null {
    
    // Check if user has an assigned variant
    const userVariant = this.getUserVariant(userId);
    let baseTemplate: TutorialTemplate | null = null;

    if (userVariant) {
      baseTemplate = this.getTemplate(userVariant.baseTemplate);
    } else if (templateId) {
      baseTemplate = this.getTemplate(templateId);
    } else {
      // Default to standard template
      baseTemplate = this.getTemplate('standard');
    }

    if (!baseTemplate) {
      return null;
    }

    let steps = [...baseTemplate.steps];
    let config = { ...baseTemplate.config };

    // Apply variant modifications if applicable
    if (userVariant) {
      const { modifications } = userVariant;

      // Apply config overrides
      if (modifications.configOverrides) {
        config = { ...config, ...modifications.configOverrides };
      }

      // Apply step modifications
      if (modifications.stepModifications) {
        steps = steps.map(step => {
          const modification = modifications.stepModifications?.find(mod => mod.id === step.id);
          return modification ? { ...step, ...modification } : step;
        });
      }

      // Remove steps if specified
      if (modifications.removedSteps) {
        steps = steps.filter(step => !modifications.removedSteps!.includes(step.id));
      }

      // Add additional steps if specified
      if (modifications.additionalSteps) {
        steps.push(...modifications.additionalSteps);
      }
    }

    // Apply user preferences
    if (userPreferences) {
      config = { ...config, ...userPreferences };
    }

    return { steps, config };
  }

  /**
   * Register a custom template
   */
  registerTemplate(template: TutorialTemplate): boolean {
    if (this.templates.has(template.id)) {
      return false; // Template already exists
    }

    this.templates.set(template.id, template);
    return true;
  }

  /**
   * Register a custom variant
   */
  registerVariant(variant: TutorialVariant): boolean {
    if (this.variants.has(variant.id)) {
      return false; // Variant already exists
    }

    if (!this.templates.has(variant.baseTemplate)) {
      return false; // Base template doesn't exist
    }

    this.variants.set(variant.id, variant);
    return true;
  }

  /**
   * Auto-assign variant based on user characteristics
   */
  autoAssignVariant(
    userId: string,
    userCharacteristics: {
      isReturningUser?: boolean;
      hasAccessibilityNeeds?: boolean;
      preferredPace?: 'slow' | 'normal' | 'fast';
      deviceType?: 'mobile' | 'tablet' | 'desktop';
    }
  ): string | null {
    const { isReturningUser, hasAccessibilityNeeds, preferredPace } = userCharacteristics;

    // Accessibility needs take priority
    if (hasAccessibilityNeeds) {
      return 'accessibility';
    }

    // Returning users get quick start
    if (isReturningUser) {
      return 'quick_start';
    }

    // Assign based on pace preference
    if (preferredPace === 'fast') {
      this.assignVariantToUser(userId, 'fast_paced');
      return 'fast_paced';
    } else if (preferredPace === 'slow') {
      this.assignVariantToUser(userId, 'detailed');
      return 'detailed';
    }

    // Default to standard
    return 'standard';
  }

  /**
   * Get analytics data for templates and variants
   */
  getAnalyticsData(): {
    templateUsage: Record<string, number>;
    variantPerformance: Record<string, { completionRate: number; averageTime: number }>;
  } {
    // This would be implemented with real analytics data
    return {
      templateUsage: {
        'standard': 1000,
        'quick_start': 300,
        'accessibility': 50,
      },
      variantPerformance: {
        'fast_paced': { completionRate: 68.5, averageTime: 6.2 },
        'detailed': { completionRate: 82.1, averageTime: 12.8 },
      }
    };
  }

  /**
   * Update template based on analytics insights
   */
  optimizeTemplate(templateId: string, optimizations: {
    increaseTimeouts?: boolean;
    addMoreHelp?: boolean;
    simplifySteps?: boolean;
    improveAccessibility?: boolean;
  }): boolean {
    const template = this.templates.get(templateId);
    if (!template) return false;

    const { increaseTimeouts, addMoreHelp, simplifySteps, improveAccessibility } = optimizations;

    // Apply optimizations
    if (increaseTimeouts) {
      template.config.defaultTimeout = (template.config.defaultTimeout || 30000) * 1.5;
    }

    if (addMoreHelp) {
      template.steps = template.steps.map(step => ({
        ...step,
        contextualHelp: step.contextualHelp || {
          message: 'Need help? Click on Stu for guidance!',
          position: 'bottom'
        }
      }));
    }

    if (simplifySteps) {
      template.steps = template.steps.map(step => ({
        ...step,
        stuMessage: step.stuMessage.length > 100 
          ? step.stuMessage.substring(0, 100) + '...'
          : step.stuMessage
      }));
    }

    if (improveAccessibility) {
      template.config.enableAccessibility = true;
      template.config.enableKeyboardNavigation = true;
      template.steps = template.steps.map(step => ({
        ...step,
        accessibility: step.accessibility || {
          ariaLabel: `${step.title} tutorial step`,
          screenReaderText: `${step.description}. Press Enter to continue.`,
        }
      }));
    }

    this.templates.set(templateId, template);
    return true;
  }
}
