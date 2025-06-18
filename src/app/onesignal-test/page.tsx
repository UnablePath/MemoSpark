'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOneSignal } from '@/components/providers/onesignal-provider';
import { useAuth } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { Bell, BellOff, Check, X, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function OneSignalTestPage() {
  const { userId } = useAuth();
  const {
    isInitialized,
    isSubscribed,
    playerId,
    error,
    subscribe,
    unsubscribe,
  } = useOneSignal();
  
  const [isPushSupported, setIsPushSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});
  const [analytics, setAnalytics] = useState<any[]>([]);

  // Check push support properly
  useEffect(() => {
    const checkPushSupport = () => {
      if (typeof window !== 'undefined') {
        const isSupported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
        setIsPushSupported(isSupported);
      }
    };
    
    checkPushSupport();
  }, []);

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      const success = await subscribe();
      if (success) {
        setTestResults(prev => ({ ...prev, subscribe: true }));
      } else {
        setTestResults(prev => ({ ...prev, subscribe: false }));
      }
    } catch (error) {
      console.error('Subscription failed:', error);
      setTestResults(prev => ({ ...prev, subscribe: false }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setIsLoading(true);
    try {
      const success = await unsubscribe();
      if (success) {
        setTestResults(prev => ({ ...prev, unsubscribe: true }));
      } else {
        setTestResults(prev => ({ ...prev, unsubscribe: false }));
      }
    } catch (error) {
      console.error('Unsubscription failed:', error);
      setTestResults(prev => ({ ...prev, unsubscribe: false }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestNotification = async (type: 'task' | 'achievement' | 'break' | 'streak') => {
    setIsLoading(true);
    try {
      if (!playerId) {
        setTestResults(prev => ({ ...prev, [type]: false }));
        return;
      }
      
      const response = await fetch('/api/test-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerId,
          type
        }),
      });
      
      const success = response.ok;
      setTestResults(prev => ({ ...prev, [type]: success }));
    } catch (error) {
      console.error(`Test ${type} notification failed:`, error);
      setTestResults(prev => ({ ...prev, [type]: false }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetAnalytics = async () => {
    setIsLoading(true);
    try {
      // Placeholder analytics for now
      const data = {
        totalNotifications: 0,
        delivered: 0,
        clicked: 0,
        message: 'Analytics coming soon!'
      };
      setAnalytics([data]);
    } catch (error) {
      console.error('Failed to get analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: boolean | undefined) => {
    if (status === undefined) return null;
    return status ? 
      <Badge variant="default" className="bg-green-500"><Check className="w-3 h-3 mr-1" />Success</Badge> :
      <Badge variant="destructive"><X className="w-3 h-3 mr-1" />Failed</Badge>;
  };

  if (!userId) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Authentication Required</AlertTitle>
          <AlertDescription>
            Please sign in to test OneSignal notifications.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">OneSignal Integration Test</h1>
          <p className="text-muted-foreground">
            Test the OneSignal notification system properly configured
          </p>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <Badge variant="outline">Development Mode</Badge>
        )}
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            System Status
          </CardTitle>
          <CardDescription>
            Current state of OneSignal integration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Push Support</p>
              <Badge variant={isPushSupported ? "default" : "destructive"}>
                {isPushSupported ? "Supported" : "Not Supported"}
              </Badge>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">OneSignal Ready</p>
              <Badge variant={isInitialized ? "default" : "secondary"}>
                {isInitialized ? "Ready" : "Loading..."}
              </Badge>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Subscription Status</p>
              <Badge variant={isSubscribed ? "default" : "outline"}>
                {isSubscribed ? "Subscribed" : "Not Subscribed"}
              </Badge>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Player ID</p>
              <p className="text-xs font-mono bg-muted p-1 rounded">
                {playerId ? `${playerId.substring(0, 8)}...` : "None"}
              </p>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Subscription Management */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription Management</CardTitle>
          <CardDescription>
            Test OneSignal subscription flow according to documentation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button 
              onClick={handleSubscribe}
              disabled={!isInitialized || isSubscribed || isLoading || !isPushSupported}
              className="flex items-center gap-2"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
              Subscribe to Notifications
            </Button>
            <Button 
              variant="outline"
              onClick={handleUnsubscribe}
              disabled={!isInitialized || !isSubscribed || isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellOff className="w-4 h-4" />}
              Unsubscribe
            </Button>
            {getStatusBadge(testResults.subscribe)}
            {getStatusBadge(testResults.unsubscribe)}
          </div>
          
          {!isPushSupported && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Push Notifications Not Supported</AlertTitle>
              <AlertDescription>
                Your browser or device doesn't support push notifications. Try using Chrome, Firefox, or Edge on desktop.
              </AlertDescription>
            </Alert>
          )}

          {isPushSupported && !isSubscribed && (
            <Alert>
              <Bell className="h-4 w-4" />
              <AlertTitle>Ready to Subscribe</AlertTitle>
              <AlertDescription>
                Click "Subscribe to Notifications" to enable push notifications. You'll see a browser permission dialog.
              </AlertDescription>
            </Alert>
          )}

          {/* Background Testing Instructions */}
          {isSubscribed && playerId && (
            <Alert className="border-blue-200 bg-blue-50">
              <Bell className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-800">Test Background Notifications</AlertTitle>
              <AlertDescription className="text-blue-700">
                <div className="space-y-2">
                  <p><strong>Your User ID:</strong> <code className="bg-blue-100 px-1 rounded text-xs">{userId}</code></p>
                  <p><strong>Your Player ID:</strong> <code className="bg-blue-100 px-1 rounded text-xs">{playerId}</code></p>
                  <p><strong>To test background notifications:</strong></p>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Copy your Player ID above</li>
                    <li>Close this browser completely</li>
                    <li>Use another device/browser to send: <code className="bg-blue-100 px-1 rounded text-xs">POST /api/test-notification</code></li>
                    <li>Or use the curl command below</li>
                  </ol>
                  <div className="mt-2 p-2 bg-blue-100 rounded text-xs font-mono overflow-x-auto">
                    {`curl -X POST http://localhost:3000/api/test-notification \\
  -H "Content-Type: application/json" \\
  -d '{"playerId": "${playerId}", "type": "test"}'`}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Test Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Test Notifications</CardTitle>
          <CardDescription>
            Send test notifications for different StudySpark features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={() => handleTestNotification('task')}
              disabled={!isSubscribed || isLoading}
              className="flex items-center gap-2 h-auto p-4"
              variant="outline"
            >
              <div className="text-left flex-1">
                <div className="flex items-center gap-2">
                  📋 <span className="font-medium">Task Reminder</span>
                  {getStatusBadge(testResults.task)}
                </div>
                <p className="text-sm text-muted-foreground">
                  Test task reminder notification
                </p>
              </div>
            </Button>

            <Button
              onClick={() => handleTestNotification('achievement')}
              disabled={!isSubscribed || isLoading}
              className="flex items-center gap-2 h-auto p-4"
              variant="outline"
            >
              <div className="text-left flex-1">
                <div className="flex items-center gap-2">
                  🏆 <span className="font-medium">Achievement</span>
                  {getStatusBadge(testResults.achievement)}
                </div>
                <p className="text-sm text-muted-foreground">
                  Test achievement notification
                </p>
              </div>
            </Button>

            <Button
              onClick={() => handleTestNotification('break')}
              disabled={!isSubscribed || isLoading}
              className="flex items-center gap-2 h-auto p-4"
              variant="outline"
            >
              <div className="text-left flex-1">
                <div className="flex items-center gap-2">
                  ☕ <span className="font-medium">Study Break</span>
                  {getStatusBadge(testResults.break)}
                </div>
                <p className="text-sm text-muted-foreground">
                  Test study break suggestion
                </p>
              </div>
            </Button>

            <Button
              onClick={() => handleTestNotification('streak')}
              disabled={!isSubscribed || isLoading}
              className="flex items-center gap-2 h-auto p-4"
              variant="outline"
            >
              <div className="text-left flex-1">
                <div className="flex items-center gap-2">
                  🔥 <span className="font-medium">Streak Milestone</span>
                  {getStatusBadge(testResults.streak)}
                </div>
                <p className="text-sm text-muted-foreground">
                  Test streak celebration
                </p>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Analytics */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Analytics</CardTitle>
          <CardDescription>
            View notification delivery and engagement metrics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleGetAnalytics} disabled={isLoading}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Load Analytics (Last 7 Days)
          </Button>

          {analytics.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Basic Analytics</h4>
              <div className="space-y-2">
                {analytics.map((data, index) => (
                  <div key={index} className="p-3 bg-muted rounded space-y-2">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Subscription Status:</span>
                        <span className={`ml-2 ${data.isSubscribed ? 'text-green-600' : 'text-red-600'}`}>
                          {data.isSubscribed ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Push Support:</span>
                        <span className={`ml-2 ${data.isPushSupported ? 'text-green-600' : 'text-red-600'}`}>
                          {data.isPushSupported ? 'Supported' : 'Not Supported'}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Player ID:</span>
                        <span className="ml-2 font-mono text-xs">
                          {data.playerId ? `${data.playerId.substring(0, 12)}...` : 'None'}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Permission:</span>
                        <span className="ml-2">{data.permission}</span>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Generated: {new Date(data.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Integration Info */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Benefits</CardTitle>
          <CardDescription>
            Why OneSignal solves our notification challenges
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-green-600">✅ Problems Solved</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Real-time delivery (no cron delays)</li>
                <li>• Unlimited notifications (no Vercel limits)</li>
                <li>• Better delivery rates vs web-push</li>
                <li>• Advanced targeting & scheduling</li>
                <li>• Rich analytics & A/B testing</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-blue-600">🚀 New Features</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Timezone-aware delivery</li>
                <li>• Smart delivery optimization</li>
                <li>• Multi-channel (web, mobile, email)</li>
                <li>• Rich notification content</li>
                <li>• Engagement tracking</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 