'use client';

import React, { useState, useEffect } from 'react';
import { useOptimizedTheme } from '@/hooks/useOptimizedTheme';
import { useThemeContext } from '@/components/providers/theme-provider';
import { useUser } from '@clerk/nextjs';
import { useUserTier } from '@/hooks/useUserTier';
import { useFetchAchievements } from '@/hooks/useAchievementQueries';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sun, Moon, Palette, Coins, Crown, Lock } from 'lucide-react';
import { CoinThemeShop } from '@/components/coins/CoinThemeShop';

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
    name: 'Soft Life Dreams',
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

// Coin-purchased themes (will be dynamically added)
const coinThemes = [
  {
    id: 'forest-dream',
    name: 'Forest Dream',
    description: 'Serene greens for focused studying',
    category: 'nature',
    coinCost: 50,
    dark: { id: 'theme-forest-dream', previewColors: ['#0a1a0a', '#dcfce7', '#10b981'] },
    light: { id: 'theme-forest-dream-light', previewColors: ['#f0fdf4', '#14532d', '#047857'] }
  },
  {
    id: 'sunset-blaze',
    name: 'Sunset Blaze',
    description: 'Warm energy for productive sessions',
    category: 'vibrant',
    coinCost: 75,
    dark: { id: 'theme-sunset-blaze', previewColors: ['#1a0f0a', '#fff7ed', '#f59e0b'] },
    light: { id: 'theme-sunset-blaze-light', previewColors: ['#fff7ed', '#431407', '#d97706'] }
  },
  {
    id: 'ocean-depths',
    name: 'Ocean Depths',
    description: 'Deep blues that inspire focus',
    category: 'nature',
    coinCost: 120,
    dark: { id: 'theme-ocean-depths', previewColors: ['#0c1626', '#e0f2fe', '#0ea5e9'] },
    light: { id: 'theme-ocean-depths-light', previewColors: ['#f7fcff', '#1e293b', '#0284c7'] }
  },
  {
    id: 'purple-haze',
    name: 'Purple Haze',
    description: 'Mystical purples for creativity',
    category: 'cosmic',
    coinCost: 150,
    dark: { id: 'theme-purple-haze', previewColors: ['#0d0a1a', '#f3f0ff', '#8b5cf6'] },
    light: { id: 'theme-purple-haze-light', previewColors: ['#faf5ff', '#1e1b3a', '#7c3aed'] }
  },

  {
    id: 'golden-hour',
    name: 'Golden Hour',
    description: 'Luxurious golds for dedicated students',
    category: 'exclusive',
    coinCost: 300,
    dark: { id: 'theme-golden-hour', previewColors: ['#1a0f0a', '#fff7ed', '#f59e0b'] },
    light: { id: 'theme-golden-hour-light', previewColors: ['#fff7ed', '#431407', '#fcd34d'] }
  },
  {
    id: 'crimson-night',
    name: 'Crimson Night',
    description: 'Deep reds for intense focus sessions',
    category: 'premium',
    coinCost: 250,
    isPremiumOnly: true,
    dark: { id: 'theme-crimson-night', previewColors: ['#1a0505', '#fef2f2', '#dc2626'] },
    light: { id: 'theme-crimson-night-light', previewColors: ['#fef2f2', '#431407', '#991b1b'] }
  },
  {
    id: 'arctic-aurora',
    name: 'Arctic Aurora',
    description: 'Cool blues with ethereal gradients',
    category: 'premium',
    coinCost: 280,
    isPremiumOnly: true,
    dark: { id: 'theme-arctic-aurora', previewColors: ['#0a1426', '#e0f2fe', '#06b6d4'] },
    light: { id: 'theme-arctic-aurora-light', previewColors: ['#f0f9ff', '#1e293b', '#0891b2'] }
  },
  {
    id: 'midnight-galaxy',
    name: 'Midnight Galaxy',
    description: 'Deep space purples with starlike accents',
    category: 'premium',
    coinCost: 300,
    isPremiumOnly: true,
    dark: { id: 'theme-midnight-galaxy', previewColors: ['#0a0a1a', '#f0f0ff', '#6366f1'] },
    light: { id: 'theme-midnight-galaxy-light', previewColors: ['#f8fafc', '#1e1b3a', '#4f46e5'] }
  },
  {
    id: 'royal-emerald',
    name: 'Royal Emerald',
    description: 'Luxurious greens fit for royalty',
    category: 'premium',
    coinCost: 320,
    isPremiumOnly: true,
    dark: { id: 'theme-royal-emerald', previewColors: ['#0a1a0f', '#ecfdf5', '#10b981'] },
    light: { id: 'theme-royal-emerald-light', previewColors: ['#f0fdf4', '#14532d', '#059669'] }
  },
  {
    id: 'diamond-platinum',
    name: 'Diamond Platinum',
    description: 'Ultimate premium experience with platinum styling',
    category: 'premium',
    coinCost: 400,
    isPremiumOnly: true,
    dark: { id: 'theme-diamond-platinum', previewColors: ['#1a1a1a', '#f5f5f5', '#94a3b8'] },
    light: { id: 'theme-diamond-platinum-light', previewColors: ['#f8fafc', '#334155', '#64748b'] }
  }
];

