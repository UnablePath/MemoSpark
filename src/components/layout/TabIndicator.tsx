'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface TabIndicatorProps {
  count: number;
  activeIndex: number;
}

export function TabIndicator({ count, activeIndex }: TabIndicatorProps) {
  return (
    <div className="flex justify-center items-center space-x-3 py-2">
      {Array.from({ length: count }).map((_, index) => (
        <motion.div
          key={index}
          className="w-2.5 h-2.5 rounded-full"
          initial={false}
          animate={{
            backgroundColor: index === activeIndex ? '#3b82f6' /* blue-500 */ : '#d1d5db' /* gray-300 */,
            scale: index === activeIndex ? 1.2 : 1,
          }}
          transition={{ duration: 0.2 }}
        />
      ))}
    </div>
  );
} 