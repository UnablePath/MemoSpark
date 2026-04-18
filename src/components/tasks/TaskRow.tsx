'use client';

import type React from 'react';
import { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { formatDueLabel, isOverdue } from '@/lib/tasks/formatting';
import type { Task } from '@/types/taskTypes';

export interface TaskRowProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => Promise<void> | void;
  onToggleCompletion: (taskId: string) => Promise<void> | void;
  compact?: boolean;
  className?: string;
}

const priorityDot: Record<Task['priority'], string> = {
  high: 'bg-destructive',
  medium: 'bg-amber-500 dark:bg-amber-400',
  low: 'bg-primary',
};

const priorityLabel: Record<Task['priority'], string> = {
  high: 'High priority',
  medium: 'Medium priority',
  low: 'Low priority',
};

export const TaskRow: React.FC<TaskRowProps> = memo(({
  task,
  onEdit,
  onDelete,
  onToggleCompletion,
  compact = false,
  className,
}) => {
  const reducedMotion = useReducedMotion();
  const overdue = isOverdue(task.due_date, task.completed);
  const dueLabel = formatDueLabel(task.due_date);

  return (
    <motion.li
      layout={reducedMotion ? false : 'position'}
      initial={reducedMotion ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reducedMotion ? undefined : { opacity: 0, y: -4 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'group relative rounded-xl border border-border/70 bg-card',
        'transition-colors hover:border-primary/40 focus-within:border-primary/60',
        task.completed && 'opacity-70',
        compact ? 'px-3 py-2.5' : 'px-4 py-3',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          id={`task-${task.id}`}
          checked={task.completed}
          onCheckedChange={() => onToggleCompletion(task.id)}
          aria-labelledby={`task-title-${task.id}`}
          className="mt-0.5 shrink-0 transition-transform active:scale-[0.9]"
        />
        <button
          type="button"
          onClick={() => onEdit(task)}
          className="flex-1 min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
          aria-label={`Edit ${task.title}`}
        >
          <div className="flex items-center gap-2">
            <span
              className={cn('h-1.5 w-1.5 rounded-full shrink-0', priorityDot[task.priority])}
              aria-label={priorityLabel[task.priority]}
            />
            <h3
              id={`task-title-${task.id}`}
              className={cn(
                'font-medium leading-snug truncate',
                compact ? 'text-sm' : 'text-[0.95rem]',
                task.completed && 'line-through text-muted-foreground',
              )}
            >
              {task.title}
            </h3>
          </div>
          {task.description && !compact && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2 pl-3.5">
              {task.description}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 pl-3.5 text-xs text-muted-foreground">
            {dueLabel && (
              <span
                className={cn(
                  'tabular-nums font-medium',
                  overdue ? 'text-destructive' : 'text-muted-foreground',
                )}
              >
                {dueLabel}
              </span>
            )}
            {task.subject && (
              <span className="truncate max-w-[12rem]">{task.subject}</span>
            )}
            {task.reminder_settings?.enabled && (
              <span className="inline-flex items-center gap-1">
                <Check className="h-3 w-3" aria-hidden />
                <span>Reminder on</span>
              </span>
            )}
          </div>
        </button>
        <div
          className={cn(
            'flex shrink-0 items-center gap-0.5 transition-opacity',
            'opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100',
          )}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(task)}
            className="h-10 w-10 p-0 active:scale-[0.97] transition-transform sm:h-8 sm:w-8"
            aria-label={`Edit ${task.title}`}
          >
            <Pencil className="h-4 w-4" strokeWidth={1.5} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(task.id)}
            className="h-10 w-10 p-0 hover:bg-destructive/10 hover:text-destructive active:scale-[0.97] transition-transform sm:h-8 sm:w-8"
            aria-label={`Delete ${task.title}`}
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.5} />
          </Button>
        </div>
      </div>
    </motion.li>
  );
});

TaskRow.displayName = 'TaskRow';
