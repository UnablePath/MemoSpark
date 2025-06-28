import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ReminderEngine } from '@/lib/reminders/ReminderEngine';
import { StreakTracker } from '@/lib/gamification/StreakTracker';

const reminderEngine = ReminderEngine.getInstance();

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      action, 
      timeOfDay = '20:00', // Default 8PM
      timezone,
      enabled = true 
    } = await request.json();

    console.log(`🔥 Daily streak reminder API called by user: ${userId}, action: ${action}`);

    if (action === 'enable' || action === 'schedule') {
      // Get user's current streak
      const streakTracker = new StreakTracker();
      const userStats = await streakTracker.getCurrentStreak(userId);
      const currentStreak = userStats?.current_streak || 0;

      console.log(`📊 User current streak: ${currentStreak} days`);

      // Schedule daily streak reminder
      const success = await reminderEngine.scheduleDailyStreakReminder(
        userId,
        currentStreak,
        timeOfDay,
        timezone
      );

      if (success) {
        console.log(`✅ Daily streak reminder enabled for user ${userId} at ${timeOfDay}`);
        return NextResponse.json({
          success: true,
          message: 'Daily streak reminders enabled successfully',
          currentStreak,
          reminderTime: timeOfDay,
          nextReminder: calculateNextReminderTime(timeOfDay)
        });
      } else {
        console.error(`❌ Failed to enable daily streak reminder for user ${userId}`);
        return NextResponse.json({
          error: 'Failed to enable daily streak reminders',
          details: 'Could not schedule notification'
        }, { status: 500 });
      }
    } 
    else if (action === 'disable' || action === 'cancel') {
      // Cancel daily streak reminders
      const success = await reminderEngine.cancelDailyStreakReminder(userId);

      if (success) {
        console.log(`✅ Daily streak reminders disabled for user ${userId}`);
        return NextResponse.json({
          success: true,
          message: 'Daily streak reminders disabled successfully'
        });
      } else {
        console.error(`❌ Failed to disable daily streak reminders for user ${userId}`);
        return NextResponse.json({
          error: 'Failed to disable daily streak reminders'
        }, { status: 500 });
      }
    }
    else if (action === 'update') {
      // Update existing reminder preferences
      const streakTracker = new StreakTracker();
      const userStats = await streakTracker.getCurrentStreak(userId);
      const currentStreak = userStats?.current_streak || 0;

      // Cancel existing reminders
      await reminderEngine.cancelDailyStreakReminder(userId);

      // Schedule new reminders with updated preferences
      const success = await reminderEngine.scheduleDailyStreakReminder(
        userId,
        currentStreak,
        timeOfDay,
        timezone
      );

      if (success) {
        console.log(`✅ Daily streak reminder preferences updated for user ${userId}`);
        return NextResponse.json({
          success: true,
          message: 'Daily streak reminder preferences updated successfully',
          currentStreak,
          reminderTime: timeOfDay,
          nextReminder: calculateNextReminderTime(timeOfDay)
        });
      } else {
        console.error(`❌ Failed to update daily streak reminder preferences for user ${userId}`);
        return NextResponse.json({
          error: 'Failed to update daily streak reminder preferences'
        }, { status: 500 });
      }
    }
    else {
      return NextResponse.json({
        error: 'Invalid action. Supported actions: enable, disable, update'
      }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Daily streak reminder API error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`📊 Getting streak reminder status for user: ${userId}`);

    // Get user's current streak for context
    const streakTracker = new StreakTracker();
    const userStats = await streakTracker.getCurrentStreak(userId);
    const currentStreak = userStats?.current_streak || 0;

    // Check if user has active streak reminders 
    // (Note: OneSignal doesn't provide easy API to check scheduled notifications,
    // so we'll return general info based on user preferences)
    
    return NextResponse.json({
      success: true,
      currentStreak,
      streakRemindersSupported: true,
      defaultReminderTime: '20:00',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      nextPossibleReminder: calculateNextReminderTime('20:00'),
      recommendations: {
        optimalTimes: ['19:00', '20:00', '21:00'],
        personalizedMessage: getPersonalizedReminderRecommendation(currentStreak)
      }
    });

  } catch (error) {
    console.error('❌ Error getting streak reminder status:', error);
    return NextResponse.json({
      error: 'Failed to get streak reminder status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Calculate the next reminder time based on time of day preference
 */
function calculateNextReminderTime(timeOfDay: string): string {
  const now = new Date();
  const reminderTime = new Date();
  const [hour, minute] = timeOfDay.split(':').map(Number);
  
  reminderTime.setHours(hour, minute, 0, 0);
  
  // If reminder time already passed today, schedule for tomorrow
  if (reminderTime <= now) {
    reminderTime.setDate(reminderTime.getDate() + 1);
  }
  
  return reminderTime.toISOString();
}

/**
 * Get personalized recommendation based on current streak
 */
function getPersonalizedReminderRecommendation(currentStreak: number): string {
  if (currentStreak === 0) {
    return "Start your first streak! Daily reminders will help you build the habit.";
  } else if (currentStreak < 7) {
    return `Great ${currentStreak}-day streak! Daily reminders will help you reach the 1-week milestone.`;
  } else if (currentStreak < 30) {
    return `Amazing ${currentStreak}-day streak! Keep the momentum going with daily check-ins.`;
  } else {
    return `Legendary ${currentStreak}-day streak! You're a true champion - daily reminders will help maintain this incredible achievement.`;
  }
} 