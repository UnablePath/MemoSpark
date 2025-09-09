import { TutorialError, TutorialErrorCode, TUTORIAL_ERROR_CODES } from './types';

export class TutorialErrorHandler {
  private static instance: TutorialErrorHandler;
  private errorHistory: TutorialError[] = [];
  private maxHistorySize = 50;

  private constructor() {}

  public static getInstance(): TutorialErrorHandler {
    if (!TutorialErrorHandler.instance) {
      TutorialErrorHandler.instance = new TutorialErrorHandler();
    }
    return TutorialErrorHandler.instance;
  }

  /**
   * Create a standardized tutorial error
   */
  createError(
    code: TutorialErrorCode,
    message: string,
    options: {
      step?: string;
      action?: string;
      recoverable?: boolean;
      retryable?: boolean;
      metadata?: Record<string, any>;
    } = {}
  ): TutorialError {
    const error: TutorialError = {
      code,
      message,
      step: options.step as any,
      action: options.action,
      recoverable: options.recoverable ?? this.isRecoverableError(code),
      retryable: options.retryable ?? this.isRetryableError(code),
      timestamp: new Date().toISOString(),
      metadata: options.metadata,
    };

    this.logError(error);
    return error;
  }

  /**
   * Handle different types of errors with appropriate recovery strategies
   */
  async handleError(error: TutorialError): Promise<{
    shouldRetry: boolean;
    shouldRecover: boolean;
    recoveryAction?: () => Promise<boolean>;
    userMessage: string;
  }> {
    const errorHandlers = {
      [TUTORIAL_ERROR_CODES.NETWORK_ERROR]: () => ({
        shouldRetry: true,
        shouldRecover: true,
        userMessage: 'Network connection issue. We\'ll try again automatically.',
        recoveryAction: async () => {
          // Wait a bit and check connectivity
          await new Promise(resolve => setTimeout(resolve, 2000));
          return navigator.onLine;
        }
      }),

      [TUTORIAL_ERROR_CODES.DATABASE_ERROR]: () => ({
        shouldRetry: true,
        shouldRecover: true,
        userMessage: 'Temporary server issue. Retrying...',
        recoveryAction: async () => {
          // Could implement database health check here
          return true;
        }
      }),

      [TUTORIAL_ERROR_CODES.ACTION_TIMEOUT]: () => ({
        shouldRetry: false,
        shouldRecover: true,
        userMessage: 'Taking too long? Let\'s try a different approach.',
        recoveryAction: async () => {
          // Offer alternative action or skip
          return true;
        }
      }),

      [TUTORIAL_ERROR_CODES.ELEMENT_NOT_FOUND]: () => ({
        shouldRetry: true,
        shouldRecover: true,
        userMessage: 'Looking for the right element. One moment...',
        recoveryAction: async () => {
          // Wait for DOM to update
          await new Promise(resolve => setTimeout(resolve, 1000));
          return true;
        }
      }),

      [TUTORIAL_ERROR_CODES.INVALID_STATE]: () => ({
        shouldRetry: false,
        shouldRecover: true,
        userMessage: 'Let\'s get back on track. Resetting to a safe state.',
        recoveryAction: async () => {
          // Reset to a known good state
          return true;
        }
      }),

      [TUTORIAL_ERROR_CODES.USER_CANCELLED]: () => ({
        shouldRetry: false,
        shouldRecover: false,
        userMessage: 'Tutorial cancelled. You can restart anytime!',
      }),

      [TUTORIAL_ERROR_CODES.INITIALIZATION_FAILED]: () => ({
        shouldRetry: true,
        shouldRecover: true,
        userMessage: 'Starting up the tutorial. Please wait...',
        recoveryAction: async () => {
          // Clear any cached state
          return true;
        }
      }),

      [TUTORIAL_ERROR_CODES.STEP_VALIDATION_FAILED]: () => ({
        shouldRetry: true,
        shouldRecover: true,
        userMessage: 'Validating your progress. Almost there!',
        recoveryAction: async () => {
          // Re-validate step completion
          return true;
        }
      }),
    };

    const handler = errorHandlers[error.code];
    if (handler) {
      return handler();
    }

    // Default error handling
    return {
      shouldRetry: error.retryable,
      shouldRecover: error.recoverable,
      userMessage: 'Something went wrong. Let\'s try again.',
    };
  }

