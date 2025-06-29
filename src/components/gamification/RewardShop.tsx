'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useTheme } from 'next-themes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  ShoppingCart, 
  Coins, 
  Shield, 
  Palette, 
  Zap, 
  Users, 
  Heart, 
  Star,
  Crown,
  Sparkles,
  Gift,
  Lock,
  Check,
  RefreshCw,
  Target,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import { coinEconomy, CoinSpendingCategory } from '@/lib/gamification/CoinEconomy';
import { useFetchAchievements } from '@/hooks/useAchievementQueries';
import { useUserTier } from '@/hooks/useUserTier';
import { usePremiumPopup } from '@/components/providers/premium-popup-provider';
import { useInvalidateAchievementQueries } from '@/hooks/useAchievementQueries';

interface RewardShopProps {
  variant?: 'full' | 'modal';
  onClose?: () => void;
}

interface ShopCategory {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  color: string;
}

const SHOP_CATEGORIES: ShopCategory[] = [
  {
    id: 'customization',
    name: 'Customization',
    icon: Palette,
    description: 'Themes and personalization options for your StudySpark experience',
    color: 'text-purple-500'
  },
  {
    id: 'streak_recovery',
    name: 'Streak Recovery',
    icon: Shield,
    description: 'Tools to maintain and recover your streaks',
    color: 'text-blue-500'
  },
  {
    id: 'boosts',
    name: 'Power Boosts',
    icon: Zap,
    description: 'Temporary boosts to accelerate your progress',
    color: 'text-yellow-500'
  },
  {
    id: 'social',
    name: 'Social Features',
    icon: Users,
    description: 'Enhanced social and community features',
    color: 'text-green-500'
  },
  {
    id: 'wellness',
    name: 'Wellness Tools',
    icon: Heart,
    description: 'Stress relief and mindfulness features',
    color: 'text-pink-500'
  },
  {
    id: 'productivity',
    name: 'Productivity',
    icon: Star,
    description: 'AI and productivity enhancements',
    color: 'text-indigo-500'
  }
];

