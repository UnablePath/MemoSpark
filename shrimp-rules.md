# StudySpark Development Rules

## Project Overview

StudySpark is a mobile-first AI-powered study companion built with Next.js 15 App Router, TypeScript, Tailwind CSS, Supabase database, and Clerk authentication. **CRITICAL REQUIREMENT**: Default dark mode with minimalist design that prevents UI clutter and content bleeding.

## Architecture Standards

### Directory Structure Rules
- `src/app/` - Next.js App Router pages (use `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`)
- `src/components/` - Reusable UI components organized by feature
- `src/lib/` - Utilities, API clients, and business logic
- `src/hooks/` - Custom React hooks
- **CRITICAL**: When modifying database functionality, coordinate between `src/lib/supabase/client.ts` and `src/lib/supabase/server.ts`

### Component Architecture
- **MANDATORY**: Use TypeScript interfaces for all props
- **MANDATORY**: Call all hooks at component top level before conditional logic
- **MANDATORY**: Use named exports primarily, default exports only for page components
- **PROHIBITED**: Prop drilling more than 2 levels - use Context API or state management

## Minimalist Design Principles

### Container Constraints (CRITICAL)
- **MANDATORY**: Prevent content bleeding off screen with `max-w-screen-sm mx-auto px-4`
- **MANDATORY**: Account for bottom tab bar with `pb-20` or `mb-20` on page containers
- **MANDATORY**: Use safe area handling with `pt-safe pb-safe` when needed
- **PROHIBITED**: Fixed heights that break on different screen sizes
- **PROHIBITED**: Horizontal scrolling except for intentional carousels

### Visual Hierarchy Rules
- **MANDATORY**: One primary action per screen (prominent button styling)
- **MANDATORY**: Secondary actions must use `variant="secondary"` or `variant="ghost"`
- **MANDATORY**: Use whitespace systematically - `space-y-4` for related items, `space-y-8` for sections
- **PROHIBITED**: More than 3 different font sizes on one screen
- **PROHIBITED**: More than 2 different button styles on one screen

### Mobile-First Responsive Design
- **MANDATORY**: Design for 320px width minimum
- **MANDATORY**: Use `text-sm` as default, `text-lg` for headings only
- **MANDATORY**: Touch targets minimum 44px (`h-11 min-h-11`)
- **PROHIBITED**: Hover-only interactions
- **PROHIBITED**: Small touch targets (`h-8` or smaller for interactive elements)

## Theme System Architecture

### Dark Mode Default
- **MANDATORY**: Default theme is `'dark'` in `src/components/providers/theme-provider.tsx`
- **MANDATORY**: All components must work in dark mode first
- **MANDATORY**: Test all UI changes in dark mode before light mode

### Multi-Theme Implementation
- **MANDATORY**: Use CSS custom properties in `src/app/globals.css` for theme colors
- **MANDATORY**: When adding new themes, update these files simultaneously:
  1. `src/app/globals.css` - Add CSS custom properties for new theme
  2. `src/components/settings/ThemeSettings.tsx` - Add theme option to UI
  3. `tailwind.config.ts` - Add theme colors if needed
- **REQUIRED THEMES**: `dark`, `light`, `amoled`, `sea-blue`, `hello-kitty-pink`, `hacker-green`
- **PROHIBITED**: Hardcoded color values - always use theme CSS custom properties

### Theme Color Patterns
```css
/* Example theme implementation in globals.css */
[data-theme="amoled"] {
  --background: 0 0% 0%;
  --foreground: 0 0% 100%;
  --primary: 0 0% 100%;
  --primary-foreground: 0 0% 0%;
}
```

## Supabase Connection Patterns (CRITICAL)

### Client vs Server Helper Usage
- **CRITICAL ERROR TO AVOID**: Never import server helpers in client components
- **MANDATORY**: Use `src/lib/supabase/client.ts` helpers ONLY in client components
- **MANDATORY**: Use `src/lib/supabase/server.ts` helpers ONLY in server components/actions
- **CRITICAL**: `getCurrentUserId()` exists ONLY in server helpers, not client helpers

