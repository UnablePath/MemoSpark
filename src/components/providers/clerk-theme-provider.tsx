'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { ui } from '@clerk/ui';
import { useTheme } from 'next-themes';
import { useEffect, useState, useMemo } from 'react';
import {
  isMemoSparkDarkTheme,
  memoSparkClerkAppearance,
  memoSparkClerkAppearanceDark,
} from '@/lib/clerk-appearance';
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

  const isDarkTheme = useMemo(() => {
    if (!mounted) return true;
    return isMemoSparkDarkTheme(theme ?? resolvedTheme);
  }, [theme, resolvedTheme, mounted]);

  // Memoized appearance selection to prevent unnecessary re-renders
  const clerkAppearance = useMemo(() => {
    return isDarkTheme ? memoSparkClerkAppearanceDark : memoSparkClerkAppearance;
  }, [isDarkTheme]);

  /** Wording that fits MemoSpark: Clerk’s default “Manage account” opens email/password/security, not app profile. */
  const clerkLocalization = useMemo(
    () => ({
      userButton: {
        action__manageAccount: 'Account & security',
      },
    }),
    [],
  );

  return (
    <ClerkProvider
      ui={ui}
      appearance={clerkAppearance}
      localization={clerkLocalization}
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      afterSignOutUrl="/"
    >
      {children}
    </ClerkProvider>
  );
} 