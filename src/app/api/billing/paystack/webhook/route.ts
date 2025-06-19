import { NextRequest, NextResponse } from 'next/server';
import { PaystackService } from '@/lib/payments/PaystackService';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-paystack-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    const paystackService = new PaystackService();
    const isValid = paystackService.validateWebhookSignature(body, signature);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    const event = JSON.parse(body);
    
    console.log('Paystack webhook received:', event.event);

    switch (event.event) {
      case 'charge.success':
        await handleChargeSuccess(event.data);
        break;
      
      case 'subscription.create':
        await handleSubscriptionCreate(event.data);
        break;
      
      case 'subscription.disable':
        await handleSubscriptionDisable(event.data);
        break;
      
      case 'invoice.create':
        await handleInvoiceCreate(event.data);
        break;
      
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data);
        break;
      
      default:
        console.log('Unhandled webhook event:', event.event);
    }

    return NextResponse.json({ status: 'success' });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleChargeSuccess(data: any) {
  try {
    const { reference, metadata, customer, amount, status } = data;
    
    if (!metadata?.clerk_user_id) {
      console.log('No clerk_user_id in metadata, skipping');
      return;
    }

    // Update payment transaction
    const { error: updateError } = await supabase
      .from('payment_transactions')
      .update({
        status: 'completed',
        paid_at: data.paid_at,
        paystack_transaction_id: data.id,
        gateway_response: data.gateway_response
      })
      .eq('reference', reference);

    if (updateError) {
      console.error('Error updating payment transaction:', updateError);
    }

    console.log(`Payment successful for reference: ${reference}`);
  } catch (error) {
    console.error('Error handling charge success:', error);
  }
}

async function handleSubscriptionCreate(data: any) {
  try {
    console.log('Subscription created:', data);
    // Handle subscription creation if using Paystack subscriptions
  } catch (error) {
    console.error('Error handling subscription create:', error);
  }
}

async function handleSubscriptionDisable(data: any) {
  try {
    console.log('Subscription disabled:', data);
    
    // Update subscription status in database
    const { error } = await supabase
      .from('user_subscriptions')
      .update({
        status: 'cancelled',
        cancel_at_period_end: true,
        updated_at: new Date().toISOString()
      })
      .eq('paystack_subscription_code', data.subscription_code);

    if (error) {
      console.error('Error updating subscription status:', error);
    }
  } catch (error) {
    console.error('Error handling subscription disable:', error);
  }
}

async function handleInvoiceCreate(data: any) {
  try {
    console.log('Invoice created:', data);
    // Handle invoice creation
  } catch (error) {
    console.error('Error handling invoice create:', error);
  }
}

async function handleInvoicePaymentFailed(data: any) {
  try {
    console.log('Invoice payment failed:', data);
    
    // Update subscription status to past_due
    const { error } = await supabase
      .from('user_subscriptions')
      .update({
        status: 'past_due',
        updated_at: new Date().toISOString()
      })
      .eq('paystack_subscription_code', data.subscription?.subscription_code);

    if (error) {
      console.error('Error updating subscription status:', error);
    }
  } catch (error) {
    console.error('Error handling invoice payment failed:', error);
  }
} 