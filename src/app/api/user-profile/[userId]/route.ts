import { NextRequest, NextResponse } from 'next/server';
import { supabaseServerAdmin } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 });
    }

    if (!supabaseServerAdmin) {
      return NextResponse.json({
        success: false,
        error: 'Database not available'
      }, { status: 500 });
    }

    // Fetch only public profile information using service role
    const { data: profile, error } = await supabaseServerAdmin
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('clerk_user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user profile:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch user profile'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      profile: profile || { full_name: null, avatar_url: null }
    });

  } catch (error) {
    console.error('User profile API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
} 