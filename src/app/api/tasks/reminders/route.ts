import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { taskReminderService } from '@/lib/notifications/TaskReminderService';

// Schedule reminder for a task
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { task, reminderSettings, multiple } = body;

    if (!task || !task.id || !task.title || !task.due_date) {
      return NextResponse.json({ error: 'Invalid task data' }, { status: 400 });
    }

    // Ensure task belongs to authenticated user
    if (task.user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let success;
    
    if (multiple && Array.isArray(multiple)) {
      // Schedule multiple reminders (e.g., 1 day, 1 hour, 15 minutes before)
      const results = await taskReminderService.scheduleMultipleReminders(task, multiple);
      success = results.some(result => result); // At least one succeeded
    } else {
      // Schedule single reminder
      success = await taskReminderService.scheduleTaskReminder(task, reminderSettings);
    }

    if (success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Reminder(s) scheduled successfully' 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to schedule reminder(s)' 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error scheduling task reminder:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

// Cancel reminders for a task
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID required' }, { status: 400 });
    }

    const success = await taskReminderService.cancelTaskReminders(taskId, userId);

    if (success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Reminders cancelled successfully' 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to cancel reminders' 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error cancelling task reminders:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

// Send overdue reminder
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { task } = body;

    if (!task || !task.id || !task.title || !task.due_date) {
      return NextResponse.json({ error: 'Invalid task data' }, { status: 400 });
    }

    // Ensure task belongs to authenticated user
    if (task.user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const success = await taskReminderService.sendOverdueReminder(task);

    if (success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Overdue reminder sent successfully' 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to send overdue reminder' 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error sending overdue reminder:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 