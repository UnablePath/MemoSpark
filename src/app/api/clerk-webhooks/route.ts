import { type NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { createClient } from '@supabase/supabase-js';

interface ClerkUser {
  id: string;
  email_addresses: Array<{
    email_address: string;
    id: string;
  }>;
  first_name: string | null;
  last_name: string | null;
  profile_image_url: string | null;
  created_at: number;
  updated_at: number;
}

interface ClerkWebhookEvent {
  type: "user.created" | "user.updated" | "user.deleted";
  data: ClerkUser;
}

// CORS headers for webhook handling
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export async function OPTIONS() {
  return new NextResponse("ok", { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    // Detect environment for better logging
    const environment = process.env.NODE_ENV === 'production' 
      ? (req.url.includes('memospark.live') ? 'production' : 'preview')
      : 'development';
    
    console.log(`[${environment.toUpperCase()}] Processing webhook request`);

    // Get environment variables
    const CLERK_WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!CLERK_WEBHOOK_SECRET) {
      console.error(`[${environment.toUpperCase()}] Missing CLERK_WEBHOOK_SIGNING_SECRET environment variable`);
      return NextResponse.json(
        { error: "Missing webhook secret" },
        { status: 500, headers: corsHeaders }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error(`[${environment.toUpperCase()}] Missing Supabase configuration`);
      return NextResponse.json(
        { error: "Missing Supabase configuration" },
        { status: 500, headers: corsHeaders }
      );
    }

    // Initialize Supabase client with service role key
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get webhook headers for verification
    const svixId = req.headers.get("svix-id");
    const svixTimestamp = req.headers.get("svix-timestamp");
    const svixSignature = req.headers.get("svix-signature");

    if (!svixId || !svixTimestamp || !svixSignature) {
      console.error("Missing required Svix headers");
      return NextResponse.json(
        { error: "Missing required webhook headers" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Get the request body
    const body = await req.text();
    
    // Create Svix webhook instance for verification
    const wh = new Webhook(CLERK_WEBHOOK_SECRET);
    
    let event: ClerkWebhookEvent;
    
    try {
      // Verify the webhook signature
      event = wh.verify(body, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      }) as ClerkWebhookEvent;
    } catch (err) {
      console.error("Webhook verification failed:", err);
      return NextResponse.json(
        { error: "Webhook verification failed" },
        { status: 401, headers: corsHeaders }
      );
    }

    console.log(`[${environment.toUpperCase()}] Processing webhook event: ${event.type} for user: ${event.data.id}`);

    // Process the webhook event
    switch (event.type) {
      case "user.created":
        await handleUserCreated(supabase, event.data);
        break;
      case "user.updated":
        await handleUserUpdated(supabase, event.data);
        break;
      case "user.deleted":
        await handleUserDeleted(supabase, event.data);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json(
      { message: "Webhook processed successfully" },
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}

async function handleUserCreated(supabase: any, userData: ClerkUser) {
  try {
    const primaryEmail = userData.email_addresses?.[0]?.email_address;
    
    // Combine first_name and last_name into full_name
    const fullName = [userData.first_name, userData.last_name]
      .filter(Boolean)
      .join(' ') || null;
    
    // 1. Create user in the main 'users' table first (for foreign key references)
    const userData_users = {
      email: primaryEmail || null,
      full_name: fullName,
      year_of_study: null, // Will be filled during onboarding
      subjects: [],
      interests: [],
      created_at: new Date(userData.created_at).toISOString(),
      updated_at: new Date(userData.updated_at).toISOString(),
    };

    const { data: createdUser, error: userError } = await supabase
      .from("users")
      .insert(userData_users)
      .select()
      .single();

    if (userError) {
      console.error("Error creating user in users table:", userError);
      throw userError;
    }

    console.log("User created in users table:", createdUser);

    // 2. Create user profile in 'profiles' table (for Clerk integration)
    const profileData = {
      clerk_user_id: userData.id,
      email: primaryEmail || null,
      full_name: fullName,
      avatar_url: userData.profile_image_url,
      onboarding_completed: false,
      created_at: new Date(userData.created_at).toISOString(),
      updated_at: new Date(userData.updated_at).toISOString(),
    };

    const { data: createdProfile, error: profileError } = await supabase
      .from("profiles")
      .insert(profileData)
      .select();

    if (profileError) {
      console.error("Error creating profile:", profileError);
      // If profile creation fails, we should clean up the user record
      await supabase.from("users").delete().eq("id", createdUser.id);
      throw profileError;
    }

    console.log("Profile created successfully:", createdProfile);
    console.log("User created in both tables successfully");
  } catch (error) {
    console.error("Error in handleUserCreated:", error);
    throw error;
  }
}

async function handleUserUpdated(supabase: any, userData: ClerkUser) {
  try {
    const primaryEmail = userData.email_addresses?.[0]?.email_address;
    
    // Combine first_name and last_name into full_name
    const fullName = [userData.first_name, userData.last_name]
      .filter(Boolean)
      .join(' ') || null;
    
    const updateData = {
      email: primaryEmail || null,
      full_name: fullName,
      avatar_url: userData.profile_image_url,
      updated_at: new Date(userData.updated_at).toISOString(),
    };

    const { data, error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("clerk_user_id", userData.id)
      .select();

    if (error) {
      console.error("Error updating profile:", error);
      throw error;
    }

    console.log("Profile updated successfully:", data);
  } catch (error) {
    console.error("Error in handleUserUpdated:", error);
    throw error;
  }
}

async function handleUserDeleted(supabase: any, userData: ClerkUser) {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .delete()
      .eq("clerk_user_id", userData.id)
      .select();

    if (error) {
      console.error("Error deleting profile:", error);
      throw error;
    }

    console.log("Profile deleted successfully:", data);
  } catch (error) {
    console.error("Error in handleUserDeleted:", error);
    throw error;
  }
} 