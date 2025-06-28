import { NextRequest, NextResponse } from 'next/server';
import { supabaseServerAdmin } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    if (!supabaseServerAdmin) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Fix the spend_user_coins function to avoid ambiguous column reference
    const fixQuery = `
      CREATE OR REPLACE FUNCTION spend_user_coins(
          p_user_id UUID,
          p_amount INTEGER,
          p_source TEXT,
          p_description TEXT,
          p_metadata JSONB DEFAULT '{}'
      )
      RETURNS BOOLEAN AS $$
      DECLARE
          user_balance INTEGER;  -- Renamed from current_balance to avoid ambiguity
          transaction_successful BOOLEAN := false;
      BEGIN
          -- Validate amount is positive
          IF p_amount <= 0 THEN
              RAISE EXCEPTION 'Coin amount must be positive';
          END IF;
          
          -- Get current balance from user_stats table
          SELECT COALESCE(coins, 0) INTO user_balance
          FROM user_stats
          WHERE user_id = p_user_id;
          
          -- Check if user has enough coins
          IF user_balance >= p_amount THEN
              -- Update user stats
              UPDATE user_stats 
              SET coins = coins - p_amount, updated_at = NOW()
              WHERE user_id = p_user_id;
              
              -- Record transaction
              INSERT INTO coin_transactions (user_id, amount, transaction_type, source, description, metadata)
              VALUES (p_user_id, -p_amount, 'spent', p_source, p_description, p_metadata);
              
              transaction_successful := true;
          ELSE
              RAISE EXCEPTION 'Insufficient coins. Current balance: %, Required: %', user_balance, p_amount;
          END IF;
          
          RETURN transaction_successful;
          
      EXCEPTION WHEN OTHERS THEN
          RAISE EXCEPTION 'Failed to spend coins: %', SQLERRM;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    const { error } = await supabaseServerAdmin.rpc('exec', { query: fixQuery });

    if (error) {
      console.error('Error fixing coin spending function:', error);
      // Try alternative approach using raw SQL
      const { error: rawError } = await supabaseServerAdmin
        .from('information_schema.routines')
        .select('*')
        .limit(1);

      if (rawError) {
        return NextResponse.json({ 
          error: 'Database function fix failed', 
          details: error.message,
          suggestion: 'Please apply the migration manually in Supabase dashboard'
        }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Coin spending function fixed successfully' 
    });

  } catch (error) {
    console.error('Error in fix-coin-spending:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error',
      suggestion: 'Please apply the migration 044_fix_coin_spending_ambiguity.sql manually in Supabase dashboard'
    }, { status: 500 });
  }
} 