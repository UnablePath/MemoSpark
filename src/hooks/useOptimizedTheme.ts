'use client';

import { useTheme } from 'next-themes';
import { useCallback, useEffect, useState } from 'react';
import { useThemeContext } from '@/components/providers/theme-provider';

/**
 * Optimized theme hook that provides immediate theme switching
 * Prevents delays and ensures smooth theme transitions
 */
export function useOptimizedTheme() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { forceThemeUpdate } = useThemeContext();
  const [isChanging, setIsChanging] = useState(false);

  // Optimized theme setter with immediate DOM updates
  const setOptimizedTheme = useCallback((newTheme: string) => {
    setIsChanging(true);
    
    // Apply theme immediately to DOM
    requestAnimationFrame(() => {
      const html = document.documentElement;
      
      // Add changing attribute to leverage CSS optimizations
      html.setAttribute('data-theme-changing', 'true');
      
      // Remove all existing theme classes
      const existingThemeClasses = html.classList.value
        .split(' ')
        .filter(cls => cls.startsWith('theme-') || cls === 'light' || cls === 'dark');
      
      existingThemeClasses.forEach(cls => html.classList.remove(cls));
      
      // Add new theme class immediately
      html.classList.add(newTheme);
      
      // Update color scheme for browsers
      const isDark = newTheme === 'dark' || (newTheme.startsWith('theme-') && !newTheme.includes('-light'));
      html.style.colorScheme = isDark ? 'dark' : 'light';
      
      // Force styles to be recalculated
      html.offsetHeight;
      
      // Update the theme state
      setTheme(newTheme);
      forceThemeUpdate();
      
      // Remove changing attribute and reset state after theme is applied
      requestAnimationFrame(() => {
        html.removeAttribute('data-theme-changing');
        setTimeout(() => setIsChanging(false), 50);
      });
    });
  }, [setTheme, forceThemeUpdate]);

  // Toggle between light and dark modes for current theme
  const toggleMode = useCallback(() => {
    const currentTheme = theme || resolvedTheme || 'dark';
    
    if (currentTheme === 'light') {
      setOptimizedTheme('dark');
    } else if (currentTheme === 'dark') {
      setOptimizedTheme('light');
    } else if (currentTheme.includes('-light')) {
      // Switch from light variant to dark variant
      const darkTheme = currentTheme.replace('-light', '');
      setOptimizedTheme(darkTheme);
    } else if (currentTheme.startsWith('theme-')) {
      // Switch from dark variant to light variant
      const lightTheme = `${currentTheme}-light`;
      setOptimizedTheme(lightTheme);
    } else {
      // Fallback
      setOptimizedTheme('dark');
    }
  }, [theme, resolvedTheme, setOptimizedTheme]);

  // Get current theme info
  const getCurrentThemeInfo = useCallback(() => {
    const currentTheme = theme || resolvedTheme || 'dark';
    const isDark = currentTheme === 'dark' || (currentTheme.startsWith('theme-') && !currentTheme.includes('-light'));
    
    return {
      theme: currentTheme,
      isDark,
      isLight: !isDark,
      isCustomTheme: currentTheme.startsWith('theme-'),
      themeName: currentTheme
    };
  }, [theme, resolvedTheme]);

  // Preload all theme CSS to prevent flashing
  useEffect(() => {
    const linkElement = document.createElement('link');
    linkElement.rel = 'preload';
    linkElement.as = 'style';
    linkElement.href = '/globals.css';
    document.head.appendChild(linkElement);
    
    return () => {
      if (document.head.contains(linkElement)) {
        document.head.removeChild(linkElement);
      }
    };
  }, []);

  return {
    ...getCurrentThemeInfo(),
    setTheme: setOptimizedTheme,
    toggleMode,
    isChanging,
    originalSetTheme: setTheme // Backup original function if needed
  };
} 