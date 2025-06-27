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

    // Store authorization for recurring billing if available
    if (transaction.authorization && transaction.authorization.reusable) {
      const authData = {
        clerk_user_id,
        email: transaction.customer.email,
        authorization_code: transaction.authorization.authorization_code,
        bin: transaction.authorization.bin,
        last4: transaction.authorization.last4,
        exp_month: transaction.authorization.exp_month,
        exp_year: transaction.authorization.exp_year,
        card_type: transaction.authorization.card_type,
        bank: transaction.authorization.bank,
        channel: transaction.authorization.channel,
        signature: transaction.authorization.signature,
        reusable: transaction.authorization.reusable,
        country_code: transaction.authorization.country_code,
        account_name: transaction.authorization.account_name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Store or update authorization
      const { data: existingAuth } = await supabase
        .from('payment_authorizations')
        .select('*')
        .eq('clerk_user_id', clerk_user_id)
        .eq('signature', transaction.authorization.signature)
        .single();

      if (existingAuth) {
        await supabase
          .from('payment_authorizations')
          .update({
            ...authData,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingAuth.id);
      } else {
        await supabase
          .from('payment_authorizations')
          .insert(authData);
      }
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

    // Update payment transaction with success status
    await supabase
      .from('payment_transactions')
      .update({
        status: 'completed',
        paid_at: transaction.paid_at,
        gateway_response: transaction.gateway_response
      })
      .eq('reference', reference);

    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings/subscription?success=payment_completed`);

  } catch (error) {
    console.error('Payment callback error:', error);
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings/subscription?error=callback_failed`);
  }
} 