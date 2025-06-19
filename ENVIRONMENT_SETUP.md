# Environment Variables Setup

## Required Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://onfnehxkglmvrorcvqcx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uZm5laHhrZ2xtdnJvcmN2cXgiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTczMjk4NjY4NywiZXhwIjoyMDQ4NTYyNjg3fQ.xMl3vQ4YNK5PdPOC3zRq8n_7QihlRPc1BXMg7C6PGi4

# Clerk Configuration
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key_here

# OneSignal Configuration  
NEXT_PUBLIC_ONESIGNAL_APP_ID=your_onesignal_app_id_here
NEXT_PUBLIC_ONESIGNAL_SAFARI_WEB_ID=your_safari_web_id_here

# Development
NODE_ENV=development
```

## Current Status

✅ **Fixed: Supabase client now has fallback values for development**

The Supabase client has been updated to include fallback values when environment variables are not set. This should resolve the following errors:

- `Error: supabaseUrl is required`
- `Error: process is not defined`
- Database constraint errors in subscription management

## Issues Resolved

1. **Client-side environment access**: Fixed by adding proper environment checks
2. **Missing Supabase configuration**: Added fallback values for development
3. **React Strict Mode double execution**: Implemented flag-based prevention system
4. **Database constraint errors**: Fixed upsert logic in SubscriptionTierManager

## Next Steps

1. Set up your actual environment variables in `.env.local`
2. Test the subscription page at `/settings/subscription`
3. Verify OneSignal integration is working
4. Check that billing portal loads without errors

## Notes

- The fallback values are for development only
- For production, always use proper environment variables
- Never commit `.env.local` to version control 