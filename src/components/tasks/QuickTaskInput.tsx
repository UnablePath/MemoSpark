'use client';

import type React from 'react';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Calendar, Clock, BookOpen, AlertCircle, CheckCircle2 } from 'lucide-react';
import { addDays, format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ExtendedTask, Priority, TaskType } from '@/types/ai';
import { useIsMobile, useIsTouchDevice, useReducedMotion } from '@/hooks/useMediaQuery';

interface QuickTaskInputProps {
  onTaskCreate: (task: Omit<ExtendedTask, 'id' | 'completed'>) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  showSuccessFeedback?: boolean;
}

interface ParsedTaskData {
  title: string;
  priority: Priority;
  type: TaskType;
  dueDate: string;
  subject?: string;
  description?: string;
  reminder: boolean;
}

// Common task patterns for auto-completion
const TASK_PATTERNS = [
  // Study patterns
  { pattern: /study|read|review/i, type: 'academic' as TaskType, subject: 'General', priority: 'medium' as Priority },
  { pattern: /exam|test|quiz/i, type: 'academic' as TaskType, priority: 'high' as Priority },
  { pattern: /homework|assignment|project/i, type: 'academic' as TaskType, priority: 'medium' as Priority },
  { pattern: /research|paper|essay/i, type: 'academic' as TaskType, priority: 'medium' as Priority },
  
  // Subject patterns
  { pattern: /math|calculus|algebra|geometry/i, subject: 'Mathematics' },
  { pattern: /science|physics|chemistry|biology/i, subject: 'Science' },
  { pattern: /english|literature|writing|essay/i, subject: 'English' },
  { pattern: /history|social studies|geography/i, subject: 'History' },
  { pattern: /computer|programming|coding/i, subject: 'Computer Science' },
  
  // Priority patterns
  { pattern: /urgent|asap|important|critical/i, priority: 'high' as Priority },
  { pattern: /optional|maybe|someday|later/i, priority: 'low' as Priority },
  
  // Time patterns
  { pattern: /today|now/i, daysFromNow: 0 },
  { pattern: /tomorrow/i, daysFromNow: 1 },
  { pattern: /next week|later/i, daysFromNow: 7 },
  { pattern: /due (.+)/i, extractDue: true }
];