### Database Operation Rules
- **MANDATORY**: Server Actions for mutations (create, update, delete)
- **MANDATORY**: Client-side helpers for data fetching in client components
- **PROHIBITED**: Calling `getCurrentUserId()` from client components
- **REQUIRED PATTERN**:
```typescript
// ✅ CORRECT - Server Action
'use server'
import { getCurrentUserId } from '@/lib/supabase/server'

// ✅ CORRECT - Client Component
'use client'
import { supabaseHelpers } from '@/lib/supabase/client'
```

### Database Connection Debugging
- **MANDATORY**: When task creation fails, first check import paths in `src/lib/supabase/tasksApi.ts`
- **MANDATORY**: Verify authentication flow by checking Clerk user ID matches Supabase user ID
- **MANDATORY**: Use Supabase MCP tools to verify database connectivity before code changes

## Navigation and UX Patterns

### Settings Page Navigation
- **MANDATORY**: Every settings page must have clear exit mechanism
- **MANDATORY**: Use back arrow icon in top-left with `router.back()` functionality
- **PROHIBITED**: Settings pages without navigation exit
- **REQUIRED PATTERN**:
```tsx
// Settings page header pattern
<div className="flex items-center justify-between mb-6">
  <Button variant="ghost" size="icon" onClick={() => router.back()}>
    <ArrowLeft className="h-4 w-4" />
  </Button>
  <h1 className="text-lg font-semibold">Settings</h1>
  <div className="w-10" /> {/* Spacer for centering */}
</div>
```

### Tab Navigation
- **MANDATORY**: Bottom tab bar must be fixed with `fixed bottom-0`
- **MANDATORY**: Page content must account for tab bar height with `pb-20`
- **PROHIBITED**: Content that overlaps with bottom tab bar
- **PROHIBITED**: Horizontal tab switching that breaks accessibility

## Component Performance Optimization

### Large Component Rules (>500 lines)
- **MANDATORY**: Use `React.memo()` for expensive re-renders
- **MANDATORY**: Use `useMemo()` for expensive calculations
- **MANDATORY**: Use `useCallback()` for event handlers passed to children
- **EXAMPLE**: `StudentConnectionTab.tsx` requires optimization patterns

### Loading States
- **MANDATORY**: Skeleton UI for data loading states
- **MANDATORY**: Error boundaries for async components
- **MANDATORY**: Progressive loading for large lists
- **PROHIBITED**: Blank screens during loading

## AI Integration Patterns

### AI Suggestions Integration
- **MANDATORY**: AI suggestions must integrate into `TaskEventHub.tsx` without breaking existing flow
- **MANDATORY**: Use `AITaskSuggestions.tsx` component as child of task input
- **MANDATORY**: AI suggestions should be contextual and dismissible
- **PROHIBITED**: AI suggestions that block primary task creation flow
- **REQUIRED PATTERN**:
```tsx
// TaskEventHub integration pattern
<div className="space-y-4">
  <TaskInput {...taskInputProps} />
  <AITaskSuggestions 
    currentInput={taskInput}
    onSuggestionSelect={handleSuggestionSelect}
    className="border-t pt-4"
  />
</div>
```

### AI Component Performance
- **MANDATORY**: Debounce AI API calls by 500ms minimum
- **MANDATORY**: Cache AI suggestions to prevent redundant calls
- **MANDATORY**: Show loading indicators for AI processing
- **PROHIBITED**: AI calls on every keystroke

## Error Prevention Rules

### Pre-Implementation Checks
- **MANDATORY**: Before modifying database code, verify client vs server helper usage
- **MANDATORY**: Before theme changes, test in all theme variants
- **MANDATORY**: Before UI changes, test mobile responsiveness and container constraints
- **MANDATORY**: Before navigation changes, verify all exit mechanisms work

