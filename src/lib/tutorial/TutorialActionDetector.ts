'use client';

import { TutorialManager } from './TutorialManager';

export class TutorialActionDetector {
  private static instance: TutorialActionDetector;
  private tutorialManager: TutorialManager;
  private userId: string | null = null;
  private activeListeners: Map<string, () => void> = new Map();

  private constructor() {
    this.tutorialManager = TutorialManager.getInstance();
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
    this.setupActionListeners();
  }

  /**
   * Clean up all listeners
   */
  public cleanup(): void {
    this.activeListeners.forEach((removeListener, action) => {
      removeListener();
    });
    this.activeListeners.clear();
  }

  /**
   * Set up event listeners for various user actions
   */
  private setupActionListeners(): void {
    // Tab click detection
    this.setupTabClickListener();
    
    // Task creation detection
    this.setupTaskCreationListener();
    
    // AI interaction detection
    this.setupAIInteractionListener();
    
    // Connections exploration detection
    this.setupConnectionsExplorationListener();
    
    // Crashout room visit detection
    this.setupCrashoutVisitListener();
    
    // Achievements view detection
    this.setupAchievementsViewListener();
  }

  /**
   * Setup tab click listener
   */
  private setupTabClickListener(): void {
    const handleTabClick = (event: Event) => {
      // Listen for tab navigation events
      if (event.target && (event.target as Element).closest('[role="tablist"]')) {
        this.markActionCompleted('tab_click');
      }
    };

    // Also listen for custom tab change events
    const handleTabChangeEvent = () => {
      this.markActionCompleted('tab_click');
    };

    document.addEventListener('click', handleTabClick);
    window.addEventListener('tutorialTabChange', handleTabChangeEvent);
    
    this.activeListeners.set('tab_click', () => {
      document.removeEventListener('click', handleTabClick);
      window.removeEventListener('tutorialTabChange', handleTabChangeEvent);
    });
  }

  /**
   * Setup task creation listener
   */
  private setupTaskCreationListener(): void {
    const handleTaskCreation = (event: Event) => {
      // Listen for form submissions in task creation areas
      const target = event.target as Element;
      
      if (target.closest('.task-creation-form') || 
          target.closest('[data-testid="task-input"]') ||
          target.closest('.task-input')) {
        
        if (event.type === 'keydown') {
          const keyEvent = event as KeyboardEvent;
          if (keyEvent.key === 'Enter') {
            setTimeout(() => this.markActionCompleted('task_created'), 500);
          }
        } else if (event.type === 'submit') {
          setTimeout(() => this.markActionCompleted('task_created'), 500);
        }
      }
    };

    // Listen for successful task creation via custom events
    const handleTaskCreatedEvent = () => {
      this.markActionCompleted('task_created');
    };

    document.addEventListener('keydown', handleTaskCreation);
    document.addEventListener('submit', handleTaskCreation);
    window.addEventListener('taskCreated', handleTaskCreatedEvent);
    
    this.activeListeners.set('task_created', () => {
      document.removeEventListener('keydown', handleTaskCreation);
      document.removeEventListener('submit', handleTaskCreatedEvent);
      window.removeEventListener('taskCreated', handleTaskCreatedEvent);
    });
  }

  /**
   * Setup AI interaction listener
   */
  private setupAIInteractionListener(): void {
    const handleAIInteraction = (event: Event) => {
      const target = event.target as Element;
      
      // Look for AI-related interactions
      if (target.closest('.ai-suggestions') ||
          target.closest('[data-testid="ai-suggestions"]') ||
          target.closest('.ai-features') ||
          target.closest('.smart-schedule') ||
          target.textContent?.toLowerCase().includes('ai') ||
          target.textContent?.toLowerCase().includes('smart') ||
          target.textContent?.toLowerCase().includes('suggestion')) {
        
        this.markActionCompleted('ai_interaction');
      }
    };

    document.addEventListener('click', handleAIInteraction);
    
    this.activeListeners.set('ai_interaction', () => {
      document.removeEventListener('click', handleAIInteraction);
    });
  }

