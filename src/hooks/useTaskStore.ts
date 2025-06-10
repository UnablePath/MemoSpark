import { create } from 'zustand';

interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: Date;
  completed: boolean;
  priority?: 'low' | 'medium' | 'high';
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface TaskStore {
  tasks: Task[];
  addTask: (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTask: (id: string, taskData: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  getTask: (id: string) => Task | undefined;
  getTasks: () => Task[];
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  
  addTask: async (taskData) => {
    const newTask: Task = {
      ...taskData,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    set((state) => ({
      tasks: [...state.tasks, newTask]
    }));
  },
  
  updateTask: async (id, taskData) => {
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id
          ? { ...task, ...taskData, updatedAt: new Date() }
          : task
      )
    }));
  },
  
  deleteTask: async (id) => {
    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== id)
    }));
  },
  
  getTask: (id) => {
    return get().tasks.find((task) => task.id === id);
  },
  
  getTasks: () => {
    return get().tasks;
  },
})); 