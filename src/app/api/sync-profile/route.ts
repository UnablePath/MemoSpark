import { type NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { supabaseServerHelpers } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Not authenticated'
      }, { status: 401 });
    }

    // Get current Clerk user
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'No current user from Clerk'
      }, { status: 400 });
    }

    // Try to ensure user exists first
    const userExists = await supabaseServerHelpers.ensureUserExists();

    if (!userExists) {
      return NextResponse.json({
        success: false,
        error: 'Failed to ensure user profile exists'
      }, { status: 500 });
    }

    // Try to sync the profile data
    const syncResult = await supabaseServerHelpers.updateUserProfile({
      email: user.emailAddresses?.[0]?.emailAddress || null,
      full_name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.publicMetadata?.name as string || null,
      avatar_url: user.imageUrl || null,
      onboarding_completed: user.publicMetadata?.onboardingComplete === true,
      year_of_study: user.publicMetadata?.yearOfStudy as string || null,
      interests: Array.isArray(user.publicMetadata?.interests) ? user.publicMetadata.interests : [],
      subjects: Array.isArray(user.publicMetadata?.subjects) ? user.publicMetadata.subjects : [],
      bio: user.publicMetadata?.bio as string || null,
      updated_at: new Date().toISOString(),
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('[sync-profile]', {
        userId,
        onboardingComplete: user.publicMetadata?.onboardingComplete === true,
        syncOk: syncResult,
      });
    }

    // Get the final profile to return
    const profile = await supabaseServerHelpers.getCurrentUserProfile();

    return NextResponse.json({
      success: true,
      data: {
        profileCreated: !profile ? false : true,
        syncedFields: ['email', 'full_name', 'avatar_url', 'onboarding_completed', 'year_of_study', 'interests', 'subjects'],
        profile,
        metadata: user.publicMetadata
      }
    });

  } catch (error) {
    console.error('Profile sync API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 