# Database Fix for Reminders Tab Issues

## Issues Fixed

This migration (`005_fix_clerk_integration_and_add_leaderboard.sql`) addresses several critical database issues:

1. **User ID Type Mismatch**: Changed all `user_id` columns from UUID to TEXT to match Clerk user IDs
2. **Missing Leaderboard**: Created a leaderboard view that the frontend expects
3. **Broken RLS Policies**: Updated all Row Level Security policies to use Clerk authentication
4. **Foreign Key Constraints**: Fixed all foreign key relationships to use the profiles table

## To Apply the Migration

### Option 1: Supabase Cloud Dashboard
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the entire content of `supabase/migrations/005_fix_clerk_integration_and_add_leaderboard.sql`
4. Run the migration

### Option 2: Supabase CLI (if you have local setup)
```bash
# Reset and apply all migrations
npx supabase db reset

# Or apply just this migration
npx supabase db push
```

### Option 3: Manual Application
If using external database tools:
1. Connect to your Supabase PostgreSQL database
2. Execute the migration SQL file

## Verification

After applying the migration, test by:

1. **Reminders Tab**: Should load without UUID errors
2. **Gamification**: Leaderboard and achievements should display
3. **User Stats**: Should properly track user progress

## Expected Behavior Changes

- ✅ Reminders tab will load successfully
- ✅ Gamification features will work with Clerk user IDs
- ✅ All database queries will use consistent user identification
- ✅ Real-time subscriptions will function properly

## Rollback (if needed)

If issues occur, you can rollback by:
1. Reverting user_id columns back to UUID type
2. Restoring original foreign key constraints
3. Restoring original RLS policies

## Testing Commands

```sql
-- Test that reminders work with Clerk user ID
SELECT * FROM reminders LIMIT 5;

-- Test leaderboard view
SELECT * FROM leaderboard LIMIT 10;

-- Test user achievements relationship
SELECT ua.*, a.name FROM user_achievements ua 
JOIN achievements a ON ua.achievement_id = a.id 
LIMIT 5;
```

## Next Steps

1. Apply this migration to fix the immediate issues
2. Test the reminders tab functionality
3. Verify gamification features are working
4. Monitor for any additional database errors 