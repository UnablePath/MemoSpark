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
  
  // Half-swipe preview state
  const [previewState, setPreviewState] = useState<{
    isPreview: boolean;
    previewIndex: number;
    swipeDirection: number;
    swipeProgress: number;
  }>({
    isPreview: false,
    previewIndex: -1,
    swipeDirection: 0,
    swipeProgress: 0
  });
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Calculate preview progress and determine next tab index
  const calculatePreviewProgress = useCallback((deltaX: number, screenWidth: number) => {
    const swipeDirection = deltaX > 0 ? -1 : 1; // Right swipe = previous tab (-1), Left swipe = next tab (1)
    const absProgress = Math.abs(deltaX) / (screenWidth * 0.3); // 30% of screen width for full preview
    const progress = Math.min(absProgress, 1);
    
    const previewIndex = swipeDirection === 1 
      ? (currentIndex + 1) % tabs.length 
      : (currentIndex - 1 + tabs.length) % tabs.length;
    
    return { swipeDirection, progress, previewIndex };
  }, [currentIndex, tabs.length]);

  // Clear preview state
  const clearPreview = useCallback(() => {
    setPreviewState({
      isPreview: false,
      previewIndex: -1,
      swipeDirection: 0,
      swipeProgress: 0
    });
    
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
      previewTimeoutRef.current = null;
    }
  }, []);

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
      
      const event = eventData.event as TouchEvent | MouseEvent;
      const isBrowser = isBrowserEnvironment();
      const isDesktop = isDesktopBrowser();
      
      // Prevent browser navigation for desktop users
      if (isBrowser || isDesktop) {
        event.preventDefault?.();
        event.stopPropagation?.();
        
        // For browsers, use more restrictive swipe detection
        if (eventData.velocity < 0.3) {
          // Reset swiping state
          isSwipingRef.current = false;
          return;
        }
      }
      
      let startX: number;
      
      if ('touches' in event && event.touches.length > 0) {
        startX = event.touches[0].clientX;
      } else if ('clientX' in event) {
        startX = event.clientX;
      } else {
        if (!isBrowser) changeTab(1);
        // Reset swiping state
        isSwipingRef.current = false;
        return;
      }
      
      const screenWidth = window.innerWidth;
      
      // Adjusted edge detection for different environments
      if (isBrowser || isDesktop) {
        // More restrictive for browsers - require larger screen area engagement
        const isInSwipeZone = startX >= 100 && startX <= screenWidth - 100;
        if (isInSwipeZone && eventData.velocity > 0.5) {
          changeTab(1);
        }
      } else {
        // Original mobile logic - outer edge detection
        const isInOuterEdge = startX <= 70 || startX >= screenWidth - 70;
        if (isInOuterEdge) {
          changeTab(1);
        }
      }
      
      // Reset swiping state after a short delay
      swipeTimeoutRef.current = setTimeout(() => {
        isSwipingRef.current = false;
      }, 100);
    },
    onSwipedRight: (eventData: SwipeEventData) => {
      if (!swipingEnabled) return;
      
      const event = eventData.event as TouchEvent | MouseEvent;
      const isBrowser = isBrowserEnvironment();
      const isDesktop = isDesktopBrowser();
      
      // Prevent browser navigation for desktop users
      if (isBrowser || isDesktop) {
        event.preventDefault?.();
        event.stopPropagation?.();
        
        // For browsers, use more restrictive swipe detection
        if (eventData.velocity < 0.3) {
          // Reset swiping state
          isSwipingRef.current = false;
          return;
        }
      }
      
      let startX: number;
      
      if ('touches' in event && event.touches.length > 0) {
        startX = event.touches[0].clientX;
      } else if ('clientX' in event) {
        startX = event.clientX;
      } else {
        if (!isBrowser) changeTab(-1);
        // Reset swiping state
        isSwipingRef.current = false;
        return;
      }
      
      const screenWidth = window.innerWidth;
      
      // Adjusted edge detection for different environments
      if (isBrowser || isDesktop) {
        // More restrictive for browsers - require larger screen area engagement
        const isInSwipeZone = startX >= 100 && startX <= screenWidth - 100;
        if (isInSwipeZone && eventData.velocity > 0.5) {
          changeTab(-1);
        }
      } else {
        // Original mobile logic - outer edge detection
        const isInOuterEdge = startX <= 70 || startX >= screenWidth - 70;
        if (isInOuterEdge) {
          changeTab(-1);
        }
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
      
      // Half-swipe preview functionality
      if (swipingEnabled && tabs.length > 1) {
        const { deltaX } = eventData;
        const screenWidth = window.innerWidth;
        const minSwipeDistance = 20; // Minimum distance to start preview
        
        if (Math.abs(deltaX) > minSwipeDistance) {
          const { swipeDirection, progress, previewIndex } = calculatePreviewProgress(deltaX, screenWidth);
          
          setPreviewState({
            isPreview: true,
            previewIndex,
            swipeDirection,
            swipeProgress: progress
          });
          
          // Clear any existing preview timeout
          if (previewTimeoutRef.current) {
            clearTimeout(previewTimeoutRef.current);
            previewTimeoutRef.current = null;
          }
        }
      }
    },
    onTouchEndOrOnMouseUp: () => {
      const screenWidth = window.innerWidth;
      const commitThreshold = screenWidth * 0.25; // 25% of screen width to commit to tab switch
      
      // Check if we should commit to the tab switch based on preview progress
      if (previewState.isPreview && previewState.swipeProgress > 0.25) { // Use progress threshold instead
        // Commit to tab change
        changeTab(previewState.swipeDirection);
        clearPreview();
      } else {
        // Snap back to current tab with smooth transition
        previewTimeoutRef.current = setTimeout(() => {
          clearPreview();
        }, 150);
      }
      
      // Reset swiping state when touch/mouse ends
      swipeTimeoutRef.current = setTimeout(() => {
        isSwipingRef.current = false;
      }, 200);
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
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
    };
  }, []);

  // Preview animation variants
  const previewVariants = {
    hidden: { x: '100%', opacity: 0 },
    preview: (progress: number) => ({
      x: `${100 - (progress * 40)}%`, // Slide in up to 40% of screen width
      opacity: 0.3 + (progress * 0.7), // Fade in as it slides
    }),
    visible: { x: 0, opacity: 1 }
  };

  const activeTabContent = tabs[currentIndex];
  const previewTabContent = previewState.isPreview && previewState.previewIndex >= 0 
    ? tabs[previewState.previewIndex] 
    : null;

  return (
    <div {...handlers} className="relative overflow-hidden w-full h-full flex-grow safe-scroll-area">
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        {/* Active Tab Content */}
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
          style={{
            transform: previewState.isPreview 
              ? `translateX(${previewState.swipeDirection === 1 ? -previewState.swipeProgress * 20 : previewState.swipeProgress * 20}%)` 
              : undefined,
            opacity: previewState.isPreview ? 1 - (previewState.swipeProgress * 0.3) : 1
          }}
        >
          <div className="h-full w-full max-w-full">
            {activeTabContent}
          </div>
        </motion.div>

        {/* Preview Tab Content */}
        {previewState.isPreview && previewTabContent && (
          <motion.div
            key={`preview-${previewState.previewIndex}`}
            role="tabpanel"
            custom={previewState.swipeProgress}
            variants={previewVariants}
            initial="hidden"
            animate="preview"
            exit="hidden"
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 40,
              duration: 0.1
            }}
            className="absolute w-full h-full overflow-y-auto overflow-x-hidden safe-scroll-area"
            style={{
              zIndex: previewState.swipeDirection === 1 ? 2 : 0, // Next tab on top, previous tab behind
              transform: previewState.swipeDirection === 1 
                ? `translateX(${100 - (previewState.swipeProgress * 100)}%)` 
                : `translateX(${-100 + (previewState.swipeProgress * 100)}%)`,
              opacity: 0.3 + (previewState.swipeProgress * 0.7)
            }}
          >
            <div className="h-full w-full max-w-full">
              {previewTabContent}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 