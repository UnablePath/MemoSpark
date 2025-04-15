'use client';

import React from 'react';
import { useTheme } from 'next-themes';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useLocalStorage } from '@/hooks/useLocalStorage';

export function ThemeSettings() {
  const { theme, setTheme } = useTheme();
  const [isHighContrast, setIsHighContrast] = useLocalStorage<boolean>('highContrast', false);

  // TODO: Apply high-contrast class to root element when isHighContrast is true

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Theme</h3>
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <Label htmlFor="dark-mode" className="flex flex-col space-y-1">
          <span>Dark Mode</span>
          <span className="font-normal leading-snug text-muted-foreground">
            Toggle between light and dark themes.
          </span>
        </Label>
        <Switch 
          id="dark-mode" 
          checked={theme === 'dark'}
          onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
        />
      </div>
      <div className="flex items-center justify-between p-4 border rounded-lg">
         <Label htmlFor="high-contrast" className="flex flex-col space-y-1">
           <span>High Contrast Mode</span>
           <span className="font-normal leading-snug text-muted-foreground">
             Improve visibility with higher contrast.
           </span>
         </Label>
        <Switch 
          id="high-contrast" 
          checked={isHighContrast}
          onCheckedChange={setIsHighContrast}
        />
       </div>
       {/* Add custom color preferences later */}
    </div>
  );
} 