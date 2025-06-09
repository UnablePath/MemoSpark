"use client";

import { CalendarViewEnhanced } from "@/components/tasks/CalendarViewEnhanced";
import { ListView } from "@/components/tasks/ListView";
import { ProgressiveTaskCapture } from "@/components/tasks/ProgressiveTaskCapture";
import { QuickTaskInput } from "@/components/tasks/QuickTaskInput";
import { StuTaskGuidance } from "@/components/tasks/StuTaskGuidance";
import { TaskForm } from "@/components/tasks/TaskForm";
import { TimetableGrid } from "@/components/tasks/TimetableGrid";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  expandRecurringTasks,
  getRecurrenceDescription,
  isMasterRecurringTask,
  isRecurringInstance,
} from "@/lib/recurrence";
import { cn } from "@/lib/utils";
import type { ExtendedTask } from "@/types/ai";
import type {
  Task as BaseTask,
  DayOfWeek,
  Priority,
  TaskType,
  TimetableEntry,
} from "@/types/taskTypes";
import { type VariantProps, cva } from "class-variance-authority";
import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  differenceInSeconds,
  endOfDay,
  format,
  getDay,
  isAfter,
  isBefore,
  isEqual,
  isValid,
  isWithinInterval,
  parseISO,
  setHours,
  setMinutes,
  setSeconds,
  startOfDay,
} from "date-fns";
import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock,
  Download,
  Edit,
  Filter,
  Grid3X3,
  List,
  Plus,
  Repeat,
  Repeat2,
  Settings,
  SortAsc,
  Target,
  Trash2,
  User,
  Wand2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import Calendar from "react-calendar";
import {
  FaCalendarAlt,
  FaClock,
  FaFileExport,
  FaPlus,
  FaTable,
  FaTasks,
  FaPencilAlt as Pencil,
} from "react-icons/fa";
import { v4 as uuidv4 } from "uuid";
import "react-calendar/dist/Calendar.css";

// Timetable Types
// Exporting these types and constants for use in TimetableGrid.tsx
export const ALL_DAYS_OF_WEEK: DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];
export const ICAL_BYDAY_MAP: Record<DayOfWeek, string> = {
  sunday: "SU",
  monday: "MO",
  tuesday: "TU",
  wednesday: "WE",
  thursday: "TH",
  friday: "FR",
  saturday: "SA",
};

export type RecurrenceRule = "none" | "daily" | "weekly" | "monthly" | "yearly";

export interface ClassTimetableEntry {
  id: string;
  courseName: string;
  courseCode: string;
  instructor?: string;
  location?: string;
  startTime: string; // HH:mm format e.g., "09:45"
  endTime: string; // HH:mm format e.g., "11:15"
  daysOfWeek: DayOfWeek[];
  semesterStartDate: string; // yyyy-MM-dd
  semesterEndDate: string; // yyyy-MM-dd
  color?: string; // Optional: for UI theming, e.g., tailwind bg color class or hex
  detailedDescription?: string; // New field for detailed description
}

// CVA variants following shrimp-rules.md brand colors
const viewModeButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  {
    variants: {
      state: {
        active: "bg-primary text-primary-foreground shadow-sm",
        inactive:
          "bg-muted text-muted-foreground hover:text-foreground hover:bg-primary/10 border border-border",
      },
    },
    defaultVariants: {
      state: "inactive",
    },
  },
);

// CVA variants for priority badges with brand colors
const priorityBadgeVariants = cva("h-3 w-3 rounded-full flex-shrink-0", {
  variants: {
    priority: {
      low: "bg-primary",
      medium: "bg-amber-500",
      high: "bg-red-500",
    },
  },
  defaultVariants: {
    priority: "low",
  },
});

// CVA variants for task cards with consistent styling
const taskCardVariants = cva(
  "shadow-sm transition-all duration-200 hover:shadow-md border rounded-lg",
  {
    variants: {
      type: {
        regular: "bg-card border-border",
        recurring: "bg-primary/5 border-primary/20",
        completed: "bg-muted border-border opacity-75",
      },
    },
    defaultVariants: {
      type: "regular",
    },
  },
);

// CVA variants for action buttons
const actionButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border",
        ghost: "hover:bg-primary/10 text-primary",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm hover:shadow-md",
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

const PREDEFINED_TIMETABLE_COLORS: string[] = [
  "bg-red-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-yellow-500",
  "bg-lime-500",
  "bg-primary",
  "bg-emerald-500",
  "bg-teal-500",
  "bg-cyan-500",
  "bg-sky-500",
  "bg-blue-500",
  "bg-indigo-500",
  "bg-violet-500",
  "bg-purple-500",
  "bg-fuchsia-500",
  "bg-pink-500",
  "bg-rose-500",
];

interface LocalTask {
  id: string;
  title: string;
  dueDate: string; // ISO string for date and time
  priority: Priority;
  type: TaskType;
  subject?: string;
  completed: boolean;
  reminder: boolean;
  description?: string;
  // Recurrence fields
  recurrenceRule?: RecurrenceRule;
  recurrenceInterval?: number; // e.g., 1 for every day/week/month, 2 for every other day/week/month
  recurrenceEndDate?: string; // ISO date string (only date part relevant for end condition)
  originalDueDate?: string; // For instances, to know their original start time from master
  completedOverrides?: Record<string, boolean>; // Key: YYYY-MM-DD of original instance date, Value: completed status
}

// Sample Timetable Data (can be replaced with actual data fetching/management)
const initialTimetableEntries: ClassTimetableEntry[] = [
  {
    id: "tt1",
    courseName: "Pre-Calculus II",
    courseCode: "MATH122",
    instructor: "Rebecca Awuah",
    location: "Jackson Hall 115",
    startTime: "09:45",
    endTime: "11:15",
    daysOfWeek: ["monday", "tuesday"],
    semesterStartDate: "2025-05-19",
    semesterEndDate: "2025-08-01",
    color: "bg-sky-600",
    detailedDescription:
      "This course covers advanced topics in pre-calculus, building on concepts from MATH101. Focus on functions, trigonometry, and an introduction to limits. Weekly quizzes and a comprehensive final exam.",
  },
  {
    id: "tt2",
    courseName: "Organizational Behaviour",
    courseCode: "BUSA132",
    instructor: "Enyonam Kudonoo",
    location: "Norton-Motulsky 207B",
    startTime: "11:30",
    endTime: "13:00",
    daysOfWeek: ["monday", "wednesday"],
    semesterStartDate: "2025-05-19",
    semesterEndDate: "2025-08-01",
    color: "bg-emerald-600",
  },
  {
    id: "tt3",
    courseName: "Leadership Seminar I",
    courseCode: "SOAN111",
    instructor: "Afia Agyeman Amponsah-Mensah",
    location: "Norton-Motulsky 207B",
    startTime: "13:15",
    endTime: "14:45",
    daysOfWeek: ["monday"],
    semesterStartDate: "2025-05-19",
    semesterEndDate: "2025-08-01",
    color: "bg-indigo-600",
  },
  {
    id: "tt4",
    courseName: "Foundations of Design and Entrepreneurship II",
    courseCode: "BUSA162",
    instructor: "Jewel Thompson",
    location: "Nutor Hall 115",
    startTime: "13:15",
    endTime: "14:45",
    daysOfWeek: ["tuesday", "thursday"],
    semesterStartDate: "2025-05-20",
    semesterEndDate: "2025-08-01",
    color: "bg-amber-600",
  },
];

