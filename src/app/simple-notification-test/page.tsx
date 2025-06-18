'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SimpleNotificationTest() {
  const [status, setStatus] = useState('');
  const [permission, setPermission] = useState('');

  const checkBrowserSupport = () => {
    const supported = 'Notification' in window;
    const currentPermission = supported ? Notification.permission : 'not supported';
    setStatus(`Browser support: ${supported}, Permission: ${currentPermission}`);
    setPermission(currentPermission);
  };

  const requestBrowserPermission = async () => {
    try {
      setStatus('Requesting browser permission...');
      const result = await Notification.requestPermission();
      setStatus(`Browser permission result: ${result}`);
      setPermission(result);
      
      if (result === 'granted') {
        // Test basic browser notification
        const notification = new Notification('Test!', {
          body: 'Browser notifications working!',
          icon: '/icon-192x192.png'
        });
        setTimeout(() => notification.close(), 3000);
      }
    } catch (error) {
      setStatus(`Error: ${error}`);
    }
  };

  const testOneSignal = async () => {
    try {
      setStatus('Testing OneSignal...');
      
      if (!window.OneSignal) {
        setStatus('OneSignal not loaded yet, waiting...');
        // Wait for OneSignal
        let attempts = 0;
        while (!window.OneSignal && attempts < 30) {
          await new Promise(resolve => setTimeout(resolve, 200));
          attempts++;
        }
      }
      
      if (window.OneSignal) {
        setStatus('OneSignal found! Attempting subscription...');
        
        // Try OneSignal subscription
        await window.OneSignal.Slidedown.promptPush();
        
        // Check if we got a player ID
        const playerId = await window.OneSignal.User.PushSubscription.id;
        setStatus(`OneSignal player ID: ${playerId || 'No ID yet'}`);
        
        // Check permission status
        const permission = window.OneSignal.Notifications.permission;
        setStatus(prev => prev + ` | OneSignal permission: ${permission}`);
        
      } else {
        setStatus('OneSignal still not available after waiting');
      }
    } catch (error) {
      setStatus(`OneSignal error: ${error}`);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>🔧 Simple Notification Debug</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Button onClick={checkBrowserSupport} variant="outline">
              1. Check Browser Support
            </Button>
            
            <Button 
              onClick={requestBrowserPermission} 
              disabled={permission === 'denied'}
            >
              2. Request Browser Permission
            </Button>
            
            <Button 
              onClick={testOneSignal}
              disabled={permission !== 'granted'}
            >
              3. Test OneSignal
            </Button>
          </div>
          
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm font-mono">{status || 'Click buttons above to test...'}</p>
          </div>
          
          <div className="text-xs text-muted-foreground">
            <p>Current permission: <strong>{permission}</strong></p>
            <p>OneSignal available: <strong>{typeof window !== 'undefined' && window.OneSignal ? 'Yes' : 'No'}</strong></p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 