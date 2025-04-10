# StudySpark Development Roadmap

This document outlines the plan for implementing additional features to transform StudySpark into a full-featured production application, specifically focusing on the following key areas:

1. **Supabase Integration for Data Storage**
2. **Authentication with Supabase**
3. **Mobile Widget Implementation with expo-apple-targets**
4. **Enhanced Accessibility Features**
5. **Vercel Deployment Configuration**

## 1. Supabase Integration

### Setup & Configuration

- [ ] Create a Supabase project at [supabase.com](https://supabase.com)
- [ ] Install the Supabase client: `bun add @supabase/supabase-js`
- [ ] Configure environment variables:
  ```
  NEXT_PUBLIC_SUPABASE_URL=your-project-url
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
  ```

### Database Schema Design

Create the following tables in Supabase:

#### Users Table
```sql
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
```

#### Tasks Table
```sql
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
```

#### Connections Table
```sql
CREATE TABLE connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  connected_user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  status TEXT CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, connected_user_id)
);
```

#### Messages Table
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Streaks Table
```sql
CREATE TABLE streaks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  last_completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Achievements Table
```sql
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
```

#### Settings Table
```sql
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  theme TEXT DEFAULT 'light',
  high_contrast BOOLEAN DEFAULT FALSE,
  reduced_motion BOOLEAN DEFAULT FALSE,
  font_size TEXT DEFAULT 'medium',
  notifications JSON,
  accessibility JSON,
  privacy JSON,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Implementation Steps

- [ ] Create a Supabase client utility:
  ```typescript
  // src/lib/supabase.ts
  import { createClient } from '@supabase/supabase-js';

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  export const supabase = createClient(supabaseUrl, supabaseAnonKey);
  ```

- [ ] Create API handlers and React Query hooks for data fetching
- [ ] Update UI components to use real data from Supabase
- [ ] Implement real-time subscriptions for messages and notifications

## 2. Authentication with Supabase

### Implementation Steps

- [ ] Configure Supabase Auth with Magic Link and OAuth providers:
  - Google
  - Microsoft (for educational institutions)

- [ ] Create auth context provider:
  ```typescript
  // src/contexts/AuthContext.tsx
  import { createContext, useContext, useEffect, useState } from 'react';
  import { supabase } from '@/lib/supabase';
  import { User } from '@supabase/supabase-js';

  interface AuthContextType {
    user: User | null;
    loading: boolean;
    signIn: (email: string) => Promise<void>;
    signOut: () => Promise<void>;
  }

  const AuthContext = createContext<AuthContextType>({} as AuthContextType);

  export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      // Check active sessions and set the user
      const session = supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);

      // Listen for changes on auth state
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          setUser(session?.user ?? null);
          setLoading(false);
        }
      );

      return () => {
        subscription.unsubscribe();
      };
    }, []);

    const signIn = async (email: string) => {
      try {
        const { error } = await supabase.auth.signInWithOtp({ email });
        if (error) throw error;
      } catch (error) {
        console.error('Error signing in:', error);
        throw error;
      }
    };

    const signOut = async () => {
      try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      } catch (error) {
        console.error('Error signing out:', error);
        throw error;
      }
    };

    return (
      <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
        {children}
      </AuthContext.Provider>
    );
  };

  export const useAuth = () => useContext(AuthContext);
  ```

- [ ] Implement protected routes and authentication flow
- [ ] Create sign-in and sign-up pages
- [ ] Implement email verification
- [ ] Update onboarding flow to create user profile after authentication

## 3. Mobile Widget Implementation

### Setup & Configuration

- [ ] Create Expo project for the mobile application:
  ```bash
  npx create-expo-app@latest studyspark-mobile -t blank-typescript
  ```

- [ ] Install expo-apple-targets:
  ```bash
  cd studyspark-mobile && npx expo install expo-apple-targets
  ```

- [ ] Configure iOS project files to support widget extensions
- [ ] Set up API access between widget and main app

### Widget Implementation

- [ ] Create a WidgetKit extension:
  ```typescript
  // In your widget extension entry file
  import { WidgetFamily } from 'expo-apple-targets/widget';

  export function getWidgetTimeline() {
    return {
      entries: [
        {
          date: new Date(),
          relevance: 1,
          // Widget content for each size
          widgetFamily: {
            [WidgetFamily.SMALL]: {
              // Small widget view
              kind: 'small',
              priority: 'high',
              taskTitle: 'Math Assignment',
              dueDate: new Date().toISOString(),
            },
            [WidgetFamily.MEDIUM]: {
              // Medium widget view
              kind: 'medium',
              tasks: [
                {
                  title: 'Math Assignment',
                  dueDate: new Date().toISOString(),
                  priority: 'high',
                },
                {
                  title: 'Study Group',
                  dueDate: new Date().toISOString(),
                  priority: 'medium',
                },
              ],
            },
          },
        },
      ],
      // Refresh interval in minutes
      reloadInterval: 60,
    };
  }
  ```

- [ ] Create widget UI components using React Native
- [ ] Implement widget configuration for different sizes (small, medium, large)
- [ ] Add deep linking from widget to specific areas of the main app

### Integration with Web App

- [ ] Share data between web and mobile apps using Supabase
- [ ] Ensure consistent experience between platforms
- [ ] Implement responsive design principles for widget view

## 4. Enhanced Accessibility Features

### High Contrast Mode

- [ ] Create a dedicated high contrast theme:
  ```typescript
  // src/lib/themes.ts
  export const highContrastTheme = {
    background: '#ffffff',
    foreground: '#000000',
    primary: '#008000', // Strong green
    secondary: '#d9b38c', // Strong beige
    border: '#000000',
    // ... other colors with high contrast ratios
  };
  ```

- [ ] Implement a theme provider that supports high-contrast switching
- [ ] Add contrast-specific styling for all UI components
- [ ] Create high-contrast variations of all icons and visual elements

### Screen Reader Support

- [ ] Audit all components for ARIA attributes:
  ```tsx
  // Example of enhanced button with ARIA
  <Button
    aria-label="Complete task"
    aria-pressed={isCompleted}
    onClick={handleComplete}
  >
    {isCompleted ? 'Completed' : 'Complete'}
  </Button>
  ```

- [ ] Add descriptive labels to all interactive elements
- [ ] Ensure focus management follows a logical tab order
- [ ] Implement skip links for keyboard navigation
- [ ] Add screen reader announcements for dynamic content changes
- [ ] Test all components with VoiceOver, NVDA, and JAWS

### Reduced Motion

- [ ] Create alternative animations for users with reduced motion preference:
  ```css
  @media (prefers-reduced-motion: reduce) {
    .animate-floating {
      animation: none;
    }
  }
  ```

- [ ] Implement motion reduction across all animated components
- [ ] Add options to completely disable non-essential animations
- [ ] Create simplified versions of any complex transitions

### Font Size Adjustment

- [ ] Implement scalable typography system:
  ```typescript
  // src/lib/typography.ts
  export const fontSizes = {
    small: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
    },
    medium: {
      xs: '0.875rem',
      sm: '1rem',
      base: '1.125rem',
      lg: '1.25rem',
      xl: '1.5rem',
      '2xl': '1.75rem',
    },
    large: {
      xs: '1rem',
      sm: '1.125rem',
      base: '1.25rem',
      lg: '1.5rem',
      xl: '1.75rem',
      '2xl': '2rem',
    },
  };
  ```

- [ ] Add UI controls for changing font size
- [ ] Ensure layouts adapt properly to font size changes
- [ ] Test readability across all screen sizes and devices

## 5. Vercel Deployment Configuration

### Setup & Configuration

- [ ] Create a `vercel.json` file:
  ```json
  {
    "version": 2,
    "buildCommand": "bun run build",
    "outputDirectory": ".next",
    "env": {
      "NEXT_PUBLIC_SUPABASE_URL": "@supabase_url",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase_anon_key"
    }
  }
  ```

- [ ] Configure Vercel environment variables for Supabase credentials
- [ ] Set up project for Vercel deployment:
  ```bash
  npm install -g vercel
  vercel login
  vercel link
  vercel env add NEXT_PUBLIC_SUPABASE_URL
  vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
  ```

### Continuous Integration/Deployment

- [ ] Set up GitHub Actions workflows for CI/CD:
  ```yaml
  # .github/workflows/main.yml
  name: CI/CD

  on:
    push:
      branches: [ main ]
    pull_request:
      branches: [ main ]

  jobs:
    build:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v3
        - uses: oven-sh/setup-bun@v1
          with:
            bun-version: latest
        - name: Install dependencies
          run: bun install
        - name: Run tests
          run: bun test
        - name: Build
          run: bun run build

    deploy:
      needs: build
      if: github.ref == 'refs/heads/main'
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v3
        - uses: amondnet/vercel-action@v20
          with:
            vercel-token: ${{ secrets.VERCEL_TOKEN }}
            vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
            vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
            vercel-args: '--prod'
  ```

### Performance Optimization

- [ ] Implement performance monitoring
- [ ] Set up analytics with Vercel Analytics
- [ ] Configure caching strategies
- [ ] Implement ISR (Incremental Static Regeneration) for frequently accessed pages
- [ ] Add error tracking

## Implementation Priority & Timeline

### Phase 1: Supabase Integration & Authentication (2 weeks)
- Set up Supabase project and database schema
- Implement authentication flow
- Update data models to work with Supabase

### Phase 2: Data Migration & API Updates (2 weeks)
- Migrate from mock data to Supabase
- Create data fetching hooks
- Implement real-time features

### Phase 3: Accessibility Enhancements (1 week)
- Implement high contrast mode
- Add screen reader support
- Create reduced motion alternatives
- Add font size adjustments

### Phase 4: Widget Implementation (2 weeks)
- Create Expo mobile project
- Set up widget extensions
- Implement widget UI and functionality
- Test on iOS and Android

### Phase 5: Vercel Deployment & Testing (1 week)
- Configure Vercel deployment
- Set up CI/CD pipelines
- Perform testing across devices
- Launch beta version

## Resources & Documentation

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js with Supabase Auth](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)
- [Expo Apple Targets Documentation](https://docs.expo.dev/versions/latest/sdk/apple-targets/)
- [WCAG 2.1 Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Vercel Deployment Documentation](https://vercel.com/docs)
- [React Query Documentation](https://tanstack.com/query/latest/docs/react/overview)

## Conclusion

This roadmap provides a structured approach to implementing the requested features for StudySpark. Each section includes specific tasks, code examples, and implementation details to guide the development process. The features are designed to work together to create a comprehensive, accessible, and user-friendly application deployed on Vercel with Supabase as the backend.
