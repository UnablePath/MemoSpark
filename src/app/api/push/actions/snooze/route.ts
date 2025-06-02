import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { addMinutes } from 'date-fns';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { taskId, notificationId, snoozeMinutes = 15 } = body;

    if (!taskId) {
      return NextResponse.json(
        { error: 'Missing taskId' },
        { status: 400 }
      );
    }

    // Calculate new reminder time
    const newReminderTime = addMinutes(new Date(), snoozeMinutes);

    // Log the notification action
    if (notificationId) {
      await supabase
        .from('push_notification_logs')
        .insert({
          user_id: userId,
          notification_id: notificationId,
          action: `snooze_${snoozeMinutes}m`,
          timestamp: new Date().toISOString(),
          success: true
        });
    }

    // Schedule new notification
    await supabase
      .from('scheduled_notifications')
      .insert({
        user_id: userId,
        notification_type: 'task_reminder',
        title: `Snoozed Reminder`,
        body: `Your task reminder has been snoozed for ${snoozeMinutes} minutes`,
        data: JSON.stringify({
          taskId,
          originalNotificationId: notificationId,
          snoozeCount: 1
        }),
        scheduled_time: newReminderTime.toISOString(),
        created_at: new Date().toISOString()
      });

    console.log(`Task ${taskId} snoozed for ${snoozeMinutes} minutes by user ${userId}`);

    return NextResponse.json({ 
      success: true, 
      message: `Task snoozed for ${snoozeMinutes} minutes`,
      newReminderTime: newReminderTime.toISOString(),
      taskId 
    });

  } catch (error) {
    console.error('Failed to snooze task:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 