### File Coordination Requirements
- **CRITICAL**: When modifying themes, update ALL theme files simultaneously:
  1. `src/app/globals.css`
  2. `src/components/settings/ThemeSettings.tsx`
  3. `tailwind.config.ts`
  4. Any component using theme-specific styles

- **CRITICAL**: When modifying database operations, check these files:
  1. `src/lib/supabase/tasksApi.ts` - Verify correct helper imports
  2. `src/lib/supabase/client.ts` - Client-side operations
  3. `src/lib/supabase/server.ts` - Server-side operations
  4. Related API routes or Server Actions

### Testing Requirements
- **MANDATORY**: Test theme changes in all available themes
- **MANDATORY**: Test mobile responsiveness on 320px width minimum
- **MANDATORY**: Test navigation flows including back/exit mechanisms
- **MANDATORY**: Test database operations in development environment before deployment

## Prohibited Actions

### UI/UX Prohibitions
- **NEVER** use fixed heights that break on different content lengths
- **NEVER** allow content to bleed below bottom tab bar
- **NEVER** implement hover-only interactions on mobile-first design
- **NEVER** use more than 3 font sizes on a single screen
- **NEVER** create navigation dead-ends (always provide exit mechanism)

### Code Architecture Prohibitions
- **NEVER** import server helpers in client components
- **NEVER** call `getCurrentUserId()` from client-side code
- **NEVER** use hardcoded colors instead of theme CSS custom properties
- **NEVER** bypass TypeScript strict mode or use `any` types
- **NEVER** modify database schema without coordinating with existing queries

### Performance Prohibitions
- **NEVER** make AI API calls on every keystroke without debouncing
- **NEVER** load large datasets without pagination or virtualization
- **NEVER** skip loading states for async operations
- **NEVER** ignore React strict mode warnings

## Development Workflow

### Implementation Order
1. **Database Operations**: Fix connection issues using correct helper imports
2. **Theme System**: Implement multi-theme support with CSS custom properties
3. **Navigation**: Add proper exit mechanisms to all pages
4. **UI Constraints**: Implement container constraints and mobile-first optimization
5. **Performance**: Optimize large components and loading states
6. **AI Integration**: Add AI suggestions to task input flow

### Quality Assurance Checklist
- [ ] All imports use correct client vs server helpers
- [ ] All themes work correctly with new changes
- [ ] Mobile responsiveness tested at 320px width
- [ ] Navigation exit mechanisms functional
- [ ] No content bleeding below tab bar
- [ ] AI suggestions integrate without breaking existing flow
- [ ] TypeScript strict mode passes without errors
- [ ] Loading states implemented for all async operations

## Emergency Debugging

### Database Connection Issues
1. Check `src/lib/supabase/tasksApi.ts` imports - must use client helpers only
2. Verify Clerk authentication integration
3. Use Supabase MCP tools to verify database connectivity
4. Check environment variables for correct Supabase project configuration

### Theme System Issues
1. Verify CSS custom properties exist in `src/app/globals.css`
2. Check theme provider default value
3. Test theme persistence in local storage
4. Verify Tailwind config includes theme colors

### Mobile UI Issues
1. Test container constraints with `max-w-screen-sm mx-auto px-4`
2. Verify bottom padding accounts for tab bar `pb-20`
3. Check touch target sizes minimum `h-11`
4. Test horizontal scrolling issues

This document serves as the definitive guide for maintaining StudySpark's minimalist, mobile-first design while ensuring robust functionality and preventing common integration errors.

---

# StudySpark Development Standards (Extended)

## Project Overview

StudySpark is a React/Next.js study management app using Supabase (database), Clerk (authentication), Tailwind CSS (styling), and AI integration. **Critical constraint: Production app with existing users - avoid breaking changes.**

## Architecture Rules

### Database Architecture
- **Supabase Project ID**: `onfnehxkglmvrorcvqcx` (ACTIVE_HEALTHY status verified)
- **Authentication**: Clerk handles auth, Supabase handles data storage
- **CRITICAL**: Never mix client and server Supabase helpers in same file
- **Edge Functions**: Currently ZERO deployed - evaluate vs direct database calls for security

