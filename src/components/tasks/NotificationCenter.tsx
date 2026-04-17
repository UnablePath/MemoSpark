'use client';

import type React from 'react';
import { useMemo, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Bell, Check, Clock, Mail } from 'lucide-react';
import { parseISO, isPast } from 'date-fns';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useReminders } from '@/hooks/useReminders';
import { formatDueLabel } from '@/lib/tasks/formatting';
import type { Reminder } from '@/types/reminders';

/**
 * Compact notification drawer surfaced from the task hub header.
 * Shows pending reminders grouped by overdue/upcoming, with a mark-done action.
 * Count badge appears only when there are unread/overdue items.
 */
export const NotificationCenter: React.FC<{ className?: string }> = ({
  className,
}) => {
  const reducedMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const { reminders, loading, editReminder } = useReminders();
  const markDone = async (id: string) => {
    try {
      await editReminder(id, { completed: true });
    } catch (error) {
      console.warn('[notifications] mark-done failed', error);
    }
  };

  const { overdue, upcoming } = useMemo(() => {
    const pending = (reminders as Reminder[]).filter((r) => !r.completed);
    const now = new Date();
    const overdue: Reminder[] = [];
    const upcoming: Reminder[] = [];
    for (const reminder of pending) {
      try {
        const due = parseISO(reminder.due_date);
        if (isPast(due) && due.getTime() < now.getTime()) {
          overdue.push(reminder);
        } else {
          upcoming.push(reminder);
        }
      } catch {
        upcoming.push(reminder);
      }
    }
    const byDue = (a: Reminder, b: Reminder) =>
      parseISO(a.due_date).getTime() - parseISO(b.due_date).getTime();
    overdue.sort(byDue);
    upcoming.sort(byDue);
    return { overdue, upcoming };
  }, [reminders]);

  const unreadCount = overdue.length;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'relative h-9 w-9 p-0 active:scale-[0.95] transition-transform',
            className,
          )}
          aria-label={`Notifications${unreadCount ? ` (${unreadCount} overdue)` : ''}`}
        >
          <Bell className="h-4 w-4" strokeWidth={1.5} />
          {unreadCount > 0 && (
            <motion.span
              key={unreadCount}
              initial={reducedMotion ? false : { scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                'absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center',
                'justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold',
                'leading-none text-destructive-foreground tabular-nums',
              )}
              aria-hidden
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader className="space-y-1">
          <SheetTitle className="text-lg font-semibold tracking-tight">
            Notifications
          </SheetTitle>
          <SheetDescription className="text-sm">
            {overdue.length + upcoming.length === 0
              ? 'No pending reminders.'
              : `${overdue.length} overdue · ${upcoming.length} upcoming`}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {loading && (
            <div className="space-y-2" aria-busy="true">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-16 w-full animate-pulse rounded-xl bg-muted/70"
                />
              ))}
            </div>
          )}

          {!loading && overdue.length === 0 && upcoming.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-card/40 px-6 py-12 text-center">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Mail className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-medium text-foreground">You're all caught up</p>
              <p className="mx-auto mt-1 max-w-[32ch] text-xs text-muted-foreground">
                New reminders will appear here as they come in.
              </p>
            </div>
          )}

          {overdue.length > 0 && (
            <NotificationGroup
              label="Overdue"
              tone="warning"
              items={overdue}
              onMarkDone={markDone}
            />
          )}
          {upcoming.length > 0 && (
            <NotificationGroup
              label="Upcoming"
              items={upcoming}
              onMarkDone={markDone}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

function NotificationGroup({
  label,
  items,
  onMarkDone,
  tone = 'default',
}: {
  label: string;
  items: Reminder[];
  onMarkDone: (id: string) => Promise<void> | void;
  tone?: 'default' | 'warning';
}) {
  const reducedMotion = useReducedMotion();
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <h3
          className={cn(
            'text-[0.72rem] font-semibold tracking-[0.14em] uppercase',
            tone === 'warning' ? 'text-destructive' : 'text-muted-foreground',
          )}
        >
          {label}
        </h3>
        <span className="text-xs text-muted-foreground tabular-nums">
          {items.length}
        </span>
        <div className="flex-1 h-px bg-border/60" aria-hidden />
      </div>
      <ul className="space-y-2">
        <AnimatePresence initial={false}>
          {items.map((reminder) => (
            <motion.li
              key={reminder.id}
              layout={reducedMotion ? false : 'position'}
              initial={reducedMotion ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-start gap-3 rounded-xl border border-border/70 bg-card px-3 py-2.5"
            >
              <div
                className={cn(
                  'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
                  tone === 'warning'
                    ? 'bg-destructive/10 text-destructive'
                    : 'bg-primary/10 text-primary',
                )}
                aria-hidden
              >
                <Clock className="h-4 w-4" strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground line-clamp-1">
                  {reminder.title}
                </p>
                <p
                  className={cn(
                    'mt-0.5 text-xs tabular-nums',
                    tone === 'warning' ? 'text-destructive' : 'text-muted-foreground',
                  )}
                >
                  {formatDueLabel(reminder.due_date) ?? 'No time set'}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 shrink-0 p-0 active:scale-[0.95] transition-transform"
                onClick={() => onMarkDone(reminder.id)}
                aria-label={`Mark ${reminder.title} done`}
              >
                <Check className="h-4 w-4" strokeWidth={1.5} />
              </Button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </section>
  );
}
