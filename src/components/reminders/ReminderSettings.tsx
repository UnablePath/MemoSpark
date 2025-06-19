"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useAuth } from '@clerk/nextjs';
import { reminderEngine } from '@/lib/reminders/ReminderEngine';
import { 
  Bell, 
  Brain, 
  Clock, 
  Moon, 
  Volume2, 
  VolumeX, 
  Settings, 
  TrendingUp,
  Calendar,
  MessageSquare,
  Zap,
  Target
} from 'lucide-react';

interface ReminderPreferences {
  enabled: boolean;
  frequency: 'minimal' | 'normal' | 'frequent';
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  weekendsEnabled: boolean;
  soundEnabled: boolean;
  stuAnimations: boolean;
  smartTiming: boolean;
  adaptiveScheduling: boolean;
  snoozeOptions: number[]; // minutes
  defaultReminderOffsets: number[]; // minutes before due date
  procrastinationCompensation: number; // 0-1 scale
  stressLevelAdjustment: boolean;
  priorityBasedTiming: boolean;
}

interface ReminderStats {
  totalReminders: number;
  completionRate: number;
  averageResponseTime: number;
  effectivenessScore: number;
  snoozeRate: number;
}

export const ReminderSettings: React.FC = () => {
  const { userId } = useAuth();
  const [preferences, setPreferences] = useState<ReminderPreferences>({
    enabled: true,
    frequency: 'normal',
    quietHours: {
      enabled: true,
      start: '22:00',
      end: '08:00'
    },
    weekendsEnabled: true,
    soundEnabled: true,
    stuAnimations: true,
    smartTiming: true,
    adaptiveScheduling: true,
    snoozeOptions: [5, 15, 30, 60],
    defaultReminderOffsets: [1440, 60, 15], // 1 day, 1 hour, 15 minutes
    procrastinationCompensation: 0.3,
    stressLevelAdjustment: true,
    priorityBasedTiming: true
  });
  
  const [stats, setStats] = useState<ReminderStats>({
    totalReminders: 0,
    completionRate: 0,
    averageResponseTime: 0,
    effectivenessScore: 0,
    snoozeRate: 0
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (userId) {
      loadPreferences();
      loadStats();
    }
  }, [userId]);

  const loadPreferences = async () => {
    try {
      // Load preferences from database
      // For now, using defaults with localStorage fallback
      const saved = localStorage.getItem(`reminder-preferences-${userId}`);
      if (saved) {
        setPreferences({ ...preferences, ...JSON.parse(saved) });
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      toast.error('Failed to load reminder preferences');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      if (userId) {
        const reminderStats = await reminderEngine.getReminderStats(userId);
        setStats(reminderStats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const savePreferences = async () => {
    if (!userId) return;
    
    setIsSaving(true);
    try {
      // Save to localStorage for now (would be database in production)
      localStorage.setItem(`reminder-preferences-${userId}`, JSON.stringify(preferences));
      
      toast.success('Reminder preferences saved successfully!');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setIsSaving(false);
    }
  };

  const testReminder = async () => {
    try {
      toast.info('Scheduling test reminder for 1 minute from now...');
      
      // Generate a proper UUID for the test task
      const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c == 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };
      
      // Create a test task that will trigger a reminder exactly 1 minute from now
      const now = new Date();
      const oneMinuteFromNow = new Date(now.getTime() + 60 * 1000); // 1 minute from now
      const dueDateForTest = new Date(oneMinuteFromNow.getTime() + 60 * 1000); // Due 2 minutes from now
      
      const testTask = {
        id: generateUUID(),
        title: 'Test Reminder from Settings',
        due_date: dueDateForTest.toISOString(),
        user_id: userId!,
        priority: 'medium' as const,
        reminder_offset_minutes: 1 // Exactly 1 minute before due date
      };

      console.log('🧪 Creating test task:', testTask);
      console.log(`⏰ Test reminder scheduled for: ${oneMinuteFromNow.toISOString()}`);
      
      // Use direct TaskReminderService instead of AI-powered ReminderEngine
      // to avoid complex AI calculations that might schedule in the past
      const { taskReminderService } = await import('@/lib/notifications/TaskReminderService');
      const success = await taskReminderService.scheduleTaskReminder(testTask);
      
      if (success) {
        toast.success(`Test reminder scheduled! You'll receive a notification at ${oneMinuteFromNow.toLocaleTimeString()}`);
      } else {
        toast.error('Failed to schedule test reminder. Please enable push notifications and try again.');
      }
    } catch (error) {
      console.error('Error sending test reminder:', error);
      toast.error('Failed to send test reminder');
    }
  };

  const sendImmediateTest = async () => {
    try {
      toast.info('Sending immediate test notification...');
      
      // Check if user has notifications enabled first
      const subscriptionCheck = await fetch('/api/notifications/check-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      
      const subscriptionResult = await subscriptionCheck.json();
      
      if (!subscriptionCheck.ok || !subscriptionResult.hasActiveSubscription) {
        toast.error('Push notifications not enabled. Please enable notifications in your browser and sync in Settings.');
        return;
      }

      // Send immediate test notification
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          notification: {
            contents: { 
              en: '🎉 Test notification successful! Your reminder system is working perfectly.' 
            },
            headings: { 
              en: '🧪 StudySpark Test' 
            },
            data: {
              type: 'test_notification',
              url: '/dashboard'
            },
            url: '/dashboard',
            priority: 8,
          }
        })
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        toast.success('Immediate test notification sent! Check your notifications.');
      } else {
        toast.error(`Failed to send test notification: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error sending immediate test:', error);
      toast.error('Failed to send immediate test notification');
    }
  };

  const getEffectivenessColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getFrequencyDescription = (freq: string) => {
    switch (freq) {
      case 'minimal': return 'Only essential reminders';
      case 'normal': return 'Balanced reminder schedule';
      case 'frequent': return 'More frequent reminders';
      default: return '';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-32 bg-muted rounded-lg" />
        <div className="h-64 bg-muted rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4" />
            <span>Reminder Effectiveness</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{stats.totalReminders}</div>
              <div className="text-sm text-muted-foreground">Total Reminders</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {Math.round(stats.completionRate * 100)}%
              </div>
              <div className="text-sm text-muted-foreground">Completion Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {Math.round(stats.averageResponseTime)}m
              </div>
              <div className="text-sm text-muted-foreground">Avg Response Time</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${getEffectivenessColor(stats.effectivenessScore)}`}>
                {stats.effectivenessScore.toFixed(1)}/10
              </div>
              <div className="text-sm text-muted-foreground">Effectiveness</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {Math.round(stats.snoozeRate * 100)}%
              </div>
              <div className="text-sm text-muted-foreground">Snooze Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons - Moved to top for easy access */}
      <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
        <Button variant="outline" onClick={testReminder} size="sm" className="w-full sm:w-auto">
          <Zap className="h-4 w-4 mr-2" />
          <span className="hidden xs:inline">Test Reminder</span>
          <span className="xs:hidden">Test</span>
        </Button>
        <Button onClick={sendImmediateTest} size="sm" className="w-full sm:w-auto">
          <span className="hidden xs:inline">Send Immediate Test</span>
          <span className="xs:hidden">Send Test</span>
        </Button>
        <Button onClick={savePreferences} disabled={isSaving} size="sm" className="w-full sm:w-auto">
          {isSaving ? (
            <span className="hidden xs:inline">Saving...</span>
          ) : (
            <span className="hidden xs:inline">Save Settings</span>
          )}
          {isSaving ? (
            <span className="xs:hidden">Saving...</span>
          ) : (
            <span className="xs:hidden">Save</span>
          )}
        </Button>
      </div>

      {/* Basic Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Enable Proactive Reminders</Label>
              <p className="text-sm text-muted-foreground">
                Turn on intelligent task reminders with AI-optimized timing
              </p>
            </div>
            <Switch
              checked={preferences.enabled}
              onCheckedChange={(checked) => 
                setPreferences(prev => ({ ...prev, enabled: checked }))
              }
            />
          </div>

          <Separator />

          {/* Frequency */}
          <div className="space-y-3">
            <Label>Reminder Frequency</Label>
            <Select 
              value={preferences.frequency}
              onValueChange={(value: 'minimal' | 'normal' | 'frequent') =>
                setPreferences(prev => ({ ...prev, frequency: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minimal">Minimal</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="frequent">Frequent</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {getFrequencyDescription(preferences.frequency)}
            </p>
          </div>

          <Separator />

          {/* Quick Toggles */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Volume2 className="h-4 w-4" />
                <Label>Sound</Label>
              </div>
              <Switch
                checked={preferences.soundEnabled}
                onCheckedChange={(checked) => 
                  setPreferences(prev => ({ ...prev, soundEnabled: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-4 w-4" />
                <Label>Stu Animations</Label>
              </div>
              <Switch
                checked={preferences.stuAnimations}
                onCheckedChange={(checked) => 
                  setPreferences(prev => ({ ...prev, stuAnimations: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Brain className="h-4 w-4" />
                <Label>Smart Timing</Label>
              </div>
              <Switch
                checked={preferences.smartTiming}
                onCheckedChange={(checked) => 
                  setPreferences(prev => ({ ...prev, smartTiming: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <Label>Weekends</Label>
              </div>
              <Switch
                checked={preferences.weekendsEnabled}
                onCheckedChange={(checked) => 
                  setPreferences(prev => ({ ...prev, weekendsEnabled: checked }))
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Moon className="h-4 w-4" />
            <span>Quiet Hours</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Enable quiet hours</Label>
            <Switch
              checked={preferences.quietHours.enabled}
              onCheckedChange={(checked) => 
                setPreferences(prev => ({ 
                  ...prev, 
                  quietHours: { ...prev.quietHours, enabled: checked }
                }))
              }
            />
          </div>
          
          {preferences.quietHours.enabled && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={preferences.quietHours.start}
                  onChange={(e) => 
                    setPreferences(prev => ({
                      ...prev,
                      quietHours: { ...prev.quietHours, start: e.target.value }
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={preferences.quietHours.end}
                  onChange={(e) => 
                    setPreferences(prev => ({
                      ...prev,
                      quietHours: { ...prev.quietHours, end: e.target.value }
                    }))
                  }
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Advanced Settings */}
      <Card>
        <CardHeader>
          <CardTitle 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <div className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Advanced Settings</span>
            </div>
            <motion.div
              animate={{ rotate: showAdvanced ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              ⌄
            </motion.div>
          </CardTitle>
        </CardHeader>
        
        {showAdvanced && (
          <CardContent className="space-y-6">
            {/* Procrastination Compensation */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Procrastination Compensation</Label>
                <Badge variant="secondary">
                  {Math.round(preferences.procrastinationCompensation * 100)}%
                </Badge>
              </div>
              <Slider
                value={[preferences.procrastinationCompensation * 100]}
                onValueChange={([value]) => 
                  setPreferences(prev => ({ ...prev, procrastinationCompensation: value / 100 }))
                }
                max={100}
                step={10}
                className="w-full"
              />
              <p className="text-sm text-muted-foreground">
                Higher values send reminders earlier for users who tend to procrastinate
              </p>
            </div>

            <Separator />

            {/* AI Features */}
            <div className="space-y-4">
              <Label>AI-Powered Features</Label>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-sm">Adaptive Scheduling</Label>
                    <p className="text-xs text-muted-foreground">
                      AI learns your patterns and adjusts reminder timing
                    </p>
                  </div>
                  <Switch
                    checked={preferences.adaptiveScheduling}
                    onCheckedChange={(checked) => 
                      setPreferences(prev => ({ ...prev, adaptiveScheduling: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-sm">Stress Level Adjustment</Label>
                    <p className="text-xs text-muted-foreground">
                      Adjusts reminder tone based on your stress levels
                    </p>
                  </div>
                  <Switch
                    checked={preferences.stressLevelAdjustment}
                    onCheckedChange={(checked) => 
                      setPreferences(prev => ({ ...prev, stressLevelAdjustment: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-sm">Priority-Based Timing</Label>
                    <p className="text-xs text-muted-foreground">
                      Urgent tasks get more frequent reminders
                    </p>
                  </div>
                  <Switch
                    checked={preferences.priorityBasedTiming}
                    onCheckedChange={(checked) => 
                      setPreferences(prev => ({ ...prev, priorityBasedTiming: checked }))
                    }
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Snooze Options */}
            <div className="space-y-3">
              <Label>Snooze Options (minutes)</Label>
              <div className="flex flex-wrap gap-2">
                {[5, 10, 15, 30, 60, 120].map((minutes) => (
                  <Button
                    key={minutes}
                    variant={preferences.snoozeOptions.includes(minutes) ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      const isSelected = preferences.snoozeOptions.includes(minutes);
                      setPreferences(prev => ({
                        ...prev,
                        snoozeOptions: isSelected
                          ? prev.snoozeOptions.filter(m => m !== minutes)
                          : [...prev.snoozeOptions, minutes].sort((a, b) => a - b)
                      }));
                    }}
                  >
                    {minutes}m
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default ReminderSettings; 