export const RewardShop: React.FC<RewardShopProps> = ({
  variant = 'full',
  onClose
}) => {
  const { user } = useUser();
  const { tier } = useUserTier();
  const { setTheme } = useTheme();
  const { showFeatureGatePopup } = usePremiumPopup();
  const { invalidateBalance, invalidatePurchasedThemes } = useInvalidateAchievementQueries();
  
  // State for shop items and user data
  const [shopItems, setShopItems] = useState<CoinSpendingCategory[]>([]);
  const [balance, setBalance] = useState(0);
  const [userStats, setUserStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<CoinSpendingCategory | null>(null);

  // Check if user is premium
  const isPremium = tier === 'premium';

  // Use consolidated balance from achievements API if available
  const consolidatedBalance = 0; // This would come from parent component or context

  useEffect(() => {
    if (user?.id) {
      loadShopData();
    }
  }, [user?.id, consolidatedBalance]);

  // Load shop data
  const loadShopData = async () => {
    if (!user?.id) return;

    try {
      // Use consolidated balance data from achievements API
      setBalance(consolidatedBalance);

      const itemsResponse = await fetch('/api/gamification/shop-items');

      if (itemsResponse.ok) {
        const itemsData = await itemsResponse.json();
        // API now returns the correct format, just ensure proper mapping
        const convertedItems = itemsData.map((item: any) => ({
          id: item.id,
          item_name: item.item_name,           // API returns item_name (from name)
          description: item.description,
          category_name: item.category_name || 'theme',  // API returns category_name (from metadata)
          cost: item.cost,                     // API returns cost (from base_cost)
          requirements: item.requirements || {},
          metadata: item.metadata || {},
          isPremiumOnly: item.metadata?.isPremiumOnly || false
        }));
        
        // Filter premium themes for non-premium users
        const filteredItems = isPremium ? convertedItems : convertedItems.filter((item: any) => !item.isPremiumOnly);
        setShopItems(filteredItems);
      }
    } catch (error) {
      console.error('Error loading shop data:', error);
      toast.error('Failed to load shop items');
    } finally {
      setLoading(false);
    }
  };

  // Handle item purchase
  const purchaseItem = async (item: CoinSpendingCategory) => {
    if (!user?.id || purchasing) return;

    setPurchasing(item.id);
    
    try {
      const response = await fetch('/api/gamification/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ itemId: item.id }),
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        // Check if this is a theme purchase
        const isTheme = item.metadata?.type === 'theme';
        
        toast.success(`🎉 Successfully purchased ${item.item_name}!`, {
          description: `You spent ${item.cost} coins. New balance: ${result.purchase.new_balance}`
        });
        
        setBalance(result.purchase.new_balance);
        setSelectedItem(null);
        
        // If it's a theme, apply it immediately and show success message
        if (isTheme && result.theme_id) {
          try {
            // Apply the theme by calling the theme provider
            setTheme(result.theme_id);
            
            toast.success(`🎨 ${item.item_name} theme applied!`, {
              description: 'Your new theme is now active across StudySpark'
            });
          } catch (themeError) {
            console.error('Error applying theme:', themeError);
            toast.info('Theme purchased successfully, but failed to apply automatically. Please refresh the page.');
          }
        }
        
        // Invalidate relevant queries to update cached data
        invalidateBalance(user.id); // Update balance after coin spending
        if (isTheme && result.theme_id) {
          invalidatePurchasedThemes(user.id); // Update purchased themes if theme was bought
        }
      } else {
        toast.error(`Failed to purchase ${item.item_name}`, {
          description: result.error || 'An error occurred during purchase'
        });
      }
    } catch (error) {
      console.error('Error purchasing item:', error);
      toast.error('Purchase failed', {
        description: 'An unexpected error occurred'
      });
    } finally {
      setPurchasing(null);
    }
  };

  // Check if user meets item requirements
  const meetsRequirements = (requirements: Record<string, any>): { meets: boolean; missing: string[] } => {
    if (!requirements || Object.keys(requirements).length === 0) {
      return { meets: true, missing: [] };
    }

    const missing: string[] = [];
    
    Object.entries(requirements).forEach(([req, value]) => {
      switch (req) {
        case 'level':
          if (!userStats || userStats.level < value) {
            missing.push(`Level ${value} required (current: ${userStats?.level || 1})`);
          }
          break;
        case 'current_streak':
          if (!userStats || userStats.current_streak < value) {
            missing.push(`${value} day streak required (current: ${userStats?.current_streak || 0})`);
          }
          break;
        case 'total_points':
          if (!userStats || userStats.total_points < value) {
            missing.push(`${value} total points required (current: ${userStats?.total_points || 0})`);
          }
          break;
        default:
          // Generic requirement display
          missing.push(`${req}: ${value}`);
      }
    });

    return { meets: missing.length === 0, missing };
  };

  // Filter items by category
  const filteredItems = selectedCategory === 'all' 
    ? shopItems 
    : shopItems.filter(item => item.category_name === selectedCategory);

  // Get category info
  const getCategoryInfo = (categoryName: string) => {
    // Add safety check for undefined/null categoryName
    if (!categoryName) {
      return {
        id: 'theme',
        name: 'Theme',
        icon: Star,
        description: 'Theme items',
        color: 'text-gray-500'
      };
    }
    
    return SHOP_CATEGORIES.find(cat => cat.id === categoryName) || {
      id: categoryName,
      name: categoryName.replace(/_/g, ' '),
      icon: Star,
      description: '',
      color: 'text-gray-500'
    };
  };

  // Handle premium theme access for free users
  const handlePremiumThemeAccess = (themeName: string) => {
    showFeatureGatePopup(`Premium Theme: ${themeName}`);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  const content = (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <ShoppingCart className="w-6 h-6 mr-2 text-primary" />
            Coin Shop
          </h2>
          <p className="text-muted-foreground">Spend your coins on useful items and upgrades</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 bg-yellow-100 dark:bg-yellow-900/20 px-3 py-2 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <Coins className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            <span className="font-bold text-yellow-800 dark:text-yellow-100">{balance.toLocaleString()}</span>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={loadShopData}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-1">
          <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
          {SHOP_CATEGORIES.map((category) => (
            <TabsTrigger key={category.id} value={category.id} className="text-xs">
              <category.icon className="w-3 h-3 mr-1 hidden sm:block" />
              <span className="hidden sm:inline">{category.name.split(' ')[0]}</span>
              <span className="sm:hidden">{category.name.charAt(0)}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedCategory} className="mt-6">
          {filteredItems.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Gift className="w-16 h-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  No items available
                </h3>
                <p className="text-sm text-muted-foreground text-center">
                  {selectedCategory === 'all' 
                    ? 'No items are currently available in the shop.' 
                    : `No items available in the ${getCategoryInfo(selectedCategory).name} category.`
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredItems.map((item) => {
                  const categoryInfo = getCategoryInfo(item.category_name);
                  const { meets, missing } = meetsRequirements(item.requirements);
                  const canAfford = balance >= item.cost;

                  return (
                    <Dialog key={item.id}>
                      <DialogTrigger asChild>
                        <Card className="cursor-pointer hover:shadow-md transition-all duration-200 group relative">
                          {/* Premium indicator for premium-only themes */}
                          {item.isPremiumOnly && (
                            <div className="absolute -top-2 -right-2 z-10">
                              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs px-2 py-1 rounded-full font-bold flex items-center">
                                <Crown className="w-3 h-3 mr-1" />
                                Premium
                              </div>
                            </div>
                          )}
                          
                          {/* Regular premium indicator for expensive items */}
                          {item.cost >= 300 && !item.isPremiumOnly && (
                            <div className="absolute -top-2 -right-2 z-10">
                              <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs px-2 py-1 rounded-full font-bold flex items-center">
                                <Crown className="w-3 h-3 mr-1" />
                                Premium
                              </div>
                            </div>
                          )}

                          <CardHeader className="pb-3">
                            <CardTitle className={`flex items-center text-base group-hover:text-primary transition-colors ${item.isPremiumOnly ? 'text-purple-600 dark:text-purple-400' : ''}`}>
                              <categoryInfo.icon className={`w-5 h-5 mr-2 ${item.isPremiumOnly ? 'text-purple-600 dark:text-purple-400' : categoryInfo.color}`} />
                              {item.item_name}
                              {item.isPremiumOnly && <Sparkles className="w-4 h-4 ml-1 text-purple-500" />}
                            </CardTitle>
                            <Badge variant={item.isPremiumOnly ? "default" : "outline"} className={`w-fit ${item.isPremiumOnly ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' : ''}`}>
                              {item.isPremiumOnly ? 'Premium Exclusive' : categoryInfo.name}
                            </Badge>
                          </CardHeader>
                          
                          <CardContent className="space-y-3">
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {item.description}
                            </p>

                            {/* Theme-specific UI: Color preview with premium effects indicator */}
                            {item.metadata?.type === 'theme' && item.metadata?.colors && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">Colors:</span>
                                <div className="flex gap-1">
                                  <div 
                                    className={`w-4 h-4 rounded-full border border-border ${item.isPremiumOnly ? 'ring-2 ring-purple-300 dark:ring-purple-600' : ''}`}
                                    style={{ backgroundColor: item.metadata.colors.primary }}
                                    title="Primary color"
                                  />
                                  <div 
                                    className={`w-4 h-4 rounded-full border border-border ${item.isPremiumOnly ? 'ring-2 ring-purple-300 dark:ring-purple-600' : ''}`}
                                    style={{ backgroundColor: item.metadata.colors.secondary }}
                                    title="Secondary color"
                                  />
                                  <div 
                                    className={`w-4 h-4 rounded-full border border-border ${item.isPremiumOnly ? 'ring-2 ring-purple-300 dark:ring-purple-600' : ''}`}
                                    style={{ backgroundColor: item.metadata.colors.accent }}
                                    title="Accent color"
                                  />
                                </div>
                                {item.metadata?.rarity && (
                                  <Badge variant="outline" className={`text-xs ${item.isPremiumOnly ? 'border-purple-300 text-purple-600 dark:border-purple-600 dark:text-purple-400' : ''}`}>
                                    {item.metadata.rarity}
                                  </Badge>
                                )}
                                {item.metadata?.effects && (
                                  <Badge variant="secondary" className="text-xs">
                                    Effects
                                  </Badge>
                                )}
                              </div>
                            )}

                            {/* Requirements indicator */}
                            {!meets && (
                              <div className="flex items-center text-xs text-yellow-600">
                                <Lock className="w-3 h-3 mr-1" />
                                Requirements not met
                              </div>
                            )}

                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <Coins className={`w-4 h-4 mr-1 ${item.isPremiumOnly ? 'text-purple-500' : 'text-yellow-500'}`} />
                                <span className={`font-bold ${item.isPremiumOnly ? 'text-purple-600 dark:text-purple-400' : ''}`}>{item.cost}</span>
                              </div>
                              
                              <div className="flex items-center space-x-1">
                                {canAfford ? (
                                  <Check className="w-4 h-4 text-green-500" />
                                ) : (
                                  <Lock className="w-4 h-4 text-red-500" />
                                )}
                                <span className={`text-xs ${canAfford ? 'text-green-600' : 'text-red-600'}`}>
                                  {canAfford ? 'Can afford' : 'Need more coins'}
                                </span>
                              </div>
                            </div>

                            <Button 
                              variant={meets && canAfford ? (item.isPremiumOnly ? "default" : "default") : "secondary"}
                              size="sm" 
                              className={`w-full ${item.isPremiumOnly ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''}`}
                              disabled={!meets || !canAfford}
                            >
                              {item.metadata?.type === 'theme' 
                                ? (meets && canAfford ? (item.isPremiumOnly ? 'Purchase Premium Theme' : 'Purchase Theme') : meets ? 'Insufficient coins' : 'Requirements not met')
                                : (meets && canAfford ? 'Purchase' : meets ? 'Insufficient coins' : 'Requirements not met')
                              }
                            </Button>
                          </CardContent>
                        </Card>
                      </DialogTrigger>
                      
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle className="flex items-center">
                            <categoryInfo.icon className={`w-5 h-5 mr-2 ${categoryInfo.color}`} />
                            {item.item_name}
                          </DialogTitle>
                          <DialogDescription>
                            {item.description}
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-4">
                          {/* Category Badge */}
                          <Badge variant="outline" className="w-fit">
                            {categoryInfo.name}
                          </Badge>

                          {/* Cost */}
                          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <span className="font-medium">Cost:</span>
                            <div className="flex items-center">
                              <Coins className="w-4 h-4 text-yellow-500 mr-1" />
                              <span className="font-bold">{item.cost}</span>
                            </div>
                          </div>

                          {/* Balance */}
                          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <span className="font-medium">Your Balance:</span>
                            <div className="flex items-center">
                              <Coins className="w-4 h-4 text-yellow-500 mr-1" />
                              <span className={`font-bold ${canAfford ? 'text-green-600' : 'text-red-600'}`}>
                                {balance}
                              </span>
                            </div>
                          </div>

                          {/* Requirements */}
                          {item.requirements && Object.keys(item.requirements).length > 0 && (
                            <div className="space-y-2">
                              <span className="font-medium text-sm">Requirements:</span>
                              <div className="space-y-1">
                                {Object.entries(item.requirements).map(([req, value]) => {
                                  const reqMet = meetsRequirements({ [req]: value }).meets;
                                  return (
                                    <div key={req} className="flex items-center text-sm">
                                      {reqMet ? (
                                        <Check className="w-4 h-4 text-green-500 mr-2" />
                                      ) : (
                                        <Lock className="w-4 h-4 text-red-500 mr-2" />
                                      )}
                                      <span className={reqMet ? 'text-green-600' : 'text-red-600'}>
                                        {req.replace(/_/g, ' ')}: {value}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Error messages */}
                          {!canAfford && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                              <p className="text-red-600 text-sm font-medium">
                                Insufficient coins! You need {item.cost - balance} more coins.
                              </p>
                            </div>
                          )}

                          {missing.length > 0 && (
                            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                              <p className="text-yellow-600 text-sm font-medium mb-1">
                                Requirements not met:
                              </p>
                              <ul className="text-xs text-yellow-600 space-y-1">
                                {missing.map((req, idx) => (
                                  <li key={idx}>• {req}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Purchase button */}
                          <Button 
                            onClick={() => purchaseItem(item)}
                            disabled={!meets || !canAfford || purchasing === item.id}
                            className="w-full"
                            size="lg"
                          >
                            {purchasing === item.id ? (
                              <>
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                Purchasing...
                              </>
                            ) : meets && canAfford ? (
                              <>
                                <ShoppingCart className="w-4 h-4 mr-2" />
                                Purchase for {item.cost} coins
                              </>
                            ) : (
                              <>
                                <Lock className="w-4 h-4 mr-2" />
                                Cannot Purchase
                              </>
                            )}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  );
                })}
              </div>
              
              {/* Premium Themes Preview for Free Users */}
              {!isPremium && selectedCategory === 'customization' && (
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <Crown className="w-5 h-5 text-purple-500" />
                      <h3 className="text-lg font-semibold text-purple-600 dark:text-purple-400">Premium Exclusive Themes</h3>
                      <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                        Upgrade Required
                      </Badge>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-75">
                    {/* Show premium theme previews */}
                    {['crimson-night', 'arctic-aurora', 'midnight-galaxy', 'royal-emerald', 'diamond-platinum'].map((themeId) => (
                      <Card 
                        key={themeId}
                        className="cursor-pointer hover:shadow-md transition-all duration-200 group relative border-purple-200 dark:border-purple-700"
                        onClick={() => handlePremiumThemeAccess(themeId)}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 rounded-lg" />
                        <div className="absolute -top-2 -right-2 z-10">
                          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs px-2 py-1 rounded-full font-bold flex items-center">
                            <Crown className="w-3 h-3 mr-1" />
                            Premium
                          </div>
                        </div>
                        
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center text-base text-purple-600 dark:text-purple-400">
                            <Palette className="w-5 h-5 mr-2 text-purple-500" />
                            {themeId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                            <Sparkles className="w-4 h-4 ml-1 text-purple-500" />
                          </CardTitle>
                          <Badge variant="default" className="w-fit bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                            Premium Exclusive
                          </Badge>
                        </CardHeader>
                        
                        <CardContent className="space-y-3">
                          <p className="text-sm text-muted-foreground">
                            Unlock this premium theme with enhanced effects and animations
                          </p>
                          
                          <div className="flex items-center justify-center py-4">
                            <Lock className="w-8 h-8 text-purple-400" />
                          </div>
                          
                          <Button 
                            variant="outline"
                            size="sm" 
                            className="w-full border-purple-300 text-purple-600 hover:bg-purple-50 dark:border-purple-600 dark:text-purple-400 dark:hover:bg-purple-900/20"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePremiumThemeAccess(themeId);
                            }}
                          >
                            <Crown className="w-4 h-4 mr-2" />
                            Upgrade to Unlock
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );

  // Return modal version if specified
  if (variant === 'modal') {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reward Shop</DialogTitle>
            <DialogDescription>
              Spend your coins on useful items and upgrades
            </DialogDescription>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  return content;
}; 