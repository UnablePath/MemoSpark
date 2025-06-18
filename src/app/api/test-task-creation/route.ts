import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Test Task Creation</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
        .container { background: #f5f5f5; padding: 20px; border-radius: 8px; }
        button { background: #2563eb; color: white; padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; }
        button:hover { background: #1d4ed8; }
        button:disabled { background: #9ca3af; cursor: not-allowed; }
        .result { margin-top: 20px; padding: 15px; background: white; border-radius: 6px; white-space: pre-wrap; font-family: monospace; }
        .success { border-left: 4px solid #10b981; }
        .error { border-left: 4px solid #ef4444; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Test Task Creation API</h1>
        <p>This will test the POST functionality of the task creation API.</p>
        <p><strong>Make sure you're logged in!</strong></p>
        
        <button onclick="testTaskCreation()" id="testBtn">
          Test Task Creation (POST)
        </button>
        
        <div id="result"></div>
      </div>

      <script>
        async function testTaskCreation() {
          const btn = document.getElementById('testBtn');
          const resultDiv = document.getElementById('result');
          
          btn.disabled = true;
          btn.textContent = 'Testing...';
          resultDiv.innerHTML = '';
          
          try {
            const response = await fetch('/api/test-task-creation', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
            });
            
            const data = await response.json();
            
            resultDiv.className = response.ok ? 'result success' : 'result error';
            resultDiv.textContent = JSON.stringify(data, null, 2);
            
          } catch (error) {
            resultDiv.className = 'result error';
            resultDiv.textContent = 'Error: ' + error.message;
          } finally {
            btn.disabled = false;
            btn.textContent = 'Test Task Creation (POST)';
          }
        }
      </script>
    </body>
    </html>
  `;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
}

export async function POST(request: Request) {
  try {
    // Get Clerk authentication
    const { userId, getToken } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Parse request body for custom task data
    let requestData: any = {};
    try {
      requestData = await request.json();
    } catch (e) {
      // Use default if no body provided
    }

    // Import task creation function
    const { createTask } = await import('@/lib/supabase/tasksApi');
    const { taskReminderService } = await import('@/lib/notifications/TaskReminderService');

    console.log('Creating task for user:', userId);
    console.log('Request data:', requestData);

    // Create token provider function
    const getTokenForSupabase = () => getToken({ template: 'supabase-integration' });

    // Prepare task data
    const taskData = {
      title: requestData.title || `Test Task - ${new Date().toISOString()}`,
      description: requestData.description || 'This is a test task created via API to verify authentication and notifications',
      due_date: requestData.due_date || undefined,
      priority: requestData.priority || 'medium',
      type: requestData.type || 'academic',
      subject: requestData.subject || undefined,
      reminder_settings: requestData.reminder_settings || undefined,
      completed: false,
    };

    console.log('Creating task with data:', taskData);

    // Create task using the proper API
    const createdTask = await createTask(taskData, getTokenForSupabase);

    console.log('Task created:', createdTask);

    // Schedule reminder if enabled
    let reminderScheduled = false;
    if (createdTask.reminder_settings?.enabled && createdTask.due_date) {
      try {
        console.log('Scheduling reminder for task:', createdTask.id);
        
        const taskForReminder = {
          id: createdTask.id,
          title: createdTask.title,
          due_date: createdTask.due_date,
          user_id: userId, // Use Clerk user ID for OneSignal
          reminder_offset_minutes: createdTask.reminder_settings.offset_minutes || 15,
          is_completed: createdTask.completed
        };

        reminderScheduled = await taskReminderService.scheduleTaskReminder(taskForReminder);
        console.log('Reminder scheduled:', reminderScheduled);
      } catch (reminderError) {
        console.error('Error scheduling reminder:', reminderError);
      }
    }

    return NextResponse.json({
      success: true,
      createdTask,
      reminderScheduled,
      userId,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('Test task creation error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
} 