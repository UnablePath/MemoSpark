import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
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

export async function POST() {
  try {
    // Get Clerk authentication
    const { userId, getToken } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Create Supabase client with Clerk integration
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      accessToken: async () => {
        // Use the correct template name
        const token = await getToken({ template: 'supabase-integration' });
        return token;
      },
    });

    console.log('Testing for user:', userId);

    // First, let's check the table structure
    const { data: tableInfo, error: tableError } = await supabase
      .from('profiles')
      .select()
      .limit(1);
    
    console.log('Table structure check:', {
      sampleRecord: tableInfo?.[0],
      availableFields: tableInfo?.[0] ? Object.keys(tableInfo[0]) : 'none',
      tableError
    });

    // FIRST: Check if user exists in profiles table (this reveals webhook issues)
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, clerk_user_id, email, full_name, *')
      .eq('clerk_user_id', userId)
      .single();

    console.log('User profile check:', { userProfile, profileError });
    console.log('Profile ID:', userProfile?.id);
    console.log('Available fields:', userProfile ? Object.keys(userProfile) : 'none');

    if (!userProfile) {
      return NextResponse.json({
        success: false,
        error: 'User profile not found in Supabase',
        details: profileError,
        userId,
        webhookStatus: 'User NOT found in Supabase - webhook issue!',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Test task creation
    const testTaskData = {
      user_id: userProfile.id, // Use the UUID from profiles table, not Clerk ID!
      title: `Test Task - ${new Date().toISOString()}`,
      description: 'This is a test task created via API to verify authentication',
      priority: 'medium',
      type: 'academic',
      completed: false,
    };

    console.log('Creating test task with data:', testTaskData);

    const { data: createdTask, error: createError } = await supabase
      .from('tasks')
      .insert(testTaskData)
      .select()
      .single();

    if (createError) {
      console.error('Task creation error:', createError);
      return NextResponse.json({
        success: false,
        error: 'Failed to create task',
        details: createError,
        userId,
        userProfile,
        profileError: profileError?.message,
        webhookStatus: userProfile ? 'User exists in Supabase - webhook working' : 'User NOT found in Supabase - webhook issue!',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Test fetching tasks to verify RLS
    const { data: allTasks, error: fetchError } = await supabase
      .from('tasks')
      .select('id, title, user_id')
      .limit(5);

    return NextResponse.json({
      success: true,
      createdTask,
      allTasks,
      fetchError: fetchError?.message,
      userId,
      userProfile,
      profileError: profileError?.message,
      webhookStatus: userProfile ? 'User exists in Supabase - webhook working' : 'User NOT found in Supabase - webhook issue!',
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