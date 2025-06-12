'use server';

import { auth, currentUser } from '@clerk/nextjs/server';
import { supabaseServerHelpers } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface ActionResponse {
  success: boolean;
  error?: string;
  data?: any;
}

/**
 * Server action to ensure user profile exists in Supabase
 * This can be called from pages/components to sync existing Clerk users
 */
export async function ensureUserProfileAction(): Promise<ActionResponse> {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return {
        success: false,
        error: 'Not authenticated'
      };
    }

    // Use the enhanced server helper that gets full Clerk data
    const profile = await supabaseServerHelpers.getCurrentUserProfileWithCreation();
    
    if (!profile) {
      return {
        success: false,
        error: 'Failed to create or retrieve user profile'
      };
    }

    // Revalidate relevant paths
    revalidatePath('/dashboard');
    revalidatePath('/profile');

    return {
      success: true,
      data: {
        profileExists: true,
        profile: {
          id: profile.id,
          clerk_user_id: profile.clerk_user_id,
          onboarding_completed: profile.onboarding_completed
        }
      }
    };

  } catch (error) {
    console.error('Error in ensureUserProfileAction:', error);
    return {
      success: false,
      error: 'Failed to sync user profile'
    };
  }
}

/**
 * Server action to get complete user profile with auto-creation
 * Returns full profile data including Clerk info
 */
export async function getUserProfileAction(): Promise<ActionResponse> {
  try {
    const { userId } = await auth();
    const user = await currentUser();
    
    if (!userId || !user) {
      return {
        success: false,
        error: 'Not authenticated'
      };
    }

    // Ensure profile exists and get it
    const profile = await supabaseServerHelpers.getCurrentUserProfileWithCreation();
    
    if (!profile) {
      return {
        success: false,
        error: 'Failed to create or retrieve user profile'
      };
    }

    // Combine Supabase profile with Clerk data
    const completeProfile = {
      ...profile,
      // Add Clerk data that might not be in Supabase yet
      clerk_email: user.emailAddresses?.[0]?.emailAddress,
      clerk_name: [user.firstName, user.lastName].filter(Boolean).join(' '),
      clerk_avatar: user.imageUrl,
      clerk_created_at: user.createdAt,
      clerk_updated_at: user.updatedAt,
    };

    return {
      success: true,
      data: completeProfile
    };

  } catch (error) {
    console.error('Error in getUserProfileAction:', error);
    return {
      success: false,
      error: 'Failed to get user profile'
    };
  }
}

/**
 * Server action to sync Clerk data to Supabase profile
 * This updates the Supabase profile with latest Clerk information
 */
export async function syncUserProfileAction(): Promise<ActionResponse> {
  try {
    const { userId } = await auth();
    const user = await currentUser();
    
    if (!userId || !user) {
      return {
        success: false,
        error: 'Not authenticated'
      };
    }

    // Ensure profile exists first
    await supabaseServerHelpers.ensureUserExists();
    
    // Now update it with latest Clerk data using a proper update method
    const result = await supabaseServerHelpers.updateUserProfile({
      email: user.emailAddresses?.[0]?.emailAddress || null,
      full_name: [user.firstName, user.lastName].filter(Boolean).join(' ') || null,
      avatar_url: user.imageUrl || null,
      // Sync onboarding status from Clerk metadata if available
      onboarding_completed: user.publicMetadata?.onboardingComplete || false,
      // Sync other metadata if available
      year_of_study: user.publicMetadata?.yearOfStudy || null,
      subjects: Array.isArray(user.publicMetadata?.subjects) ? user.publicMetadata.subjects : [],
      interests: Array.isArray(user.publicMetadata?.interests) ? user.publicMetadata.interests : [],
      updated_at: new Date().toISOString(),
    });

    if (!result) {
      return {
        success: false,
        error: 'Failed to update profile in database'
      };
    }
    
    revalidatePath('/profile');
    revalidatePath('/dashboard');

    return {
      success: true,
      data: { 
        updated: true,
        syncedFields: ['email', 'full_name', 'avatar_url', 'onboarding_completed']
      }
    };

  } catch (error) {
    console.error('Error in syncUserProfileAction:', error);
    return {
      success: false,
      error: 'Failed to sync user profile'
    };
  }
} 