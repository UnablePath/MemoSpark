import { NextRequest, NextResponse } from 'next/server';
import { PaystackService } from '@/lib/payments/PaystackService';
import { MoMoRecurringService } from '@/lib/payments/MoMoRecurringService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get('reference');

    if (!reference) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings/subscription?error=missing_reference`);
    }

    const paystackService = new PaystackService();
    const verification = await paystackService.verifyPayment(reference);

    if (!verification.status || verification.data.status !== 'success') {
      // Handle failed payment
      const momoService = new MoMoRecurringService();
      await momoService.handleFailedPayment(
        reference, 
        verification.data.gateway_response || 'Payment verification failed'
      );
      
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings/subscription?error=payment_failed&reason=${encodeURIComponent(verification.data.gateway_response || 'Payment failed')}`);
    }

    const transaction = verification.data;
    
    // Check if this is a recurring payment
    if (transaction.metadata?.recurring) {
      const momoService = new MoMoRecurringService();
      await momoService.handleSuccessfulPayment(reference, transaction);
      
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings/subscription?success=recurring_payment_completed&type=${transaction.metadata.billing_period}`);
    }

    // Handle as regular payment if not recurring
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings/subscription?success=payment_completed`);

  } catch (error) {
    console.error('MoMo payment callback error:', error);
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings/subscription?error=callback_failed`);
  }
}

