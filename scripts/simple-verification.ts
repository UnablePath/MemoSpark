/**
 * Simple Verification Script for StudySpark Components
 * Tests the components we can verify without full environment setup
 */

import { config } from 'dotenv';
import path from 'path';

// Load environment variables
config({ path: path.resolve(process.cwd(), '.env.local') });

interface TestResult {
  testName: string;
  passed: boolean;
  details: string;
}

class SimpleVerificationSuite {
  private results: TestResult[] = [];

  private log(testName: string, passed: boolean, details: string) {
    const result: TestResult = { testName, passed, details };
    this.results.push(result);
    
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${testName}: ${details}`);
  }

  /**
   * Test 1: Component Exports
   */
  async testComponentExports(): Promise<void> {
    console.log('\n🎨 Testing Component Exports...');
    
    try {
      // Test onboarding page component
      const onboardingModule = await import('../src/app/clerk-onboarding/page');
      
      if (onboardingModule && 'default' in onboardingModule && typeof onboardingModule.default === 'function') {
        this.log(
          'Onboarding Component',
          true,
          'Onboarding page component is properly exported'
        );
      } else {
        this.log(
          'Onboarding Component',
          false,
          'Onboarding page component is not properly exported'
        );
      }

      // Test server action
      const actionsModule = await import('../src/app/clerk-onboarding/_actions');
      
      if (actionsModule && 'completeOnboarding' in actionsModule && typeof actionsModule.completeOnboarding === 'function') {
        this.log(
          'Server Action Export',
          true,
          'Server action is properly exported'
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
        'Component Exports',
        false,
        `Failed to test component exports: ${error}`
      );
    }
  }

  /**
   * Test 2: Middleware Configuration
   */
  async testMiddleware(): Promise<void> {
    console.log('\n🛡️ Testing Middleware...');
    
    try {
      const middlewareModule = await import('../src/middleware');
      
      if (middlewareModule && 'default' in middlewareModule && typeof middlewareModule.default === 'function') {
        this.log(
          'Middleware Export',
          true,
          'Middleware is properly exported'
        );
      } else {
        this.log(
          'Middleware Export',
          false,
          'Middleware is not properly exported'
        );
      }

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
        'Middleware Testing',
        false,
        `Failed to test middleware: ${error}`
      );
    }
  }

  /**
   * Test 3: Environment Variables (Basic)
   */
  async testBasicEnvironment(): Promise<void> {
    console.log('\n🔧 Testing Basic Environment...');
    
    const basicEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'
    ];

    const missingVars = basicEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length === 0) {
      this.log(
        'Basic Environment Variables',
        true,
        'All basic environment variables are present'
      );
    } else {
      this.log(
        'Basic Environment Variables',
        false,
        `Missing variables: ${missingVars.join(', ')}`
      );
    }
  }

  /**
   * Test 4: Build Process
   */
  async testBuildReadiness(): Promise<void> {
    console.log('\n🏗️ Testing Build Readiness...');
    
    try {
      // Check if key files exist
      const fs = await import('fs');
      const filesToCheck = [
        'src/app/clerk-onboarding/page.tsx',
        'src/app/clerk-onboarding/_actions.ts',
        'src/middleware.ts',
        'src/app/api/clerk-webhooks/route.ts'
      ];

      let allFilesExist = true;
      for (const file of filesToCheck) {
        if (!fs.existsSync(file)) {
          allFilesExist = false;
          this.log(
            'File Check',
            false,
            `Missing file: ${file}`
          );
        }
      }

      if (allFilesExist) {
        this.log(
          'Required Files',
          true,
          'All required files are present'
        );
      }

    } catch (error) {
      this.log(
        'Build Readiness',
        false,
        `Failed to check build readiness: ${error}`
      );
    }
  }

  /**
   * Test 5: TypeScript Configuration
   */
  async testTypeScriptConfig(): Promise<void> {
    console.log('\n📝 Testing TypeScript Configuration...');
    
    try {
      const fs = await import('fs');
      
      if (fs.existsSync('tsconfig.json')) {
        this.log(
          'TypeScript Config',
          true,
          'tsconfig.json exists'
        );
      } else {
        this.log(
          'TypeScript Config',
          false,
          'tsconfig.json is missing'
        );
      }

      if (fs.existsSync('next.config.js')) {
        this.log(
          'Next.js Config',
          true,
          'next.config.js exists'
        );
      } else {
        this.log(
          'Next.js Config',
          false,
          'next.config.js is missing'
        );
      }

    } catch (error) {
      this.log(
        'TypeScript Configuration',
        false,
        `Failed to check TypeScript config: ${error}`
      );
    }
  }

  /**
   * Run all verification tests
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 Starting StudySpark Component Verification');
    console.log('==============================================\n');

    await this.testComponentExports();
    await this.testMiddleware();
    await this.testBasicEnvironment();
    await this.testBuildReadiness();
    await this.testTypeScriptConfig();

    this.generateSummary();
  }

  /**
   * Generate test summary
   */
  private generateSummary(): void {
    console.log('\n📊 Verification Summary');
    console.log('=======================\n');

    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;

    console.log(`Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%\n`);

    if (failedTests > 0) {
      console.log('Failed Tests:');
      this.results
        .filter(r => !r.passed)
        .forEach(result => {
          console.log(`❌ ${result.testName}: ${result.details}`);
        });
      console.log('');
    }

    if (failedTests === 0) {
      console.log('🎉 All component tests passed! System structure is correct.');
    } else if (failedTests <= 2) {
      console.log('⚠️  Most tests passed, minor issues to address.');
    } else {
      console.log('💥 Several issues found. Please review the implementation.');
    }
  }
}

// Run the tests
if (require.main === module) {
  const verificationSuite = new SimpleVerificationSuite();
  verificationSuite.runAllTests().catch(console.error);
} 