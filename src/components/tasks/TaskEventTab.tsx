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

  return <span className="text-xs text-blue-600 dark:text-blue-400 ml-2">({timeRemaining})</span>;
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
          <h1 className="text-2xl font-bold flex-1">Tasks & Events</h1>
          <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-full h-8 w-8 p-0">
                <FaPlus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Task/Event</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <Input name="title" placeholder="Title" value={newTask.title} onChange={handleInputChange} />
                <Input name="dueDate" type="datetime-local" value={newTask.dueDate} onChange={handleInputChange} />
              </div>
              <DialogFooter>
                <Button onClick={handleAddTask}>Add Task</Button>
              </DialogFooter>
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
          border: none;
          font-family: inherit;
          width: 100%;
        }
        .react-calendar__tile--active {
          background: hsl(142, 60%, 45%);
          color: white;
        }
        .react-calendar__tile--active:enabled:hover,
        .react-calendar__tile--active:enabled:focus {
          background: hsl(142, 60%, 40%);
        }
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
          background-color: hsl(142, 60%, 45%);
        }
      `}</style>
    </div>
  );
};

export default TaskEventTab;