const initialTasks: LocalTask[] = [
  {
    id: "1",
    title: "Math Assignment",
    dueDate: format(
      new Date(Date.now() + 2.5 * 60 * 60 * 1000),
      "yyyy-MM-dd'T'HH:mm:ss",
    ),
    priority: "high",
    type: "academic",
    subject: "Mathematics",
    completed: false,
    reminder: true,
  },
  {
    id: "2",
    title: "Study Group Meeting",
    dueDate: format(addDays(new Date(), 1), "yyyy-MM-dd'T'09:00:00"),
    priority: "medium",
    type: "academic",
    subject: "Physics",
    completed: false,
    reminder: true,
  },
  {
    id: "3",
    title: "Grocery Shopping",
    dueDate: format(new Date(), "yyyy-MM-dd'T'17:00:00"),
    priority: "low",
    type: "personal",
    completed: false,
    reminder: false,
  },
  {
    id: "4",
    title: "Past Task",
    dueDate: format(addDays(new Date(), -1), "yyyy-MM-dd'T'10:00:00"),
    priority: "low",
    type: "personal",
    completed: false,
    reminder: false,
    recurrenceRule: "none",
  },
];

// --- Countdown Logic ---
function formatTimeRemaining(dueDateString: string): string {
  const now = new Date();
  const dueDate = parseISO(dueDateString);
  const totalSeconds = differenceInSeconds(dueDate, now);

  if (totalSeconds <= 0) {
    return "Past due";
  }

  const days = differenceInDays(dueDate, now);
  const hours = differenceInHours(dueDate, now) % 24;
  const minutes = differenceInMinutes(dueDate, now) % 60;
  // const seconds = totalSeconds % 60; // Optionally show seconds

  let result = "Due ";
  if (days > 0) {
    result += `${days}d `;
  }
  if (hours > 0) {
    result += `${hours}h `;
  }
  if (minutes > 0 && days < 1) {
    // Only show minutes if less than a day away
    result += `${minutes}m`;
  }
  // if (seconds > 0 && days === 0 && hours === 0 && minutes < 5) { // Example: show seconds if very close
  //   result += ` ${seconds}s`;
  // }

  return result.trim() || "Due now"; // Handle edge case where difference is very small
}

interface CountdownProps {
  dueDateString: string;
}

const Countdown: React.FC<CountdownProps> = ({ dueDateString }) => {
  const [timeRemaining, setTimeRemaining] = useState(() =>
    formatTimeRemaining(dueDateString),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(formatTimeRemaining(dueDateString));
    }, 60000); // Update every minute

    // Clear interval on unmount
    return () => clearInterval(interval);
  }, [dueDateString]);

  const isPastDue = timeRemaining === "Past due";
  const pulseAnimation =
    !isPastDue && timeRemaining !== "Due now" ? "animate-pulse" : "";

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold shadow-sm border ${isPastDue ? "bg-red-100 text-red-700 border-red-200" : "bg-blue-100 text-blue-700 border-blue-200"} ${pulseAnimation} ml-2`}
    >
      <FaClock className="h-3 w-3 mr-1" aria-hidden="true" />
      {timeRemaining}
    </span>
  );
};
// --- End Countdown Logic ---

// Function to generate recurring instances
const generateRecurringInstances = (
  masterTask: LocalTask,
  viewStartDate: Date,
  viewEndDate: Date,
): LocalTask[] => {
  if (
    !masterTask.recurrenceRule ||
    masterTask.recurrenceRule === "none" ||
    !masterTask.dueDate
  ) {
    return [];
  }

  const instances: LocalTask[] = [];
  let currentIterationDate = parseISO(masterTask.dueDate); // This is the date of the current iteration of the master event
  const recurrenceEndDate = masterTask.recurrenceEndDate
    ? startOfDay(parseISO(masterTask.recurrenceEndDate))
    : null;
  const interval = masterTask.recurrenceInterval || 1;

  // Advance currentIterationDate to the first potential occurrence that is relevant to the view or recurrence window
  while (
    isBefore(currentIterationDate, viewStartDate) &&
    (!recurrenceEndDate ||
      !isAfter(startOfDay(currentIterationDate), recurrenceEndDate))
  ) {
    // Optimization: if currentIterationDate is already past viewEndDate, and we are still before viewStartDate (should not happen with correct logic but as safety)
    if (isAfter(startOfDay(currentIterationDate), viewEndDate)) break;

    switch (masterTask.recurrenceRule) {
      case "daily":
        currentIterationDate = addDays(currentIterationDate, interval);
        break;
      case "weekly":
        currentIterationDate = addWeeks(currentIterationDate, interval);
        break;
      case "monthly":
        currentIterationDate = addMonths(currentIterationDate, interval);
        break;
      case "yearly":
        currentIterationDate = addYears(currentIterationDate, interval);
        break;
      default: // Should not reach here due to initial check
        return [];
    }
    if (!isValid(currentIterationDate)) return []; // Safety break
  }

  // Generate instances within the view window and before or on the recurrence end date
  while (
    isWithinInterval(startOfDay(currentIterationDate), {
      start: startOfDay(viewStartDate),
      end: endOfDay(viewEndDate),
    }) ||
    isEqual(startOfDay(currentIterationDate), startOfDay(viewStartDate)) ||
    isEqual(startOfDay(currentIterationDate), startOfDay(viewEndDate))
  ) {
    if (
      recurrenceEndDate &&
      isAfter(startOfDay(currentIterationDate), recurrenceEndDate)
    ) {
      break; // Stop if the instance is after the recurrence end date
    }

    // Only add if the current iteration date is on or after the master task's original due date
    if (
      !isBefore(
        startOfDay(currentIterationDate),
        startOfDay(parseISO(masterTask.dueDate)),
      )
    ) {
      const instanceDateStr = format(currentIterationDate, "yyyy-MM-dd");
      const isCompleted =
        masterTask.completedOverrides?.[instanceDateStr] ??
        masterTask.completed; // Use override if exists, else master's completed status for new instances that haven't been specifically toggled

      instances.push({
        ...masterTask,
        id: `${masterTask.id}-instance-${format(currentIterationDate, "yyyyMMdd")}`, // More stable ID for a given day's instance
        dueDate: format(currentIterationDate, "yyyy-MM-dd'T'HH:mm:ss"),
        originalDueDate: masterTask.dueDate,
        completed: isCompleted,
        recurrenceRule: "none", // Instances themselves don't recur further in this model
        recurrenceInterval: undefined,
        recurrenceEndDate: undefined,
        completedOverrides: undefined, // Instances don't have their own overrides map
      });
    }

    // Advance to the next date
    switch (masterTask.recurrenceRule) {
      case "daily":
        currentIterationDate = addDays(currentIterationDate, interval);
        break;
      case "weekly":
        currentIterationDate = addWeeks(currentIterationDate, interval);
        break;
      case "monthly":
        currentIterationDate = addMonths(currentIterationDate, interval);
        break;
      case "yearly":
        currentIterationDate = addYears(currentIterationDate, interval);
        break;
      default: // Should not reach here
        return instances;
    }
    if (!isValid(currentIterationDate)) break;
  }
  return instances;
};

// Function to generate iCal string
const exportTimetableToICal = (entries: ClassTimetableEntry[]): string => {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; // Get local timezone

  const массовыхСобытий = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//MemoSpark//TimetableExporter//EN`,
    `CALSCALE:GREGORIAN`,
    `METHOD:PUBLISH`,
    `X-WR-CALNAME:Class Timetable`,
    `X-WR-TIMEZONE:${timeZone}`,
  ];

  entries.forEach((entry) => {
    const uid = uuidv4();
    const now = new Date();
    const dtstamp = format(now, "yyyyMMdd'T'HHmmss'Z'"); // Universal time for DTSTAMP

    const semesterStart = parseISO(entry.semesterStartDate);
    const semesterEnd = endOfDay(parseISO(entry.semesterEndDate)); // Ensure UNTIL includes the whole last day

    const [startHour, startMinute] = entry.startTime.split(":").map(Number);
    const [endHour, endMinute] = entry.endTime.split(":").map(Number);

    // Determine the first occurrence of any of the entry.daysOfWeek on or after semesterStart
    let firstEventDate: Date | null = null;
    for (let i = 0; i < 7; i++) {
      const thửDate = addDays(semesterStart, i);
      const dayIndex = getDay(thửDate); // 0=Sun, 1=Mon, ..., 6=Sat
      const currentDayName = ALL_DAYS_OF_WEEK[(dayIndex + 6) % 7]; // Adjust to match DayOfWeek array (Mon=0...Sun=6 if ALL_DAYS_OF_WEEK starts Mon)
      // Correcting mapping based on date-fns getDay and our ALL_DAYS_OF_WEEK
      const dayNameForLookup: DayOfWeek = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ][dayIndex] as DayOfWeek;

      if (entry.daysOfWeek.includes(dayNameForLookup)) {
        firstEventDate = thửDate;
        break;
      }
    }

    if (!firstEventDate) return; // Should not happen if daysOfWeek and semesterStartDate are valid

    const dtstart = setSeconds(
      setMinutes(setHours(firstEventDate, startHour), startMinute),
      0,
    );
    const dtend = setSeconds(
      setMinutes(setHours(firstEventDate, endHour), endMinute),
      0,
    );

    // Format DTSTART/DTEND with timezone for floating times or local times
    // For simplicity, treating as local time that floats based on user's calendar app timezone setting for the VEVENT
    // Or, explicitly define timezone if times are meant to be fixed irrespective of user's calendar default TZ
    const dtstartStr = format(dtstart, "yyyyMMdd'T'HHmmss");
    const dtendStr = format(dtend, "yyyyMMdd'T'HHmmss");

    const bydayRule = entry.daysOfWeek
      .map((day) => ICAL_BYDAY_MAP[day])
      .join(",");
    const untilStr = format(semesterEnd, "yyyyMMdd'T'HHmmss'Z'"); // Format semesterEnd (which is EOD local) to UTC string

    массовыхСобытий.push("BEGIN:VEVENT");
    массовыхСобытий.push(`UID:${uid}`);
    массовыхСобытий.push(`DTSTAMP:${dtstamp}`);
    массовыхСобытий.push(`DTSTART;TZID=${timeZone}:${dtstartStr}`);
    массовыхСобытий.push(`DTEND;TZID=${timeZone}:${dtendStr}`);
    массовыхСобытий.push(
      `RRULE:FREQ=WEEKLY;BYDAY=${bydayRule};UNTIL=${untilStr}`,
    );
    массовыхСобытий.push(
      `SUMMARY:${entry.courseName} (${entry.courseCode || ""})`.trim(),
    );
    if (entry.location) массовыхСобытий.push(`LOCATION:${entry.location}`);
    let description = "";
    if (entry.instructor) description += `Instructor: ${entry.instructor}`;
    if (description) массовыхСобытий.push(`DESCRIPTION:${description}`);
    // Add alarm if needed
    // BEGIN:VALARM
    // TRIGGER:-PT15M (15 minutes before)
    // ACTION:DISPLAY
    // DESCRIPTION:Reminder
    // END:VALARM
    массовыхСобытий.push("END:VEVENT");
  });

  массовыхСобытий.push("END:VCALENDAR");
  return массовыхСобытий.join("\r\n"); // Standard line ending for iCal
};

