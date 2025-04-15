'use client';

import { useState, useEffect, useCallback } from 'react';

// Helper function to safely parse JSON
function safeJsonParse<T>(value: string | null): T | null {
  if (value === null) return null;
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.error('Error parsing JSON from localStorage', error);
    return null;
  }
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T | (() => T)
): [T, (value: T | ((val: T) => T)) => void] {
  // Get initial value from localStorage or use the provided initialValue
  const readValue = useCallback((): T => {
    // Prevent build errors "ReferenceError: window is not defined"
    if (typeof window === 'undefined') {
      return typeof initialValue === 'function'
        ? (initialValue as () => T)()
        : initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? (safeJsonParse(item) as T) : 
             (typeof initialValue === 'function' 
               ? (initialValue as () => T)() 
               : initialValue);
    } catch (error) {
      console.warn(`Error reading localStorage key “${key}”:`, error);
      return typeof initialValue === 'function'
        ? (initialValue as () => T)()
        : initialValue;
    }
  }, [initialValue, key]);

  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState<T>(readValue);

  // Return a wrapped version of useState's setter function that persists the new value to localStorage.
  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      // Prevent build errors "ReferenceError: window is not defined"
       if (typeof window === 'undefined') {
         console.warn(
           `Tried setting localStorage key “${key}” even though environment is not a client`
         );
       }
       
      try {
        // Allow value to be a function so we have same API as useState
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;
        // Save state
        setStoredValue(valueToStore);
        // Save to local storage
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        console.warn(`Error setting localStorage key “${key}”:`, error);
      }
    },
    [key, storedValue] // Include storedValue in dependencies if value can be a function
  );
  
  // Read latest value from localStorage on mount and update state.
  useEffect(() => {
     setStoredValue(readValue());
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Optional: Listen to storage events to sync changes across tabs/windows
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key && event.storageArea === window.localStorage) {
        try {
          setStoredValue(safeJsonParse(event.newValue) as T);
        } catch (error) {
           console.warn(`Error handling storage event for key “${key}”:`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  return [storedValue, setValue];
} 