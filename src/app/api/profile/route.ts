import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseServerAdmin } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Not authenticated'
      }, { status: 401 });
    }

    if (!supabaseServerAdmin) {
      return NextResponse.json({
        success: false,
        error: 'Database not available'
      }, { status: 500 });
    }

    // Fetch profile using service role (bypasses RLS)
    const { data: profile, error } = await supabaseServerAdmin
      .from('profiles')
      .select('*')
      .eq('clerk_user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch profile'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      profile
    });

  } catch (error) {
    console.error('Profile API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Not authenticated'
      }, { status: 401 });
    }

    if (!supabaseServerAdmin) {
      return NextResponse.json({
        success: false,
        error: 'Database not available'
      }, { status: 500 });
    }

    const updates = await request.json();

    // Update profile using service role (bypasses RLS)
    const { data: profile, error } = await supabaseServerAdmin
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('clerk_user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to update profile'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      profile
    });

  } catch (error) {
    console.error('Profile update API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
} 