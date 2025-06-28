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
  Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useUser } from '@clerk/nextjs';
import { useUserTier } from '@/hooks/useUserTier';
import { usePremiumPopup } from '@/components/providers/premium-popup-provider';
import { coinEconomy } from '@/lib/gamification/CoinEconomy';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Theme {
  id: string;
  name: string;
  displayName: string;
  description: string;
  coinCost: number;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  category: 'nature' | 'cosmic' | 'minimal' | 'vibrant' | 'premium' | 'exclusive';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  isPremiumOnly?: boolean;
  isOwned?: boolean;
  requirements?: {
    minTasks?: number;
    minStreak?: number;
  };
}

const COIN_THEMES: Theme[] = [
  {
    id: 'default',
    name: 'default',
    displayName: 'StudySpark Classic',
    description: 'The original StudySpark experience',
    coinCost: 0,
    colors: { primary: '#3B82F6', secondary: '#1E40AF', accent: '#60A5FA' },
    category: 'minimal',
    rarity: 'common',
    isOwned: true
  },
  {
    id: 'forest-dream',
    name: 'forest-dream', 
    displayName: 'Forest Dream',
    description: 'Serene greens for focused studying',
    coinCost: 50,
    colors: { primary: '#10B981', secondary: '#047857', accent: '#34D399' },
    category: 'nature',
    rarity: 'common'
  },
  {
    id: 'sunset-blaze',
    name: 'sunset-blaze',
    displayName: 'Sunset Blaze',
    description: 'Warm energy for productive sessions',
    coinCost: 75,
    colors: { primary: '#F59E0B', secondary: '#D97706', accent: '#FBBF24' },
    category: 'vibrant',
    rarity: 'common'
  },
  {
    id: 'ocean-depths',
    name: 'ocean-depths',
    displayName: 'Ocean Depths',
    description: 'Deep blues that inspire focus',
    coinCost: 120,
    colors: { primary: '#0EA5E9', secondary: '#0284C7', accent: '#38BDF8' },
    category: 'nature',
    rarity: 'rare',
    requirements: { minTasks: 10 }
  },
  {
    id: 'purple-haze',
    name: 'purple-haze',
    displayName: 'Purple Haze',
    description: 'Mystical purples for creativity',
    coinCost: 150,
    colors: { primary: '#8B5CF6', secondary: '#7C3AED', accent: '#A78BFA' },
    category: 'cosmic',
    rarity: 'rare',
    requirements: { minTasks: 15 }
  },
  {
    id: 'golden-hour',
    name: 'golden-hour',
    displayName: 'Golden Hour',
    description: 'Luxurious golds for dedicated students',
    coinCost: 300,
    colors: { primary: '#F59E0B', secondary: '#D97706', accent: '#FCD34D' },
    category: 'exclusive',
    rarity: 'legendary',
    requirements: { minTasks: 25, minStreak: 5 }
  }
];

