import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { reminderEngine } from '@/lib/reminders/ReminderEngine';
import { NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/client';
import { ReminderEngine } from '@/lib/reminders/ReminderEngine';

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

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body with error handling
    let body;
    try {
      const text = await request.text();
      if (!text || text.trim() === '') {
        // Default values for empty body (for testing purposes)
        body = {
          title: `Test Task - ${new Date().toLocaleDateString()}`,
          description: 'Test task created for reminder system testing',
          due_date: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
          priority: 'medium',
          subject: 'General'
        };
        console.log('📝 Using default task data for empty request body');
      } else {
        body = JSON.parse(text);
      }
    } catch (parseError) {
      console.error('Task creation: Invalid JSON in request body:', parseError);
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const { title, description, due_date, priority = 'medium', subject } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Create Supabase client
    const supabase = createServiceRoleClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    console.log(`📝 Creating task for user: ${userId}`);
    console.log(`Task details:`, { title, description, due_date, priority, subject });

    // Create the task
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert([{
        user_id: userId,
        title,
        description,
        due_date: due_date ? new Date(due_date).toISOString() : null,
        priority,
        subject,
        completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (taskError) {
      console.error('❌ Error creating task:', taskError);
      return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
    }

    console.log('✅ Task created successfully:', task);

    // If task has a due date, create reminders
    if (due_date && task) {
      try {
        console.log('📅 Task has due date, creating reminders...');
        
        const reminderEngine = ReminderEngine.getInstance();
        
        // Create both regular reminder and smart reminders
        // Pass the Clerk user ID to avoid UUID/text mismatch issues
        const reminderSuccess = await reminderEngine.scheduleSmartReminder({
          id: task.id,
          title: task.title,
          due_date: task.due_date,
          user_id: task.user_id, // Keep for task reference (UUID format)
          priority: task.priority,
          subject: task.subject
        }, undefined, userId); // Pass Clerk user ID as third parameter

        if (reminderSuccess) {
          console.log('✅ Reminders created successfully');
        } else {
          console.warn('⚠️ Failed to create reminders, but task created successfully');
        }
      } catch (reminderError) {
        console.error('❌ Error creating reminders:', reminderError);
        // Don't fail the task creation if reminders fail
      }
    }

    return NextResponse.json({ 
      success: true, 
      task,
      message: 'Task created successfully' + (due_date ? ' with smart reminders' : '')
    });

  } catch (error) {
    console.error('❌ Error in task creation API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 