### Authentication Flow
- **Primary**: Clerk handles all authentication
- **Integration**: Must configure Supabase client to use Clerk session tokens
- **Required**: Clerk tokens must contain 'role' claim for RLS policies
- **User Onboarding**: Data must sync from Clerk to Supabase users table

## File Coordination Requirements

### When Modifying Theme System
**MUST update simultaneously:**
- `src/app/globals.css` (theme definitions)
- `src/components/settings/ThemeSettings.tsx` (theme selector)
- `src/components/providers/theme-provider.tsx` (provider config)
- `tailwind.config.ts` (if new theme variants needed)

### When Modifying Database Operations
**MUST check coordination:**
- `src/lib/supabase/tasksApi.ts` (task operations)
- `src/lib/supabase/client.ts` (client configuration)
- `src/lib/supabase/server.ts` (server configuration if exists)
- `supabase/functions/` (edge functions if implemented)

### When Modifying Navigation
**MUST update simultaneously:**
- Target page component (add back button)
- `src/components/layout/ConditionalHeader.tsx` (header visibility)
- `src/app/layout.tsx` (if global navigation changes)

## Code Standards

### Component Architecture
- **CVA Pattern**: Use Class Variance Authority for component variants (8+ components already use this)
- **Container Pattern**: `max-w-4xl mx-auto px-4` for content containers
- **Mobile-First**: Design for mobile, enhance for desktop
- **React.memo**: Use for expensive components (StudentConnectionTab needs this)

### Styling Standards
- **Primary**: Tailwind CSS utility classes
- **Themes**: CSS custom properties in `:root` and `[data-theme="name"]`
- **Responsive**: Mobile breakpoints: `sm:768px, md:1024px, lg:1280px`
- **Containers**: Prevent overflow with `overflow-hidden`, proper padding

### File Naming
- **Components**: PascalCase (`TaskEventHub.tsx`)
- **Pages**: Next.js convention (`page.tsx`, `layout.tsx`)
- **Utilities**: camelCase (`tasksApi.ts`)
- **Types**: Shared in `src/types/` directory

## Implementation Standards

### Database Operations
- **Authentication Required**: All database operations must verify user auth
- **Import Pattern**: Use server helpers for server operations, client helpers for client
- **CRITICAL BUG**: `src/lib/supabase/tasksApi.ts` line 129 has import mismatch
- **RLS Policies**: All tables have Row Level Security enabled
- **Error Handling**: Always handle Supabase errors gracefully

### UI/UX Standards
- **Minimalist Design**: Reduce visual clutter, obvious user actions
- **Content Constraints**: Never allow content to bleed off screen or below tab bar
- **Loading States**: Always provide loading feedback for async operations
- **Mobile Tab Bar**: Ensure 60px bottom padding for mobile navigation

### AI Integration
- **Existing Component**: `src/components/ai/AITaskSuggestions.tsx` (698 lines complete)
- **Integration Point**: Must add to `src/components/dashboard/TaskEventHub.tsx`
- **Requirement**: Must not break existing task/event creation functionality
- **Data Flow**: AI suggestions → TaskEventHub → Task creation

## Framework Usage Standards

### Next.js App Router
- **Server Components**: Default for data fetching and non-interactive components
- **Client Components**: Use `'use client'` for interactivity, state, effects
- **Layouts**: Use `layout.tsx` for shared UI structure
- **Loading**: Use `loading.tsx` for loading states

### Supabase Integration
- **Client Creation**: Use appropriate helper for context (client vs server)
- **Real-time**: Enable for tables that need live updates
- **Auth Integration**: Configure to use Clerk tokens, not Supabase auth
- **Edge Functions**: Evaluate for secure server-side operations

### Clerk Authentication
- **Session Management**: Use Clerk session tokens for Supabase access
- **User Data**: Sync user metadata from Clerk to Supabase
- **Onboarding**: Guide users through profile completion
- **RLS Integration**: Ensure Clerk claims work with Supabase RLS

