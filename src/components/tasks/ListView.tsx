"use client";

import type React from 'react';
import { useState, useMemo, useCallback } from 'react';
import { format, formatDistance, isPast, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { toast } from 'sonner';
import { 
  CheckCircle2, 
  Circle, 
  Calendar, 
  Clock, 
  User, 
  BookOpen, 
  Target,
  Filter,
  SortAsc,
  SortDesc,
  MoreHorizontal,
  Edit,
  Trash2,
  Repeat
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useFetchTasks, useToggleTaskCompletion, useDeleteTask } from '@/hooks/useTaskQueries';
import { 
  expandRecurringTasks, 
  isRecurringInstance, 
  isMasterRecurringTask,
  getRecurrenceDescription 
} from '@/lib/recurrence';
import type { Task, TaskFilters, Priority, TaskType } from '@/types/taskTypes';

type SortField = 'due_date' | 'priority' | 'title' | 'created_at';
type SortDirection = 'asc' | 'desc';

interface ListViewProps {
  onEditTask?: (taskId: string) => void;
  className?: string;
}

const PRIORITY_COLORS: Record<Priority, string> = {
  low: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-800',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-200 dark:border-yellow-800',
  high: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-200 dark:border-red-800',
};

const TYPE_ICONS: Record<TaskType, React.ComponentType<{ className?: string }>> = {
  academic: BookOpen,
  personal: User,
  event: Calendar,
};

const PRIORITY_ORDER: Record<Priority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Low Priority',
  medium: 'Medium Priority', 
  high: 'High Priority',
};

const TYPE_LABELS: Record<TaskType, string> = {
  academic: 'Academic Task',
  personal: 'Personal Task',
  event: 'Event',
};

