'use client';

import type React from 'react';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, addDays, isValid } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Calendar, Clock, Tag, Repeat, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import type { ExtendedTask, Priority, TaskType, RecurrenceRule } from '@/types/ai';
import { StuTaskGuidance, StuQuickGuidance } from './StuTaskGuidance';
import { KoalaMascot } from '@/components/ui/koala-mascot';
import { useIsMobile, useIsTouchDevice, useReducedMotion } from '@/hooks/useMediaQuery';

// Task creation interfaces matching existing patterns
interface TaskFormData {
  title: string;
  dueDate: string;
  priority: Priority;
  type: TaskType;
  subject?: string;
  description?: string;
  reminder: boolean;
  recurrenceRule?: RecurrenceRule;
  recurrenceInterval?: number;
  recurrenceEndDate?: string;
}

interface ProgressiveTaskCaptureProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskCreate: (task: Omit<ExtendedTask, 'id' | 'completed'>) => void;
  initialData?: Partial<TaskFormData>;
}

const initialTaskState: TaskFormData = {
  title: '',
  dueDate: format(new Date(), 'yyyy-MM-dd\'T\'HH:mm'),
  priority: 'medium',
  type: 'academic',
  subject: '',
  description: '',
  reminder: false,
  recurrenceRule: 'none',
  recurrenceInterval: 1,
  recurrenceEndDate: '',
};

