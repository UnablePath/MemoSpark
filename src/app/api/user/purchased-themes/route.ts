import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseServerAdmin } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!supabaseServerAdmin) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Get user's purchased themes
    const { data: purchasedThemes, error } = await supabaseServerAdmin
      .from('user_purchased_themes')
      .select('theme_id, purchased_at, price_paid, metadata')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching purchased themes:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch purchased themes' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      themes: purchasedThemes || []
    });

  } catch (error) {
    console.error('Error in purchased-themes API:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 