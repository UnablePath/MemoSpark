import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { SimpleMoMoRecurring } from '@/lib/payments/SimpleMoMoRecurring';

export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    
    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const momoService = new SimpleMoMoRecurring();
    
    // Check if subscription needs payment
    const status = await momoService.checkSubscriptionStatus(clerkUserId);
    
    // Get subscription info
    const subscription = await momoService.getUserSubscription(clerkUserId);
    
    let daysUntilPayment = null;
    if (subscription && !status.needsPayment) {
      daysUntilPayment = momoService.getDaysUntilNextPayment(subscription);
    }

    return NextResponse.json({
      success: true,
      data: {
        needsPayment: status.needsPayment,
        paymentUrl: status.paymentUrl,
        daysOverdue: status.daysOverdue,
        daysUntilPayment,
        message: status.message,
        subscription: subscription ? {
          id: subscription.id,
          tier_id: subscription.tier_id,
          phone: subscription.phone,
          amount: subscription.amount,
          billing_period: subscription.billing_period,
          network: subscription.network,
          status: subscription.status,
          last_payment_date: subscription.last_payment_date
        } : null
      }
    });

  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check subscription status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