  /**
   * Setup connections exploration listener
   */
  private setupConnectionsExplorationListener(): void {
    const handleConnectionsExploration = (event: Event) => {
      const target = event.target as Element;
      
      // Look for social/connections interactions
      if (target.closest('.social-features') ||
          target.closest('.student-connections') ||
          target.closest('[data-testid="connections"]')) {
        
        this.markActionCompleted('connections_explored');
      }
    };

    // Also mark as completed when visiting connections tab
    const handleTabToConnections = (event: CustomEvent) => {
      if (event.detail?.tabIndex === 0) { // Connections tab is index 0
        setTimeout(() => this.markActionCompleted('connections_explored'), 1000);
      }
    };

    document.addEventListener('click', handleConnectionsExploration);
    window.addEventListener('tutorialTabChange', handleTabToConnections as EventListener);
    
    this.activeListeners.set('connections_explored', () => {
      document.removeEventListener('click', handleConnectionsExploration);
      window.removeEventListener('tutorialTabChange', handleTabToConnections as EventListener);
    });
  }

  /**
   * Setup crashout room visit listener
   */
  private setupCrashoutVisitListener(): void {
    const handleCrashoutVisit = (event: Event) => {
      const target = event.target as Element;
      
      // Look for crashout-related interactions
      if (target.closest('.crashout-features') ||
          target.closest('[data-testid="crashout-room"]') ||
          target.textContent?.toLowerCase().includes('crashout') ||
          target.textContent?.toLowerCase().includes('stress')) {
        
        this.markActionCompleted('crashout_visited');
      }
    };

    // Mark as completed when visiting crashout tab
    const handleTabToCrashout = (event: CustomEvent) => {
      if (event.detail?.tabIndex === 3) { // Crashout tab is index 3
        setTimeout(() => this.markActionCompleted('crashout_visited'), 1000);
      }
    };

    document.addEventListener('click', handleCrashoutVisit);
    window.addEventListener('tutorialTabChange', handleTabToCrashout as EventListener);
    
    this.activeListeners.set('crashout_visited', () => {
      document.removeEventListener('click', handleCrashoutVisit);
      window.removeEventListener('tutorialTabChange', handleTabToCrashout as EventListener);
    });
  }

  /**
   * Setup achievements view listener
   */
  private setupAchievementsViewListener(): void {
    const handleAchievementsView = (event: Event) => {
      const target = event.target as Element;
      
      // Look for gamification/achievements interactions
      if (target.closest('.gamification-features') ||
          target.closest('.achievements-display') ||
          target.textContent?.toLowerCase().includes('achievement') ||
          target.textContent?.toLowerCase().includes('coins') ||
          target.textContent?.toLowerCase().includes('level')) {
        
        this.markActionCompleted('achievements_viewed');
      }
    };

    // Mark as completed when visiting gamification tab
    const handleTabToGamification = (event: CustomEvent) => {
      if (event.detail?.tabIndex === 4) { // Gamification tab is index 4
        setTimeout(() => this.markActionCompleted('achievements_viewed'), 1000);
      }
    };

    document.addEventListener('click', handleAchievementsView);
    window.addEventListener('tutorialTabChange', handleTabToGamification as EventListener);
    
    this.activeListeners.set('achievements_viewed', () => {
      document.removeEventListener('click', handleAchievementsView);
      window.removeEventListener('tutorialTabChange', handleTabToGamification as EventListener);
    });
  }

  /**
   * Mark an action as completed and resume tutorial if needed
   */
  private async markActionCompleted(action: string): Promise<void> {
    if (!this.userId) return;

    console.log(`Tutorial action completed: ${action}`);
    
    try {
      await this.tutorialManager.markActionCompleted(this.userId, action);
      await this.tutorialManager.resumeTutorial(this.userId);
    } catch (error) {
      console.error('Error marking action completed:', error);
    }
  }

  /**
   * Manually trigger an action completion (for testing or forced completion)
   */
  public async triggerActionCompleted(action: string): Promise<void> {
    await this.markActionCompleted(action);
  }
} 