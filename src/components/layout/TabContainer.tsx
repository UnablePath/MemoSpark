'use client';

import type React from 'react';
import { useState, Children, isValidElement, useEffect, useCallback } from 'react';
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

  const currentIndex = controlledIndex !== undefined ? controlledIndex : internalIndex;

  useEffect(() => {
    if (controlledIndex !== undefined && controlledIndex !== internalIndex) {
      const newDirection = controlledIndex > internalIndex ? 1 : -1;
      setInternalIndex([controlledIndex, newDirection]);
    }
  }, [controlledIndex, internalIndex]);

  const changeTab = useCallback((newDirection: number) => {
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
    onSwipedLeft: (eventData: SwipeEventData) => {
      if (!swipingEnabled) {
        return;
      }
      
      // Simplified threshold check
      if (eventData.velocity > 0.2 && Math.abs(eventData.deltaX) > 30) {
        changeTab(1); // Go to next tab
      }
    },
    onSwipedRight: (eventData: SwipeEventData) => {
      if (!swipingEnabled) {
        return;
      }
      
      // Simplified threshold check
      if (eventData.velocity > 0.2 && Math.abs(eventData.deltaX) > 30) {
        changeTab(-1); // Go to previous tab
      }
    },
    // Simplified configuration
    delta: 30,
    preventScrollOnSwipe: true,
    trackMouse: false,
    trackTouch: true,
    swipeDuration: 500,
    touchEventOptions: { passive: false },
  });

  if (!tabs.length) {
    return null;
  }

  const activeTabContent = tabs[currentIndex];

  return (
    <div {...handlers} className="relative overflow-hidden w-full h-full flex-grow safe-scroll-area">
      <motion.div
        key={currentIndex}
        role="tabpanel"
        id={panelIds?.[currentIndex]}
        aria-labelledby={tabIds?.[currentIndex]}
        className="w-full h-full overflow-y-auto overflow-x-hidden safe-scroll-area"
        initial={{ opacity: 0, x: direction > 0 ? 20 : -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        <div className="h-full w-full max-w-full">
          {activeTabContent}
        </div>
      </motion.div>
    </div>
  );
} 