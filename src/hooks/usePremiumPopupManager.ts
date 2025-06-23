'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from '@clerk/nextjs';

interface PopupState {
  isOpen: boolean;
  mode: 'launch' | 'feature_gate' | 'general';
  feature?: string;
}

interface UsePremiumPopupManagerConfig {
  popupIntervalMinutes?: number; // How often to show popups (in minutes)
  isLaunchMode?: boolean; // Whether app is in launch mode
  userTier?: string; // User's subscription tier
}

const DEFAULT_CONFIG = {
  popupIntervalMinutes: 5, // Show popup every 5 minutes
  isLaunchMode: false,
  userTier: 'free'
};

export const usePremiumPopupManager = (config: UsePremiumPopupManagerConfig = {}) => {
  const { user, isLoaded } = useUser();
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  
  const [popupState, setPopupState] = useState<PopupState>({
    isOpen: false,
    mode: 'general',
    feature: undefined
  });

  // Refs for timing and visibility
  const lastPopupTime = useRef<number>(0);
  const tabVisibilityTimer = useRef<NodeJS.Timeout | null>(null);
  const regularTimer = useRef<NodeJS.Timeout | null>(null);
  const wasTabHidden = useRef<boolean>(false);

  // Check if user should see popups
  const shouldShowPopups = useCallback(() => {
    // Don't show if not loaded or user is premium
    if (!isLoaded || !user) return false;
    if (mergedConfig.userTier === 'premium') return false;
    
    // Don't show too frequently (respect minimum interval)
    const now = Date.now();
    const timeSinceLastPopup = now - lastPopupTime.current;
    const minInterval = mergedConfig.popupIntervalMinutes * 60 * 1000; // Convert to milliseconds
    
    return timeSinceLastPopup >= minInterval;
  }, [isLoaded, user, mergedConfig.userTier, mergedConfig.popupIntervalMinutes]);

  // Show popup with specific mode
  const showPopup = useCallback((mode: 'launch' | 'feature_gate' | 'general', feature?: string) => {
    if (!shouldShowPopups()) return;

    setPopupState({
      isOpen: true,
      mode,
      feature
    });
    
    lastPopupTime.current = Date.now();
  }, [shouldShowPopups]);

  // Close popup
  const closePopup = useCallback(() => {
    setPopupState(prev => ({ ...prev, isOpen: false }));
  }, []);

  // Show feature gate popup
  const showFeatureGatePopup = useCallback((featureName: string) => {
    showPopup('feature_gate', featureName);
  }, [showPopup]);

  // Handle tab visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab became hidden
        wasTabHidden.current = true;
        
        // Clear any existing timer
        if (tabVisibilityTimer.current) {
          clearTimeout(tabVisibilityTimer.current);
          tabVisibilityTimer.current = null;
        }
      } else {
        // Tab became visible
        if (wasTabHidden.current && shouldShowPopups()) {
          // Show popup after a short delay when tab becomes visible
          tabVisibilityTimer.current = setTimeout(() => {
            const mode = mergedConfig.isLaunchMode ? 'launch' : 'general';
            showPopup(mode);
          }, 1000); // 1 second delay
        }
        wasTabHidden.current = false;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (tabVisibilityTimer.current) {
        clearTimeout(tabVisibilityTimer.current);
      }
    };
  }, [shouldShowPopups, showPopup, mergedConfig.isLaunchMode]);

  // Regular popup timer
  useEffect(() => {
    if (!shouldShowPopups()) return;

    const startRegularTimer = () => {
      if (regularTimer.current) {
        clearInterval(regularTimer.current);
      }

      regularTimer.current = setInterval(() => {
        if (shouldShowPopups() && !document.hidden) {
          const mode = mergedConfig.isLaunchMode ? 'launch' : 'general';
          showPopup(mode);
        }
      }, mergedConfig.popupIntervalMinutes * 60 * 1000);
    };

    // Start timer after initial delay
    const initialDelay = setTimeout(() => {
      startRegularTimer();
    }, 30000); // 30 seconds initial delay

    return () => {
      clearTimeout(initialDelay);
      if (regularTimer.current) {
        clearInterval(regularTimer.current);
      }
    };
  }, [shouldShowPopups, showPopup, mergedConfig.isLaunchMode, mergedConfig.popupIntervalMinutes]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (tabVisibilityTimer.current) {
        clearTimeout(tabVisibilityTimer.current);
      }
      if (regularTimer.current) {
        clearInterval(regularTimer.current);
      }
    };
  }, []);

  return {
    popupState,
    showPopup,
    closePopup,
    showFeatureGatePopup,
    shouldShowPopups: shouldShowPopups()
  };
}; 