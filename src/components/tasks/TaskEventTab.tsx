"use client";

import { useState, useEffect } from "react";
import {
  format,
  parseISO,
  addDays,
  differenceInSeconds,
  differenceInMinutes,
  differenceInHours,
  differenceInDays,
  isValid,
  isWithinInterval,
  isBefore,
  isAfter,
  isEqual,
  startOfDay,
  endOfDay,
  addWeeks,
  addMonths,
  addYears,
  getDay,
  nextMonday,
  setDate,
  setHours,
  setMinutes,
  setSeconds,
} from "date-fns";
import { Calendar } from "react-calendar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FaPlus, FaCalendarAlt, FaClock, FaTasks, FaRedo, FaPencilAlt as Pencil, FaTrashAlt as Trash2, FaTable, FaCheck, FaFileExport } from "react-icons/fa";
import "react-calendar/dist/Calendar.css";
import { TimetableGrid } from "./TimetableGrid"; // Import the new TimetableGrid component
import { v4 as uuidv4 } from 'uuid'; // For generating UIDs for iCal events
import { cn } from "@/lib/utils";

// Sample data for tasks and events
type Priority = "low" | "medium" | "high";
type TaskType = "academic" | "personal";
type RecurrenceRule = "none" | "daily" | "weekly" | "monthly" | "yearly";

// Timetable Types
// Exporting these types and constants for use in TimetableGrid.tsx
export type DayOfWeek = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
export const ALL_DAYS_OF_WEEK: DayOfWeek[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const ICAL_BYDAY_MAP: Record<DayOfWeek, string> = {
  "Sunday": "SU",
  "Monday": "MO",
  "Tuesday": "TU",
  "Wednesday": "WE",
  "Thursday": "TH",
  "Friday": "FR",
  "Saturday": "SA",
};

export interface ClassTimetableEntry {
  id: string;
  courseName: string;
  courseCode: string;
  instructor?: string;
  location?: string;
  startTime: string; // HH:mm format e.g., "09:45"
  endTime: string;   // HH:mm format e.g., "11:15"
  daysOfWeek: DayOfWeek[];
  semesterStartDate: string; // yyyy-MM-dd
  semesterEndDate: string;   // yyyy-MM-dd
  color?: string; // Optional: for UI theming, e.g., tailwind bg color class or hex
  detailedDescription?: string; // New field for detailed description
}

const PREDEFINED_TIMETABLE_COLORS: string[] = [
  "bg-red-500", "bg-orange-500", "bg-amber-500", "bg-yellow-500", 
  "bg-lime-500", "bg-green-500", "bg-emerald-500", "bg-teal-500", 
  "bg-cyan-500", "bg-sky-500", "bg-blue-500", "bg-indigo-500", 
  "bg-violet-500", "bg-purple-500", "bg-fuchsia-500", "bg-pink-500", 
  "bg-rose-500"
];

interface Task {
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
    daysOfWeek: ["Monday", "Tuesday"],
    semesterStartDate: "2025-05-19",
    semesterEndDate: "2025-08-01",
    color: "bg-sky-600",
    detailedDescription: "This course covers advanced topics in pre-calculus, building on concepts from MATH101. Focus on functions, trigonometry, and an introduction to limits. Weekly quizzes and a comprehensive final exam.",
  },
  {
    id: "tt2",
    courseName: "Organizational Behaviour",
    courseCode: "BUSA132",
    instructor: "Enyonam Kudonoo",
    location: "Norton-Motulsky 207B",
    startTime: "11:30",
    endTime: "13:00",
    daysOfWeek: ["Monday", "Wednesday"],
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
    daysOfWeek: ["Monday"],
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
    daysOfWeek: ["Tuesday", "Thursday"],
    semesterStartDate: "2025-05-20",
    semesterEndDate: "2025-08-01",
    color: "bg-amber-600",
  },
];

