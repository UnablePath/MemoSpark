'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Coins, 
  TrendingUp, 
  ShoppingCart, 
  History, 
  Gift, 
  ArrowUp, 
  ArrowDown,
  Star,
  Zap,
  Shield,
  Palette,
  Users,
  Heart
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  coinEconomy, 
  CoinTransaction, 
  CoinAnalytics, 
  CoinSpendingCategory, 
  CoinBonusEvent 
} from '@/lib/gamification/CoinEconomy';

interface CoinDisplayProps {
  variant?: 'full' | 'compact' | 'widget';
  showTransactions?: boolean;
  showShop?: boolean;
}

export const CoinDisplay: React.FC<CoinDisplayProps> = ({
  variant = 'full',
  showTransactions = true,
  showShop = true
}) => {
  const { user } = useUser();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  const [analytics, setAnalytics] = useState<CoinAnalytics | null>(null);
  const [shopItems, setShopItems] = useState<CoinSpendingCategory[]>([]);
  const [bonusEvents, setBonusEvents] = useState<CoinBonusEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load coin data
  const loadCoinData = async () => {
    if (!user?.id) return;

    try {
      setRefreshing(true);
      const [
        balanceData,
        transactionData,
        analyticsData,
        shopData,
        bonusData
      ] = await Promise.all([
        coinEconomy.getCoinBalance(user.id),
        coinEconomy.getTransactionHistory(user.id, 20),
        coinEconomy.getCoinAnalytics(user.id),
        coinEconomy.getSpendingCategories(),
        coinEconomy.getActiveBonusEvents()
      ]);

      setBalance(balanceData);
      setTransactions(transactionData);
      setAnalytics(analyticsData);
      setShopItems(shopData);
      setBonusEvents(bonusData);
    } catch (error) {
      console.error('Error loading coin data:', error);
      toast.error('Failed to load coin data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCoinData();
  }, [user?.id]);

  // Handle daily login bonus
  const claimDailyBonus = async () => {
    if (!user?.id) return;

    try {
      const result = await coinEconomy.triggerDailyLoginBonus(user.id);
      
      if (result.success) {
        toast.success(`Daily bonus claimed! +${result.amount} coins`);
        setBalance(result.newBalance);
        loadCoinData(); // Refresh data
      } else {
        toast.error(result.error || 'Failed to claim daily bonus');
      }
    } catch (error) {
      console.error('Error claiming daily bonus:', error);
      toast.error('Failed to claim daily bonus');
    }
  };

  // Handle item purchase
  const purchaseItem = async (itemId: string, itemName: string, cost: number) => {
    if (!user?.id) return;

    try {
      const result = await coinEconomy.purchaseItem(user.id, itemId);
      
      if (result.success) {
        toast.success(`Purchased ${itemName}! -${cost} coins`);
        setBalance(result.newBalance);
        loadCoinData(); // Refresh data
      } else {
        toast.error(result.error || 'Failed to purchase item');
      }
    } catch (error) {
      console.error('Error purchasing item:', error);
      toast.error('Failed to purchase item');
    }
  };

  // Get category icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'streak_recovery': return <Shield className="w-4 h-4" />;
      case 'customization': return <Palette className="w-4 h-4" />;
      case 'boosts': return <Zap className="w-4 h-4" />;
      case 'social': return <Users className="w-4 h-4" />;
      case 'wellness': return <Heart className="w-4 h-4" />;
      default: return <Star className="w-4 h-4" />;
    }
  };

  // Format transaction source
  const formatTransactionSource = (source: string) => {
    return source.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
            <div className="h-20 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === 'widget') {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-lg">
            <Coins className="w-5 h-5 mr-2 text-yellow-500" />
            Coins
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="text-3xl font-bold text-yellow-600">{balance.toLocaleString()}</div>
            {analytics && (
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-green-600 font-medium">+{analytics.total_earned}</div>
                  <div className="text-muted-foreground">Earned</div>
                </div>
                <div>
                  <div className="text-red-600 font-medium">-{analytics.total_spent}</div>
                  <div className="text-muted-foreground">Spent</div>
                </div>
              </div>
            )}
            <Button onClick={claimDailyBonus} variant="outline" size="sm" className="w-full">
              <Gift className="w-4 h-4 mr-2" />
              Daily Bonus
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === 'compact') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Coins className="w-5 h-5 mr-2 text-yellow-500" />
              Coin Wallet
            </div>
            <Badge variant="secondary" className="text-lg font-bold">
              {balance.toLocaleString()}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {bonusEvents.length > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                <div className="flex items-center text-yellow-800 dark:text-yellow-200">
                  <Star className="w-4 h-4 mr-2" />
                  <span className="text-sm font-medium">
                    {bonusEvents[0].event_name} - {bonusEvents[0].multiplier}x bonus active!
                  </span>
                </div>
              </div>
            )}
            
            <div className="flex space-x-2">
              <Button onClick={claimDailyBonus} variant="outline" size="sm" className="flex-1">
                <Gift className="w-4 h-4 mr-2" />
                Daily Bonus
              </Button>
              <Button onClick={loadCoinData} variant="outline" size="sm" disabled={refreshing}>
                <TrendingUp className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with balance and quick actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Coins className="w-6 h-6 mr-3 text-yellow-500" />
              Coin Wallet
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-yellow-600">{balance.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">StudySpark Coins</div>
            </div>
          </CardTitle>
          <CardDescription>
            Earn coins by completing tasks and unlock exclusive rewards
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            {/* Analytics */}
            {analytics && (
              <>
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">+{analytics.total_earned}</div>
                  <div className="text-sm text-muted-foreground">Total Earned</div>
                </div>
                <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">-{analytics.total_spent}</div>
                  <div className="text-sm text-muted-foreground">Total Spent</div>
                </div>
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{analytics.transactions_count}</div>
                  <div className="text-sm text-muted-foreground">Transactions</div>
                </div>
              </>
            )}
          </div>

          {/* Bonus events */}
          {bonusEvents.length > 0 && (
            <div className="mt-4 bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center text-yellow-800 dark:text-yellow-200">
                  <Star className="w-5 h-5 mr-2" />
                  <span className="font-medium">Active Bonus: {bonusEvents[0].event_name}</span>
                </div>
                <Badge variant="outline" className="text-yellow-800 border-yellow-300">
                  {bonusEvents[0].multiplier}x multiplier
                </Badge>
              </div>
              {bonusEvents[0].description && (
                <p className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                  {bonusEvents[0].description}
                </p>
              )}
            </div>
          )}

          {/* Quick actions */}
          <div className="flex gap-2 mt-4">
            <Button onClick={claimDailyBonus} variant="outline">
              <Gift className="w-4 h-4 mr-2" />
              Claim Daily Bonus
            </Button>
            <Button onClick={loadCoinData} variant="outline" disabled={refreshing}>
              <TrendingUp className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for transactions and shop */}
      <Tabs defaultValue="transactions" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="transactions" className="flex items-center">
            <History className="w-4 h-4 mr-2" />
            Transactions
          </TabsTrigger>
          <TabsTrigger value="shop" className="flex items-center">
            <ShoppingCart className="w-4 h-4 mr-2" />
            Coin Shop
          </TabsTrigger>
        </TabsList>

        {/* Transaction History */}
        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Your coin earning and spending history</CardDescription>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No transactions yet. Start earning coins by completing tasks!
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((transaction) => (
                    <div 
                      key={transaction.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-full ${
                          transaction.transaction_type === 'earned' 
                            ? 'bg-green-100 dark:bg-green-900/20' 
                            : 'bg-red-100 dark:bg-red-900/20'
                        }`}>
                          {transaction.transaction_type === 'earned' ? (
                            <ArrowUp className="w-4 h-4 text-green-600" />
                          ) : (
                            <ArrowDown className="w-4 h-4 text-red-600" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{transaction.description}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatTransactionSource(transaction.source)} • {' '}
                            {new Date(transaction.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className={`font-bold ${
                        transaction.transaction_type === 'earned' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.transaction_type === 'earned' ? '+' : '-'}{Math.abs(transaction.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Coin Shop */}
        <TabsContent value="shop" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Coin Shop</CardTitle>
              <CardDescription>Spend your coins on useful items and upgrades</CardDescription>
            </CardHeader>
            <CardContent>
              {shopItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No items available in the shop right now.
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {shopItems.map((item) => (
                    <Card key={item.id} className="relative">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center text-base">
                          {getCategoryIcon(item.category_name)}
                          <span className="ml-2">{item.item_name}</span>
                        </CardTitle>
                        <Badge variant="outline" className="w-fit">
                          {item.category_name.replace(/_/g, ' ')}
                        </Badge>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                          {item.description}
                        </p>
                        
                        {/* Requirements */}
                        {item.requirements && Object.keys(item.requirements).length > 0 && (
                          <div className="mb-4">
                            <div className="text-xs font-medium text-muted-foreground mb-1">Requirements:</div>
                            {Object.entries(item.requirements).map(([req, value]) => (
                              <Badge key={req} variant="secondary" className="mr-1 text-xs">
                                {req}: {value}
                              </Badge>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <div className="text-lg font-bold text-yellow-600">
                            {item.cost} coins
                          </div>
                          <Button
                            onClick={() => purchaseItem(item.id, item.item_name, item.cost)}
                            disabled={balance < item.cost}
                            size="sm"
                          >
                            {balance < item.cost ? 'Not enough coins' : 'Purchase'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CoinDisplay;