import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseServerAdmin } from '@/lib/supabase/server';
import { coinEconomy } from '@/lib/gamification/CoinEconomy';

// Enable Next.js edge caching for GET requests (5 minutes for themes - rarely change)
export const revalidate = 300;

// Theme definitions matching our database schema
const AVAILABLE_THEMES = [
  {
    id: 'forest-dream',
    name: 'Forest Dream',
    description: 'Serene greens for focused studying',
    coinCost: 50,
    category: 'nature',
    rarity: 'common',
    colors: { primary: '#10B981', secondary: '#047857', accent: '#34D399' },
    metadata: { category: 'nature', rarity: 'common' }
  },
  {
    id: 'sunset-blaze', 
    name: 'Sunset Blaze',
    description: 'Warm energy for productive sessions',
    coinCost: 75,
    category: 'vibrant',
    rarity: 'common',
    colors: { primary: '#F59E0B', secondary: '#D97706', accent: '#FBBF24' },
    metadata: { category: 'vibrant', rarity: 'common' }
  },
  {
    id: 'ocean-depths',
    name: 'Ocean Depths', 
    description: 'Deep blues that inspire focus',
    coinCost: 120,
    category: 'nature',
    rarity: 'rare',
    colors: { primary: '#0EA5E9', secondary: '#0284C7', accent: '#38BDF8' },
    metadata: { category: 'nature', rarity: 'rare', requirements: { minTasks: 10 } }
  },
  {
    id: 'purple-haze',
    name: 'Purple Haze',
    description: 'Mystical purples for creativity', 
    coinCost: 150,
    category: 'cosmic',
    rarity: 'rare',
    colors: { primary: '#8B5CF6', secondary: '#7C3AED', accent: '#A78BFA' },
    metadata: { category: 'cosmic', rarity: 'rare', requirements: { minTasks: 15 } }
  },
  {
    id: 'cherry-blossom',
    name: 'Cherry Blossom',
    description: 'Delicate pink theme for gentle focus',
    coinCost: 200,
    category: 'nature',
    rarity: 'epic',
    colors: { primary: '#EC4899', secondary: '#DB2777', accent: '#F472B6' },
    metadata: { category: 'nature', rarity: 'epic', requirements: { minTasks: 20, minStreak: 3 } }
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    description: 'Luxurious golds for dedicated students',
    coinCost: 300,
    category: 'exclusive', 
    rarity: 'legendary',
    colors: { primary: '#F59E0B', secondary: '#D97706', accent: '#FCD34D' },
    metadata: { category: 'exclusive', rarity: 'legendary', requirements: { minTasks: 25, minStreak: 5 } }
  },
  // Premium-exclusive themes
  {
    id: 'crimson-night',
    name: 'Crimson Night',
    description: 'Deep reds with animated shadows for intense focus sessions',
    coinCost: 250,
    category: 'premium',
    rarity: 'premium',
    isPremiumOnly: true,
    colors: { primary: '#DC2626', secondary: '#991B1B', accent: '#F87171' },
    metadata: { category: 'premium', rarity: 'premium', isPremiumOnly: true, effects: ['shadows', 'gradients'] }
  },
  {
    id: 'arctic-aurora',
    name: 'Arctic Aurora',
    description: 'Stunning aurora effects with ice blue tones',
    coinCost: 280,
    category: 'premium',
    rarity: 'premium',
    isPremiumOnly: true,
    colors: { primary: '#06B6D4', secondary: '#0E7490', accent: '#67E8F9' },
    metadata: { category: 'premium', rarity: 'premium', isPremiumOnly: true, effects: ['aurora', 'glow'] }
  },
  {
    id: 'midnight-galaxy',
    name: 'Midnight Galaxy',
    description: 'Cosmic purples with starfield animations',
    coinCost: 300,
    category: 'premium',
    rarity: 'premium',
    isPremiumOnly: true,
    colors: { primary: '#7C3AED', secondary: '#5B21B6', accent: '#A78BFA' },
    metadata: { category: 'premium', rarity: 'premium', isPremiumOnly: true, effects: ['starfield', 'cosmic'] }
  },
  {
    id: 'royal-emerald',
    name: 'Royal Emerald',
    description: 'Luxurious emerald greens with gold accents and premium animations',
    coinCost: 320,
    category: 'premium',
    rarity: 'premium',
    isPremiumOnly: true,
    colors: { primary: '#059669', secondary: '#047857', accent: '#10B981' },
    metadata: { category: 'premium', rarity: 'premium', isPremiumOnly: true, effects: ['gold_accents', 'premium_animations'] }
  },
  {
    id: 'diamond-platinum',
    name: 'Diamond Platinum',
    description: 'Ultimate premium theme with diamond effects and platinum styling',
    coinCost: 400,
    category: 'premium',
    rarity: 'premium',
    isPremiumOnly: true,
    colors: { primary: '#6B7280', secondary: '#374151', accent: '#9CA3AF' },
    metadata: { category: 'premium', rarity: 'premium', isPremiumOnly: true, effects: ['diamond', 'platinum', 'ultimate'] }
  }
];

