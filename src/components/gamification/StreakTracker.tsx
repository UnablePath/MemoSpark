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
    <div className="flex items-center space-x-1">
      <Flame className="w-4 h-4 text-orange-500" />
      <span className="text-sm font-bold text-orange-600">{currentStreak}</span>
    </div>
  );
} 