export const ListView: React.FC<ListViewProps> = ({ onEditTask, className }) => {
  // Filtering and sorting state
  const [filters, setFilters] = useState<TaskFilters>({});
  const [sortField, setSortField] = useState<SortField>('due_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Fetch tasks with current filters
  const { data: rawTasks = [], isLoading, error, isError } = useFetchTasks(filters);

  // Expand recurring tasks for the next 3 months
  const tasks = useMemo(() => {
    const startDate = new Date();
    const endDate = addMonths(startDate, 3);
    return expandRecurringTasks(rawTasks, startDate, endDate);
  }, [rawTasks]);

  // Mutations
  const toggleCompletion = useToggleTaskCompletion();
  const deleteTask = useDeleteTask();

  // Handle completion toggle with optimistic updates
  const handleToggleCompletion = useCallback(async (task: Task) => {
    try {
      await toggleCompletion.mutateAsync(task.id);
      toast.success(
        task.completed 
          ? 'Task marked as incomplete' 
          : 'Task completed successfully!'
      );
    } catch (error) {
      toast.error('Failed to update task completion');
    }
  }, [toggleCompletion]);

  // Handle task deletion
  const handleDeleteTask = useCallback(async (taskId: string) => {
    try {
      await deleteTask.mutateAsync(taskId);
      toast.success('Task deleted successfully');
    } catch (error) {
      toast.error('Failed to delete task');
    }
  }, [deleteTask]);

  // Sorting and filtering logic
  const sortedAndFilteredTasks = useMemo(() => {
    if (!tasks.length) return [];

    let filteredTasks = [...tasks];

    // Client-side filtering (in addition to server-side filters)
    if (filters.completed !== undefined) {
      filteredTasks = filteredTasks.filter(task => task.completed === filters.completed);
    }

    // Sort tasks
    filteredTasks.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'due_date':
          const aDate = a.due_date ? new Date(a.due_date).getTime() : Number.POSITIVE_INFINITY;
          const bDate = b.due_date ? new Date(b.due_date).getTime() : Number.POSITIVE_INFINITY;
          comparison = aDate - bDate;
          break;
        case 'priority':
          comparison = PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        default:
          comparison = 0;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filteredTasks;
  }, [tasks, filters, sortField, sortDirection]);

  // Handle filter changes
  const handleFilterChange = useCallback((key: keyof TaskFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? undefined : value,
    }));
  }, []);

  // Handle sort changes
  const handleSortChange = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField]);

  // Render task item
  const renderTaskItem = useCallback((task: Task) => {
    const TypeIcon = TYPE_ICONS[task.type];
    const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !task.completed;

    return (
      <Card 
        key={task.id} 
        className={cn(
          "transition-all duration-200 hover:shadow-md border border-border",
          task.completed && "opacity-60",
          isOverdue && "border-red-200 bg-red-50/30 dark:border-red-800 dark:bg-red-950/20"
        )}
        role="article"
        aria-labelledby={`task-title-${task.id}`}
        aria-describedby={`task-meta-${task.id}`}
      >
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-start gap-3">
            {/* Completion toggle */}
            <Button
              variant="ghost"
              size="sm"
              className="p-0 h-6 w-6 hover:bg-transparent flex-shrink-0 mt-0.5"
              onClick={() => handleToggleCompletion(task)}
              disabled={toggleCompletion.isPending}
              aria-label={
                task.completed 
                  ? `Mark "${task.title}" as incomplete` 
                  : `Mark "${task.title}" as complete`
              }
            >
              {task.completed ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground hover:text-green-600 dark:hover:text-green-400" />
              )}
            </Button>

            {/* Task content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 
                      id={`task-title-${task.id}`}
                      className={cn(
                        "font-medium text-sm sm:text-base leading-5 break-words flex-1",
                        task.completed && "line-through text-muted-foreground"
                      )}
                    >
                      {task.title}
                    </h3>
                    {(isMasterRecurringTask(task) || isRecurringInstance(task)) && (
                      <Repeat 
                        className="h-3 w-3 text-muted-foreground flex-shrink-0" 
                        aria-label="Recurring task"
                      />
                    )}
                  </div>
                  {task.description && (
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2 break-words leading-relaxed">
                      {task.description}
                    </p>
                  )}
                </div>

                {/* Actions dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      onClick={() => onEditTask?.(task.id)}
                      className="cursor-pointer"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleDeleteTask(task.id)}
                      className="cursor-pointer text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Task metadata */}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {/* Type badge */}
                <Badge variant="outline" className="text-xs">
                  <TypeIcon className="h-3 w-3 mr-1" />
                  {task.type}
                </Badge>

                {/* Priority badge */}
                <Badge 
                  variant="outline" 
                  className={cn("text-xs", PRIORITY_COLORS[task.priority])}
                >
                  <Target className="h-3 w-3 mr-1" />
                  {task.priority}
                </Badge>

                {/* Subject badge */}
                {task.subject && (
                  <Badge variant="secondary" className="text-xs">
                    {task.subject}
                  </Badge>
                )}

                {/* Due date */}
                {task.due_date && (
                  <div className={cn(
                    "flex items-center gap-1 text-xs",
                    isOverdue ? "text-red-600" : "text-muted-foreground"
                  )}>
                    <Clock className="h-3 w-3" />
                    <span>
                      {formatDistance(new Date(task.due_date), new Date(), { addSuffix: true })}
                    </span>
                    <span className="text-muted-foreground">
                      ({format(new Date(task.due_date), 'MMM d, yyyy')})
                    </span>
                  </div>
                )}

                {/* Recurrence indicator for master recurring tasks */}
                {isMasterRecurringTask(task) && task.recurrence_rule && (
                  <Badge variant="secondary" className="text-xs">
                    <Repeat className="h-3 w-3 mr-1" />
                    {getRecurrenceDescription(task.recurrence_rule)}
                  </Badge>
                )}

                {/* Instance indicator for recurring instances */}
                {isRecurringInstance(task) && (
                  <Badge variant="outline" className="text-xs text-blue-600 border-blue-200">
                    <Repeat className="h-3 w-3 mr-1" />
                    Recurring instance
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }, [handleToggleCompletion, handleDeleteTask, onEditTask, toggleCompletion.isPending]);

  // Loading skeleton
  const renderSkeleton = () => (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="h-5 w-5 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-20" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  // Empty state
  const renderEmptyState = () => (
    <Card>
      <CardContent className="p-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="rounded-full bg-muted p-4">
            <Calendar className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-medium text-lg">No tasks found</h3>
            <p className="text-muted-foreground">
              {Object.keys(filters).length > 0 
                ? "Try adjusting your filters to see more tasks."
                : "Create your first task to get started."
              }
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isError) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="text-red-600">
            <h3 className="font-medium">Error loading tasks</h3>
            <p className="text-sm mt-1">
              {error?.message || 'Something went wrong. Please try again.'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Filters and sorting controls */}
      <div className="flex flex-col sm:flex-row gap-4 p-4 bg-muted/30 rounded-lg">
        <div className="flex flex-wrap gap-2 flex-1">
          {/* Completion filter */}
          <Select 
            value={filters.completed === undefined ? 'all' : String(filters.completed)} 
            onValueChange={(value) => handleFilterChange('completed', value === 'all' ? undefined : value === 'true')}
          >
            <SelectTrigger className="w-32">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tasks</SelectItem>
              <SelectItem value="false">Pending</SelectItem>
              <SelectItem value="true">Completed</SelectItem>
            </SelectContent>
          </Select>

          {/* Type filter */}
          <Select 
            value={filters.type || 'all'} 
            onValueChange={(value) => handleFilterChange('type', value)}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="academic">Academic</SelectItem>
              <SelectItem value="personal">Personal</SelectItem>
              <SelectItem value="event">Event</SelectItem>
            </SelectContent>
          </Select>

          {/* Priority filter */}
          <Select 
            value={filters.priority || 'all'} 
            onValueChange={(value) => handleFilterChange('priority', value)}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sort controls */}
        <div className="flex gap-2">
          <Select 
            value={sortField} 
            onValueChange={(value: SortField) => setSortField(value)}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="due_date">Due Date</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
              <SelectItem value="title">Title</SelectItem>
              <SelectItem value="created_at">Created</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSortChange(sortField)}
            className="px-3"
          >
            {sortDirection === 'asc' ? (
              <SortAsc className="h-4 w-4" />
            ) : (
              <SortDesc className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Task list */}
      <div className="space-y-3">
        {isLoading ? (
          renderSkeleton()
        ) : sortedAndFilteredTasks.length === 0 ? (
          renderEmptyState()
        ) : (
          sortedAndFilteredTasks.map(renderTaskItem)
        )}
      </div>

      {/* Task count */}
      {!isLoading && sortedAndFilteredTasks.length > 0 && (
        <div className="text-center text-sm text-muted-foreground">
          Showing {sortedAndFilteredTasks.length} task{sortedAndFilteredTasks.length !== 1 ? 's' : ''}
          {Object.keys(filters).length > 0 && ` (filtered)`}
        </div>
      )}
    </div>
  );
}; 