// Step components for progressive disclosure
const QuickCaptureStep: React.FC<{
  data: TaskFormData;
  onChange: (data: Partial<TaskFormData>) => void;
  onNext: () => void;
}> = ({ data, onChange, onNext }) => {
  const [showQuickTip, setShowQuickTip] = useState(false);
  const isMobile = useIsMobile();
  const isTouchDevice = useIsTouchDevice();
  const prefersReducedMotion = useReducedMotion();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (data.title && data.dueDate) {
      // Add haptic feedback for mobile devices
      if (isTouchDevice && 'vibrate' in navigator) {
        navigator.vibrate(10);
      }
      onNext();
    }
  };

  useEffect(() => {
    // Show quick tip after a short delay, unless reduced motion is preferred
    if (!prefersReducedMotion) {
      const timer = setTimeout(() => setShowQuickTip(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [prefersReducedMotion]);

  return (
    <motion.form
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      onSubmit={handleSubmit}
      className="space-y-4"
    >
      <div className="text-center mb-6">
        <div className="flex items-center justify-center mb-2">
          <div className="p-3 bg-primary/10 rounded-full" aria-hidden="true">
            <Tag className="h-6 w-6 text-primary" />
          </div>
        </div>
        <h3 className="text-lg font-semibold text-foreground">Quick Task Capture</h3>
        <p className="text-sm text-muted-foreground">Start with the essentials</p>
      </div>

      <div className={cn("space-y-4", isMobile && "space-y-6")}>
        <div>
          <Label htmlFor="quick-title" className={cn("text-sm font-medium text-foreground", isMobile && "text-base")}>
            What needs to be done? *
          </Label>
          <Input
            id="quick-title"
            placeholder="e.g., Study for Math exam, Complete project proposal"
            value={data.title}
            onChange={(e) => onChange({ title: e.target.value })}
            className={cn(
              "mt-1.5 h-11 transition-all duration-200",
              "border-border bg-background text-foreground placeholder:text-muted-foreground",
              isMobile && "h-14 text-base px-4 rounded-lg touch-manipulation",
              "focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 focus:ring-offset-background"
            )}
            autoFocus={!isMobile} // Avoid auto-focus on mobile to prevent unwanted keyboard
            autoComplete="off"
            autoCapitalize="sentences"
            spellCheck={true}
            inputMode="text"
            required
            aria-invalid={!data.title ? "true" : "false"}
            aria-describedby="quick-title-error"
          />
          {!data.title && (
            <p id="quick-title-error" className="sr-only text-red-500 text-xs mt-1">
              Task title is required
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="quick-due-date" className={cn("text-sm font-medium text-foreground", isMobile && "text-base")}>
            When is it due? *
          </Label>
          <div className="relative mt-1.5">
            <Calendar className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none",
              isMobile && "left-4 h-5 w-5"
            )} aria-hidden="true" />
            <Input
              id="quick-due-date"
              type="datetime-local"
              value={data.dueDate}
              onChange={(e) => onChange({ dueDate: e.target.value })}
              className={cn(
                "pl-10 h-11 transition-all duration-200",
                "border-border bg-background text-foreground",
                isMobile && "pl-12 h-14 text-base rounded-lg touch-manipulation",
                "focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 focus:ring-offset-background"
              )}
              required
              aria-invalid={!data.dueDate ? "true" : "false"}
              aria-describedby="quick-due-date-error"
            />
            {!data.dueDate && (
              <p id="quick-due-date-error" className="sr-only text-red-500 text-xs mt-1">
                Due date is required
              </p>
            )}
          </div>
        </div>

        <div className={cn("grid grid-cols-2 gap-3", isMobile && "gap-4")}>
          <div>
            <Label htmlFor="quick-priority" className={cn("text-sm font-medium text-foreground", isMobile && "text-base")}>
              Priority
            </Label>
            <Select value={data.priority} onValueChange={(value: Priority) => onChange({ priority: value })}>
              <SelectTrigger className={cn(
                "mt-1.5 h-11 transition-all duration-200",
                "border-border bg-background text-foreground",
                "focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 focus:ring-offset-background",
                isMobile && "h-14 text-base rounded-lg touch-manipulation"
              )}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border-border shadow-lg">
                <SelectItem value="low" className={cn(
                  "text-foreground hover:bg-accent hover:text-accent-foreground",
                  isMobile && "py-3 text-base"
                )}>
                  Low
                </SelectItem>
                <SelectItem value="medium" className={cn(
                  "text-foreground hover:bg-accent hover:text-accent-foreground",
                  isMobile && "py-3 text-base"
                )}>
                  Medium
                </SelectItem>
                <SelectItem value="high" className={cn(
                  "text-foreground hover:bg-accent hover:text-accent-foreground",
                  isMobile && "py-3 text-base"
                )}>
                  High
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="quick-type" className={cn("text-sm font-medium text-foreground", isMobile && "text-base")}>
              Type
            </Label>
            <Select value={data.type} onValueChange={(value: TaskType) => onChange({ type: value })}>
              <SelectTrigger className={cn(
                "mt-1.5 h-11 transition-all duration-200",
                "border-border bg-background text-foreground",
                "focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 focus:ring-offset-background",
                isMobile && "h-14 text-base rounded-lg touch-manipulation"
              )}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border-border shadow-lg">
                <SelectItem value="academic" className={cn(
                  "text-foreground hover:bg-accent hover:text-accent-foreground",
                  isMobile && "py-3 text-base"
                )}>
                  Academic
                </SelectItem>
                <SelectItem value="personal" className={cn(
                  "text-foreground hover:bg-accent hover:text-accent-foreground",
                  isMobile && "py-3 text-base"
                )}>
                  Personal
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stu's Quick Guidance */}
        {showQuickTip && !data.title && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <StuQuickGuidance
              message="💡 Tip: Be specific with your task title for better AI suggestions!"
              onAction={() => setShowQuickTip(false)}
            />
          </motion.div>
        )}
      </div>
    </motion.form>
  );
};

const AISuggestionsStep: React.FC<{
  data: TaskFormData;
  onChange: (data: Partial<TaskFormData>) => void;
  onNext: () => void;
  onPrev: () => void;
}> = ({ data, onChange, onNext, onPrev }) => {
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{
    id: string;
    title: string;
    description: string;
    confidence: number;
  }>>([]);

  // Mock AI suggestions for demo (would connect to real AI service)
  useEffect(() => {
    if (data.title) {
      setIsGeneratingSuggestions(true);
      // Simulate AI processing delay
      setTimeout(() => {
        const mockSuggestions = [
          {
            id: '1',
            title: 'Schedule study blocks',
            description: `Break down "${data.title}" into 45-minute focused sessions with 15-minute breaks`,
            confidence: 0.92
          },
          {
            id: '2',
            title: 'Add related subtasks',
            description: 'Create preparation tasks like gathering materials or reviewing prerequisites',
            confidence: 0.85
          },
          {
            id: '3',
            title: 'Set optimal timing',
            description: `Based on your patterns, ${format(parseISO(data.dueDate), 'EEEE')} morning might be your peak focus time`,
            confidence: 0.78
          }
        ];
        setSuggestions(mockSuggestions);
        setIsGeneratingSuggestions(false);
      }, 1500);
    }
  }, [data.title, data.dueDate]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      <div className="text-center mb-6">
        <div className="flex items-center justify-center mb-2">
          <div className="p-3 bg-primary/10 rounded-full">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
        </div>
        <h3 className="text-lg font-semibold">AI Suggestions</h3>
        <p className="text-sm text-muted-foreground">Smart recommendations for your task</p>
      </div>

      {isGeneratingSuggestions ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 border rounded-lg animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-muted rounded w-full"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {suggestions.map((suggestion) => (
            <motion.div
              key={suggestion.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => {
                // Apply suggestion logic here
                if (suggestion.id === '1') {
                  onChange({ description: (data.description || '') + `\n\nSuggested approach: ${suggestion.description}` });
                }
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{suggestion.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{suggestion.description}</p>
                </div>
                <div className="ml-2 text-xs text-primary font-medium">
                  {Math.round(suggestion.confidence * 100)}% confident
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {data.type === 'academic' && (
        <div className="mt-4">
          <Label htmlFor="ai-subject" className="text-sm font-medium">Subject</Label>
          <Input
            id="ai-subject"
            placeholder="e.g., Mathematics, Computer Science"
            value={data.subject || ''}
            onChange={(e) => onChange({ subject: e.target.value })}
            className="mt-1.5 h-11"
          />
        </div>
      )}
    </motion.div>
  );
};

const DetailsStep: React.FC<{
  data: TaskFormData;
  onChange: (data: Partial<TaskFormData>) => void;
  onPrev: () => void;
  onSubmit: () => void;
}> = ({ data, onChange, onPrev, onSubmit }) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <motion.form
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      onSubmit={handleSubmit}
      className="space-y-4"
      aria-labelledby="details-step-title"
    >
      <div className="text-center mb-6">
        <div className="flex items-center justify-center mb-2">
          <div className="p-3 bg-primary/10 rounded-full">
            <Clock className="h-6 w-6 text-primary" />
          </div>
        </div>
        <h3 id="details-step-title" className="text-lg font-semibold text-foreground">Additional Details</h3>
        <p className="text-sm text-muted-foreground">Fine-tune your task settings</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="details-description" className="text-sm font-medium text-foreground">
            Description
          </Label>
          <Textarea
            id="details-description"
            placeholder="Add notes, requirements, or other details..."
            value={data.description || ''}
            onChange={(e) => onChange({ description: e.target.value })}
            className="mt-1.5 min-h-[80px] focus:ring-2 focus:ring-primary/20 border-border bg-background text-foreground placeholder:text-muted-foreground"
            rows={3}
            aria-describedby="details-description-hint"
          />
          <p id="details-description-hint" className="sr-only">
            Optional field to add additional notes or requirements for this task
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative">
            <input
              id="details-reminder"
              type="checkbox"
              checked={data.reminder}
              onChange={(e) => onChange({ reminder: e.target.checked })}
              className={cn(
                "h-4 w-4 rounded border-2 border-border bg-background text-primary",
                "focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 focus:ring-offset-background",
                "transition-colors duration-200",
                "checked:bg-primary checked:border-primary checked:text-primary-foreground",
                "hover:border-primary/50"
              )}
              aria-describedby="details-reminder-description"
            />
          </div>
          <div className="flex-1">
            <Label 
              htmlFor="details-reminder" 
              className="text-sm font-medium text-foreground cursor-pointer"
            >
              Enable reminders
            </Label>
            <p id="details-reminder-description" className="text-xs text-muted-foreground mt-1">
              Get notified before your task is due
            </p>
          </div>
        </div>

        <div>
          <Label htmlFor="details-recurrence" className="text-sm font-medium text-foreground">
            Recurrence
          </Label>
          <Select 
            value={data.recurrenceRule || 'none'} 
            onValueChange={(value: RecurrenceRule) => onChange({ recurrenceRule: value })}
          >
            <SelectTrigger 
              className="mt-1.5 h-11 focus:ring-2 focus:ring-primary/20 border-border bg-background text-foreground"
              aria-describedby="details-recurrence-hint"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background border-border shadow-lg">
              <SelectItem value="none" className="text-foreground hover:bg-accent hover:text-accent-foreground">
                No recurrence
              </SelectItem>
              <SelectItem value="daily" className="text-foreground hover:bg-accent hover:text-accent-foreground">
                Daily
              </SelectItem>
              <SelectItem value="weekly" className="text-foreground hover:bg-accent hover:text-accent-foreground">
                Weekly
              </SelectItem>
              <SelectItem value="monthly" className="text-foreground hover:bg-accent hover:text-accent-foreground">
                Monthly
              </SelectItem>
              <SelectItem value="yearly" className="text-foreground hover:bg-accent hover:text-accent-foreground">
                Yearly
              </SelectItem>
            </SelectContent>
          </Select>
          <p id="details-recurrence-hint" className="sr-only">
            Choose how often this task should repeat
          </p>
        </div>

        {data.recurrenceRule && data.recurrenceRule !== 'none' && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-2 gap-3"
          >
            <div>
              <Label htmlFor="details-interval" className="text-sm font-medium text-foreground">
                Interval
              </Label>
              <Input
                id="details-interval"
                type="number"
                min="1"
                max="365"
                value={data.recurrenceInterval || 1}
                onChange={(e) => onChange({ recurrenceInterval: Number(e.target.value) })}
                className="mt-1.5 h-11 focus:ring-2 focus:ring-primary/20 border-border bg-background text-foreground"
                placeholder={`Every ${data.recurrenceRule === 'daily' ? 'day(s)' : 
                  data.recurrenceRule === 'weekly' ? 'week(s)' : 
                  data.recurrenceRule === 'monthly' ? 'month(s)' : 'year(s)'}`}
                aria-describedby="details-interval-hint"
              />
              <p id="details-interval-hint" className="sr-only">
                How often the task should repeat
              </p>
            </div>
            <div>
              <Label htmlFor="details-end-date" className="text-sm font-medium text-foreground">
                Ends On
              </Label>
              <Input
                id="details-end-date"
                type="date"
                value={data.recurrenceEndDate || ''}
                onChange={(e) => onChange({ recurrenceEndDate: e.target.value })}
                className="mt-1.5 h-11 focus:ring-2 focus:ring-primary/20 border-border bg-background text-foreground"
                min={format(addDays(parseISO(data.dueDate), 1), 'yyyy-MM-dd')}
                aria-describedby="details-end-date-hint"
              />
              <p id="details-end-date-hint" className="sr-only">
                When the recurring task should stop
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </motion.form>
  );
};

// Main component
export const ProgressiveTaskCapture: React.FC<ProgressiveTaskCaptureProps> = ({
  open,
  onOpenChange,
  onTaskCreate,
  initialData = {}
}) => {
  const [step, setStep] = useState(1);
  const [taskData, setTaskData] = useState<TaskFormData>({ ...initialTaskState, ...initialData });
  const [taskCompleted, setTaskCompleted] = useState(false);
  const [touchStartY, setTouchStartY] = useState(0);
  const [touchStartX, setTouchStartX] = useState(0);
  
  const contentRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const isTouchDevice = useIsTouchDevice();
  const prefersReducedMotion = useReducedMotion();
  
  const totalSteps = 3;

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep(1);
        setTaskData({ ...initialTaskState, ...initialData });
        setTaskCompleted(false);
      }, 200);
    }
  }, [open, initialData]);

  const updateTaskData = (updates: Partial<TaskFormData>) => {
    setTaskData(prev => ({ ...prev, ...updates }));
  };

  const handleNext = () => {
    if (step < totalSteps) {
      // Add haptic feedback for mobile devices
      if (isTouchDevice && 'vibrate' in navigator) {
        navigator.vibrate(10);
      }
      setStep(step + 1);
    }
  };

  const handlePrev = () => {
    if (step > 1) {
      // Add haptic feedback for mobile devices
      if (isTouchDevice && 'vibrate' in navigator) {
        navigator.vibrate(10);
      }
      setStep(step - 1);
    }
  };

  // Touch gesture handlers for mobile swipe navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isTouchDevice) return;
    const touch = e.touches[0];
    setTouchStartX(touch.clientX);
    setTouchStartY(touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // Prevent default to avoid scrolling issues during swipe
    if (!isTouchDevice) return;
    e.preventDefault();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isTouchDevice || !touchStartX || !touchStartY) return;
    
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;
    const threshold = 50;

    // Only trigger swipe if horizontal movement is greater than vertical
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > threshold) {
      if (deltaX > 0 && step > 1) {
        // Swipe right - go to previous step
        handlePrev();
      } else if (deltaX < 0 && step < totalSteps) {
        // Swipe left - go to next step (only if form is valid)
        if (taskData.title && taskData.dueDate) {
          handleNext();
        }
      }
    }

    // Reset touch state
    setTouchStartX(0);
    setTouchStartY(0);
  };

  const handleSubmit = () => {
    // Validate required fields
    if (!taskData.title || !taskData.dueDate) {
      return;
    }

    // Convert to ExtendedTask format
    const task: Omit<ExtendedTask, 'id' | 'completed'> = {
      ...taskData,
      recurrenceInterval: taskData.recurrenceRule !== 'none' && taskData.recurrenceInterval 
        ? Number(taskData.recurrenceInterval) 
        : undefined,
      recurrenceEndDate: taskData.recurrenceRule !== 'none' && taskData.recurrenceEndDate 
        && isValid(parseISO(taskData.recurrenceEndDate)) 
        ? taskData.recurrenceEndDate 
        : undefined,
    };

    setTaskCompleted(true);
    
    // Delay to show completion animation
    setTimeout(() => {
      onTaskCreate(task);
      onOpenChange(false);
    }, 2000);
  };

  const stepTitles = ['Quick Capture', 'AI Suggestions', 'Details'];

  // Map step numbers to StuTaskGuidance step names
  const getStuStep = (): 'quickCapture' | 'aiSuggestions' | 'details' | 'completed' => {
    if (taskCompleted) return 'completed';
    switch (step) {
      case 1: return 'quickCapture';
      case 2: return 'aiSuggestions';
      case 3: return 'details';
      default: return 'quickCapture';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={cn(
          "p-0 overflow-hidden flex flex-col bg-card text-card-foreground shadow-2xl rounded-lg",
          "sm:max-w-lg", // Default for larger screens
          isMobile ? "w-[90vw] max-h-[90vh] fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" : "max-h-[80vh]",
          isMobile && "pb-[env(safe-area-inset-bottom)]" // Add padding for home bar on iOS
        )}
        onOpenAutoFocus={(e) => e.preventDefault()} // Prevent auto-focus on first input unless intended
      >
        <DialogHeader className={cn("p-6 pb-4 text-center", isMobile && "p-4 pb-3")}>
          <DialogTitle className={cn("text-xl font-semibold", isMobile && "text-lg")}>
            {taskCompleted ? "Task Created!" : stepTitles[step - 1] || "Add New Task"}
          </DialogTitle>
        </DialogHeader>

        <div 
          className={cn("flex-grow overflow-y-auto px-6 pb-4", isMobile && "px-4 pb-3")}
          ref={contentRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <AnimatePresence mode="wait">
            {step === 1 && (
              <QuickCaptureStep
                key="step1"
                data={taskData}
                onChange={updateTaskData}
                onNext={handleNext}
              />
            )}
            {step === 2 && (
              <AISuggestionsStep
                key="step2"
                data={taskData}
                onChange={updateTaskData}
                onNext={handleNext}
                onPrev={handlePrev}
              />
            )}
            {step === 3 && (
              <DetailsStep
                key="step3"
                data={taskData}
                onChange={updateTaskData}
                onPrev={handlePrev}
                onSubmit={handleSubmit}
              />
            )}
          </AnimatePresence>
        </div>

        {!taskCompleted && (
          <DialogFooter className={cn(
            "p-6 pt-4 border-t border-border bg-muted/30", 
            "flex flex-row justify-between items-center",
            isMobile && "p-4 pt-3 grid grid-cols-2 gap-3"
          )}>
            {step > 1 && !taskCompleted ? (
              <Button
                variant="outline"
                onClick={handlePrev}
                size={isMobile ? "lg" : "default"}
                className={cn(
                  "flex items-center gap-2 touch-manipulation transition-colors",
                  "focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 focus:ring-offset-background",
                  isMobile && "min-h-[48px] px-4"
                )}
                aria-label="Go to previous step"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                Back
              </Button>
            ) : (
              // Placeholder to keep alignment if only one button on left (e.g. step 1)
              <div className={cn(isMobile && "hidden")} /> 
            )}
            
            <div className={cn("flex-grow flex items-center justify-center px-4", isMobile && "hidden")}>
                <StuTaskGuidance 
                    currentStep={getStuStep()}
                    taskData={taskData}
                    size={isMobile ? "sm" : "md"} // Use smaller mascot on mobile
                    position="embedded" 
                />
            </div>
            
            <div className={cn("flex gap-2", isMobile && "order-1 gap-3 col-span-2 flex-grow")}>
              {!taskCompleted && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  size={isMobile ? "lg" : "default"}
                  className={cn(
                    "touch-manipulation transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    "focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 focus:ring-offset-background",
                    isMobile && "min-h-[48px] px-4"
                  )}
                  aria-label="Cancel task creation"
                >
                  Cancel
                </Button>
              )}
              
              {step < totalSteps && !taskCompleted ? (
                <Button
                  onClick={handleNext}
                  disabled={!taskData.title || !taskData.dueDate}
                  size={isMobile ? "lg" : "default"}
                  className={cn(
                    "flex items-center gap-2 touch-manipulation transition-colors",
                    "focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 focus:ring-offset-background",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    isMobile && "min-h-[48px] px-6 flex-1"
                  )}
                  aria-label={`Continue to ${stepTitles[step] || 'next step'}`}
                >
                  Next
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              ) : !taskCompleted ? (
                <Button
                  onClick={handleSubmit}
                  disabled={!taskData.title || !taskData.dueDate}
                  size={isMobile ? "lg" : "default"}
                  className={cn(
                    "flex items-center gap-2 touch-manipulation transition-colors",
                    "focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 focus:ring-offset-background",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "bg-primary text-primary-foreground hover:bg-primary/90",
                    isMobile && "min-h-[48px] px-6 flex-1"
                  )}
                  aria-label="Create new task with entered details"
                >
                  Create Task
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                </Button>
              ) : (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={cn(
                    "text-sm text-primary font-medium",
                    isMobile && "text-base py-3 text-center"
                  )}
                  role="status"
                  aria-live="polite"
                >
                  Task created successfully! ✨
                </motion.div>
              )}
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ProgressiveTaskCapture; 