// GET - Fetch user's purchased themes and available themes
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!supabaseServerAdmin) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Get user's purchased themes (use correct column name: user_id)
    const { data: purchasedThemes, error: purchaseError } = await supabaseServerAdmin
      .from('user_purchased_themes')
      .select('theme_id, purchased_at, price_paid, metadata')
      .eq('user_id', userId);

    if (purchaseError) {
      console.error('Error fetching purchased themes:', purchaseError);
      return NextResponse.json({ error: 'Failed to fetch themes' }, { status: 500 });
    }

    // Get user stats for theme requirements
    const { data: userTasks } = await supabaseServerAdmin
      .from('tasks')
      .select('id, status')
      .eq('user_id', userId);

    const { data: streakData } = await supabaseServerAdmin
      .from('user_streaks')
      .select('current_streak')
      .eq('user_id', userId)
      .single();

    const userStats = {
      completedTasks: userTasks?.filter(task => task.status === 'completed').length || 0,
      currentStreak: streakData?.current_streak || 0
    };

    // Check user's premium status (use correct column name: clerk_user_id for profiles table)
    const { data: profileData } = await supabaseServerAdmin
      .from('profiles')
      .select('subscription_tier')
      .eq('clerk_user_id', userId)
      .single();

    const isPremium = profileData?.subscription_tier === 'premium';

    // Get coin balance
    const coinBalance = await coinEconomy.getCoinBalance(userId);

    // Add ownership and availability info to themes
    const themesWithStatus = AVAILABLE_THEMES.map(theme => {
      const isOwned = purchasedThemes?.some(p => p.theme_id === theme.id) || false;
      
      let canPurchase = true;
      let lockReason = '';

      // Check premium requirement
      if (theme.isPremiumOnly && !isPremium) {
        canPurchase = false;
        lockReason = 'Requires premium subscription';
      }
      
      // Check coin balance
      if (coinBalance < theme.coinCost && !isOwned) {
        canPurchase = false;
        lockReason = `Need ${theme.coinCost} coins (have ${coinBalance})`;
      }

      // Check other requirements
      if (theme.metadata?.requirements && !isOwned) {
        const { minTasks, minStreak } = theme.metadata.requirements;
        if (minTasks && userStats.completedTasks < minTasks) {
          canPurchase = false;
          lockReason = `Need ${minTasks} completed tasks (have ${userStats.completedTasks})`;
        }
        if (minStreak && userStats.currentStreak < minStreak) {
          canPurchase = false;
          lockReason = `Need ${minStreak} day streak (have ${userStats.currentStreak})`;
        }
      }

      return {
        ...theme,
        isOwned,
        canPurchase: isOwned || canPurchase,
        lockReason: isOwned ? '' : lockReason
      };
    });

    return NextResponse.json({
      themes: themesWithStatus,
      userStats,
      coinBalance,
      isPremium
    });

  } catch (error) {
    console.error('Error in themes GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Purchase a theme
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { themeId } = await request.json();
    
    if (!themeId) {
      return NextResponse.json({ error: 'Theme ID required' }, { status: 400 });
    }

    // Find the theme
    const theme = AVAILABLE_THEMES.find(t => t.id === themeId);
    if (!theme) {
      return NextResponse.json({ error: 'Theme not found' }, { status: 404 });
    }

    if (!supabaseServerAdmin) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Check if already owned (use correct column name: user_id)
    const { data: existing } = await supabaseServerAdmin
      .from('user_purchased_themes')
      .select('id')
      .eq('user_id', userId)
      .eq('theme_id', themeId)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Theme already owned' }, { status: 400 });
    }

    // Verify requirements (similar to GET logic)
    const { data: profileData } = await supabaseServerAdmin
      .from('profiles')
      .select('subscription_tier')
      .eq('clerk_user_id', userId)
      .single();

    const isPremium = profileData?.subscription_tier === 'premium';

    if (theme.isPremiumOnly && !isPremium) {
      return NextResponse.json({ error: 'Theme requires premium subscription' }, { status: 403 });
    }

    // Check user stats if theme has requirements
    if (theme.metadata?.requirements) {
      const { data: userTasks } = await supabaseServerAdmin
        .from('tasks')
        .select('id, status')
        .eq('user_id', userId);

      const { data: streakData } = await supabaseServerAdmin
        .from('user_streaks')
        .select('current_streak')
        .eq('user_id', userId)
        .single();

      const completedTasks = userTasks?.filter(task => task.status === 'completed').length || 0;
      const currentStreak = streakData?.current_streak || 0;

      const { minTasks, minStreak } = theme.metadata.requirements;
      
      if (minTasks && completedTasks < minTasks) {
        return NextResponse.json({ 
          error: `Need ${minTasks} completed tasks (you have ${completedTasks})` 
        }, { status: 403 });
      }
      
      if (minStreak && currentStreak < minStreak) {
        return NextResponse.json({ 
          error: `Need ${minStreak} day streak (you have ${currentStreak})` 
        }, { status: 403 });
      }
    }

    // Spend coins and record purchase
    const spendResult = await coinEconomy.spendCoins(
      userId,
      theme.coinCost,
      'purchase',
      `Purchased ${theme.name} theme`,
      { theme_id: themeId, theme_name: theme.name }
    );

    if (!spendResult.success) {
      return NextResponse.json({ error: spendResult.error }, { status: 400 });
    }

    // Record theme purchase (use correct column name: user_id)
    const { data: purchase, error: purchaseError } = await supabaseServerAdmin
      .from('user_purchased_themes')
      .insert([{
        user_id: userId,
        theme_id: themeId,
        price_paid: theme.coinCost,
        metadata: {
          theme_name: theme.name,
          category: theme.category,
          rarity: theme.rarity,
          colors: theme.colors
        }
      }])
      .select()
      .single();

    if (purchaseError) {
      console.error('Error recording theme purchase:', purchaseError);
      return NextResponse.json({ error: 'Failed to record purchase' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      theme: {
        ...theme,
        isOwned: true,
        purchasedAt: purchase.purchased_at
      },
      newBalance: spendResult.newBalance
    });

  } catch (error) {
    console.error('Error in themes POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 