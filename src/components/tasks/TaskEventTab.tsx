"use client";

import { useState } from "react";
import { format, parseISO, addDays } from "date-fns";
import { Calendar } from "react-calendar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
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
    dueDate: format(addDays(new Date(), 2), "yyyy-MM-dd"),
    priority: "high",
    type: "academic",
    subject: "Mathematics",
    completed: false,
    reminder: true,
  },
  {
    id: "2",
    title: "Study Group Meeting",
    dueDate: format(addDays(new Date(), 1), "yyyy-MM-dd"),
    priority: "medium",
    type: "academic",
    subject: "Physics",
    completed: false,
    reminder: true,
  },
  {
    id: "3",
    title: "Grocery Shopping",
    dueDate: format(new Date(), "yyyy-MM-dd"),
    priority: "low",
    type: "personal",
    completed: false,
    reminder: false,
  },
];

const TaskEventTab = () => {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>(initialTasks);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showAddTask, setShowAddTask] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [newTask, setNewTask] = useState<Omit<Task, "id" | "completed">>({
    title: "",
    dueDate: format(new Date(), "yyyy-MM-dd"),
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
      dueDate: format(new Date(), "yyyy-MM-dd"),
      priority: "medium",
      type: "academic",
      subject: "",
      reminder: true,
    });
  };

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    filterTasksByDate(date);
  };

  const filterTasksByDate = (date: Date) => {
    const formattedDate = format(date, "yyyy-MM-dd");
    const filtered = tasks.filter((task) => task.dueDate === formattedDate);
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
        return "bg-blue-500";
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setNewTask({
      ...newTask,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center mb-4">
          <h1 className="text-2xl font-bold flex-1">Tasks & Events</h1>
          <Button onClick={() => setShowAddTask(true)} size="sm" className="rounded-full h-8 w-8 p-0">
            <FaPlus className="h-4 w-4" />
          </Button>
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
                const hasTask = tasks.some((task) => task.dueDate === formattedDate);
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
                      <CardContent className="p-4">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={task.completed}
                            onChange={() => toggleTaskCompletion(task.id)}
                            className="mr-3 h-5 w-5 rounded border-gray-300"
                          />
                          <div className="flex-1">
                            <p className={`font-medium ${task.completed ? "line-through text-muted-foreground" : ""}`}>
                              {task.title}
                            </p>
                            <div className="flex items-center text-xs text-muted-foreground mt-1">
                              {task.subject && <span className="mr-2">{task.subject}</span>}
                              <span className="flex items-center">
                                <FaCalendarAlt className="mr-1 h-3 w-3" />
                                {format(parseISO(task.dueDate), "MMM d")}
                              </span>
                            </div>
                          </div>
                          <div className={`h-3 w-3 rounded-full ${getPriorityColor(task.priority)}`} />
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
                    <CardContent className="p-4">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={() => toggleTaskCompletion(task.id)}
                          className="mr-3 h-5 w-5 rounded border-gray-300"
                        />
                        <div className="flex-1">
                          <p className={`font-medium ${task.completed ? "line-through text-muted-foreground" : ""}`}>
                            {task.title}
                          </p>
                          <div className="flex items-center text-xs text-muted-foreground mt-1">
                            {task.subject && <span className="mr-2">{task.subject}</span>}
                            <span className="flex items-center">
                              <FaCalendarAlt className="mr-1 h-3 w-3" />
                              {format(parseISO(task.dueDate), "MMM d")}
                            </span>
                            {task.reminder && (
                              <span className="flex items-center ml-2">
                                <FaClock className="mr-1 h-3 w-3" /> Reminder set
                              </span>
                            )}
                          </div>
                        </div>
                        <div className={`h-3 w-3 rounded-full ${getPriorityColor(task.priority)}`} />
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

      {/* Add Task Dialog */}
      <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Input
                placeholder="Task name"
                name="title"
                value={newTask.title}
                onChange={handleInputChange}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Due Date</label>
                <Input
                  type="date"
                  name="dueDate"
                  value={newTask.dueDate}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <select
                  name="priority"
                  value={newTask.priority}
                  onChange={handleInputChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <select
                  name="type"
                  value={newTask.type}
                  onChange={handleInputChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                  <option value="academic">Academic</option>
                  <option value="personal">Personal</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Subject (optional)</label>
                <Input
                  placeholder="e.g., Math"
                  name="subject"
                  value={newTask.subject}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="reminder"
                name="reminder"
                checked={newTask.reminder}
                onChange={handleInputChange}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="reminder" className="text-sm font-medium">
                Set reminder with Stu
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddTask(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleAddTask}>Add Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
