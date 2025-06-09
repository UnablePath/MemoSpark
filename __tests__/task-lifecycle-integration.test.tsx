/**
 * Task Lifecycle Integration Tests
 * 
 * Tests actual user journeys and component interactions:
 * - User creates tasks through TaskForm
 * - User views tasks in ListView and CalendarView  
 * - User marks tasks complete and sees updates across views
 * - User handles errors and loading states
 * - Tests React Query hooks and API functions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { server } from '@/mocks/server';
import { resetMockData, addMockTask, getMockTasks } from '@/mocks/handlers';
import { http, HttpResponse } from 'msw';

// Import components to test
import { TaskForm } from '@/components/tasks/TaskForm';
import { ListView } from '@/components/tasks/ListView';
import { TaskEventHub } from '@/components/tasks/TaskEventHub';

// Import hooks and API functions
import { useTaskQueries } from '@/hooks/useTaskQueries';
import { createTask, updateTask, deleteTask, toggleTaskCompletion } from '@/lib/api/tasks';

// Test wrapper component with React Query
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

// Helper to render components with test wrapper
const renderWithProviders = (ui: React.ReactElement) => {
  return render(ui, { wrapper: TestWrapper });
};

describe('Task Lifecycle Integration Tests', () => {
  beforeEach(() => {
    resetMockData();
  });

  describe('Task Creation Journey', () => {
    test('user can create a task through TaskForm and see it in ListView', async () => {
      const user = userEvent.setup();
      
      // Render TaskForm
      renderWithProviders(<TaskForm />);
      
      // User fills out the form
      const titleInput = screen.getByLabelText(/task title/i);
      const descriptionInput = screen.getByLabelText(/description/i);
      const prioritySelect = screen.getByLabelText(/priority/i);
      const typeSelect = screen.getByLabelText(/type/i);
      const dueDateInput = screen.getByLabelText(/due date/i);
      
      await user.type(titleInput, 'New Integration Test Task');
      await user.type(descriptionInput, 'This task was created through integration test');
      await user.selectOptions(prioritySelect, 'high');
      await user.selectOptions(typeSelect, 'academic');
      await user.type(dueDateInput, '2025-01-20T10:00');
      
      // Submit the form
      const submitButton = screen.getByRole('button', { name: /save task/i });
      await user.click(submitButton);
      
      // Verify the API was called with correct data
      await waitFor(() => {
        const mockTasks = getMockTasks();
        expect(mockTasks).toHaveLength(3); // 2 initial + 1 new
        
        const newTask = mockTasks.find(task => task.title === 'New Integration Test Task');
        expect(newTask).toBeDefined();
        expect(newTask?.priority).toBe('high');
        expect(newTask?.type).toBe('academic');
      });
    });

    test('user can create recurring task with proper recurrence rule', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<TaskForm />);
      
      // Fill out basic task info
      await user.type(screen.getByLabelText(/task title/i), 'Weekly Study Session');
      await user.selectOptions(screen.getByLabelText(/priority/i), 'medium');
      await user.selectOptions(screen.getByLabelText(/type/i), 'academic');
      
      // Enable recurring task
      const recurringToggle = screen.getByLabelText(/recurring task/i);
      await user.click(recurringToggle);
      
      // Set recurrence pattern
      const frequencySelect = screen.getByLabelText(/frequency/i);
      await user.selectOptions(frequencySelect, 'weekly');
      
      // Select days of week
      const mondayCheckbox = screen.getByLabelText(/monday/i);
      const wednesdayCheckbox = screen.getByLabelText(/wednesday/i);
      await user.click(mondayCheckbox);
      await user.click(wednesdayCheckbox);
      
      // Submit
      await user.click(screen.getByRole('button', { name: /save task/i }));
      
      await waitFor(() => {
        const mockTasks = getMockTasks();
        const recurringTask = mockTasks.find(task => task.title === 'Weekly Study Session') as any;
        expect(recurringTask?.recurrence_rule).toContain('FREQ=WEEKLY');
        expect(recurringTask?.recurrence_rule).toContain('BYDAY=MO,WE');
      });
    });
  });

  describe('Task Display and View Integration', () => {
    test('tasks appear consistently across ListView and Calendar', async () => {
      // Add a test task
      const testTask = {
        id: 'test-view-task',
        title: 'View Integration Test',
        description: 'Testing view consistency',
        due_date: '2025-01-25T14:00:00Z',
        priority: 'high',
        type: 'academic',
        completed: false,
        user_id: 'test-user-id',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      addMockTask(testTask);
      
      // Test ListView - transform task to match ListView interface
      const listViewTask = {
        id: testTask.id,
        title: testTask.title,
        description: testTask.description,
        dueDate: new Date(testTask.due_date),
        completed: testTask.completed,
        priority: testTask.priority as 'low' | 'medium' | 'high'
      };
      renderWithProviders(
        <ListView 
          tasks={[listViewTask]} 
          onEdit={() => {}} 
          onDelete={async () => {}} 
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText('View Integration Test')).toBeInTheDocument();
        expect(screen.getByText('Testing view consistency')).toBeInTheDocument();
      });
      
      // Test TaskEventHub with different views
      renderWithProviders(<TaskEventHub />);
      
      // Should default to list view and show the task
      await waitFor(() => {
        expect(screen.getByText('View Integration Test')).toBeInTheDocument();
      });
      
      // Switch to calendar view
      const calendarViewButton = screen.getByRole('button', { name: /calendar view/i });
      fireEvent.click(calendarViewButton);
      
      // Task should still be visible in calendar view
      await waitFor(() => {
        expect(screen.getByText('View Integration Test')).toBeInTheDocument();
      });
    });

    test('task filtering and sorting works in ListView', async () => {
      // Add multiple test tasks with different priorities
      const tasks = [
        {
          id: 'low-priority',
          title: 'Low Priority Task',
          description: 'Test task with low priority',
          priority: 'low',
          type: 'personal',
          completed: false,
          user_id: 'test-user-id',
          due_date: undefined,
        },
        {
          id: 'high-priority',
          title: 'High Priority Task',
          description: 'Test task with high priority',
          priority: 'high',
          type: 'academic',
          completed: false,
          user_id: 'test-user-id',
          due_date: undefined,
        },
      ];
      
      tasks.forEach(addMockTask);
      
      // Transform tasks to match ListView interface
      const listViewTasks = tasks.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        dueDate: task.due_date ? new Date(task.due_date) : undefined,
        completed: task.completed,
        priority: task.priority as 'low' | 'medium' | 'high'
      }));
      
      renderWithProviders(
        <ListView 
          tasks={listViewTasks} 
          onEdit={() => {}} 
          onDelete={async () => {}} 
        />
      );
      
      // Wait for tasks to load
      await waitFor(() => {
        expect(screen.getByText('Low Priority Task')).toBeInTheDocument();
        expect(screen.getByText('High Priority Task')).toBeInTheDocument();
      });
      
      // Test priority filter
      const priorityFilter = screen.getByLabelText(/filter by priority/i);
      fireEvent.change(priorityFilter, { target: { value: 'high' } });
      
      await waitFor(() => {
        expect(screen.getByText('High Priority Task')).toBeInTheDocument();
        expect(screen.queryByText('Low Priority Task')).not.toBeInTheDocument();
      });
    });
  });

  describe('Task Completion Journey', () => {
    test('user can mark task complete and see updates across views', async () => {
      const user = userEvent.setup();
      
      // Start with an incomplete task
      const testTask = {
        id: 'completion-test',
        title: 'Task to Complete',
        description: 'Testing completion functionality',
        priority: 'medium',
        type: 'academic',
        completed: false,
        user_id: 'test-user-id',
        due_date: undefined,
      };
      addMockTask(testTask);
      
      // Transform task to match ListView interface
      const listViewTask = {
        id: testTask.id,
        title: testTask.title,
        description: testTask.description,
        dueDate: testTask.due_date ? new Date(testTask.due_date) : undefined,
        completed: testTask.completed,
        priority: testTask.priority as 'low' | 'medium' | 'high'
      };
      
      renderWithProviders(
        <ListView 
          tasks={[listViewTask]} 
          onEdit={() => {}} 
          onDelete={async () => {}} 
        />
      );
      
      // Find the task and its completion checkbox
      await waitFor(() => {
        expect(screen.getByText('Task to Complete')).toBeInTheDocument();
      });
      
      const completionCheckbox = screen.getByRole('checkbox', { 
        name: /mark task to complete as complete/i 
      });
      
      expect(completionCheckbox).not.toBeChecked();
      
      // Mark task as complete
      await user.click(completionCheckbox);
      
      // Verify the task is marked as completed
      await waitFor(() => {
        expect(completionCheckbox).toBeChecked();
      });
      
      // Verify in mock data
      const mockTasks = getMockTasks();
      const completedTask = mockTasks.find(task => task.id === 'completion-test');
      expect(completedTask?.completed).toBe(true);
    });

    test('completed tasks show with proper visual indicators', async () => {
      const completedTask = {
        id: 'already-completed',
        title: 'Already Completed Task',
        description: 'This task is already done',
        priority: 'low',
        type: 'personal',
        completed: true,
        user_id: 'test-user-id',
        due_date: undefined,
      };
      addMockTask(completedTask);
      
      // Transform task to match ListView interface
      const listViewTask = {
        id: completedTask.id,
        title: completedTask.title,
        description: completedTask.description,
        dueDate: completedTask.due_date ? new Date(completedTask.due_date) : undefined,
        completed: completedTask.completed,
        priority: completedTask.priority as 'low' | 'medium' | 'high'
      };
      
      renderWithProviders(
        <ListView 
          tasks={[listViewTask]} 
          onEdit={() => {}} 
          onDelete={async () => {}} 
        />
      );
      
      await waitFor(() => {
        const taskElement = screen.getByText('Already Completed Task').closest('[data-testid="task-item"]');
        expect(taskElement).toHaveClass('completed'); // Assuming completed tasks have this class
      });
    });
  });

  describe('Task Editing Journey', () => {
    test('user can edit existing task and see updates', async () => {
      const user = userEvent.setup();
      
      const editableTask = {
        id: 'editable-task',
        title: 'Original Title',
        description: 'Original description',
        priority: 'low',
        type: 'personal',
        completed: false,
        user_id: 'test-user-id',
        due_date: undefined,
      };
      addMockTask(editableTask);
      
      // Transform task to match ListView interface
      const listViewTask = {
        id: editableTask.id,
        title: editableTask.title,
        description: editableTask.description,
        dueDate: editableTask.due_date ? new Date(editableTask.due_date) : undefined,
        completed: editableTask.completed,
        priority: editableTask.priority as 'low' | 'medium' | 'high'
      };
      
      renderWithProviders(
        <ListView 
          tasks={[listViewTask]} 
          onEdit={() => {}} 
          onDelete={async () => {}} 
        />
      );
      
      // Find and click edit button
      await waitFor(() => {
        expect(screen.getByText('Original Title')).toBeInTheDocument();
      });
      
      const editButton = screen.getByRole('button', { name: /edit original title/i });
      await user.click(editButton);
      
      // Edit form should appear
      await waitFor(() => {
        expect(screen.getByDisplayValue('Original Title')).toBeInTheDocument();
      });
      
      // Modify the task
      const titleInput = screen.getByDisplayValue('Original Title');
      await user.clear(titleInput);
      await user.type(titleInput, 'Updated Title');
      
      const prioritySelect = screen.getByDisplayValue('low');
      await user.selectOptions(prioritySelect, 'high');
      
      // Save changes
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);
      
      // Verify updates
      await waitFor(() => {
        expect(screen.getByText('Updated Title')).toBeInTheDocument();
        expect(screen.queryByText('Original Title')).not.toBeInTheDocument();
      });
      
      const mockTasks = getMockTasks();
      const updatedTask = mockTasks.find(task => task.id === 'editable-task');
      expect(updatedTask?.title).toBe('Updated Title');
      expect(updatedTask?.priority).toBe('high');
    });
  });

  describe('Task Deletion Journey', () => {
    test('user can delete task with confirmation', async () => {
      const user = userEvent.setup();
      
      const deletableTask = {
        id: 'deletable-task',
        title: 'Task to Delete',
        description: 'This task will be deleted',
        priority: 'medium',
        type: 'academic',
        completed: false,
        user_id: 'test-user-id',
        due_date: undefined,
      };
      addMockTask(deletableTask);
      
      // Transform task to match ListView interface
      const listViewTask = {
        id: deletableTask.id,
        title: deletableTask.title,
        description: deletableTask.description,
        dueDate: deletableTask.due_date ? new Date(deletableTask.due_date) : undefined,
        completed: deletableTask.completed,
        priority: deletableTask.priority as 'low' | 'medium' | 'high'
      };
      
      renderWithProviders(
        <ListView 
          tasks={[listViewTask]} 
          onEdit={() => {}} 
          onDelete={async () => {}} 
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText('Task to Delete')).toBeInTheDocument();
      });
      
      // Click delete button
      const deleteButton = screen.getByRole('button', { name: /delete task to delete/i });
      await user.click(deleteButton);
      
      // Confirm deletion in modal/dialog
      const confirmButton = screen.getByRole('button', { name: /confirm delete/i });
      await user.click(confirmButton);
      
      // Verify task is removed
      await waitFor(() => {
        expect(screen.queryByText('Task to Delete')).not.toBeInTheDocument();
      });
      
      const mockTasks = getMockTasks();
      const deletedTask = mockTasks.find(task => task.id === 'deletable-task');
      expect(deletedTask).toBeUndefined();
    });
  });

  describe('Error Handling and Loading States', () => {
    test('displays error message when API call fails', async () => {
      // Mock API error
      server.use(
        http.get('*/rest/v1/tasks', () => {
          return HttpResponse.json(
            { error: 'Server error', message: 'Failed to fetch tasks' },
            { status: 500 }
          );
        })
      );
      
      renderWithProviders(
        <ListView 
          tasks={[]} 
          onEdit={() => {}} 
          onDelete={async () => {}} 
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText(/failed to load tasks/i)).toBeInTheDocument();
        expect(screen.getByText(/server error/i)).toBeInTheDocument();
      });
    });

    test('displays loading state while fetching data', async () => {
      // Mock slow API response
      server.use(
        http.get('*/rest/v1/tasks', async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return HttpResponse.json([]);
        })
      );
      
      renderWithProviders(
        <ListView 
          tasks={[]} 
          onEdit={() => {}} 
          onDelete={async () => {}} 
        />
      );
      
      // Should show loading state initially
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      
      // Loading should disappear after data loads
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });
    });

    test('handles network errors gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock network error for task creation
      server.use(
        http.post('*/rest/v1/tasks', () => {
          return HttpResponse.error();
        })
      );
      
      renderWithProviders(<TaskForm />);
      
      // Fill out and submit form
      await user.type(screen.getByLabelText(/task title/i), 'Network Test Task');
      await user.selectOptions(screen.getByLabelText(/priority/i), 'medium');
      await user.selectOptions(screen.getByLabelText(/type/i), 'academic');
      
      const submitButton = screen.getByRole('button', { name: /save task/i });
      await user.click(submitButton);
      
      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/failed to create task/i)).toBeInTheDocument();
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });

    test('retries failed requests when user clicks retry', async () => {
      const user = userEvent.setup();
      let callCount = 0;
      
      // Mock failing then succeeding API
      server.use(
        http.get('*/rest/v1/tasks', () => {
          callCount++;
          if (callCount === 1) {
            return HttpResponse.json(
              { error: 'Temporary error' },
              { status: 500 }
            );
          }
          return HttpResponse.json([]);
        })
      );
      
      renderWithProviders(
        <ListView 
          tasks={[]} 
          onEdit={() => {}} 
          onDelete={async () => {}} 
        />
      );
      
      // Should show error first
      await waitFor(() => {
        expect(screen.getByText(/failed to load tasks/i)).toBeInTheDocument();
      });
      
      // Click retry button
      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);
      
      // Should succeed on retry
      await waitFor(() => {
        expect(screen.queryByText(/failed to load tasks/i)).not.toBeInTheDocument();
      });
      
      expect(callCount).toBe(2);
    });
  });

  describe('React Query Hook Integration', () => {
    test('useTaskQueries hook manages loading and error states correctly', async () => {
      const TestComponent = () => {
        const { data: tasks, isLoading, error, refetch } = useTaskQueries.useFetchTasks();
        
        if (isLoading) return <div data-testid="hook-loading">Loading...</div>;
        if (error) return <div data-testid="hook-error">Error: {error.message}</div>;
        
        return (
          <div>
            <div data-testid="task-count">{tasks?.length || 0} tasks</div>
            <button onClick={() => refetch()}>Refetch</button>
          </div>
        );
      };
      
      renderWithProviders(<TestComponent />);
      
      // Should show loading initially
      expect(screen.getByTestId('hook-loading')).toBeInTheDocument();
      
      // Should show data after loading
      await waitFor(() => {
        expect(screen.getByTestId('task-count')).toHaveTextContent('2 tasks');
      });
    });

    test('mutation hooks handle optimistic updates correctly', async () => {
      const user = userEvent.setup();
      
      const TestComponent = () => {
        const { mutate: createTask, isPending } = useTaskQueries.useCreateTask();
        
        const handleCreate = () => {
          createTask({
            title: 'Optimistic Task',
            priority: 'medium',
            type: 'academic',
            completed: false,
          });
        };
        
        return (
          <div>
            <button onClick={handleCreate} disabled={isPending}>
              {isPending ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        );
      };
      
      renderWithProviders(<TestComponent />);
      
      const createButton = screen.getByRole('button', { name: /create task/i });
      await user.click(createButton);
      
      // Should show pending state
      expect(screen.getByText('Creating...')).toBeInTheDocument();
      
      // Should return to normal state after completion
      await waitFor(() => {
        expect(screen.getByText('Create Task')).toBeInTheDocument();
      });
    });
  });

  describe('Timetable Integration', () => {
    test('user can create timetable entry and see it in timetable view', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<TaskEventHub initialView="timetable" />);
      
      // Should be in timetable view
      await waitFor(() => {
        expect(screen.getByText(/timetable/i)).toBeInTheDocument();
      });
      
      // Click add timetable entry button
      const addButton = screen.getByRole('button', { name: /add timetable entry/i });
      await user.click(addButton);
      
      // Fill out timetable form
      await user.type(screen.getByLabelText(/course name/i), 'Physics 101');
      await user.type(screen.getByLabelText(/course code/i), 'PHYS101');
      await user.type(screen.getByLabelText(/instructor/i), 'Dr. Johnson');
      await user.type(screen.getByLabelText(/location/i), 'Science Building 201');
      await user.type(screen.getByLabelText(/start time/i), '10:00');
      await user.type(screen.getByLabelText(/end time/i), '11:30');
      
      // Select days of week
      await user.click(screen.getByLabelText(/tuesday/i));
      await user.click(screen.getByLabelText(/thursday/i));
      
      // Submit form
      await user.click(screen.getByRole('button', { name: /save timetable entry/i }));
      
      // Verify entry appears in timetable
      await waitFor(() => {
        expect(screen.getByText('Physics 101')).toBeInTheDocument();
        expect(screen.getByText('Dr. Johnson')).toBeInTheDocument();
        expect(screen.getByText('10:00 - 11:30')).toBeInTheDocument();
      });
    });
  });

  describe('Cross-View Data Consistency', () => {
    test('data changes in one view immediately reflect in other views', async () => {
      const user = userEvent.setup();
      
      // Add a task that we'll modify
      const testTask = {
        id: 'consistency-test',
        title: 'Consistency Test Task',
        description: 'Testing cross-view updates',
        priority: 'medium',
        type: 'academic',
        completed: false,
        user_id: 'test-user-id',
      };
      addMockTask(testTask);
      
      renderWithProviders(<TaskEventHub />);
      
      // Start in list view - verify task is there
      await waitFor(() => {
        expect(screen.getByText('Consistency Test Task')).toBeInTheDocument();
      });
      
      // Mark task as complete
      const checkbox = screen.getByRole('checkbox', { 
        name: /mark consistency test task as complete/i 
      });
      await user.click(checkbox);
      
      // Switch to calendar view
      const calendarButton = screen.getByRole('button', { name: /calendar view/i });
      await user.click(calendarButton);
      
      // Task should still show as completed in calendar view
      await waitFor(() => {
        const taskInCalendar = screen.getByText('Consistency Test Task');
        expect(taskInCalendar.closest('[data-completed="true"]')).toBeInTheDocument();
      });
    });
  });
}); 