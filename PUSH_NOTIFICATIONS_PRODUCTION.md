# Push Notifications - Production Deployment Guide

## Overview
This guide covers the production deployment of StudySpark's push notification system, which has been cleaned up and optimized for production use.

## Environment Variables Required

### VAPID Keys (Required for Push Notifications)
```bash
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_SUBJECT=mailto:your-email@domain.com
```

**To generate VAPID keys:**
```bash
npx web-push generate-vapid-keys
```

### Database Configuration
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### Optional Configuration
```bash
CRON_SECRET=your_cron_secret_for_scheduled_notifications
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## Database Setup

The following tables are required and have been optimized with indexes:

### Tables
- `push_subscriptions` - Stores user push subscription data
- `push_notification_logs` - Logs all sent notifications
- `scheduled_notifications` - Manages scheduled notifications
- `notification_preferences` - User notification preferences

### Indexes (Already Applied)
- `idx_push_subscriptions_user_id`
- `idx_push_subscriptions_active`
- `idx_push_notification_logs_user_id`
- `idx_push_notification_logs_sent_at`
- `idx_scheduled_notifications_user_id`
- `idx_scheduled_notifications_scheduled_for`
- `idx_scheduled_notifications_status`

## Production Features

### Core Functionality
- ✅ Push subscription management
- ✅ Rich notification support with actions
- ✅ Scheduled notifications
- ✅ Notification analytics and logging
- ✅ User preference management
- ✅ Service worker for background processing
- ✅ Automatic subscription renewal

### Removed Development Features
- ❌ Test notification buttons
- ❌ Demo achievement notifications
- ❌ Verbose debug logging
- ❌ Development-only API endpoints
- ❌ Mock data generators

## API Endpoints

### Production Endpoints
- `POST /api/push/send` - Send push notifications
- `POST /api/push/subscribe` - Subscribe to push notifications (requires authentication)
- `DELETE /api/push/unsubscribe/[id]` - Unsubscribe from notifications (requires authentication)
- `POST /api/push/resubscribe` - Handle subscription renewal
- `GET /api/push/health` - Health check and configuration status
- `POST /api/push/cron` - Process scheduled notifications (for cron jobs)

### Removed Endpoints
- ~~`POST /api/push/test`~~ - Test endpoint removed
- ~~`GET /api/push/subscribe`~~ - Admin debug endpoint removed

## Service Worker

The service worker (`/public/sw-notifications.js`) has been optimized for production:

### Features
- Background notification handling
- Notification click/close tracking
- IndexedDB persistence for scheduled notifications
- Automatic notification restoration on startup
- Push subscription change handling

### Optimizations
- Reduced logging verbosity
- Streamlined error handling
- Improved performance
- Smaller bundle size

## Security Considerations

### VAPID Keys
- Store VAPID private key securely (environment variable only)
- Never expose private key in client-side code
- Use proper VAPID subject (mailto: format)

### Database Security
- Use Supabase RLS (Row Level Security) policies
- Validate user permissions for all operations
- Sanitize all inputs

### Client-Side Security
- Validate notification permissions
- Handle subscription failures gracefully
- Implement proper error boundaries

## Performance Optimizations

### Database
- Proper indexing for fast queries
- Efficient subscription lookups
- Optimized analytics queries

### Client-Side
- Lazy loading of notification components
- Efficient subscription management
- Minimal service worker footprint

### Server-Side
- Batch notification sending
- Efficient error handling
- Proper caching strategies

## Monitoring and Analytics

### Built-in Analytics
- Notification delivery rates
- User engagement metrics
- Error tracking and logging
- Performance monitoring

### Recommended Monitoring
- Set up alerts for failed notifications
- Monitor subscription renewal rates
- Track user engagement with notifications
- Monitor service worker performance

## Deployment Checklist

### Pre-deployment
- [ ] Generate and configure VAPID keys
- [ ] Set up Supabase database with required tables
- [ ] Configure environment variables
- [ ] Test notification functionality in staging

### Post-deployment
- [ ] Verify service worker registration
- [ ] Test push notification delivery
- [ ] Monitor error logs
- [ ] Validate analytics data collection
- [ ] Test health check endpoint (`/api/push/health`)
- [ ] Verify authentication on protected endpoints
- [ ] Set up cron job for scheduled notifications (`/api/push/cron`)
- [ ] Test notification permission flow

### Ongoing Maintenance
- [ ] Monitor subscription renewal rates
- [ ] Clean up expired subscriptions
- [ ] Review notification analytics
- [ ] Update service worker as needed

## Troubleshooting

### Common Issues
1. **Notifications not delivering**: Check VAPID keys and subscription validity
2. **Service worker not registering**: Verify HTTPS and proper file paths
3. **Database errors**: Check Supabase configuration and RLS policies
4. **Permission denied**: Ensure proper user authentication

### Debug Steps
1. Check browser console for errors
2. Verify service worker registration
3. Test subscription creation/deletion
4. Monitor network requests
5. Check Supabase logs

## Browser Support

### Supported Browsers
- Chrome 50+
- Firefox 44+
- Safari 16+
- Edge 17+

### Mobile Support
- iOS Safari 16.4+
- Chrome Mobile 50+
- Samsung Internet 5.0+

## Performance Metrics

### Target Metrics
- Notification delivery: >95%
- Service worker load time: <100ms
- Subscription creation: <500ms
- Database query time: <50ms

## Compliance

### Privacy
- Obtain user consent before subscribing
- Provide clear unsubscribe options
- Respect user notification preferences
- Implement proper data retention policies

### Accessibility
- Ensure notifications are accessible
- Provide alternative notification methods
- Support screen readers
- Follow WCAG guidelines

This production-ready push notification system provides a robust, scalable solution for StudySpark's notification needs while maintaining security, performance, and user experience standards. 