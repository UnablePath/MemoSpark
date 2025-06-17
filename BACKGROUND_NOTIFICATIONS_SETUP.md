# 🔔 Background Notifications Setup Guide

## Overview
This guide will help you set up **background push notifications** that work even when StudySpark is closed, ensuring students never miss important deadlines.

## 🎯 What You'll Get

### ✅ **Background Notifications**
- **Task Reminders**: 30 minutes, 1 hour, 1 day before due dates
- **Overdue Alerts**: Immediate notifications for overdue tasks
- **Daily Digest**: Morning summary of today's tasks
- **Achievement Notifications**: Celebrate milestones
- **Study Break Reminders**: Encourage healthy study habits

### ✅ **Smart Features**
- **Quiet Hours**: No notifications during sleep (10 PM - 8 AM)
- **Weekend Handling**: Optional weekend notification blocking
- **Multiple Reminders**: Escalating reminder system
- **Action Buttons**: Mark complete, snooze, reschedule directly from notification
- **Analytics**: Track delivery rates and engagement

## 🚀 Setup Steps

### Step 1: Configure OneSignal Environment Variables

Add these to your `.env.local` file:

```bash
# OneSignal Configuration (Required for background notifications)
NEXT_PUBLIC_ONESIGNAL_APP_ID=6a7213f9-e215-4e65-80d4-638cd899a66f
ONESIGNAL_REST_API_KEY=os_v2_app_njzbh6pccvhglagumognrgngn4r6p72qvc6us65gjxcrdg4wbcrkkootcivnf2nzzcdicqhg4hogqal5po6d4gls6stodxqrtx4rnsy

# App URL (for notification click handling)
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

### Step 2: Test the Production System

1. **Navigate to**: `http://localhost:3001/onesignal-test`
2. **Subscribe**: Click "Subscribe to Notifications"
3. **Test Background**: Close the browser/app completely
4. **Send Test**: Use another device or browser to trigger a test notification
5. **Verify**: You should receive notifications even with the app closed

### Step 3: Integrate with Task Creation

When creating tasks in your app, automatically schedule reminders:

```typescript
// Example: In your task creation component
import { taskReminderService } from '@/lib/notifications/TaskReminderService';

const createTask = async (taskData) => {
  // Create task in database
  const task = await createTaskInDB(taskData);
  
  // Automatically schedule reminders
  await taskReminderService.scheduleMultipleReminders(task, [
    1440, // 1 day before
    60,   // 1 hour before  
    15    // 15 minutes before
  ]);
};
```

### Step 4: Set Up Daily Digest (Optional)

Create a cron job or scheduled function to send daily task summaries:

```typescript
// Example: Daily digest at 9 AM
import { taskReminderService } from '@/lib/notifications/TaskReminderService';

const sendDailyDigests = async () => {
  const users = await getUsersWithTasksDueToday();
  
  for (const user of users) {
    const tasks = await getTasksDueToday(user.id);
    await taskReminderService.sendDailyDigest(user.id, tasks);
  }
};
```

## 🔧 Advanced Configuration

### Notification Channels

OneSignal automatically creates these notification channels:

- **task_reminders**: High priority (8/10)
- **task_overdue**: Critical priority (10/10)  
- **achievements**: Medium priority (6/10)
- **study_breaks**: Low priority (4/10)
- **daily_digest**: Medium priority (6/10)

### User Preferences

Allow users to customize their notification settings:

```typescript
const reminderSettings = {
  enabled: true,
  defaultOffsetMinutes: 30,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00', 
  weekendsEnabled: false
};
```

### Notification Actions

Each notification includes action buttons:

- **Task Reminders**: "Mark Complete", "Snooze 15min"
- **Overdue Tasks**: "Mark Complete", "Reschedule"
- **Daily Digest**: "View Tasks"

## 🧪 Testing Checklist

### ✅ **Basic Functionality**
- [ ] Notifications appear when app is open
- [ ] Notifications appear when app is closed
- [ ] Notifications appear when browser is closed
- [ ] Click actions work correctly
- [ ] Notification sounds/vibration work

### ✅ **Task Integration**
- [ ] Reminders scheduled when tasks created
- [ ] Multiple reminders work (1 day, 1 hour, 15 min)
- [ ] Overdue notifications sent correctly
- [ ] Reminders cancelled when tasks completed

### ✅ **Smart Features**
- [ ] Quiet hours respected
- [ ] Weekend blocking works (if enabled)
- [ ] User preferences applied
- [ ] Analytics tracking works

## 🚨 Troubleshooting

### Common Issues

1. **Notifications not appearing when app closed**
   - Check OneSignal service worker is registered
   - Verify browser supports background notifications
   - Ensure notification permission granted

2. **Service worker conflicts**
   - OneSignal uses separate service worker scope
   - Should not conflict with PWA service worker

3. **Notifications not scheduling**
   - Check OneSignal API key is correct
   - Verify user is subscribed
   - Check reminder time is in future

### Debug Tools

1. **OneSignal Test Page**: `/onesignal-test`
2. **Browser DevTools**: Check service worker registration
3. **OneSignal Dashboard**: View delivery analytics
4. **Console Logs**: Check for initialization errors

## 📊 Analytics & Monitoring

### Available Metrics
- **Delivery Rate**: % of notifications successfully delivered
- **Click Rate**: % of notifications clicked
- **Conversion Rate**: % leading to task completion
- **Opt-out Rate**: % of users unsubscribing

### Monitoring Dashboard
Access analytics at: `https://dashboard.onesignal.com`

## 🔄 Migration from Basic to Production

If you were using the basic notification system:

1. **Update Hook Import**:
   ```typescript
   // Change from:
   import { useOneSignalBasic } from '@/hooks/useOneSignalBasic';
   
   // To:
   import { useOneSignalProduction } from '@/hooks/useOneSignalProduction';
   ```

2. **Test Thoroughly**: Background notifications work differently than browser notifications

3. **Update User Preferences**: Migrate any existing notification settings

## 🎉 Success Criteria

Your background notification system is ready when:

- ✅ Students receive task reminders even when app is closed
- ✅ Overdue notifications appear immediately
- ✅ Daily digest helps students plan their day
- ✅ Notification actions work seamlessly
- ✅ Analytics show high delivery and engagement rates

## 🆘 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review OneSignal documentation
3. Test with the `/onesignal-test` page
4. Check browser console for errors

---

**🎯 Goal**: Ensure no student misses a deadline due to lack of notifications! 