import { describe, it, expect, beforeEach } from '@jest/globals';
import { TutorialConfigManager } from '@/lib/tutorial/TutorialConfigManager';
import { DEFAULT_TUTORIAL_CONFIG } from '@/lib/tutorial/types';

describe('TutorialConfigManager', () => {
  let configManager: TutorialConfigManager;

  beforeEach(() => {
    configManager = TutorialConfigManager.getInstance();
  });

  describe('template management', () => {
    it('should provide default templates', () => {
      const templates = configManager.getAllTemplates();
      
      expect(templates.length).toBeGreaterThan(0);
      
      const templateIds = templates.map(t => t.id);
      expect(templateIds).toContain('standard');
      expect(templateIds).toContain('quick_start');
      expect(templateIds).toContain('accessibility');
    });

    it('should retrieve template by ID', () => {
      const standardTemplate = configManager.getTemplate('standard');
      
      expect(standardTemplate).toBeDefined();
      expect(standardTemplate?.id).toBe('standard');
      expect(standardTemplate?.name).toBe('Standard Tutorial');
      expect(standardTemplate?.steps.length).toBeGreaterThan(0);
    });

    it('should return null for non-existent template', () => {
      const nonExistentTemplate = configManager.getTemplate('non_existent');
      
      expect(nonExistentTemplate).toBeNull();
    });

    it('should filter templates by target audience', () => {
      const newUserTemplates = configManager.getTemplatesForAudience('new_user');
      const returningUserTemplates = configManager.getTemplatesForAudience('returning_user');
      
      expect(newUserTemplates.length).toBeGreaterThan(0);
      expect(returningUserTemplates.length).toBeGreaterThan(0);
      
      // Should include templates with 'all' audience
      const allAudienceTemplates = configManager.getTemplatesForAudience('all');
      expect(newUserTemplates.length).toBeGreaterThanOrEqual(allAudienceTemplates.length);
    });

    it('should register custom template', () => {
      const customTemplate = {
        id: 'custom_test',
        name: 'Custom Test Template',
        description: 'A custom template for testing',
        targetAudience: 'new_user' as const,
        estimatedDuration: 5,
        config: DEFAULT_TUTORIAL_CONFIG,
        steps: [
          {
            id: 'custom_welcome' as const,
            title: 'Custom Welcome',
            description: 'Custom welcome step',
            stuMessage: 'Welcome to custom tutorial!',
            stuAnimation: 'excited' as const,
            duration: 30,
            skipAllowed: true,
            autoAdvance: false
          }
        ]
      };

      const registered = configManager.registerTemplate(customTemplate);
      
      expect(registered).toBe(true);
      
      const retrievedTemplate = configManager.getTemplate('custom_test');
      expect(retrievedTemplate).toEqual(customTemplate);
    });

    it('should not register duplicate template', () => {
      const duplicateTemplate = {
        id: 'standard', // Duplicate ID
        name: 'Duplicate Standard',
        description: 'Duplicate template',
        targetAudience: 'new_user' as const,
        estimatedDuration: 5,
        config: DEFAULT_TUTORIAL_CONFIG,
        steps: []
      };

      const registered = configManager.registerTemplate(duplicateTemplate);
      
      expect(registered).toBe(false);
    });
  });

  describe('variant management', () => {
    it('should provide default variants', () => {
      const variants = configManager.getVariantsForTemplate('standard');
      
      expect(variants.length).toBeGreaterThan(0);
      
      const variantIds = variants.map(v => v.id);
      expect(variantIds).toContain('fast_paced');
      expect(variantIds).toContain('detailed');
    });

    it('should retrieve variant by ID', () => {
      const fastPacedVariant = configManager.getVariant('fast_paced');
      
      expect(fastPacedVariant).toBeDefined();
      expect(fastPacedVariant?.id).toBe('fast_paced');
      expect(fastPacedVariant?.baseTemplate).toBe('standard');
      expect(fastPacedVariant?.testGroup).toBe('pace_test');
    });

    it('should assign variant to user', () => {
      const userId = 'test-user-123';
      const assigned = configManager.assignVariantToUser(userId, 'fast_paced');
      
      expect(assigned).toBe(true);
      
      const userVariant = configManager.getUserVariant(userId);
      expect(userVariant?.id).toBe('fast_paced');
    });

    it('should not assign non-existent variant', () => {
      const userId = 'test-user-123';
      const assigned = configManager.assignVariantToUser(userId, 'non_existent');
      
      expect(assigned).toBe(false);
      
      const userVariant = configManager.getUserVariant(userId);
      expect(userVariant).toBeNull();
    });

    it('should register custom variant', () => {
      const customVariant = {
        id: 'custom_variant',
        name: 'Custom Variant',
        description: 'Custom variant for testing',
        baseTemplate: 'standard',
        testGroup: 'custom_test',
        modifications: {
          configOverrides: {
            defaultTimeout: 20000
          },
          stepModifications: [
            {
              id: 'welcome' as const,
              duration: 45
            }
          ]
        }
      };

      const registered = configManager.registerVariant(customVariant);
      
      expect(registered).toBe(true);
      
      const retrievedVariant = configManager.getVariant('custom_variant');
      expect(retrievedVariant).toEqual(customVariant);
    });

    it('should not register variant with non-existent base template', () => {
      const invalidVariant = {
        id: 'invalid_variant',
        name: 'Invalid Variant',
        description: 'Variant with invalid base template',
        baseTemplate: 'non_existent_template',
        modifications: {}
      };

      const registered = configManager.registerVariant(invalidVariant);
      
      expect(registered).toBe(false);
    });
  });

  describe('tutorial generation', () => {
    it('should generate tutorial for user with default template', () => {
      const userId = 'test-user-123';
      const tutorial = configManager.generateTutorialForUser(userId);
      
      expect(tutorial).toBeDefined();
      expect(tutorial?.steps.length).toBeGreaterThan(0);
      expect(tutorial?.config).toBeDefined();
    });

    it('should generate tutorial with specific template', () => {
      const userId = 'test-user-123';
      const tutorial = configManager.generateTutorialForUser(userId, 'quick_start');
      
      expect(tutorial).toBeDefined();
      expect(tutorial?.steps.length).toBeGreaterThan(0);
      // Quick start should have fewer steps than standard
      const standardTutorial = configManager.generateTutorialForUser(userId, 'standard');
      expect(tutorial?.steps.length).toBeLessThanOrEqual(standardTutorial?.steps.length || 0);
    });

    it('should apply user preferences', () => {
      const userId = 'test-user-123';
      const userPreferences = {
        defaultTimeout: 45000,
        enableAccessibility: true
      };
      
      const tutorial = configManager.generateTutorialForUser(
        userId, 
        'standard', 
        userPreferences
      );
      
      expect(tutorial?.config.defaultTimeout).toBe(45000);
      expect(tutorial?.config.enableAccessibility).toBe(true);
    });

    it('should apply variant modifications', () => {
      const userId = 'test-user-123';
      
      // Assign fast-paced variant
      configManager.assignVariantToUser(userId, 'fast_paced');
      
      const tutorial = configManager.generateTutorialForUser(userId);
      
      expect(tutorial).toBeDefined();
      expect(tutorial?.config.defaultTimeout).toBe(10000); // Fast-paced timeout
      expect(tutorial?.config.maxRetries).toBe(1); // Fast-paced retries
    });

    it('should handle step modifications in variants', () => {
      const userId = 'test-user-123';
      
      // Assign detailed variant
      configManager.assignVariantToUser(userId, 'detailed');
      
      const tutorial = configManager.generateTutorialForUser(userId);
      
      expect(tutorial).toBeDefined();
      
      // Find the welcome step and check if it was modified
      const welcomeStep = tutorial?.steps.find(step => step.id === 'welcome');
      expect(welcomeStep).toBeDefined();
      expect(welcomeStep?.duration).toBe(120); // Detailed variant duration
    });

    it('should return null for invalid template', () => {
      const userId = 'test-user-123';
      const tutorial = configManager.generateTutorialForUser(userId, 'invalid_template');
      
      expect(tutorial).toBeNull();
    });
  });

  describe('auto-assignment', () => {
    it('should assign accessibility template for users with accessibility needs', () => {
      const userId = 'test-user-123';
      const templateId = configManager.autoAssignVariant(userId, {
        hasAccessibilityNeeds: true
      });
      
      expect(templateId).toBe('accessibility');
    });

    it('should assign quick start for returning users', () => {
      const userId = 'test-user-123';
      const templateId = configManager.autoAssignVariant(userId, {
        isReturningUser: true
      });
      
      expect(templateId).toBe('quick_start');
    });

    it('should assign fast-paced variant for fast pace preference', () => {
      const userId = 'test-user-123';
      const templateId = configManager.autoAssignVariant(userId, {
        preferredPace: 'fast'
      });
      
      expect(templateId).toBe('fast_paced');
      
      const userVariant = configManager.getUserVariant(userId);
      expect(userVariant?.id).toBe('fast_paced');
    });

    it('should assign detailed variant for slow pace preference', () => {
      const userId = 'test-user-123';
      const templateId = configManager.autoAssignVariant(userId, {
        preferredPace: 'slow'
      });
      
      expect(templateId).toBe('detailed');
      
      const userVariant = configManager.getUserVariant(userId);
      expect(userVariant?.id).toBe('detailed');
    });

    it('should default to standard template', () => {
      const userId = 'test-user-123';
      const templateId = configManager.autoAssignVariant(userId, {
        preferredPace: 'normal'
      });
      
      expect(templateId).toBe('standard');
    });

    it('should prioritize accessibility over other characteristics', () => {
      const userId = 'test-user-123';
      const templateId = configManager.autoAssignVariant(userId, {
        hasAccessibilityNeeds: true,
        isReturningUser: true,
        preferredPace: 'fast'
      });
      
      expect(templateId).toBe('accessibility');
    });
  });

  describe('analytics and optimization', () => {
    it('should provide analytics data structure', () => {
      const analytics = configManager.getAnalyticsData();
      
      expect(analytics).toHaveProperty('templateUsage');
      expect(analytics).toHaveProperty('variantPerformance');
      
      expect(typeof analytics.templateUsage).toBe('object');
      expect(typeof analytics.variantPerformance).toBe('object');
    });

    it('should optimize template based on analytics', () => {
      const optimized = configManager.optimizeTemplate('standard', {
        increaseTimeouts: true,
        addMoreHelp: true,
        improveAccessibility: true
      });
      
      expect(optimized).toBe(true);
      
      const template = configManager.getTemplate('standard');
      expect(template?.config.enableAccessibility).toBe(true);
      expect(template?.config.enableKeyboardNavigation).toBe(true);
    });

    it('should not optimize non-existent template', () => {
      const optimized = configManager.optimizeTemplate('non_existent', {
        increaseTimeouts: true
      });
      
      expect(optimized).toBe(false);
    });
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = TutorialConfigManager.getInstance();
      const instance2 = TutorialConfigManager.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should maintain state across getInstance calls', () => {
      const instance1 = TutorialConfigManager.getInstance();
      instance1.assignVariantToUser('test-user', 'fast_paced');
      
      const instance2 = TutorialConfigManager.getInstance();
      const userVariant = instance2.getUserVariant('test-user');
      
      expect(userVariant?.id).toBe('fast_paced');
    });
  });
});
