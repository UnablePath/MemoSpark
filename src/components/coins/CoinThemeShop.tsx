'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Palette, 
  Sparkles, 
  Lock, 
  Check, 
  ShoppingCart,
  Star,
  Coins,
  Crown,
  Zap,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@clerk/nextjs';
import { useUserTier } from '@/hooks/useUserTier';
import { usePremiumPopup } from '@/components/providers/premium-popup-provider';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
}

interface ThemeRequirements {
  minTasks?: number;
  minStreak?: number;
}

interface Theme {
  id: string;
  name: string;
  description: string;
  coinCost: number;
  category: 'nature' | 'cosmic' | 'minimal' | 'vibrant' | 'premium' | 'exclusive';
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'premium';
  colors: ThemeColors;
  isPremiumOnly?: boolean;
  isOwned: boolean;
  canPurchase: boolean;
  lockReason: string;
  metadata?: {
    requirements?: ThemeRequirements;
  };
}

interface UserStats {
  completedTasks: number;
  currentStreak: number;
}

interface ThemeShopData {
  themes: Theme[];
  userStats: UserStats;
  coinBalance: number;
  isPremium: boolean;
}

const getRarityConfig = (rarity: Theme['rarity']) => {
  switch (rarity) {
    case 'common':
      return { 
        color: 'gray', 
        icon: '⚪', 
        bgClass: 'bg-gray-100 dark:bg-gray-800',
        textClass: 'text-gray-700 dark:text-gray-300',
        borderClass: 'border-gray-300 dark:border-gray-600'
      };
    case 'rare':
      return { 
        color: 'blue', 
        icon: '🔵', 
        bgClass: 'bg-blue-100 dark:bg-blue-900',
        textClass: 'text-blue-700 dark:text-blue-300',
        borderClass: 'border-blue-300 dark:border-blue-600'
      };
    case 'epic':
      return { 
        color: 'purple', 
        icon: '🟣', 
        bgClass: 'bg-purple-100 dark:bg-purple-900',
        textClass: 'text-purple-700 dark:text-purple-300',
        borderClass: 'border-purple-300 dark:border-purple-600'
      };
    case 'legendary':
      return { 
        color: 'yellow', 
        icon: '🟡', 
        bgClass: 'bg-yellow-100 dark:bg-yellow-900',
        textClass: 'text-yellow-700 dark:text-yellow-300',
        borderClass: 'border-yellow-300 dark:border-yellow-600'
      };
    case 'premium':
      return { 
        color: 'premium', 
        icon: '👑', 
        bgClass: 'bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/50 dark:to-pink-900/50',
        textClass: 'text-purple-700 dark:text-purple-300',
        borderClass: 'border-purple-300 dark:border-purple-600'
      };
    default:
      return { 
        color: 'gray', 
        icon: '⚪', 
        bgClass: 'bg-gray-100 dark:bg-gray-800',
        textClass: 'text-gray-700 dark:text-gray-300',
        borderClass: 'border-gray-300 dark:border-gray-600'
      };
  }
};

const getCategoryIcon = (category: Theme['category']) => {
  switch (category) {
    case 'nature': return '🌿';
    case 'cosmic': return '🌌';
    case 'minimal': return '✨';
    case 'vibrant': return '🎨';
    case 'premium': return '👑';
    case 'exclusive': return '💎';
    default: return '🎨';
  }
};

interface CoinThemeShopProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme?: string;
  onThemeChange?: (themeId: string) => void;
}

