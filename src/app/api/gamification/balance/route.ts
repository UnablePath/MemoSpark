import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// This would be your actual Supabase client
// import { createClient } from '@supabase/supabase-js';
// const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // In production, query Supabase:
    // const { data: balance, error: balanceError } = await supabase
    //   .from('coin_balances')
    //   .select('balance, last_updated')
    //   .eq('user_id', userId)
    //   .single();

    // const { data: transactions, error: transactionsError } = await supabase
    //   .from('coin_transactions')
    //   .select('*')
    //   .eq('user_id', userId)
    //   .order('created_at', { ascending: false })
    //   .limit(10);

    // if (balanceError) {
    //   // Create initial balance if doesn't exist
    //   const { data: newBalance, error: createError } = await supabase
    //     .from('coin_balances')
    //     .insert({ user_id: userId, balance: 0 })
    //     .select()
    //     .single();
    //   
    //   if (createError) throw createError;
    //   balance = newBalance;
    // }

    // Mock data for development
    const mockBalance = {
      balance: 500,
      last_updated: new Date().toISOString()
    };

    const mockTransactions = [
      {
        id: '1',
        user_id: userId,
        amount: 50,
        type: 'task_completion',
        description: 'Completed Math Assignment',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
        metadata: { task_id: 'task_123' }
      },
      {
        id: '2',
        user_id: userId,
        amount: 25,
        type: 'daily_streak',
        description: 'Daily streak bonus',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
        metadata: { streak_count: 7 }
      },
      {
        id: '3',
        user_id: userId,
        amount: -100,
        type: 'purchase',
        description: 'Purchased Streak Freeze',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
        metadata: { item_id: '1', item_name: 'Streak Freeze' }
      },
      {
        id: '4',
        user_id: userId,
        amount: 75,
        type: 'achievement',
        description: 'Unlocked "Study Master" achievement',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(), // 3 days ago
        metadata: { achievement_id: 'study_master' }
      },
      {
        id: '5',
        user_id: userId,
        amount: 30,
        type: 'task_completion',
        description: 'Completed Science Quiz',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(), // 4 days ago
        metadata: { task_id: 'task_456' }
      }
    ];

    return NextResponse.json({
      balance: mockBalance.balance,
      last_updated: mockBalance.last_updated,
      recent_transactions: mockTransactions
    });

  } catch (error) {
    console.error('Error fetching balance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch balance' },
      { status: 500 }
    );
  }
} 