  /**
   * Get user-friendly error message
   */
  getUserFriendlyMessage(error: TutorialError): string {
    const messages = {
      [TUTORIAL_ERROR_CODES.NETWORK_ERROR]: 'Connection issue - we\'ll keep trying!',
      [TUTORIAL_ERROR_CODES.DATABASE_ERROR]: 'Saving your progress - one moment...',
      [TUTORIAL_ERROR_CODES.ACTION_TIMEOUT]: 'Taking your time? That\'s okay!',
      [TUTORIAL_ERROR_CODES.ELEMENT_NOT_FOUND]: 'Looking for the right spot...',
      [TUTORIAL_ERROR_CODES.INVALID_STATE]: 'Let\'s get back on track!',
      [TUTORIAL_ERROR_CODES.USER_CANCELLED]: 'Tutorial paused - resume anytime!',
      [TUTORIAL_ERROR_CODES.INITIALIZATION_FAILED]: 'Getting everything ready...',
      [TUTORIAL_ERROR_CODES.STEP_VALIDATION_FAILED]: 'Checking your progress...',
    };

    return messages[error.code] || 'Something went wrong, but we\'ll figure it out!';
  }

  /**
   * Log error for analytics
   */
  private logError(error: TutorialError): void {
    this.errorHistory.push(error);
    
    // Keep history size manageable
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(-this.maxHistorySize);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Tutorial Error:', error);
    }

    // Could send to analytics service here
    this.sendToAnalytics(error);
  }

  /**
   * Send error to analytics service
   */
  private async sendToAnalytics(error: TutorialError): Promise<void> {
    try {
      // This would integrate with your analytics service
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'tutorial_error', {
          error_code: error.code,
          error_message: error.message,
          tutorial_step: error.step,
          tutorial_action: error.action,
          recoverable: error.recoverable,
          retryable: error.retryable,
        });
      }
    } catch (analyticsError) {
      console.warn('Failed to send error to analytics:', analyticsError);
    }
  }

  /**
   * Check if error is recoverable
   */
  private isRecoverableError(code: TutorialErrorCode): boolean {
    const nonRecoverableErrors = [
      TUTORIAL_ERROR_CODES.USER_CANCELLED,
    ];
    return !nonRecoverableErrors.includes(code);
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(code: TutorialErrorCode): boolean {
    const retryableErrors = [
      TUTORIAL_ERROR_CODES.NETWORK_ERROR,
      TUTORIAL_ERROR_CODES.DATABASE_ERROR,
      TUTORIAL_ERROR_CODES.ELEMENT_NOT_FOUND,
      TUTORIAL_ERROR_CODES.INITIALIZATION_FAILED,
      TUTORIAL_ERROR_CODES.STEP_VALIDATION_FAILED,
    ];
    return retryableErrors.includes(code);
  }

  /**
   * Get error history for debugging
   */
  getErrorHistory(): TutorialError[] {
    return [...this.errorHistory];
  }

  /**
   * Clear error history
   */
  clearErrorHistory(): void {
    this.errorHistory = [];
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    totalErrors: number;
    errorsByCode: Record<string, number>;
    recentErrors: TutorialError[];
    mostCommonError: string | null;
  } {
    const errorsByCode = this.errorHistory.reduce((acc, error) => {
      acc[error.code] = (acc[error.code] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostCommonError = Object.entries(errorsByCode)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || null;

    return {
      totalErrors: this.errorHistory.length,
      errorsByCode,
      recentErrors: this.errorHistory.slice(-10),
      mostCommonError,
    };
  }
}
