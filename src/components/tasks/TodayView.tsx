'use client';

import type React from 'react';
import { useMemo, useState, useRef, lazy, Suspense } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { parseISO, isToday, isBefore, startOfDay, format } from 'date-fns';
import {
  Calendar as CalendarIcon,
  Plus,
  ChevronDown,
  ListTodo,
  GraduationCap,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { TaskRow } from './TaskRow';
import { StuNudge } from './StuNudge';
import {
  timeOfDayFor,
  timeOfDayLabel,
  type TimeOfDay,
} from '@/lib/tasks/formatting';
import type { Task } from '@/types/taskTypes';
import type { AISuggestion } from '@/types/ai';

const SmartScheduleView = lazy(() =>
  import('@/components/scheduling/SmartScheduleView').then((m) => ({
    default: m.SmartScheduleView,
  })),
);

export interface TodayViewProps {
  tasks: Task[];
  suggestions: AISuggestion[];
  userFirstName?: string;
  tierBadge?: { tier: 'free' | 'premium' | 'enterprise'; remaining: number } | null;
  isLoading?: boolean;
  onCreateTask: () => void;
  onQuickCreate?: (title: string) => Promise<void> | void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => Promise<void> | void;
  onToggleCompletion: (taskId: string) => Promise<void> | void;
  onAcceptSuggestion: (suggestion: AISuggestion) => void | Promise<void>;
  onDismissSuggestion: (suggestion: AISuggestion) => void | Promise<void>;
  /** Navigate to calendar / timetable or open class form from quick capture “More options”. */
  onGoToCalendar?: () => void;
  onGoToTimetable?: () => void;
  onAddTimetableClass?: () => void;
}

interface GroupedTasks {
  overdue: Task[];
  morning: Task[];
  afternoon: Task[];
  evening: Task[];
  later: Task[];
}

function groupTasks(tasks: Task[]): GroupedTasks {
  const groups: GroupedTasks = {
    overdue: [],
    morning: [],
    afternoon: [],
    evening: [],
    later: [],
  };
  const todayStart = startOfDay(new Date());
  for (const task of tasks) {
    if (task.completed) continue;
    if (!task.due_date) {
      groups.later.push(task);
      continue;
    }
    const due = parseISO(task.due_date);
    if (Number.isNaN(due.getTime())) {
      groups.later.push(task);
      continue;
    }
    if (isBefore(due, todayStart)) {
      groups.overdue.push(task);
      continue;
    }
    if (isToday(due)) {
      const bucket = timeOfDayFor(task.due_date);
      if (bucket === 'overdue' || bucket === 'later') {
        groups.later.push(task);
      } else {
        groups[bucket].push(task);
      }
    }
  }
  const sortByDue = (a: Task, b: Task) => {
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return parseISO(a.due_date).getTime() - parseISO(b.due_date).getTime();
  };
  groups.overdue.sort(sortByDue);
  groups.morning.sort(sortByDue);
  groups.afternoon.sort(sortByDue);
  groups.evening.sort(sortByDue);
  groups.later.sort(sortByDue);
  return groups;
}

function greeting(hour: number, name?: string): string {
  const who = name ? `, ${name}` : '';
  if (hour < 5) return `Still up${who}?`;
  if (hour < 12) return `Good morning${who}`;
  if (hour < 17) return `Good afternoon${who}`;
  if (hour < 22) return `Good evening${who}`;
  return `Winding down${who}`;
}

function QuickCapture({
  onSubmit,
  onOpenFullTask,
  onGoToCalendar,
  onGoToTimetable,
  onAddTimetableClass,
  onShowSuggestedSchedule,
  showSuggestedScheduleOption,
}: {
  onSubmit: (title: string) => Promise<void> | void;
  onOpenFullTask: () => void;
  onGoToCalendar?: () => void;
  onGoToTimetable?: () => void;
  onAddTimetableClass?: () => void;
  onShowSuggestedSchedule?: () => void;
  showSuggestedScheduleOption?: boolean;
}) {
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(trimmed);
      setValue('');
      inputRef.current?.focus();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        'flex flex-col gap-2 rounded-xl border border-border/70 bg-card/95 px-3 py-2.5 shadow-sm',
        'focus-within:border-primary/50 sm:flex-row sm:items-center sm:gap-2 sm:py-2',
        'backdrop-blur-[2px] transition-colors',
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Plus
          className="h-4 w-4 shrink-0 text-muted-foreground"
          strokeWidth={1.75}
          aria-hidden
        />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Add a task, then press Enter to save"
          className={cn(
            'min-w-0 flex-1 bg-transparent text-base leading-normal placeholder:text-muted-foreground sm:text-sm',
            'focus:outline-none',
          )}
          aria-label="Quick capture task title"
          disabled={submitting}
          enterKeyHint="done"
        />
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              'flex h-11 w-full shrink-0 items-center justify-center gap-1 rounded-md px-3 text-xs font-medium text-muted-foreground',
              'hover:bg-muted hover:text-foreground sm:h-auto sm:w-auto sm:justify-start sm:px-2 sm:py-1',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'data-[state=open]:bg-muted data-[state=open]:text-foreground',
              'touch-manipulation active:scale-[0.99]',
            )}
            aria-label="More capture options"
          >
            More options
            <ChevronDown className="h-3 w-3 opacity-70" strokeWidth={2} aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            Add or navigate
          </DropdownMenuLabel>
          <DropdownMenuItem onClick={onOpenFullTask}>
            <ListTodo className="mr-2 h-4 w-4" strokeWidth={1.75} />
            Task with all fields
          </DropdownMenuItem>
          {onGoToCalendar && (
            <DropdownMenuItem onClick={onGoToCalendar}>
              <CalendarIcon className="mr-2 h-4 w-4" strokeWidth={1.75} />
              Open calendar
            </DropdownMenuItem>
          )}
          {onGoToTimetable && (
            <DropdownMenuItem onClick={onGoToTimetable}>
              <Clock className="mr-2 h-4 w-4" strokeWidth={1.75} />
              Open timetable
            </DropdownMenuItem>
          )}
          {onAddTimetableClass && (
            <DropdownMenuItem onClick={onAddTimetableClass}>
              <GraduationCap className="mr-2 h-4 w-4" strokeWidth={1.75} />
              Add a class
            </DropdownMenuItem>
          )}
          {showSuggestedScheduleOption && onShowSuggestedSchedule && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onShowSuggestedSchedule}>
                <CalendarIcon className="mr-2 h-4 w-4" strokeWidth={1.75} />
                Show suggested time blocks
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </form>
  );
}

