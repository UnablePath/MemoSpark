'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { useOptimizedTheme } from '@/hooks/useOptimizedTheme';
import { Sun, Moon, Palette } from 'lucide-react';

/**
 * Quick theme test button for verifying immediate theme switching
 * This component can be temporarily added anywhere to test theme performance
 */
export const ThemeTestButton: React.FC = () => {
  const { theme, toggleMode, isChanging, isDark } = useOptimizedTheme();

  return (
    <div className="flex items-center gap-2 p-2 border rounded-lg bg-card">
      <span className="text-sm text-muted-foreground">Quick Test:</span>
      <Button
        variant="outline"
        size="sm"
        onClick={toggleMode}
        disabled={isChanging}
        className="flex items-center gap-2"
      >
        {isDark ? (
          <Sun className="h-4 w-4" />
        ) : (
          <Moon className="h-4 w-4" />
        )}
        {isChanging ? 'Switching...' : `Switch to ${isDark ? 'Light' : 'Dark'}`}
      </Button>
      <div className="text-xs text-muted-foreground">
        Current: {theme}
      </div>
      {isChanging && (
        <Palette className="h-4 w-4 animate-spin text-primary" />
      )}
    </div>
  );
};

export default ThemeTestButton; 