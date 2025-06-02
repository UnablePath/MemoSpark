# StudySpark Webapp Development Guidelines

## Project Overview

StudySpark is a study-focused web application built with Next.js 15+ app router, TypeScript, Tailwind CSS, and Clerk authentication. The application features gamification, task management, and collaborative learning tools.

**Technology Stack:**
- Next.js 15+ with app router pattern
- TypeScript for type safety
- Tailwind CSS with custom design tokens
- Clerk for authentication
- Radix UI for component primitives
- Class Variance Authority (CVA) for component variants
- Framer Motion for animations
- Bun as package manager
- Biome for linting/formatting (NOT ESLint/Prettier)

## Project Architecture

### Directory Structure Rules

#### App Router Organization
- **MUST use `src/app/` directory** for all routes
- **MUST create `page.tsx`** for each route endpoint
- **MUST create `layout.tsx`** for shared layouts
- **MUST use `loading.tsx`** for loading states
- **MUST use `error.tsx`** for error boundaries
- **Authentication routes MUST follow** Clerk's catch-all pattern: `[[...sign-in]]/page.tsx`

#### Component Organization
- **MUST organize components** by feature in `src/components/[feature]/`
- **MUST place reusable UI primitives** in `src/components/ui/`
- **MUST place context providers** in `src/components/providers/`
- **MUST use feature-based grouping**: dashboard/, tasks/, gamification/, profile/, settings/, etc.

#### Utility Organization
- **MUST place custom hooks** in `src/hooks/`
- **MUST place utilities** in `src/lib/`
- **MUST place context files** in `src/lib/`

### File Naming Conventions

#### Components
- **MUST use PascalCase** for component files: `UserProfile.tsx`
- **MUST use PascalCase** for component exports: `export const UserProfile`
- **MUST use kebab-case** for page routes: `/user-profile`

#### Other Files
- **MUST use camelCase** for utility files: `userUtils.ts`
- **MUST use kebab-case** for CSS modules: `component.module.css`
- **MUST use SCREAMING_SNAKE_CASE** for constants: `API_BASE_URL`

## Code Standards

### TypeScript Rules

#### Interface Definitions
- **MUST define interfaces** for all component props
- **MUST place interfaces** directly above component definition
- **MUST use `interface` over `type`** for object shapes
- **MUST export interfaces** when used across files

```typescript
interface UserProfileProps {
  userId: string;
  showActions?: boolean;
}

export const UserProfile: React.FC<UserProfileProps> = ({ userId, showActions = true }) => {
  // Component implementation
};
```

#### Import Organization
- **MUST organize imports** in this exact order:
  1. React and React-related imports
  2. Third-party library imports
  3. Internal components and utilities
  4. Type-only imports with `type` keyword
  5. Assets and styles

```typescript
import React, { useState, useEffect } from 'react';
import { NextPage } from 'next';
import { clsx } from 'clsx';
import { Button } from '@/components/ui/button';
import { getUserData } from '@/lib/api';
import type { User } from '@/types/user';
```

### Component Architecture

#### Hook Usage
- **MUST call all hooks** at the top level before any conditional logic
- **MUST NOT call hooks** inside loops, conditions, or nested functions
- **MUST use custom hooks** for complex state logic

#### Component Structure
```typescript
export const ComponentName: React.FC<ComponentProps> = ({ prop1, prop2 }) => {
  // 1. All hooks at top level
  const [state, setState] = useState();
  const { data, loading } = useCustomHook();
  
  // 2. Event handlers and computed values
  const handleClick = () => { /* logic */ };
  const computedValue = useMemo(() => { /* computation */ }, [dependencies]);
  
  // 3. Effects
  useEffect(() => { /* effect logic */ }, [dependencies]);
  
  // 4. Conditional early returns
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage />;
  
  // 5. Main render
  return (
    <div className="tailwind-classes">
      {/* JSX content */}
    </div>
  );
};
```

## Styling Guidelines

### Tailwind CSS Rules

#### Brand Colors
- **MUST use StudySpark brand colors:**
  - Primary Green: `hsl(142, 60%, 40%)`
  - Hover Green: `hsl(142, 60%, 35%)`
  - Background: `hsl(0, 0%, 100%)`
  - Input Background: `hsl(0, 0%, 98%)`
  - Border: `hsl(40, 30%, 80%)`

#### Class Usage
- **MUST prefer utility classes** over custom CSS
- **MUST use `clsx` or `cn` utility** for conditional classes
- **MUST use CVA** for component variants

