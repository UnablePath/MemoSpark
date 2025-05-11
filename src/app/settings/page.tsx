"use client";

import React, { useState, useEffect } from 'react';
import { ThemeSettings } from '@/components/settings/ThemeSettings';
import { AccessibilitySettings } from '@/components/settings/AccessibilitySettings';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react'; // Assuming lucide-react for icons
import { useRouter } from 'next/navigation'; // Added useRouter
import { useLocalStorage } from '@/hooks/useLocalStorage'; // Added hook
import { Switch } from "@/components/ui/switch"; // Added Switch
import { Label } from "@/components/ui/label"; // Added Label
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Added Card
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"; // Added RadioGroup
import { cn } from "@/lib/utils"

// Settings Section Component (Optional but good for organization)
interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}
const SettingsSection: React.FC<SettingsSectionProps> = ({ title, children }) => (
  <Card>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
    </CardHeader>
    <CardContent>
      {children}
    </CardContent>
  </Card>
);

export default function SettingsPage() {
  const router = useRouter(); // Added router instance
  const [isWidgetEnabled, setIsWidgetEnabled] = useLocalStorage('dashboard-widget-enabled', false);
  const [widgetShape, setWidgetShape] = useLocalStorage('dashboard-widget-shape', 'rounded'); // Added shape state
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [motionEnabled, setMotionEnabled] = useLocalStorage('motion-enabled', true);

  const handleSaveChanges = () => {
    // In a real app, save settings to backend or context
    console.log("Settings saved:", { isWidgetEnabled, widgetShape, motionEnabled });
    setSettingsMessage("Settings saved successfully!");
    setTimeout(() => setSettingsMessage(null), 3000); // Clear message after 3s
  };

  const handleResetDefaults = () => {
    setIsWidgetEnabled(false);
    setWidgetShape('rounded');
    setMotionEnabled(true);
    setSettingsMessage("Settings reset to defaults.");
    setTimeout(() => setSettingsMessage(null), 3000); // Clear message after 3s
  };

  useEffect(() => {
    // Apply reduced motion based on preference
    if (typeof window !== 'undefined') {
      document.documentElement.classList.toggle('prefers-reduced-motion', !motionEnabled);
    }
  }, [motionEnabled]);

  return (
    <div className="container mx-auto max-w-2xl py-8 px-4">
       <a href="#main-settings-content" className="sr-only focus:not-sr-only absolute top-2 left-2 z-50 bg-primary text-primary-foreground px-4 py-2 rounded focus:outline-dashed focus:outline-2 focus:outline-offset-2">Skip to main content</a>
      <div className="mb-6 flex items-center">
         <Button
           variant="ghost"
           size="icon"
           className="mr-2 focus:outline-dashed focus:outline-2 focus:outline-offset-2"
           onClick={() => router.back()} // Go back in history
           aria-label="Go back"
         >
           <ArrowLeft className="h-4 w-4" aria-hidden="true" />
         </Button>
        <h1 id="main-settings-content" className="text-2xl font-bold focus:outline-dashed focus:outline-2" role="heading" aria-level={1} tabIndex={-1}>Settings</h1>
      </div>

      <div className="space-y-8">
        <SettingsSection title="Theme">
            <ThemeSettings />
        </SettingsSection>

        <SettingsSection title="Accessibility">
            <AccessibilitySettings /> 
             <div className="flex items-center justify-between space-x-2 pt-4 border-t mt-4">
                <Label htmlFor="motion-toggle" className="flex flex-col space-y-1">
                <span>Enable Animations</span>
                <span className="font-normal leading-snug text-muted-foreground">
                    Toggle animations and motion effects across the app.
                </span>
                </Label>
                <Switch
                id="motion-toggle"
                checked={motionEnabled}
                onCheckedChange={setMotionEnabled}
                aria-label="Toggle animations and motion effects"
                className="focus:outline-dashed focus:outline-2 focus:outline-offset-2"
                />
            </div>
        </SettingsSection>

        <SettingsSection title="Dashboard Widget">
          <div className="space-y-4">
            <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="widget-toggle" className="flex flex-col space-y-1">
                <span>Show Mascot Widget</span>
                <span className="font-normal leading-snug text-muted-foreground">
                    Display the draggable widget on the dashboard.
                </span>
                </Label>
                <Switch
                id="widget-toggle"
                checked={isWidgetEnabled}
                onCheckedChange={setIsWidgetEnabled}
                aria-label="Toggle mascot widget visibility"
                className="focus:outline-dashed focus:outline-2 focus:outline-offset-2"
                />
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-foreground">Widget Shape</legend>
              <RadioGroup
                value={widgetShape}
                onValueChange={setWidgetShape}
                className="flex space-x-4 pt-1"
                aria-label="Choose the shape of the mascot widget"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="square" id="shape-square" className="focus:outline-dashed focus:outline-2 focus:outline-offset-2" />
                  <Label htmlFor="shape-square">Square</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="rounded" id="shape-rounded" className="focus:outline-dashed focus:outline-2 focus:outline-offset-2" />
                  <Label htmlFor="shape-rounded">Rounded</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pill" id="shape-pill" className="focus:outline-dashed focus:outline-2 focus:outline-offset-2" />
                  <Label htmlFor="shape-pill">Pill</Label>
                </div>
              </RadioGroup>
            </fieldset>
          </div>
        </SettingsSection>

      </div>

      {settingsMessage && (
          <div role="status" aria-live="assertive" className="mt-6 p-3 bg-green-100 border border-green-300 text-green-700 rounded-md text-center focus:outline-dashed focus:outline-2" tabIndex={-1}>
              {settingsMessage}
          </div>
      )}

      <div className="mt-8 flex justify-end space-x-2">
        <Button variant="outline" onClick={handleResetDefaults} className="focus:outline-dashed focus:outline-2 focus:outline-offset-2">Reset to Defaults</Button>
        <Button onClick={handleSaveChanges} className="focus:outline-dashed focus:outline-2 focus:outline-offset-2">Save Changes</Button> 
      </div>
      {/* ARIA live region for status messages that should be sr-only but announced */}
      <div aria-live="polite" className="sr-only" id="status-message-region">
        {settingsMessage && <p>{settingsMessage}</p>}
      </div>
    </div>
  );
}
