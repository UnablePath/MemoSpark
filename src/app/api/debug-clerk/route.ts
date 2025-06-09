import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('=== CLERK DEBUG START ===');
    
    // 1. Check environment variables
    const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    const secretKey = process.env.CLERK_SECRET_KEY;
    
    console.log('Publishable Key exists:', !!publishableKey);
    console.log('Secret Key exists:', !!secretKey);
    console.log('Publishable Key prefix:', publishableKey?.substring(0, 15) + '...');
    console.log('Secret Key prefix:', secretKey?.substring(0, 15) + '...');
    
    // 2. Check current auth
    const { userId, getToken } = await auth();
    console.log('Current User ID:', userId);
    
    if (!userId) {
      return NextResponse.json({
        error: 'Not authenticated',
        env: {
          hasPublishableKey: !!publishableKey,
          hasSecretKey: !!secretKey,
          publishableKeyPrefix: publishableKey?.substring(0, 15),
        }
      }, { status: 401 });
    }
    
    // 3. Test Clerk client
    let clerkClientStatus = 'unknown';
    let userDetails = null;
    let clerkError = null;
    
    try {
      const client = await clerkClient();
      clerkClientStatus = 'created successfully';
      console.log('Clerk client created successfully');
      
      // Try to get user details
      userDetails = await client.users.getUser(userId);
      console.log('User details retrieved:', {
        id: userDetails.id,
        email: userDetails.emailAddresses[0]?.emailAddress,
        hasPublicMetadata: !!userDetails.publicMetadata
      });
    } catch (error: any) {
      clerkError = {
        message: error.message,
        status: error.status,
        clerkTraceId: error.clerkTraceId,
        errors: error.errors,
      };
      console.error('Clerk client error:', clerkError);
    }
    
    // 4. Test token generation
    let tokenStatus = 'unknown';
    let tokenError = null;
    
    try {
      const token = await getToken({ template: 'supabase-integration' });
      tokenStatus = token ? 'success' : 'no token returned';
      console.log('Token status:', tokenStatus);
    } catch (error: any) {
      tokenError = {
        message: error.message,
        status: error.status,
      };
      console.error('Token error:', tokenError);
    }
    
    console.log('=== CLERK DEBUG END ===');
    
    return NextResponse.json({
      success: true,
      debug: {
        environment: {
          hasPublishableKey: !!publishableKey,
          hasSecretKey: !!secretKey,
          publishableKeyPrefix: publishableKey?.substring(0, 15),
          secretKeyPrefix: secretKey?.substring(0, 15),
        },
        auth: {
          userId,
          isAuthenticated: !!userId,
        },
        clerkClient: {
          status: clerkClientStatus,
          error: clerkError,
        },
        userDetails: userDetails ? {
          id: userDetails.id,
          email: userDetails.emailAddresses[0]?.emailAddress,
          createdAt: userDetails.createdAt,
          publicMetadata: userDetails.publicMetadata,
        } : null,
        token: {
          status: tokenStatus,
          error: tokenError,
        },
      },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error: any) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
} 