```typescript
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-[hsl(142,60%,40%)] text-white hover:bg-[hsl(142,60%,35%)]",
        secondary: "bg-[hsl(0,0%,98%)] text-[hsl(0,0%,10%)] hover:bg-[hsl(40,30%,85%)]",
      },
      size: {
        default: "h-9 px-4 py-2",
        lg: "h-11 px-8",
      },
    },
  }
);
```

#### Prohibited Styling Practices
- **NEVER use `@apply`** directive
- **NEVER use arbitrary values** (`[color:#123456]`) except for brand colors
- **NEVER use inline styles** unless absolutely necessary
- **NEVER modify global CSS** without updating `src/app/globals.css`

## Authentication Integration

### Clerk Provider Rules

#### Provider Setup
- **MUST wrap entire app** with `ClerkProvider` in `src/app/layout.tsx`
- **MUST use custom appearance** configuration matching StudySpark brand
- **MUST maintain existing appearance object** when modifying Clerk styling

#### Authentication Pages
- **MUST use catch-all routes** for Clerk pages: `[[...sign-in]]/page.tsx`
- **MUST place auth pages** in `src/app/sign-in/` and `src/app/sign-up/`
- **MUST NOT modify** Clerk's routing patterns

#### Custom Styling
- **MUST maintain HSL color consistency** across all Clerk components
- **MUST use existing border radius** (0.75rem for cards, 0.5rem for inputs)
- **MUST preserve shadow styling** for consistency

### User Context
- **MUST use existing UserProvider** from `@/lib/user-context`
- **MUST wrap UserProvider** inside ThemeProvider
- **MUST NOT create duplicate** user state management

## Component Development Patterns

### UI Components

#### Radix UI Integration
- **MUST use Radix UI primitives** for complex components
- **MUST style with Tailwind classes** following brand guidelines
- **MUST export compound components** when using Radix primitives

#### Component Composition
- **MUST prefer composition** over inheritance
- **MUST use forwardRef** for components that need ref access
- **MUST implement proper TypeScript** for component props

### Feature Components

#### Dashboard Components
- **MUST place in** `src/components/dashboard/`
- **MUST follow dashboard layout** patterns from existing components
- **MUST integrate with** gamification system when applicable

#### Task Management
- **MUST place in** `src/components/tasks/`
- **MUST integrate with** existing task state management
- **MUST follow task UI** patterns for consistency

#### Gamification Features
- **MUST place in** `src/components/gamification/`
- **MUST use canvas-confetti** for celebration effects
- **MUST maintain existing** progress tracking patterns

## State Management

### Provider Pattern
- **MUST use Context API** for shared state
- **MUST place providers** in `src/components/providers/`
- **MUST follow existing provider** wrapping order in layout.tsx

### Form Handling
- **MUST use React Hook Form** for complex forms
- **MUST validate on both** client and server
- **MUST implement proper** error handling and loading states

## Build and Development

### Package Management
- **MUST use Bun** as package manager
- **MUST run commands** with `bunx` prefix
- **MUST NOT use npm or yarn** commands

### Development Commands
- **Development:** `bun dev` (uses Turbopack)
- **Build:** `bun run build`
- **Linting:** `bun run lint` (uses Biome)
- **Formatting:** `bun run format` (uses Biome)

### Code Quality
- **MUST use Biome** for linting and formatting
- **MUST NOT configure** ESLint or Prettier
- **MUST run TypeScript** check with linting: `bunx tsc --noEmit`

## Multi-File Coordination Rules

### Layout Modifications
- **When modifying `src/app/layout.tsx`:**
  - **MUST preserve** ClerkProvider appearance configuration
  - **MUST maintain** provider wrapping order
  - **MUST update** metadata for StudySpark branding

### Theme Changes
- **When modifying theme system:**
  - **MUST update** `src/components/providers/theme-provider.tsx`
  - **MUST maintain** Clerk appearance consistency
  - **MUST update** CSS custom properties if needed

### Component Dependencies
- **When adding new UI components:**
  - **MUST check** if Radix UI primitive exists
  - **MUST create** in `src/components/ui/` if reusable
  - **MUST export** from appropriate index file

### Authentication Flow
- **When modifying auth-related components:**
  - **MUST test** both sign-in and sign-up flows
  - **MUST verify** Clerk appearance consistency
  - **MUST update** user context if needed

## Prohibited Actions

### File Organization
- **NEVER create** components outside feature directories
- **NEVER place** business logic in layout components
- **NEVER mix** UI primitives with feature components

