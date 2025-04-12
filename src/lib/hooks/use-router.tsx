"use client";

// Import both router methods to ensure we have a fallback
import { useRouter as useNextRouter } from 'next/router';
import { useRouter as useAppRouter } from 'next/navigation';

// Custom router hook to handle different Next.js versions and prevent build errors
export function useRouter() {
  try {
    // Try the App Router first (Next.js 13+)
    return useAppRouter();
  } catch (e) {
    try {
      // Fall back to the Pages Router if needed
      return useNextRouter();
    } catch (e) {
      // Return a minimal router implementation if both fail
      // This prevents build errors
      return {
        push: (path: string) => {
          console.warn('Router not available during build, would navigate to:', path);
          if (typeof window !== 'undefined') {
            window.location.href = path;
          }
        },
        replace: (path: string) => {
          console.warn('Router not available during build, would navigate to:', path);
          if (typeof window !== 'undefined') {
            window.location.href = path;
          }
        },
        back: () => {
          console.warn('Router not available during build, would go back');
          if (typeof window !== 'undefined') {
            window.history.back();
          }
        },
        pathname: '/',
        query: {}
      };
    }
  }
} 