const initialTasks: Task[] = [
  {
    id: "1",
    title: "Math Assignment",
    dueDate: format(new Date(Date.now() + 2.5 * 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm:ss"),
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
  if (minutes > 0 && days < 1) { // Only show minutes if less than a day away
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
  const [timeRemaining, setTimeRemaining] = useState(() => formatTimeRemaining(dueDateString));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(formatTimeRemaining(dueDateString));
    }, 60000); // Update every minute

    // Clear interval on unmount
    return () => clearInterval(interval);
  }, [dueDateString]);

  const isPastDue = timeRemaining === "Past due";
  const pulseAnimation = !isPastDue && timeRemaining !== "Due now" ? "animate-pulse" : "";

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold shadow-sm border ${isPastDue ? 'bg-red-100 text-red-700 border-red-200' : 'bg-blue-100 text-blue-700 border-blue-200'} ${pulseAnimation} ml-2`}>
      <FaClock className="h-3 w-3 mr-1" aria-hidden="true" />
      {timeRemaining}
    </span>
  );
};
// --- End Countdown Logic ---

// Function to generate recurring instances
const generateRecurringInstances = (masterTask: Task, viewStartDate: Date, viewEndDate: Date): Task[] => {
  if (!masterTask.recurrenceRule || masterTask.recurrenceRule === "none" || !masterTask.dueDate) {
    return [];
  }

  const instances: Task[] = [];
  let currentIterationDate = parseISO(masterTask.dueDate); // This is the date of the current iteration of the master event
  const recurrenceEndDate = masterTask.recurrenceEndDate ? startOfDay(parseISO(masterTask.recurrenceEndDate)) : null;
  const interval = masterTask.recurrenceInterval || 1;

  // Advance currentIterationDate to the first potential occurrence that is relevant to the view or recurrence window
  while(isBefore(currentIterationDate, viewStartDate) && (!recurrenceEndDate || !isAfter(startOfDay(currentIterationDate), recurrenceEndDate) )) {
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
  while (isWithinInterval(startOfDay(currentIterationDate), { start: startOfDay(viewStartDate), end: endOfDay(viewEndDate) }) || isEqual(startOfDay(currentIterationDate), startOfDay(viewStartDate)) || isEqual(startOfDay(currentIterationDate),startOfDay(viewEndDate)) ) {
    if (recurrenceEndDate && isAfter(startOfDay(currentIterationDate), recurrenceEndDate)) {
      break; // Stop if the instance is after the recurrence end date
    }

    // Only add if the current iteration date is on or after the master task's original due date
    if (!isBefore(startOfDay(currentIterationDate), startOfDay(parseISO(masterTask.dueDate)))) {
        const instanceDateStr = format(currentIterationDate, "yyyy-MM-dd");
        const isCompleted = masterTask.completedOverrides?.[instanceDateStr] ?? masterTask.completed; // Use override if exists, else master's completed status for new instances that haven't been specifically toggled

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
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; // Get local timezone

  let массовыхСобытий = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//StudySpark//TimetableExporter//EN`,
    `CALSCALE:GREGORIAN`,
    `METHOD:PUBLISH`,
    `X-WR-CALNAME:Class Timetable`,
    `X-WR-TIMEZONE:${timeZone}`,
  ];

  entries.forEach(entry => {
    const uid = uuidv4();
    const now = new Date();
    const dtstamp = format(now, "yyyyMMdd'T'HHmmss'Z'"); // Universal time for DTSTAMP

    const semesterStart = parseISO(entry.semesterStartDate);
    const semesterEnd = endOfDay(parseISO(entry.semesterEndDate)); // Ensure UNTIL includes the whole last day

    const [startHour, startMinute] = entry.startTime.split(':').map(Number);
    const [endHour, endMinute] = entry.endTime.split(':').map(Number);

    // Determine the first occurrence of any of the entry.daysOfWeek on or after semesterStart
    let firstEventDate: Date | null = null;
    for (let i = 0; i < 7; i++) {
      const thửDate = addDays(semesterStart, i);
      const dayIndex = getDay(thửDate); // 0=Sun, 1=Mon, ..., 6=Sat
      const currentDayName = ALL_DAYS_OF_WEEK[(dayIndex + 6) % 7]; // Adjust to match DayOfWeek array (Mon=0...Sun=6 if ALL_DAYS_OF_WEEK starts Mon)
                                                              // Correcting mapping based on date-fns getDay and our ALL_DAYS_OF_WEEK
      const dayNameForLookup: DayOfWeek = [
        "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
      ][dayIndex] as DayOfWeek;

      if (entry.daysOfWeek.includes(dayNameForLookup)) {
        firstEventDate = thửDate;
        break;
      }
    }

    if (!firstEventDate) return; // Should not happen if daysOfWeek and semesterStartDate are valid

    const dtstart = setSeconds(setMinutes(setHours(firstEventDate, startHour), startMinute), 0);
    const dtend = setSeconds(setMinutes(setHours(firstEventDate, endHour), endMinute), 0);
    
    // Format DTSTART/DTEND with timezone for floating times or local times
    // For simplicity, treating as local time that floats based on user's calendar app timezone setting for the VEVENT
    // Or, explicitly define timezone if times are meant to be fixed irrespective of user's calendar default TZ
    const dtstartStr = format(dtstart, "yyyyMMdd'T'HHmmss");
    const dtendStr = format(dtend, "yyyyMMdd'T'HHmmss");

    const bydayRule = entry.daysOfWeek.map(day => ICAL_BYDAY_MAP[day]).join(',');
    const untilStr = format(semesterEnd, "yyyyMMdd'T'HHmmss'Z'"); // Format semesterEnd (which is EOD local) to UTC string

    массовыхСобытий.push('BEGIN:VEVENT');
    массовыхСобытий.push(`UID:${uid}`);
    массовыхСобытий.push(`DTSTAMP:${dtstamp}`);
    массовыхСобытий.push(`DTSTART;TZID=${timeZone}:${dtstartStr}`);
    массовыхСобытий.push(`DTEND;TZID=${timeZone}:${dtendStr}`);
    массовыхСобытий.push(`RRULE:FREQ=WEEKLY;BYDAY=${bydayRule};UNTIL=${untilStr}`);
    массовыхСобытий.push(`SUMMARY:${entry.courseName} (${entry.courseCode || ''})`.trim());
    if (entry.location) массовыхСобытий.push(`LOCATION:${entry.location}`);
    let description = '';
    if (entry.instructor) description += `Instructor: ${entry.instructor}`;
    if (description) массовыхСобытий.push(`DESCRIPTION:${description}`);
    // Add alarm if needed
    // BEGIN:VALARM
    // TRIGGER:-PT15M (15 minutes before)
    // ACTION:DISPLAY
    // DESCRIPTION:Reminder
    // END:VALARM
    массовыхСобытий.push('END:VEVENT');
  });

  массовыхСобытий.push('END:VCALENDAR');
  return массовыхСобытий.join('\r\n'); // Standard line ending for iCal
};

