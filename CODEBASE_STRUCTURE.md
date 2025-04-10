# StudySpark Codebase Structure and Implementation

This document provides an overview of the StudySpark codebase structure and detailed implementation steps for each main component.

## Cleaned Codebase Structure

```
studyspark/
├── public/                  # Static assets
│   ├── fonts/               # Font files
│   ├── images/              # Static images
│   └── icons/               # Icon files and favicon
│
├── src/                     # Source code
│   ├── app/                 # Next.js app router pages
│   │   ├── (auth)/           # Authentication routes
│   │   │   ├── login/         # Login page
│   │   │   ├── signup/        # Signup page
│   │   │   └── onboarding/    # Onboarding flow
│   │   │
│   │   ├── home/             # Main application pages
│   │   ├── settings/         # Settings pages
│   │   ├── splash/           # Splash screen
│   │   ├── layout.tsx        # Root layout
│   │   └── page.tsx          # Root page
│   │
│   ├── components/          # Reusable components
│   │   ├── ui/              # UI primitive components
│   │   ├── home/            # Home page components
│   │   │   ├── TaskTab.tsx
│   │   │   ├── StudentConnectionTab.tsx
│   │   │   └── GamifiedReminderTab.tsx
│   │   │
│   │   ├── forms/           # Form components
│   │   ├── layout/          # Layout components
│   │   ├── mascot/          # Stu mascot components
│   │   └── widgets/         # Widget components
│   │
│   ├── hooks/               # Custom React hooks
│   │   ├── useLocalStorage.ts
│   │   ├── useTaskManagement.ts
│   │   └── useWidgetPosition.ts
│   │
│   ├── lib/                 # Utility libraries
│   │   ├── supabase.ts      # Supabase client
│   │   └── utils.ts         # Utility functions
│   │
│   ├── styles/              # Global styles
│   └── types/               # TypeScript types
│
├── cursor.rules             # Coding standards and guidelines
├── PRODUCT_TIMELINE.md      # Development timeline
├── CODEBASE_STRUCTURE.md    # This document
├── SETUP_SUPABASE.md        # Supabase setup guide
├── biome.json               # Biome configuration
├── tailwind.config.js       # Tailwind configuration
├── tsconfig.json            # TypeScript configuration
└── package.json             # Project dependencies
```

## Implementation Steps for Key Components

### 1. Tab Navigation System

The tab navigation system is implemented with a swipe-based interface inspired by Snapchat:

1. **TabContainer Component**
   - Uses Framer Motion for smooth transitions
   - Handles swipe gestures for navigation
   - Manages tab state and selection

```tsx
// Implementation in TabContainer.tsx
import { motion } from 'framer-motion';
import { useState } from 'react';

export const TabContainer = ({ children }) => {
  const [activeTab, setActiveTab] = useState(1);

  // Tab switching logic with animation
  // Gesture handlers for swipe navigation
};
```

2. **TabIndicator Component**
   - Shows current tab position
   - Animated dots for visual feedback

### 2. Task Management System

1. **TaskTab Component**
   - Calendar view for selecting dates
   - Task input form with validation
   - Task list with completion toggles

2. **TaskForm Component**
   - Form fields for task details
   - Validation with react-hook-form and zod
   - Submit handler to save tasks

3. **TaskList Component**
   - Displays tasks for selected date
   - Sorting and filtering options
   - Task completion handlers

### 3. Student Connection System

1. **StudentConnectionTab Component**
   - Student search and filtering
   - Connection requests
   - Messaging interface

2. **StudentList Component**
   - Displays student profiles
   - Filter options by year, subject, interests
   - Connection request buttons

3. **MessageInterface Component**
   - Conversation list
   - Message thread view
   - Message input with send functionality

### 4. Gamified Reminder System

1. **GamifiedReminderTab Component**
   - Displays Stu mascot with animations
   - Shows upcoming tasks and reminders
   - Streak tracking and achievements

2. **Mascot Component**
   - SVG animation for Stu
   - Multiple animation states (idle, talking, excited)
   - Interactive elements

3. **StreakTracker Component**
   - Visual representation of current streak
   - Celebration animations for milestones
   - Stats display

### 5. Settings System

1. **SettingsPage Component**
   - Sections for different settings categories
   - Form controls for user preferences
   - Save and reset functionality

2. **ThemeSettings Component**
   - Light/dark mode toggle
   - High contrast mode toggle
   - Custom color preferences

3. **AccessibilitySettings Component**
   - Font size controls
   - Reduced motion toggle
   - Screen reader optimization settings

### 6. Widget System

1. **DraggableWidget Component**
   - Draggable container that can be positioned
   - Persistence of position with localStorage
   - Resize functionality

2. **WidgetContent Component**
   - Content types (reminders, tasks, mascot)
   - State management for widget data
   - Update mechanism

## Data Storage Implementation

### Local Storage

For client-side persistence without Supabase:

1. **useLocalStorage Hook**
   - Get and set items in localStorage
   - Type safety with generics
   - Fallback values for missing data

```tsx
// Implementation in useLocalStorage.ts
export function useLocalStorage<T>(key: string, initialValue: T) {
  // Logic to get/set localStorage with type safety
}
```

2. **Storage Keys**
   - Consistent naming convention for keys
   - Namespaced to avoid conflicts

### Supabase Integration

For server-side persistence and authentication:

1. **Supabase Client**
   - Configuration in src/lib/supabase.ts
   - Type definitions for database tables

2. **Data Access Patterns**
   - Custom hooks for data operations
   - Error handling and loading states
   - Optimistic updates for better UX

## Animation System

1. **Framer Motion Integration**
   - Page transitions
   - Micro-interactions
   - Gesture-based animations

2. **Animation Variants**
   - Predefined animation patterns
   - Consistent timing and easing
   - Reduced motion alternatives

## Accessibility Implementation

1. **Keyboard Navigation**
   - Focus management
   - Skip links
   - Keyboard shortcuts

2. **Screen Reader Support**
   - ARIA labels and descriptions
   - Semantic HTML
   - Status announcements

3. **Visual Accommodations**
   - Color contrast compliance
   - Text scaling
   - High contrast mode

## Performance Optimizations

1. **Component Optimization**
   - Memoization with React.memo
   - useCallback for event handlers
   - useMemo for expensive calculations

2. **Rendering Optimization**
   - Virtualized lists for long content
   - Image optimization with Next.js
   - Code splitting with dynamic imports

3. **Bundle Size Management**
   - Tree-shaking unused code
   - Lazy loading components
   - Monitoring bundle size

## Testing Strategy

1. **Unit Testing**
   - Component testing with React Testing Library
   - Hook testing
   - Utility function testing

2. **Integration Testing**
   - User flows testing
   - Form submission testing
   - API interaction testing

3. **End-to-End Testing**
   - Complete user journeys
   - Cross-browser testing
   - Accessibility testing

## Deployment Process

1. **Continuous Integration**
   - Automated testing on pull requests
   - Linting and type checking
   - Preview deployments

2. **Netlify Deployment**
   - Automated builds from main branch
   - Environment variable management
   - Deployment contexts (production, staging)
