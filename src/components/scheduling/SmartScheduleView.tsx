'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, Clock, AlertTriangle, RefreshCw, CheckCircle2, Settings, Save, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';

interface ScheduledTask {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  reasoning: string;
  confidence: number;
  difficultyLevel?: number;
  subject?: string;
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
  const [showPreferences, setShowPreferences] = useState(false);
  const [metadata, setMetadata] = useState<any>(null);
  const { toast } = useToast();

  const [preferences, setPreferences] = useState<UserPreferences>({
    studyTimePreference: 'morning',
    sessionLengthPreference: 'medium',
    difficultyComfort: 'moderate',
    breakFrequency: 'moderate',
    preferredSubjects: [],
    strugglingSubjects: [],
    availableStudyHours: [9, 10, 11, 14, 15, 16, 17, 18, 19, 20]
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
      
      // Convert string dates back to Date objects
      const scheduleWithDates = data.schedule.map((task: any) => ({
        ...task,
        startTime: new Date(task.startTime),
        endTime: new Date(task.endTime)
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
    </div>
  );
}; 