"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { AnimatedGridPattern } from "@/components/ui/animated-grid-pattern";
import { Badge } from "@/components/ui/badge";
import { BlurFade } from "@/components/ui/blur-fade";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useFetchTasks } from "@/hooks/useTaskQueries";
import {
  expandRecurringTasks,
  getRecurrenceDescription,
  isMasterRecurringTask,
  isRecurringInstance,
} from "@/lib/recurrence";
import { cn } from "@/lib/utils";
import type { Priority, Task, TaskType } from "@/types/taskTypes";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { type VariantProps, cva } from "class-variance-authority";
import {
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isValid,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import {
  AlertTriangle,
  Book,
  BookOpen,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  EyeOff,
  FileText,
  GraduationCap,
  Loader2,
  Menu,
  Presentation,
  Repeat,
  User,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./calendar-styles.css";
import { MagicCard } from '@/components/ui/magic-card';

// Enhanced interface definitions with better typing
interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay: boolean;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  extendedProps: {
    task: Task;
    type: "task";
    isRecurring: boolean;
    priority: Priority;
  };
}

type CalendarView = "dayGridMonth" | "timeGridWeek" | "timeGridDay";

interface CalendarViewEnhancedProps {
  onEditTask?: (taskId: string) => void;
  className?: string;
}

// CVA variants following shrimp-rules.md brand colors
const priorityBadgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition-colors",
  {
    variants: {
      priority: {
        low: "bg-primary/10 text-primary border border-primary/20",
        medium:
          "bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800",
        high: "bg-red-100 text-red-800 border border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800",
      },
    },
    defaultVariants: {
      priority: "low",
    },
  },
);

const actionButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border",
        ghost: "hover:bg-accent/50 text-accent-foreground",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        default: "h-9 px-4 py-2",
        lg: "h-11 px-8",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

const viewButtonVariants = cva(
  "fc-button px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      active: {
        true: "fc-button-primary bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
        false:
          "bg-muted text-muted-foreground hover:bg-muted/80",
      },
    },
    defaultVariants: {
      active: false,
    },
  },
);

// Task type icons with better semantic mapping
const TYPE_ICONS: Record<
  TaskType,
  React.ComponentType<{ className?: string }>
> = {
  academic: BookOpen,
  personal: User,
  event: CalendarIcon,
} as const;

// Enhanced priority colors using shrimp-rules.md brand palette
const PRIORITY_COLORS: Record<
  Priority,
  { bg: string; border: string; text: string }
> = {
  low: {
    bg: "hsl(var(--primary))",
    border: "hsl(var(--primary))",
    text: "hsl(var(--primary-foreground))",
  },
  medium: {
    bg: "hsl(45, 93%, 47%)",
    border: "hsl(45, 93%, 42%)",
    text: "black",
  },
  high: {
    bg: "hsl(var(--destructive))",
    border: "hsl(var(--destructive))",
    text: "hsl(var(--destructive-foreground))",
  },
} as const;

// Utility functions with better type safety
const getPriorityIcon = (priority: Priority): string => {
  const iconMap: Record<Priority, string> = {
    high: "🔴",
    medium: "🟡",
    low: "🟢",
  };
  return iconMap[priority] || "⚪";
};

const formatTaskTitle = (task: Task): string => {
  const prefix = task.completed ? "✓ " : "";
  const recurringIndicator = isRecurringInstance(task) ? " 🔄" : "";
  return `${prefix}${task.title}${recurringIndicator}`;
};

