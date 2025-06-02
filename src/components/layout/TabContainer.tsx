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

  const currentIndex = controlledIndex !== undefined ? controlledIndex : internalIndex;

  useEffect(() => {
    if (controlledIndex !== undefined && controlledIndex !== internalIndex) {
      const newDirection = controlledIndex > internalIndex ? 1 : -1;
      setInternalIndex([controlledIndex, newDirection]);
    }
  }, [controlledIndex, internalIndex]);

  // Debounced tab change to prevent rapid fire swipes
  const changeTab = useCallback((newDirection: number) => {
    // Prevent multiple rapid swipes
    if (isSwipingRef.current) return;
    
    isSwipingRef.current = true;
    
    // Clear any existing timeout
    if (swipeTimeoutRef.current) {
      clearTimeout(swipeTimeoutRef.current);
    }

    const nextIndex = (currentIndex + newDirection + tabs.length) % tabs.length;
    
    if (controlledIndex !== undefined) {
        onTabChange?.(nextIndex);
    } else {
        const animationDirection = nextIndex > internalIndex ? 1 : (nextIndex < internalIndex ? -1 : 0);
        setInternalIndex([nextIndex, animationDirection]);
        onTabChange?.(nextIndex);
    }

    // Reset swipe lock after animation completes
    swipeTimeoutRef.current = setTimeout(() => {
      isSwipingRef.current = false;
    }, 400); // Slightly longer than animation duration
  }, [currentIndex, tabs.length, controlledIndex, onTabChange, internalIndex]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (swipeTimeoutRef.current) {
        clearTimeout(swipeTimeoutRef.current);
      }
    };
  }, []);

  // Expand edge threshold by 10% as requested
  const edgeThresholdPx = 55; // Increased from 50 to 55 (10% increase)

  const handlers = useSwipeable({
    onSwipedLeft: (eventData: SwipeEventData) => {
      if (!swipingEnabled || isSwipingRef.current) return;
      
      const containerWidth = (eventData.event.currentTarget as HTMLElement)?.offsetWidth;
      if (!containerWidth) return;
      
      // More lenient swipe detection - increased area by 10%
      const swipeThreshold = containerWidth * 0.1; // 10% of container width
      if (eventData.initial[0] > containerWidth - (edgeThresholdPx + swipeThreshold)) {
        changeTab(1);
      }
    },
    onSwipedRight: (eventData: SwipeEventData) => {
      if (!swipingEnabled || isSwipingRef.current) return;
      
      const containerWidth = (eventData.event.currentTarget as HTMLElement)?.offsetWidth;
      if (!containerWidth) return;
      
      // More lenient swipe detection - increased area by 10%
      const swipeThreshold = containerWidth * 0.1; // 10% of container width
      if (eventData.initial[0] < edgeThresholdPx + swipeThreshold) {
        changeTab(-1);
      }
    },
    // Add swipe distance threshold to improve detection
    delta: 10, // Minimum distance for swipe
    preventScrollOnSwipe: true,
    trackMouse: true
  });

  if (!tabs.length) {
    return null;
  }

  const activeTabContent = tabs[currentIndex];

  return (
    <div {...handlers} className="relative overflow-hidden w-full h-full flex-grow">
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
          className="absolute w-full h-full"
          // Prevent content from being interactable during transition
          style={{ 
            pointerEvents: isSwipingRef.current ? 'none' : 'auto'
          }}
        >
          {activeTabContent}
        </motion.div>
      </AnimatePresence>
    </div>
  );
} 