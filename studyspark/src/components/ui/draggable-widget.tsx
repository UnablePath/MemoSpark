"use client";

import type React from 'react';
import { useState, useEffect, useRef } from 'react';
import { motion, type PanInfo } from 'framer-motion';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import KoalaMascot from './koala-mascot';

interface DraggableWidgetProps {
  task?: {
    title: string;
    dueDate: string;
    priority: 'low' | 'medium' | 'high';
  };
  defaultPosition?: { x: number; y: number };
  onPositionChange?: (position: { x: number; y: number }) => void;
  className?: string;
  onClick?: () => void;
}

const DraggableWidget: React.FC<DraggableWidgetProps> = ({
  task,
  defaultPosition = { x: 0, y: 0 },
  onPositionChange,
  className,
  onClick,
}) => {
  const [position, setPosition] = useState(defaultPosition);
  const constraintsRef = useRef<HTMLDivElement>(null);

  const priorityColors = {
    high: 'bg-red-500',
    medium: 'bg-yellow-500',
    low: 'bg-green-500',
  };

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const newPosition = { x: info.point.x, y: info.point.y };
    setPosition(newPosition);
    if (onPositionChange) {
      onPositionChange(newPosition);
    }
  };

  // Save position to localStorage
  useEffect(() => {
    // Only run in browser environment
    if (typeof window !== 'undefined') {
      const savedPosition = localStorage.getItem('widgetPosition');
      if (savedPosition) {
        try {
          setPosition(JSON.parse(savedPosition));
        } catch (error) {
          console.error('Failed to parse saved widget position', error);
        }
      }
    }
  }, []);

  useEffect(() => {
    // Only run in browser environment
    if (typeof window !== 'undefined') {
      localStorage.setItem('widgetPosition', JSON.stringify(position));
    }
  }, [position]);

  // Set a safe initial position if we're on client side
  const initialPosition = typeof window !== 'undefined'
    ? { x: Math.min(window.innerWidth - 100, position.x), y: Math.min(window.innerHeight - 100, position.y) }
    : position;

  return (
    <div ref={constraintsRef} className="fixed inset-0 pointer-events-none z-40">
      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0.1}
        dragConstraints={constraintsRef}
        initial={initialPosition}
        animate={position}
        onDragEnd={handleDragEnd}
        whileDrag={{ scale: 1.1 }}
        whileHover={{ scale: 1.05 }}
        className={cn(
          "pointer-events-auto cursor-grab active:cursor-grabbing",
          className
        )}
      >
        <div
          onClick={onClick}
          className="rounded-full bg-white shadow-lg p-1 w-24 h-24 flex flex-col items-center justify-center border-4 border-primary overflow-hidden relative"
        >
          {task ? (
            <>
              <div className="absolute top-0 left-0 w-full h-2 bg-secondary" />
              <div className="flex flex-col items-center justify-center h-full px-2">
                <KoalaMascot size={30} className="absolute top-2 opacity-30" />
                <div className="text-center px-2 mt-5">
                  <div className="text-[8px] font-semibold line-clamp-2">{task.title}</div>
                  <div className="text-[6px] text-muted-foreground mt-1">
                    {format(new Date(task.dueDate), 'MMM d')}
                  </div>
                  <div className={`h-1.5 w-1.5 rounded-full mt-1 mx-auto ${priorityColors[task.priority]}`} />
                </div>
              </div>
            </>
          ) : (
            <div className="text-center px-2">
              <div className="text-xs font-semibold">No tasks</div>
              <KoalaMascot size={30} />
            </div>
          )}
          <div className="absolute bottom-1 text-[6px] font-medium">StudySpark</div>
        </div>
      </motion.div>
    </div>
  );
};

export default DraggableWidget;