export const CalendarViewEnhanced: React.FC<CalendarViewEnhancedProps> = ({
  onEditTask,
  className,
}) => {
  // State management with better organization
  const [currentView, setCurrentView] = useState<CalendarView>("dayGridMonth");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Refs
  const calendarRef = useRef<FullCalendar>(null);

  // Hooks with proper error handling
  const {
    data: tasks = [],
    isLoading,
    error: fetchError,
    refetch,
  } = useFetchTasks();

  // Enhanced mobile detection with cleanup
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Enhanced keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        (event.target as HTMLElement)?.tagName === "INPUT" ||
        (event.target as HTMLElement)?.tagName === "TEXTAREA"
      ) {
        return;
      }

      if (event.ctrlKey || event.metaKey) {
        switch (event.key.toLowerCase()) {
          case "1":
            setCurrentView("dayGridMonth");
            event.preventDefault();
            break;
          case "2":
            setCurrentView("timeGridWeek");
            event.preventDefault();
            break;
          case "3":
            setCurrentView("timeGridDay");
            event.preventDefault();
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Enhanced calendar events with performance optimization
  const calendarEvents = useMemo(() => {
    if (!tasks || tasks.length === 0) return [];

    try {
      const visibleTasks = showCompletedTasks
        ? tasks
        : tasks.filter((task) => !task.completed);

      // Get calendar view date range for performance
      const calendarApi = calendarRef.current?.getApi();
      const currentDate = calendarApi?.getDate() || new Date();
      const start = startOfMonth(startOfWeek(currentDate));
      const end = endOfMonth(endOfWeek(addMonths(currentDate, 1)));

      const expandedTasks = expandRecurringTasks(visibleTasks, start, end);

      return expandedTasks
        .filter((task) => task.due_date)
        .map((task): CalendarEvent | null => {
          if (!task.due_date) return null;
          
          const dueDate = parseISO(task.due_date);

          if (!isValid(dueDate)) {
            console.warn(
              `Invalid due_date for task ${task.id}: ${task.due_date}`,
            );
            return null;
          }

          const priorityColors = PRIORITY_COLORS[task.priority];

          return {
            id: task.id,
            title: formatTaskTitle(task),
            start: task.due_date,
            allDay: !task.due_date.includes("T"),
            backgroundColor: priorityColors.bg,
            borderColor: priorityColors.border,
            textColor: priorityColors.text,
            extendedProps: {
              task,
              type: "task" as const,
              isRecurring: isRecurringInstance(task),
              priority: task.priority,
            },
          };
        })
        .filter((event): event is CalendarEvent => event !== null);
    } catch (error) {
      console.error("Error processing calendar events:", error);
      return [];
    }
  }, [tasks, showCompletedTasks]);

  // Enhanced event handlers with better error handling
  const handleEventClick = useCallback((clickInfo: any) => {
    const task = clickInfo.event.extendedProps?.task;
    if (task) {
      setSelectedTask(task);
    }
  }, []);

  const handleDateClick = useCallback((dateInfo: any) => {
    setSelectedDate(new Date(dateInfo.dateStr));
  }, []);

  const handleViewChange = useCallback((view: CalendarView) => {
    setCurrentView(view);
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.changeView(view);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    try {
      await refetch();
    } catch (error) {
      console.error("Failed to refresh calendar data:", error);
    }
  }, [refetch]);

  // Early return for loading state
  if (isLoading) {
    return (
      <div
        className={cn("space-y-4", className)}
        role="main"
        aria-label="Calendar Loading"
      >
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Early return for error state
  if (fetchError) {
    return (
      <div
        className={cn("space-y-4", className)}
        role="main"
        aria-label="Calendar Error"
      >
        <Alert role="alert">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load calendar data. Please try refreshing the page.
          </AlertDescription>
        </Alert>
        <Button
          onClick={handleRefresh}
          className={actionButtonVariants({ variant: "primary" })}
          aria-label="Retry loading calendar data"
        >
          Try Again
        </Button>
      </div>
    );
  }

  // Enhanced task details modal with better accessibility
  const TaskDetailsModal = () => {
    if (!selectedTask) return null;

    const IconComponent = TYPE_ICONS[selectedTask.type];

    return (
      <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <DialogContent
          className="sm:max-w-md"
          role="dialog"
          aria-labelledby="task-dialog-title"
          aria-describedby="task-dialog-description"
        >
          <DialogHeader>
            <DialogTitle
              id="task-dialog-title"
              className="flex items-center gap-2"
            >
              <IconComponent className="h-5 w-5 text-primary" />
              {selectedTask.title}
            </DialogTitle>
            <DialogDescription id="task-dialog-description">
              Task details and information
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Badge
                className={priorityBadgeVariants({
                  priority: selectedTask.priority,
                })}
              >
                {getPriorityIcon(selectedTask.priority)} {selectedTask.priority}
              </Badge>
              <Badge variant="outline">{selectedTask.type}</Badge>
              {selectedTask.completed && (
                <Badge className="bg-primary text-primary-foreground">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Completed
                </Badge>
              )}
            </div>

            {selectedTask.description && (
              <div>
                <h4 className="text-sm font-medium text-foreground mb-2">
                  Description
                </h4>
                <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                  {selectedTask.description}
                </p>
              </div>
            )}

            {selectedTask.due_date && (
              <div>
                <h4 className="text-sm font-medium text-foreground mb-2">
                  Due Date
                </h4>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {format(parseISO(selectedTask.due_date), "PPP")}
                  {selectedTask.due_date.includes("T") && (
                    <span>
                      at {format(parseISO(selectedTask.due_date), "p")}
                    </span>
                  )}
                </p>
              </div>
            )}

            {isRecurringInstance(selectedTask) && (
              <div>
                <h4 className="text-sm font-medium text-foreground mb-2">
                  Recurrence
                </h4>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Repeat className="h-4 w-4" />
                  {getRecurrenceDescription(selectedTask.recurrence_rule || '')}
                </p>
              </div>
            )}

            {onEditTask && (
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => {
                    onEditTask(selectedTask.id);
                    setSelectedTask(null);
                  }}
                  className={actionButtonVariants({
                    variant: "primary",
                    size: "sm",
                  })}
                  aria-label={`Edit task: ${selectedTask.title}`}
                >
                  Edit Task
                </Button>
                <Button
                  onClick={() => setSelectedTask(null)}
                  className={actionButtonVariants({
                    variant: "secondary",
                    size: "sm",
                  })}
                >
                  Close
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  // Enhanced mobile navigation with better UX
  const MobileNavigation = () => (
    <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="md:hidden"
          aria-label="Open calendar navigation"
        >
          <Menu className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80">
        <SheetHeader>
          <SheetTitle>Calendar Options</SheetTitle>
          <SheetDescription>
            Customize your calendar view and settings
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 pt-6">
          <div>
            <h4 className="text-sm font-medium mb-3">View Mode</h4>
            <div className="space-y-2">
              {[
                {
                  value: "dayGridMonth" as const,
                  label: "Month View",
                  shortcut: "Ctrl+1",
                },
                {
                  value: "timeGridWeek" as const,
                  label: "Week View",
                  shortcut: "Ctrl+2",
                },
                {
                  value: "timeGridDay" as const,
                  label: "Day View",
                  shortcut: "Ctrl+3",
                },
                {
                  value: "timetable" as const,
                  label: "Timetable View",
                  shortcut: "Ctrl+4",
                },
              ].map(({ value, label, shortcut }) => (
                <Button
                  key={value}
                  onClick={() => {
                    if (value === "timetable") {
                      window.dispatchEvent(new CustomEvent('switchToTimetable'));
                    } else {
                      handleViewChange(value);
                    }
                    setMobileNavOpen(false);
                  }}
                  className={viewButtonVariants({
                    active: currentView === value,
                  })}
                  aria-label={`Switch to ${label} (${shortcut})`}
                >
                  {label}
                  <span className="text-xs opacity-70">{shortcut}</span>
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium">Show Completed Tasks</h4>
              <p className="text-xs text-muted-foreground">
                Display completed tasks in calendar
              </p>
            </div>
            <Switch
              checked={showCompletedTasks}
              onCheckedChange={setShowCompletedTasks}
              aria-label="Toggle completed tasks visibility"
            />
          </div>

          <Separator />

          <Button
            onClick={handleRefresh}
            className={actionButtonVariants({
              variant: "secondary",
              size: "sm",
            })}
            aria-label="Refresh calendar data"
          >
            <Loader2 className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );

  // Main render with enhanced accessibility and responsive design
  return (
    <BlurFade>
      <div
        className={cn("space-y-4", className)}
        role="main"
        aria-label="Task Calendar View"
      >
        {/* Live region for screen reader announcements */}
        <div aria-live="polite" aria-atomic="true" className="sr-only" />

        {/* Enhanced header with better responsive design */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Calendar View
            </h2>
            <p className="text-sm text-muted-foreground">
              View and manage your tasks in calendar format
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Desktop view controls */}
            <div className="hidden md:flex items-center gap-1">
              {[
                {
                  value: "dayGridMonth" as const,
                  label: "Month",
                  shortcut: "1",
                },
                {
                  value: "timeGridWeek" as const,
                  label: "Week",
                  shortcut: "2",
                },
                { value: "timeGridDay" as const, label: "Day", shortcut: "3" },
                { value: "timetable" as const, label: "Timetable", shortcut: "4" },
              ].map(({ value, label, shortcut }) => (
                <Button
                  key={value}
                  onClick={() => value === "timetable" ? 
                    window.dispatchEvent(new CustomEvent('switchToTimetable')) :
                    handleViewChange(value)
                  }
                  className={viewButtonVariants({
                    active: currentView === value,
                  })}
                  aria-label={`Switch to ${label} view (Ctrl+${shortcut})`}
                  title={`Ctrl+${shortcut}`}
                >
                  {label}
                </Button>
              ))}
            </div>

            {/* Show completed toggle for desktop */}
            <div className="hidden md:flex items-center gap-2">
              <Switch
                id="show-completed"
                checked={showCompletedTasks}
                onCheckedChange={setShowCompletedTasks}
                aria-label="Toggle completed tasks visibility"
              />
              <label
                htmlFor="show-completed"
                className="text-sm text-muted-foreground cursor-pointer"
              >
                Show completed
              </label>
            </div>

            <MobileNavigation />
          </div>
        </div>

        {/* Enhanced calendar container with better accessibility */}
        <MagicCard className="w-full h-full rounded-lg overflow-hidden">
          <Card className="w-full h-full border-0">
            <CardContent className="p-4">
              <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView={currentView}
                headerToolbar={{
                  left: "prev,next today",
                  center: "title",
                  right: "",
                }}
                events={calendarEvents}
                eventClick={handleEventClick}
                dateClick={handleDateClick}
                height="auto"
                aspectRatio={isMobile ? 1.0 : 1.35}
                eventDisplay="block"
                dayMaxEvents={isMobile ? 2 : 4}
                moreLinkClick="popover"
                nowIndicator={true}
                selectMirror={true}
                dayHeaderFormat={{ weekday: "short" }}
                eventTimeFormat={{
                  hour: "numeric",
                  minute: "2-digit",
                  meridiem: "short",
                }}
                slotLabelFormat={{
                  hour: "numeric",
                  minute: "2-digit",
                  meridiem: "short",
                }}
                // Enhanced accessibility attributes
                eventDidMount={(info) => {
                  const task = info.event.extendedProps.task;
                  info.el.setAttribute("role", "button");
                  info.el.setAttribute("tabindex", "0");
                  info.el.setAttribute(
                    "aria-label",
                    `Task: ${task.title}, Due: ${format(parseISO(task.due_date!), "PPP")}, Priority: ${task.priority}`,
                  );

                  // Add keyboard event listener
                  info.el.addEventListener("keydown", (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleEventClick({ event: info.event });
                    }
                  });
                }}
                viewDidMount={({ view, el }) => {
                  // This is a hacky but effective way to style FullCalendar's toolbar buttons
                  // since they don't accept `className` props directly.
                  setTimeout(() => {
                    const calendarEl = el;
                    const toolbar = calendarEl?.querySelector('.fc-toolbar-chunk:last-child');
                    if (toolbar) {
                      const buttons = toolbar.querySelectorAll<HTMLButtonElement>('.fc-button');
                      buttons.forEach((button: HTMLButtonElement) => {
                        button.className = button.className.replace(/fc-button-primary|bg-\w+-\d+|text-\w+-\d+|hover:bg-\w+\/\d+|shadow-\w+/g, '').trim();
                        
                        const isDayGridMonth = button.classList.contains('fc-dayGridMonth-button');
                        const isTimeGridWeek = button.classList.contains('fc-timeGridWeek-button');
                        const isTimeGridDay = button.classList.contains('fc-timeGridDay-button');

                        const isActive = 
                          (view.type === 'dayGridMonth' && isDayGridMonth) ||
                          (view.type === 'timeGridWeek' && isTimeGridWeek) ||
                          (view.type === 'timeGridDay' && isTimeGridDay);

                        button.className = cn(button.className, viewButtonVariants({ active: isActive }));
                      });
                    }
                  }, 100);
                }}
              />
          </CardContent>
        </Card>
        </MagicCard>

        <TaskDetailsModal />
      </div>
    </BlurFade>
  );
};
