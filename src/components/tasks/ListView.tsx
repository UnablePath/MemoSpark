"use client";

import type React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { formatDueLabel } from '@/lib/tasks/formatting';
import type { Task } from '@/types/taskTypes';

export interface ListViewProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => Promise<void>;
  onToggleCompletion: (taskId: string) => Promise<void>;
}

const priorityBadgeClass = (priority?: Task['priority']) => {
  switch (priority) {
    case 'high':
      return 'text-destructive bg-destructive/10 border border-destructive/20';
    case 'medium':
      return 'text-amber-700 bg-amber-100 border border-amber-200 dark:text-amber-300 dark:bg-amber-900/20 dark:border-amber-800/60';
    case 'low':
      return 'text-primary bg-primary/10 border border-primary/20';
    default:
      return 'text-muted-foreground bg-muted border border-border/60';
  }
};

export const ListView: React.FC<ListViewProps> = ({
  tasks,
  onEdit,
  onDelete,
  onToggleCompletion,
}) => {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <p className="text-lg font-medium">No tasks yet</p>
        <p className="text-sm">Create your first task to get started.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-3" aria-label="Task list">
      {tasks.map((task) => {
        const dueLabel = formatDueLabel(task.due_date);
        return (
          <li key={task.id}>
            <Card className="w-full transition-colors hover:border-primary/40">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <Checkbox
                    id={`task-${task.id}`}
                    checked={task.completed}
                    onCheckedChange={() => onToggleCompletion(task.id)}
                    aria-labelledby={`task-title-${task.id}`}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <h3
                      id={`task-title-${task.id}`}
                      className={cn(
                        'font-medium',
                        task.completed && 'line-through text-muted-foreground',
                      )}
                    >
                      {task.title}
                    </h3>
                    {task.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {task.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {task.priority && (
                        <span
                          className={cn(
                            'px-2 py-0.5 text-xs font-medium rounded-full',
                            priorityBadgeClass(task.priority),
                          )}
                        >
                          {task.priority}
                        </span>
                      )}
                      {task.subject && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-muted text-muted-foreground border border-border/60">
                          {task.subject}
                        </span>
                      )}
                      {dueLabel && (
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {dueLabel}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(task)}
                      className="h-8 w-8 p-0 active:scale-[0.97] transition-transform"
                      aria-label={`Edit ${task.title}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(task.id)}
                      className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive active:scale-[0.97] transition-transform"
                      aria-label={`Delete ${task.title}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </li>
        );
      })}
    </ul>
  );
};
