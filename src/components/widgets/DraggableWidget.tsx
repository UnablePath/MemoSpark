'use client';

import type React from 'react';
import { motion, type PanInfo, useReducedMotion } from 'framer-motion';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { cn } from "@/lib/utils";
import { Expand } from 'lucide-react';
import { format } from "date-fns";
import { StuLottieAnimation } from '@/components/stu/StuLottieAnimation';
import { useState } from 'react';

interface DraggableWidgetProps {
  widgetId: string;
  initialPosition?: { x: number; y: number };
  dragConstraintsRef?: React.RefObject<HTMLDivElement | null>;
  className?: string;
  initialWidth?: number;
  initialHeight?: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

const DEFAULT_WIDTH = 180;
const DEFAULT_HEIGHT = 120;
const MIN_WIDTH = 120;
const MIN_HEIGHT = 100;
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
  const [isAnimating, setIsAnimating] = useState(false);

  const prefersReducedMotion = useReducedMotion();

  const shapeClasses = {
    square: 'rounded-none aspect-square',
    rounded: 'rounded-xl',
    pill: 'rounded-full',
  };

  const handleResize = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const newWidth = Math.max(minWidth, Math.min(maxWidth, size.width + info.delta.x));
    const newHeight = Math.max(minHeight, Math.min(maxHeight, size.height + info.delta.y));
    setSize({ width: newWidth, height: newHeight });
  };

  const handleStuClick = () => {
    setIsAnimating(true);
    // Reset animation after 3 seconds
    setTimeout(() => {
      setIsAnimating(false);
    }, 3000);
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
        'bg-card/90 dark:bg-card/80 backdrop-blur-md',
        'shadow-xl border-2 border-primary/30 dark:border-primary/40',
        'overflow-hidden transition-all duration-300',
        shapeClasses[shape as keyof typeof shapeClasses] || shapeClasses.rounded,
        className
      )}
    >
      <div className="h-full w-full flex flex-col p-3">
        {/* Header with Stu */}
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-bold text-primary">MemoSpark</div>
          <div 
            className="w-8 h-8 cursor-pointer hover:scale-110 transition-transform"
            onClick={handleStuClick}
          >
            {isAnimating ? (
              <StuLottieAnimation
                className="w-full h-full"
                loop={false}
                autoplay={true}
                onComplete={() => setIsAnimating(false)}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                🐨
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col justify-center">
          {latestReminder ? (
            <div className="text-center space-y-1">
              <div className={`h-1 w-full rounded-full ${priorityColors[getPriority(latestReminder)]}`} />
              <div className="text-xs font-semibold line-clamp-2 text-foreground">
                {latestReminder.taskName}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {latestReminder.dueDate}
              </div>
              <div className="text-[10px] font-medium text-primary">
                +{latestReminder.points} pts
              </div>
            </div>
          ) : (
            <div className="text-center space-y-1">
              <div className="text-xs font-semibold text-green-600">All Clear!</div>
              <div className="text-[10px] text-muted-foreground">No urgent tasks</div>
              <div className="text-lg">✅</div>
            </div>
          )}
        </div>
      </div>
      
      {/* Resize handle */}
      <motion.div
        drag
        dragMomentum={false}
        onDrag={handleResize}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute bottom-0 right-0 cursor-nwse-resize p-1 text-muted-foreground/50 hover:text-foreground opacity-0 hover:opacity-100 transition-opacity"
        aria-label="Resize widget"
      >
        <Expand size={12} />
      </motion.div>
    </motion.div>
  );
} 