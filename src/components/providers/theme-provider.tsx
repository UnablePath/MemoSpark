"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import { useUser } from "@clerk/nextjs";

// Add type declaration for window property
declare global {
  interface Window {
    __themeProviderWarningShown?: boolean;
  }
}

type ThemeProviderProps = {
  children: React.ReactNode;
};

type AccessibilityOptions = {
  highContrast: boolean;
  reducedMotion: boolean;
  largeText: boolean;
};

type PurchasedTheme = {
  theme_id: string;
  purchased_at: string | null;
  price_paid: number;
  metadata: {
    item_name: string;
    colors?: {
      primary: string;
      secondary: string;
      accent: string;
    };
    rarity?: string;
  };
};

type ThemeProviderState = {
  accessibilityOptions: AccessibilityOptions;
  setAccessibilityOption: (option: keyof AccessibilityOptions, value: boolean) => void;
  forceThemeUpdate: () => void;
  purchasedThemes: PurchasedTheme[];
  loadPurchasedThemes: () => Promise<void>;
  isThemeOwned: (themeId: string) => boolean;
};

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined);

export function ThemeProvider({ children }: ThemeProviderProps) {
  // Safely access user with error handling
  let user: any = null;
  let isUserLoaded = false;
  
  try {
    // Only call useUser if we're inside ClerkProvider
    const userHook = useUser();
    user = userHook?.user;
    isUserLoaded = userHook?.isLoaded || false;
  } catch (error) {
    // If useUser fails (not in ClerkProvider), user stays null
    // Don't log warning on every render - only once
    if (typeof window !== 'undefined' && !window.__themeProviderWarningShown) {
      console.warn('ThemeProvider: useUser called outside ClerkProvider, theme syncing disabled');
      window.__themeProviderWarningShown = true;
    }
  }

  const [accessibilityOptions, setAccessibilityOptions] = useState<AccessibilityOptions>({
    highContrast: false,
    reducedMotion: false,
    largeText: false,
  });
  const [forceUpdateCounter, setForceUpdateCounter] = useState(0);
  const [purchasedThemes, setPurchasedThemes] = useState<PurchasedTheme[]>([]);

  // Force theme update function for immediate theme changes
  const forceThemeUpdate = useCallback(() => {
    setForceUpdateCounter(prev => prev + 1);
    // Force DOM update by triggering a small delay
    requestAnimationFrame(() => {
      document.documentElement.style.colorScheme = 
        document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    });
  }, []);

  // Load purchased themes from API
  const loadPurchasedThemes = useCallback(async () => {
    if (!user?.id) return;

    try {
      const response = await fetch('/api/user/purchased-themes');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPurchasedThemes(data.themes);
        }
      }
    } catch (error) {
      console.error('Error loading purchased themes:', error);
    }
  }, [user?.id]);

  // Check if user owns a theme
  const isThemeOwned = useCallback((themeId: string) => {
    // Launch mode detection - grants access to all themes during launch period
    const isLaunchMode = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_ENABLE_LAUNCH_MODE === 'true';
    
    // Default themes are always owned
    if (['default', 'light', 'dark'].includes(themeId)) {
      return true;
    }
    
    // Built-in theme pairs are always owned (these come free with the app)
    const builtInThemes = [
      'theme-amoled', 'theme-amoled-light',
      'theme-carbon', 'theme-carbon-light', 
      'theme-sea-blue', 'theme-sea-blue-light',
      'theme-midnight-blue', 'theme-midnight-blue-light',
      'theme-void-purple', 'theme-void-purple-light',
      'theme-sunset-orange', 'theme-sunset-orange-light',
      'theme-hello-kitty-pink', 'theme-hello-kitty-pink-light',
      'theme-cherry-blossom-builtin', 'theme-cherry-blossom-builtin-light',
      'theme-cherry-blossom', 'theme-cherry-blossom-light',
      'theme-hacker-green', 'theme-hacker-green-light'
    ];
    
    if (builtInThemes.includes(themeId)) {
      return true;
    }
    
    // Coin themes that need to be purchased - check ownership or launch mode
    const coinThemes = [
      'theme-forest-dream', 'theme-forest-dream-light',
      'theme-sunset-blaze', 'theme-sunset-blaze-light',
      'theme-ocean-depths', 'theme-ocean-depths-light', 
      'theme-purple-haze', 'theme-purple-haze-light',
      'theme-golden-hour', 'theme-golden-hour-light',
      'theme-crimson-night', 'theme-crimson-night-light',
      'theme-arctic-aurora', 'theme-arctic-aurora-light',
      'theme-midnight-galaxy', 'theme-midnight-galaxy-light',
      'theme-royal-emerald', 'theme-royal-emerald-light',
      'theme-diamond-platinum', 'theme-diamond-platinum-light'
    ];
    
    if (coinThemes.includes(themeId)) {
      // In launch mode, all coin themes are accessible
      if (isLaunchMode) {
        return true;
      }
      
      // Otherwise, check actual ownership
      const baseThemeId = themeId.replace('-light', '').replace('theme-', '');
      return purchasedThemes.some(theme => theme.theme_id === baseThemeId);
    }
    
    // For any other theme, allow it (backward compatibility)
    return true;
  }, [purchasedThemes]);

  // Load purchased themes on user login
  useEffect(() => {
    if (user?.id) {
      loadPurchasedThemes();
    }
  }, [user?.id, loadPurchasedThemes]);

  // Listen for theme purchase events
  useEffect(() => {
    const handleThemePurchased = (event: CustomEvent) => {
      const { themeId, themeName, colors } = event.detail;
      
      // Add the new theme to purchased themes
      const newTheme: PurchasedTheme = {
        theme_id: themeId,
        purchased_at: new Date().toISOString(),
        price_paid: 0, // Will be updated by the next refresh
        metadata: {
          item_name: themeName,
          colors: colors,
          rarity: 'common'
        }
      };
      
      setPurchasedThemes(prev => [...prev, newTheme]);
      
      // Trigger theme update - the actual theme change is handled by the RewardShop
      forceThemeUpdate();
    };

    window.addEventListener('theme-purchased', handleThemePurchased as EventListener);
    
    return () => {
      window.removeEventListener('theme-purchased', handleThemePurchased as EventListener);
    };
  }, [forceThemeUpdate]);

  // Load accessibility options from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedAppearance = localStorage.getItem("memospark_appearance");
      const savedAccessibility = localStorage.getItem("memospark_accessibility");

      try {
        if (savedAppearance) {
          const { highContrast, reducedMotion } = JSON.parse(savedAppearance);
          setAccessibilityOptions(prev => ({
            ...prev,
            highContrast: !!highContrast,
            reducedMotion: !!reducedMotion,
          }));
        }

        if (savedAccessibility) {
          const { largeText } = JSON.parse(savedAccessibility);
          setAccessibilityOptions(prev => ({
            ...prev,
            largeText: !!largeText,
          }));
        }
      } catch (error) {
        console.error("Error loading accessibility settings", error);
      }
    }
  }, []);

  // Apply accessibility classes based on options with immediate effect
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Use requestAnimationFrame for immediate DOM updates
      requestAnimationFrame(() => {
        // Apply high contrast mode
        if (accessibilityOptions.highContrast) {
          document.documentElement.classList.add("high-contrast");
        } else {
          document.documentElement.classList.remove("high-contrast");
        }

        // Apply reduced motion
        if (accessibilityOptions.reducedMotion) {
          document.documentElement.classList.add("reduced-motion");
        } else {
          document.documentElement.classList.remove("reduced-motion");
        }

        // Apply large text
        if (accessibilityOptions.largeText) {
          document.documentElement.classList.add("large-text");
        } else {
          document.documentElement.classList.remove("large-text");
        }
      });
    }
  }, [accessibilityOptions]);

  const setAccessibilityOption = useCallback((option: keyof AccessibilityOptions, value: boolean) => {
    setAccessibilityOptions(prev => ({ ...prev, [option]: value }));

    // Save to localStorage based on which setting it belongs to
    if (typeof window !== "undefined") {
      try {
        if (option === "highContrast" || option === "reducedMotion") {
          const savedAppearance = localStorage.getItem("memospark_appearance");
          const appearanceSettings = savedAppearance ? JSON.parse(savedAppearance) : {};
          localStorage.setItem(
            "memospark_appearance",
            JSON.stringify({ ...appearanceSettings, [option]: value })
          );
        } else if (option === "largeText") {
          const savedAccessibility = localStorage.getItem("memospark_accessibility");
          const accessibilitySettings = savedAccessibility ? JSON.parse(savedAccessibility) : {};
          localStorage.setItem(
            "memospark_accessibility",
            JSON.stringify({ ...accessibilitySettings, [option]: value })
          );
        }
      } catch (error) {
        console.error("Error saving accessibility settings", error);
      }
    }
    
    // Force immediate update
    forceThemeUpdate();
  }, [forceThemeUpdate]);

  // All available themes including built-in and purchased ones
  const builtInThemes = [
    'light', 'dark', 'default',
    // Built-in theme pairs (free)
    'theme-amoled', 'theme-amoled-light',
    'theme-carbon', 'theme-carbon-light', 
    'theme-sea-blue', 'theme-sea-blue-light',
    'theme-midnight-blue', 'theme-midnight-blue-light',
    'theme-void-purple', 'theme-void-purple-light',
    'theme-sunset-orange', 'theme-sunset-orange-light',
    'theme-hello-kitty-pink', 'theme-hello-kitty-pink-light',
    'theme-cherry-blossom-builtin', 'theme-cherry-blossom-builtin-light',
    'theme-hacker-green', 'theme-hacker-green-light'
  ];
  
  // Launch mode detection
  const isLaunchMode = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_ENABLE_LAUNCH_MODE === 'true';
  
  // Add purchased coin theme variants
  const purchasedThemeVariants: string[] = [];
  purchasedThemes.forEach(theme => {
    purchasedThemeVariants.push(`theme-${theme.theme_id}`);
    purchasedThemeVariants.push(`theme-${theme.theme_id}-light`);
  });
  
  // All coin themes (for launch mode)
  const allCoinThemes = [
    'theme-forest-dream', 'theme-forest-dream-light',
    'theme-sunset-blaze', 'theme-sunset-blaze-light',
    'theme-ocean-depths', 'theme-ocean-depths-light', 
    'theme-purple-haze', 'theme-purple-haze-light',
    'theme-golden-hour', 'theme-golden-hour-light',
    'theme-crimson-night', 'theme-crimson-night-light',
    'theme-arctic-aurora', 'theme-arctic-aurora-light',
    'theme-midnight-galaxy', 'theme-midnight-galaxy-light',
    'theme-royal-emerald', 'theme-royal-emerald-light',
    'theme-diamond-platinum', 'theme-diamond-platinum-light'
  ];
  
  const allThemes = [
    ...builtInThemes,
    ...(isLaunchMode ? allCoinThemes : purchasedThemeVariants)
  ];



  return (
    <ThemeProviderContext.Provider
      value={{
        accessibilityOptions,
        setAccessibilityOption,
        forceThemeUpdate,
        purchasedThemes,
        loadPurchasedThemes,
        isThemeOwned
      }}
    >
      <NextThemesProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem={false}
        disableTransitionOnChange={true}
        storageKey="memospark-theme"
        forcedTheme={undefined}
        themes={allThemes}
      >
        <ThemeValidationWrapper>
          {children}
        </ThemeValidationWrapper>
      </NextThemesProvider>
    </ThemeProviderContext.Provider>
  );
}