## Key File Interaction Standards

### Critical Dependencies
**DO NOT modify without checking impacts:**
- `src/lib/supabase/tasksApi.ts` affects task creation throughout app
- `src/components/dashboard/TaskEventHub.tsx` affects AI integration
- `src/app/globals.css` affects all component styling
- `src/components/layout/ConditionalHeader.tsx` affects all page navigation

### Component Hierarchy
```
layout.tsx
├── ConditionalHeader.tsx
├── Dashboard components
│   ├── TaskEventHub.tsx
│   ├── StudentConnectionTab.tsx
│   └── AI integration
└── Settings components
    └── ThemeSettings.tsx
```

## AI Decision-Making Standards

### Database Architecture Decisions
1. **Security First**: Edge functions > direct client database calls
2. **Authentication**: Clerk integration > custom auth solutions
3. **Performance**: Optimize for mobile first, desktop second

### UI/UX Decisions
1. **Simplicity**: Fewer options > feature bloat
2. **Mobile**: Touch-friendly > desktop-optimized
3. **Accessibility**: Screen reader support required
4. **Theme**: Dark mode default, multiple theme options

### Error Handling Priority
1. **User Experience**: Graceful degradation over error crashes
2. **Data Integrity**: Prevent data loss over performance
3. **Authentication**: Secure by default, convenience second

## Prohibited Actions

### Critical Prohibitions
- **NEVER** mix Supabase client/server helpers in same file
- **NEVER** deploy without testing authentication flow
- **NEVER** modify global styles without checking component impacts
- **NEVER** remove existing functionality without explicit approval
- **NEVER** hardcode database credentials or API keys

### Theme System Prohibitions
- **NEVER** use inline styles instead of theme variables
- **NEVER** hardcode colors - use CSS custom properties
- **NEVER** break accessibility contrast requirements
- **NEVER** remove existing themes without migration plan

### Mobile Design Prohibitions
- **NEVER** allow horizontal scroll on mobile
- **NEVER** make touch targets smaller than 44px
- **NEVER** hide content behind navigation bars
- **NEVER** ignore safe area insets on mobile devices

### Database Operation Prohibitions
- **NEVER** bypass RLS policies
- **NEVER** expose sensitive data in client-side code
- **NEVER** perform complex operations without error handling
- **NEVER** ignore authentication requirements

## Current Known Issues

### Critical Issues
1. **Task Creation**: `tasksApi.ts` import bug prevents task creation
2. **Settings Navigation**: Users cannot exit settings page
3. **Student Connection**: 684-line component not loading properly
4. **UI Overflow**: Content bleeding off screen and below tab bar
5. **AI Integration**: System not connected to TaskEventHub
6. **Theme System**: Only 3 themes, needs 7 with dark default

### Dependencies
- **Database Fix**: Must resolve before AI integration
- **Navigation Fix**: Independent of other changes
- **Theme Expansion**: Can work in parallel with other tasks
- **Container Constraints**: Must coordinate with existing layouts

## Implementation Cross-Reference

### Before Making Changes
1. **Check**: Will this affect authentication flow?
2. **Check**: Will this change database operation patterns?
3. **Check**: Will this impact existing component styling?
4. **Check**: Will this break mobile responsiveness?
5. **Check**: Will this affect other components that import this file?

### After Making Changes
1. **Verify**: Authentication still works end-to-end
2. **Verify**: No new TypeScript errors introduced
3. **Verify**: Mobile layout still functions correctly
4. **Verify**: Theme switching still works
5. **Verify**: No regressions in existing functionality

### Testing Requirements
- **Unit**: Individual component functionality
- **Integration**: Component interaction and data flow
- **E2E**: Complete user journeys (signup → task creation → AI suggestions)
- **Mobile**: Touch interactions and responsive behavior
- **Theme**: All 7 themes render correctly across components

This document serves as the definitive guide for maintaining StudySpark's minimalist, mobile-first design while ensuring robust functionality and preventing common integration errors. 