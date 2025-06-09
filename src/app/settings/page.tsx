"use client";

import type React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ThemeSettings from '@/components/settings/ThemeSettings';
import AccessibilitySettings from '@/components/settings/AccessibilitySettings';


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
          <ThemeSettings />
          <AccessibilitySettings />
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
