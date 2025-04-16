'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { StudySparkLogoSvg } from "@/components/ui/StudySparkLogoSvg";
import Link from 'next/link';
import type { UserProfile } from '@/lib/user-context'; // Import type for checking

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Prevent access if already authenticated (optional but good practice)
  useEffect(() => {
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    if (isAuthenticated) {
      router.replace('/dashboard'); // Or check onboarding status here too
    }
  }, [router]);

  const handleLogin = () => {
    setIsLoading(true);
    // --- Simulate Login --- 
    // In a real app: validate inputs, send to backend, handle response
    console.log('Simulating login for:', email);

    // Simulate network delay
    setTimeout(() => {
      // On successful simulation:
      localStorage.setItem('isAuthenticated', 'true');

      // Check if onboarding is needed by looking at stored profile
      const savedProfileRaw = localStorage.getItem("studyspark_profile");
      let needsOnboarding = true; // Default to true
      if (savedProfileRaw) {
        try {
          const savedProfile: Partial<UserProfile> = JSON.parse(savedProfileRaw);
          if (savedProfile.name) {
            needsOnboarding = false;
          }
        } catch (e) {
          console.error("Error parsing profile during login check:", e);
          // Proceed assuming onboarding needed if profile is corrupted
        }
      }

      setIsLoading(false);

      // Redirect based on onboarding status
      if (needsOnboarding) {
        router.push('/onboarding');
      } else {
        router.push('/dashboard');
      }
    }, 1000); // 1 second delay
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-primary/10 via-background to-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 text-primary">
            <StudySparkLogoSvg height={60} />
          </div>
          <CardTitle className="text-2xl">Welcome Back!</CardTitle>
          <CardDescription>Sign in to continue to StudySpark.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <Button onClick={handleLogin} disabled={isLoading} className="w-full">
            {isLoading ? 'Signing In...' : 'Sign In'}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link href="/signup" className="underline hover:text-primary">
              Sign Up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
} 