'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/hooks/useNotifications';
import { serviceWorkerManager } from '@/lib/notifications/serviceWorkerManager';
import { FaBell, FaTrash, FaCog, FaCheck, FaTimes } from 'react-icons/fa';
import { toast } from 'sonner';

export const NotificationTestPanel: React.FC = () => {
  const {
    permissionState,
    requestPermission,
    settings,
    stats,
    scheduleTaskDueNotification,
    scheduleStudyReminder,
    sendAchievementNotification,
    getQueuedNotifications,
    isSupported,
    isEnabled,
    canSendNotifications
  } = useNotifications();

  const [queuedNotifications, setQueuedNotifications] = useState<any[]>([]);
  const [testTitle, setTestTitle] = useState('Test Notification');
  const [testBody, setTestBody] = useState('This is a test notification from StudySpark!');
  const [testDelay, setTestDelay] = useState(5); // seconds

  // Load queued notifications
  const loadQueuedNotifications = async () => {
    try {
      const notifications = await getQueuedNotifications();
      setQueuedNotifications(notifications);
    } catch (error) {
      console.error('Failed to load queued notifications:', error);
    }
  };

  useEffect(() => {
    loadQueuedNotifications();
    const interval = setInterval(loadQueuedNotifications, 2000); // Refresh every 2 seconds
    return () => clearInterval(interval);
  }, []);

  const handleTestNotification = async () => {
    if (!canSendNotifications) {
      if (permissionState.permission !== 'granted') {
        await requestPermission();
      } else {
        toast.error('Notifications are not available');
      }
      return;
    }

    const scheduledTime = new Date(Date.now() + testDelay * 1000).toISOString();
    
    const success = await scheduleStudyReminder(
      testTitle,
      testBody,
      scheduledTime
    );

    if (success) {
      toast.success(`Test notification scheduled for ${testDelay} seconds from now`);
      loadQueuedNotifications();
    } else {
      toast.error('Failed to schedule notification');
    }
  };

  const handleTaskDueTest = async () => {
    if (!canSendNotifications) {
      toast.error('Notifications are not available');
      return;
    }

    const dueDate = new Date(Date.now() + 10 * 1000).toISOString(); // 10 seconds from now
    
    const success = await scheduleTaskDueNotification(
      'test-task-123',
      'Complete Math Homework',
      dueDate,
      5 // 5 seconds before due date
    );

    if (success) {
      toast.success('Task due notification scheduled for 5 seconds from now');
      loadQueuedNotifications();
    } else {
      toast.error('Failed to schedule task notification');
    }
  };

  const handleAchievementTest = async () => {
    if (!canSendNotifications) {
      toast.error('Notifications are not available');
      return;
    }

    const success = await sendAchievementNotification(
      'Test Achievement',
      'You successfully tested the notification system!'
    );

    if (success) {
      toast.success('Achievement notification sent immediately');
    } else {
      toast.error('Failed to send achievement notification');
    }
  };

  const getStatusBadge = () => {
    if (!isSupported) {
      return <Badge variant="destructive">Not Supported</Badge>;
    }
    if (permissionState.permission === 'granted' && isEnabled) {
      return <Badge variant="default">Active</Badge>;
    }
    if (permissionState.permission === 'denied') {
      return <Badge variant="destructive">Blocked</Badge>;
    }
    return <Badge variant="secondary">Needs Permission</Badge>;
  };

  const getServiceWorkerStatus = () => {
    if (serviceWorkerManager.isAvailable()) {
      return <Badge variant="default">Service Worker Active</Badge>;
    }
    return <Badge variant="secondary">Main Thread Only</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FaBell className="h-5 w-5" />
            Notification System Test Panel
          </CardTitle>
          <CardDescription>
            Test the enhanced notification system with service worker support
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Status</Label>
              <div>{getStatusBadge()}</div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Service Worker</Label>
              <div>{getServiceWorkerStatus()}</div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Permission</Label>
              <div>
                <Badge variant={permissionState.permission === 'granted' ? 'default' : 'secondary'}>
                  {permissionState.permission}
                </Badge>
              </div>
            </div>
          </div>

          {/* Test Controls */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Test Notifications</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label htmlFor="test-title">Title</Label>
                <Input
                  id="test-title"
                  value={testTitle}
                  onChange={(e) => setTestTitle(e.target.value)}
                  placeholder="Notification title"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="test-delay">Delay (seconds)</Label>
                <Input
                  id="test-delay"
                  type="number"
                  value={testDelay}
                  onChange={(e) => setTestDelay(parseInt(e.target.value) || 5)}
                  min={1}
                  max={300}
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="test-body">Message</Label>
              <Input
                id="test-body"
                value={testBody}
                onChange={(e) => setTestBody(e.target.value)}
                placeholder="Notification message"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleTestNotification} className="flex items-center gap-2">
                <FaBell className="h-4 w-4" />
                Test Study Reminder
              </Button>
              <Button onClick={handleTaskDueTest} variant="outline" className="flex items-center gap-2">
                <FaCog className="h-4 w-4" />
                Test Task Due
              </Button>
              <Button onClick={handleAchievementTest} variant="outline" className="flex items-center gap-2">
                <FaCheck className="h-4 w-4" />
                Test Achievement
              </Button>
            </div>
          </div>

          {/* Permission Request */}
          {permissionState.permission !== 'granted' && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-yellow-800">Permission Required</h4>
                  <p className="text-sm text-yellow-600 mt-1">
                    Click to enable browser notifications for testing
                  </p>
                </div>
                <Button onClick={requestPermission} size="sm">
                  Enable Notifications
                </Button>
              </div>
            </div>
          )}

          {/* Stats Section */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{stats.totalScheduled}</div>
              <div className="text-sm text-muted-foreground">Scheduled</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.totalSent}</div>
              <div className="text-sm text-muted-foreground">Sent</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.totalClicked}</div>
              <div className="text-sm text-muted-foreground">Clicked</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{stats.totalDismissed}</div>
              <div className="text-sm text-muted-foreground">Dismissed</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Queued Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Queued Notifications</CardTitle>
          <CardDescription>
            Notifications scheduled for future delivery (refreshes every 2s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {queuedNotifications.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No notifications currently queued
            </p>
          ) : (
            <div className="space-y-2">
              {queuedNotifications.map((notification, index) => (
                <div 
                  key={notification.id || index} 
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-md"
                >
                  <div className="flex-grow">
                    <div className="font-medium">{notification.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {notification.body}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Scheduled: {new Date(notification.scheduledTime).toLocaleString()}
                    </div>
                  </div>
                  <Badge variant="outline">{notification.type}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Test Service Worker Enhancement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <h4 className="font-medium">Test Background Notifications:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Schedule a test notification with a 30+ second delay</li>
              <li>Close this browser tab (but keep the browser open)</li>
              <li>Wait for the notification to appear</li>
              <li>Click the notification to reopen StudySpark</li>
              <li>The notification should work even though the tab was closed!</li>
            </ol>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">Service Worker Features:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Notifications persist across tab closures</li>
              <li>IndexedDB storage for reliability</li>
              <li>Automatic restoration on browser restart</li>
              <li>Click handling that reopens StudySpark</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 