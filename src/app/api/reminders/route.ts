import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/client';
import { NextRequest } from 'next/server';

export async function GET() {
  try {
    // Get authenticated user
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create Supabase client with service role
    const supabase = createServiceRoleClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    console.log(`📋 Fetching reminders for user: ${userId}`);

    // Fetch reminders for the current user
    const { data: reminders, error: remindersError } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', userId)
      .order('due_date', { ascending: true });

    if (remindersError) {
      console.error('❌ Error fetching reminders:', remindersError);
      return NextResponse.json({ error: 'Failed to fetch reminders' }, { status: 500 });
    }

    console.log(`✅ Found ${reminders?.length || 0} reminders`);

    return NextResponse.json({ 
      success: true, 
      reminders: reminders || []
    });

  } catch (error) {
    console.error('❌ Error in reminders GET API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    let body;
    try {
      const text = await request.text();
      if (!text || text.trim() === '') {
        return NextResponse.json({ error: 'Request body is required' }, { status: 400 });
      }
      body = JSON.parse(text);
    } catch (parseError) {
      console.error('Reminder creation: Invalid JSON in request body:', parseError);
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const { title, description, due_date, reminder_time, priority = 'medium' } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    if (!due_date) {
      return NextResponse.json({ error: 'Due date is required' }, { status: 400 });
    }

    // Create Supabase client with service role
    const supabase = createServiceRoleClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    console.log(`📝 Creating reminder for user: ${userId}`);
    console.log(`Reminder details:`, { title, description, due_date, reminder_time, priority });

    // Calculate reminder time if not provided
    let finalReminderTime = reminder_time;
    if (!finalReminderTime) {
      // Default to 1 hour before due date
      const dueDateTime = new Date(due_date);
      const reminderDateTime = new Date(dueDateTime.getTime() - (60 * 60 * 1000)); // 1 hour before
      finalReminderTime = reminderDateTime.toISOString();
    }

    // Create the reminder using the same pattern as task creation
    const { data: reminder, error: reminderError } = await supabase
      .from('reminders')
      .insert([{
        user_id: userId, // Use Clerk user ID directly
        title,
        description: description || `Reminder: ${title}`,
        due_date: new Date(due_date).toISOString(),
        reminder_time: new Date(finalReminderTime).toISOString(),
        priority,
        completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (reminderError) {
      console.error('❌ Error creating reminder:', reminderError);
      return NextResponse.json({ 
        error: 'Failed to create reminder',
        details: reminderError.message 
      }, { status: 500 });
    }

    console.log('✅ Reminder created successfully:', reminder);

    return NextResponse.json({ 
      success: true, 
      reminder,
      message: 'Reminder created successfully'
    });

  } catch (error) {
    console.error('❌ Error in reminder creation API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Get authenticated user
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    let body;
    try {
      const text = await request.text();
      if (!text || text.trim() === '') {
        return NextResponse.json({ error: 'Request body is required' }, { status: 400 });
      }
      body = JSON.parse(text);
    } catch (parseError) {
      console.error('Reminder update: Invalid JSON in request body:', parseError);
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Reminder ID is required' }, { status: 400 });
    }

    // Create Supabase client with service role
    const supabase = createServiceRoleClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    console.log(`📝 Updating reminder ${id} for user: ${userId}`);
    console.log(`Update data:`, updates);

    // Update the reminder
    const { data: reminder, error: reminderError } = await supabase
      .from('reminders')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', userId) // Ensure user can only update their own reminders
      .select()
      .single();

    if (reminderError) {
      console.error('❌ Error updating reminder:', reminderError);
      return NextResponse.json({ 
        error: 'Failed to update reminder',
        details: reminderError.message 
      }, { status: 500 });
    }

    console.log('✅ Reminder updated successfully:', reminder);

    return NextResponse.json({ 
      success: true, 
      reminder,
      message: 'Reminder updated successfully'
    });

  } catch (error) {
    console.error('❌ Error in reminder update API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Get authenticated user
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get reminder ID from URL search params
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Reminder ID is required' }, { status: 400 });
    }

    // Create Supabase client with service role
    const supabase = createServiceRoleClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    console.log(`🗑️ Deleting reminder ${id} for user: ${userId}`);

    // Delete the reminder
    const { error: reminderError } = await supabase
      .from('reminders')
      .delete()
      .eq('id', id)
      .eq('user_id', userId); // Ensure user can only delete their own reminders

    if (reminderError) {
      console.error('❌ Error deleting reminder:', reminderError);
      return NextResponse.json({ 
        error: 'Failed to delete reminder',
        details: reminderError.message 
      }, { status: 500 });
    }

    console.log('✅ Reminder deleted successfully');

    return NextResponse.json({ 
      success: true, 
      message: 'Reminder deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error in reminder delete API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}