'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Coins, Gift, TrendingUp, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { coinEconomy, CoinBonusEvent } from '@/lib/gamification/CoinEconomy';

interface CoinWidgetProps {
  variant?: 'minimal' | 'compact' | 'detailed';
  showDailyBonus?: boolean;
  showBonusEvents?: boolean;
  onCoinChange?: (newBalance: number) => void;
}

export const CoinWidget: React.FC<CoinWidgetProps> = ({
  variant = 'compact',
  showDailyBonus = true,
  showBonusEvents = true,
  onCoinChange
}) => {
  const { user } = useUser();
  const [balance, setBalance] = useState(0);
  const [bonusEvents, setBonusEvents] = useState<CoinBonusEvent[]>([]);
  const [todayEarned, setTodayEarned] = useState(0);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);

  // Load coin data
  const loadCoinData = async () => {
    if (!user?.id) return;

    try {
      const [balanceData, bonusData, summaryData] = await Promise.all([
        coinEconomy.getCoinBalance(user.id),
        coinEconomy.getActiveBonusEvents(),
        coinEconomy.getEarningSummary(user.id)
      ]);

      setBalance(balanceData);
      setBonusEvents(bonusData);
      setTodayEarned(summaryData.todayEarned);
      
      if (onCoinChange) {
        onCoinChange(balanceData);
      }
    } catch (error) {
      console.error('Error loading coin data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoinData();
  }, [user?.id]);

  // Handle daily bonus claim
  const claimDailyBonus = async () => {
    if (!user?.id || claiming) return;

    try {
      setClaiming(true);
      const result = await coinEconomy.triggerDailyLoginBonus(user.id);
      
      if (result.success) {
        toast.success(`Daily bonus claimed! +${result.amount} coins`, {
          icon: '🪙'
        });
        setBalance(result.newBalance);
        setTodayEarned(prev => prev + result.amount);
        
        if (onCoinChange) {
          onCoinChange(result.newBalance);
        }
      } else {
        if (result.error?.includes('already claimed')) {
          toast.info('Daily bonus already claimed today');
        } else {
          toast.error(result.error || 'Failed to claim daily bonus');
        }
      }
    } catch (error) {
      console.error('Error claiming daily bonus:', error);
      toast.error('Failed to claim daily bonus');
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-2">
            <div className="h-6 bg-muted rounded w-1/2"></div>
            <div className="h-8 bg-muted rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Minimal variant - just balance display
  if (variant === 'minimal') {
    return (
      <div className="flex items-center space-x-2">
        <Coins className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
        <span className="font-bold text-yellow-700 dark:text-yellow-200">{balance.toLocaleString()}</span>
        {bonusEvents.length > 0 && showBonusEvents && (
          <Badge variant="outline" className="text-xs">
            <Sparkles className="w-3 h-3 mr-1" />
            {bonusEvents[0].multiplier}x
          </Badge>
        )}
      </div>
    );
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center text-sm">
            <Coins className="w-4 h-4 mr-2 text-yellow-600 dark:text-yellow-400" />
            Coins
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-200">
              {balance.toLocaleString()}
            </div>
            
            {todayEarned > 0 && (
              <div className="text-sm text-foreground">
                +{todayEarned} earned today
              </div>
            )}
            
            {bonusEvents.length > 0 && showBonusEvents && (
              <Badge variant="outline" className="text-xs">
                <Sparkles className="w-3 h-3 mr-1" />
                {bonusEvents[0].multiplier}x bonus active
              </Badge>
            )}
            
            {showDailyBonus && (
              <Button 
                onClick={claimDailyBonus} 
                variant="outline" 
                size="sm" 
                className="w-full"
                disabled={claiming}
              >
                <Gift className="w-3 h-3 mr-2" />
                {claiming ? 'Claiming...' : 'Daily Bonus'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Detailed variant
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Coins className="w-5 h-5 mr-2 text-yellow-600 dark:text-yellow-400" />
            Coin Wallet
          </div>
          <Button 
            onClick={loadCoinData} 
            variant="ghost" 
            size="sm"
            className="h-8 w-8 p-0"
          >
            <TrendingUp className="w-4 h-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Balance display */}
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-700 dark:text-yellow-200">
              {balance.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">MemoSpark Coins</div>
          </div>

          {/* Today's earnings */}
          {todayEarned > 0 && (
            <div className="bg-card border border-border/50 p-3 rounded-lg text-center">
              <div className="text-lg font-bold text-foreground">+{todayEarned}</div>
              <div className="text-sm text-muted-foreground">
                Earned today
              </div>
            </div>
          )}

          {/* Active bonus events */}
          {bonusEvents.length > 0 && showBonusEvents && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center text-yellow-800 dark:text-yellow-200">
                  <Sparkles className="w-4 h-4 mr-2" />
                  <span className="text-sm font-medium">Bonus Active</span>
                </div>
                <Badge variant="outline" className="text-yellow-800 border-yellow-300">
                  {bonusEvents[0].multiplier}x
                </Badge>
              </div>
              <div className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                {bonusEvents[0].event_name}
              </div>
            </div>
          )}

          {/* Daily bonus button */}
          {showDailyBonus && (
            <Button 
              onClick={claimDailyBonus} 
              variant="outline" 
              className="w-full"
              disabled={claiming}
            >
              <Gift className="w-4 h-4 mr-2" />
              {claiming ? 'Claiming...' : 'Claim Daily Bonus'}
            </Button>
          )}

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-2 text-center text-sm">
            <div className="bg-card border border-border/50 p-2 rounded">
              <div className="font-medium">Today</div>
              <div className="text-foreground">+{todayEarned}</div>
            </div>
            <div className="bg-card border border-border/50 p-2 rounded">
              <div className="font-medium">Balance</div>
              <div className="text-foreground">{balance}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CoinWidget; 