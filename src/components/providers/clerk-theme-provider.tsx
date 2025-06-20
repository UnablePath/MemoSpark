'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { useTheme } from 'next-themes';
import { useEffect, useState, useMemo } from 'react';
import { memoSparkClerkAppearance, memoSparkClerkAppearanceDark } from '@/lib/clerk-appearance';
import type { ReactNode } from 'react';

interface ThemeAwareClerkProviderProps {
  children: ReactNode;
}

export function ThemeAwareClerkProvider({ children }: ThemeAwareClerkProviderProps) {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only determining theme after component mounts
  useEffect(() => {
    setMounted(true);
  }, []);

  // Memoized theme detection for better performance
  const isDarkTheme = useMemo(() => {
    if (!mounted) return true; // Default to dark during SSR
    
    const currentTheme = theme || resolvedTheme;
    
    // Check if the current theme is dark or any dark variant
    return currentTheme === 'dark' || 
           (currentTheme?.includes('theme-') && !currentTheme?.includes('-light'));
  }, [theme, resolvedTheme, mounted]);

  // Memoized appearance selection to prevent unnecessary re-renders
  const clerkAppearance = useMemo(() => {
    return isDarkTheme ? memoSparkClerkAppearanceDark : memoSparkClerkAppearance;
  }, [isDarkTheme]);

  return (
    <ClerkProvider 
      appearance={clerkAppearance}
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
    >
      {children}
    </ClerkProvider>
  );
} 