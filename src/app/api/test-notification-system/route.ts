import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { oneSignalService } from '@/lib/notifications/OneSignalService';
import { taskReminderService } from '@/lib/notifications/TaskReminderService';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🧪 [TEST] Starting comprehensive notification system test for user:', userId);

    const results: any = {
      userId,
      timestamp: new Date().toISOString(),
      tests: {}
    };

    // Test 1: Check OneSignal subscription status
    try {
      const subscriptionStatus = await oneSignalService.getSubscriptionStatus();
      results.tests.subscriptionStatus = {
        success: true,
        data: subscriptionStatus
      };
      console.log('✅ [TEST] Subscription status check passed:', subscriptionStatus);
    } catch (error) {
      results.tests.subscriptionStatus = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      console.error('❌ [TEST] Subscription status check failed:', error);
    }

    // Test 2: Check if user has active subscription
    try {
      const hasSubscription = await oneSignalService.hasActiveSubscription(userId);
      results.tests.hasActiveSubscription = {
        success: true,
        data: { hasSubscription }
      };
      console.log('✅ [TEST] Active subscription check passed:', hasSubscription);
    } catch (error) {
      results.tests.hasActiveSubscription = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      console.error('❌ [TEST] Active subscription check failed:', error);
    }

    // Test 3: Send immediate test notification via OneSignal
    try {
      const testNotification = await oneSignalService.sendNotification({
        contents: { en: '🧪 Immediate test notification from StudySpark!' },
        headings: { en: '✅ System Test - Immediate' },
        include_external_user_ids: [userId],
        data: {
          type: 'system_test',
          testType: 'immediate',
          timestamp: new Date().toISOString()
        }
      });

      results.tests.immediateNotification = {
        success: !!testNotification,
        data: testNotification
      };
      console.log('✅ [TEST] Immediate notification test passed:', testNotification);
    } catch (error) {
      results.tests.immediateNotification = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      console.error('❌ [TEST] Immediate notification test failed:', error);
    }

    // Test 4: Schedule a test notification for 1 minute from now
    try {
      const scheduleTime = new Date(Date.now() + 60 * 1000); // 1 minute from now
      const scheduledNotification = await oneSignalService.scheduleNotification(
        userId,
        {
          contents: { en: '🧪 Scheduled test notification - delivered 1 minute after test!' },
          headings: { en: '⏰ System Test - Scheduled' },
          data: {
            type: 'system_test',
            testType: 'scheduled',
            scheduledFor: scheduleTime.toISOString()
          }
        },
        scheduleTime
      );

      results.tests.scheduledNotification = {
        success: scheduledNotification,
        data: { 
          scheduled: scheduledNotification,
          scheduledFor: scheduleTime.toISOString()
        }
      };
      console.log('✅ [TEST] Scheduled notification test passed for:', scheduleTime.toISOString());
    } catch (error) {
      results.tests.scheduledNotification = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      console.error('❌ [TEST] Scheduled notification test failed:', error);
    }

    // Test 5: Test TaskReminderService with a mock task
    try {
      const mockTask = {
        id: 'test-task-' + Date.now(),
        title: 'Test Task for Notification System',
        due_date: new Date(Date.now() + 2 * 60 * 1000).toISOString(), // 2 minutes from now
        user_id: userId,
        reminder_offset_minutes: 1, // 1 minute before due date
        is_completed: false
      };

      const reminderScheduled = await taskReminderService.scheduleTaskReminder(mockTask);
      
      results.tests.taskReminderService = {
        success: reminderScheduled,
        data: {
          taskId: mockTask.id,
          dueDate: mockTask.due_date,
          reminderTime: new Date(new Date(mockTask.due_date).getTime() - mockTask.reminder_offset_minutes * 60 * 1000).toISOString()
        }
      };
      console.log('✅ [TEST] TaskReminderService test passed for task:', mockTask.title);
    } catch (error) {
      results.tests.taskReminderService = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      console.error('❌ [TEST] TaskReminderService test failed:', error);
    }

    // Calculate overall success rate
    const totalTests = Object.keys(results.tests).length;
    const successfulTests = Object.values(results.tests).filter((test: any) => test.success).length;
    const successRate = (successfulTests / totalTests) * 100;

    results.summary = {
      totalTests,
      successfulTests,
      failedTests: totalTests - successfulTests,
      successRate: `${successRate.toFixed(1)}%`,
      status: successRate === 100 ? 'ALL_PASS' : successRate >= 80 ? 'MOSTLY_PASS' : 'NEEDS_ATTENTION'
    };

    console.log(`🎯 [TEST] Notification system test completed: ${successfulTests}/${totalTests} tests passed (${successRate.toFixed(1)}%)`);

    return NextResponse.json(results);

  } catch (error) {
    console.error('❌ [TEST] Notification system test failed:', error);
    return NextResponse.json({ 
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 