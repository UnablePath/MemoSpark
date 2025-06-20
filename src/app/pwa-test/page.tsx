'use client';

import React, { useState, useEffect } from 'react';
import { PushNotificationManager } from '@/components/pwa/PushNotificationManager';
import PWADebug from '@/components/pwa/PWADebug';
import { useOneSignal } from '@/components/providers/onesignal-provider';
import { OneSignalService } from '@/lib/notifications/OneSignalService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useUser } from '@clerk/nextjs';
import { CheckCircle, XCircle, Loader2, Bell, Send, AlertCircle, CheckCircle as CheckCircleIcon, XCircle as XCircleIcon, Plus, Clock, AlertTriangle, Calendar, Zap, Trophy, Coffee } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ConnectivityTest {
  name: string;
  url: string;
  status: 'pending' | 'success' | 'error';
  message?: string;
}

export default function PWATestPage() {
  const { user } = useUser();
  const { isInitialized, playerId, isSubscribed } = useOneSignal();
  const [tests, setTests] = useState<ConnectivityTest[]>([
    { name: 'OneSignal CDN', url: 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js', status: 'pending' },
    { name: 'Google CDN', url: 'https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js', status: 'pending' },
    { name: 'Cloudflare CDN', url: 'https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.21/lodash.min.js', status: 'pending' }
  ]);
  const [testing, setTesting] = useState(false);
  const [notificationTesting, setNotificationTesting] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);
  const [testTaskTitle, setTestTaskTitle] = useState('');
  const [reminderOffset, setReminderOffset] = useState('1');

  const runConnectivityTests = async () => {
    setTesting(true);
    
    for (let i = 0; i < tests.length; i++) {
      const test = tests[i];
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const response = await fetch(test.url, {
          method: 'HEAD', // Only get headers, not the full content
          signal: controller.signal,
          mode: 'no-cors' // Avoid CORS issues for testing
        });
        
        clearTimeout(timeoutId);
        
        setTests(prev => prev.map((t, idx) => 
          idx === i 
            ? { ...t, status: 'success', message: 'Reachable' }
            : t
        ));
        
      } catch (error) {
        let message = 'Network error';
        
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            message = 'Timeout (>5s)';
          } else if (error.message.includes('ERR_ADDRESS_UNREACHABLE')) {
            message = 'Address unreachable';
          } else if (error.message.includes('ERR_NETWORK')) {
            message = 'Network error';
          } else {
            message = error.message;
          }
        }
        
        setTests(prev => prev.map((t, idx) => 
          idx === i 
            ? { ...t, status: 'error', message }
            : t
        ));
      }
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setTesting(false);
  };

  const resetTests = () => {
    setTests(prev => prev.map(test => ({ ...test, status: 'pending', message: undefined })));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <div className="h-4 w-4 rounded-full bg-gray-300" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-500">Reachable</Badge>;
      case 'error':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const addTestResult = (message: string) => {
    setTestResults(prev => [`${new Date().toLocaleTimeString()}: ${message}`, ...prev.slice(0, 9)]);
  };

  const testBasicNotification = async () => {
    if (!isInitialized || !playerId) {
      addTestResult('❌ OneSignal not initialized or no player ID');
      return;
    }

    setNotificationTesting(true);
    addTestResult('🔔 Testing basic notification...');

    try {
      const response = await fetch('/api/test-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId,
          title: '🎯 Test Notification',
          message: 'This is a test notification from StudySpark!',
          type: 'test'
        })
      });

      if (response.ok) {
        addTestResult('✅ Basic notification sent successfully');
      } else {
        const error = await response.text();
        addTestResult(`❌ Failed to send notification: ${error}`);
      }
    } catch (error) {
      addTestResult(`❌ Error sending notification: ${error}`);
    } finally {
      setNotificationTesting(false);
    }
  };

  const testTaskReminder = async () => {
    if (!isInitialized || !playerId) {
      addTestResult('❌ OneSignal not initialized or no player ID');
      return;
    }

    setNotificationTesting(true);
    addTestResult('📚 Testing task reminder notification...');

    try {
      const oneSignalService = OneSignalService.getInstance();
      const success = await oneSignalService.sendTaskReminder(
        playerId,
        'Complete your Math homework',
        new Date()
      );

      if (success) {
        addTestResult('✅ Task reminder sent successfully');
      } else {
        addTestResult('❌ Failed to send task reminder');
      }
    } catch (error) {
      addTestResult(`❌ Error sending task reminder: ${error}`);
    } finally {
      setNotificationTesting(false);
    }
  };

  const testAchievementNotification = async () => {
    if (!isInitialized || !playerId) {
      addTestResult('❌ OneSignal not initialized or no player ID');
      return;
    }

    setNotificationTesting(true);
    addTestResult('🏆 Testing achievement notification...');

    try {
      const oneSignalService = OneSignalService.getInstance();
      const success = await oneSignalService.sendAchievementNotification(
        playerId,
        'First Task Completed'
      );

      if (success) {
        addTestResult('✅ Achievement notification sent successfully');
      } else {
        addTestResult('❌ Failed to send achievement notification');
      }
    } catch (error) {
      addTestResult(`❌ Error sending achievement notification: ${error}`);
    } finally {
      setNotificationTesting(false);
    }
  };

  const testBreakSuggestion = async () => {
    if (!isInitialized || !playerId) {
      addTestResult('❌ OneSignal not initialized or no player ID');
      return;
    }

    setNotificationTesting(true);
    addTestResult('🌿 Testing break suggestion notification...');

    try {
      const oneSignalService = OneSignalService.getInstance();
      const success = await oneSignalService.sendBreakSuggestion(
        playerId,
        "You've been studying for 2 hours. Time for a 15-minute break! 🧘‍♀️"
      );

      if (success) {
        addTestResult('✅ Break suggestion sent successfully');
      } else {
        addTestResult('❌ Failed to send break suggestion');
      }
    } catch (error) {
      addTestResult(`❌ Error sending break suggestion: ${error}`);
    } finally {
      setNotificationTesting(false);
    }
  };

  const clearTestResults = () => {
    setTestResults([]);
  };

  const createTestTaskWithReminder = async () => {
    if (!isInitialized || !playerId) {
      addTestResult('❌ OneSignal not initialized or no player ID');
      return;
    }

    try {
      addTestResult('🔨 Creating test task with reminder...');
      
      // Create a task due in 1 hour with 5-minute reminder
      const dueDate = new Date();
      dueDate.setHours(dueDate.getHours() + 1);
      
      const response = await fetch('/api/test-task-creation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: testTaskTitle || 'Test Task with Reminder',
          description: 'This is a test task created to verify reminder notifications',
          due_date: dueDate.toISOString(),
          priority: 'medium',
          type: 'academic',
          reminder_settings: {
            enabled: true,
            offset_minutes: 5, // 5 minutes before due date
            type: 'notification'
          }
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        addTestResult('✅ Test task created with reminder scheduled');
        addTestResult(`📋 Task: ${result.createdTask?.title}`);
        addTestResult(`⏰ Due: ${new Date(result.createdTask?.due_date).toLocaleString()}`);
        setTestTaskTitle(''); // Clear input
      } else {
        addTestResult(`❌ Failed to create task: ${result.error}`);
      }
    } catch (error) {
      addTestResult(`❌ Error creating test task: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const createTestTaskCustomReminder = async () => {
    if (!isInitialized || !playerId) {
      addTestResult('❌ OneSignal not initialized or no player ID');
      return;
    }

    try {
      addTestResult(`🔨 Creating task with ${reminderOffset}-minute reminder...`);
      
      // Create a task due in (reminderOffset + 5) minutes so we can test the reminder
      const dueDate = new Date();
      dueDate.setMinutes(dueDate.getMinutes() + parseInt(reminderOffset) + 5);
      
      const response = await fetch('/api/test-task-creation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `Custom Reminder Test (${reminderOffset}min)`,
          description: `Test task with ${reminderOffset}-minute reminder`,
          due_date: dueDate.toISOString(),
          priority: 'high',
          type: 'academic',
          reminder_settings: {
            enabled: true,
            offset_minutes: parseInt(reminderOffset),
            type: 'notification'
          }
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        addTestResult('✅ Custom reminder task created');
        addTestResult(`📋 Task: ${result.createdTask?.title}`);
        addTestResult(`⏰ Reminder in ${reminderOffset} minutes before due time`);
      } else {
        addTestResult(`❌ Failed to create custom task: ${result.error}`);
      }
    } catch (error) {
      addTestResult(`❌ Error creating custom test: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const testImmediateTaskReminder = async () => {
    if (!isInitialized || !playerId) {
      addTestResult('❌ OneSignal not initialized or no player ID');
      return;
    }

    try {
      addTestResult('⚡ Testing immediate task reminder...');
      
      const response = await fetch('/api/test-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerId,
          type: 'task',
          title: '📋 Task Reminder Test',
          message: 'This is an immediate test of task reminder notifications!'
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        addTestResult('✅ Immediate task reminder sent successfully');
      } else {
        addTestResult(`❌ Failed to send reminder: ${result.error}`);
      }
    } catch (error) {
      addTestResult(`❌ Error sending immediate reminder: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const testOverdueNotification = async () => {
    if (!isInitialized || !playerId) {
      addTestResult('❌ OneSignal not initialized or no player ID');
      return;
    }

    try {
      addTestResult('⚠️ Testing overdue task notification...');
      
      const response = await fetch('/api/test-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerId,
          type: 'overdue',
          title: '⚠️ Overdue Task Alert',
          message: 'Your task "Complete assignment" is now overdue!'
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        addTestResult('✅ Overdue notification sent successfully');
      } else {
        addTestResult(`❌ Failed to send overdue notification: ${result.error}`);
      }
    } catch (error) {
      addTestResult(`❌ Error sending overdue notification: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const testDailyDigest = async () => {
    if (!isInitialized || !playerId) {
      addTestResult('❌ OneSignal not initialized or no player ID');
      return;
    }

    try {
      addTestResult('📅 Testing daily digest notification...');
      
      const response = await fetch('/api/test-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerId,
          type: 'test',
          title: '📅 Daily Task Digest',
          message: 'You have 3 tasks due today:\n• Complete math homework\n• Review science notes\n• Submit project draft'
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        addTestResult('✅ Daily digest sent successfully');
      } else {
        addTestResult(`❌ Failed to send daily digest: ${result.error}`);
      }
    } catch (error) {
      addTestResult(`❌ Error sending daily digest: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">PWA & OneSignal Testing</h1>
        <p className="text-muted-foreground mt-2">Debug Progressive Web App and push notification functionality</p>
      </div>

      {/* Network Connectivity Tests */}
      <Card>
        <CardHeader>
          <CardTitle>🌐 Network Connectivity Tests</CardTitle>
          <CardDescription>
            Test connectivity to key CDNs and services
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={runConnectivityTests} 
              disabled={testing}
              size="sm"
            >
              {testing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                'Run Tests'
              )}
            </Button>
            <Button 
              onClick={resetTests} 
              variant="outline"
              size="sm"
            >
              Reset
            </Button>
          </div>

          <div className="space-y-2">
            {tests.map((test, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(test.status)}
                  <div>
                    <div className="font-medium">{test.name}</div>
                    <div className="text-xs text-muted-foreground">{test.url}</div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {getStatusBadge(test.status)}
                  {test.message && (
                    <div className="text-xs text-muted-foreground">{test.message}</div>
                  )}
                </div>
              </div>
            ))}
            </div>

          {tests.some(t => t.status === 'error') && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="font-semibold text-amber-800 mb-2">🚨 Network Issues Detected</h4>
              <div className="text-sm text-amber-700 space-y-1">
                <p>If OneSignal CDN is unreachable, try:</p>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li>Disable VPN or proxy temporarily</li>
                  <li>Try a different network (mobile hotspot)</li>
                  <li>Check if your firewall is blocking CDNs</li>
                  <li>Contact your network administrator</li>
                </ul>
                <p className="font-medium mt-2">The app will continue to work without push notifications.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* OneSignal Push Notification Testing */}
      <Card>
        <CardHeader>
          <CardTitle>🔔 Push Notification Testing</CardTitle>
          <CardDescription>
            Test OneSignal push notification functionality
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* OneSignal Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="text-sm font-medium">Initialized:</span>
              {isInitialized ? (
                <Badge variant="default" className="bg-green-500">Yes</Badge>
              ) : (
                <Badge variant="destructive">No</Badge>
              )}
              </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Subscribed:</span>
              {isSubscribed ? (
                <Badge variant="default" className="bg-green-500">Yes</Badge>
              ) : (
                <Badge variant="secondary">No</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              <span className="text-sm font-medium">Player ID:</span>
              {playerId ? (
                <Badge variant="default" className="bg-blue-500 text-xs">
                  {playerId.substring(0, 8)}...
                </Badge>
              ) : (
                <Badge variant="secondary">None</Badge>
              )}
            </div>
          </div>

          {/* User Info */}
          {user && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-sm">
                <span className="font-medium">Logged in as:</span> {user.fullName || user.emailAddresses[0]?.emailAddress}
              </div>
                  </div>
                )}

          {/* Test Buttons */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              onClick={testBasicNotification}
              disabled={notificationTesting || !isInitialized || !playerId}
              size="sm"
              variant="outline"
            >
              {notificationTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
              <span className="ml-1">Basic Test</span>
            </Button>

            <Button
              onClick={testTaskReminder}
              disabled={notificationTesting || !isInitialized || !playerId}
              size="sm"
              variant="outline"
            >
              <span className="mr-1">📚</span>
              Task Reminder
            </Button>

            <Button
              onClick={testAchievementNotification}
              disabled={notificationTesting || !isInitialized || !playerId}
              size="sm"
              variant="outline"
            >
              <span className="mr-1">🏆</span>
              Achievement
            </Button>

            <Button
              onClick={testBreakSuggestion}
              disabled={notificationTesting || !isInitialized || !playerId}
              size="sm"
              variant="outline"
            >
              <span className="mr-1">🌿</span>
              Break Time
            </Button>
                  </div>

          {/* Prerequisites Warning */}
          {(!isInitialized || !playerId) && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="font-semibold text-amber-800 mb-2">⚠️ Prerequisites</h4>
              <div className="text-sm text-amber-700 space-y-1">
                {!isInitialized && <p>• OneSignal SDK is not initialized</p>}
                {!playerId && <p>• No player ID available (user not subscribed to push notifications)</p>}
                <p className="font-medium mt-2">
                  Make sure you've allowed notifications and OneSignal is properly configured.
                </p>
              </div>
            </div>
          )}

          {/* Test Results */}
          {testResults.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Test Results</h4>
                <Button onClick={clearTestResults} variant="ghost" size="sm">
                  Clear
                </Button>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto">
                {testResults.map((result, index) => (
                  <div key={index} className="text-sm font-mono py-1 border-b border-gray-200 last:border-b-0">
                    {result}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-2">📋 How to Test</h4>
            <div className="text-sm text-blue-700 space-y-1">
              <p>1. Make sure you've allowed notifications in your browser</p>
              <p>2. Check that OneSignal is initialized (green badge above)</p>
              <p>3. Click any test button to send a notification</p>
              <p>4. You should receive the notification within a few seconds</p>
              <p>5. Check the test results for success/error messages</p>
            </div>
          </div>
        </CardContent>
      </Card>

          {/* PWA Debug Component */}
          <PWADebug />
    </div>
  );
} 