const TaskEventTab = () => {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showAddTaskDialog, setShowAddTaskDialog] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "calendar" | "timetable">("list");
  
  const [classTimetable, setClassTimetable] = useState<ClassTimetableEntry[]>(initialTimetableEntries);
  // State for Add/Edit Timetable Entry Dialog
  const [showAddEditTimetableEntryDialog, setShowAddEditTimetableEntryDialog] = useState(false);
  const [editingTimetableEntry, setEditingTimetableEntry] = useState<ClassTimetableEntry | null>(null);
  const [currentTimetableForm, setCurrentTimetableForm] = useState<Partial<ClassTimetableEntry>>({});
  
  const initialNewTaskState: Omit<Task, "id" | "completed"> = {
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
  const [newTask, setNewTask] = useState<Omit<Task, "id" | "completed">>(initialNewTaskState);

  const handleAddTask = () => {
    if (!newTask.title || !newTask.dueDate) {
      // Basic validation, can be enhanced
      alert("Title and Due Date are required.");
      return;
    }

    const taskToAdd: Task = {
      ...newTask,
      id: Date.now().toString(),
      completed: false,
      // Ensure recurrenceInterval is a number if rule is not none
      recurrenceInterval: newTask.recurrenceRule !== "none" && newTask.recurrenceInterval ? Number(newTask.recurrenceInterval) : undefined,
      // Clear recurrenceEndDate if rule is none or if date is invalid
      recurrenceEndDate: newTask.recurrenceRule !== "none" && newTask.recurrenceEndDate && isValid(parseISO(newTask.recurrenceEndDate)) ? newTask.recurrenceEndDate : undefined,
    };

    setTasks([...tasks, taskToAdd]);
    setShowAddTaskDialog(false);
    setNewTask(initialNewTaskState); // Reset form
  };

  // Updated function to get all tasks for a given day, including recurring instances
  const getTasksForDate = (date: Date, allTasks: Task[]): Task[] => {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);
    const visibleTasks: Task[] = [];

    allTasks.forEach(task => {
      if (task.recurrenceRule && task.recurrenceRule !== "none") {
        // For recurring tasks, generate instances for this specific day
        const instances = generateRecurringInstances(task, dayStart, dayEnd);
        visibleTasks.push(...instances);
      } else {
        // For non-recurring tasks, check if dueDate falls on this day
        if (task.dueDate && isEqual(startOfDay(parseISO(task.dueDate)), dayStart)) {
          visibleTasks.push(task);
        }
      }
    });
    return visibleTasks.sort((a, b) => parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime());
  };

  const handleDateChange = (date: any) => {
    if (date instanceof Date) {
      setSelectedDate(date);
    } else {
      console.warn("Calendar onChange returned non-Date value:", date);
    }
  };

  const toggleTaskCompletion = (taskId: string) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) => {
        if (task.id === taskId) { // Direct match for non-generated tasks or master tasks
          if (task.originalDueDate) { // This is an instance that was somehow stored directly (not typical with current generation)
            // This case needs careful thought if instances are ever stored in main `tasks` array.
            // For now, assume instances are always generated and not stored in `tasks` state.
            return { ...task, completed: !task.completed }; 
          } else { // Master task or non-recurring task
            return { ...task, completed: !task.completed };
          }
        } else if (taskId.startsWith(task.id + "-instance-")) { // Check if taskId is an instance of the current master task 'task'
          // This is a generated instance. Update the master task's completedOverrides.
          const instanceDateStr = taskId.substring(taskId.lastIndexOf('-') + 1);
          // We need to parse this date string to ensure it's in yyyy-MM-dd format for the key
          // Assuming the instance ID format is `${masterTask.id}-instance-${format(currentIterationDate, "yyyyMMdd")}`
          // Let's adjust the instance ID to be parsable or use the dueDate of the instance directly if available before this map.
          // For now, this won't work reliably as `task` objects in `prevTasks` are masters, not instances with the target ID.
          // The logic needs to identify the master task from the instance taskId and update ITS completedOverrides.
          // This part is complex because we are iterating master tasks here.
        }
        return task;
      })
    );

    // Revised logic for toggling completion, especially for instances:
    const [masterId, , instanceDateSuffix] = taskId.split('-instance-');
    const isInstance = masterId && instanceDateSuffix;

    if (isInstance) {
        const instanceDateForOverride = format(parseISO(tasks.find(t=>t.id === taskId)?.dueDate || ""), "yyyy-MM-dd"); // This needs the task object of the instance.
                                                                                                    // This is problematic because map runs on `tasks` which are masters.
                                                                                                    // We need to get the instance's date from its ID or its properties.
                                                                                                    // Let's assume the instance ID suffix is `yyyyMMdd`
        const actualInstanceDate = parseISO(instanceDateSuffix); // This assumes `instanceDateSuffix` is 'yyyyMMdd'
        const formattedInstanceDateKey = format(actualInstanceDate, 'yyyy-MM-dd');

        setTasks(prevTasks => prevTasks.map(master => {
            if (master.id === masterId) {
                const newOverrides = { ...master.completedOverrides };
                newOverrides[formattedInstanceDateKey] = !(master.completedOverrides?.[formattedInstanceDateKey] ?? master.completed);
                return { ...master, completedOverrides: newOverrides };
            }
            return master;
        }));
    } else {
        // Non-instance (original task or master of a recurrence)
        setTasks(prevTasks => prevTasks.map(task => 
        task.id === taskId ? { ...task, completed: !task.completed } : task
        ));
    }
  };

  const handleEditTaskPlaceholder = (task: Task) => {
    console.log(`Edit clicked for task: ${task.title} (ID: ${task.id})`);
    if (task.originalDueDate || (task.recurrenceRule && task.recurrenceRule !== 'none')) {
      alert("Imagine a dialog here asking to edit: Just this instance? This and future? Or all in series?");
    }
  };

  const handleDeleteTaskPlaceholder = (task: Task) => {
    console.log(`Delete clicked for task: ${task.title} (ID: ${task.id})`);
    if (task.originalDueDate || (task.recurrenceRule && task.recurrenceRule !== 'none')) {
      alert("Imagine a dialog here asking to delete: Just this instance? This and future? Or all in series?");
    }
    // Basic delete for now: removes from main tasks array. Doesn't handle recurring series properly.
    // setTasks(prevTasks => prevTasks.filter(t => t.id !== task.id)); 
  };

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case "high":
        return "bg-red-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-green-500";
      default:
        return "bg-gray-400";
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const target = e.target as HTMLInputElement; // Type assertion for checked property
    const { name, value, type } = target;
    
    setNewTask(prev => ({
      ...prev,
      [name]: type === "checkbox" ? target.checked : value,
    }));
  };

  const handleRecurrenceRuleChange = (value: RecurrenceRule) => {
    setNewTask(prev => ({
      ...prev,
      recurrenceRule: value,
      // Reset interval and end date if recurrence is set to none
      recurrenceInterval: value === "none" ? 1 : prev.recurrenceInterval,
      recurrenceEndDate: value === "none" ? "" : prev.recurrenceEndDate,
    }));
  };

  const handleTimetableFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCurrentTimetableForm(prev => ({ ...prev, [name]: value }));
  };

  const handleTimetableDaysChange = (day: DayOfWeek) => {
    setCurrentTimetableForm(prev => {
      const currentDays = prev.daysOfWeek || [];
      const newDays = currentDays.includes(day) 
        ? currentDays.filter(d => d !== day) 
        : [...currentDays, day];
      return { ...prev, daysOfWeek: newDays };
    });
  };

  const handleSaveTimetableEntry = () => {
    // Basic Validation
    if (!currentTimetableForm.courseName || !currentTimetableForm.courseCode || 
        !currentTimetableForm.startTime || !currentTimetableForm.endTime || 
        !currentTimetableForm.daysOfWeek || currentTimetableForm.daysOfWeek.length === 0 ||
        !currentTimetableForm.semesterStartDate || !currentTimetableForm.semesterEndDate) {
      alert("Please fill in all required timetable fields: Course Name, Code, Start/End Time, Days, Semester Start/End Dates.");
      return;
    }

    if (editingTimetableEntry) { // Update existing entry
      const updatedEntry: ClassTimetableEntry = { ...editingTimetableEntry, ...currentTimetableForm } as ClassTimetableEntry;
      setClassTimetable(prev => prev.map(entry => entry.id === updatedEntry.id ? updatedEntry : entry));
    } else { // Add new entry
      const newEntry: ClassTimetableEntry = {
        id: `tt-${Date.now().toString()}`,
        ...currentTimetableForm,
      } as ClassTimetableEntry; // Type assertion, ensure all required fields are there via validation
      setClassTimetable(prev => [...prev, newEntry]);
    }
    setShowAddEditTimetableEntryDialog(false);
    setEditingTimetableEntry(null);
    setCurrentTimetableForm({});
  };

  const openAddTimetableEntryDialog = () => {
    setEditingTimetableEntry(null);
    setCurrentTimetableForm({
      daysOfWeek: [], // Initialize daysOfWeek for new entry
      // Set a random predefined Tailwind class as default color
      color: PREDEFINED_TIMETABLE_COLORS[Math.floor(Math.random() * PREDEFINED_TIMETABLE_COLORS.length)] 
    });
    setShowAddEditTimetableEntryDialog(true);
  };
  
  const openEditTimetableEntryDialog = (entry: ClassTimetableEntry) => {
    setEditingTimetableEntry(entry);
    setCurrentTimetableForm(entry);
    setShowAddEditTimetableEntryDialog(true);
  };

  const handleDeleteTimetableEntry = (entryToDelete: ClassTimetableEntry) => {
    if (window.confirm(`Are you sure you want to delete "${entryToDelete.courseName}"?`)) {
      setClassTimetable(prev => prev.filter(entry => entry.id !== entryToDelete.id));
    }
  };

  const handleExportICal = () => {
    if (classTimetable.length === 0) {
      alert("No timetable entries to export.");
      return;
    }
    const icalData = exportTimetableToICal(classTimetable);
    const blob = new Blob([icalData], { type: 'text/calendar;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "StudySpark_Timetable.ics");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="h-full flex flex-col relative">
      <div className="p-4 border-b">
        <div className="flex items-center mb-4">
          <div className="flex-1">
            {/* <h1 className="text-2xl font-bold flex-1">Tasks & Events</h1> REMOVED */}
          </div>
          <Dialog open={showAddTaskDialog} onOpenChange={setShowAddTaskDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-full h-8 w-8 p-0" aria-label="Add new task or event">
                <FaPlus className="h-4 w-4" aria-hidden="true" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Task/Event</DialogTitle>
                <DialogDescription>
                  Fill in the details for your new task or event. Add recurrence if needed.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); handleAddTask(); }}>
                <div className="grid gap-4 py-4">
                  
                  <div>
                    <Label htmlFor="task-title">Title</Label>
                    <Input id="task-title" name="title" placeholder="e.g., Finish project report" value={newTask.title} onChange={handleInputChange} className="mt-1" />
                  </div>

                  <div>
                    <Label htmlFor="task-description">Description (Optional)</Label>
                    <textarea 
                        id="task-description" 
                        name="description" 
                        placeholder="e.g., Outline chapters, write introduction..." 
                        value={newTask.description}
                        onChange={handleInputChange} 
                        className="mt-1 w-full min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="task-dueDate">Due Date & Time</Label>
                    <Input id="task-dueDate" name="dueDate" type="datetime-local" value={newTask.dueDate} onChange={handleInputChange} className="mt-1" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="task-priority">Priority</Label>
                      <Select name="priority" value={newTask.priority} onValueChange={(value: Priority) => setNewTask(prev => ({...prev, priority: value}))}>
                        <SelectTrigger id="task-priority" className="mt-1">
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="task-type">Type</Label>
                      <Select name="type" value={newTask.type} onValueChange={(value: TaskType) => setNewTask(prev => ({...prev, type: value}))}>
                        <SelectTrigger id="task-type" className="mt-1">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="academic">Academic</SelectItem>
                          <SelectItem value="personal">Personal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="task-subject">Subject/Category (Optional)</Label>
                    <Input id="task-subject" name="subject" placeholder="e.g., Mathematics" value={newTask.subject} onChange={handleInputChange} className="mt-1" />
                  </div>
                  
                  <div className="flex items-center space-x-2 mt-2">
                    <input type="checkbox" id="task-reminder" name="reminder" checked={newTask.reminder} onChange={handleInputChange} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"/>
                    <Label htmlFor="task-reminder" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Set Reminder
                    </Label>
                  </div>

                  {/* Recurrence Fields */}
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="text-sm font-medium mb-2 flex items-center"><FaRedo className="mr-2 h-3.5 w-3.5 text-muted-foreground"/>Recurrence Settings</h4>
                    <div>
                      <Label htmlFor="task-recurrenceRule">Repeats</Label>
                      <Select name="recurrenceRule" value={newTask.recurrenceRule} onValueChange={handleRecurrenceRuleChange}>
                        <SelectTrigger id="task-recurrenceRule" className="mt-1">
                          <SelectValue placeholder="Select recurrence" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {newTask.recurrenceRule && newTask.recurrenceRule !== "none" && (
                      <div className="mt-3 grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="task-recurrenceInterval">Interval</Label>
                          <Input 
                            id="task-recurrenceInterval" 
                            name="recurrenceInterval" 
                            type="number" 
                            min="1" 
                            value={newTask.recurrenceInterval}
                            onChange={handleInputChange} 
                            className="mt-1" 
                            placeholder={`Every ${newTask.recurrenceRule === "daily" ? "day(s)" : newTask.recurrenceRule === "weekly" ? "week(s)" : newTask.recurrenceRule === "monthly" ? "month(s)" : "year(s)"}`}
                          />
                        </div>
                        <div>
                          <Label htmlFor="task-recurrenceEndDate">Ends On (Optional)</Label>
                          <Input 
                            id="task-recurrenceEndDate" 
                            name="recurrenceEndDate" 
                            type="date" 
                            value={newTask.recurrenceEndDate}
                            onChange={handleInputChange} 
                            className="mt-1" 
                            min={format(addDays(parseISO(newTask.dueDate), 1), 'yyyy-MM-dd')} // End date must be after due date
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowAddTaskDialog(false)}>Cancel</Button>
                  <Button type="submit">Add Task</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex space-x-2 mb-2">
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
            className="flex-1"
          >
            <FaTasks className="mr-2 h-4 w-4" /> List View
          </Button>
          <Button
            variant={viewMode === "calendar" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("calendar")}
            className="flex-1"
          >
            <FaCalendarAlt className="mr-2 h-4 w-4" /> Calendar
          </Button>
          <Button
            variant={viewMode === "timetable" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("timetable")}
            className="flex-1"
          >
            <FaTable className="mr-2 h-4 w-4" /> Timetable
          </Button>
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
                if (view === 'month') {
                  const tasksOnDay = getTasksForDate(date, tasks);
                  return tasksOnDay.length > 0 ? "has-task" : null;
                }
                return null;
              }}
            />
            <div className="mt-4">
              <h3 className="font-medium mb-2">
                Tasks for {format(selectedDate, "MMMM d, yyyy")}
              </h3>
              {(() => {
                const tasksForSelectedDay = getTasksForDate(selectedDate, tasks);
                if (tasksForSelectedDay.length > 0) {
                  return (
                <div className="space-y-2">
                      {tasksForSelectedDay.map((task) => (
                        <Card key={task.id} className={`shadow-sm ${task.originalDueDate ? 'bg-blue-50 border-blue-200' : ''}`}>
                      <CardContent className="p-3">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={task.completed}
                            onChange={() => toggleTaskCompletion(task.id)}
                            className="mr-3 h-5 w-5 rounded border-gray-300 flex-shrink-0"
                                aria-labelledby={`task-title-${task.id}`}
                          />
                          <div className="flex-1 min-w-0">
                                <p id={`task-title-${task.id}`} className={`font-medium truncate ${task.completed ? "line-through text-muted-foreground" : ""}`}>
                              {task.title}
                                  {task.originalDueDate && <span className="text-xs text-blue-600 font-normal"> (Recurring)</span>}
                            </p>
                            <div className="flex items-center text-xs text-muted-foreground mt-1 flex-wrap gap-x-2">
                              {task.subject && <span className="mr-1 whitespace-nowrap">{task.subject}</span>}
                              <span className="flex items-center whitespace-nowrap">
                                <FaClock className="mr-1 h-3 w-3" />
                                {format(parseISO(task.dueDate), "p")}
                              </span>
                              {!task.completed && <Countdown dueDateString={task.dueDate} />}
                            </div>
                          </div>
                          <div className={`ml-2 h-3 w-3 rounded-full flex-shrink-0 ${getPriorityColor(task.priority)}`} />
                              <div className="ml-auto flex items-center gap-1 pl-2">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditTaskPlaceholder(task)} aria-label="Edit task">
                                  <Pencil className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteTaskPlaceholder(task)} aria-label="Delete task">
                                  <Trash2 className="h-4 w-4 text-red-500 hover:text-red-700" />
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
            <h3 className="text-xl font-semibold mb-4 text-center">Class Timetable</h3>
            
            <TimetableGrid 
              entries={classTimetable} 
              onEditEntry={openEditTimetableEntryDialog} 
              onDeleteEntry={handleDeleteTimetableEntry} 
            />
            
            <div className="mt-4 flex justify-center gap-4">
                <Button onClick={openAddTimetableEntryDialog} size="sm">
                    <FaPlus className="mr-2 h-4 w-4" /> Add Class
                </Button>
                <Button onClick={handleExportICal} size="sm" variant="outline">
                    <FaFileExport className="mr-2 h-4 w-4" /> Export iCal
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
              
              const allDisplayableTasks: Task[] = [];
              const 앞으로ViewEndDate = addMonths(startOfDay(new Date()), 3); // Display instances for the next 3 months for example

              tasks.forEach(task => {
                if (task.recurrenceRule && task.recurrenceRule !== 'none') {
                  // Add the master task itself (or its first upcoming instance)
                  // For simplicity, we can show the master task if its original due date is relevant
                  // Or generate instances for the upcoming period
                  const instances = generateRecurringInstances(task, startOfDay(new Date()), 앞으로ViewEndDate);
                  allDisplayableTasks.push(...instances);
                  // Optionally, ensure the master task is also shown if its main due date is in future and not yet covered by an instance
                  if (!instances.find(inst => inst.originalDueDate === task.dueDate) && !isBefore(parseISO(task.dueDate), startOfDay(new Date()))) {
                     // allDisplayableTasks.push(task); // This might create duplicates if not handled carefully
                  }
                } else {
                  allDisplayableTasks.push(task);
                }
              });

              // Filter out past non-recurring tasks for a cleaner upcoming view, unless they are incomplete.
              const futureOrIncompleteTasks = allDisplayableTasks.filter(task => {
                const taskDueDate = parseISO(task.dueDate);
                return !isBefore(taskDueDate, startOfDay(new Date())) || !task.completed;
              });

              // Sort tasks: incomplete first, then by due date
              futureOrIncompleteTasks.sort((a, b) => {
                if (a.completed !== b.completed) {
                  return a.completed ? 1 : -1; // Incomplete first
                }
                return parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime(); // Then by due date
              });

              if (futureOrIncompleteTasks.length > 0) {
                return futureOrIncompleteTasks.map((task) => (
                  <Card key={task.id} className={`shadow-sm ${task.originalDueDate ? 'bg-blue-50 border-blue-200' : ''}`}>
                    <CardContent className="p-3">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={() => toggleTaskCompletion(task.id)}
                          className="mr-3 h-5 w-5 rounded border-gray-300 flex-shrink-0"
                          aria-labelledby={`task-title-${task.id}`}
                        />
                        <div className="flex-1 min-w-0">
                          <p id={`task-title-${task.id}`} className={`font-medium truncate ${task.completed ? "line-through text-muted-foreground" : ""}`}>
                            {task.title}
                            {task.originalDueDate && <span className="text-xs text-blue-600 font-normal"> (Recurring)</span>}
                          </p>
                          <div className="flex items-center text-xs text-muted-foreground mt-1 flex-wrap gap-x-2">
                            {task.subject && <span className="mr-1 whitespace-nowrap">{task.subject}</span>}
                            <span className="flex items-center whitespace-nowrap">
                              <FaCalendarAlt className="mr-1 h-3 w-3" />
                              {format(parseISO(task.dueDate), "MMM d, p")}
                            </span>
                            {!task.completed && <Countdown dueDateString={task.dueDate} />}
                          </div>
                        </div>
                        <div className={`ml-2 h-3 w-3 rounded-full flex-shrink-0 ${getPriorityColor(task.priority)}`} />
                        <div className="ml-auto flex items-center gap-1 pl-2">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditTaskPlaceholder(task)} aria-label="Edit task">
                            <Pencil className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteTaskPlaceholder(task)} aria-label="Delete task">
                            <Trash2 className="h-4 w-4 text-red-500 hover:text-red-700" />
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

      {/* Floating Action Button for Add Task/Event */}
      {!showAddTaskDialog && !showAddEditTimetableEntryDialog && ( // Only show if no dialogs are open
        <Button 
          onClick={() => setShowAddTaskDialog(true)}
          className="fixed bottom-20 right-6 md:bottom-24 md:right-8 lg:bottom-6 lg:right-6 z-30 h-14 w-14 rounded-full shadow-xl flex items-center justify-center bg-primary hover:bg-primary/90 text-primary-foreground p-0 animate-bounce hover:animate-none"
          aria-label="Add new task or event"
          title="Add new task or event"
        >
          <FaPlus className="h-6 w-6" />
        </Button>
      )}

      {/* Dialog for Adding/Editing Timetable Entry */}
      <Dialog open={showAddEditTimetableEntryDialog} onOpenChange={setShowAddEditTimetableEntryDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTimetableEntry ? "Edit Class Schedule" : "Add New Class Schedule"}</DialogTitle>
            <DialogDescription>
              {editingTimetableEntry ? "Update the details of this class." : "Fill in the details for the new class schedule."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleSaveTimetableEntry(); }} className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tt-courseName">Course Name</Label>
                <Input id="tt-courseName" name="courseName" value={currentTimetableForm.courseName || ''} onChange={handleTimetableFormChange} className="mt-1" placeholder="e.g., Pre-Calculus II"/>
              </div>
              <div>
                <Label htmlFor="tt-courseCode">Course Code</Label>
                <Input id="tt-courseCode" name="courseCode" value={currentTimetableForm.courseCode || ''} onChange={handleTimetableFormChange} className="mt-1" placeholder="e.g., MATH122"/>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tt-instructor">Instructor (Optional)</Label>
                <Input id="tt-instructor" name="instructor" value={currentTimetableForm.instructor || ''} onChange={handleTimetableFormChange} className="mt-1" placeholder="e.g., Dr. Smith"/>
              </div>
              <div>
                <Label htmlFor="tt-location">Location (Optional)</Label>
                <Input id="tt-location" name="location" value={currentTimetableForm.location || ''} onChange={handleTimetableFormChange} className="mt-1" placeholder="e.g., Room 101"/>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tt-startTime">Start Time</Label>
                <Input id="tt-startTime" name="startTime" type="time" value={currentTimetableForm.startTime || ''} onChange={handleTimetableFormChange} className="mt-1"/>
              </div>
              <div>
                <Label htmlFor="tt-endTime">End Time</Label>
                <Input id="tt-endTime" name="endTime" type="time" value={currentTimetableForm.endTime || ''} onChange={handleTimetableFormChange} className="mt-1"/>
              </div>
            </div>
            <div>
              <Label>Days of the Week</Label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-1 border p-2 rounded-md">
                {ALL_DAYS_OF_WEEK.map(day => (
                  <Button 
                    key={day} 
                    type="button"
                    variant={(currentTimetableForm.daysOfWeek || []).includes(day) ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleTimetableDaysChange(day)}
                    className="text-xs justify-start"
                  >
                    {(currentTimetableForm.daysOfWeek || []).includes(day) && <FaCheck className="mr-2 h-3 w-3"/>}
                    {day}
                  </Button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tt-semesterStartDate">Semester Start Date</Label>
                <Input id="tt-semesterStartDate" name="semesterStartDate" type="date" value={currentTimetableForm.semesterStartDate || ''} onChange={handleTimetableFormChange} className="mt-1"/>
              </div>
              <div>
                <Label htmlFor="tt-semesterEndDate">Semester End Date</Label>
                <Input id="tt-semesterEndDate" name="semesterEndDate" type="date" value={currentTimetableForm.semesterEndDate || ''} onChange={handleTimetableFormChange} className="mt-1"/>
              </div>
            </div>
            <div>
                <Label htmlFor="tt-detailedDescription">Detailed Description (Optional)</Label>
                <Textarea 
                    id="tt-detailedDescription" 
                    name="detailedDescription" 
                    value={currentTimetableForm.detailedDescription || ''} 
                    onChange={handleTimetableFormChange} 
                    className="mt-1" 
                    placeholder="e.g., Syllabus overview, required materials, grading policy..."
                    rows={3}
                />
            </div>
            <div>
                <Label htmlFor="tt-color">Color (Optional)</Label>
                <div className="flex items-center mt-1">
                    {/* <Input id="tt-color" name="color" type="color" value={currentTimetableForm.color || '#3b82f6'} onChange={handleTimetableFormChange} className="h-8 w-12 p-1 mr-2"/> */}
                    <Input 
                        id="tt-color-text" 
                        name="color" 
                        value={currentTimetableForm.color || ''} 
                        onChange={handleTimetableFormChange} 
                        placeholder="e.g., bg-blue-500" 
                        className="h-8 text-xs flex-grow"
                    />
                </div>
                <div className="mt-2 grid grid-cols-6 sm:grid-cols-8 gap-1.5">
                    {PREDEFINED_TIMETABLE_COLORS.map(bgColorClass => (
                        <Button
                            type="button"
                            key={bgColorClass}
                            className={cn("h-6 w-full p-0 border-2", 
                                currentTimetableForm.color === bgColorClass ? 'border-ring ring-2 ring-offset-2 ring-foreground' : 'border-transparent',
                                bgColorClass
                            )}
                            aria-label={`Set color to ${bgColorClass}`}
                            onClick={() => setCurrentTimetableForm(prev => ({ ...prev, color: bgColorClass }))}
                        />
                    ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Select a preset or type a Tailwind background class (e.g., bg-sky-500).</p>
            </div>
          </form>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { setShowAddEditTimetableEntryDialog(false); setEditingTimetableEntry(null); setCurrentTimetableForm({}); }}>Cancel</Button>
            <Button type="submit" onClick={handleSaveTimetableEntry}>Save Class Schedule</Button>
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
  );
};

export default TaskEventTab;
