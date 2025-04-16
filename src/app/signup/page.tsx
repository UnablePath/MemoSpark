'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { StudySparkLogoSvg } from "@/components/ui/StudySparkLogoSvg";
import Link from 'next/link';

export default function SignupPage() {

  // TODO: Implement actual signup form and logic

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-primary/10 via-background to-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 text-primary">
            <StudySparkLogoSvg height={60} />
          </div>
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <CardDescription>Join StudySpark today!</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            (Signup form coming soon)
          </p>
          {/* Placeholder inputs or form elements can go here */}
          <Button variant="secondary" className="w-full" disabled>
            Create Account (Coming Soon)
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="underline hover:text-primary">
              Sign In
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
} 