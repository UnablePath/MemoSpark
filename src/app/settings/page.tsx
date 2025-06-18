"use client";

import type React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Crown, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import ThemeSettings from '@/components/settings/ThemeSettings';
import AccessibilitySettings from '@/components/settings/AccessibilitySettings';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import Link from 'next/link';


// interface SettingsPageProps {} // Add if props are needed

const SettingsPage: React.FC = () => {
  const router = useRouter();

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="app-container min-h-screen bg-background">
      {/* Navigation Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border pt-safe-top">
        <div className="responsive-container flex items-center gap-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="touch-target h-8 w-8 p-0 hover:bg-muted"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-semibold text-foreground">Settings</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="responsive-container py-6 safe-scroll-area">
        <div className="space-y-8 max-w-4xl">
          {/* Subscription Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                Subscription & Usage
              </CardTitle>
              <CardDescription>
                Manage your StudySpark subscription, view usage statistics, and upgrade your plan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/settings/subscription">
                <Button className="w-full sm:w-auto">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Manage Subscription
                </Button>
              </Link>
            </CardContent>
          </Card>

          <NotificationSettings />
          <ThemeSettings />
          <AccessibilitySettings />
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
