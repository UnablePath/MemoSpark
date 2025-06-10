import React from 'react';
import { KoalaMascot } from '@/components/ui/koala-mascot';

// --- Mock Task Data (Replace with actual data fetching/state management) ---
interface Task {
  id: string;
  text: string;
  dueDate: Date;
  isCompleted: boolean;
}

const mockTasks: Task[] = [
  { id: 't1', text: 'Finish Math Homework', dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000), isCompleted: false }, // Due in 2 hours
  { id: 't2', text: 'Prepare Physics Presentation', dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), isCompleted: false }, // Due tomorrow
  { id: 't3', text: 'Read Biology Chapter 5', dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000), isCompleted: true }, // Completed yesterday
  { id: 't4', text: 'Submit Project Proposal', dueDate: new Date(Date.now() + 60 * 60 * 1000), isCompleted: false }, // Due in 1 hour
];

const getMostUrgentTask = (tasks: Task[]): Task | null => {
  const now = new Date();
  const upcomingUncompleted = tasks
    .filter(task => !task.isCompleted && task.dueDate >= now)
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  return upcomingUncompleted.length > 0 ? upcomingUncompleted[0] : null;
};
// --- End Mock Task Data ---

type WidgetContentType = 'reminders' | 'tasks' | 'mascot';

interface WidgetContentProps {
  type: WidgetContentType;
  // Add other props based on the content type as needed
  data?: any; // Placeholder for data specific to the widget type
}

export function WidgetContent({ type, data }: WidgetContentProps) {
  // Get the most urgent task (using mock data for now)
  const urgentTask = getMostUrgentTask(mockTasks);

  switch (type) {
    case 'reminders':
      return <div className="text-center p-2 text-sm">Reminders<br/>(Coming Soon)</div>;
    case 'tasks':
      // Display urgent task
      return (
        <div className="text-center p-2 text-sm">
          <h3 className="font-semibold mb-1 text-base">Next Task:</h3>
          {urgentTask ? (
            <p>{urgentTask.text}</p>
          ) : (
            <p className="text-muted-foreground">No upcoming tasks!</p>
          )}
        </div>
      );
    case 'mascot':
      return (
        <div className="flex items-center justify-center">
          <KoalaMascot size="lg" />
        </div>
      );
    default:
      return <div>Unknown Widget Type</div>;
  }
  // TODO: Implement state management and update mechanisms
} 