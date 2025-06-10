import { http, HttpResponse } from 'msw';

// Mock data
const mockTasks = [
  {
    id: '1',
    title: 'Test Task 1',
    description: 'This is a test task',
    due_date: '2025-01-15T10:00:00Z',
    priority: 'medium',
    type: 'academic',
    completed: false,
    user_id: 'test-user-id',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: '2',
    title: 'Completed Task',
    description: 'This task is completed',
    due_date: '2025-01-10T14:00:00Z',
    priority: 'high',
    type: 'personal',
    completed: true,
    user_id: 'test-user-id',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-05T00:00:00Z',
  },
];

const mockTimetableEntries = [
  {
    id: '1',
    course_name: 'Mathematics',
    course_code: 'MATH101',
    instructor: 'Dr. Smith',
    location: 'Room 101',
    start_time: '09:00',
    end_time: '10:30',
    days_of_week: ['monday', 'wednesday', 'friday'],
    user_id: 'test-user-id',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
];

// Keep track of tasks for CRUD operations
let tasksData = [...mockTasks];
let timetableData = [...mockTimetableEntries];

export const handlers = [
  // GET tasks
  http.get('*/rest/v1/tasks', ({ request }) => {
    const url = new URL(request.url);
    const userId = url.searchParams.get('user_id');
    
    if (userId) {
      const userTasks = tasksData.filter(task => task.user_id === userId);
      return HttpResponse.json(userTasks);
    }
    
    return HttpResponse.json(tasksData);
  }),

  // POST tasks (create)
  http.post('*/rest/v1/tasks', async ({ request }) => {
    const newTask = await request.json() as any;
    const task = {
      ...newTask,
      id: String(Date.now()),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    tasksData.push(task);
    return HttpResponse.json([task]);
  }),

  // PATCH tasks (update)
  http.patch('*/rest/v1/tasks', async ({ request }) => {
    const url = new URL(request.url);
    const taskId = url.searchParams.get('id');
    const updates = await request.json() as any;
    
    if (taskId) {
      const taskIndex = tasksData.findIndex(task => task.id === taskId);
      if (taskIndex !== -1) {
        tasksData[taskIndex] = {
          ...tasksData[taskIndex],
          ...updates,
          updated_at: new Date().toISOString(),
        };
        return HttpResponse.json([tasksData[taskIndex]]);
      }
    }
    
    return HttpResponse.json({ error: 'Task not found' }, { status: 404 });
  }),

  // DELETE tasks
  http.delete('*/rest/v1/tasks', ({ request }) => {
    const url = new URL(request.url);
    const taskId = url.searchParams.get('id');
    
    if (taskId) {
      const taskIndex = tasksData.findIndex(task => task.id === taskId);
      if (taskIndex !== -1) {
        tasksData.splice(taskIndex, 1);
        return HttpResponse.json({});
      }
    }
    
    return HttpResponse.json({ error: 'Task not found' }, { status: 404 });
  }),

  // GET timetable entries
  http.get('*/rest/v1/timetable_entries', ({ request }) => {
    const url = new URL(request.url);
    const userId = url.searchParams.get('user_id');
    
    if (userId) {
      const userEntries = timetableData.filter(entry => entry.user_id === userId);
      return HttpResponse.json(userEntries);
    }
    
    return HttpResponse.json(timetableData);
  }),

  // POST timetable entries (create)
  http.post('*/rest/v1/timetable_entries', async ({ request }) => {
    const newEntry = await request.json() as any;
    const entry = {
      ...newEntry,
      id: String(Date.now()),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    timetableData.push(entry);
    return HttpResponse.json([entry]);
  }),

  // Error scenarios for testing
  http.get('*/rest/v1/tasks/error', () => {
    return HttpResponse.json(
      { error: 'Internal server error', message: 'Database connection failed' },
      { status: 500 }
    );
  }),

  // Network timeout simulation
  http.get('*/rest/v1/tasks/timeout', async () => {
    await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second delay
    return HttpResponse.json(tasksData);
  }),
];

// Helper functions for test manipulation
export const resetMockData = () => {
  tasksData = [...mockTasks];
  timetableData = [...mockTimetableEntries];
};

export const addMockTask = (task: any) => {
  tasksData.push(task);
};

export const getMockTasks = () => [...tasksData];

export const setMockError = (endpoint: string, status = 500) => {
  // This can be used in tests to force specific error conditions
  return http.get(endpoint, () => {
    return HttpResponse.json(
      { error: 'Mock error', message: 'Test error condition' },
      { status }
    );
  });
}; 