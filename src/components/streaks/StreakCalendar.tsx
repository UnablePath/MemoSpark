'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Calendar, ChevronLeft, ChevronRight, Flame } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths } from 'date-fns';
import { StreakTracker, type DailyStreak } from '@/lib/gamification/StreakTracker';
import { toast } from 'sonner';

interface StreakCalendarProps {
  className?: string;
  onDayClick?: (date: Date, streak: DailyStreak | null) => void;
}

export const StreakCalendar: React.FC<StreakCalendarProps> = ({ 
  className = '',
  onDayClick
}) => {
  const { user } = useUser();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dailyStreaks, setDailyStreaks] = useState<DailyStreak[]>([]);
  const [loading, setLoading] = useState(true);
  const [streakTracker] = useState(() => new StreakTracker());

  useEffect(() => {
    if (user?.id) {
      loadMonthData();
    }
  }, [user?.id, currentMonth]);

  const loadMonthData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      // Get streak data for the current month
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);
      
      // For now, we'll get all streaks and filter client-side
      // In a real app, you'd want to add date filtering to the API
      const streaks = await streakTracker.getStreakAnalytics(user.id);
      // This is a simplified version - in practice you'd fetch actual daily streaks
      setDailyStreaks([]);
    } catch (error) {
      console.error('Error loading month data:', error);
      toast.error('Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  };

  const getStreakForDate = (date: Date): DailyStreak | null => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return dailyStreaks.find(streak => 
      format(new Date(streak.date), 'yyyy-MM-dd') === dateStr
    ) || null;
  };

  const getDayClassName = (date: Date, streak: DailyStreak | null) => {
    const baseClasses = "w-10 h-10 flex items-center justify-center text-sm rounded-lg cursor-pointer transition-all hover:bg-accent";
    
    if (!isSameMonth(date, currentMonth)) {
      return `${baseClasses} text-muted-foreground opacity-50`;
    }

    if (isToday(date)) {
      if (streak?.completed) {
        return `${baseClasses} bg-green-500 text-white font-bold hover:bg-green-600`;
      } else {
        return `${baseClasses} bg-orange-500 text-white font-bold hover:bg-orange-600`;
      }
    }

    if (streak?.completed) {
      return `${baseClasses} bg-green-100 text-green-800 font-medium hover:bg-green-200`;
    }

    if (date < new Date() && !streak?.completed) {
      return `${baseClasses} bg-red-100 text-red-800 hover:bg-red-200`;
    }

    return `${baseClasses} hover:bg-accent`;
  };

  const getDayIcon = (date: Date, streak: DailyStreak | null) => {
    if (isToday(date) && streak?.completed) {
      return '🔥';
    }
    if (streak?.completed) {
      if (streak.tasks_completed >= 5) return '💎';
      if (streak.tasks_completed >= 3) return '⭐';
      return '✅';
    }
    if (isToday(date)) {
      return '🎯';
    }
    if (date < new Date()) {
      return '❌';
    }
    return '';
  };

  const handleDayClick = (date: Date) => {
    const streak = getStreakForDate(date);
    onDayClick?.(date, streak);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => 
      direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)
    );
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad the calendar to start on Sunday
  const startDay = monthStart.getDay();
  const paddedDays = [];
  for (let i = startDay - 1; i >= 0; i--) {
    const padDate = new Date(monthStart);
    padDate.setDate(padDate.getDate() - i - 1);
    paddedDays.push(padDate);
  }

  // Pad the calendar to end on Saturday
  const endDay = monthEnd.getDay();
  const endPaddedDays = [];
  for (let i = 1; i <= 6 - endDay; i++) {
    const padDate = new Date(monthEnd);
    padDate.setDate(padDate.getDate() + i);
    endPaddedDays.push(padDate);
  }

  const allDays = [...paddedDays, ...calendarDays, ...endPaddedDays];

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="h-10 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>Streak Calendar</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('prev')}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Select 
                value={format(currentMonth, 'yyyy-MM')}
                onValueChange={(value) => setCurrentMonth(new Date(value + '-01'))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => {
                    const date = new Date();
                    date.setMonth(date.getMonth() - 6 + i);
                    return (
                      <SelectItem key={i} value={format(date, 'yyyy-MM')}>
                        {format(date, 'MMM yyyy')}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('next')}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Legend */}
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-green-100 rounded"></div>
              <span>Completed</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-red-100 rounded"></div>
              <span>Missed</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-orange-500 rounded"></div>
              <span>Today</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 border-2 border-gray-300 rounded"></div>
              <span>Future</span>
            </div>
          </div>

          {/* Calendar Header */}
          <div className="grid grid-cols-7 gap-1 text-center text-sm font-medium text-muted-foreground">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {allDays.map((date, index) => {
              const streak = getStreakForDate(date);
              const dayIcon = getDayIcon(date, streak);
              
              return (
                <Tooltip key={index}>
                  <TooltipTrigger asChild>
                    <div
                      className={getDayClassName(date, streak)}
                      onClick={() => handleDayClick(date)}
                    >
                      <div className="flex flex-col items-center">
                        <div className="text-xs">{format(date, 'd')}</div>
                        {dayIcon && (
                          <div className="text-xs leading-none mt-1">
                            {dayIcon}
                          </div>
                        )}
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-center">
                      <div className="font-medium">
                        {format(date, 'MMMM d, yyyy')}
                      </div>
                      {streak ? (
                        <div className="text-sm">
                          {streak.completed ? (
                            <>
                              <div className="text-green-600">✅ Completed</div>
                              <div>Tasks: {streak.tasks_completed}</div>
                              <div>Points: {streak.points_earned}</div>
                            </>
                          ) : (
                            <div className="text-red-600">❌ Missed</div>
                          )}
                        </div>
                      ) : isToday(date) ? (
                        <div className="text-sm text-orange-600">🎯 Today</div>
                      ) : date > new Date() ? (
                        <div className="text-sm text-muted-foreground">Future</div>
                      ) : (
                        <div className="text-sm text-red-600">❌ Missed</div>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>

          {/* Month Summary */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {format(currentMonth, 'MMMM yyyy')}
            </div>
            <div className="flex space-x-4 text-sm">
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Completed: {dailyStreaks.filter(s => s.completed && isSameMonth(new Date(s.date), currentMonth)).length}
              </Badge>
              <Badge variant="outline" className="bg-red-100 text-red-800">
                Missed: {calendarDays.filter(date => 
                  date < new Date() && 
                  !dailyStreaks.some(s => s.completed && format(new Date(s.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'))
                ).length}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}; 