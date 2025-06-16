import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { coinEconomy, CoinSpendingCategory } from '@/lib/gamification/CoinEconomy';
import { toast } from 'sonner';

export interface UseRewardShopReturn {
  balance: number;
  shopItems: CoinSpendingCategory[];
  loading: boolean;
  purchasing: string | null;
  purchaseItem: (item: CoinSpendingCategory) => Promise<void>;
  refreshData: () => Promise<void>;
}

export const useRewardShop = (): UseRewardShopReturn => {
  const { user } = useUser();
  const [balance, setBalance] = useState(0);
  const [shopItems, setShopItems] = useState<CoinSpendingCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  // Load shop data
  const loadShopData = async () => {
    if (!user?.id) return;

    try {
      const [balanceData, itemsData] = await Promise.all([
        coinEconomy.getCoinBalance(user.id),
        coinEconomy.getSpendingCategories()
      ]);

      setBalance(balanceData);
      setShopItems(itemsData);
    } catch (error) {
      console.error('Error loading shop data:', error);
      toast.error('Failed to load shop items');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadShopData();
  }, [user?.id]);

  // Handle item purchase
  const purchaseItem = async (item: CoinSpendingCategory) => {
    if (!user?.id || purchasing) return;

    setPurchasing(item.id);
    
    try {
      const result = await coinEconomy.purchaseItem(user.id, item.id);
      
      if (result.success) {
        toast.success(`🎉 Successfully purchased ${item.item_name}!`, {
          description: `You spent ${item.cost} coins. New balance: ${result.newBalance}`
        });
        setBalance(result.newBalance);
        
        // Refresh shop data to update any availability changes
        await loadShopData();
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

  // Refresh data function
  const refreshData = async () => {
    setLoading(true);
    await loadShopData();
  };

  return {
    balance,
    shopItems,
    loading,
    purchasing,
    purchaseItem,
    refreshData
  };
}; 