### Styling
- **NEVER override** StudySpark brand colors
- **NEVER use** CSS-in-JS libraries
- **NEVER create** custom CSS files without coordination

### Dependencies
- **NEVER add** ESLint or Prettier to project
- **NEVER install** duplicate UI libraries (if Radix exists)
- **NEVER replace** Bun with npm/yarn

### Authentication
- **NEVER bypass** Clerk authentication
- **NEVER create** custom auth components
- **NEVER modify** Clerk's core behavior

### Performance
- **NEVER import** entire icon libraries
- **NEVER create** large bundle sizes
- **NEVER skip** loading and error states

## AI Decision-Making Standards

### When Adding Features
1. **Check existing patterns** in similar feature directories
2. **Verify Radix UI availability** before creating custom components
3. **Maintain brand consistency** with existing color scheme
4. **Follow established** file naming and organization

### When Debugging
1. **Check Biome output** first for linting errors
2. **Verify TypeScript** compilation
3. **Test authentication flow** if auth-related
4. **Validate Tailwind classes** are properly applied

### When Refactoring
1. **Preserve existing API** for components
2. **Maintain file organization** structure
3. **Keep provider wrapping** order intact
4. **Update related components** simultaneously

### Priority Order for Decisions
1. **User experience** and accessibility
2. **Brand consistency** and design system
3. **TypeScript safety** and error handling
4. **Performance** and bundle optimization
5. **Code maintainability** and patterns 

**AI Agent Operation Manual - Project-Specific Rules**

## Critical Integration Rules

### Clerk + Supabase Profile Synchronization

- **MANDATORY**: When updating user profiles, ALWAYS update both Supabase `profiles` table AND Clerk `publicMetadata`
- **Profile Creation Pattern**: 
  - Webhooks create profiles in Supabase with `onboarding_completed = false`
  - Onboarding completion MUST set both `profiles.onboarding_completed = true` AND `publicMetadata.onboardingComplete = true`
- **Primary Key Consistency**: Always use `clerk_user_id` as the primary key in Supabase profiles table
- **PROHIBITED**: Never update only one system without updating the other - this breaks middleware functionality

### Row Level Security (RLS) Patterns

- **User Access Pattern**: `(auth.jwt() ->> 'sub') = clerk_user_id`
- **Service Role Operations**: Use `SUPABASE_SERVICE_ROLE_KEY` for Edge Functions and webhooks
- **Client Operations**: Use `NEXT_PUBLIC_SUPABASE_ANON_KEY` for browser-based operations
- **PROHIBITED**: Never bypass RLS policies or create queries that don't filter by user ownership

### AI Pattern Engine Integration

- **Type Consistency**: ALWAYS use interfaces from `src/types/ai.ts` - never create inline types
- **Required Interfaces**: `ExtendedTask`, `UserAIPreferences`, `TimetableEntry`, `PatternData`, `AISuggestion`
- **Pattern Engine Location**: All AI logic MUST be in `src/lib/ai/patternEngine.ts`
- **PROHIBITED**: Never create AI-related types outside of `src/types/ai.ts`

## Database Schema Management

### Schema Modification Workflow

- **Step 1**: Update Supabase database schema via MCP or SQL migrations
- **Step 2**: Update corresponding TypeScript interfaces in `src/types/`
- **Step 3**: Update RLS policies if adding user-related tables
- **Step 4**: Test with actual user JWT tokens
- **PROHIBITED**: Never modify database schema without updating TypeScript types

### Table Relationship Rules

- **User References**: Use `clerk_user_id TEXT` for Clerk-integrated tables, `user_id UUID` for legacy tables
- **Foreign Keys**: Always reference the correct user identifier type
- **AI Tables**: All AI-related tables must support both authenticated and anonymous users via `is_anonymous` flags

## Component Development Standards

### UI Component Patterns

- **shadcn/ui Integration**: ALWAYS use existing shadcn/ui components before creating custom ones
- **Component Creation**: When adding new shadcn/ui components, update `components.json`
- **Styling**: Use Tailwind CSS classes, avoid custom CSS unless absolutely necessary
- **Client vs Server**: Mark interactive components with `'use client'`, keep data-fetching components as Server Components

### Form Handling Patterns

- **Server Actions**: ALWAYS use Server Actions for form submissions that modify database
- **Validation**: Use Zod schemas for all form validation
- **Error Handling**: Return structured response objects: `{ success: boolean, error?: string, data?: any }`
- **PROHIBITED**: Never use client-side only form submissions for database modifications

## Authentication & Authorization

### Clerk Integration Patterns

