'use client';

import React from 'react'; // Removed useState as it's handled by useLocalStorage
import { motion } from 'framer-motion';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { cn } from "@/lib/utils"; // Import cn utility

interface DraggableWidgetProps {
  children: React.ReactNode;
  widgetId: string;
  initialPosition?: { x: number; y: number };
  dragConstraintsRef?: React.RefObject<HTMLElement>;
  className?: string;
}

export function DraggableWidget({
  children,
  widgetId,
  initialPosition = { x: 50, y: 50 },
  dragConstraintsRef,
  className,
}: DraggableWidgetProps) {
  const posStorageKey = `widget-pos-${widgetId}`;
  const shapeStorageKey = 'dashboard-widget-shape'; // Key for the shape setting

  const [position, setPosition] = useLocalStorage(posStorageKey, initialPosition);
  const [shape] = useLocalStorage(shapeStorageKey, 'rounded'); // Read shape setting

  // Define shape classes based on the setting
  const shapeClasses = {
    square: 'rounded-none aspect-square',
    rounded: 'rounded-lg', // Default
    pill: 'rounded-full',
  };

  return (
    <motion.div
      drag
      dragConstraints={dragConstraintsRef}
      dragElastic={0.1}
      dragMomentum={false}
      style={{ x: position.x, y: position.y }}
      onDragEnd={(event, info) => {
        setPosition({ x: info.point.x, y: info.point.y });
        console.log(`Widget ${widgetId} dragged to:`, info.point);
      }}
      // Combine base classes, dynamic shape class, and passed className
      className={cn(
        'absolute z-50 cursor-grab active:cursor-grabbing bg-card text-card-foreground p-2 shadow-lg border-2 border-green-500/80',
        shapeClasses[shape as keyof typeof shapeClasses] || shapeClasses.rounded, // Apply shape class
        className // Apply any additional classes passed as props
      )}
    >
      <div className="flex items-center justify-center h-full w-full">
        {children}
      </div>
    </motion.div>
  );
} 