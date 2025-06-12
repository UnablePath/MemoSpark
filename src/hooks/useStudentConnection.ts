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

// Sample data for demo/fallback - REMOVED
const sampleStudents: ExtendedStudent[] = [];

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
  const [cachedStudents, setCachedStudents] = useLocalStorageState<ExtendedStudent[]>('student_data_cache', []);
  const [lastFetchTime, setLastFetchTime] = useLocalStorageState<number>('student_data_last_fetch', 0);
  
  // Component state
  const [students, setStudents] = useState<ExtendedStudent[]>(cachedStudents || []);
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
      
      // For now, return an empty array as we are removing mocks
      const fetchedStudents: ExtendedStudent[] = [];

      setStudents(fetchedStudents);
      setCachedStudents(fetchedStudents);
      setLastFetchTime(Date.now());
      
    } catch (err) {
      console.error('Error fetching students:', err);
      setError('Failed to load student data. Using cached data.');
      
      // Fallback to cached data or empty array
      const fallbackData = cachedStudents?.length > 0 ? cachedStudents : [];
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