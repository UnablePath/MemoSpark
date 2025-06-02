// Production configuration validation for push notifications

interface ProductionConfig {
  vapidPublicKey: string;
  vapidPrivateKey: string;
  vapidEmail: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceKey: string;
}

interface ConfigValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class ProductionConfigValidator {
  private static requiredEnvVars = [
    'NEXT_PUBLIC_VAPID_PUBLIC_KEY',
    'VAPID_PRIVATE_KEY',
    'VAPID_EMAIL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];

  static validateConfiguration(): ConfigValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required environment variables
    for (const envVar of this.requiredEnvVars) {
      const value = process.env[envVar];
      if (!value) {
        errors.push(`Missing required environment variable: ${envVar}`);
      } else if (value.includes('your_') || value.includes('example')) {
        errors.push(`Environment variable ${envVar} appears to contain placeholder value`);
      }
    }

    // Validate VAPID email format
    const vapidEmail = process.env.VAPID_EMAIL;
    if (vapidEmail && !vapidEmail.includes('@')) {
      errors.push('VAPID_EMAIL must be a valid email address');
    }

    // Validate VAPID key formats
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (vapidPublicKey && vapidPublicKey.length !== 88) {
      warnings.push('VAPID public key length appears incorrect (should be 88 characters)');
    }

    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    if (vapidPrivateKey && vapidPrivateKey.length !== 43) {
      warnings.push('VAPID private key length appears incorrect (should be 43 characters)');
    }

    // Check if running in production
    if (process.env.NODE_ENV === 'production') {
      if (!process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL.includes('localhost')) {
        warnings.push('NEXT_PUBLIC_APP_URL should be set to production domain in production environment');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  static getConfiguration(): ProductionConfig | null {
    const validation = this.validateConfiguration();
    
    if (!validation.isValid) {
      console.error('Production configuration validation failed:', validation.errors);
      return null;
    }

    if (validation.warnings.length > 0) {
      console.warn('Production configuration warnings:', validation.warnings);
    }

    return {
      vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      vapidPrivateKey: process.env.VAPID_PRIVATE_KEY!,
      vapidEmail: process.env.VAPID_EMAIL!,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!
    };
  }

  static isPushNotificationEnabled(): boolean {
    const config = this.getConfiguration();
    return config !== null;
  }

  static logConfigurationStatus(): void {
    const validation = this.validateConfiguration();
    
    if (validation.isValid) {
      console.log('✅ Push notification configuration is valid');
      if (validation.warnings.length > 0) {
        console.warn('⚠️ Configuration warnings:', validation.warnings);
      }
    } else {
      console.error('❌ Push notification configuration is invalid:', validation.errors);
    }
  }
}

// Export for use in API routes and components
export const productionConfig = ProductionConfigValidator.getConfiguration();
export const isPushEnabled = ProductionConfigValidator.isPushNotificationEnabled(); 