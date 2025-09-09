import { NextRequest, NextResponse } from 'next/server';
import { PaystackService } from '@/lib/payments/PaystackService';
import { SimpleMoMoRecurring } from '@/lib/payments/SimpleMoMoRecurring';

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
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings/subscription?error=payment_failed&reason=${encodeURIComponent(verification.data.gateway_response || 'Payment failed')}`);
    }

    const transaction = verification.data;
    
    // Handle successful payment
    if (transaction.metadata?.is_recurring) {
      const momoService = new SimpleMoMoRecurring();
      await momoService.handleSuccessfulPayment(reference, transaction);
      
      const isFirstPayment = transaction.metadata.is_first_payment;
      const isRenewal = transaction.metadata.is_renewal;
      
      let successMessage = 'payment_completed';
      if (isFirstPayment) {
        successMessage = 'subscription_activated';
      } else if (isRenewal) {
        successMessage = 'subscription_renewed';
      }
      
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings/subscription?success=${successMessage}&period=${transaction.metadata.billing_period}`);
    }

    // Handle as regular payment if not recurring
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings/subscription?success=payment_completed`);

  } catch (error) {
    console.error('Simple MoMo payment callback error:', error);
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings/subscription?error=callback_failed`);
  }
}