// Enhanced interface for component props
interface TaskEventTabProps {
  className?: string;
  initialViewMode?: "list" | "calendar" | "timetable";
  onTasksChange?: (tasks: LocalTask[]) => void;
  onError?: (error: string) => void;
}

// Enhanced state management interface
interface TaskEventTabState {
  tasks: LocalTask[];
  selectedDate: Date;
  showAddTaskDialog: boolean;
  viewMode: "list" | "calendar" | "timetable";
  isLoading: boolean;
  error: string | null;
}

const TaskEventTab: React.FC<TaskEventTabProps> = ({
  className,
  initialViewMode = "list",
  onTasksChange,
  onError,
}) => {
  // Enhanced state management with error handling
  const [state, setState] = useState<TaskEventTabState>({
    tasks: initialTasks,
    selectedDate: new Date(),
    showAddTaskDialog: false,
    viewMode: initialViewMode,
    isLoading: false,
    error: null,
  });

  // Destructure state for easier access
  const { tasks, selectedDate, showAddTaskDialog, viewMode, isLoading, error } =
    state;

  // Enhanced task creation state
  const [inputMode, setInputMode] = useState<"quick" | "progressive">("quick");
  const [showProgressiveCapture, setShowProgressiveCapture] = useState(false);

  const [classTimetable, setClassTimetable] = useState<ClassTimetableEntry[]>(
    initialTimetableEntries,
  );
  // State for Add/Edit Timetable Entry Dialog
  const [showAddEditTimetableEntryDialog, setShowAddEditTimetableEntryDialog] =
    useState(false);
  const [editingTimetableEntry, setEditingTimetableEntry] =
    useState<ClassTimetableEntry | null>(null);
  const [currentTimetableForm, setCurrentTimetableForm] = useState<
    Partial<ClassTimetableEntry>
  >({});

  const initialNewTaskState: Omit<LocalTask, "id" | "completed"> = {
    title: "",
    dueDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"), // Use HH:mm for datetime-local
    priority: "medium",
    type: "academic",
    subject: "",
    description: "",
    reminder: true,
    recurrenceRule: "none",
    recurrenceInterval: 1,
    recurrenceEndDate: "",
  };
  const [newTask, setNewTask] =
    useState<Omit<LocalTask, "id" | "completed">>(initialNewTaskState);

  const handleAddTask = useCallback(() => {
    if (!newTask.title || !newTask.dueDate) {
      const errorMsg = "Title and Due Date are required.";
      setState((prev) => ({ ...prev, error: errorMsg }));
      onError?.(errorMsg);
      return;
    }

    try {
      const taskToAdd: LocalTask = {
        ...newTask,
        id: Date.now().toString(),
        completed: false,
        // Ensure recurrenceInterval is a number if rule is not none
        recurrenceInterval:
          newTask.recurrenceRule !== "none" && newTask.recurrenceInterval
            ? Number(newTask.recurrenceInterval)
            : undefined,
        // Clear recurrenceEndDate if rule is none or if date is invalid
        recurrenceEndDate:
          newTask.recurrenceRule !== "none" &&
          newTask.recurrenceEndDate &&
          isValid(parseISO(newTask.recurrenceEndDate))
            ? newTask.recurrenceEndDate
            : undefined,
      };

      const updatedTasks = [...tasks, taskToAdd];
      setState((prev) => ({
        ...prev,
        tasks: updatedTasks,
        showAddTaskDialog: false,
        error: null,
      }));
      onTasksChange?.(updatedTasks);
      setNewTask(initialNewTaskState); // Reset form

      // Announce success for screen readers
      const liveRegion = document.querySelector('[aria-live="polite"]');
      if (liveRegion) {
        liveRegion.textContent = `Task "${taskToAdd.title}" added successfully`;
      }
    } catch (error) {
      const errorMsg = "Failed to add task. Please try again.";
      setState((prev) => ({ ...prev, error: errorMsg }));
      onError?.(errorMsg);
      console.error("Error adding task:", error);
    }
  }, [newTask, tasks, onTasksChange, onError]);

  // Enhanced task creation handler for new components
  const handleEnhancedTaskCreate = useCallback(
    (taskData: Omit<ExtendedTask, "id" | "completed">) => {
      try {
        // Convert ExtendedTask to Task format for backward compatibility
        const convertedTask: LocalTask = {
          id: Date.now().toString(),
          title: taskData.title,
          dueDate: taskData.dueDate,
          priority: taskData.priority,
          type: taskData.type,
          subject: taskData.subject,
          completed: false,
          reminder: taskData.reminder,
          description: taskData.description,
          recurrenceRule: taskData.recurrenceRule || "none",
          recurrenceInterval: taskData.recurrenceInterval,
          recurrenceEndDate: taskData.recurrenceEndDate,
          originalDueDate: taskData.originalDueDate,
          completedOverrides: taskData.completedOverrides,
        };

        const updatedTasks = [...tasks, convertedTask];
        setState((prev) => ({ ...prev, tasks: updatedTasks, error: null }));
        onTasksChange?.(updatedTasks);
        setShowProgressiveCapture(false);
        setInputMode("quick");

        // Announce success for screen readers
        const liveRegion = document.querySelector('[aria-live="polite"]');
        if (liveRegion) {
          liveRegion.textContent = `Task "${convertedTask.title}" created successfully`;
        }
      } catch (error) {
        const errorMsg = "Failed to create task. Please try again.";
        setState((prev) => ({ ...prev, error: errorMsg }));
        onError?.(errorMsg);
        console.error("Error creating enhanced task:", error);
      }
    },
    [tasks, onTasksChange, onError],
  );

  // Updated function to get all tasks for a given day, including recurring instances
  const getTasksForDate = (date: Date, allTasks: LocalTask[]): LocalTask[] => {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);
    const visibleTasks: LocalTask[] = [];

    allTasks.forEach((task) => {
      if (task.recurrenceRule && task.recurrenceRule !== "none") {
        // For recurring tasks, generate instances for this specific day
        const instances = generateRecurringInstances(task, dayStart, dayEnd);
        visibleTasks.push(...instances);
      } else {
        // For non-recurring tasks, check if dueDate falls on this day
        if (
          task.dueDate &&
          isEqual(startOfDay(parseISO(task.dueDate)), dayStart)
        ) {
          visibleTasks.push(task);
        }
      }
    });
    return visibleTasks.sort(
      (a, b) => parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime(),
    );
  };

  const handleDateChange = useCallback(
    (date: any) => {
      try {
        if (date instanceof Date) {
          setState((prev) => ({ ...prev, selectedDate: date, error: null }));
        } else {
          console.warn("Calendar onChange returned non-Date value:", date);
          const errorMsg = "Invalid date selected";
          setState((prev) => ({ ...prev, error: errorMsg }));
          onError?.(errorMsg);
        }
      } catch (error) {
        const errorMsg = "Failed to change date";
        setState((prev) => ({ ...prev, error: errorMsg }));
        onError?.(errorMsg);
        console.error("Error changing date:", error);
      }
    },
    [onError],
  );

  const toggleTaskCompletion = useCallback(
    (taskId: string) => {
      try {
        // Revised logic for toggling completion, especially for instances
        const [masterId, , instanceDateSuffix] = taskId.split("-instance-");
        const isInstance = masterId && instanceDateSuffix;

        let updatedTasks: LocalTask[];

        if (isInstance) {
          // Parse the instance date from the ID suffix (format: yyyyMMdd)
          const actualInstanceDate = parseISO(instanceDateSuffix);
          const formattedInstanceDateKey = format(
            actualInstanceDate,
            "yyyy-MM-dd",
          );

          updatedTasks = tasks.map((master) => {
            if (master.id === masterId) {
              const newOverrides = { ...master.completedOverrides };
              const currentStatus =
                master.completedOverrides?.[formattedInstanceDateKey] ??
                master.completed;
              newOverrides[formattedInstanceDateKey] = !currentStatus;
              return { ...master, completedOverrides: newOverrides };
            }
            return master;
          });
        } else {
          // Non-instance (original task or master of a recurrence)
          updatedTasks = tasks.map((task) =>
            task.id === taskId ? { ...task, completed: !task.completed } : task,
          );
        }

        setState((prev) => ({ ...prev, tasks: updatedTasks, error: null }));
        onTasksChange?.(updatedTasks);

        // Announce task completion change for screen readers
        const taskName = isInstance
          ? tasks.find((t) => t.id === masterId)?.title
          : tasks.find((t) => t.id === taskId)?.title;

        if (taskName) {
          const completionStatus = isInstance
            ? !(
                tasks.find((t) => t.id === masterId)?.completedOverrides?.[
                  format(parseISO(instanceDateSuffix), "yyyy-MM-dd")
                ] ?? tasks.find((t) => t.id === masterId)?.completed
              )
            : !tasks.find((t) => t.id === taskId)?.completed;

          const liveRegion = document.querySelector('[aria-live="polite"]');
          if (liveRegion) {
            liveRegion.textContent = `Task "${taskName}" marked as ${completionStatus ? "completed" : "incomplete"}`;
          }
        }
      } catch (error) {
        const errorMsg = "Failed to toggle task completion";
        setState((prev) => ({ ...prev, error: errorMsg }));
        onError?.(errorMsg);
        console.error("Error toggling task completion:", error);
      }
    },
    [tasks, onTasksChange, onError],
  );

  const handleEditTaskPlaceholder = (task: LocalTask) => {
    console.log(`Edit clicked for task: ${task.title} (ID: ${task.id})`);
    if (
      task.originalDueDate ||
      (task.recurrenceRule && task.recurrenceRule !== "none")
    ) {
      alert(
        "Imagine a dialog here asking to edit: Just this instance? This and future? Or all in series?",
      );
    }
  };

  const handleDeleteTaskPlaceholder = (task: LocalTask) => {
    console.log(`Delete clicked for task: ${task.title} (ID: ${task.id})`);
    if (
      task.originalDueDate ||
      (task.recurrenceRule && task.recurrenceRule !== "none")
    ) {
      alert(
        "Imagine a dialog here asking to delete: Just this instance? This and future? Or all in series?",
      );
    }
    // Basic delete for now: removes from main tasks array. Doesn't handle recurring series properly.
    // setTasks(prevTasks => prevTasks.filter(t => t.id !== task.id));
  };

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case "high":
        return "bg-destructive";
      case "medium":
        return "bg-amber-500";
      case "low":
        return "bg-primary";
      default:
        return "bg-muted";
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const target = e.target as HTMLInputElement; // Type assertion for checked property
    const { name, value, type } = target;

    setNewTask((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? target.checked : value,
    }));
  };

  const handleRecurrenceRuleChange = (value: RecurrenceRule) => {
    setNewTask((prev) => ({
      ...prev,
      recurrenceRule: value,
      // Reset interval and end date if recurrence is set to none
      recurrenceInterval: value === "none" ? 1 : prev.recurrenceInterval,
      recurrenceEndDate: value === "none" ? "" : prev.recurrenceEndDate,
    }));
  };

  const handleTimetableFormChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setCurrentTimetableForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleTimetableDaysChange = (day: DayOfWeek) => {
    setCurrentTimetableForm((prev) => {
      const currentDays = prev.daysOfWeek || [];
      const newDays = currentDays.includes(day)
        ? currentDays.filter((d) => d !== day)
        : [...currentDays, day];
      return { ...prev, daysOfWeek: newDays };
    });
  };

  const handleSaveTimetableEntry = useCallback(() => {
    try {
      // Enhanced validation
      if (
        !currentTimetableForm.courseName ||
        !currentTimetableForm.courseCode ||
        !currentTimetableForm.startTime ||
        !currentTimetableForm.endTime ||
        !currentTimetableForm.daysOfWeek ||
        currentTimetableForm.daysOfWeek.length === 0 ||
        !currentTimetableForm.semesterStartDate ||
        !currentTimetableForm.semesterEndDate
      ) {
        const errorMsg =
          "Please fill in all required timetable fields: Course Name, Code, Start/End Time, Days, Semester Start/End Dates.";
        setState((prev) => ({ ...prev, error: errorMsg }));
        onError?.(errorMsg);
        return;
      }

      let updatedTimetable: ClassTimetableEntry[];

      if (editingTimetableEntry) {
        // Update existing entry
        const updatedEntry: ClassTimetableEntry = {
          ...editingTimetableEntry,
          ...currentTimetableForm,
        } as ClassTimetableEntry;
        updatedTimetable = classTimetable.map((entry) =>
          entry.id === updatedEntry.id ? updatedEntry : entry,
        );
      } else {
        // Add new entry
        const newEntry: ClassTimetableEntry = {
          id: `tt-${Date.now().toString()}`,
          ...currentTimetableForm,
        } as ClassTimetableEntry;
        updatedTimetable = [...classTimetable, newEntry];
      }

      setClassTimetable(updatedTimetable);
      setShowAddEditTimetableEntryDialog(false);
      setEditingTimetableEntry(null);
      setCurrentTimetableForm({});
      setState((prev) => ({ ...prev, error: null }));

      // Announce success for screen readers
      const action = editingTimetableEntry ? "updated" : "added";
      const liveRegion = document.querySelector('[aria-live="polite"]');
      if (liveRegion) {
        liveRegion.textContent = `Class "${currentTimetableForm.courseName}" ${action} successfully`;
      }
    } catch (error) {
      const errorMsg = "Failed to save timetable entry. Please try again.";
      setState((prev) => ({ ...prev, error: errorMsg }));
      onError?.(errorMsg);
      console.error("Error saving timetable entry:", error);
    }
  }, [currentTimetableForm, editingTimetableEntry, classTimetable, onError]);

  const openAddTimetableEntryDialog = () => {
    setEditingTimetableEntry(null);
    setCurrentTimetableForm({
      daysOfWeek: [], // Initialize daysOfWeek for new entry
      // Set a random predefined Tailwind class as default color
      color:
        PREDEFINED_TIMETABLE_COLORS[
          Math.floor(Math.random() * PREDEFINED_TIMETABLE_COLORS.length)
        ],
    });
    setShowAddEditTimetableEntryDialog(true);
  };

  const openEditTimetableEntryDialog = (entry: ClassTimetableEntry) => {
    setEditingTimetableEntry(entry);
    setCurrentTimetableForm(entry);
    setShowAddEditTimetableEntryDialog(true);
  };

  const handleDeleteTimetableEntry = (entryToDelete: ClassTimetableEntry) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${entryToDelete.courseName}"?`,
      )
    ) {
      setClassTimetable((prev) =>
        prev.filter((entry) => entry.id !== entryToDelete.id),
      );
    }
  };

  const handleExportICal = useCallback(() => {
    try {
      if (classTimetable.length === 0) {
        const errorMsg = "No timetable entries to export.";
        setState((prev) => ({ ...prev, error: errorMsg }));
        onError?.(errorMsg);
        return;
      }

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const icalData = exportTimetableToICal(classTimetable);
      const blob = new Blob([icalData], {
        type: "text/calendar;charset=utf-8;",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute("download", "MemoSpark_Timetable.ics");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      setState((prev) => ({ ...prev, isLoading: false }));

      // Announce success for screen readers
      const liveRegion = document.querySelector('[aria-live="polite"]');
      if (liveRegion) {
        liveRegion.textContent = "Timetable exported successfully";
      }
    } catch (error) {
      const errorMsg = "Failed to export timetable. Please try again.";
      setState((prev) => ({ ...prev, error: errorMsg, isLoading: false }));
      onError?.(errorMsg);
      console.error("Error exporting timetable:", error);
    }
  }, [classTimetable, onError]);

  // Helper function to convert ClassTimetableEntry to TimetableEntry for TimetableGrid
  const convertClassTimetableToTimetableEntry = (
    entry: ClassTimetableEntry,
  ): TimetableEntry => ({
    id: entry.id,
    user_id: "", // This would be filled from current user context
    course_name: entry.courseName,
    course_code: entry.courseCode,
    instructor: entry.instructor,
    location: entry.location,
    start_time: entry.startTime,
    end_time: entry.endTime,
    days_of_week: entry.daysOfWeek.map((day: string) =>
      day.toLowerCase(),
    ) as DayOfWeek[],
    semester_start_date: entry.semesterStartDate,
    semester_end_date: entry.semesterEndDate,
    color: entry.color,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  // Convert TimetableEntry back to ClassTimetableEntry
  const convertTimetableToClassEntry = (
    entry: TimetableEntry,
  ): ClassTimetableEntry => ({
    id: entry.id,
    courseName: entry.course_name,
    courseCode: entry.course_code || "",
    instructor: entry.instructor,
    location: entry.location,
    startTime: entry.start_time || "09:00",
    endTime: entry.end_time || "10:00",
    daysOfWeek: entry.days_of_week.map(
      (day: string) => day.charAt(0).toUpperCase() + day.slice(1),
    ) as DayOfWeek[],
    semesterStartDate: entry.semester_start_date || "",
    semesterEndDate: entry.semester_end_date || "",
    color: entry.color,
    detailedDescription: "",
  });

  return (
    <BlurFade delay={0.1} className={cn("h-full", className)}>
      <div className="h-full flex flex-col relative bg-gradient-to-br from-white to-[hsl(142,60%,98%)]">
        {/* Enhanced ARIA Live Region for status announcements */}
        <div
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
          role="status"
        >
          {/* Status messages will be announced here */}
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="m-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setState((prev) => ({ ...prev, error: null }))}
                className="ml-2"
              >
                Dismiss
              </Button>
            </AlertDescription>
          </Alert>
        )}
        <div className="p-4 border-b">
          {/* Enhanced task creation header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button
                variant={inputMode === "quick" ? "default" : "outline"}
                size="sm"
                onClick={() => setInputMode("quick")}
                className="transition-all duration-200"
              >
                Quick Add
              </Button>
              <Button
                variant={inputMode === "progressive" ? "default" : "outline"}
                size="sm"
                onClick={() => setShowProgressiveCapture(true)}
                className="transition-all duration-200"
              >
                Detailed Add
              </Button>
            </div>
            {/* Conditionally render StuTaskGuidance to prevent overlap with modals */}
            {!showProgressiveCapture && !showAddTaskDialog && (
              <StuTaskGuidance
                currentStep="quickCapture"
                taskData={{}}
                size="sm"
                position="corner"
              />
            )}
          </div>

          {/* Quick task input */}
          {inputMode === "quick" && (
            <div className="mb-4">
              <QuickTaskInput
                onTaskCreate={handleEnhancedTaskCreate}
                placeholder="What needs to be done? (e.g., 'Study math exam tomorrow')"
                className="w-full"
                autoFocus={false}

              />
            </div>
          )}

          {/* Progressive task capture dialog */}
          <ProgressiveTaskCapture
            open={showProgressiveCapture}
            onOpenChange={setShowProgressiveCapture}
            onTaskCreate={handleEnhancedTaskCreate}
          />

          <div className="flex gap-1 p-1 bg-muted/50 rounded-lg border border-border mb-6">
            <button
              onClick={() =>
                setState((prev) => ({ ...prev, viewMode: "list", error: null }))
              }
              className={viewModeButtonVariants({
                state: viewMode === "list" ? "active" : "inactive",
              })}
              aria-pressed={viewMode === "list"}
              aria-label={
                viewMode === "list"
                  ? "List view currently selected"
                  : "Switch to list view"
              }
            >
              <FaTasks className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">List View</span>
              <span className="sm:hidden">List</span>
            </button>
            <button
              onClick={() =>
                setState((prev) => ({
                  ...prev,
                  viewMode: "calendar",
                  error: null,
                }))
              }
              className={viewModeButtonVariants({
                state: viewMode === "calendar" ? "active" : "inactive",
              })}
              aria-pressed={viewMode === "calendar"}
              aria-label={
                viewMode === "calendar"
                  ? "Calendar view currently selected"
                  : "Switch to calendar view"
              }
            >
              <FaCalendarAlt className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Calendar</span>
              <span className="sm:hidden">Cal</span>
            </button>
            <button
              onClick={() =>
                setState((prev) => ({
                  ...prev,
                  viewMode: "timetable",
                  error: null,
                }))
              }
              className={viewModeButtonVariants({
                state: viewMode === "timetable" ? "active" : "inactive",
              })}
              aria-pressed={viewMode === "timetable"}
              aria-label={
                viewMode === "timetable"
                  ? "Timetable view currently selected"
                  : "Switch to timetable view"
              }
            >
              <FaTable className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Timetable</span>
              <span className="sm:hidden">Table</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {viewMode === "calendar" ? (
            <div className="calendar-container">
              <Calendar
                onChange={handleDateChange}
                value={selectedDate}
                className="w-full rounded-md border shadow-sm"
                tileClassName={({ date, view }) => {
                  if (view === "month") {
                    const tasksOnDay = getTasksForDate(date, tasks);
                    return tasksOnDay.length > 0 ? "has-task" : null;
                  }
                  return null;
                }}
                tileContent={({ date, view }) => {
                  if (view === "month") {
                    const tasksOnDay = getTasksForDate(date, tasks);
                    if (tasksOnDay.length > 0) {
                      return (
                        <span className="sr-only">
                          {tasksOnDay.length} task
                          {tasksOnDay.length > 1 ? "s" : ""}
                        </span>
                      );
                    }
                  }
                  return null;
                }}
                aria-label="Calendar view of tasks"
              />
              <div className="mt-4">
                <h3 className="font-medium mb-2">
                  Tasks for {format(selectedDate, "MMMM d, yyyy")}
                </h3>
                {(() => {
                  const tasksForSelectedDay = getTasksForDate(
                    selectedDate,
                    tasks,
                  );
                  if (tasksForSelectedDay.length > 0) {
                    return (
                      <div className="space-y-2">
                        {tasksForSelectedDay.map((task) => (
                          <Card
                            key={task.id}
                            className={taskCardVariants({
                              type: task.originalDueDate
                                ? "recurring"
                                : task.completed
                                  ? "completed"
                                  : "regular",
                            })}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-center">
                                <div className="relative mr-3 flex-shrink-0">
                                  <input
                                    id={`task-checkbox-${task.id}`}
                                    type="checkbox"
                                    checked={task.completed}
                                    onChange={() =>
                                      toggleTaskCompletion(task.id)
                                    }
                                    className={cn(
                                      "h-5 w-5 rounded border-2 transition-colors",
                                      "border-border bg-background text-primary",
                                      "focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 focus:ring-offset-background",
                                      "checked:bg-primary checked:border-primary checked:text-primary-foreground",
                                      "hover:border-primary/50",
                                    )}
                                    aria-labelledby={`task-title-${task.id}`}
                                    aria-describedby={`task-details-${task.id}`}
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p
                                    id={`task-title-${task.id}`}
                                    className={`font-medium truncate ${task.completed ? "line-through text-muted-foreground" : ""}`}
                                  >
                                    {task.title}
                                    {task.originalDueDate && (
                                      <span className="text-xs text-blue-600 font-normal">
                                        {" "}
                                        (Recurring)
                                      </span>
                                    )}
                                  </p>
                                  <div
                                    id={`task-details-${task.id}`}
                                    className="flex items-center text-xs text-muted-foreground mt-1 flex-wrap gap-x-2"
                                  >
                                    {task.subject && (
                                      <span className="mr-1 whitespace-nowrap">
                                        {task.subject}
                                      </span>
                                    )}
                                    <span className="flex items-center whitespace-nowrap">
                                      <FaClock
                                        className="mr-1 h-3 w-3"
                                        aria-hidden="true"
                                      />
                                      <span className="sr-only">
                                        Due time:{" "}
                                      </span>
                                      {format(parseISO(task.dueDate), "p")}
                                    </span>
                                    {!task.completed && (
                                      <Countdown dueDateString={task.dueDate} />
                                    )}
                                  </div>
                                </div>
                                <div
                                  className={cn(
                                    "ml-2",
                                    priorityBadgeVariants({
                                      priority: task.priority,
                                    }),
                                  )}
                                  aria-label={`Priority: ${task.priority}`}
                                  role="img"
                                />
                                <div className="ml-auto flex items-center gap-1 pl-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() =>
                                      handleEditTaskPlaceholder(task)
                                    }
                                    aria-label={`Edit task: ${task.title}`}
                                  >
                                    <Pencil
                                      className="h-4 w-4 text-muted-foreground hover:text-foreground"
                                      aria-hidden="true"
                                    />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() =>
                                      handleDeleteTaskPlaceholder(task)
                                    }
                                    aria-label={`Delete task: ${task.title}`}
                                  >
                                    <Trash2
                                      className="h-4 w-4 text-red-500 hover:text-red-700"
                                      aria-hidden="true"
                                    />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    );
                  }
                  return (
                    <p className="text-center py-4 text-muted-foreground">
                      No tasks for this date.
                    </p>
                  );
                })()}
              </div>
            </div>
          ) : viewMode === "timetable" ? (
            <div className="timetable-container">
              <h3 className="text-xl font-semibold mb-4 text-center">
                Class Timetable
              </h3>

              <TimetableGrid
                entries={classTimetable.map(
                  convertClassTimetableToTimetableEntry,
                )}
                onEditEntry={(entry) =>
                  openEditTimetableEntryDialog(
                    convertTimetableToClassEntry(entry),
                  )
                }
                onDeleteEntry={(entry) =>
                  handleDeleteTimetableEntry(
                    convertTimetableToClassEntry(entry),
                  )
                }
              />

              <div className="mt-4 flex justify-center gap-4">
                <Button
                  onClick={openAddTimetableEntryDialog}
                  size="sm"
                  aria-label="Add new class to timetable"
                >
                  <FaPlus className="mr-2 h-4 w-4" aria-hidden="true" /> Add
                  Class
                </Button>
                <Button
                  onClick={handleExportICal}
                  size="sm"
                  variant="outline"
                  aria-label="Export timetable to calendar file"
                >
                  <FaFileExport className="mr-2 h-4 w-4" aria-hidden="true" />{" "}
                  Export iCal
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="font-medium mb-2">All Upcoming Tasks & Events</h3>
              {(() => {
                // For the "list" view, we need to display all tasks including future recurring instances up to a certain point.
                // This can be complex. For now, let's display master recurring tasks and non-recurring tasks sorted by due date.
                // A more advanced implementation would generate instances for a reasonable future period (e.g., next few weeks/months).

                const allDisplayableTasks: LocalTask[] = [];
                const 앞으로ViewEndDate = addMonths(startOfDay(new Date()), 3); // Display instances for the next 3 months for example

                tasks.forEach((task) => {
                  if (task.recurrenceRule && task.recurrenceRule !== "none") {
                    // Add the master task itself (or its first upcoming instance)
                    // For simplicity, we can show the master task if its original due date is relevant
                    // Or generate instances for the upcoming period
                    const instances = generateRecurringInstances(
                      task,
                      startOfDay(new Date()),
                      앞으로ViewEndDate,
                    );
                    allDisplayableTasks.push(...instances);
                    // Optionally, ensure the master task is also shown if its main due date is in future and not yet covered by an instance
                    if (
                      !instances.find(
                        (inst) => inst.originalDueDate === task.dueDate,
                      ) &&
                      !isBefore(parseISO(task.dueDate), startOfDay(new Date()))
                    ) {
                      // allDisplayableTasks.push(task); // This might create duplicates if not handled carefully
                    }
                  } else {
                    allDisplayableTasks.push(task);
                  }
                });

                // Filter out past non-recurring tasks for a cleaner upcoming view, unless they are incomplete.
                const futureOrIncompleteTasks = allDisplayableTasks.filter(
                  (task) => {
                    const taskDueDate = parseISO(task.dueDate);
                    return (
                      !isBefore(taskDueDate, startOfDay(new Date())) ||
                      !task.completed
                    );
                  },
                );

                // Sort tasks: incomplete first, then by due date
                futureOrIncompleteTasks.sort((a, b) => {
                  if (a.completed !== b.completed) {
                    return a.completed ? 1 : -1; // Incomplete first
                  }
                  return (
                    parseISO(a.dueDate).getTime() -
                    parseISO(b.dueDate).getTime()
                  ); // Then by due date
                });

                if (futureOrIncompleteTasks.length > 0) {
                  return futureOrIncompleteTasks.map((task) => (
                    <Card
                      key={task.id}
                      className={taskCardVariants({
                        type: task.originalDueDate
                          ? "recurring"
                          : task.completed
                            ? "completed"
                            : "regular",
                      })}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center">
                          <div className="relative mr-3 flex-shrink-0">
                            <input
                              id={`task-checkbox-list-${task.id}`}
                              type="checkbox"
                              checked={task.completed}
                              onChange={() => toggleTaskCompletion(task.id)}
                              className={cn(
                                "h-5 w-5 rounded border-2 transition-colors",
                                "border-border bg-background text-primary",
                                "focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 focus:ring-offset-background",
                                "checked:bg-primary checked:border-primary checked:text-primary-foreground",
                                "hover:border-primary/50",
                              )}
                              aria-labelledby={`task-title-list-${task.id}`}
                              aria-describedby={`task-details-list-${task.id}`}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              id={`task-title-list-${task.id}`}
                              className={`font-medium truncate ${task.completed ? "line-through text-muted-foreground" : ""}`}
                            >
                              {task.title}
                              {task.originalDueDate && (
                                <span className="text-xs text-blue-600 font-normal">
                                  {" "}
                                  (Recurring)
                                </span>
                              )}
                            </p>
                            <div
                              id={`task-details-list-${task.id}`}
                              className="flex items-center text-xs text-muted-foreground mt-1 flex-wrap gap-x-2"
                            >
                              {task.subject && (
                                <span className="mr-1 whitespace-nowrap">
                                  {task.subject}
                                </span>
                              )}
                              <span className="flex items-center whitespace-nowrap">
                                <FaCalendarAlt
                                  className="mr-1 h-3 w-3"
                                  aria-hidden="true"
                                />
                                <span className="sr-only">Due date: </span>
                                {format(parseISO(task.dueDate), "MMM d, p")}
                              </span>
                              {!task.completed && (
                                <Countdown dueDateString={task.dueDate} />
                              )}
                            </div>
                          </div>
                          <div
                            className={cn(
                              "ml-2",
                              priorityBadgeVariants({
                                priority: task.priority,
                              }),
                            )}
                            aria-label={`Priority: ${task.priority}`}
                            role="img"
                          />
                          <div className="ml-auto flex items-center gap-1 pl-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleEditTaskPlaceholder(task)}
                              aria-label={`Edit task: ${task.title}`}
                            >
                              <Pencil
                                className="h-4 w-4 text-muted-foreground hover:text-foreground"
                                aria-hidden="true"
                              />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleDeleteTaskPlaceholder(task)}
                              aria-label={`Delete task: ${task.title}`}
                            >
                              <Trash2
                                className="h-4 w-4 text-red-500 hover:text-red-700"
                                aria-hidden="true"
                              />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ));
                }
                return (
                  <p className="text-center py-4 text-muted-foreground">
                    No tasks found. Add your first task!
                  </p>
                );
              })()}
            </div>
          )}
        </div>

        {/* Dialog for Adding/Editing Timetable Entry */}
        <Dialog
          open={showAddEditTimetableEntryDialog}
          onOpenChange={setShowAddEditTimetableEntryDialog}
        >
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingTimetableEntry
                  ? "Edit Class Schedule"
                  : "Add New Class Schedule"}
              </DialogTitle>
              <DialogDescription>
                {editingTimetableEntry
                  ? "Update the details of this class."
                  : "Fill in the details for the new class schedule."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="courseName" className="text-right">
                  Course Name
                </Label>
                <Input
                  id="courseName"
                  name="courseName"
                  value={currentTimetableForm.courseName || ""}
                  onChange={handleTimetableFormChange}
                  className="col-span-3"
                  placeholder="e.g., Introduction to AI"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="courseCode" className="text-right">
                  Course Code
                </Label>
                <Input
                  id="courseCode"
                  name="courseCode"
                  value={currentTimetableForm.courseCode || ""}
                  onChange={handleTimetableFormChange}
                  className="col-span-3"
                  placeholder="e.g., CS101"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="instructor" className="text-right">
                  Instructor
                </Label>
                <Input
                  id="instructor"
                  name="instructor"
                  value={currentTimetableForm.instructor || ""}
                  onChange={handleTimetableFormChange}
                  className="col-span-3"
                  placeholder="e.g., Dr. Ada Lovelace"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="location" className="text-right">
                  Location
                </Label>
                <Input
                  id="location"
                  name="location"
                  value={currentTimetableForm.location || ""}
                  onChange={handleTimetableFormChange}
                  className="col-span-3"
                  placeholder="e.g., Turing Hall, Room 101"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="startTime" className="text-right">
                  Start Time
                </Label>
                <Input
                  id="startTime"
                  name="startTime"
                  type="time"
                  value={currentTimetableForm.startTime || ""}
                  onChange={handleTimetableFormChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="endTime" className="text-right">
                  End Time
                </Label>
                <Input
                  id="endTime"
                  name="endTime"
                  type="time"
                  value={currentTimetableForm.endTime || ""}
                  onChange={handleTimetableFormChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Days</Label>
                <div className="col-span-3 flex flex-wrap gap-2">
                  {ALL_DAYS_OF_WEEK.map((day) => (
                    <Button
                      key={day}
                      variant={
                        currentTimetableForm.daysOfWeek?.includes(day)
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() => handleTimetableDaysChange(day)}
                      className="text-xs"
                    >
                      {day.substring(0, 3)}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="semesterStartDate" className="text-right">
                  Start Date
                </Label>
                <Input
                  id="semesterStartDate"
                  name="semesterStartDate"
                  type="date"
                  value={currentTimetableForm.semesterStartDate || ""}
                  onChange={handleTimetableFormChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="semesterEndDate" className="text-right">
                  End Date
                </Label>
                <Input
                  id="semesterEndDate"
                  name="semesterEndDate"
                  type="date"
                  value={currentTimetableForm.semesterEndDate || ""}
                  onChange={handleTimetableFormChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="color" className="text-right">
                  Color
                </Label>
                <Select
                  name="color"
                  value={currentTimetableForm.color || ""}
                  onValueChange={(value) =>
                    setCurrentTimetableForm((prev) => ({
                      ...prev,
                      color: value,
                    }))
                  }
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a color" />
                  </SelectTrigger>
                  <SelectContent>
                    {PREDEFINED_TIMETABLE_COLORS.map((colorClass) => (
                      <SelectItem key={colorClass} value={colorClass}>
                        <div className="flex items-center">
                          <div
                            className={cn(
                              "w-4 h-4 rounded-full mr-2",
                              colorClass,
                            )}
                          />
                          {colorClass
                            .replace("bg-", "")
                            .replace("-500", "")
                            .replace("-600", "")}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="detailedDescription" className="text-right">
                  Description
                </Label>
                <Textarea
                  id="detailedDescription"
                  name="detailedDescription"
                  value={currentTimetableForm.detailedDescription || ""}
                  onChange={handleTimetableFormChange}
                  className="col-span-3"
                  placeholder="Add any extra details about the class, like topics, exam dates, etc."
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowAddEditTimetableEntryDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveTimetableEntry}>
                {editingTimetableEntry ? "Save Changes" : "Add Class"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Additional custom styles for calendar */}
        <style jsx global>{`
        .react-calendar {
          border: 1px solid hsl(var(--border)); /* Use theme border */
          border-radius: var(--radius); /* Use theme radius */
          font-family: inherit;
          width: 100%;
          background: hsl(var(--card)); /* Use theme card background */
          color: hsl(var(--card-foreground)); /* Use theme card foreground for text */
          line-height: 1.5; /* Improved readability */
        }

        /* Navigation */
        .react-calendar__navigation button {
          color: hsl(var(--primary));
          min-width: 44px;
          background: none;
          font-size: 1rem;
          margin-top: 8px;
        }
        .react-calendar__navigation button:enabled:hover,
        .react-calendar__navigation button:enabled:focus {
          background-color: hsl(var(--muted)); /* Use theme muted for hover */
        }
        .react-calendar__navigation button[disabled] {
          color: hsl(var(--muted-foreground));
          background-color: transparent;
        }
        .react-calendar__navigation__label {
            font-weight: bold;
            color: hsl(var(--foreground));
        }

        /* Weekday Headers */
        .react-calendar__month-view__weekdays__weekday {
          padding: 0.5em;
          text-align: center;
          text-transform: uppercase;
          font-weight: bold;
          font-size: 0.75em;
          color: hsl(var(--muted-foreground));
        }
        .react-calendar__month-view__weekdays__weekday abbr[title] {
          text-decoration: none; /* Remove underline from weekday abbreviations */
        }

        /* Day Tiles */
        .react-calendar__tile {
          padding: 0.75em 0.5em;
          background: none;
          text-align: center;
          color: hsl(var(--card-foreground));
          border-radius: var(--radius);
        }
        .react-calendar__tile:disabled {
          color: hsl(var(--muted-foreground));
          background-color: hsl(var(--card)); /* Ensure it's card background */
        }
        .react-calendar__tile:enabled:hover,
        .react-calendar__tile:enabled:focus {
          background-color: hsl(var(--muted));
        }
        .react-calendar__tile--now { /* Today */
          background: hsl(var(--primary) / 0.1); /* Slight primary background */
          color: hsl(var(--primary));
          font-weight: bold;
        }
        .react-calendar__tile--now:enabled:hover,
        .react-calendar__tile--now:enabled:focus {
          background: hsl(var(--primary) / 0.2);
        }
        .react-calendar__tile--hasActive { /* Day that contains active day */
          background: hsl(var(--primary) / 0.2);
        }
        .react-calendar__tile--hasActive:enabled:hover,
        .react-calendar__tile--hasActive:enabled:focus {
          background: hsl(var(--primary) / 0.3);
        }
        .react-calendar__tile--active { /* Selected day */
          background: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
        }
        .react-calendar__tile--active:enabled:hover,
        .react-calendar__tile--active:enabled:focus {
          background: hsl(var(--primary)); /* Keep primary on hover/focus for active */
          color: hsl(var(--primary-foreground));
        }
        .react-calendar--selectRange .react-calendar__tile--hover {
          background-color: hsl(var(--muted));
        }

        /* Task marker */
        .has-task {
          position: relative;
        }
        .has-task::after {
          content: '';
          position: absolute;
          bottom: 4px;
          left: 50%;
          transform: translateX(-50%);
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: hsl(var(--primary)); /* Use theme primary color */
        }

        /* Remove default border from react-calendar if applying our own */
        .react-calendar,
        .react-calendar *, 
        .react-calendar *:before,
        .react-calendar *:after {
            -moz-box-sizing: border-box;
            -webkit-box-sizing: border-box;
            box-sizing: border-box;
        }
      `}</style>
      </div>
    </BlurFade>
  );
};

export default TaskEventTab;
