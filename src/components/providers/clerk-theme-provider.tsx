'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { memoSparkClerkAppearance, memoSparkClerkAppearanceDark } from '@/lib/clerk-appearance';
import type { ReactNode } from 'react';

interface ThemeAwareClerkProviderProps {
  children: ReactNode;
}

export function ThemeAwareClerkProvider({ children }: ThemeAwareClerkProviderProps) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only determining theme after component mounts
  useEffect(() => {
    setMounted(true);
  }, []);

  // Determine which appearance to use based on the current theme
  const getClerkAppearance = () => {
    // During SSR or before mounting, use default light theme
    if (!mounted) {
      return memoSparkClerkAppearance;
    }

    // Check if the current theme is dark or any dark variant
    const isDarkTheme = theme === 'dark' || 
                       theme?.includes('amoled') || 
                       theme?.includes('sea-blue') ||
                       theme?.includes('hello-kitty-pink') ||
                       theme?.includes('hacker-green') ||
                       theme?.includes('void-purple') ||
                       theme?.includes('sunset-orange') ||
                       theme?.includes('midnight-blue') ||
                       theme?.includes('cherry-blossom') ||
                       theme?.includes('carbon');

    return isDarkTheme ? memoSparkClerkAppearanceDark : memoSparkClerkAppearance;
  };

  return (
    <ClerkProvider appearance={getClerkAppearance()}>
      {children}
    </ClerkProvider>
  );
} 