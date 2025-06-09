"use client";

import { useState, useEffect } from 'react';
import type { Student, Message, SwipeHistoryItem } from '@/types/student';

// Mock data (would be fetched from API in real app)
const mockStudents: Student[] = [
  {
    id: "1",
    name: "Alex Johnson",
    year: "Sophomore",
    subjects: ["Mathematics", "Physics"],
    interests: ["Chess", "Hiking"],
    avatar: null,
    achievements: [
      { id: "a1", name: "Math Whiz", icon: "🏆", description: "Top score in Calculus quiz", dateEarned: "2023-10-15" },
      { id: "a2", name: "Debate Champion", icon: "🗣️", description: "Won the inter-college debate", dateEarned: "2023-11-05" },
    ],
  },
  {
    id: "2",
    name: "Morgan Lee",
    year: "Junior",
    subjects: ["Computer Science", "Data Science"],
    interests: ["Gaming", "Programming"],
    avatar: null,
    achievements: [
      { id: "a3", name: "Code Ninja", icon: "💻", description: "Completed 100 coding challenges", dateEarned: "2023-09-20" },
    ],
  },
  {
    id: "3",
    name: "Taylor Kim",
    year: "Freshman",
    subjects: ["Biology", "Chemistry"],
    interests: ["Music", "Swimming"],
    avatar: null,
    achievements: [
      { id: "a4", name: "Lab Assistant", icon: "🔬", description: "Assisted in 3 research projects", dateEarned: "2023-12-01" },
      { id: "a5", name: "Melody Maker", icon: "🎵", description: "Composed an original song", dateEarned: "2023-11-22" },
      { id: "a6", name: "Aqua Star", icon: "🏊", description: "Gold in 100m freestyle", dateEarned: "2023-10-30" },
    ],
  },
  {
    id: "4",
    name: "Jordan Smith",
    year: "Senior",
    subjects: ["Psychology", "Sociology"],
    interests: ["Reading", "Yoga"],
    avatar: null,
    achievements: [
      { id: "a7", name: "Bookworm", icon: "📚", description: "Read 50 books this year", dateEarned: "2023-12-10" },
    ],
  },
];

// Custom hook for localStorage state management
export const useLocalStorageState = <T>(key: string, defaultValue: T) => {
  const [state, setState] = useState<T>(() => {
    if (typeof window !== 'undefined') {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
      } catch (error) {
        console.warn(`Error reading localStorage key "${key}":`, error);
        return defaultValue;
      }
    }
    return defaultValue;
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(state) : value;
      setState(valueToStore);
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [state, setValue] as const;
};

// Custom hook for student data fetching
export const useStudentData = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);

  const loadStudents = async () => {
    try {
      setLoading(true);
      setError(null);
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      setStudents(mockStudents);
    } catch (err) {
      setError('Failed to load students. Please try again.');
      console.error('Error loading students:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const retryLoad = () => {
    loadStudents();
  };

  return { students, loading, error, retryLoad };
};

// Custom hook for chat functionality
export const useChatMessages = () => {
  const [chatMessages, setChatMessages] = useLocalStorageState<{[key: string]: Message[]}>('chatMessages', {});

  const sendMessage = (studentId: string, message: string) => {
    if (!message.trim()) return;

    try {
      setChatMessages(prev => ({
        ...prev,
        [studentId]: [
          ...(prev[studentId] || []),
          { text: message, sent: true },
        ],
      }));

      // Simulate response
      setTimeout(() => {
        setChatMessages(prev => ({
          ...prev,
          [studentId]: [
            ...(prev[studentId] || []),
            { text: "Thanks for your message! I'll get back to you soon.", sent: false },
          ],
        }));
      }, 1000);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return { chatMessages, sendMessage };
}; 