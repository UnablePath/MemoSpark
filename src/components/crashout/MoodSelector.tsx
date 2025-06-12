'use client';

import React from 'react';

const moodOptions = [
  { mood: 'stressed', emoji: '😤', label: 'Stressed' },
  { mood: 'overwhelmed', emoji: '😵‍💫', label: 'Overwhelmed' },
  { mood: 'frustrated', emoji: '🤬', label: 'Frustrated' },
  { mood: 'anxious', emoji: '😬', label: 'Anxious' },
  { mood: 'sad', emoji: '😢', label: 'Sad' },
];

interface MoodSelectorProps {
  selectedMood: string;
  onSelectMood: (mood: string) => void;
}

export const MoodSelector: React.FC<MoodSelectorProps> = ({ selectedMood, onSelectMood }) => {
  return (
    <div className="flex items-center space-x-2 bg-gray-900/50 rounded-full p-1">
      {moodOptions.map(({ mood, emoji, label }) => (
        <button
          key={mood}
          onClick={() => onSelectMood(mood)}
          className={`px-4 py-2 rounded-full text-sm font-bold transition-all duration-200 flex items-center space-x-2
            ${selectedMood === mood 
              ? 'bg-purple-600 text-white shadow-lg' 
              : 'text-gray-300 hover:bg-gray-700/50'
            }`}
          aria-label={`Select ${label} mood`}
        >
          <span className="text-lg">{emoji}</span>
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}; 