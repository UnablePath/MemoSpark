import { NextResponse } from 'next/server';
import { productionConfig, isPushEnabled, ProductionConfigValidator } from '@/lib/notifications/productionConfig';

export async function GET() {
  try {
    const validation = ProductionConfigValidator.validateConfiguration();
    
    return NextResponse.json({
      status: validation.isValid ? 'healthy' : 'unhealthy',
      pushNotificationsEnabled: isPushEnabled,
      configurationValid: validation.isValid,
      errors: validation.errors,
      warnings: validation.warnings,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      pushNotificationsEnabled: false,
      configurationValid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 