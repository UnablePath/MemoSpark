# Push Notification System Testing Guide

## 🚀 Prerequisites

### 1. Environment Variables Required
Make sure these are set in your `.env.local`:
```bash
# Supabase (should already be configured)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# VAPID Keys for Web Push (generate if not set)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_EMAIL=your_email@domain.com
```

### 2. Generate VAPID Keys (if needed)
Run this command to generate VAPID keys:
```bash
npx web-push generate-vapid-keys
```

Then add them to your `.env.local` file.

## 🧪 Testing Steps

### Step 1: Basic PWA Test
1. **Start the development server**:
   ```bash
   pnpm dev
   ```

2. **Navigate to PWA test page**:
   ```
   http://localhost:3001/pwa-test
   ```

3. **Test notification subscription**:
   - Click "Request Permission" 
   - Allow notifications when prompted
   - Verify subscription appears in console

### Step 2: Test Notification Categories
1. **Test each notification type** using the 4 buttons:
   - 📋 **Task Reminder** (task_reminders category)
   - 🏆 **Achievement** (achievements category) 
   - ☕ **Study Break** (study_breaks category)
   - 🔥 **Streak** (streaks category)

2. **Verify notifications**:
   - Check they appear on your device
   - Click notifications to test URL navigation
   - Check browser console for analytics events

### Step 3: Test Notification Settings
1. **Navigate to settings**:
   ```
   http://localhost:3001/settings
   ```

2. **Test notification preferences**:
   - Toggle different categories on/off
   - Adjust frequency limits
   - Set quiet hours
   - Change timezone

### Step 4: Test Database Integration

#### Check Subscription Storage
```sql
-- Run in Supabase SQL Editor
SELECT * FROM push_subscriptions WHERE user_id = 'your_clerk_user_id';
```

#### Check Notification Categories
```sql
SELECT * FROM notification_categories ORDER BY name;
```

#### Check Notification Queue
```sql
SELECT * FROM notification_queue WHERE user_id = 'your_clerk_user_id';
```

#### Check Analytics
```sql
SELECT * FROM notification_analytics WHERE user_id = 'your_clerk_user_id';
```

### Step 5: Test API Endpoints

#### Test Send Notification API
```bash
curl -X POST http://localhost:3001/api/push/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_clerk_token" \
  -d '{
    "title": "Test Notification",
    "body": "This is a test message",
    "categoryName": "system",
    "priority": 2
  }'
```

#### Test Cron Processing (Manual)
```bash
curl -X POST http://localhost:3001/api/push/cron \
  -H "Authorization: Bearer your_cron_secret"
```

#### Test Analytics
```bash
curl -X POST http://localhost:3001/api/push/analytics \
  -H "Content-Type: application/json" \
  -d '{
    "notificationId": "some-uuid",
    "eventType": "clicked",
    "userAgent": "test-agent"
  }'
```

### Step 6: Test Smart Timing

#### Test Quiet Hours
1. Set quiet hours to current time
2. Send a notification
3. Verify it gets queued instead of sent immediately

#### Test Frequency Limits
1. Set frequency limit to 1 per hour for a category
2. Send 3 notifications in the same category
3. Verify only 1 is sent, others queued

### Step 7: Test Offline Functionality
1. **Go offline** (disconnect internet/disable network)
2. **Try to send notifications** - should queue locally
3. **Go back online** - should sync and send queued notifications

## 🐛 Common Issues & Solutions

### Issue: No VAPID Keys
**Error**: `ApplicationServerKey is not valid`
**Solution**: Generate and set VAPID keys in environment variables

### Issue: Permission Denied
**Error**: Push permission denied
**Solution**: 
- Clear browser data for localhost
- Reset notification permissions
- Try in incognito mode

### Issue: Service Worker Not Updating
**Solution**:
```bash
# Clear browser cache or run:
# In browser console:
navigator.serviceWorker.getRegistrations().then(function(registrations) {
  for(let registration of registrations) {
    registration.unregister();
  }
});
```

### Issue: Database Connection Errors
**Solution**: Verify Supabase environment variables and RLS policies

## 📊 Expected Results

### ✅ Success Indicators
- [ ] Notifications appear on device
- [ ] Click handling works correctly
- [ ] Database records are created
- [ ] Analytics events are tracked
- [ ] Smart timing works (quiet hours, frequency limits)
- [ ] Categories can be toggled on/off
- [ ] Service worker handles notifications offline

### 📈 Analytics to Monitor
- Subscription rates
- Notification delivery rates
- Click-through rates
- Category preferences
- Timing effectiveness

## 🔧 Advanced Testing

### Test with Multiple Devices
1. Subscribe from different browsers/devices
2. Send notifications to see multi-device delivery

### Test Scheduled Notifications
```javascript
// Schedule notification for 1 minute from now
fetch('/api/push/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Scheduled Test',
    body: 'This was scheduled',
    scheduledFor: new Date(Date.now() + 60000).toISOString()
  })
});
```

### Load Testing
Use the cron endpoint to process large notification queues:
```bash
# Add many notifications to queue, then process
curl -X POST http://localhost:3001/api/push/cron
```

## 🚀 Production Deployment

### 1. Vercel Cron Setup
The `vercel.json` file configures automatic cron execution:
- Runs every 5 minutes in production
- Processes pending notifications
- No manual setup required

### 2. Environment Variables
Set all environment variables in Vercel dashboard:
- Supabase credentials
- VAPID keys
- Clerk configuration

### 3. Domain Configuration
Update VAPID email and service worker scope for your production domain.

## 📱 Browser Support

### ✅ Supported Browsers
- Chrome 42+
- Firefox 44+
- Safari 16+ (macOS/iOS)
- Edge 17+

### ❌ Limitations
- iOS requires iOS 16.4+ for web push
- Some browsers may have different notification styles
- Push notifications require HTTPS in production

## 🎯 Next Steps

After testing is complete, you can:
1. Integrate with existing task system
2. Add more notification types
3. Implement rich notifications with actions
4. Add notification history/inbox
5. Set up production monitoring

## 🔍 Troubleshooting Commands

```bash
# Check service worker status
# In browser console:
navigator.serviceWorker.ready.then(reg => console.log('SW ready:', reg));

# Check notification permission
console.log('Permission:', Notification.permission);

# Check push subscription
navigator.serviceWorker.ready.then(reg => 
  reg.pushManager.getSubscription().then(sub => console.log('Subscription:', sub))
);

# Test database connection
# In Supabase SQL editor:
SELECT 'Database connected' as status;
``` 