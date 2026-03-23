import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

const supabase = getSupabaseAdmin()!;

export async function GET() {
  try {
    // Get Clerk authentication
    const { userId, getToken } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Test 1: Check if we can get user info
    const clerkInfo = {
      userId,
      hasToken: !!(await getToken()),
    };

    // Test 2: Try to access Supabase
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('clerk_user_id', userId)
      .single();

    // Test 3: Try to access tasks
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, title, clerk_user_id')
      .eq('clerk_user_id', userId)
      .limit(5);

    return NextResponse.json({
      success: true,
      clerk: clerkInfo,
      profile: {
        data: profile,
        error: profileError?.message,
      },
      tasks: {
        data: tasks,
        error: tasksError?.message,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('Auth test error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
} 