# Setting Up Supabase for StudySpark

This guide provides step-by-step instructions for setting up Supabase as the backend for StudySpark.

## 1. Creating a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up or log in
2. Click "New Project"
3. Choose an organization or create a new one
4. Enter project details:
   - **Name**: StudySpark
   - **Database Password**: (create a secure password)
   - **Region**: (choose the region closest to your users)
5. Click "Create New Project" and wait for it to be created (this may take a few minutes)

## 2. Setting Up Database Tables

Once your project is set up, navigate to the SQL Editor in the Supabase dashboard. Use the following SQL scripts to create the necessary tables.

### Creating Tables

Copy and paste the following SQL into the SQL Editor and run it:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table (extends the auth.users table)
CREATE TABLE users (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  year_of_study TEXT,
  subjects TEXT[],
  interests TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks Table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMP WITH TIME ZONE,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')),
  type TEXT CHECK (type IN ('academic', 'personal')),
  subject TEXT,
  completed BOOLEAN DEFAULT FALSE,
  reminder BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Connections Table (for student networking)
CREATE TABLE connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  connected_user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  status TEXT CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, connected_user_id)
);

-- Messages Table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Streaks Table
CREATE TABLE streaks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  last_completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Achievements Table
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  unlocked BOOLEAN DEFAULT FALSE,
  progress INTEGER DEFAULT 0,
  total INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Settings Table
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  theme TEXT DEFAULT 'light',
  high_contrast BOOLEAN DEFAULT FALSE,
  reduced_motion BOOLEAN DEFAULT FALSE,
  font_size TEXT DEFAULT 'medium',
  notifications JSONB DEFAULT '{}',
  accessibility JSONB DEFAULT '{}',
  privacy JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 3. Setting Up Table Policies (Row-Level Security)

Supabase uses PostgreSQL's Row-Level Security (RLS) to control access to your data. Run the following SQL to set up appropriate security policies:

```sql
-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view their own profile"
ON users FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON users FOR UPDATE
USING (auth.uid() = id);

-- Tasks table policies
CREATE POLICY "Users can view their own tasks"
ON tasks FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks"
ON tasks FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
ON tasks FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks"
ON tasks FOR DELETE
USING (auth.uid() = user_id);

-- Connections table policies
CREATE POLICY "Users can view their own connections"
ON connections FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = connected_user_id);

CREATE POLICY "Users can insert connection requests"
ON connections FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update connection status"
ON connections FOR UPDATE
USING (auth.uid() = user_id OR auth.uid() = connected_user_id);

CREATE POLICY "Users can delete their own connections"
ON connections FOR DELETE
USING (auth.uid() = user_id);

-- Messages table policies
CREATE POLICY "Users can view their own messages"
ON messages FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send messages"
ON messages FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Recipients can mark messages as read"
ON messages FOR UPDATE
USING (auth.uid() = recipient_id);

-- Streaks table policies
CREATE POLICY "Users can view their own streaks"
ON streaks FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can update streaks"
ON streaks FOR ALL
USING (true);

-- Achievements table policies
CREATE POLICY "Users can view their own achievements"
ON achievements FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can update achievements"
ON achievements FOR ALL
USING (true);

-- Settings table policies
CREATE POLICY "Users can view their own settings"
ON settings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
ON settings FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "System can insert default settings"
ON settings FOR INSERT
WITH CHECK (true);
```

## 4. Setting Up Authentication

1. Navigate to the **Authentication** tab in the Supabase dashboard
2. Go to **Providers** and enable:
   - Email (with "Confirm email" enabled)
   - Google OAuth
   - Microsoft OAuth (if needed for educational institutions)

3. For Google OAuth:
   - Create a new OAuth app in [Google Cloud Console](https://console.cloud.google.com/)
   - Set the authorized redirect URI to `https://[YOUR_PROJECT_REF].supabase.co/auth/v1/callback`
   - Copy the Client ID and Client Secret to the Supabase settings

4. For Microsoft OAuth (optional):
   - Create a new OAuth app in [Microsoft Azure Portal](https://portal.azure.com/)
   - Set the redirect URI to `https://[YOUR_PROJECT_REF].supabase.co/auth/v1/callback`
   - Copy the Client ID and Client Secret to the Supabase settings

## 5. Setting Up Edge Functions (Optional)

For more complex operations, like streak calculations or notifications, you can use Supabase Edge Functions:

1. Install the Supabase CLI: `npm install -g supabase`
2. Login to Supabase: `supabase login`
3. Initialize Supabase in your project: `supabase init`
4. Create a new function: `supabase functions new calculate-streaks`
5. Add your TypeScript code to the function
6. Deploy the function: `supabase functions deploy calculate-streaks`

## 6. Getting API Keys

1. In the Supabase dashboard, go to **Project Settings** > **API**
2. Find the "Project URL" and "anon" public key
3. Add these to your application's environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 7. Setting Up Realtime

To enable real-time features for messaging and notifications:

1. Go to **Project Settings** > **Realtime**
2. Enable realtime for the tables you want to track (messages, tasks)
3. Set broadcast level to "Insert, Update, Delete"

## 8. Implementation in StudySpark

Add Supabase to your Next.js project:

```bash
bun add @supabase/supabase-js @supabase/auth-helpers-nextjs
```

Create a Supabase client:

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

## 9. Testing

After setting up Supabase, test your implementation by:

1. Creating a test user via the authentication flow
2. Creating, updating, and deleting tasks
3. Verifying that RLS policies are working correctly
4. Testing real-time updates in a multi-client scenario

## 10. Monitoring and Maintenance

Monitor your Supabase project:

1. Database usage (check **Project Settings** > **Usage**)
2. Auth statistics (check **Authentication** > **Users**)
3. Set up spending limits if needed

## Next Steps

- Create TypeScript interfaces for your database tables
- Set up database migrations for future schema changes
- Consider adding database indexes for performance on large tables
- Implement optimistic UI updates for better user experience

With these steps completed, your StudySpark application will be connected to a fully functional Supabase backend with authentication, real-time data, and proper security.
