import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { supabaseServerHelpers } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const { userId } = await auth();
    const user = await currentUser();
    
    if (!userId || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get current profile status
    const existingProfile = await supabaseServerHelpers.getCurrentUserProfile();
    
    // Ensure user profile exists (create if needed)
    const profileExists = await supabaseServerHelpers.ensureUserExists();
    
    if (!profileExists) {
      return NextResponse.json(
        { 
          error: 'Failed to create user profile',
          userId,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

    // Update profile with latest Clerk data
    const updateData = {
      email: user.emailAddresses?.[0]?.emailAddress || null,
      full_name: [user.firstName, user.lastName].filter(Boolean).join(' ') || null,
      avatar_url: user.imageUrl || null,
      onboarding_completed: user.publicMetadata?.onboardingComplete || false,
      year_of_study: user.publicMetadata?.yearOfStudy || null,
      subjects: Array.isArray(user.publicMetadata?.subjects) ? user.publicMetadata.subjects : [],
      interests: Array.isArray(user.publicMetadata?.interests) ? user.publicMetadata.interests : [],
      updated_at: new Date().toISOString(),
    };

    const updateSuccess = await supabaseServerHelpers.updateUserProfile(updateData);
    
    if (!updateSuccess) {
      return NextResponse.json(
        { 
          error: 'Failed to update profile data',
          userId,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

    // Get the updated profile
    const updatedProfile = await supabaseServerHelpers.getCurrentUserProfile();

    return NextResponse.json({
      success: true,
      message: 'Profile synchronized successfully',
      data: {
        userId,
        profileCreated: !existingProfile,
        profileUpdated: true,
        syncedFields: Object.keys(updateData),
        profile: {
          id: updatedProfile?.id,
          clerk_user_id: updatedProfile?.clerk_user_id,
          email: updatedProfile?.email,
          full_name: updatedProfile?.full_name,
          onboarding_completed: updatedProfile?.onboarding_completed,
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Profile sync error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error during profile sync',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 