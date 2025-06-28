import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseServerAdmin } from '@/lib/supabase/server';
import { coinEconomy } from '@/lib/gamification/CoinEconomy';

// Enable Next.js edge caching for GET requests (1 minute for balance - changes often)
export const revalidate = 60;

// This would be your actual Supabase client
// import { createClient } from '@supabase/supabase-js';
// const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!supabaseServerAdmin) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Primary method: Use CoinEconomy.getCoinBalance() for consistency
    let balance = 0;
    let totalEarned = 0;
    let totalSpent = 0;

    try {
      // Use the same method as other components for consistency
      balance = await coinEconomy.getCoinBalance(userId);
      
      // Get additional analytics for the response
      const analytics = await coinEconomy.getCoinAnalytics(userId);
      totalEarned = analytics.total_earned;
      totalSpent = analytics.total_spent;
    } catch (coinEconomyError) {
      console.warn('CoinEconomy method failed, falling back to manual calculation:', coinEconomyError);
      
      // Fallback: Calculate from transactions directly (existing logic)
      const { data: earnedTransactions } = await supabaseServerAdmin
        .from('coin_transactions')
        .select('amount')
        .eq('user_id', userId)
        .eq('transaction_type', 'earned');

      const { data: spentTransactions } = await supabaseServerAdmin
        .from('coin_transactions')
        .select('amount')
        .eq('user_id', userId)
        .eq('transaction_type', 'spent');

      totalEarned = earnedTransactions?.reduce((sum, t) => sum + t.amount, 0) || 0;
      totalSpent = spentTransactions?.reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;
      balance = totalEarned - totalSpent;
    }

    // Get recent transactions for context
    const { data: recentTransactions } = await supabaseServerAdmin
      .from('coin_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      success: true,
      balance: Math.max(0, balance), // Ensure non-negative balance
      totalEarned,
      totalSpent,
      recentTransactions: recentTransactions || []
    });

  } catch (error) {
    console.error('Error fetching coin balance:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 