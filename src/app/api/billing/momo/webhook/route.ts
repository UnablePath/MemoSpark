import { NextRequest, NextResponse } from 'next/server';
import { PaystackService } from '@/lib/payments/PaystackService';
import { MoMoRecurringService } from '@/lib/payments/MoMoRecurringService';

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
    console.log('MoMo webhook received:', event.event);

    // Only handle events related to recurring MoMo payments
    if (!event.data?.metadata?.recurring) {
      return NextResponse.json({ status: 'ignored - not recurring' });
    }

    const momoService = new MoMoRecurringService();

    switch (event.event) {
      case 'charge.success':
        await handleMoMoChargeSuccess(event.data, momoService);
        break;
      
      case 'charge.failed':
        await handleMoMoChargeFailed(event.data, momoService);
        break;
      
      default:
        console.log('Unhandled MoMo webhook event:', event.event);
    }

    return NextResponse.json({ status: 'success' });

  } catch (error) {
    console.error('MoMo webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleMoMoChargeSuccess(data: any, momoService: MoMoRecurringService) {
  try {
    const reference = data.reference;
    
    if (!reference) {
      console.error('No reference found in successful charge data');
      return;
    }

    // Handle successful recurring payment
    await momoService.handleSuccessfulPayment(reference, data);
    
    console.log(`MoMo recurring payment successful: ${reference}`);
  } catch (error) {
    console.error('Error handling MoMo charge success:', error);
  }
}

async function handleMoMoChargeFailed(data: any, momoService: MoMoRecurringService) {
  try {
    const reference = data.reference;
    const reason = data.gateway_response || data.message || 'Payment failed';
    
    if (!reference) {
      console.error('No reference found in failed charge data');
      return;
    }

    // Handle failed recurring payment and schedule retry
    await momoService.handleFailedPayment(reference, reason);
    
    console.log(`MoMo recurring payment failed: ${reference} - ${reason}`);
  } catch (error) {
    console.error('Error handling MoMo charge failure:', error);
  }
}

