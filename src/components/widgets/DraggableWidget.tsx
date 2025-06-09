'use client';

import type React from 'react';
import { motion, type PanInfo, useReducedMotion } from 'framer-motion';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { cn } from "@/lib/utils";
import { Expand } from 'lucide-react';
import { format } from "date-fns";

interface DraggableWidgetProps {
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

// Reminder type and mockReminders from RemindersTab
export interface Reminder {
  id: string;
  taskName: string;
  dueDate: string;
  completed: boolean;
  points: number;
}

const mockReminders: Reminder[] = [
  {
    id: "1",
    taskName: "Math Assignment",
    dueDate: format(new Date(new Date().setHours(14, 30)), "p, MMM d"),
    completed: false,
    points: 10,
  },
  {
    id: "2",
    taskName: "Study Group Meeting",
    dueDate: format(new Date(new Date().setHours(16, 0)), "p, MMM d"),
    completed: false,
    points: 5,
  },
  {
    id: "3",
    taskName: "Physics Lab Report",
    dueDate: "Tomorrow, 11:59 PM",
    completed: false,
    points: 15,
  },
];

export function DraggableWidget({
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

  // Find the latest uncompleted reminder
  const latestReminder = mockReminders.find(r => !r.completed) || null;

  // Widget visual style (from Widget.tsx)
  const priorityColors: Record<string, string> = {
    high: "bg-red-500",
    medium: "bg-yellow-500",
    low: "bg-green-500",
  };

  // For demo, assign priority based on points (10+ = high, 5+ = medium, else low)
  const getPriority = (reminder: Reminder) => {
    if (reminder.points >= 10) return "high";
    if (reminder.points >= 5) return "medium";
    return "low";
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
      <div className="h-full w-full flex items-center justify-center p-2">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={cn(
            "rounded-full bg-white shadow-lg p-1 max-w-[120px] aspect-square flex flex-col items-center justify-center border-4 border-primary overflow-hidden relative",
            // Optionally add more classes for responsiveness
          )}
        >
          {latestReminder ? (
            <>
              <div className="absolute top-0 left-0 w-full h-2 bg-secondary" />
              <div className="text-center px-2">
                <div className="text-xs font-semibold line-clamp-2">{latestReminder.taskName}</div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  {latestReminder.dueDate}
                </div>
                <div className={`h-1.5 w-1.5 rounded-full mt-1 mx-auto ${priorityColors[getPriority(latestReminder)]}`} />
              </div>
            </>
          ) : (
            <div className="text-center px-2">
              <div className="text-xs font-semibold">No urgent tasks</div>
              <div className="text-[10px] text-muted-foreground mt-1">All caught up!</div>
            </div>
          )}
          <div className="absolute bottom-2 text-[8px] font-medium">MemoSpark</div>
        </motion.div>
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