export const ThemeSettings: React.FC = () => {
  const { theme, setTheme, isDark, isLight, isChanging } = useOptimizedTheme();
  const { accessibilityOptions, setAccessibilityOption } = useThemeContext();
  const { user } = useUser();
  const { tier } = useUserTier();
  const { data: achievementsData } = useFetchAchievements();
  const { highContrast } = accessibilityOptions;
  const [showCoinThemeShop, setShowCoinThemeShop] = useState(false);

  // Extract themes data from consolidated response
  const themesData = achievementsData?.themes;
  const ownedCoinThemes = themesData?.success 
    ? themesData.purchasedThemes.map((t: any) => t.theme_id) 
    : [];

  // Launch mode detection - grants access to all themes during launch period
  const isLaunchMode = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_ENABLE_LAUNCH_MODE === 'true';
  const isPremium = tier === 'premium' || isLaunchMode;

  // Listen for theme purchase events to refresh owned themes
  useEffect(() => {
    const handleThemePurchased = () => {
      // Themes data will be automatically refreshed by React Query when the achievements data is invalidated
      console.log('Theme purchased event received - data will refresh automatically');
    };

    window.addEventListener('theme-purchased', handleThemePurchased);
    return () => {
      window.removeEventListener('theme-purchased', handleThemePurchased);
    };
  }, []);

  const handleHighContrastChange = (checked: boolean) => {
    setAccessibilityOption('highContrast', checked);
  };

  // Use optimized theme detection
  const isLightTheme = isLight;

  // Combine free themes with ALL coin themes (owned and unowned)
  const allAvailableThemes = [
    ...themePairs,
    ...coinThemes.map(coinTheme => {
      const isOwned = ownedCoinThemes.includes(coinTheme.id);
      // In launch mode, all themes are accessible regardless of ownership or premium status
      const canAccess = isLaunchMode || (isOwned && (!coinTheme.isPremiumOnly || isPremium));
      
      return {
        id: coinTheme.id,
        name: coinTheme.name,
        description: coinTheme.description,
        category: coinTheme.category,
        dark: coinTheme.dark,
        light: coinTheme.light,
        isCoinTheme: true,
        isOwned: isOwned,
        canAccess: canAccess, // Can the user actually use this theme
        coinCost: coinTheme.coinCost,
        isPremiumOnly: coinTheme.isPremiumOnly
      };
    })
  ];

  // Group theme pairs by category
  const groupedThemes = allAvailableThemes.reduce((acc, themePair) => {
    if (!acc[themePair.category]) acc[themePair.category] = [];
    acc[themePair.category].push(themePair);
    return acc;
  }, {} as Record<string, typeof allAvailableThemes>);

  // Get current theme pair
  const getCurrentThemePair = () => {
    return allAvailableThemes.find(pair => 
      theme === pair.dark.id || theme === pair.light.id
    );
  };

  const currentThemePair = getCurrentThemePair();

  // Handle theme change from coin shop
  const handleThemeFromCoinShop = (themeId: string) => {
    // The theme ID comes in as the actual theme ID (e.g., 'theme-forest-dream')
    // so we can apply it directly
    setTheme(themeId);
  };

  return (
    <div className="space-y-8">
      {/* Launch Mode Indicator */}
      {isLaunchMode && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
          <p className="text-sm text-green-600 dark:text-green-400 font-medium">
            🚀 Launch Mode Active - All premium themes are free to use during our launch period!
          </p>
        </div>
      )}

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
            disabled={isChanging}
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
          {isChanging && (
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          )}
        </div>
      </div>

      {/* Theme Pairs Selector */}
      <div className="space-y-4 pt-6 border-t">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            <h3 className="text-base font-medium">Theme Style</h3>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCoinThemeShop(true)}
            className="gap-2"
          >
            <Coins className="h-4 w-4 text-yellow-500" />
            Coin Shop
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Choose your vibe from our curated collection. Each theme adapts to light/dark mode. 
          <span className="text-yellow-600 font-medium"> Earn coins by completing tasks to unlock more themes!</span>
        </p>
        
        <div className="space-y-3">
          <Label htmlFor="theme-selector">Current Theme</Label>
          <Select
            value={currentThemePair?.id || 'default'}
            disabled={isChanging}
            onValueChange={(value) => {
              const selectedTheme = allAvailableThemes.find(pair => pair.id === value);
              if (selectedTheme) {
                // Check if user can access this theme
                if ((selectedTheme as any).isCoinTheme && !(selectedTheme as any).canAccess) {
                  console.warn('Attempted to select locked theme:', selectedTheme.name);
                  return; // Prevent selection of locked themes
                }
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
                      {category === 'vibrant' && '🎭'}
                      {category === 'exclusive' && '💎'}
                      {category === 'premium' && '👑'}
                    </span>
                    {category === 'default' && 'Default'}
                    {category === 'minimal' && 'Minimal'}
                    {category === 'nature' && 'Nature'}
                    {category === 'cosmic' && 'Cosmic'}
                    {category === 'playful' && 'Playful'}
                    {category === 'retro' && 'Retro'}
                    {category === 'vibrant' && 'Vibrant'}
                    {category === 'exclusive' && 'Exclusive'}
                    {category === 'premium' && 'Premium'}
                  </div>
                  {categoryThemes.map((themePair) => {
                    const isLocked = (themePair as any).isCoinTheme && !(themePair as any).canAccess;
                    const isUnowned = (themePair as any).isCoinTheme && !(themePair as any).isOwned;
                    const isPremiumLocked = (themePair as any).isPremiumOnly && !isPremium && !isLaunchMode;
                    const isLaunchModeAccessible = isLaunchMode && (themePair as any).isCoinTheme;
                    
                    return (
                      <SelectItem 
                        key={themePair.id} 
                        value={themePair.id} 
                        className={`pl-4 ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                        disabled={isLocked}
                      >
                        <div className={`flex items-center gap-3 w-full ${isLocked ? 'pointer-events-none' : ''}`}>
                          {/* Theme Preview Colors */}
                          <div className="flex gap-1 relative">
                            {(isLightTheme ? themePair.light : themePair.dark).previewColors.map((color, index) => (
                              <div
                                key={index}
                                className={`w-3 h-3 rounded-full border border-border ${isLocked ? 'opacity-50' : ''}`}
                                style={{ backgroundColor: color }}
                              />
                            ))}
                            {isLocked && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Lock className="h-2 w-2 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium flex items-center gap-2">
                              <span className={isLocked ? 'text-muted-foreground' : ''}>{themePair.name}</span>
                              {(themePair as any).isCoinTheme && (
                                <Badge variant="secondary" className={`text-xs ${isUnowned && !isLaunchModeAccessible ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'}`}>
                                  <Coins className="h-2 w-2 mr-1" />
                                  {(themePair as any).coinCost}
                                </Badge>
                              )}
                              {(themePair as any).isPremiumOnly && (
                                <Badge variant="secondary" className={`text-xs ${isPremiumLocked ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'}`}>
                                  <Crown className="h-2 w-2 mr-1" />
                                  Premium
                                </Badge>
                              )}
                              {isLaunchModeAccessible && (
                                <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                  🚀 Launch Mode
                                </Badge>
                              )}
                              {isLocked && (
                                <Badge variant="outline" className="text-xs border-red-200 text-red-600 dark:border-red-800 dark:text-red-400">
                                  <Lock className="h-2 w-2 mr-1" />
                                  {isPremiumLocked ? 'Premium Only' : 'Locked'}
                                </Badge>
                              )}
                            </div>
                            <div className={`text-xs ${isLocked ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
                              {isLaunchModeAccessible && !isLocked 
                                ? `🚀 Free during launch mode! (Usually ${(themePair as any).coinCost} coins)`
                                : isLocked 
                                  ? (isPremiumLocked ? 'Requires Premium subscription' : `Purchase for ${(themePair as any).coinCost} coins`) 
                                  : themePair.description
                              }
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {isLocked && (
                              <Lock className="h-3 w-3 text-red-500" />
                            )}
                            {isLightTheme ? (
                              <Sun className={`h-3 w-3 ${isLocked ? 'text-muted-foreground' : 'text-yellow-500'}`} />
                            ) : (
                              <Moon className={`h-3 w-3 ${isLocked ? 'text-muted-foreground' : 'text-blue-400'}`} />
                            )}
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
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
                  <div className="font-medium text-sm flex items-center gap-2">
                    {currentThemePair.name}
                    {(currentThemePair as any).isCoinTheme && (
                      <Badge variant="outline" className="text-xs">
                        <Coins className="h-2 w-2 mr-1" />
                        Coin Theme
                      </Badge>
                    )}
                  </div>
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

      {/* Coin Shop Modal */}
      {showCoinThemeShop && (
        <CoinThemeShop
          isOpen={showCoinThemeShop}
          onClose={() => setShowCoinThemeShop(false)}
          currentTheme={theme}
          onThemeChange={handleThemeFromCoinShop}
        />
      )}
    </div>
  );
};

export default ThemeSettings;
