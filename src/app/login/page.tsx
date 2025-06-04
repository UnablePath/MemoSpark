'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { MemoSparkLogoSvg } from "@/components/ui/MemoSparkLogoSvg";
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleLogin = () => {
    setIsLoading(true);
    setLoginError(null);
    console.log('Simulating login for:', email);

    // Simulate network delay
    setTimeout(() => {
      // --- Authentication simulation successful --- 
      // No need to set isAuthenticated flag here anymore.
      // No need to check onboarding status here.
      
      // Simulate potential login error
      if (email === "error@example.com") {
          setLoginError("Invalid email or password. Please try again.");
          setIsLoading(false);
          return;
      }

      setIsLoading(false);
      // Always redirect to dashboard after successful login
      router.push('/dashboard');

    }, 1000);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-primary/10 via-background to-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
                      <div className="mx-auto mb-4 text-primary" role="img" aria-label="MemoSpark Logo">
                              <MemoSparkLogoSvg height={60} />
          </div>
          <CardTitle className="text-2xl focus:outline-dashed focus:outline-2" role="heading" aria-level={1} tabIndex={0}>Welcome Back!</CardTitle>
                      <CardDescription className="focus:outline-dashed focus:outline-2" tabIndex={0}>Sign in to continue to MemoSpark.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
                aria-required="true"
                aria-describedby={loginError ? "login-error-message" : undefined}
                className="focus:outline-dashed focus:outline-2 focus:outline-offset-2"
              />
            </div>
            <div className="space-y-2 mt-4">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
                aria-required="true"
                aria-describedby={loginError ? "login-error-message" : undefined}
                className="focus:outline-dashed focus:outline-2 focus:outline-offset-2"
              />
            </div>
            {loginError && (
              <p id="login-error-message" role="alert" className="text-sm text-red-600 mt-2 focus:outline-dashed focus:outline-2" tabIndex={0}>
                {loginError}
              </p>
            )}
            <Button type="submit" disabled={isLoading} className="w-full mt-6 focus:outline-dashed focus:outline-2 focus:outline-offset-2">
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground focus:outline-dashed focus:outline-2" tabIndex={0}>
            Don't have an account?{' '}
            <Link href="/signup" className="underline hover:text-primary focus:outline-dashed focus:outline-2 focus:outline-offset-2">
              Sign Up
            </Link>
          </p>
        </CardContent>
      </Card>
      {/* ARIA live region for status messages, e.g., login success/failure */}
      <div aria-live="polite" className="sr-only" id="status-message-region">
        {loginError && <p>{loginError}</p>}
        {/* Could add success messages here if needed */}
      </div>
    </div>
  );
} 