const getRarityConfig = (rarity: Theme['rarity']) => {
  switch (rarity) {
    case 'common':
      return { color: 'gray', icon: '⚪', bgClass: 'bg-gray-100' };
    case 'rare':
      return { color: 'blue', icon: '🔵', bgClass: 'bg-blue-100' };
    case 'epic':
      return { color: 'purple', icon: '🟣', bgClass: 'bg-purple-100' };
    case 'legendary':
      return { color: 'yellow', icon: '🟡', bgClass: 'bg-yellow-100' };
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
  const [ownedThemes, setOwnedThemes] = useState<Set<string>>(new Set(['default']));
  const [coinBalance, setCoinBalance] = useState(0);
  const [userStats, setUserStats] = useState({ tasks: 0, streak: 0 });
  const [loading, setLoading] = useState(false);
  
  const isPremium = tier === 'premium';

  useEffect(() => {
    if (user?.id && isOpen) {
      loadUserData();
    }
  }, [user?.id, isOpen]);

  const loadUserData = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const balance = await coinEconomy.getCoinBalance(user.id);
      setCoinBalance(balance);
      setUserStats({ tasks: 25, streak: 3 }); // TODO: Load from database
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const canPurchaseTheme = (theme: Theme) => {
    if (coinBalance < theme.coinCost) return false;
    if (theme.isPremiumOnly && !isPremium) return false;
    
    if (theme.requirements) {
      if (theme.requirements.minTasks && userStats.tasks < theme.requirements.minTasks) return false;
      if (theme.requirements.minStreak && userStats.streak < theme.requirements.minStreak) return false;
    }
    
    return true;
  };

  const handleThemePurchase = async (theme: Theme) => {
    if (!user?.id) return;
    
    if (!canPurchaseTheme(theme)) {
      if (coinBalance < theme.coinCost) {
        toast.error(`Not enough coins! Need ${theme.coinCost}, have ${coinBalance}`);
      }
      return;
    }

    try {
      setLoading(true);
      
      const result = await coinEconomy.spendCoins(
        user.id,
        theme.coinCost,
        'theme_purchase',
        `Purchased ${theme.displayName} theme`,
        { theme_id: theme.id }
      );

      if (result.success) {
        setOwnedThemes(prev => new Set([...prev, theme.id]));
        setCoinBalance(result.newBalance);
        
        toast.success(`🎨 ${theme.displayName} theme unlocked!`);
        onThemeChange?.(theme.id);
      } else {
        toast.error(result.error || 'Failed to purchase theme');
      }
    } catch (error) {
      console.error('Error purchasing theme:', error);
      toast.error('Failed to purchase theme');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-yellow-500" />
            Coin Theme Shop
          </DialogTitle>
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground">
              Earn coins by completing tasks and unlock themes!
            </p>
            <div className="flex items-center gap-1">
              <Coins className="h-4 w-4 text-yellow-500" />
              <span className="font-bold text-yellow-600">{coinBalance}</span>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <Card className="border-dashed border-blue-300">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Zap className="h-5 w-5 text-blue-600" />
                <div>
                  <h4 className="font-semibold">Earn More Coins!</h4>
                  <p className="text-sm text-muted-foreground">
                    Complete tasks (+10 coins), daily login (+5 coins)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {COIN_THEMES.map((theme) => {
              const isOwned = ownedThemes.has(theme.id);
              const isCurrent = currentTheme === theme.id;
              const canPurchase = canPurchaseTheme(theme);
              const rarityConfig = getRarityConfig(theme.rarity);
              
              return (
                <Card key={theme.id} className={cn(
                  "cursor-pointer transition-all",
                  isCurrent && "ring-2 ring-primary",
                  !canPurchase && !isOwned && "opacity-60"
                )}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">{theme.displayName}</CardTitle>
                      <Badge className="text-xs bg-yellow-100 text-yellow-800">
                        <Coins className="h-3 w-3 mr-1" />
                        {theme.coinCost}
                      </Badge>
                    </div>
                    
                    <div className="flex gap-2">
                      <div 
                        className="w-6 h-6 rounded-full"
                        style={{ backgroundColor: theme.colors.primary }}
                      />
                      <div 
                        className="w-6 h-6 rounded-full"
                        style={{ backgroundColor: theme.colors.secondary }}
                      />
                      <div 
                        className="w-6 h-6 rounded-full"
                        style={{ backgroundColor: theme.colors.accent }}
                      />
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground mb-3">
                      {theme.description}
                    </p>
                    
                    {theme.requirements && (
                      <div className="mb-3 space-y-1">
                        <p className="text-xs font-medium">Requirements:</p>
                        {theme.requirements.minTasks && (
                          <div className="text-xs">
                            {userStats.tasks >= theme.requirements.minTasks ? '✅' : '❌'} {theme.requirements.minTasks} tasks
                          </div>
                        )}
                      </div>
                    )}
                    
                    {isOwned ? (
                      <Button
                        size="sm"
                        variant={isCurrent ? "default" : "outline"}
                        className="w-full"
                        onClick={() => onThemeChange?.(theme.id)}
                      >
                        {isCurrent ? 'Current' : 'Apply'}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => handleThemePurchase(theme)}
                        disabled={!canPurchase || loading}
                      >
                        <ShoppingCart className="h-3 w-3 mr-1" />
                        {canPurchase ? `Buy ${theme.coinCost}` : 'Locked'}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};