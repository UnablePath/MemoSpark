'use client';

import type React from 'react';
import { useState, Children, isValidElement, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSwipeable, type SwipeEventData } from 'react-swipeable';
import { useRouter } from 'next/navigation';

interface TabContainerProps {
  children: React.ReactNode;
  initialTab?: number;
  onTabChange?: (index: number) => void;
  activeIndex?: number;
  panelIds?: string[];
  tabIds?: string[];
  swipingEnabled?: boolean;
}

const variants = {
  enter: (direction: number) => {
    return {
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0,
    };
  },
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => {
    return {
      zIndex: 0,
      x: direction < 0 ? '100%' : '-100%',
      opacity: 0,
    };
  },
};

// Browser detection utility
const isBrowserEnvironment = () => {
  if (typeof window === 'undefined') return false;
  
  // Check if we're in a browser vs mobile app
  const userAgent = navigator.userAgent;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const isPWA = window.navigator.standalone || isStandalone;
  
  // Consider it a "browser" if it's not a mobile device and not a PWA
  return !isMobile && !isPWA;
};

// Detect if user is on desktop browser
const isDesktopBrowser = () => {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent;
  const isDesktop = !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  return isDesktop && !hasTouch;
};

export function TabContainer({
    children,
    initialTab = 0,
    onTabChange,
    activeIndex: controlledIndex,
    panelIds,
    tabIds,
    swipingEnabled = true
}: TabContainerProps) {
  const tabs = Children.toArray(children).filter(isValidElement);
  const [[internalIndex, direction], setInternalIndex] = useState([initialTab, 0]);
  const router = useRouter();
  const isSwipingRef = useRef(false);
  const swipeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Simplified swipe state - remove complex preview logic that was causing issues
  const swipeThresholdRef = useRef<number>(0);

  const currentIndex = controlledIndex !== undefined ? controlledIndex : internalIndex;

  useEffect(() => {
    if (controlledIndex !== undefined && controlledIndex !== internalIndex) {
      const newDirection = controlledIndex > internalIndex ? 1 : -1;
      setInternalIndex([controlledIndex, newDirection]);
    }
  }, [controlledIndex, internalIndex]);

  // Prevent browser back navigation during swipe gestures
  useEffect(() => {
    const isBrowser = isBrowserEnvironment();
    const isDesktop = isDesktopBrowser();
    
    if (!isBrowser && !isDesktop) return; // Only apply to browsers

    const handleBeforePopState = ({ as }: { as: string }) => {
      const currentPath = window.location.pathname + window.location.search + window.location.hash;
      
      // If we're currently swiping, prevent navigation
      if (isSwipingRef.current) {
        // Restore the current URL to prevent browser URL change
        window.history.pushState(null, "", currentPath);
        return false; // Prevent navigation
      }
      
      return true; // Allow normal navigation
    };

    // Note: This would need to be adapted for app router vs pages router
    // For now, we'll use the browser history API directly
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;
    
    // Override browser navigation during swipes
    window.addEventListener('popstate', (event) => {
      if (isSwipingRef.current) {
        event.preventDefault();
        event.stopPropagation();
        // Stay on current page
        window.history.forward();
      }
    });

    return () => {
      // Cleanup overrides
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, []);

  const changeTab = useCallback((newDirection: number) => {
    const nextIndex = (currentIndex + newDirection + tabs.length) % tabs.length;
    
    if (controlledIndex !== undefined) {
        onTabChange?.(nextIndex);
    } else {
        const animationDirection = newDirection;
        setInternalIndex([nextIndex, animationDirection]);
        onTabChange?.(nextIndex);
    }
  }, [currentIndex, tabs.length, controlledIndex, onTabChange, internalIndex]);

  // Simplified swipe logic - removed complex preview calculations

  const handlers = useSwipeable({
    onSwipeStart: (eventData: SwipeEventData) => {
      const isBrowser = isBrowserEnvironment();
      const isDesktop = isDesktopBrowser();
      
      if (isBrowser || isDesktop) {
        isSwipingRef.current = true;
        
        // Clear any existing timeout
        if (swipeTimeoutRef.current) {
          clearTimeout(swipeTimeoutRef.current);
        }
      }
    },
    onSwipedLeft: (eventData: SwipeEventData) => {
      if (!swipingEnabled) return;
      
      const isBrowser = isBrowserEnvironment();
      const isDesktop = isDesktopBrowser();
      
      // Simplified swipe detection with consistent behavior across platforms
      if (eventData.velocity > 0.3 && Math.abs(eventData.deltaX) > 50) {
        changeTab(1); // Go to next tab
      }
      
      // Reset swiping state after a short delay
      swipeTimeoutRef.current = setTimeout(() => {
        isSwipingRef.current = false;
      }, 100);
    },
    onSwipedRight: (eventData: SwipeEventData) => {
      if (!swipingEnabled) return;
      
      const isBrowser = isBrowserEnvironment();
      const isDesktop = isDesktopBrowser();
      
      // Simplified swipe detection with consistent behavior across platforms
      if (eventData.velocity > 0.3 && Math.abs(eventData.deltaX) > 50) {
        changeTab(-1); // Go to previous tab
      }
      
      // Reset swiping state after a short delay
      swipeTimeoutRef.current = setTimeout(() => {
        isSwipingRef.current = false;
      }, 100);
    },
    onSwiping: (eventData: SwipeEventData) => {
      const isBrowser = isBrowserEnvironment();
      const isDesktop = isDesktopBrowser();
      
      // Prevent browser navigation during swiping for browsers
      if (isBrowser || isDesktop) {
        const event = eventData.event as TouchEvent | MouseEvent;
        event.preventDefault?.();
        event.stopPropagation?.();
        
        // Ensure swiping state is active
        isSwipingRef.current = true;
      }
      
      // Store the current swipe progress for threshold detection
      swipeThresholdRef.current = Math.abs(eventData.deltaX);
    },
    onTouchEndOrOnMouseUp: () => {
      // Reset swiping state when touch/mouse ends
      swipeTimeoutRef.current = setTimeout(() => {
        isSwipingRef.current = false;
      }, 200);
      
      // Reset swipe threshold
      swipeThresholdRef.current = 0;
    },
    delta: isBrowserEnvironment() || isDesktopBrowser() ? 120 : 80,
    preventScrollOnSwipe: false,
    trackMouse: false,
    trackTouch: true
  });

  if (!tabs.length) {
    return null;
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (swipeTimeoutRef.current) {
        clearTimeout(swipeTimeoutRef.current);
      }
    };
  }, []);

  const activeTabContent = tabs[currentIndex];

  return (
    <div {...handlers} className="relative overflow-hidden w-full h-full flex-grow safe-scroll-area">
      <AnimatePresence initial={false} custom={direction} mode="wait">
        <motion.div
          key={currentIndex}
          role="tabpanel"
          id={panelIds?.[currentIndex]}
          aria-labelledby={tabIds?.[currentIndex]}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: 'spring', stiffness: 300, damping: 30 },
            opacity: { duration: 0.2 },
          }}
          className="absolute w-full h-full overflow-y-auto overflow-x-hidden safe-scroll-area"
        >
          <div className="h-full w-full max-w-full">
            {activeTabContent}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
} 