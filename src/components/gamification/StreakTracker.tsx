'use client';

import React from 'react';
// Import animation library if needed for celebrations
import { Flame } from 'lucide-react'; // Example icon

interface StreakTrackerProps {
  currentStreak: number;
}

export function StreakTracker({ currentStreak }: StreakTrackerProps) {
  // TODO: Implement milestone celebrations
  // TODO: Fetch/update streak data

  return (
    <div className="flex items-center space-x-2 bg-orange-100 text-orange-700 p-3 rounded-lg">
      <Flame className="w-5 h-5" />
      <span className="font-semibold">Current Streak:</span>
      <span className="text-lg font-bold">{currentStreak} {currentStreak === 1 ? 'day' : 'days'}</span>
      {/* Add visual representation/stats later */}
    </div>
  );
} 