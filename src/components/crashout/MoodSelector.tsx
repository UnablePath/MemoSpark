'use client';

import type React from 'react';

const moodOptions = [
  { mood: 'stressed', label: 'Stressed' },
  { mood: 'overwhelmed', label: 'Overwhelmed' },
  { mood: 'frustrated', label: 'Frustrated' },
  { mood: 'anxious', label: 'Anxious' },
  { mood: 'sad', label: 'Sad' },
];

interface MoodSelectorProps {
  selectedMood: string;
  onSelectMood: (mood: string) => void;
}

export const MoodSelector: React.FC<MoodSelectorProps> = ({ selectedMood, onSelectMood }) => {
  return (
    <div className="flex items-center space-x-2 bg-gray-900/50 rounded-full p-1">
      {moodOptions.map(({ mood, label }) => (
        <button
          key={mood}
          onClick={() => onSelectMood(mood)}
          className={`px-4 py-2 rounded-full text-sm font-bold transition-all duration-200 flex items-center space-x-2
            ${selectedMood === mood 
              ? 'bg-primary text-primary-foreground shadow-lg' 
              : 'text-gray-300 hover:bg-gray-700/50'
            }`}
          aria-label={`Select ${label} mood`}
        >
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}; 