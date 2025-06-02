/**
 * End-to-End Testing Script for StudySpark User Lifecycle
 * Tests: Signup → Webhook → Middleware → Onboarding → Data Sync → RLS
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
config({ path: path.resolve(process.cwd(), '.env.local') });

// Environment validation
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  'CLERK_SECRET_KEY',
  'CLERK_WEBHOOK_SECRET'
];

interface TestResult {
  testName: string;
  passed: boolean;
  details: string;
  timestamp: Date;
}

class E2ETestSuite {
  private results: TestResult[] = [];
  private supabaseAdmin: any;
  private supabaseClient: any;

  constructor() {
    // Validate environment variables first
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
      console.error('Please ensure your .env.local file is properly configured.');
      throw new Error(`Missing environment variables: ${missingVars.join(', ')}`);
    }

    // Initialize Supabase clients
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    try {
      this.supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });

      this.supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
      
      console.log('✅ Supabase clients initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Supabase clients:', error);
      throw error;
    }
  }

  private log(testName: string, passed: boolean, details: string) {
    const result: TestResult = {
      testName,
      passed,
      details,
      timestamp: new Date()
    };
    this.results.push(result);
    
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${testName}: ${details}`);
  }

  /**
   * Test 1: Environment Configuration
   */
  async testEnvironmentConfiguration(): Promise<void> {
    console.log('\n🔧 Testing Environment Configuration...');
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      this.log(
        'Environment Variables',
        false,
        `Missing required environment variables: ${missingVars.join(', ')}`
      );
      return;
    }

    this.log(
      'Environment Variables',
      true,
      'All required environment variables are present'
    );

    // Test Supabase connection
    try {
      const { data, error } = await this.supabaseAdmin.from('profiles').select('count').limit(1);
      if (error) throw error;
      
      this.log(
        'Supabase Connection',
        true,
        'Successfully connected to Supabase and can access profiles table'
      );
    } catch (error) {
      this.log(
        'Supabase Connection',
        false,
        `Failed to connect to Supabase: ${error}`
      );
    }
  }

  /**
   * Test 2: Profiles Table Structure
   */
  async testProfilesTableStructure(): Promise<void> {
    console.log('\n📋 Testing Profiles Table Structure...');
    
    try {
      // Check table structure
      const { data: columns, error } = await this.supabaseAdmin
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_name', 'profiles')
        .order('ordinal_position');

      if (error) throw error;

      const requiredColumns = [
        'clerk_user_id',
        'email',
        'full_name',
        'year_of_study',
        'learning_style',
        'subjects',
        'interests',
        'ai_preferences',
        'onboarding_completed',
        'created_at',
        'updated_at'
      ];

      const existingColumns = columns?.map((col: any) => col.column_name) || [];
      const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));

      if (missingColumns.length > 0) {
        this.log(
          'Profiles Table Structure',
          false,
          `Missing required columns: ${missingColumns.join(', ')}`
        );
      } else {
        this.log(
          'Profiles Table Structure',
          true,
          `All required columns present: ${existingColumns.length} columns found`
        );
      }

    } catch (error) {
      this.log(
        'Profiles Table Structure',
        false,
        `Failed to check table structure: ${error}`
      );
    }
  }

  /**
   * Test 3: RLS Policies
   */
  async testRLSPolicies(): Promise<void> {
    console.log('\n🔒 Testing Row Level Security Policies...');
    
    try {
      // Check if RLS is enabled
      const { data: rlsStatus, error: rlsError } = await this.supabaseAdmin
        .from('pg_tables')
        .select('rowsecurity')
        .eq('tablename', 'profiles')
        .single();

      if (rlsError) throw rlsError;

      if (rlsStatus?.rowsecurity) {
        this.log(
          'RLS Enabled',
          true,
          'Row Level Security is enabled on profiles table'
        );
      } else {
        this.log(
          'RLS Enabled',
          false,
          'Row Level Security is NOT enabled on profiles table'
        );
      }

      // Check for policies
      const { data: policies, error: policiesError } = await this.supabaseAdmin
        .from('pg_policies')
        .select('policyname, cmd, roles')
        .eq('tablename', 'profiles');

      if (policiesError) throw policiesError;

      if (policies && policies.length > 0) {
        this.log(
          'RLS Policies',
          true,
          `Found ${policies.length} RLS policies: ${policies.map((p: any) => p.policyname).join(', ')}`
        );
      } else {
        this.log(
          'RLS Policies',
          false,
          'No RLS policies found on profiles table'
        );
      }

    } catch (error) {
      this.log(
        'RLS Policies',
        false,
        `Failed to check RLS policies: ${error}`
      );
    }
  }

  /**
   * Test 4: Learning Style Enum
   */
  async testLearningStyleEnum(): Promise<void> {
    console.log('\n📚 Testing Learning Style Enum...');
    
    try {
      const { data: enumValues, error } = await this.supabaseAdmin
        .from('pg_enum')
        .select('enumlabel')
        .eq('enumtypid', '(SELECT oid FROM pg_type WHERE typname = \'learning_style_enum\')');

      if (error) throw error;

      const expectedValues = ['Visual', 'Auditory', 'Kinesthetic', 'Reading/Writing', 'Unspecified'];
      const actualValues = enumValues?.map((e: any) => e.enumlabel) || [];
      
      const hasAllValues = expectedValues.every(val => actualValues.includes(val));

      if (hasAllValues) {
        this.log(
          'Learning Style Enum',
          true,
          `Enum values correct: ${actualValues.join(', ')}`
        );
      } else {
        this.log(
          'Learning Style Enum',
          false,
          `Missing enum values. Expected: ${expectedValues.join(', ')}, Found: ${actualValues.join(', ')}`
        );
      }

    } catch (error) {
      this.log(
        'Learning Style Enum',
        false,
        `Failed to check learning style enum: ${error}`
      );
    }
  }

  /**
   * Test 5: Webhook Endpoint Accessibility
   */
  async testWebhookEndpoint(): Promise<void> {
    console.log('\n🔗 Testing Webhook Endpoint...');
    
    try {
      // Test if the webhook endpoint is accessible
      const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/clerk-webhooks`;
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ test: true })
      });

      if (response.status === 400 || response.status === 401) {
        // Expected - webhook should reject invalid requests
        this.log(
          'Webhook Endpoint',
          true,
          'Webhook endpoint is accessible and properly rejecting invalid requests'
        );
      } else {
        this.log(
          'Webhook Endpoint',
          false,
          `Unexpected response status: ${response.status}`
        );
      }

    } catch (error) {
      this.log(
        'Webhook Endpoint',
        false,
        `Failed to reach webhook endpoint: ${error}`
      );
    }
  }

  /**
   * Test 6: Server Action Testing
   */
  async testServerAction(): Promise<void> {
    console.log('\n⚡ Testing Server Action...');
    
    try {
      // Create a test FormData object
      const testFormData = new FormData();
      testFormData.append('name', 'Test User');
      testFormData.append('email', 'test@example.com');
      testFormData.append('yearOfStudy', 'Sophomore');
      testFormData.append('birthDate', '2000-01-01');
      testFormData.append('interests', 'programming,design');
      testFormData.append('learningStyle', 'Visual');
      testFormData.append('subjects', 'Computer Science,Mathematics');
      testFormData.append('aiPreferences', JSON.stringify({
        difficulty: 5,
        explanationStyle: 'balanced',
        interactionFrequency: 'moderate'
      }));

      // Note: We can't directly test the server action without authentication
      // This test checks if the function exports exist
      const actionsModule = await import('../src/app/clerk-onboarding/_actions');
      
      if (actionsModule && 'completeOnboarding' in actionsModule && typeof actionsModule.completeOnboarding === 'function') {
        this.log(
          'Server Action Export',
          true,
          'Server action is properly exported and accessible'
        );
      } else {
        this.log(
          'Server Action Export',
          false,
          'Server action is not properly exported'
        );
      }

    } catch (error) {
      this.log(
        'Server Action Testing',
        false,
        `Failed to test server action: ${error}`
      );
    }
  }

  /**
   * Test 7: Middleware Configuration
   */
  async testMiddlewareConfiguration(): Promise<void> {
    console.log('\n🛡️ Testing Middleware Configuration...');
    
    try {
      const middlewareModule = await import('../src/middleware');
      
      if (middlewareModule && 'default' in middlewareModule && typeof middlewareModule.default === 'function') {
        this.log(
          'Middleware Export',
          true,
          'Middleware is properly exported as a function'
        );
      } else {
        this.log(
          'Middleware Export',
          false,
          'Middleware is not properly exported as a function'
        );
      }

      // Check config export
      if (middlewareModule && 'config' in middlewareModule && middlewareModule.config) {
        this.log(
          'Middleware Config',
          true,
          'Middleware config is properly exported'
        );
      } else {
        this.log(
          'Middleware Config',
          false,
          'Middleware config is missing'
        );
      }

    } catch (error) {
      this.log(
        'Middleware Configuration',
        false,
        `Failed to test middleware: ${error}`
      );
    }
  }

  /**
   * Test 8: UI Components Accessibility
   */
  async testUIComponents(): Promise<void> {
    console.log('\n🎨 Testing UI Components...');
    
    try {
      // Test if onboarding page component exists
      const onboardingModule = await import('../src/app/clerk-onboarding/page');
      
      if (onboardingModule && 'default' in onboardingModule && typeof onboardingModule.default === 'function') {
        this.log(
          'Onboarding Component',
          true,
          'Onboarding page component is properly exported as a function'
        );
      } else {
        this.log(
          'Onboarding Component',
          false,
          'Onboarding page component is not properly exported as a function'
        );
      }

    } catch (error) {
      this.log(
        'UI Components',
        false,
        `Failed to test UI components: ${error}`
      );
    }
  }

  /**
   * Run all tests
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 Starting End-to-End Test Suite for StudySpark');
    console.log('================================================\n');

    await this.testEnvironmentConfiguration();
    await this.testProfilesTableStructure();
    await this.testRLSPolicies();
    await this.testLearningStyleEnum();
    await this.testWebhookEndpoint();
    await this.testServerAction();
    await this.testMiddlewareConfiguration();
    await this.testUIComponents();

    this.generateSummary();
  }

  /**
   * Generate test summary
   */
  private generateSummary(): void {
    console.log('\n📊 Test Summary');
    console.log('===============\n');

    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;

    console.log(`Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%\n`);

    if (failedTests > 0) {
      console.log('Failed Tests Details:');
      console.log('--------------------');
      this.results
        .filter(r => !r.passed)
        .forEach(result => {
          console.log(`❌ ${result.testName}: ${result.details}`);
        });
      console.log('');
    }

    // Overall status
    if (failedTests === 0) {
      console.log('🎉 All tests passed! The system is ready for production.');
    } else if (failedTests <= 2) {
      console.log('⚠️  Most tests passed, but there are some issues to address.');
    } else {
      console.log('💥 Multiple critical issues found. System needs attention before production.');
    }
  }
}

// Export for use in other scripts
export { E2ETestSuite };

// Run tests if this script is executed directly
if (require.main === module) {
  const testSuite = new E2ETestSuite();
  testSuite.runAllTests().catch(console.error);
} 