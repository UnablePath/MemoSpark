'use client';

import type React from 'react';
import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useThemeContext } from '@/components/providers/theme-provider';
import { useLocalStorage } from '@/hooks/useLocalStorage';

export const AccessibilitySettings: React.FC = () => {
  const [fontSizeMultiplier, setFontSizeMultiplier] = useLocalStorage('fontSizeMultiplier', 1);
  const { accessibilityOptions, setAccessibilityOption } = useThemeContext();
  const { reducedMotion, largeText } = accessibilityOptions;

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSizeMultiplier * 16}px`;
  }, [fontSizeMultiplier]);

  const increaseFontSize = () => setFontSizeMultiplier(prev => Math.min(prev + 0.1, 1.5));
  const decreaseFontSize = () => setFontSizeMultiplier(prev => Math.max(prev - 0.1, 0.8));

  const handleReducedMotionChange = (checked: boolean) => {
    setAccessibilityOption('reducedMotion', checked);
  };

  const handleLargeTextChange = (checked: boolean) => {
    setAccessibilityOption('largeText', checked);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label className="block text-base font-medium">Font Size</Label>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={decreaseFontSize} aria-label="Decrease font size">-</Button>
          <span className="min-w-[40px] text-center text-sm">{(fontSizeMultiplier * 100).toFixed(0)}%</span>
          <Button variant="outline" onClick={increaseFontSize} aria-label="Increase font size">+</Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Adjust the text size for better readability.
        </p>
      </div>

      <div className="flex items-center justify-between pt-4 border-t mt-4">
        <Label htmlFor="reduced-motion-toggle" className="flex flex-col space-y-1">
          <span className="text-base font-medium">Reduced Motion</span>
          <span className="font-normal leading-snug text-muted-foreground">
            Disable animations and transitions for a calmer experience.
          </span>
        </Label>
        <Switch 
          id="reduced-motion-toggle"
          checked={reducedMotion}
          onCheckedChange={handleReducedMotionChange}
          aria-label="Toggle reduced motion"
        />
      </div>

      <div className="flex items-center justify-between pt-4 border-t mt-4">
        <Label htmlFor="large-text-toggle" className="flex flex-col space-y-1">
          <span className="text-base font-medium">Large Text</span>
          <span className="font-normal leading-snug text-muted-foreground">
            Increase text size globally for improved legibility.
          </span>
        </Label>
        <Switch
          id="large-text-toggle"
          checked={largeText}
          onCheckedChange={handleLargeTextChange}
          aria-label="Toggle large text mode"
        />
      </div>

      {/* Placeholder for Screen Reader Optimization Settings - to be implemented based on specific needs */}
      {/* <div className="pt-4 border-t mt-4">
        <h4 className="text-base font-medium mb-1">Screen Reader Optimizations</h4>
        <p className="text-sm text-muted-foreground">Fine-tune settings for screen reader users. (Coming soon)</p>
      </div> */}
    </div>
  );
};

export default AccessibilitySettings;