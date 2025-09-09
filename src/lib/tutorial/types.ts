// Enhanced types for the tutorial system with better error handling and flexibility

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
  | 'encouraging'
  | 'confused'
  | 'helping';

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
  error_count?: number;
  last_error?: string;
}

export interface TutorialActionDetectionConfig {
  selectors: string[];
  fallbackSelectors?: string[];
  events: string[];
  customEventName?: string;
  timeout?: number;
  retries?: number;
  requiresUserInteraction?: boolean;
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
  waitForAction?: string; // Specific action to wait for
  actionInstructions?: string; // Instructions for what user should do
  contextualHelp?: {
    message: string;
    position: 'top' | 'bottom' | 'left' | 'right';
  };
  // Enhanced properties
  actionDetection?: TutorialActionDetectionConfig;
  fallbackAction?: () => Promise<boolean>; // Fallback if detection fails
  prerequisites?: TutorialStep[]; // Steps that must be completed first
  alternatives?: TutorialStep[]; // Alternative steps if this one fails
  accessibility?: {
    ariaLabel?: string;
    keyboardShortcut?: string;
    screenReaderText?: string;
  };
  analytics?: {
    trackInteractions?: boolean;
    customEvents?: string[];
  };
}

export interface TutorialError {
  code: string;
  message: string;
  step?: TutorialStep;
  action?: string;
  recoverable: boolean;
  retryable: boolean;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface TutorialResult<T = any> {
  success: boolean;
  data?: T;
  error?: TutorialError;
  retryCount?: number;
}

export interface TutorialAnalytics {
  step: TutorialStep;
  action: 'started' | 'completed' | 'skipped' | 'error' | 'retry' | 'timeout';
  timestamp: string;
  timeSpent?: number;
  interactionCount?: number;
  errorDetails?: TutorialError;
  metadata?: Record<string, any>;
}

export interface TutorialState {
  isActive: boolean;
  currentProgress: TutorialProgress | null;
  isLoading: boolean;
  error: TutorialError | null;
  retryCount: number;
  lastAction?: string;
  actionInProgress: boolean;
}

export interface TutorialContextValue extends TutorialState {
  showTutorial: () => void;
  hideTutorial: () => void;
  completeTutorial: () => Promise<TutorialResult>;
  skipStep: (step?: TutorialStep) => Promise<TutorialResult>;
  restartTutorial: () => Promise<TutorialResult>;
  retryCurrentStep: () => Promise<TutorialResult>;
  shouldShowTutorial: boolean;
  clearError: () => void;
}

export interface TutorialConfig {
  autoStart: boolean;
  enableAnalytics: boolean;
  maxRetries: number;
  defaultTimeout: number;
  enableAccessibility: boolean;
  enableKeyboardNavigation: boolean;
  fallbackMode: boolean;
  debugMode: boolean;
}

export const DEFAULT_TUTORIAL_CONFIG: TutorialConfig = {
  autoStart: true,
  enableAnalytics: true,
  maxRetries: 3,
  defaultTimeout: 30000,
  enableAccessibility: true,
  enableKeyboardNavigation: true,
  fallbackMode: true,
  debugMode: false,
};

export const TUTORIAL_ERROR_CODES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  ACTION_TIMEOUT: 'ACTION_TIMEOUT',
  ELEMENT_NOT_FOUND: 'ELEMENT_NOT_FOUND',
  INVALID_STATE: 'INVALID_STATE',
  USER_CANCELLED: 'USER_CANCELLED',
  INITIALIZATION_FAILED: 'INITIALIZATION_FAILED',
  STEP_VALIDATION_FAILED: 'STEP_VALIDATION_FAILED',
} as const;

export type TutorialErrorCode = keyof typeof TUTORIAL_ERROR_CODES;
