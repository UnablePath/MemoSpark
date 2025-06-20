'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
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
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { coinEconomy, CoinSpendingCategory } from '@/lib/gamification/CoinEconomy';
import { useAchievements } from '@/hooks/useAchievements';

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
    id: 'streak_recovery',
    name: 'Streak Recovery',
    icon: Shield,
    description: 'Tools to maintain and recover your streaks',
    color: 'text-blue-500'
  },
  {
    id: 'customization',
    name: 'Customization',
    icon: Palette,
    description: 'Personalize your MemoSpark experience',
    color: 'text-purple-500'
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
  const { userStats } = useAchievements();
  const [balance, setBalance] = useState(0);
  const [shopItems, setShopItems] = useState<CoinSpendingCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<CoinSpendingCategory | null>(null);

  // Load shop data
  const loadShopData = async () => {
    if (!user?.id) return;

    try {
      const [balanceResponse, itemsResponse] = await Promise.all([
        fetch('/api/gamification/balance'),
        fetch('/api/gamification/shop-items')
      ]);

      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        setBalance(balanceData.balance);
      }

      if (itemsResponse.ok) {
        const itemsData = await itemsResponse.json();
        // Convert API response to match expected format
        const convertedItems = itemsData.map((item: any) => ({
          id: item.id,
          item_name: item.name,
          description: item.description,
          category_name: item.category,
          cost: item.price,
          requirements: item.requirements || {},
          metadata: item.metadata || {}
        }));
        setShopItems(convertedItems);
      }
    } catch (error) {
      console.error('Error loading shop data:', error);
      toast.error('Failed to load shop items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShopData();
  }, [user?.id]);

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
        toast.success(`🎉 Successfully purchased ${item.item_name}!`, {
          description: `You spent ${item.cost} coins. New balance: ${result.purchase.new_balance}`
        });
        setBalance(result.purchase.new_balance);
        setSelectedItem(null);
        
        // Refresh shop data to update any availability changes
        loadShopData();
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
    return SHOP_CATEGORIES.find(cat => cat.id === categoryName) || {
      id: categoryName,
      name: categoryName.replace(/_/g, ' '),
      icon: Star,
      description: '',
      color: 'text-gray-500'
    };
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
          <div className="flex items-center space-x-1 bg-yellow-100 dark:bg-yellow-900/20 px-3 py-2 rounded-lg">
            <Coins className="w-5 h-5 text-yellow-500" />
            <span className="font-bold">{balance}</span>
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
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
          {SHOP_CATEGORIES.map((category) => (
            <TabsTrigger key={category.id} value={category.id} className="text-xs">
              <category.icon className="w-3 h-3 mr-1" />
              {category.name.split(' ')[0]}
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
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item) => {
                const categoryInfo = getCategoryInfo(item.category_name);
                const { meets, missing } = meetsRequirements(item.requirements);
                const canAfford = balance >= item.cost;

                return (
                  <Dialog key={item.id}>
                    <DialogTrigger asChild>
                      <Card className="cursor-pointer hover:shadow-md transition-all duration-200 group relative">
                        {/* Premium indicator for expensive items */}
                        {item.cost >= 300 && (
                          <div className="absolute -top-2 -right-2 z-10">
                            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs px-2 py-1 rounded-full font-bold flex items-center">
                              <Crown className="w-3 h-3 mr-1" />
                              Premium
                            </div>
                          </div>
                        )}

                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center text-base group-hover:text-primary transition-colors">
                            <categoryInfo.icon className={`w-5 h-5 mr-2 ${categoryInfo.color}`} />
                            {item.item_name}
                          </CardTitle>
                          <Badge variant="outline" className="w-fit">
                            {categoryInfo.name}
                          </Badge>
                        </CardHeader>
                        
                        <CardContent className="space-y-3">
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {item.description}
                          </p>

                          {/* Requirements indicator */}
                          {!meets && (
                            <div className="flex items-center text-xs text-yellow-600">
                              <Lock className="w-3 h-3 mr-1" />
                              Requirements not met
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <Coins className="w-4 h-4 text-yellow-500 mr-1" />
                              <span className="font-bold">{item.cost}</span>
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
                            variant={meets && canAfford ? "default" : "secondary"}
                            size="sm" 
                            className="w-full"
                            disabled={!meets || !canAfford}
                          >
                            {meets && canAfford ? 'Purchase' : meets ? 'Insufficient coins' : 'Requirements not met'}
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