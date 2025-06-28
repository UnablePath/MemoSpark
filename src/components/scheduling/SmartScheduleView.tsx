'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Clock, AlertTriangle, RefreshCw, CheckCircle2, Settings, Save, TrendingUp, Check, Plus, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import { useUpdateTask, useCreateTask, useFetchTasks } from '@/hooks/useTaskQueries';
import { useAuth } from '@clerk/nextjs';

interface ScheduledTask {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  reasoning: string;
  confidence: number;
  difficultyLevel?: number;
  subject?: string;
  taskId?: string; // Add taskId for task updates
}

interface ScheduleAdjustment {
  taskId: string;
  recommendation: string;
  priority: 'low' | 'medium' | 'high';
  potentialImpact: string;
}

interface UserPreferences {
  studyTimePreference: 'morning' | 'afternoon' | 'evening' | 'night';
  sessionLengthPreference: 'short' | 'medium' | 'long';
  difficultyComfort: 'easy' | 'moderate' | 'challenging';
  breakFrequency: 'frequent' | 'moderate' | 'minimal';
  preferredSubjects: string[];
  strugglingSubjects: string[];
  availableStudyHours: number[];
}

interface SmartScheduleViewProps {
  className?: string;
}

export const SmartScheduleView: React.FC<SmartScheduleViewProps> = ({ className }) => {
  const [schedule, setSchedule] = useState<ScheduledTask[]>([]);
  const [adjustments, setAdjustments] = useState<ScheduleAdjustment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isApplyingSchedule, setIsApplyingSchedule] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [showEmptyStateDialog, setShowEmptyStateDialog] = useState(false);
  const [metadata, setMetadata] = useState<any>(null);
  const { toast } = useToast();
  const { getToken } = useAuth();
  const updateTaskMutation = useUpdateTask(getToken);
  const createTaskMutation = useCreateTask(getToken);
  const { data: existingTasks, refetch: refetchTasks } = useFetchTasks(undefined, getToken);

  const [preferences, setPreferences] = useState<UserPreferences>({
    studyTimePreference: 'morning',
    sessionLengthPreference: 'medium',
    difficultyComfort: 'moderate',
    breakFrequency: 'moderate',
    preferredSubjects: [],
    strugglingSubjects: [],
    availableStudyHours: [9, 10, 11, 14, 15, 16, 17, 18, 19, 20]
  });

  // Quick task creation form state
  const [quickTaskForm, setQuickTaskForm] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'medium' as 'high' | 'medium' | 'low',
    subject: '',
    estimatedDuration: 60
  });

  // Load saved preferences on component mount
  useEffect(() => {
    loadSavedPreferences();
  }, []);

  const loadSavedPreferences = async () => {
    try {
      const response = await fetch('/api/ai/schedule');
      if (response.ok) {
        const data = await response.json();
        if (data.preferences && Object.keys(data.preferences).length > 0) {
          setPreferences(prev => ({ ...prev, ...data.preferences }));
        }
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  };

  const generateSchedule = async () => {
    // Check if user has any tasks first
    const currentTasks = existingTasks || [];
    const incompleteTasks = currentTasks.filter(task => !task.completed);
    
    if (incompleteTasks.length === 0) {
      setShowEmptyStateDialog(true);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/ai/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userPreferences: preferences,
          existingEvents: [], // Could be populated from calendar integration
          taskFilters: { completed: false } // Only schedule incomplete tasks
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate schedule');
      }

      const data = await response.json();
      
      // Check if API returned empty schedule due to no tasks
      if (!data.schedule || data.schedule.length === 0) {
        setShowEmptyStateDialog(true);
        return;
      }
      
      // Convert string dates back to Date objects
      const scheduleWithDates = data.schedule.map((task: any) => ({
        ...task,
        startTime: new Date(task.startTime),
        endTime: new Date(task.endTime),
        taskId: task.taskId || task.id // Ensure we have task ID for updates
      }));

      setSchedule(scheduleWithDates);
      setAdjustments(data.adjustments || []);
      setMetadata(data.metadata);

      toast({
        title: "Schedule Generated",
        description: `Successfully scheduled ${data.metadata?.tasksScheduled || 0} tasks with ${Math.round((data.metadata?.averageConfidence || 0) * 100)}% average confidence.`,
      });

    } catch (error) {
      console.error('Failed to generate schedule:', error);
      toast({
        title: "Error",
        description: "Failed to generate schedule. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const savePreferences = async () => {
    try {
      const response = await fetch('/api/ai/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userPreferences: preferences,
          existingEvents: [],
          taskFilters: { completed: false }
        }),
      });

      if (response.ok) {
        toast({
          title: "Preferences Saved",
          description: "Your scheduling preferences have been saved successfully.",
        });
      }
    } catch (error) {
      console.error('Failed to save preferences:', error);
      toast({
        title: "Error",
        description: "Failed to save preferences.",
        variant: "destructive",
      });
    }
  };

  const applyScheduleToTasks = async () => {
    if (schedule.length === 0) {
      toast({
        title: "No Schedule to Apply",
        description: "Generate a schedule first before applying it.",
        variant: "destructive",
      });
      return;
    }

    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to apply this schedule?\n\nThis will update the due dates and times for ${schedule.length} tasks. This action cannot be undone.`
    );

    if (!confirmed) return;

    setIsApplyingSchedule(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      // Apply schedule to each task
      for (const scheduledTask of schedule) {
        try {
          if (scheduledTask.taskId) {
            await updateTaskMutation.mutateAsync({
              id: scheduledTask.taskId,
              updates: {
                due_date: scheduledTask.startTime.toISOString(),
                // Optionally update reminder settings based on schedule
                reminder_settings: {
                  enabled: true,
                  offset_minutes: 15 // Default 15 min before due time
                }
              }
            });
            successCount++;
          }
        } catch (error) {
          console.error(`Failed to update task ${scheduledTask.taskId}:`, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast({
          title: "Schedule Applied Successfully",
          description: `Updated ${successCount} tasks. ${errorCount > 0 ? `${errorCount} tasks failed to update.` : 'All notifications have been rescheduled accordingly.'}`,
        });

        // Trigger notification rescheduling
        try {
          await fetch('/api/notifications/schedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'reschedule_all_tasks',
              source: 'smart_schedule_application'
            })
          });
        } catch (notifError) {
          console.error('Failed to reschedule notifications:', notifError);
        }
      } else {
        toast({
          title: "Schedule Application Failed",
          description: "No tasks were updated. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error applying schedule:', error);
      toast({
        title: "Error Applying Schedule",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsApplyingSchedule(false);
    }
  };

  const createQuickTask = async () => {
    if (!quickTaskForm.title.trim()) {
      toast({
        title: "Task Title Required",
        description: "Please enter a task title to continue.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createTaskMutation.mutateAsync({
        title: quickTaskForm.title,
        description: quickTaskForm.description,
        due_date: quickTaskForm.dueDate ? new Date(quickTaskForm.dueDate).toISOString() : undefined,
        priority: quickTaskForm.priority,
        subject: quickTaskForm.subject || undefined,
        type: 'academic',
        completed: false
      });

      // Reset form
      setQuickTaskForm({
        title: '',
        description: '',
        dueDate: '',
        priority: 'medium',
        subject: '',
        estimatedDuration: 60
      });

      // Refresh tasks and close dialog
      await refetchTasks();
      setShowEmptyStateDialog(false);

      toast({
        title: "Task Created",
        description: "Your task has been created! You can now generate a smart schedule.",
      });
    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: "Error",
        description: "Failed to create task. Please try again.",
        variant: "destructive",
      });
    }
  };

  const resetQuickTaskForm = () => {
    setQuickTaskForm({
      title: '',
      description: '',
      dueDate: '',
      priority: 'medium',
      subject: '',
      estimatedDuration: 60
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const updateSubjectList = (subject: string, list: 'preferred' | 'struggling', checked: boolean) => {
    setPreferences(prev => {
      const key = list === 'preferred' ? 'preferredSubjects' : 'strugglingSubjects';
      const currentList = prev[key];
      
      if (checked) {
        return {
          ...prev,
          [key]: [...currentList, subject]
        };
      } else {
        return {
          ...prev,
          [key]: currentList.filter(s => s !== subject)
        };
      }
    });
  };

  const commonSubjects = ['Mathematics', 'Computer Science', 'Physics', 'Chemistry', 'Biology', 'History', 'English', 'Psychology', 'Economics', 'Art'];

  return (
    <div className={`space-y-6 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Smart Schedule Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={generateSchedule} 
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generating Schedule...
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4 mr-2" />
                  Generate Smart Schedule
                </>
              )}
            </Button>
            {schedule.length > 0 && (
              <Button 
                onClick={applyScheduleToTasks}
                disabled={isApplyingSchedule || isLoading}
                variant="default"
                className="bg-green-600 hover:bg-green-700"
              >
                {isApplyingSchedule ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Applying...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Apply Schedule
                  </>
                )}
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={() => setShowPreferences(!showPreferences)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>

          {metadata && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{metadata.tasksScheduled}</div>
                <div className="text-sm text-gray-600">Tasks Scheduled</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{Math.round(metadata.averageConfidence * 100)}%</div>
                <div className="text-sm text-gray-600">Avg Confidence</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{metadata.conflictsResolved}</div>
                <div className="text-sm text-gray-600">Conflicts Resolved</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{metadata.totalTasks}</div>
                <div className="text-sm text-gray-600">Total Tasks</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {showPreferences && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Scheduling Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Study Time Preference</Label>
                <Select 
                  value={preferences.studyTimePreference} 
                  onValueChange={(value: any) => setPreferences(prev => ({ ...prev, studyTimePreference: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Morning (6-12 PM)</SelectItem>
                    <SelectItem value="afternoon">Afternoon (12-6 PM)</SelectItem>
                    <SelectItem value="evening">Evening (6-10 PM)</SelectItem>
                    <SelectItem value="night">Night (10 PM-2 AM)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Session Length Preference</Label>
                <Select 
                  value={preferences.sessionLengthPreference} 
                  onValueChange={(value: any) => setPreferences(prev => ({ ...prev, sessionLengthPreference: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">Short (30 min)</SelectItem>
                    <SelectItem value="medium">Medium (45 min)</SelectItem>
                    <SelectItem value="long">Long (60+ min)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Difficulty Comfort</Label>
                <Select 
                  value={preferences.difficultyComfort} 
                  onValueChange={(value: any) => setPreferences(prev => ({ ...prev, difficultyComfort: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Prefer easier tasks</SelectItem>
                    <SelectItem value="moderate">Balanced difficulty</SelectItem>
                    <SelectItem value="challenging">Enjoy challenges</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Break Frequency</Label>
                <Select 
                  value={preferences.breakFrequency} 
                  onValueChange={(value: any) => setPreferences(prev => ({ ...prev, breakFrequency: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="frequent">Frequent (every 25 min)</SelectItem>
                    <SelectItem value="moderate">Moderate (every 45 min)</SelectItem>
                    <SelectItem value="minimal">Minimal (every 90 min)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-base font-medium">Preferred Subjects</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                  {commonSubjects.map(subject => (
                    <div key={subject} className="flex items-center space-x-2">
                      <Checkbox
                        id={`preferred-${subject}`}
                        checked={preferences.preferredSubjects.includes(subject)}
                        onCheckedChange={(checked) => updateSubjectList(subject, 'preferred', checked as boolean)}
                      />
                      <Label htmlFor={`preferred-${subject}`} className="text-sm">{subject}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-base font-medium">Struggling Subjects</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                  {commonSubjects.map(subject => (
                    <div key={subject} className="flex items-center space-x-2">
                      <Checkbox
                        id={`struggling-${subject}`}
                        checked={preferences.strugglingSubjects.includes(subject)}
                        onCheckedChange={(checked) => updateSubjectList(subject, 'struggling', checked as boolean)}
                      />
                      <Label htmlFor={`struggling-${subject}`} className="text-sm">{subject}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <Button onClick={savePreferences} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              Save Preferences
            </Button>
          </CardContent>
        </Card>
      )}

      {schedule.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Generated Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {schedule.map((task) => (
              <div key={task.id} className="border rounded-lg p-4 space-y-2 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{task.title}</h3>
                    {task.subject && (
                      <Badge variant="outline" className="mt-1">
                        {task.subject}
                      </Badge>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Clock className="h-3 w-3" />
                      {format(task.startTime, 'MMM d, h:mm a')} - {format(task.endTime, 'h:mm a')}
                    </div>
                    <div className={`text-sm font-medium ${getConfidenceColor(task.confidence)}`}>
                      <CheckCircle2 className="h-3 w-3 inline mr-1" />
                      {Math.round(task.confidence * 100)}% confidence
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600">{task.reasoning}</p>
                {task.difficultyLevel && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Difficulty:</span>
                    <div className="flex gap-1">
                      {Array.from({ length: 10 }, (_, i) => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-full ${
                            i < (task.difficultyLevel || 0)
                              ? 'bg-blue-500' 
                              : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-gray-500">({task.difficultyLevel}/10)</span>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {adjustments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Schedule Recommendations ({adjustments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {adjustments.map((adjustment, index) => (
              <div key={index} className="border rounded-lg p-3 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <Badge className={getPriorityColor(adjustment.priority)}>
                    {adjustment.priority} priority
                  </Badge>
                </div>
                <p className="text-sm mb-2">{adjustment.recommendation}</p>
                <p className="text-xs text-gray-500">
                  <strong>Potential Impact:</strong> {adjustment.potentialImpact}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      
      {/* Empty State Dialog */}
      <Dialog open={showEmptyStateDialog} onOpenChange={setShowEmptyStateDialog}>
        <DialogContent className="sm:max-w-md max-w-[90vw] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <BookOpen className="h-5 w-5" />
              No Tasks to Schedule
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center py-2 sm:py-4">
              <div className="text-3xl sm:text-4xl mb-2">📚</div>
              <p className="text-gray-600 mb-4 text-sm sm:text-base">
                You need to create some tasks before using smart scheduling! 
                Smart scheduling helps you organize and optimize your existing tasks.
              </p>
            </div>
            
            <div className="space-y-3 sm:space-y-4">
              <h4 className="font-medium text-sm sm:text-base">Quick Task Creation</h4>
              
              <div className="space-y-2 sm:space-y-3">
                <div>
                  <Label htmlFor="quick-title" className="text-sm">Task Title *</Label>
                  <Input
                    id="quick-title"
                    placeholder="e.g., Study for Math exam"
                    value={quickTaskForm.title}
                    onChange={(e) => setQuickTaskForm(prev => ({ ...prev, title: e.target.value }))}
                    className="h-10 sm:h-11"
                  />
                </div>
                
                <div>
                  <Label htmlFor="quick-description" className="text-sm">Description</Label>
                  <Textarea
                    id="quick-description"
                    placeholder="Optional details about the task..."
                    value={quickTaskForm.description}
                    onChange={(e) => setQuickTaskForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                    className="text-sm"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="quick-priority" className="text-sm">Priority</Label>
                    <Select 
                      value={quickTaskForm.priority} 
                      onValueChange={(value: 'low' | 'medium' | 'high') => 
                        setQuickTaskForm(prev => ({ ...prev, priority: value }))
                      }
                    >
                      <SelectTrigger className="h-10 sm:h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="quick-subject" className="text-sm">Subject</Label>
                    <Input
                      id="quick-subject"
                      placeholder="e.g., Math"
                      value={quickTaskForm.subject}
                      onChange={(e) => setQuickTaskForm(prev => ({ ...prev, subject: e.target.value }))}
                      className="h-10 sm:h-11"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="quick-due" className="text-sm">Due Date</Label>
                    <Input
                      id="quick-due"
                      type="date"
                      value={quickTaskForm.dueDate}
                      onChange={(e) => setQuickTaskForm(prev => ({ ...prev, dueDate: e.target.value }))}
                      className="h-10 sm:h-11"
                    />
                  </div>
                  <div>
                    <Label htmlFor="quick-duration" className="text-sm">Duration (min)</Label>
                    <Input
                      id="quick-duration"
                      type="number"
                      min="15"
                      max="300"
                      value={quickTaskForm.estimatedDuration}
                      onChange={(e) => setQuickTaskForm(prev => ({ ...prev, estimatedDuration: parseInt(e.target.value) || 60 }))}
                      className="h-10 sm:h-11"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => {
              setShowEmptyStateDialog(false);
              resetQuickTaskForm();
            }} className="flex-1 sm:flex-none h-10 sm:h-11 text-sm">
              Cancel
            </Button>
            <Button onClick={createQuickTask} disabled={createTaskMutation.isPending} className="flex-1 sm:flex-none h-10 sm:h-11 text-sm">
              {createTaskMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Task
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}; 