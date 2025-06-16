import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// This would be your actual Supabase client
// import { createClient } from '@supabase/supabase-js';
// const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { itemId } = await request.json();
    
    if (!itemId) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      );
    }

    // In production, this would be a database transaction:
    // const { data: item, error: itemError } = await supabase
    //   .from('reward_shop_items')
    //   .select('*')
    //   .eq('id', itemId)
    //   .single();

    // if (itemError || !item) {
    //   return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    // }

    // const { data: balance, error: balanceError } = await supabase
    //   .from('coin_balances')
    //   .select('balance')
    //   .eq('user_id', userId)
    //   .single();

    // if (balanceError || !balance || balance.balance < item.price) {
    //   return NextResponse.json({ error: 'Insufficient coins' }, { status: 400 });
    // }

    // Mock data for development
    const mockItems = {
      '1': { id: '1', name: 'Streak Freeze', price: 100, effect: { type: 'streak_protection', duration: 1 } },
      '2': { id: '2', name: 'Double XP Boost', price: 200, effect: { type: 'xp_multiplier', multiplier: 2, duration: 24 } },
      '3': { id: '3', name: 'Time Extension', price: 150, effect: { type: 'deadline_extension', hours: 2 } },
      '4': { id: '4', name: 'Custom Theme', price: 300, effect: { type: 'theme_unlock', themes: ['dark_pro', 'sunset', 'ocean'] } },
      '5': { id: '5', name: 'Priority Boost', price: 75, effect: { type: 'priority_access', duration: 7 } }
    };

    const item = mockItems[itemId as keyof typeof mockItems];
    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const mockBalance = 500; // Mock user balance
    if (mockBalance < item.price) {
      return NextResponse.json({ error: 'Insufficient coins' }, { status: 400 });
    }

    // In production, perform the transaction:
    // 1. Deduct coins from balance
    // 2. Record the transaction
    // 3. Apply the effect (store in user_effects table or similar)
    // 4. Log the purchase

    // const { error: deductError } = await supabase
    //   .from('coin_balances')
    //   .update({ balance: balance.balance - item.price })
    //   .eq('user_id', userId);

    // const { error: transactionError } = await supabase
    //   .from('coin_transactions')
    //   .insert({
    //     user_id: userId,
    //     amount: -item.price,
    //     type: 'purchase',
    //     description: `Purchased ${item.name}`,
    //     metadata: { item_id: itemId, effect: item.effect }
    //   });

    // const { error: effectError } = await supabase
    //   .from('user_effects')
    //   .insert({
    //     user_id: userId,
    //     effect_type: item.effect.type,
    //     effect_data: item.effect,
    //     expires_at: calculateExpiryDate(item.effect),
    //     source: 'shop_purchase',
    //     source_id: itemId
    //   });

    // Mock successful purchase response
    const purchase = {
      id: Math.random().toString(36).substr(2, 9),
      user_id: userId,
      item_id: itemId,
      item_name: item.name,
      price: item.price,
      effect: item.effect,
      purchased_at: new Date().toISOString(),
      new_balance: mockBalance - item.price
    };

    return NextResponse.json({
      success: true,
      purchase,
      message: `Successfully purchased ${item.name}!`
    });

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