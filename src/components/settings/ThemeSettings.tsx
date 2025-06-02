'use client';

import type React from 'react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useThemeContext } from '@/components/providers/theme-provider';

export const ThemeSettings: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { accessibilityOptions, setAccessibilityOption } = useThemeContext();
  const { highContrast } = accessibilityOptions;

  const handleHighContrastChange = (checked: boolean) => {
    setAccessibilityOption('highContrast', checked);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Label htmlFor="dark-mode-toggle" className="flex flex-col space-y-1">
          <span className="text-base font-medium">Dark Mode</span>
          <span className="font-normal leading-snug text-muted-foreground">
            Enable or disable dark mode.
          </span>
        </Label>
        <Switch 
          id="dark-mode-toggle"
          checked={theme === 'dark'}
          onCheckedChange={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label="Toggle dark mode"
        />
      </div>

      <div className="flex items-center justify-between pt-4 border-t mt-4">
        <Label htmlFor="high-contrast-toggle" className="flex flex-col space-y-1">
          <span className="text-base font-medium">High Contrast Mode</span>
           <span className="font-normal leading-snug text-muted-foreground">
            Enable high contrast for better readability.
           </span>
         </Label>
        <Switch 
          id="high-contrast-toggle"
          checked={highContrast}
          onCheckedChange={handleHighContrastChange}
          aria-label="Toggle high contrast mode"
        />
       </div>
      
      {/* Placeholder for Custom Color Preferences - to be implemented based on specific needs */}
      {/* <div className="pt-4 border-t mt-4">
        <h4 className="text-base font-medium mb-1">Custom Color Preferences</h4>
        <p className="text-sm text-muted-foreground">Choose your preferred accent colors. (Coming soon)</p>
      </div> */}
    </div>
  );
};

export default ThemeSettings;