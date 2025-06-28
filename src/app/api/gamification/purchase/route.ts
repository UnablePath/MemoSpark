import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseServerAdmin } from '@/lib/supabase/server';
import { coinEconomy } from '@/lib/gamification/CoinEconomy';

// This would be your actual Supabase client
// import { createClient } from '@supabase/supabase-js';
// const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!supabaseServerAdmin) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const { itemId } = await request.json();
    
    if (!itemId) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      );
    }

    // Fetch the item from coin_spending_categories
    const { data: item, error: itemError } = await supabaseServerAdmin
      .from('coin_spending_categories')
      .select('*')
      .eq('id', itemId)
      .single();

    if (itemError || !item) {
      console.error('Item fetch error:', itemError);
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Check user's coin balance
    const userBalance = await coinEconomy.getCoinBalance(userId);
    if (userBalance < item.cost) {
      return NextResponse.json({ 
        error: 'Insufficient coins',
        required: item.cost,
        current: userBalance 
      }, { status: 400 });
    }

    // Check if this is a theme purchase and if user already owns it
    const isTheme = item.metadata?.type === 'theme';
    if (isTheme && item.metadata?.theme_id) {
      const { data: existingPurchase } = await supabaseServerAdmin
        .from('user_purchased_themes')
        .select('id')
        .eq('clerk_user_id', userId)
        .eq('theme_id', item.metadata.theme_id)
        .single();

      if (existingPurchase) {
        return NextResponse.json({ 
          error: 'Theme already owned' 
        }, { status: 400 });
      }
    }

    // Start transaction-like operations
    try {
      // Spend coins using CoinEconomy
      const spendResult = await coinEconomy.spendCoins(
        userId,
        item.cost,
        item.category_name,
        `Purchased ${item.item_name}`,
        {
          item_id: itemId,
          item_name: item.item_name,
          metadata: item.metadata
        }
      );

      if (!spendResult.success) {
        return NextResponse.json({ 
          error: spendResult.error || 'Failed to spend coins' 
        }, { status: 400 });
      }

      // If this is a theme purchase, record it in user_purchased_themes
      if (isTheme && item.metadata?.theme_id) {
        const { error: themeError } = await supabaseServerAdmin
          .from('user_purchased_themes')
          .insert({
            clerk_user_id: userId,
            theme_id: item.metadata.theme_id,
            price_paid: item.cost,
            metadata: {
              item_name: item.item_name,
              colors: item.metadata.colors,
              rarity: item.metadata.rarity,
              purchased_from: 'reward_shop'
            }
          });

        if (themeError) {
          console.error('Error recording theme purchase:', themeError);
          // Note: In a real app, you'd want to roll back the coin transaction here
          return NextResponse.json({ 
            error: 'Failed to record theme purchase' 
          }, { status: 500 });
        }
      }

      // Create successful purchase response
      const purchase = {
        id: Math.random().toString(36).substr(2, 9),
        user_id: userId,
        item_id: itemId,
        item_name: item.item_name,
        price: item.cost,
        category: item.category_name,
        metadata: item.metadata,
        purchased_at: new Date().toISOString(),
        new_balance: spendResult.newBalance
      };

      return NextResponse.json({
        success: true,
        purchase,
        message: `Successfully purchased ${item.item_name}!`,
        theme_id: isTheme ? item.metadata?.theme_id : undefined
      });

    } catch (transactionError) {
      console.error('Transaction error:', transactionError);
      return NextResponse.json(
        { error: 'Failed to complete purchase transaction' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error processing purchase:', error);
    return NextResponse.json(
      { error: 'Failed to process purchase' },
      { status: 500 }
    );
  }
}

// Helper function to calculate effect expiry
function calculateExpiryDate(effect: any): string | null {
  if (!effect.duration) return null;
  
  const now = new Date();
  switch (effect.type) {
    case 'xp_multiplier':
    case 'priority_access':
      // Duration in hours
      now.setHours(now.getHours() + effect.duration);
      break;
    case 'streak_protection':
      // Duration in days
      now.setDate(now.getDate() + effect.duration);
      break;
    case 'deadline_extension':
      // One-time use, expires after use
      now.setHours(now.getHours() + 24);
      break;
    default:
      return null;
  }
  
  return now.toISOString();
} 