export const QuickTaskInput: React.FC<QuickTaskInputProps> = ({
  onTaskCreate,
  placeholder = "Quick task entry... (e.g., 'Study math exam tomorrow')",
  className,
  autoFocus = false,
  showSuccessFeedback = true
}) => {
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<ParsedTaskData | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const isMobile = useIsMobile();
  const isTouchDevice = useIsTouchDevice();
  const prefersReducedMotion = useReducedMotion();

  // Parse quick input into structured task data
  const parseQuickInput = (text: string): ParsedTaskData => {
    const trimmedText = text.trim();
    let title = trimmedText;
    let priority: Priority = 'medium';
    let type: TaskType = 'academic';
    let subject: string | undefined;
    let description: string | undefined;
    let daysFromNow = 1; // Default to tomorrow
    let reminder = false;

    // Apply pattern matching
    for (const pattern of TASK_PATTERNS) {
      const match = title.match(pattern.pattern);
      if (match) {
        if (pattern.type) type = pattern.type;
        if (pattern.subject) subject = pattern.subject;
        if (pattern.priority) priority = pattern.priority;
        if (pattern.daysFromNow !== undefined) daysFromNow = pattern.daysFromNow;
        
        // Extract due date from text if pattern supports it
        if (pattern.extractDue && match[1]) {
          const dueText = match[1].toLowerCase();
          if (dueText.includes('today')) daysFromNow = 0;
          else if (dueText.includes('tomorrow')) daysFromNow = 1;
          else if (dueText.includes('week')) daysFromNow = 7;
          // Remove due date info from title
          title = title.replace(match[0], '').trim();
        }
      }
    }

    // Clean up title
    title = title.replace(/\s+/g, ' ').trim();
    
    // If title is too short, use the original input
    if (title.length < 3) {
      title = trimmedText;
    }

    // Set reminder for high priority tasks or tasks due today
    reminder = priority === 'high' || daysFromNow === 0;

    // Generate due date
    const dueDate = addDays(new Date(), daysFromNow);
    
    // Add helpful description for academic tasks
    if (type === 'academic' && subject) {
      description = `${subject} task - created via quick entry`;
    }

    return {
      title,
      priority,
      type,
      dueDate: dueDate.toISOString(),
      subject,
      description,
      reminder
    };
  };

  // Update preview when input changes
  useEffect(() => {
    if (input.trim().length >= 3) {
      const preview = parseQuickInput(input);
      setParsedPreview(preview);
    } else {
      setParsedPreview(null);
    }
  }, [input]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSubmitting) return;

    setIsSubmitting(true);
    
    // Add haptic feedback for mobile devices
    if (isTouchDevice && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
    
    try {
      const taskData = parseQuickInput(input.trim());
      
      // Create the task object
      const newTask: Omit<ExtendedTask, 'id' | 'completed'> = {
        title: taskData.title,
        dueDate: taskData.dueDate,
        priority: taskData.priority,
        type: taskData.type,
        subject: taskData.subject,
        reminder: taskData.reminder,
        description: taskData.description,
        recurrenceRule: 'none',
        // AI metadata
        aiMetadata: {
          confidenceScore: 0.8, // High confidence for user-created tasks
          learningSource: 'user_preference',
          createdAt: new Date().toISOString(),
        },
        estimatedDuration: 60, // Default 1 hour estimate
      };

      await onTaskCreate(newTask);
      
      // Clear input and show success
      setInput('');
      setParsedPreview(null);
      
      if (showSuccessFeedback) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
      }
      
      // Refocus input for rapid entry (avoid on mobile to prevent keyboard popup)
      if (inputRef.current && !isMobile) {
        inputRef.current.focus();
      }
    } catch (error) {
      console.error('Failed to create quick task:', error);
      // Could add error state here if needed
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setInput('');
      setParsedPreview(null);
    }
  };

  const isValidInput = input.trim().length >= 1;

  return (
    <div className={cn("relative w-full", className)}>
      {/* Main input form */}
      <form onSubmit={handleSubmit} className={cn(
        "flex gap-2 items-center",
        isMobile && "gap-3"
      )}>
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isSubmitting}
            autoFocus={autoFocus && !isMobile} // Avoid auto-focus on mobile
            className={cn(
              "pr-10 transition-all duration-200 touch-manipulation",
              isMobile ? "h-12 text-base px-4 rounded-lg" : "h-11 text-base md:text-sm",
              "focus:ring-2 focus:ring-primary/50",
              parsedPreview && "border-primary/50 bg-primary/5"
            )}
            // Mobile-optimized input attributes
            autoComplete="off"
            autoCapitalize="sentences"
            spellCheck={true}
            inputMode="text"
          />
          
          {/* Input indicator */}
          <div className={cn(
            "absolute right-3 top-1/2 -translate-y-1/2",
            isMobile && "right-4"
          )}>
            {isSubmitting ? (
              <div className={cn(
                "border-2 border-primary border-t-transparent rounded-full animate-spin",
                isMobile ? "w-5 h-5" : "w-4 h-4"
              )} />
            ) : isValidInput ? (
              <CheckCircle2 className={cn(isMobile ? "w-5 h-5" : "w-4 h-4", "text-green-500")} />
            ) : (
              <Plus className={cn(isMobile ? "w-5 h-5" : "w-4 h-4", "text-muted-foreground")} />
            )}
          </div>
        </div>
        
        <Button 
          type="submit" 
          disabled={!isValidInput || isSubmitting}
          size={isMobile ? "lg" : "default"}
          className={cn(
            "transition-all duration-200 touch-manipulation",
            isMobile ? "h-12 px-6 min-w-[80px]" : "h-11 px-6",
            !prefersReducedMotion && "hover:scale-105 active:scale-95"
          )}
        >
          {isSubmitting ? (
            <>
              <div className={cn(
                "border-2 border-white border-t-transparent rounded-full animate-spin mr-2",
                isMobile ? "w-5 h-5" : "w-4 h-4"
              )} />
              Adding...
            </>
          ) : (
            <>
              <Plus className={cn(isMobile ? "w-5 h-5" : "w-4 h-4", "mr-2")} />
              Add
            </>
          )}
        </Button>
      </form>

      {/* Smart preview */}
      <AnimatePresence>
        {parsedPreview && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 mt-2 p-3 bg-background border border-primary/20 rounded-lg shadow-lg z-10"
          >
            <div className="text-sm space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <AlertCircle className="w-3 h-3" />
                <span className="text-xs font-medium">Smart Preview</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    parsedPreview.priority === 'high' ? 'bg-red-500' :
                    parsedPreview.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                  )} />
                  <span className="capitalize">{parsedPreview.priority}</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-muted-foreground" />
                  <span>{format(new Date(parsedPreview.dueDate), 'MMM d')}</span>
                </div>
                
                {parsedPreview.subject && (
                  <div className="flex items-center gap-1">
                    <BookOpen className="w-3 h-3 text-muted-foreground" />
                    <span>{parsedPreview.subject}</span>
                  </div>
                )}
              </div>
              
              <div className="text-xs text-muted-foreground">
                Press <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Enter</kbd> to create or{' '}
                <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Esc</kbd> to clear
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success feedback */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute -right-16 top-0 h-full flex items-center"
          >
            <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
              <CheckCircle2 className="w-4 h-4" />
              <span className="hidden sm:inline">Added!</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default QuickTaskInput; 