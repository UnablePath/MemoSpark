import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import type { User } from '@clerk/nextjs/server';

// This endpoint helps identify users who exist in Clerk but not in Supabase
// Useful for monitoring webhook issues and data sync problems
export async function GET(request: NextRequest) {
  try {
    // Basic authentication check (in production, add proper admin role check)
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get all users from Clerk
    const client = await clerkClient();
    const clerkUsersResponse = await client.users.getUserList({
      limit: 100, // Adjust as needed
    });
    const clerkUsers: User[] = clerkUsersResponse.data;

    // Get all profiles from Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('clerk_user_id, email, full_name');

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch profiles from Supabase', details: error },
        { status: 500 }
      );
    }

    // Create sets for comparison
    const clerkUserIds = new Set(clerkUsers.map((user: User) => user.id));
    const supabaseUserIds = new Set(profiles?.map(profile => profile.clerk_user_id) || []);

    // Find orphaned users (in Clerk but not in Supabase)
    const orphanedUsers = clerkUsers.filter((user: User) => !supabaseUserIds.has(user.id)).map((user: User) => ({
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress,
      name: [user.firstName, user.lastName].filter(Boolean).join(' '),
      createdAt: user.createdAt,
      onboardingComplete: (user.publicMetadata as any)?.onboardingComplete || false
    }));

    // Find profiles without Clerk users (shouldn't happen but good to check)
    const profilesWithoutClerk = profiles?.filter(profile => 
      profile.clerk_user_id && !clerkUserIds.has(profile.clerk_user_id)
    ) || [];

    return NextResponse.json({
      success: true,
      stats: {
        totalClerkUsers: clerkUsers.length,
        totalSupabaseProfiles: profiles?.length || 0,
        orphanedUsers: orphanedUsers.length,
        profilesWithoutClerk: profilesWithoutClerk.length
      },
      orphanedUsers,
      profilesWithoutClerk,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error checking orphaned users:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 