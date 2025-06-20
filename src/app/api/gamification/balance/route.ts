import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseServerAdmin } from '@/lib/supabase/server';

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

    // Calculate coin balance from transactions using clerk_user_id directly
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

    const totalEarned = earnedTransactions?.reduce((sum, t) => sum + t.amount, 0) || 0;
    const totalSpent = spentTransactions?.reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;
    const balance = totalEarned - totalSpent;

    // Also get recent transactions for context
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