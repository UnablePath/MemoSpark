'use client';

import React from 'react';
import { KoalaMascot } from '@/components/ui/koala-mascot';
import { StreakTracker } from '@/components/gamification/StreakTracker';

// Placeholder data - replace with actual data fetching later
const upcomingTasks = [
  { id: 1, title: 'Math Homework Ch 3', dueDate: 'Tomorrow' },
  { id: 2, title: 'Physics Lab Report', dueDate: 'Wednesday' },
  { id: 3, title: 'Read History Chapter 5', dueDate: 'Wednesday' },
];

const currentStreak = 5; // Example streak

export default function GamifiedReminderTab() {
  // TODO: Fetch actual task and streak data
  // TODO: Implement logic for mascot state based on tasks/time
  const mascotState = 'idle'; 

  return (
    <div className="flex flex-col items-center justify-start h-full p-4 space-y-6 bg-gradient-to-b from-yellow-50 to-orange-50">
      {/* Mascot Area */}
      <div className="mt-8">
        <KoalaMascot size={160} />
        {/* TODO: Adapt mascotState logic if needed for KoalaMascot props */}
        <p className="text-center mt-2 text-muted-foreground text-sm">Stu is here to help!</p>
      </div>

      {/* Streak Tracker */}
      <StreakTracker currentStreak={currentStreak} />

      {/* Upcoming Tasks/Reminders */}
      <div className="w-full max-w-md space-y-3">
        <h3 className="text-lg font-semibold">Upcoming Tasks</h3>
        {upcomingTasks.length > 0 ? (
          upcomingTasks.map(task => (
            <div key={task.id} className="bg-card p-3 rounded-lg shadow-sm border flex justify-between items-center">
              <span className="text-card-foreground">{task.title}</span>
              <span className="text-sm text-muted-foreground">{task.dueDate}</span>
            </div>
          ))
        ) : (
          <p className="text-muted-foreground text-center py-4">No upcoming tasks!</p>
        )}
      </div>

      {/* Achievements section can be added later */}

    </div>
  );
} 