'use client';

import React, { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useLocalStorage } from '@/hooks/useLocalStorage';

const DEFAULT_FONT_SIZE = 16;

export function AccessibilitySettings() {
  const [reducedMotion, setReducedMotion] = useLocalStorage<boolean>('reducedMotion', false);
  const [fontSize, setFontSize] = useLocalStorage<number>('fontSize', DEFAULT_FONT_SIZE);

  // Apply font size change to the root element
  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}px`;
  }, [fontSize]);

  // TODO: Check for reducedMotion preference in animation components

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Accessibility</h3>

      <div className="space-y-4 p-4 border rounded-lg">
        <div className="flex justify-between items-center">
           <Label htmlFor="font-size">Font Size</Label>
           <span className="text-sm font-medium">{fontSize}px</span>
        </div>
        <Slider 
          id="font-size" 
          value={[fontSize]} 
          max={24} 
          min={12} 
          step={1} 
          onValueChange={(value) => setFontSize(value[0])} 
        />
        <span className="text-sm text-muted-foreground">Adjust the base font size for the application.</span>
      </div>

      <div className="flex items-center justify-between p-4 border rounded-lg">
        <Label htmlFor="reduced-motion" className="flex flex-col space-y-1">
          <span>Reduced Motion</span>
          <span className="font-normal leading-snug text-muted-foreground">
            Minimize animations and transitions.
          </span>
        </Label>
        <Switch 
          id="reduced-motion" 
          checked={reducedMotion}
          onCheckedChange={setReducedMotion}
        />
      </div>

      {/* Add screen reader optimization settings later */}
    </div>
  );
} 