- **User ID Extraction**: Use `auth().userId` in Server Components/Actions
- **Client-Side Auth**: Use `useUser()` hook for client components
- **Metadata Updates**: ALWAYS use `clerkClient.users.updateUserMetadata()` for profile changes
- **PROHIBITED**: Never assume user is authenticated without checking `auth().userId`

### Middleware Configuration

- **Onboarding Redirect**: Middleware checks `publicMetadata.onboardingComplete`
- **Protected Routes**: All `/dashboard/*` routes require authentication
- **Public Routes**: `/`, `/about`, `/contact`, `/sign-in`, `/sign-up` are public
- **PROHIBITED**: Never modify middleware without updating corresponding metadata patterns

## Environment Variables Management

### Variable Naming Patterns

- **Client-Side**: `NEXT_PUBLIC_` prefix for browser-accessible variables
- **Server-Only**: No prefix for server-only variables (API keys, secrets)
- **Required Variables**:
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - `CLERK_SECRET_KEY`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `CLERK_WEBHOOK_SIGNING_SECRET`

### Edge Function Variables

- **Supabase Edge Functions**: Use `Deno.env.get()` to access environment variables
- **Required for Webhooks**: `CLERK_WEBHOOK_SIGNING_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- **PROHIBITED**: Never hardcode API keys or use client-side variables in server-only contexts

## AI Feature Development

### Pattern Recognition Engine

- **Input Validation**: ALWAYS validate inputs match `ExtendedTask[]` format before processing
- **Timetable Integration**: Use dual storage (Supabase + localStorage) with fallback patterns
- **Error Handling**: Implement graceful degradation when AI features fail
- **PROHIBITED**: Never assume AI services are always available

### Embedding and Vector Operations

- **Vector Storage**: Use Supabase `ai_embeddings` table with proper user association
- **Collaborative Insights**: Store in `ai_collaborative_insights` table with expiration dates
- **Anonymous Support**: All AI features must work for both authenticated and anonymous users

## File Structure Requirements

### Directory Organization

- **Components**: `/src/components/[feature]/` - group by feature, not by type
- **Server Actions**: `_actions.ts` files in route directories
- **Types**: All TypeScript interfaces in `/src/types/`
- **Utils**: Feature-specific utilities in `/src/lib/[feature]/`
- **PROHIBITED**: Never mix Server Actions with Client Components in the same file

### Import Patterns

- **React Imports**: React, then Next.js, then third-party, then internal
- **Type Imports**: Use `import type { }` for type-only imports
- **Client Components**: Import hooks only in client components
- **PROHIBITED**: Never import server-only modules in client components

## Testing and Deployment

### Edge Function Deployment

- **Manual Deployment**: Use Supabase Dashboard for Edge Function deployment
- **Environment Setup**: Ensure all required environment variables are set in Supabase project
- **Webhook Testing**: Test with actual Clerk webhooks, not just local simulation
- **PROHIBITED**: Never deploy Edge Functions without proper error handling and logging

### Database Migration Testing

- **RLS Testing**: Test with actual JWT tokens from different users
- **Policy Verification**: Ensure users can only access their own data
- **Service Role Testing**: Verify Edge Functions can perform necessary operations

## Prohibited Actions

### Critical Failures to Avoid

- **NEVER** update Supabase profiles without updating Clerk metadata
- **NEVER** create database queries that bypass RLS policies
- **NEVER** use inline types for AI-related functionality
- **NEVER** hardcode user IDs or API keys
- **NEVER** deploy code without testing authentication flows
- **NEVER** modify database schema without updating TypeScript types
- **NEVER** create client-side only database modifications
- **NEVER** assume AI services are always available

### Data Consistency Rules

- **NEVER** allow profile data to be inconsistent between Clerk and Supabase
- **NEVER** create user-related data without proper user association
- **NEVER** skip validation when handling external webhook data
- **NEVER** expose sensitive data through RLS policy gaps

## Decision-Making Priorities

### When in Doubt

1. **Security First**: Always choose the more secure approach
2. **Type Safety**: Prefer compile-time errors over runtime errors
3. **User Experience**: Maintain functionality even when AI features fail
4. **Data Consistency**: Ensure Clerk and Supabase remain synchronized
5. **Performance**: Choose patterns that scale with user growth

### Conflict Resolution

- **Client vs Server**: Prefer Server Components for data operations
- **Database vs Local Storage**: Use database for persistent data, local storage for user preferences
- **Manual vs Automatic**: Prefer automatic solutions with manual fallbacks
- **TypeScript vs JavaScript**: Always use TypeScript with strict type checking 