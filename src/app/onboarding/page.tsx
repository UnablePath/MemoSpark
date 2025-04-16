'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/lib/user-context';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import Logo from '@/components/ui/logo';

export default function OnboardingPage() {
  const router = useRouter();
  const { profile, updateProfile, saveProfile, isProfileLoaded } = useUser();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  // Redirect if profile already exists and is loaded
  useEffect(() => {
    if (isProfileLoaded && profile.name) {
      router.replace('/dashboard'); // Go to dashboard if already onboarded
    }
  }, [isProfileLoaded, profile, router]);

  const handleOnboardingSubmit = () => {
    updateProfile({ name, email });
    // Attempt to save - saveProfile includes validation and toasts
    if (saveProfile()) {
      router.push('/dashboard'); // Navigate to dashboard on successful save
    }
  };

  // Show loading state until context determines onboarding status
  if (!isProfileLoaded || (isProfileLoaded && profile.name)) {
      return (
          <div className="flex items-center justify-center h-screen bg-background">
              {/* Add a spinner or skeleton loader here if desired */}
              <p>Loading...</p>
          </div>
      );
  }

  // Render onboarding form if loaded and profile name is missing
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-primary/10 via-background to-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
            <div className="mx-auto mb-4">
                <Logo size="lg" />
            </div>
          <CardTitle className="text-2xl">Welcome to StudySpark!</CardTitle>
          <CardDescription>Let's get your profile set up quickly.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              placeholder="e.g., Alex Johnson"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="e.g., alex@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
           {/* Add other optional fields later (Year, Subjects, Interests) */}
          <Button onClick={handleOnboardingSubmit} className="w-full">Let's Go!</Button>
        </CardContent>
      </Card>
    </div>
  );
} 