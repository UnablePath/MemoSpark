'use client';

import type React from 'react';
import { useState, Children, isValidElement, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSwipeable, type SwipeEventData } from 'react-swipeable';

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
  const isSwipingRef = useRef(false);
  const swipeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSwipeTimeRef = useRef<number>(0);
  
  // Track swipe state for debouncing fast swipes
  const swipeThresholdRef = useRef<number>(0);

  const currentIndex = controlledIndex !== undefined ? controlledIndex : internalIndex;

  useEffect(() => {
    if (controlledIndex !== undefined && controlledIndex !== internalIndex) {
      const newDirection = controlledIndex > internalIndex ? 1 : -1;
      setInternalIndex([controlledIndex, newDirection]);
    }
  }, [controlledIndex, internalIndex]);

  const changeTab = useCallback((newDirection: number) => {
    // Debounce rapid swipes to prevent tab switching issues
    const now = Date.now();
    const timeSinceLastSwipe = now - lastSwipeTimeRef.current;
    
    // Ignore swipes that are too fast (less than 300ms apart)
    if (timeSinceLastSwipe < 300) {
      console.log('Ignoring rapid swipe, too fast');
      return;
    }
    
    lastSwipeTimeRef.current = now;
    
    const nextIndex = (currentIndex + newDirection + tabs.length) % tabs.length;
    
    console.log(`Changing tab from ${currentIndex} to ${nextIndex} (direction: ${newDirection})`);
    
    if (controlledIndex !== undefined) {
        onTabChange?.(nextIndex);
    } else {
        const animationDirection = newDirection;
        setInternalIndex([nextIndex, animationDirection]);
        onTabChange?.(nextIndex);
    }
  }, [currentIndex, tabs.length, controlledIndex, onTabChange]);

  const handlers = useSwipeable({
    onSwipeStart: (eventData: SwipeEventData) => {
      // Set swiping state to track active swipe
      isSwipingRef.current = true;
      
      // Clear any existing timeout
      if (swipeTimeoutRef.current) {
        clearTimeout(swipeTimeoutRef.current);
      }
      
      console.log('Swipe started');
    },
    onSwipedLeft: (eventData: SwipeEventData) => {
      if (!swipingEnabled) {
        console.log('Swiping disabled, ignoring swipe left');
        return;
      }
      
      // Check velocity and distance thresholds
      const minVelocity = 0.3;
      const minDistance = 50;
      
      if (eventData.velocity > minVelocity && Math.abs(eventData.deltaX) > minDistance) {
        console.log(`Swipe left detected: velocity=${eventData.velocity}, deltaX=${eventData.deltaX}`);
        changeTab(1); // Go to next tab
      } else {
        console.log(`Swipe left ignored: velocity=${eventData.velocity}, deltaX=${eventData.deltaX}`);
      }
      
      // Reset swiping state after a delay
      swipeTimeoutRef.current = setTimeout(() => {
        isSwipingRef.current = false;
      }, 150);
    },
    onSwipedRight: (eventData: SwipeEventData) => {
      if (!swipingEnabled) {
        console.log('Swiping disabled, ignoring swipe right');
        return;
      }
      
      // Check velocity and distance thresholds
      const minVelocity = 0.3;
      const minDistance = 50;
      
      if (eventData.velocity > minVelocity && Math.abs(eventData.deltaX) > minDistance) {
        console.log(`Swipe right detected: velocity=${eventData.velocity}, deltaX=${eventData.deltaX}`);
        changeTab(-1); // Go to previous tab
      } else {
        console.log(`Swipe right ignored: velocity=${eventData.velocity}, deltaX=${eventData.deltaX}`);
      }
      
      // Reset swiping state after a delay
      swipeTimeoutRef.current = setTimeout(() => {
        isSwipingRef.current = false;
      }, 150);
    },
    onSwiping: (eventData: SwipeEventData) => {
      // Just track that we're actively swiping
      // Don't try to call preventDefault on passive listeners
      isSwipingRef.current = true;
      swipeThresholdRef.current = Math.abs(eventData.deltaX);
    },
    onTouchEndOrOnMouseUp: () => {
      // Reset swiping state when touch/mouse ends
      swipeTimeoutRef.current = setTimeout(() => {
        isSwipingRef.current = false;
        swipeThresholdRef.current = 0;
      }, 200);
    },
    // Configuration options
    delta: 60, // Minimum distance before swipe is registered
    preventScrollOnSwipe: true, // This handles preventDefault internally
    trackMouse: false, // Only track touch for mobile
    trackTouch: true, // Enable touch tracking
    swipeDuration: 500, // Maximum time for a swipe
    touchEventOptions: { passive: false }, // Allow preventDefault when needed
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