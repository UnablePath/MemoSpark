"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

type ThemeProviderProps = {
  children: React.ReactNode;
};

type AccessibilityOptions = {
  highContrast: boolean;
  reducedMotion: boolean;
  largeText: boolean;
};

type ThemeProviderState = {
  accessibilityOptions: AccessibilityOptions;
  setAccessibilityOption: (option: keyof AccessibilityOptions, value: boolean) => void;
  forceThemeUpdate: () => void;
};

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined);

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [accessibilityOptions, setAccessibilityOptions] = useState<AccessibilityOptions>({
    highContrast: false,
    reducedMotion: false,
    largeText: false,
  });
  const [forceUpdateCounter, setForceUpdateCounter] = useState(0);

  // Force theme update function for immediate theme changes
  const forceThemeUpdate = useCallback(() => {
    setForceUpdateCounter(prev => prev + 1);
    // Force DOM update by triggering a small delay
    requestAnimationFrame(() => {
      document.documentElement.style.colorScheme = 
        document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    });
  }, []);

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

  return (
    <ThemeProviderContext.Provider
      value={{
        accessibilityOptions,
        setAccessibilityOption,
        forceThemeUpdate
      }}
    >
      <NextThemesProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem={false}
        disableTransitionOnChange={true}
        storageKey="memospark-theme"
        forcedTheme={undefined}
        themes={[
          'light', 
          'dark',
          // Dark themes
          'theme-amoled', 
          'theme-sea-blue', 
          'theme-hello-kitty-pink', 
          'theme-hacker-green',
          'theme-void-purple',
          'theme-sunset-orange',
          'theme-midnight-blue',
          'theme-cherry-blossom',
          'theme-carbon',
          // Light theme variants
          'theme-amoled-light',
          'theme-sea-blue-light',
          'theme-hello-kitty-pink-light',
          'theme-hacker-green-light',
          'theme-void-purple-light',
          'theme-sunset-orange-light',
          'theme-midnight-blue-light',
          'theme-cherry-blossom-light',
          'theme-carbon-light'
        ]}
      >
        {children}
      </NextThemesProvider>
    </ThemeProviderContext.Provider>
  );
}

export const useThemeContext = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined) {
    throw new Error("useThemeContext must be used within a ThemeProvider");
  }

  return context;
};