function TaskGroup({
  label,
  tasks,
  onEdit,
  onDelete,
  onToggleCompletion,
  tone = 'default',
}: {
  label: string;
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => Promise<void> | void;
  onToggleCompletion: (taskId: string) => Promise<void> | void;
  tone?: 'default' | 'warning';
}) {
  if (tasks.length === 0) return null;
  return (
    <section className="space-y-2" aria-label={label}>
      <div className="flex items-center gap-2 px-1">
        <h3
          className={cn(
            'text-[0.72rem] font-semibold tracking-[0.14em] uppercase',
            tone === 'warning' ? 'text-destructive' : 'text-muted-foreground',
          )}
        >
          {label}
        </h3>
        <span className="text-xs text-muted-foreground tabular-nums">
          {tasks.length}
        </span>
        <div className="flex-1 h-px bg-border/60" aria-hidden />
      </div>
      <ul className="space-y-2">
        <AnimatePresence initial={false}>
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleCompletion={onToggleCompletion}
            />
          ))}
        </AnimatePresence>
      </ul>
    </section>
  );
}

export const TodayView: React.FC<TodayViewProps> = ({
  tasks,
  suggestions,
  userFirstName,
  tierBadge,
  isLoading = false,
  onCreateTask,
  onQuickCreate,
  onEditTask,
  onDeleteTask,
  onToggleCompletion,
  onAcceptSuggestion,
  onDismissSuggestion,
  onGoToCalendar,
  onGoToTimetable,
  onAddTimetableClass,
}) => {
  const reducedMotion = useReducedMotion();
  const [showSchedule, setShowSchedule] = useState(false);
  const scheduleSectionRef = useRef<HTMLDivElement>(null);

  const grouped = useMemo(() => groupTasks(tasks), [tasks]);
  const hour = new Date().getHours();
  const now = new Date();

  const hasAny =
    grouped.overdue.length +
      grouped.morning.length +
      grouped.afternoon.length +
      grouped.evening.length +
      grouped.later.length >
    0;

  const pendingSuggestions = suggestions
    .filter((s) => s.acceptanceStatus === 'pending')
    .slice(0, 2);

  if (isLoading) {
    return (
      <div className="space-y-4 px-1" aria-busy="true" aria-live="polite">
        <div className="h-8 w-64 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-48 animate-pulse rounded-md bg-muted" />
        <div className="mt-6 space-y-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-20 w-full animate-pulse rounded-xl bg-muted/70"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 px-0 pb-10 sm:space-y-6 sm:px-1 sm:pb-12">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground tabular-nums">
          {format(now, 'EEEE · MMMM d')}
        </p>
        <h1 className="text-responsive-xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl sm:leading-tight">
          {greeting(hour, userFirstName)}
        </h1>
        {hasAny ? (
          <p className="text-sm leading-relaxed text-muted-foreground max-w-[65ch]">
            {grouped.overdue.length > 0
              ? `${grouped.overdue.length} overdue · ${
                  grouped.morning.length +
                  grouped.afternoon.length +
                  grouped.evening.length
                } scheduled today`
              : `${
                  grouped.morning.length +
                  grouped.afternoon.length +
                  grouped.evening.length
                } task${
                  grouped.morning.length +
                    grouped.afternoon.length +
                    grouped.evening.length ===
                  1
                    ? ''
                    : 's'
                } on deck for today.`}
          </p>
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground max-w-[65ch]">
            Nothing due today. Capture what's on your mind, or open the calendar
            to plan ahead.
          </p>
        )}
      </header>

      {onQuickCreate && (
        <QuickCapture
          onSubmit={onQuickCreate}
          onOpenFullTask={onCreateTask}
          onGoToCalendar={onGoToCalendar}
          onGoToTimetable={onGoToTimetable}
          onAddTimetableClass={onAddTimetableClass}
          showSuggestedScheduleOption={hasAny}
          onShowSuggestedSchedule={() => {
            setShowSchedule(true);
            window.setTimeout(() => {
              scheduleSectionRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
              });
            }, 200);
          }}
        />
      )}

      {!hasAny && pendingSuggestions.length === 0 && (
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-2xl border border-dashed border-border/80 bg-card/40 px-6 py-10 text-center"
        >
          <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Plus className="h-5 w-5" strokeWidth={1.5} />
          </div>
          <h2 className="text-base font-semibold leading-snug tracking-tight text-foreground">
            Start your day with one task
          </h2>
          <p className="mx-auto mt-2 max-w-[42ch] text-sm leading-relaxed text-muted-foreground">
            Small, specific tasks are easier to finish. Try one thing you can
            complete in the next hour.
          </p>
          <Button
            onClick={onCreateTask}
            className="mt-5 active:scale-[0.97] transition-transform"
          >
            <Plus className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
            Add a task
          </Button>
        </motion.div>
      )}

      <TaskGroup
        label="Overdue"
        tasks={grouped.overdue}
        onEdit={onEditTask}
        onDelete={onDeleteTask}
        onToggleCompletion={onToggleCompletion}
        tone="warning"
      />

      <TaskGroup
        label={timeOfDayLabel.morning}
        tasks={grouped.morning}
        onEdit={onEditTask}
        onDelete={onDeleteTask}
        onToggleCompletion={onToggleCompletion}
      />

      {pendingSuggestions[0] && (
        <StuNudge
          key={pendingSuggestions[0].id}
          suggestion={pendingSuggestions[0]}
          onAccept={onAcceptSuggestion}
          onDismiss={onDismissSuggestion}
          tierBadge={tierBadge}
        />
      )}

      <TaskGroup
        label={timeOfDayLabel.afternoon}
        tasks={grouped.afternoon}
        onEdit={onEditTask}
        onDelete={onDeleteTask}
        onToggleCompletion={onToggleCompletion}
      />

      <TaskGroup
        label={timeOfDayLabel.evening}
        tasks={grouped.evening}
        onEdit={onEditTask}
        onDelete={onDeleteTask}
        onToggleCompletion={onToggleCompletion}
      />

      {pendingSuggestions[1] && (
        <StuNudge
          key={pendingSuggestions[1].id}
          suggestion={pendingSuggestions[1]}
          onAccept={onAcceptSuggestion}
          onDismiss={onDismissSuggestion}
        />
      )}

      <TaskGroup
        label="No time set"
        tasks={grouped.later}
        onEdit={onEditTask}
        onDelete={onDeleteTask}
        onToggleCompletion={onToggleCompletion}
      />

      {hasAny && (
        <div ref={scheduleSectionRef} className="pt-4">
          <button
            type="button"
            onClick={() => setShowSchedule((v) => !v)}
            className={cn(
              'inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium',
              'text-muted-foreground hover:text-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'active:scale-[0.98] transition-[color,transform]',
            )}
            aria-expanded={showSchedule}
            aria-controls="today-smart-schedule"
          >
            <CalendarIcon className="h-4 w-4" strokeWidth={1.5} />
            {showSchedule ? 'Hide suggested schedule' : 'Suggested time blocks'}
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform duration-200',
                showSchedule && 'rotate-180',
              )}
              strokeWidth={1.5}
            />
          </button>
          <AnimatePresence initial={false}>
            {showSchedule && (
              <motion.div
                id="today-smart-schedule"
                initial={reducedMotion ? false : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={reducedMotion ? undefined : { opacity: 0, height: 0 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="mt-4 overflow-hidden rounded-2xl border border-border/70 bg-card"
              >
                <Suspense
                  fallback={
                    <div className="h-40 animate-pulse bg-muted/60" />
                  }
                >
                  <SmartScheduleView />
                </Suspense>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
