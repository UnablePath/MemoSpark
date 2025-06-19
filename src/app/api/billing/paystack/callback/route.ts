import { NextRequest, NextResponse } from 'next/server';
import { PaystackService } from '@/lib/payments/PaystackService';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings/subscription?error=payment_failed`);
    }

    const transaction = verification.data;
    const { clerk_user_id, tier_id, billing_period } = transaction.metadata;

    // Update subscription in database
    const currentDate = new Date();
    const periodEnd = new Date(currentDate);
    
    if (billing_period === 'yearly') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    // Handle subscription update/creation
    const { data: existingSubscription } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('clerk_user_id', clerk_user_id)
      .eq('status', 'active')
      .single();

    if (existingSubscription) {
      await supabase
        .from('user_subscriptions')
        .update({
          tier_id: tier_id,
          current_period_end: periodEnd.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existingSubscription.id);
    } else {
      await supabase
        .from('user_subscriptions')
        .insert({
          clerk_user_id: clerk_user_id,
          tier_id: tier_id,
          status: 'active',
          current_period_start: currentDate.toISOString(),
          current_period_end: periodEnd.toISOString()
        });
    }

    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings/subscription?success=payment_completed`);

  } catch (error) {
    console.error('Payment callback error:', error);
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings/subscription?error=callback_failed`);
  }
} 