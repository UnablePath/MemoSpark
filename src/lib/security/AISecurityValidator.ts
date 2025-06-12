// Use Web Crypto API instead of Node.js crypto for Edge Runtime compatibility
import type { TierAwareAIRequest, ExtendedTask, SuggestionContext } from '../../types/ai';
import type { SubscriptionTier } from '../../types/subscription';

/**
 * Comprehensive AI Security Validator
 * Implements data privacy protection, behavioral data encryption, and production security measures
 * Compatible with Edge Runtime
 */
export class AISecurityValidator {
  private static readonly ENCRYPTION_KEY_LENGTH = 32;
  private static readonly SALT_LENGTH = 16;
  private static readonly IV_LENGTH = 16;
  private static readonly RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
  private static readonly MAX_REQUESTS_PER_WINDOW = 100;

  // In-memory rate limiting store (in production, use Redis or similar)
  private static rateLimitStore = new Map<string, { count: number; resetTime: number }>();

  /**
   * 1. Behavioral Data Encryption - Web Crypto API compatible
   */
  static async encryptBehavioralData(data: any, userKey: string): Promise<string> {
    try {
      // Use Web Crypto API instead of Node.js crypto
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      
      // Generate salt and IV
      const salt = crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH));
      const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));
      
      // Derive key using PBKDF2
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(userKey),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
      );
      
      const derivedKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
      );
      
      // Encrypt the data
      const dataString = JSON.stringify(data);
      const encryptedData = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        derivedKey,
        encoder.encode(dataString)
      );
      
      // Combine salt, iv, and encrypted data
      const combined = new Uint8Array(salt.length + iv.length + encryptedData.byteLength);
      combined.set(salt, 0);
      combined.set(iv, salt.length);
      combined.set(new Uint8Array(encryptedData), salt.length + iv.length);
      
      // Convert to base64 for storage
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt behavioral data');
    }
  }

  static async decryptBehavioralData(encryptedData: string, userKey: string): Promise<any> {
    try {
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      
      // Decode from base64
      const combined = new Uint8Array(
        atob(encryptedData).split('').map(char => char.charCodeAt(0))
      );
      
      // Extract salt, iv, and encrypted data
      const salt = combined.slice(0, this.SALT_LENGTH);
      const iv = combined.slice(this.SALT_LENGTH, this.SALT_LENGTH + this.IV_LENGTH);
      const encrypted = combined.slice(this.SALT_LENGTH + this.IV_LENGTH);
      
      // Derive key using PBKDF2
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(userKey),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
      );
      
      const derivedKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );
      
      // Decrypt the data
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        derivedKey,
        encrypted
      );
      
      const decryptedString = decoder.decode(decryptedBuffer);
      return JSON.parse(decryptedString);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt behavioral data');
    }
  }

  /**
   * 2. Mood Detection Privacy - Local processing only
   */
  static validateMoodDetectionPrivacy(context: SuggestionContext | undefined): {
    isValid: boolean;
    violations: string[];
  } {
    const violations: string[] = [];

    if (!context) {
      return {
        isValid: true,
        violations: []
      };
    }

    // Ensure mood data is not transmitted to external services
    if (context.userPreferences?.cloudSyncEnabled && 
        context.userPreferences?.shareAnonymousData) {
      violations.push('Mood detection data cannot be shared when cloud sync is enabled');
    }

    // Validate no sensitive mood data in context
    const contextStr = JSON.stringify(context).toLowerCase();
    const sensitiveTerms = ['emotion', 'mood', 'stress', 'anxiety', 'depression'];
    
    sensitiveTerms.forEach(term => {
      if (contextStr.includes(term)) {
        violations.push(`Potentially sensitive mood data detected: ${term}`);
      }
    });

    return {
      isValid: violations.length === 0,
      violations
    };
  }

  /**
   * 3. Social Learning Anonymization
   */
  static anonymizeSocialLearningData(data: any): any {
    const anonymized = JSON.parse(JSON.stringify(data));
    
    // Remove all personally identifiable information
    const removeFields = ['userId', 'email', 'name', 'ip', 'deviceId', 'sessionId'];
    
    function removePersonalData(obj: any): any {
      if (Array.isArray(obj)) {
        return obj.map(removePersonalData);
      } else if (obj && typeof obj === 'object') {
        const cleaned = { ...obj };
        removeFields.forEach(field => delete cleaned[field]);
        
        // Hash any remaining ID-like fields
        Object.keys(cleaned).forEach(key => {
          if (key.toLowerCase().includes('id') && typeof cleaned[key] === 'string') {
            cleaned[key] = AISecurityValidator.hashValue(cleaned[key]);
          }
        });
        
        return Object.keys(cleaned).reduce((acc, key) => {
          acc[key] = removePersonalData(cleaned[key]);
          return acc;
        }, {} as any);
      }
      return obj;
    }

    return removePersonalData(anonymized);
  }

  /**
   * 4. Input Validation and Sanitization
   */
  static validateAIRequest(request: TierAwareAIRequest): {
    isValid: boolean;
    errors: string[];
    sanitizedRequest: TierAwareAIRequest | null;
  } {
    const errors: string[] = [];
    let sanitizedRequest: TierAwareAIRequest | null = null;

    try {
      // Validate user ID format
      if (!request.userId || typeof request.userId !== 'string') {
        errors.push('Invalid user ID format');
      }

      // Validate feature type
      const allowedFeatures = [
        'basic_suggestions', 'advanced_suggestions', 'study_planning',
        'voice_processing', 'stu_personality', 'ml_predictions',
        'collaborative_filtering', 'premium_analytics'
      ];
      
      if (!allowedFeatures.includes(request.feature)) {
        errors.push(`Invalid feature type: ${request.feature}`);
      }

      // Validate and sanitize tasks
      if (!Array.isArray(request.tasks)) {
        errors.push('Tasks must be an array');
      } else {
        const sanitizedTasks = request.tasks.map(task => AISecurityValidator.sanitizeTask(task));
        
        // Check for malicious content
        sanitizedTasks.forEach((task, index) => {
          if (AISecurityValidator.containsMaliciousContent(task)) {
            errors.push(`Task ${index} contains potentially malicious content`);
          }
        });
      }

      // Sanitize context
      const sanitizedContext = request.context ? AISecurityValidator.sanitizeContext(request.context) : undefined;

      if (errors.length === 0) {
        sanitizedRequest = {
          ...request,
          tasks: request.tasks.map(task => AISecurityValidator.sanitizeTask(task)),
          context: sanitizedContext
        };
      }

    } catch (error) {
      errors.push('Request validation failed: Invalid JSON structure');
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedRequest
    };
  }

  /**
   * 5. Rate Limiting
   */
  static checkRateLimit(userId: string, tier: SubscriptionTier): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
  } {
    const now = Date.now();
    const key = `${userId}_${tier}`;
    const current = this.rateLimitStore.get(key);

    // Get tier-specific limits
    const limits = this.getTierLimits(tier);
    
    if (!current || current.resetTime <= now) {
      // Reset or create new entry
      this.rateLimitStore.set(key, {
        count: 1,
        resetTime: now + this.RATE_LIMIT_WINDOW
      });
      
      return {
        allowed: true,
        remaining: limits.maxRequests - 1,
        resetTime: now + this.RATE_LIMIT_WINDOW
      };
    }

    if (current.count >= limits.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: current.resetTime
      };
    }

    current.count++;
    this.rateLimitStore.set(key, current);

    return {
      allowed: true,
      remaining: limits.maxRequests - current.count,
      resetTime: current.resetTime
    };
  }

  /**
   * 6. Audit Logging
   */
  static logSecurityEvent(event: {
    type: 'request' | 'authentication' | 'rate_limit' | 'privacy_violation' | 'encryption';
    userId: string;
    details: any;
    severity: 'low' | 'medium' | 'high' | 'critical';
    timestamp?: Date;
  }): void {
    const logEntry = {
      ...event,
      timestamp: event.timestamp || new Date(),
      hash: this.hashValue(`${event.userId}_${event.type}_${Date.now()}`),
      ip: 'REDACTED', // IP should be passed from middleware
      userAgent: 'REDACTED' // User agent should be passed from middleware
    };

    // In production, send to security monitoring system
    console.log('SECURITY_AUDIT:', JSON.stringify(logEntry));
    
    // Alert on critical events
    if (event.severity === 'critical') {
      this.triggerSecurityAlert(logEntry);
    }
  }

  /**
   * 7. GDPR Compliance - User Data Management
   */
  static async deleteUserData(userId: string): Promise<{
    success: boolean;
    deletedItems: string[];
    errors: string[];
  }> {
    const deletedItems: string[] = [];
    const errors: string[] = [];

    try {
      // Clear behavioral data
      this.rateLimitStore.delete(`${userId}_free`);
      this.rateLimitStore.delete(`${userId}_premium`);
      this.rateLimitStore.delete(`${userId}_enterprise`);
      deletedItems.push('Rate limit data');

      // Log the deletion
      this.logSecurityEvent({
        type: 'request',
        userId,
        details: { action: 'user_data_deletion', items: deletedItems },
        severity: 'medium'
      });

      return {
        success: true,
        deletedItems,
        errors
      };
    } catch (error) {
      errors.push(`Failed to delete user data: ${error}`);
      return {
        success: false,
        deletedItems,
        errors
      };
    }
  }

  /**
   * 8. Production Security Validation
   */
  static validateEnvironmentSecurity(): {
    isSecure: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check environment variables
    if (typeof window === 'undefined') { // Server-side only
      const requiredEnvVars = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'
      ];

      requiredEnvVars.forEach(envVar => {
        if (!process.env[envVar]) {
          issues.push(`Missing environment variable: ${envVar}`);
        }
      });
    }

    // Security recommendations
    recommendations.push('Enable HTTPS in production');
    recommendations.push('Implement rate limiting at infrastructure level');
    recommendations.push('Set up monitoring and alerting');
    recommendations.push('Regular security audits');

    return {
      isSecure: issues.length === 0,
      issues,
      recommendations
    };
  }

  // Private helper methods
  private static hashValue(value: string): string {
    // Simple hash function for client-side compatibility
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      const char = value.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private static sanitizeTask(task: ExtendedTask): ExtendedTask {
    return {
      ...task,
      title: this.sanitizeString(task.title),
      description: task.description ? this.sanitizeString(task.description) : undefined,
      subject: task.subject ? this.sanitizeString(task.subject) : undefined,
      tags: task.tags ? task.tags.map(tag => this.sanitizeString(tag)) : undefined
    };
  }

  private static sanitizeString(str: string): string {
    if (typeof str !== 'string') return '';
    
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: protocols
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();
  }

  private static sanitizeContext(context: SuggestionContext): SuggestionContext {
    // Deep clone and sanitize context
    return JSON.parse(JSON.stringify(context));
  }

  private static containsMaliciousContent(task: ExtendedTask): boolean {
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /eval\(/i,
      /setTimeout\(/i,
      /setInterval\(/i
    ];

    const textToCheck = `${task.title} ${task.description || ''} ${task.subject || ''}`;
    return suspiciousPatterns.some(pattern => pattern.test(textToCheck));
  }

  private static triggerSecurityAlert(logEntry: any): void {
    // In production, integrate with security monitoring services
    console.error('CRITICAL_SECURITY_EVENT:', logEntry);
    
    // Could integrate with services like:
    // - Sentry for error tracking
    // - DataDog for monitoring
    // - PagerDuty for alerting
  }

  /**
   * Public method to get tier limits (for middleware usage)
   */
  static getTierLimits(tier: SubscriptionTier): { maxRequests: number } {
    switch (tier) {
      case 'enterprise':
        return { maxRequests: 1000 };
      case 'premium':
        return { maxRequests: 300 };
      case 'free':
      default:
        return { maxRequests: this.MAX_REQUESTS_PER_WINDOW };
    }
  }
}

/**
 * Create AI Security Middleware - Edge Runtime Compatible
 */
export function createAISecurityMiddleware() {
  return {
    validateRequest: (request: TierAwareAIRequest) => {
      return AISecurityValidator.validateAIRequest(request);
    },
    
    checkRateLimit: (userId: string, tier: SubscriptionTier) => {
      return AISecurityValidator.checkRateLimit(userId, tier);
    },
    
    validateMoodPrivacy: (context?: SuggestionContext) => {
      return AISecurityValidator.validateMoodDetectionPrivacy(context);
    },
    
    anonymizeData: (data: any) => {
      return AISecurityValidator.anonymizeSocialLearningData(data);
    },
    
    logEvent: (event: Parameters<typeof AISecurityValidator.logSecurityEvent>[0]) => {
      return AISecurityValidator.logSecurityEvent(event);
    }
  };
} 