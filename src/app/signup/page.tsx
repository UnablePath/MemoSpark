'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { StudySparkLogoSvg } from "@/components/ui/StudySparkLogoSvg";
import Link from 'next/link';

export default function SignupPage() {

  // TODO: Implement actual signup form and logic
  const [signupError, setSignupError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = () => {
    setIsLoading(true);
    setSignupError(null);
    console.log('Simulating signup...');

    // Simulate network delay & potential error
    setTimeout(() => {
      // For now, always show a "coming soon" error
      setSignupError("Signup feature is under construction. Please check back later!");
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-primary/10 via-background to-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 text-primary" role="img" aria-label="StudySpark Logo">
            <StudySparkLogoSvg height={60} />
          </div>
          <CardTitle className="text-2xl focus:outline-dashed focus:outline-2" role="heading" aria-level={1} tabIndex={0}>Create Account</CardTitle>
          <CardDescription className="focus:outline-dashed focus:outline-2" tabIndex={0}>Join StudySpark today!</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Placeholder for actual form elements */}
          <p className="text-center text-muted-foreground focus:outline-dashed focus:outline-2" tabIndex={0}>
            (Signup form coming soon)
          </p>
          
          {signupError && (
              <p role="alert" className="text-sm text-red-600 mt-2 focus:outline-dashed focus:outline-2" tabIndex={0}>
                {signupError}
              </p>
          )}

          <Button onClick={handleSignup} variant="secondary" className="w-full focus:outline-dashed focus:outline-2 focus:outline-offset-2" disabled={isLoading}>
            {isLoading ? 'Processing...' : 'Create Account (Coming Soon)'}
          </Button>
          <p className="text-center text-sm text-muted-foreground focus:outline-dashed focus:outline-2" tabIndex={0}>
            Already have an account?{' '}
            <Link href="/login" className="underline hover:text-primary focus:outline-dashed focus:outline-2 focus:outline-offset-2">
              Sign In
            </Link>
          </p>
        </CardContent>
      </Card>
       {/* ARIA live region for status messages, e.g., signup success/failure */}
       <div aria-live="polite" className="sr-only" id="status-message-region">
        {signupError && <p>{signupError}</p>}
        {/* Could add success messages here if needed */}
      </div>
    </div>
  );
} 