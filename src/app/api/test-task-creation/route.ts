import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

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

    // Test task creation
    const testTaskData = {
      title: `Test Task - ${new Date().toISOString()}`,
      description: 'This is a test task created via API to verify authentication',
      priority: 'medium',
      type: 'academic',
      completed: false,
    };

    console.log('Creating test task with data:', testTaskData);
    console.log('User ID:', userId);

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