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

  const currentIndex = controlledIndex !== undefined ? controlledIndex : internalIndex;

  useEffect(() => {
    if (controlledIndex !== undefined && controlledIndex !== internalIndex) {
      const newDirection = controlledIndex > internalIndex ? 1 : -1;
      setInternalIndex([controlledIndex, newDirection]);
    }
  }, [controlledIndex, internalIndex]);

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

  const handlers = useSwipeable({
    onSwipedLeft: () => {
      if (swipingEnabled) {
        changeTab(1);
      }
    },
    onSwipedRight: () => {
      if (swipingEnabled) {
        changeTab(-1);
      }
    },
    delta: 50, // Minimum distance for a swipe to be registered
    preventScrollOnSwipe: true,
    trackMouse: true
  });

  if (!tabs.length) {
    return null;
  }

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