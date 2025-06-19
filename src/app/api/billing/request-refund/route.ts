import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { userEmail, reason, subscriptionId } = await request.json();

    if (!userEmail || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    let requestId = 'temp-' + Date.now();

    // Check if Supabase client is available
    if (!supabase) {
      console.error('Supabase client not available');
      // Continue without logging to database
    } else {
      // Log the refund request to the database
      const { data, error } = await supabase
        .from('refund_requests')
        .insert({
          clerk_user_id: userId,
          user_email: userEmail,
          subscription_id: subscriptionId,
          reason: reason,
          status: 'pending',
          requested_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Error logging refund request:', error);
        // Continue even if logging fails
      } else if (data?.id) {
        requestId = data.id;
      }
    }

    // Here you would typically integrate with your payment processor
    // For Paystack, you might use their refund API
    // For now, we'll simulate a successful request submission

    // Send notification email to admin (simulate)
    const adminNotification = {
      to: 'support@memospark.com',
      subject: `New Refund Request from ${userEmail}`,
      body: `
        User: ${userEmail}
        Subscription ID: ${subscriptionId || 'N/A'}
        Reason: ${reason}
        Requested At: ${new Date().toISOString()}
        
        Please review and process this refund request.
      `
    };

    console.log('Refund request submitted:', adminNotification);

    return NextResponse.json({
      success: true,
      message: 'Refund request submitted successfully',
      requestId: requestId,
    });

  } catch (error) {
    console.error('Error processing refund request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 