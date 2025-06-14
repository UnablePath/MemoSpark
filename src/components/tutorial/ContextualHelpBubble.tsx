'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContextualHelpBubbleProps {
  message: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  targetSelector?: string; // CSS selector for the target element
  isVisible: boolean;
  onDismiss?: () => void;
  autoHide?: boolean;
  autoHideDelay?: number; // in milliseconds
  className?: string;
}

export const ContextualHelpBubble: React.FC<ContextualHelpBubbleProps> = ({
  message,
  position = 'top',
  targetSelector,
  isVisible,
  onDismiss,
  autoHide = true,
  autoHideDelay = 5000,
  className
}) => {
  const [targetElement, setTargetElement] = useState<Element | null>(null);
  const [bubblePosition, setBubblePosition] = useState({ top: 0, left: 0 });
  const [actualPosition, setActualPosition] = useState(position);

  // Find target element and calculate position
  useEffect(() => {
    if (!targetSelector || !isVisible) return;

    const element = document.querySelector(targetSelector);
    if (!element) return;

    setTargetElement(element);

    const calculatePosition = () => {
      const rect = element.getBoundingClientRect();
      const bubbleWidth = 280; // Estimated bubble width
      const bubbleHeight = 80; // Estimated bubble height
      const offset = 12; // Distance from target element

      let top = 0;
      let left = 0;
      let finalPosition = position;

      // Calculate initial position
      switch (position) {
        case 'top':
          top = rect.top - bubbleHeight - offset;
          left = rect.left + rect.width / 2 - bubbleWidth / 2;
          break;
        case 'bottom':
          top = rect.bottom + offset;
          left = rect.left + rect.width / 2 - bubbleWidth / 2;
          break;
        case 'left':
          top = rect.top + rect.height / 2 - bubbleHeight / 2;
          left = rect.left - bubbleWidth - offset;
          break;
        case 'right':
          top = rect.top + rect.height / 2 - bubbleHeight / 2;
          left = rect.right + offset;
          break;
      }

      // Check if bubble would go off-screen and adjust
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Adjust horizontal position
      if (left < 10) {
        left = 10;
      } else if (left + bubbleWidth > viewportWidth - 10) {
        left = viewportWidth - bubbleWidth - 10;
      }

      // Adjust vertical position and flip if needed
      if (top < 10) {
        if (position === 'top') {
          top = rect.bottom + offset;
          finalPosition = 'bottom';
        } else {
          top = 10;
        }
      } else if (top + bubbleHeight > viewportHeight - 10) {
        if (position === 'bottom') {
          top = rect.top - bubbleHeight - offset;
          finalPosition = 'top';
        } else {
          top = viewportHeight - bubbleHeight - 10;
        }
      }

      setBubblePosition({ top, left });
      setActualPosition(finalPosition);
    };

    calculatePosition();

    // Recalculate position on scroll/resize
    const handleReposition = () => calculatePosition();
    window.addEventListener('scroll', handleReposition);
    window.addEventListener('resize', handleReposition);

    return () => {
      window.removeEventListener('scroll', handleReposition);
      window.removeEventListener('resize', handleReposition);
    };
  }, [targetSelector, isVisible, position]);

  // Auto-hide functionality
  useEffect(() => {
    if (!isVisible || !autoHide) return;

    const timer = setTimeout(() => {
      onDismiss?.();
    }, autoHideDelay);

    return () => clearTimeout(timer);
  }, [isVisible, autoHide, autoHideDelay, onDismiss]);

  if (!isVisible) return null;

  // Get arrow classes based on position
  const getArrowClasses = () => {
    const baseClasses = "absolute w-0 h-0";
    
    switch (actualPosition) {
      case 'top':
        return `${baseClasses} bottom-0 left-1/2 -translate-x-1/2 translate-y-full border-l-4 border-r-4 border-t-8 border-transparent border-t-white dark:border-t-gray-800`;
      case 'bottom':
        return `${baseClasses} top-0 left-1/2 -translate-x-1/2 -translate-y-full border-l-4 border-r-4 border-b-8 border-transparent border-b-white dark:border-b-gray-800`;
      case 'left':
        return `${baseClasses} right-0 top-1/2 -translate-y-1/2 translate-x-full border-t-4 border-b-4 border-l-8 border-transparent border-l-white dark:border-l-gray-800`;
      case 'right':
        return `${baseClasses} left-0 top-1/2 -translate-y-1/2 -translate-x-full border-t-4 border-b-4 border-r-8 border-transparent border-r-white dark:border-r-gray-800`;
      default:
        return '';
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: actualPosition === 'top' ? 10 : -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: actualPosition === 'top' ? 10 : -10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={cn(
            "fixed z-50 max-w-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3",
            className
          )}
          style={{
            top: bubblePosition.top,
            left: bubblePosition.left,
          }}
        >
          {/* Arrow pointing to target */}
          <div className={getArrowClasses()} />
          
          {/* Content */}
          <div className="flex items-start gap-2">
            <div className="text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5">
              <HelpCircle className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {message}
              </p>
            </div>
            {onDismiss && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 flex-shrink-0 -mt-1 -mr-1"
                onClick={onDismiss}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          
          {/* Progress indicator for auto-hide */}
          {autoHide && (
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: autoHideDelay / 1000, ease: 'linear' }}
              className="absolute bottom-0 left-0 h-0.5 bg-blue-500 dark:bg-blue-400 rounded-b-lg"
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}; 