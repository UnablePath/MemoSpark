'use client';

import React, { useState, useEffect } from 'react';
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
          <div className="p-3 bg-primary/10 rounded-full">
            <Tag className="h-6 w-6 text-primary" />
          </div>
        </div>
        <h3 className="text-lg font-semibold">Quick Task Capture</h3>
        <p className="text-sm text-muted-foreground">Start with the essentials</p>
      </div>

      <div className={cn("space-y-4", isMobile && "space-y-6")}>
        <div>
          <Label htmlFor="quick-title" className={cn("text-sm font-medium", isMobile && "text-base")}>
            What needs to be done? *
          </Label>
          <Input
            id="quick-title"
            placeholder="e.g., Study for Math exam, Complete project proposal"
            value={data.title}
            onChange={(e) => onChange({ title: e.target.value })}
            className={cn(
              "mt-1.5 h-11 transition-all duration-200",
              isMobile && "h-14 text-base px-4 rounded-lg touch-manipulation",
              "focus:ring-2 focus:ring-primary/20"
            )}
            autoFocus={!isMobile} // Avoid auto-focus on mobile to prevent unwanted keyboard
            autoComplete="off"
            autoCapitalize="sentences"
            spellCheck={true}
            inputMode="text"
            required
          />
        </div>

        <div>
          <Label htmlFor="quick-due-date" className={cn("text-sm font-medium", isMobile && "text-base")}>
            When is it due? *
          </Label>
          <div className="relative mt-1.5">
            <Calendar className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground",
              isMobile && "left-4 h-5 w-5"
            )} />
            <Input
              id="quick-due-date"
              type="datetime-local"
              value={data.dueDate}
              onChange={(e) => onChange({ dueDate: e.target.value })}
              className={cn(
                "pl-10 h-11 transition-all duration-200",
                isMobile && "pl-12 h-14 text-base rounded-lg touch-manipulation",
                "focus:ring-2 focus:ring-primary/20"
              )}
              required
            />
          </div>
        </div>

        <div className={cn("grid grid-cols-2 gap-3", isMobile && "gap-4")}>
          <div>
            <Label htmlFor="quick-priority" className={cn("text-sm font-medium", isMobile && "text-base")}>
              Priority
            </Label>
            <Select value={data.priority} onValueChange={(value: Priority) => onChange({ priority: value })}>
              <SelectTrigger className={cn(
                "mt-1.5 h-11 transition-all duration-200",
                isMobile && "h-14 text-base rounded-lg touch-manipulation"
              )}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low" className={isMobile ? "py-3 text-base" : ""}>Low</SelectItem>
                <SelectItem value="medium" className={isMobile ? "py-3 text-base" : ""}>Medium</SelectItem>
                <SelectItem value="high" className={isMobile ? "py-3 text-base" : ""}>High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="quick-type" className={cn("text-sm font-medium", isMobile && "text-base")}>
              Type
            </Label>
            <Select value={data.type} onValueChange={(value: TaskType) => onChange({ type: value })}>
              <SelectTrigger className={cn(
                "mt-1.5 h-11 transition-all duration-200",
                isMobile && "h-14 text-base rounded-lg touch-manipulation"
              )}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="academic" className={isMobile ? "py-3 text-base" : ""}>Academic</SelectItem>
                <SelectItem value="personal" className={isMobile ? "py-3 text-base" : ""}>Personal</SelectItem>
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
    >
      <div className="text-center mb-6">
        <div className="flex items-center justify-center mb-2">
          <div className="p-3 bg-primary/10 rounded-full">
            <Clock className="h-6 w-6 text-primary" />
          </div>
        </div>
        <h3 className="text-lg font-semibold">Additional Details</h3>
        <p className="text-sm text-muted-foreground">Fine-tune your task settings</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="details-description" className="text-sm font-medium">Description</Label>
          <Textarea
            id="details-description"
            placeholder="Add notes, requirements, or other details..."
            value={data.description || ''}
            onChange={(e) => onChange({ description: e.target.value })}
            className="mt-1.5 min-h-[80px]"
            rows={3}
          />
        </div>

        <div className="flex items-center space-x-2">
          <input
            id="details-reminder"
            type="checkbox"
            checked={data.reminder}
            onChange={(e) => onChange({ reminder: e.target.checked })}
            className="rounded border-border"
          />
          <Label htmlFor="details-reminder" className="text-sm font-medium">
            Enable reminders
          </Label>
        </div>

        <div>
          <Label htmlFor="details-recurrence" className="text-sm font-medium">Recurrence</Label>
          <Select 
            value={data.recurrenceRule || 'none'} 
            onValueChange={(value: RecurrenceRule) => onChange({ recurrenceRule: value })}
          >
            <SelectTrigger className="mt-1.5 h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No recurrence</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {data.recurrenceRule && data.recurrenceRule !== 'none' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="details-interval" className="text-sm font-medium">Interval</Label>
              <Input
                id="details-interval"
                type="number"
                min="1"
                value={data.recurrenceInterval || 1}
                onChange={(e) => onChange({ recurrenceInterval: Number(e.target.value) })}
                className="mt-1.5 h-11"
                placeholder={`Every ${data.recurrenceRule === 'daily' ? 'day(s)' : 
                  data.recurrenceRule === 'weekly' ? 'week(s)' : 
                  data.recurrenceRule === 'monthly' ? 'month(s)' : 'year(s)'}`}
              />
            </div>
            <div>
              <Label htmlFor="details-end-date" className="text-sm font-medium">Ends On</Label>
              <Input
                id="details-end-date"
                type="date"
                value={data.recurrenceEndDate || ''}
                onChange={(e) => onChange({ recurrenceEndDate: e.target.value })}
                className="mt-1.5 h-11"
                min={format(addDays(parseISO(data.dueDate), 1), 'yyyy-MM-dd')}
              />
            </div>
          </div>
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
  const [taskData, setTaskData] = useState<TaskFormData>(() => ({
    ...initialTaskState,
    ...initialData
  }));
  const [taskCompleted, setTaskCompleted] = useState(false);
  const [touchStartY, setTouchStartY] = useState(0);
  const [touchStartX, setTouchStartX] = useState(0);
  
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
          "sm:max-w-lg max-h-[90vh] overflow-y-auto transition-all duration-200",
          isMobile && "fixed inset-x-2 bottom-2 top-auto max-h-[85vh] rounded-t-xl border-t-2 shadow-2xl"
        )}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <DialogHeader className={cn("pb-2", isMobile && "pb-4 pt-2")}>
          <DialogTitle className="sr-only">Create New Task - {stepTitles[step - 1]}</DialogTitle>
          
          {/* Mobile handle indicator */}
          {isMobile && (
            <div className="flex justify-center mb-4">
              <div className="w-8 h-1 bg-muted-foreground/30 rounded-full" />
            </div>
          )}
          
          <div className="flex items-center justify-between mb-4">
            {/* Enhanced progress indicator */}
            <div className="flex justify-center space-x-2 flex-1">
              {[...Array(totalSteps)].map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    // Allow direct step navigation if previous steps are complete
                    if (index + 1 <= step || (index === 0)) {
                      setStep(index + 1);
                      if (isTouchDevice && 'vibrate' in navigator) {
                        navigator.vibrate(5);
                      }
                    }
                  }}
                  disabled={index + 1 > step && index !== 0}
                  className={cn(
                    "h-2 rounded-full transition-all duration-300 touch-manipulation",
                    "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-1",
                    isMobile ? "min-w-[44px] h-3" : "w-4",
                    index + 1 === step 
                      ? "bg-primary shadow-sm" 
                      : index + 1 < step 
                      ? "bg-primary/70 hover:bg-primary/80 cursor-pointer" 
                      : "bg-primary/20 cursor-not-allowed",
                    index + 1 <= step && "cursor-pointer hover:shadow-sm"
                  )}
                  aria-label={`Step ${index + 1}: ${stepTitles[index]}`}
                />
              ))}
            </div>
            
            {/* Stu Guidance */}
            <div className="ml-4">
              <StuTaskGuidance
                currentStep={getStuStep()}
                taskData={taskData}
                size="sm"
                position="embedded"
                onGuidanceAction={(action) => {
                  console.log('Stu guidance action:', action);
                }}
              />
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-[400px]">
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

        <DialogFooter className={cn(
          "flex-row justify-between pt-4",
          isMobile && "pt-6 gap-4 flex-col sm:flex-row"
        )}>
          <div className={cn("flex gap-2", isMobile && "order-2 justify-center")}>
            {step > 1 && !taskCompleted && (
              <Button
                type="button"
                variant="outline"
                onClick={handlePrev}
                size={isMobile ? "lg" : "default"}
                className={cn(
                  "flex items-center gap-2 touch-manipulation",
                  isMobile && "min-h-[48px] px-6 flex-1"
                )}
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
            )}
          </div>
          
          <div className={cn("flex gap-2", isMobile && "order-1 gap-3")}>
            {!taskCompleted && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                size={isMobile ? "lg" : "default"}
                className={cn(
                  "touch-manipulation",
                  isMobile && "min-h-[48px] px-4"
                )}
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
                  "flex items-center gap-2 touch-manipulation",
                  isMobile && "min-h-[48px] px-6 flex-1"
                )}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : !taskCompleted ? (
              <Button
                onClick={handleSubmit}
                disabled={!taskData.title || !taskData.dueDate}
                size={isMobile ? "lg" : "default"}
                className={cn(
                  "flex items-center gap-2 touch-manipulation",
                  isMobile && "min-h-[48px] px-6 flex-1 bg-primary text-primary-foreground"
                )}
              >
                Create Task
                <Sparkles className="h-4 w-4" />
              </Button>
            ) : (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={cn(
                  "text-sm text-primary font-medium",
                  isMobile && "text-base py-3 text-center"
                )}
              >
                Task created successfully! ✨
              </motion.div>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProgressiveTaskCapture; 