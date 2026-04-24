import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseWithClerkAuth } from '@/lib/supabase/server-auth';
import { PaystackService } from '@/lib/payments/PaystackService';

export async function POST(request: NextRequest) {
  try {
    const { supabase, userId } = await getSupabaseWithClerkAuth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { userEmail, reason, subscriptionId, transactionReferenceOrId } = await request.json();

    if (!userEmail || !reason || !transactionReferenceOrId) {
      return NextResponse.json(
        { error: 'Missing required fields (userEmail, reason, transactionReferenceOrId)' },
        { status: 400 }
      );
    }

    let requestId = `temp-${Date.now()}`;

    // Log the refund request to the database (optional, for audit)
    if (supabase) {
      const { data, error } = await supabase
        .from('refund_requests')
        .insert({
          clerk_user_id: userId,
          user_email: userEmail,
          subscription_id: subscriptionId,
          reason: reason,
          status: 'pending',
          requested_at: new Date().toISOString(),
          transaction_reference: transactionReferenceOrId,
        })
        .select()
        .single();
      if (!error && data?.id) {
        requestId = data.id;
      }
    }

    // Call Paystack refund API
    const paystack = new PaystackService();
    const refundResult = await paystack.refundTransaction(transactionReferenceOrId);

    return NextResponse.json({
      success: true,
      message: 'Refund request submitted to Paystack',
      requestId,
      paystack: refundResult,
    });

  } catch (error) {
    console.error('Error processing refund request:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : error },
      { status: 500 }
    );
  }
} 