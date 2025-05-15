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
} from "@/components/ui/dialog";
import { FaPlus, FaCalendarAlt, FaClock, FaTasks } from "react-icons/fa";
import "react-calendar/dist/Calendar.css";

// Sample data for tasks and events
type Priority = "low" | "medium" | "high";
type TaskType = "academic" | "personal";

interface Task {
  id: string;
  title: string;
  dueDate: string;
  priority: Priority;
  type: TaskType;
  subject?: string;
  completed: boolean;
  reminder: boolean;
}

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

const TaskEventTab = () => {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>(initialTasks);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showAddTask, setShowAddTask] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [newTask, setNewTask] = useState<Omit<Task, "id" | "completed">>({
    title: "",
    dueDate: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss"),
    priority: "medium",
    type: "academic",
    subject: "",
    reminder: true,
  });

  const handleAddTask = () => {
    if (!newTask.title) return;

    const task: Task = {
      ...newTask,
      id: Date.now().toString(),
      completed: false,
    };

    setTasks([...tasks, task]);
    setFilteredTasks([...tasks, task]);
    setShowAddTask(false);
    setNewTask({
      title: "",
      dueDate: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss"),
      priority: "medium",
      type: "academic",
      subject: "",
      reminder: true,
    });
  };

  const handleDateChange = (date: any) => {
    if (date instanceof Date) {
      setSelectedDate(date);
      filterTasksByDate(date);
    } else {
      console.warn("Calendar onChange returned non-Date value:", date);
    }
  };

  const filterTasksByDate = (date: Date) => {
    const formattedDate = format(date, "yyyy-MM-dd");
    const filtered = tasks.filter((task) => task.dueDate.startsWith(formattedDate));
    setFilteredTasks(filtered);
  };

  const toggleTaskCompletion = (taskId: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    );
    setFilteredTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    );
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
    const target = e.target as HTMLInputElement;
    const { name, value, type } = target;
    setNewTask({
      ...newTask,
      [name]: type === "checkbox" ? target.checked : value,
    });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center mb-4">
          <div className="flex-1">
            {/* <h1 className="text-2xl font-bold flex-1">Tasks & Events</h1> REMOVED */}
          </div>
          <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-full h-8 w-8 p-0" aria-label="Add new task or event">
                <FaPlus className="h-4 w-4" aria-hidden="true" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Task/Event</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); handleAddTask(); }}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="task-title" className="text-right col-span-1">Title</label>
                    <Input id="task-title" name="title" placeholder="e.g., Finish project report" value={newTask.title} onChange={handleInputChange} className="col-span-3" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="task-dueDate" className="text-right col-span-1">Due Date</label>
                    <Input id="task-dueDate" name="dueDate" type="datetime-local" value={newTask.dueDate} onChange={handleInputChange} className="col-span-3" />
                  </div>
                </div>
                <DialogFooter>
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
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {viewMode === "calendar" ? (
          <div className="calendar-container">
            <Calendar
              onChange={handleDateChange}
              value={selectedDate}
              className="w-full rounded-md border shadow-sm"
              tileClassName={({ date }) => {
                const formattedDate = format(date, "yyyy-MM-dd");
                const hasTask = tasks.some((task) => task.dueDate.startsWith(formattedDate));
                return hasTask ? "has-task" : null;
              }}
            />
            <div className="mt-4">
              <h3 className="font-medium mb-2">
                Tasks for {format(selectedDate, "MMMM d, yyyy")}
              </h3>
              {filteredTasks.length > 0 ? (
                <div className="space-y-2">
                  {filteredTasks.map((task) => (
                    <Card key={task.id} className="shadow-sm">
                      <CardContent className="p-3">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={task.completed}
                            onChange={() => toggleTaskCompletion(task.id)}
                            className="mr-3 h-5 w-5 rounded border-gray-300 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium truncate ${task.completed ? "line-through text-muted-foreground" : ""}`}>
                              {task.title}
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
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-center py-4 text-muted-foreground">
                  No tasks for this date.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="font-medium mb-2">Upcoming Tasks</h3>
            {tasks.length > 0 ? (
              tasks
                .sort((a, b) => {
                  if (a.completed === b.completed) {
                    // If both completed or both incomplete, sort by date
                    return (
                      new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
                    );
                  }
                  // Put incomplete tasks first
                  return a.completed ? 1 : -1;
                })
                .map((task) => (
                  <Card key={task.id} className="shadow-sm">
                    <CardContent className="p-3">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={() => toggleTaskCompletion(task.id)}
                          className="mr-3 h-5 w-5 rounded border-gray-300 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium truncate ${task.completed ? "line-through text-muted-foreground" : ""}`}>
                            {task.title}
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
                      </div>
                    </CardContent>
                  </Card>
                ))
            ) : (
              <p className="text-center py-4 text-muted-foreground">
                No tasks found. Add your first task!
              </p>
            )}
          </div>
        )}
      </div>

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
