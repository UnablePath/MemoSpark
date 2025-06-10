"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import type { Student, Message, SwipeHistoryItem } from '@/types/student';

// Extended Student type with additional properties
interface ExtendedStudent extends Student {
  location?: string;
  lastSeen?: string;
  studyHours?: number;
  helpfulRating?: number;
  studyStreak?: number;
  preferredStudyTime?: string;
  bio?: string;
}

// Check if localStorage is available
const isLocalStorageAvailable = () => {
  try {
    if (typeof window === 'undefined') return false;
    const test = '__localStorage_test__';
    localStorage.setItem(test, 'test');
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
};

// Custom hook for localStorage state management with better error handling and fallbacks
export const useLocalStorageState = <T>(key: string, defaultValue: T) => {
  const [state, setState] = useState<T>(() => {
    if (!isLocalStorageAvailable()) {
      console.warn('localStorage not available, using in-memory storage');
      return defaultValue;
    }
    
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return defaultValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(state) : value;
      setState(valueToStore);
      
      if (isLocalStorageAvailable()) {
        localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
      // Continue with in-memory storage even if localStorage fails
    }
  }, [key, state]);

  return [state, setValue] as const;
};

// Sample data for demo/fallback
const sampleStudents: ExtendedStudent[] = [
  {
    id: '1',
    name: 'Alex Chen',
    year: 'Sophomore',
    subjects: ['Computer Science', 'Mathematics'],
    interests: ['Machine Learning', 'Gaming', 'Basketball'],
    avatar: '/api/placeholder/150/150?text=AC',
    achievements: [],
    location: 'Engineering Building',
    lastSeen: '5 mins ago',
    studyHours: 25,
    helpfulRating: 4.8,
    studyStreak: 12,
    preferredStudyTime: 'Evening',
    bio: 'CS major passionate about AI and always ready to help with coding challenges!',
  },
  {
    id: '2',
    name: 'Sam Rodriguez',
    year: 'Junior',
    subjects: ['Biology', 'Chemistry'],
    interests: ['Research', 'Photography', 'Hiking'],
    avatar: '/api/placeholder/150/150?text=SR',
    achievements: [],
    location: 'Science Library',
    lastSeen: '12 mins ago',
    studyHours: 30,
    helpfulRating: 4.9,
    studyStreak: 18,
    preferredStudyTime: 'Morning',
    bio: 'Pre-med student who loves explaining complex concepts in simple ways.',
  },
  {
    id: '3',
    name: 'Jordan Kim',
    year: 'Senior',
    subjects: ['Physics', 'Engineering'],
    interests: ['Robotics', '3D Printing', 'Tutoring'],
    avatar: '/api/placeholder/150/150?text=JK',
    achievements: [],
    location: 'Physics Lab',
    lastSeen: '1 hour ago',
    studyHours: 40,
    helpfulRating: 4.7,
    studyStreak: 8,
    preferredStudyTime: 'Afternoon',
    bio: 'Engineering senior with a passion for helping others understand STEM subjects.',
  },
];

// Chat message type for internal storage
export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  message: string;
  timestamp: Date;
}

// Hook for student data with persistence and resilience
export function useStudentData() {
  const { user, isLoaded: userLoaded } = useUser();
  
  // Persistent state for student data
  const [cachedStudents, setCachedStudents] = useLocalStorageState<ExtendedStudent[]>('student_data_cache', sampleStudents);
  const [lastFetchTime, setLastFetchTime] = useLocalStorageState<number>('student_data_last_fetch', 0);
  
  // Component state
  const [students, setStudents] = useState<ExtendedStudent[]>(cachedStudents || sampleStudents);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cache validity (5 minutes)
  const CACHE_DURATION = 5 * 60 * 1000;
  const isCacheValid = Date.now() - lastFetchTime < CACHE_DURATION;

  const fetchStudents = useCallback(async (forceRefresh = false) => {
    // If cache is valid and not forcing refresh, use cached data
    if (!forceRefresh && isCacheValid && cachedStudents?.length > 0) {
      setStudents(cachedStudents);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Simulate API call with random delay
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
      
      // For now, return sample data with some variation
      let fetchedStudents = [...sampleStudents];
      
      // Add some dynamic elements if user is available
      if (user?.firstName) {
        fetchedStudents = fetchedStudents.map(student => ({
          ...student,
          // Randomize some properties to simulate real data
          studyHours: Math.floor(Math.random() * 50) + 10,
          studyStreak: Math.floor(Math.random() * 30) + 1,
          helpfulRating: Math.round((Math.random() * 1.5 + 3.5) * 10) / 10,
        }));
      }

      setStudents(fetchedStudents);
      setCachedStudents(fetchedStudents);
      setLastFetchTime(Date.now());
      
    } catch (err) {
      console.error('Error fetching students:', err);
      setError('Failed to load student data. Using cached data.');
      
      // Fallback to cached data or sample data
      const fallbackData = cachedStudents?.length > 0 ? cachedStudents : sampleStudents;
      setStudents(fallbackData);
    } finally {
      setLoading(false);
    }
  }, [user, isCacheValid, cachedStudents, setCachedStudents, setLastFetchTime]);

  const retryLoad = useCallback(() => {
    fetchStudents(true);
  }, [fetchStudents]);

  // Initial load effect with better error handling
  useEffect(() => {
    // Always set students immediately from cache to prevent loading state
    if (cachedStudents?.length > 0) {
      setStudents(cachedStudents);
    }

    // Only fetch if cache is invalid or if we don't have data
    if (!isCacheValid || !cachedStudents?.length) {
      fetchStudents();
    }
  }, [userLoaded]); // Only depend on userLoaded to prevent excessive fetching

  return {
    students,
    loading,
    error,
    retryLoad,
    refresh: () => fetchStudents(true),
  };
}

// Converter function to transform ChatMessage to Message format for ChatModal
const convertChatMessagesToMessages = (chatMessages: ChatMessage[]): Message[] => {
  return chatMessages.map(chatMessage => ({
    text: chatMessage.message,
    sent: chatMessage.senderId === 'current-user',
  }));
};

// Hook for chat messages with persistence
export function useChatMessages() {
  const [chatMessages, setChatMessages] = useLocalStorageState<Record<string, ChatMessage[]>>('chat_messages', {});

  const sendMessage = useCallback((studentId: string, message: string) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      senderId: 'current-user',
      receiverId: studentId,
      message,
      timestamp: new Date(),
    };

    setChatMessages(prev => ({
      ...prev,
      [studentId]: [...(prev[studentId] || []), newMessage],
    }));

    // Simulate a response after a delay
    setTimeout(() => {
      const responseMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        senderId: studentId,
        receiverId: 'current-user',
        message: "Thanks for your message! I'll get back to you soon.",
        timestamp: new Date(),
      };

      setChatMessages(prev => ({
        ...prev,
        [studentId]: [...(prev[studentId] || []), responseMessage],
      }));
    }, 1000);
  }, [setChatMessages]);

  // Get messages in the format expected by ChatModal
  const getMessagesForStudent = useCallback((studentId: string): Message[] => {
    const studentChatMessages = chatMessages[studentId] || [];
    return convertChatMessagesToMessages(studentChatMessages);
  }, [chatMessages]);

  return {
    chatMessages,
    sendMessage,
    getMessagesForStudent,
  };
} 