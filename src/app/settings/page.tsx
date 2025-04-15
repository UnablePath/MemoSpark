"use client";

import React from 'react';
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

  return (
    <div className="container mx-auto max-w-2xl py-8 px-4">
      <div className="mb-6 flex items-center">
         <Button
           variant="ghost"
           size="icon"
           className="mr-2"
           onClick={() => router.back()} // Go back in history
           aria-label="Go back"
         >
           <ArrowLeft className="h-4 w-4" />
         </Button>
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      <div className="space-y-8">
        <SettingsSection title="Theme">
            <ThemeSettings />
        </SettingsSection>

        <SettingsSection title="Accessibility">
             <AccessibilitySettings />
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
                />
            </div>

            <div className="space-y-2">
              <Label>Widget Shape</Label>
              <RadioGroup
                value={widgetShape}
                onValueChange={setWidgetShape}
                className="flex space-x-4 pt-1"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="square" id="shape-square" />
                  <Label htmlFor="shape-square">Square</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="rounded" id="shape-rounded" />
                  <Label htmlFor="shape-rounded">Rounded</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pill" id="shape-pill" />
                  <Label htmlFor="shape-pill">Pill</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        </SettingsSection>

      </div>

      <div className="mt-8 flex justify-end space-x-2">
        <Button variant="outline">Reset to Defaults</Button>
        <Button>Save Changes</Button> {/* Add onClick handler */} 
      </div>
    </div>
  );
}