export const CoinThemeShop: React.FC<CoinThemeShopProps> = ({
  isOpen,
  onClose,
  currentTheme = 'default',
  onThemeChange
}) => {
  const { user } = useUser();
  const { tier } = useUserTier();
  const { showFeatureGatePopup } = usePremiumPopup();
  
  const [shopData, setShopData] = useState<ThemeShopData | null>(null);
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Load shop data when modal opens
  useEffect(() => {
    if (isOpen && user?.id) {
      loadShopData();
    }
  }, [isOpen, user?.id]);

  const loadShopData = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/gamification/themes');
      if (!response.ok) {
        throw new Error('Failed to load themes');
      }
      
      const data = await response.json();
      setShopData(data);
    } catch (error) {
      console.error('Error loading shop data:', error);
      setError('Failed to load themes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Map coin theme IDs to actual theme IDs
  const mapToActualThemeId = (coinThemeId: string, isDarkMode: boolean = true) => {
    const themeMap: Record<string, { dark: string; light: string }> = {
      'forest-dream': { 
        dark: 'theme-forest-dream', 
        light: 'theme-forest-dream-light' 
      },
      'sunset-blaze': { 
        dark: 'theme-sunset-blaze', 
        light: 'theme-sunset-blaze-light' 
      },
      'ocean-depths': { 
        dark: 'theme-ocean-depths', 
        light: 'theme-ocean-depths-light' 
      },
      'purple-haze': { 
        dark: 'theme-purple-haze', 
        light: 'theme-purple-haze-light' 
      },
      'cherry-blossom': { 
        dark: 'theme-cherry-blossom', 
        light: 'theme-cherry-blossom-light' 
      },
      'golden-hour': { 
        dark: 'theme-golden-hour', 
        light: 'theme-golden-hour-light' 
      },
      'crimson-night': { 
        dark: 'theme-crimson-night', 
        light: 'theme-crimson-night-light' 
      },
      'arctic-aurora': { 
        dark: 'theme-arctic-aurora', 
        light: 'theme-arctic-aurora-light' 
      },
      'midnight-galaxy': { 
        dark: 'theme-midnight-galaxy', 
        light: 'theme-midnight-galaxy-light' 
      },
      'royal-emerald': { 
        dark: 'theme-royal-emerald', 
        light: 'theme-royal-emerald-light' 
      },
      'diamond-platinum': { 
        dark: 'theme-diamond-platinum', 
        light: 'theme-diamond-platinum-light' 
      }
    };

    const mapping = themeMap[coinThemeId];
    if (!mapping) {
      console.warn(`No theme mapping found for: ${coinThemeId}`);
      return coinThemeId;
    }

    return isDarkMode ? mapping.dark : mapping.light;
  };

  const handleThemePurchase = async (theme: Theme) => {
    if (!user?.id || purchasing) return;
    
         if (!theme.canPurchase) {
       if (theme.isPremiumOnly && tier !== 'premium') {
         showFeatureGatePopup('premium-themes');
         return;
       }
      toast.error(theme.lockReason || 'Cannot purchase this theme');
      return;
    }

    try {
      setPurchasing(theme.id);
      
      const response = await fetch('/api/gamification/themes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ themeId: theme.id })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to purchase theme');
      }

      // Update shop data with new purchase
      setShopData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          coinBalance: result.newBalance,
          themes: prev.themes.map(t => 
            t.id === theme.id 
              ? { ...t, isOwned: true, canPurchase: true, lockReason: '' }
              : t
          )
        };
      });

      toast.success(`🎨 ${theme.name} theme unlocked!`);
      
      // Apply the theme immediately - map to actual theme ID
      if (onThemeChange) {
        // Detect if user prefers dark mode (you can make this more sophisticated)
        const isDarkMode = document.documentElement.classList.contains('dark');
        const actualThemeId = mapToActualThemeId(theme.id, isDarkMode);
        onThemeChange(actualThemeId);
        
        toast.success(`🎨 ${theme.name} theme applied!`, {
          description: 'Your new theme is now active across StudySpark'
        });
      }

      // Dispatch event to trigger theme selector refresh
      window.dispatchEvent(new CustomEvent('theme-purchased', {
        detail: { themeId: theme.id, themeName: theme.name, colors: theme.colors }
      }));

    } catch (error) {
      console.error('Error purchasing theme:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to purchase theme');
    } finally {
      setPurchasing(null);
    }
  };

  const renderThemeCard = (theme: Theme) => {
    const isOwned = theme.isOwned;
    const isCurrent = currentTheme === theme.id;
    const canPurchase = theme.canPurchase && !isOwned;
    const rarityConfig = getRarityConfig(theme.rarity);
    const categoryIcon = getCategoryIcon(theme.category);
    const isPurchasing = purchasing === theme.id;
    
    return (
      <Card 
        key={theme.id} 
        className={cn(
          "cursor-pointer transition-all duration-200 hover:shadow-lg",
          isCurrent && "ring-2 ring-primary shadow-lg",
          !canPurchase && !isOwned && "opacity-60",
          rarityConfig.borderClass,
          "relative overflow-hidden"
        )}
      >
        {/* Rarity indicator */}
        <div className={cn(
          "absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium",
          rarityConfig.bgClass,
          rarityConfig.textClass
        )}>
          {rarityConfig.icon} {theme.rarity}
        </div>

        {/* Premium badge */}
        {theme.isPremiumOnly && (
          <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-medium">
            <Crown className="h-3 w-3 inline mr-1" />
            Premium
          </div>
        )}

        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-sm flex items-center gap-2">
                <span>{categoryIcon}</span>
                {theme.name}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">{theme.description}</p>
            </div>
          </div>
          
          {/* Color preview */}
          <div className="flex gap-2 mt-3">
            <div 
              className="w-6 h-6 rounded-full border-2 border-background shadow-sm"
              style={{ backgroundColor: theme.colors.primary }}
              title="Primary color"
            />
            <div 
              className="w-6 h-6 rounded-full border-2 border-background shadow-sm"
              style={{ backgroundColor: theme.colors.secondary }}
              title="Secondary color"
            />
            <div 
              className="w-6 h-6 rounded-full border-2 border-background shadow-sm"
              style={{ backgroundColor: theme.colors.accent }}
              title="Accent color"
            />
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          {/* Requirements */}
          {theme.metadata?.requirements && !isOwned && (
            <div className="mb-3 p-2 rounded-lg bg-muted/50">
              <p className="text-xs font-medium mb-1">Requirements:</p>
              <div className="space-y-1">
                {theme.metadata.requirements.minTasks && (
                  <div className="text-xs flex items-center gap-1">
                    {shopData && shopData.userStats.completedTasks >= theme.metadata.requirements.minTasks ? '✅' : '❌'}
                    <span>{theme.metadata.requirements.minTasks} completed tasks</span>
                    {shopData && (
                      <span className="text-muted-foreground">
                        ({shopData.userStats.completedTasks}/{theme.metadata.requirements.minTasks})
                      </span>
                    )}
                  </div>
                )}
                {theme.metadata.requirements.minStreak && (
                  <div className="text-xs flex items-center gap-1">
                    {shopData && shopData.userStats.currentStreak >= theme.metadata.requirements.minStreak ? '✅' : '❌'}
                    <span>{theme.metadata.requirements.minStreak} day streak</span>
                    {shopData && (
                      <span className="text-muted-foreground">
                        (current: {shopData.userStats.currentStreak})
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Action button */}
          {isOwned ? (
            <Button
              size="sm"
              variant={isCurrent ? "default" : "outline"}
              className="w-full"
              onClick={() => {
                if (onThemeChange) {
                  const isDarkMode = document.documentElement.classList.contains('dark');
                  const actualThemeId = mapToActualThemeId(theme.id, isDarkMode);
                  onThemeChange(actualThemeId);
                  toast.success(`🎨 ${theme.name} theme applied!`);
                }
              }}
            >
              <Check className="h-3 w-3 mr-1" />
              {isCurrent ? 'Current Theme' : 'Apply Theme'}
            </Button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                  <Coins className="h-3 w-3 mr-1" />
                  {theme.coinCost} coins
                </Badge>
                {!canPurchase && theme.lockReason && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Lock className="h-3 w-3" />
                  </div>
                )}
              </div>
              <Button
                size="sm"
                className="w-full"
                onClick={() => handleThemePurchase(theme)}
                disabled={!canPurchase || isPurchasing}
              >
                {isPurchasing ? (
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                ) : canPurchase ? (
                  <ShoppingCart className="h-3 w-3 mr-1" />
                ) : (
                  <Lock className="h-3 w-3 mr-1" />
                )}
                {isPurchasing ? 'Purchasing...' : canPurchase ? `Buy ${theme.coinCost}` : 'Locked'}
              </Button>
              {!canPurchase && theme.lockReason && (
                <p className="text-xs text-muted-foreground text-center">{theme.lockReason}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            Coin Theme Shop
          </DialogTitle>
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground">
              Unlock beautiful themes with coins earned from completing tasks!
            </p>
            {shopData && (
            <div className="flex items-center gap-1">
              <Coins className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                <span className="font-bold text-yellow-700 dark:text-yellow-200">
                  {shopData.coinBalance}
                </span>
            </div>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Earning tips */}
          <Card className="border-dashed border-blue-300 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Zap className="h-5 w-5 text-blue-600" />
                <div>
                  <h4 className="font-semibold text-blue-700 dark:text-blue-300">Earn More Coins!</h4>
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    Complete tasks (+10 coins), maintain streaks (+5 daily), achieve milestones
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Loading state */}
          {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-4 w-24" />
                    <div className="flex gap-2">
                      <Skeleton className="w-6 h-6 rounded-full" />
                      <Skeleton className="w-6 h-6 rounded-full" />
                      <Skeleton className="w-6 h-6 rounded-full" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-full" />
                  </CardContent>
                </Card>
              ))}
                      </div>
                    )}
                    
          {/* Error state */}
          {error && (
            <Card className="border-destructive/50">
              <CardContent className="pt-4">
                <div className="flex flex-col items-center justify-center text-center space-y-3">
                  <AlertTriangle className="h-10 w-10 text-destructive" />
                  <div>
                    <h3 className="text-lg font-semibold text-destructive">Error Loading Themes</h3>
                    <p className="text-sm text-muted-foreground mt-1">{error}</p>
                  </div>
                  <Button onClick={loadShopData} variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                      </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Themes grid */}
          {shopData && !loading && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Always show default theme first */}
              <Card className={cn(
                "cursor-pointer transition-all duration-200",
                currentTheme === 'default' && "ring-2 ring-primary shadow-lg"
              )}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <span>🏠</span>
                        StudySpark Classic
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">The original StudySpark experience</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <div className="w-6 h-6 rounded-full border-2 border-background shadow-sm bg-blue-600" />
                    <div className="w-6 h-6 rounded-full border-2 border-background shadow-sm bg-blue-800" />
                    <div className="w-6 h-6 rounded-full border-2 border-background shadow-sm bg-blue-400" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                      <Button
                        size="sm"
                    variant={currentTheme === 'default' ? "default" : "outline"}
                        className="w-full"
                    onClick={() => onThemeChange?.('default')}
                      >
                    <Check className="h-3 w-3 mr-1" />
                    {currentTheme === 'default' ? 'Current Theme' : 'Apply Theme'}
                      </Button>
                </CardContent>
              </Card>

              {/* Purchasable themes */}
              {shopData.themes.map(renderThemeCard)}
            </div>
          )}

          {/* User stats */}
          {shopData && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  Your Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-primary">{shopData.coinBalance}</div>
                    <div className="text-xs text-muted-foreground">Coins</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{shopData.userStats.completedTasks}</div>
                    <div className="text-xs text-muted-foreground">Completed Tasks</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-600">{shopData.userStats.currentStreak}</div>
                    <div className="text-xs text-muted-foreground">Day Streak</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">
                      {shopData.themes.filter(t => t.isOwned).length + 1}
                    </div>
                    <div className="text-xs text-muted-foreground">Themes Owned</div>
                  </div>
                </div>
                  </CardContent>
                </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};