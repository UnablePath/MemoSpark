"use client";

import { createContext, useContext, useEffect, useState } from "react";
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
};

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined);

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [accessibilityOptions, setAccessibilityOptions] = useState<AccessibilityOptions>({
    highContrast: false,
    reducedMotion: false,
    largeText: false,
  });

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

  // Apply accessibility classes based on options
  useEffect(() => {
    if (typeof window !== "undefined") {
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
    }
  }, [accessibilityOptions]);

  const setAccessibilityOption = (option: keyof AccessibilityOptions, value: boolean) => {
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
  };

  return (
    <ThemeProviderContext.Provider
      value={{
        accessibilityOptions,
        setAccessibilityOption
      }}
    >
      <NextThemesProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange
        themes={[
          'light', 
          'dark', 
          'theme-amoled', 
          'theme-sea-blue', 
          'theme-hello-kitty-pink', 
          'theme-hacker-green',
          'theme-void-purple',
          'theme-sunset-orange',
          'theme-midnight-blue',
          'theme-cherry-blossom',
          'theme-carbon'
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
