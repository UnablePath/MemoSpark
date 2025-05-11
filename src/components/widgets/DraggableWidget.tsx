'use client';

import React from 'react';
import { motion, PanInfo, useReducedMotion } from 'framer-motion';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { cn } from "@/lib/utils";
import { Expand } from 'lucide-react';

interface DraggableWidgetProps {
  children: React.ReactNode;
  widgetId: string;
  initialPosition?: { x: number; y: number };
  dragConstraintsRef?: React.RefObject<HTMLElement>;
  className?: string;
  initialWidth?: number;
  initialHeight?: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

const DEFAULT_WIDTH = 150;
const DEFAULT_HEIGHT = 100;
const MIN_WIDTH = 100;
const MIN_HEIGHT = 80;
const MAX_WIDTH = 500;
const MAX_HEIGHT = 400;

export function DraggableWidget({
  children,
  widgetId,
  initialPosition = { x: 50, y: 50 },
  dragConstraintsRef,
  className,
  initialWidth = DEFAULT_WIDTH,
  initialHeight = DEFAULT_HEIGHT,
  minWidth = MIN_WIDTH,
  minHeight = MIN_HEIGHT,
  maxWidth = MAX_WIDTH,
  maxHeight = MAX_HEIGHT,
}: DraggableWidgetProps) {
  const posStorageKey = `widget-pos-${widgetId}`;
  const shapeStorageKey = 'dashboard-widget-shape';
  const sizeStorageKey = `widget-size-${widgetId}`;

  const [position, setPosition] = useLocalStorage(posStorageKey, initialPosition);
  const [shape] = useLocalStorage(shapeStorageKey, 'rounded');
  const [size, setSize] = useLocalStorage(sizeStorageKey, {
    width: initialWidth,
    height: initialHeight,
  });

  const prefersReducedMotion = useReducedMotion();

  const shapeClasses = {
    square: 'rounded-none aspect-square',
    rounded: 'rounded-lg',
    pill: 'rounded-full',
  };

  const handleResize = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const newWidth = Math.max(minWidth, Math.min(maxWidth, size.width + info.delta.x));
    const newHeight = Math.max(minHeight, Math.min(maxHeight, size.height + info.delta.y));
    setSize({ width: newWidth, height: newHeight });
  };

  return (
    <motion.div
      drag
      dragConstraints={dragConstraintsRef}
      dragElastic={prefersReducedMotion ? 0 : 0.3}
      dragMomentum={false}
      style={{
        x: position.x,
        y: position.y,
        width: `${size.width}px`,
        height: `${size.height}px`,
      }}
      onDragEnd={(event, info) => {
        setPosition({ x: info.point.x, y: info.point.y });
      }}
      className={cn(
        'absolute z-50 cursor-grab active:cursor-grabbing',
        'bg-card/80 dark:bg-card/70 backdrop-blur-sm',
        'shadow-lg border border-green-500/60 dark:border-green-400/50',
        'overflow-hidden',
        shapeClasses[shape as keyof typeof shapeClasses] || shapeClasses.rounded,
        className
      )}
    >
      <div className="h-full w-full p-2 overflow-auto">
        {children}
      </div>

      <motion.div
        drag
        dragMomentum={false}
        onDrag={handleResize}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute bottom-0 right-0 cursor-nwse-resize p-1 text-muted-foreground/50 hover:text-foreground"
        aria-label="Resize widget"
      >
        <Expand size={16} />
      </motion.div>
    </motion.div>
  );
} 