// Theme validation wrapper component
function ThemeValidationWrapper({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useTheme();
  const { isThemeOwned, purchasedThemes } = useThemeContext();
  const [hasValidated, setHasValidated] = useState(false);

  useEffect(() => {
    // Only validate once when themes are initially loaded and user has themes
    if (theme && purchasedThemes.length >= 0 && !hasValidated) {
      // Give a brief delay to allow theme system to stabilize
      const timeoutId = setTimeout(() => {
        // Only validate coin themes, allow built-in themes to pass through
        const coinThemes = [
          'theme-forest-dream', 'theme-forest-dream-light',
          'theme-sunset-blaze', 'theme-sunset-blaze-light',
          'theme-ocean-depths', 'theme-ocean-depths-light', 
          'theme-purple-haze', 'theme-purple-haze-light',
          'theme-golden-hour', 'theme-golden-hour-light',
          'theme-crimson-night', 'theme-crimson-night-light',
          'theme-arctic-aurora', 'theme-arctic-aurora-light',
          'theme-midnight-galaxy', 'theme-midnight-galaxy-light',
          'theme-royal-emerald', 'theme-royal-emerald-light',
          'theme-diamond-platinum', 'theme-diamond-platinum-light'
        ];
        
        // Only validate if it's a coin theme and not owned
        if (coinThemes.includes(theme) && !isThemeOwned(theme)) {
          console.warn(`Coin theme "${theme}" is not owned, reverting to default`);
          setTheme('dark');
        }
        
        setHasValidated(true);
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [theme, purchasedThemes, isThemeOwned, setTheme, hasValidated]);

  return <>{children}</>;
}

export const useThemeContext = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined) {
    throw new Error("useThemeContext must be used within a ThemeProvider");
  }

  return context;
};
