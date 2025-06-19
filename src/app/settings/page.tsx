"use client";

import type React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Crown, CreditCard, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import ThemeSettings from '@/components/settings/ThemeSettings';
import AccessibilitySettings from '@/components/settings/AccessibilitySettings';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { NotificationAnalytics } from '@/components/notifications/NotificationAnalytics';
import Link from 'next/link';
import { ReminderSettings } from '@/components/reminders/ReminderSettings';
import { useState } from 'react';

// interface SettingsPageProps {} // Add if props are needed

const SettingsPage: React.FC = () => {
  const router = useRouter();
  const [isReminderSettingsOpen, setIsReminderSettingsOpen] = useState(false);
  const [isAdvancedSettingsOpen, setIsAdvancedSettingsOpen] = useState(false);

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div 
      className="min-h-screen bg-background"
      style={{
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y',
      }}
    >
      {/* Navigation Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="h-8 w-8 p-0 hover:bg-muted min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-semibold text-foreground">Settings</h1>
        </div>
      </div>

      {/* Main Content */}
      <div 
        className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"
        style={{
          overflowY: 'visible',
          touchAction: 'pan-y',
        }}
      >
        <div 
          className="space-y-6 max-w-4xl"
          style={{
            touchAction: 'pan-y',
          }}
        >
          {/* 1. Subscription Management - Top Priority */}
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

          {/* 2. Push Notifications - Important for functionality */}
          <NotificationSettings />

          {/* 3. Theme Settings - Visual preference */}
          <Card>
            <CardHeader>
              <CardTitle>Appearance & Theme</CardTitle>
              <CardDescription>
                Customize the look and feel of your StudySpark experience
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ThemeSettings />
            </CardContent>
          </Card>

          {/* 4. Proactive Reminder Settings - Collapsible Advanced Section */}
          <Card>
            <CardHeader 
              className="cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg"
              onClick={() => setIsReminderSettingsOpen(!isReminderSettingsOpen)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    🔔 Proactive Reminder Settings
                  </CardTitle>
                  <CardDescription>
                    Advanced AI-powered reminder customization and timing
                  </CardDescription>
                </div>
                {isReminderSettingsOpen ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
            {isReminderSettingsOpen && (
              <CardContent className="pt-0">
                <ReminderSettings />
              </CardContent>
            )}
          </Card>

          {/* 5. Advanced Settings - Additional Collapsible Section */}
          <Card>
            <CardHeader 
              className="cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg"
              onClick={() => setIsAdvancedSettingsOpen(!isAdvancedSettingsOpen)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    ⚙️ Advanced Settings
                  </CardTitle>
                  <CardDescription>
                    Accessibility options and notification analytics
                  </CardDescription>
                </div>
                {isAdvancedSettingsOpen ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
            {isAdvancedSettingsOpen && (
              <CardContent className="pt-0 space-y-6">
                {/* Notification Analytics */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Notification Analytics</h3>
                  <NotificationAnalytics />
                </div>
                
                {/* Accessibility Settings */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Accessibility</h3>
                  <AccessibilitySettings />
                </div>
              </CardContent>
            )}
          </Card>

          {/* Quick Access Info */}
          <Card className="bg-muted/30">
            <CardContent className="pt-6">
              <div className="text-center text-sm text-muted-foreground">
                <p>Need help? Check out our <Link href="/about" className="text-primary hover:underline">documentation</Link> or <Link href="/contact" className="text-primary hover:underline">contact support</Link>.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
