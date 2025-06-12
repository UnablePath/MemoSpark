'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface TabIndicatorProps {
  count: number;
  activeIndex: number;
  className?: string;
}

export function TabIndicator({ count, activeIndex, className }: TabIndicatorProps) {
  return (
    <div className={`flex justify-center items-center space-x-3 py-2 ${className || ''}`}>
      {Array.from({ length: count }).map((_, index) => (
        <motion.div
          key={index}
          className="w-2.5 h-2.5 rounded-full"
          initial={false}
          animate={{
            backgroundColor: index === activeIndex 
              ? 'hsl(var(--primary))' 
              : 'hsl(var(--muted))',
            scale: index === activeIndex ? 1.2 : 1,
          }}
          transition={{ duration: 0.2 }}
        />
      ))}
    </div>
  );
} 