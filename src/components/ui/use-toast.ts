import { useState, useCallback, useEffect } from 'react';

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
}

// Global toast state
const toastState: ToastState = { toasts: [] };
let listeners: Array<(state: ToastState) => void> = [];

// Notify all listeners of state changes
const notifyListeners = () => {
  listeners.forEach(listener => listener(toastState));
};

// Add a toast
const addToast = (toast: Omit<Toast, 'id'>) => {
  const id = crypto.randomUUID();
  const newToast: Toast = {
    id,
    duration: 5000,
    variant: 'default',
    ...toast,
  };
  
  toastState.toasts.push(newToast);
  notifyListeners();
  
  // Auto-remove toast after duration
  if (newToast.duration && newToast.duration > 0) {
    setTimeout(() => {
      removeToast(id);
    }, newToast.duration);
  }
  
  return id;
};

// Remove a toast
const removeToast = (id: string) => {
  toastState.toasts = toastState.toasts.filter(toast => toast.id !== id);
  notifyListeners();
};

// Toast hook
export const useToast = () => {
  const [state, setState] = useState<ToastState>(toastState);
  
  useEffect(() => {
    const listener = (newState: ToastState) => {
      setState({ ...newState });
    };
    
    listeners.push(listener);
    
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  }, []);
  
  const toast = useCallback((props: Omit<Toast, 'id'>) => {
    return addToast(props);
  }, []);
  
  const dismiss = useCallback((id: string) => {
    removeToast(id);
  }, []);
  
  return {
    toast,
    dismiss,
    toasts: state.toasts,
  };
}; 