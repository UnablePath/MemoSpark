'use client';

import type React from 'react';
import { useTheme } from 'next-themes';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useThemeContext } from '@/components/providers/theme-provider';
import { Check, Palette, Sun, Moon } from 'lucide-react';

// Define theme pairs with both light and dark variants
const themePairs = [
  {
    id: 'default',
    name: 'Clean',
    description: 'Classic Vibes',
    category: 'default',
    dark: { id: 'dark', previewColors: ['#1a1a1a', '#ffffff', '#22c55e'] },
    light: { id: 'light', previewColors: ['#fafafa', '#09090b', '#16a34a'] }
  },
  {
    id: 'amoled',
    name: 'Amoled',
    description: 'True black for OLED displays, hits different',
    category: 'minimal',
    dark: { id: 'theme-amoled', previewColors: ['#000000', '#fafafa', '#10b981'] },
    light: { id: 'theme-amoled-light', previewColors: ['#ffffff', '#0a0a0a', '#059669'] }
  },
  {
    id: 'carbon',
    name: 'Minimalist',
    description: 'Sleek and Iconic',
    category: 'minimal',
    dark: { id: 'theme-carbon', previewColors: ['#0f0f0f', '#ebebeb', '#00d4ff'] },
    light: { id: 'theme-carbon-light', previewColors: ['#f0f0f0', '#262626', '#0284c7'] }
  },
  {
    id: 'sea-blue',
    name: 'Ocean Core',
    description: 'Deep Sea Vibes',
    category: 'nature',
    dark: { id: 'theme-sea-blue', previewColors: ['#0c1626', '#e0f2fe', '#0ea5e9'] },
    light: { id: 'theme-sea-blue-light', previewColors: ['#f7fcff', '#1e293b', '#0284c7'] }
  },
  {
    id: 'midnight-blue',
    name: 'Midnight Mode',
    description: 'Professional but Cozy',
    category: 'nature',
    dark: { id: 'theme-midnight-blue', previewColors: ['#0a1220', '#e8f4f8', '#3b82f6'] },
    light: { id: 'theme-midnight-blue-light', previewColors: ['#f0f4f8', '#1e293b', '#1d4ed8'] }
  },
  {
    id: 'void-purple',
    name: 'Cosmic Purple',
    description: 'Space Energy',
    category: 'cosmic',
    dark: { id: 'theme-void-purple', previewColors: ['#0d0a1a', '#f3f0ff', '#a855f7'] },
    light: { id: 'theme-void-purple-light', previewColors: ['#faf5ff', '#1e1b3a', '#7c3aed'] }
  },
  {
    id: 'sunset-orange',
    name: 'Golden Hour',
    description: 'Warm and Energetic',
    category: 'cosmic',
    dark: { id: 'theme-sunset-orange', previewColors: ['#1a0f0a', '#fff7ed', '#ea580c'] },
    light: { id: 'theme-sunset-orange-light', previewColors: ['#fff7ed', '#431407', '#c2410c'] }
  },
  {
    id: 'hello-kitty-pink',
    name: 'Hello Kitty Princess',
    description: 'Coquette Aesthetic',
    category: 'playful',
    dark: { id: 'theme-hello-kitty-pink', previewColors: ['#1a0f17', '#fce7f3', '#ec4899'] },
    light: { id: 'theme-hello-kitty-pink-light', previewColors: ['#fdf2f8', '#3f1728', '#be185d'] }
  },
  {
    id: 'cherry-blossom',
    name: 'Soft Life dreams',
    description: 'Demure Feminine Energy',
    category: 'playful',
    dark: { id: 'theme-cherry-blossom', previewColors: ['#1a0f17', '#fef7f7', '#f472b6'] },
    light: { id: 'theme-cherry-blossom-light', previewColors: ['#fef7f7', '#3f1728', '#db2777'] }
  },
  {
    id: 'hacker-green',
    name: 'Digital Matrix Green',
    description: '...I\'m in',
    category: 'retro',
    dark: { id: 'theme-hacker-green', previewColors: ['#0a140a', '#dcfce7', '#00ff00'] },
    light: { id: 'theme-hacker-green-light', previewColors: ['#f0fdf4', '#14532d', '#15803d'] }
  }
];

