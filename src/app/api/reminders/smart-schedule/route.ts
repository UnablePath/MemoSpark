import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { reminderEngine } from '@/lib/reminders/ReminderEngine';

// Schedule smart reminder for a task
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { task, userPattern } = body;

    if (!task || !task.id || !task.title || !task.due_date) {
      return NextResponse.json({ error: 'Invalid task data' }, { status: 400 });
    }

    // Ensure task belongs to authenticated user
    if (task.user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Schedule smart reminder
    const success = await reminderEngine.scheduleSmartReminder(task, userPattern);

    if (success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Smart reminders scheduled successfully' 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to schedule smart reminders' 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error scheduling smart reminder:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

// Handle snooze action
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, taskId, snoozeMinutes } = body;

    if (!action || !taskId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let success = false;

    switch (action) {
      case 'snooze':
        success = await reminderEngine.snoozeReminder(taskId, userId, snoozeMinutes || 15);
        break;
      case 'complete':
        success = await reminderEngine.completeTaskFromReminder(taskId, userId);
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (success) {
      return NextResponse.json({ 
        success: true, 
        message: `Task ${action} successful` 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        message: `Failed to ${action} task` 
      }, { status: 500 });
    }

  } catch (error) {
    console.error(`Error handling reminder action:`, error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

// Get reminder stats
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stats = await reminderEngine.getReminderStats(userId);

    return NextResponse.json({ 
      success: true, 
      data: stats 
    });

  } catch (error) {
    console.error('Error getting reminder stats:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 