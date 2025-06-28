import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { coinEconomy } from '@/lib/gamification/CoinEconomy';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`💰 Compensating user ${userId} for unfair penalty bug`);

    // Give compensation for the harsh penalty system
    const result = await coinEconomy.compensateUnfairPenalty(userId, 200);
    
    if (result.success) {
      console.log(`✅ Compensation successful: +${result.amount} coins, new balance: ${result.newBalance}`);
      return NextResponse.json({
        success: true,
        message: 'Compensation awarded for unfair penalty bug',
        compensation: result.amount,
        newBalance: result.newBalance,
        note: 'The penalty system has been fixed to be much more reasonable!'
      });
    } else {
      console.error(`❌ Compensation failed:`, result.error);
      return NextResponse.json({
        error: 'Failed to award compensation',
        details: result.error
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Compensation API error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 