export const ThemeSettings: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { accessibilityOptions, setAccessibilityOption } = useThemeContext();
  const { highContrast } = accessibilityOptions;

  const handleHighContrastChange = (checked: boolean) => {
    setAccessibilityOption('highContrast', checked);
  };

  // Determine if current theme is light or dark
  const isLightTheme = theme === 'light' || theme?.includes('-light');

  // Group theme pairs by category
  const groupedThemes = themePairs.reduce((acc, themePair) => {
    if (!acc[themePair.category]) acc[themePair.category] = [];
    acc[themePair.category].push(themePair);
    return acc;
  }, {} as Record<string, typeof themePairs>);

  // Get current theme pair
  const getCurrentThemePair = () => {
    return themePairs.find(pair => 
      theme === pair.dark.id || theme === pair.light.id
    );
  };

  const currentThemePair = getCurrentThemePair();

  return (
    <div className="space-y-8">
      {/* Theme Mode Toggle */}
      <div className="flex items-center justify-between">
        <Label htmlFor="theme-mode-toggle" className="flex flex-col space-y-1">
          <span className="text-base font-medium">Theme Mode</span>
          <span className="font-normal leading-snug text-muted-foreground">
            Switch between light and dark mode across all themes.
          </span>
        </Label>
        <div className="flex items-center gap-2">
          <Sun className="h-4 w-4 text-muted-foreground" />
          <Switch 
            id="theme-mode-toggle"
            checked={!isLightTheme}
            onCheckedChange={(checked) => {
              if (currentThemePair) {
                setTheme(checked ? currentThemePair.dark.id : currentThemePair.light.id);
              } else {
                setTheme(checked ? 'dark' : 'light');
              }
            }}
            aria-label="Toggle between light and dark mode"
          />
          <Moon className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {/* Theme Pairs Selector */}
      <div className="space-y-4 pt-6 border-t">
        <div className="flex items-center gap-2 mb-4">
          <Palette className="h-5 w-5 text-primary" />
          <h3 className="text-base font-medium">Theme Style</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Choose your vibe from our curated collection. Each theme adapts to light/dark mode.
        </p>
        
        <div className="space-y-3">
          <Label htmlFor="theme-selector">Current Theme</Label>
          <Select
            value={currentThemePair?.id || 'default'}
            onValueChange={(value) => {
              const selectedTheme = themePairs.find(pair => pair.id === value);
              if (selectedTheme) {
                const targetVariant = isLightTheme ? selectedTheme.light : selectedTheme.dark;
                setTheme(targetVariant.id);
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a theme" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(groupedThemes).map(([category, categoryThemes]) => (
                <div key={category}>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <span>
                      {category === 'default' && '🏠'}
                      {category === 'minimal' && '✨'}
                      {category === 'nature' && '🌊'}
                      {category === 'cosmic' && '🌌'}
                      {category === 'playful' && '🎨'}
                      {category === 'retro' && '📺'}
                    </span>
                    {category === 'default' && 'Default'}
                    {category === 'minimal' && 'Minimal'}
                    {category === 'nature' && 'Nature'}
                    {category === 'cosmic' && 'Cosmic'}
                    {category === 'playful' && 'Playful'}
                    {category === 'retro' && 'Retro'}
                  </div>
                  {categoryThemes.map((themePair) => (
                    <SelectItem key={themePair.id} value={themePair.id} className="pl-4">
                      <div className="flex items-center gap-3 w-full">
                        {/* Theme Preview Colors */}
                        <div className="flex gap-1">
                          {(isLightTheme ? themePair.light : themePair.dark).previewColors.map((color, index) => (
                            <div
                              key={index}
                              className="w-3 h-3 rounded-full border border-border"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{themePair.name}</div>
                          <div className="text-xs text-muted-foreground">{themePair.description}</div>
                        </div>
                        <div className="flex items-center gap-1">
                          {isLightTheme ? (
                            <Sun className="h-3 w-3 text-yellow-500" />
                          ) : (
                            <Moon className="h-3 w-3 text-blue-400" />
                          )}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </div>
              ))}
            </SelectContent>
          </Select>
          
          {/* Current Theme Preview */}
          {currentThemePair && (
            <div className="p-3 rounded-lg border bg-muted/50">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex gap-1">
                  {(isLightTheme ? currentThemePair.light : currentThemePair.dark).previewColors.map((color, index) => (
                    <div
                      key={index}
                      className="w-4 h-4 rounded-full border border-border"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div>
                  <div className="font-medium text-sm">{currentThemePair.name}</div>
                  <div className="text-xs text-muted-foreground">{currentThemePair.description}</div>
                </div>
              </div>
              
              {/* Light/Dark Preview */}
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <Sun className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Light:</span>
                  <div className="flex gap-1">
                    {currentThemePair.light.previewColors.map((color, index) => (
                      <div
                        key={`light-${index}`}
                        className="w-2 h-2 rounded-full border border-border/50"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Moon className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Dark:</span>
                  <div className="flex gap-1">
                    {currentThemePair.dark.previewColors.map((color, index) => (
                      <div
                        key={`dark-${index}`}
                        className="w-2 h-2 rounded-full border border-border/50"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* High Contrast Mode */}
      <div className="flex items-center justify-between pt-6 border-t">
        <Label htmlFor="high-contrast-toggle" className="flex flex-col space-y-1">
          <span className="text-base font-medium">High Contrast Mode</span>
          <span className="font-normal leading-snug text-muted-foreground">
            Enable high contrast for better readability and accessibility compliance.
          </span>
        </Label>
        <Switch 
          id="high-contrast-toggle"
          checked={highContrast}
          onCheckedChange={handleHighContrastChange}
          aria-label="Toggle high contrast mode"
        />
      </div>
    </div>
  );
};

export default ThemeSettings;
