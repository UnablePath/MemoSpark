"use client";

import React from 'react';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const ConnectionsDebug: React.FC = () => {
  const { user, isLoaded, isSignedIn } = useUser();

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>🔍 Connections Tab Debug</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <strong>Authentication Status:</strong>
            <ul className="ml-4 mt-1">
              <li>isLoaded: {isLoaded ? '✅' : '❌'}</li>
              <li>isSignedIn: {isSignedIn ? '✅' : '❌'}</li>
              <li>User ID: {user?.id || 'Not available'}</li>
            </ul>
          </div>
          
          <div>
            <strong>Environment:</strong>
            <ul className="ml-4 mt-1">
              <li>Window: {typeof window !== 'undefined' ? '✅' : '❌'}</li>
              <li>localStorage: {(() => {
                try {
                  return typeof localStorage !== 'undefined' ? '✅' : '❌';
                } catch {
                  return '❌ (blocked)';
                }
              })()}</li>
              <li>Timestamp: {new Date().toISOString()}</li>
            </ul>
          </div>

          <div>
            <strong>Component Status:</strong>
            <ul className="ml-4 mt-1">
              <li>React: {React.version}</li>
              <li>This component rendered: ✅</li>
            </ul>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>📱 Quick Test</CardTitle>
        </CardHeader>
        <CardContent>
          <p>If you can see this, the connections tab is rendering correctly!</p>
          <p className="text-sm text-muted-foreground mt-2">
            If the real Connections tab fails, compare with <code>ConnectionInterface</code> in the same folder.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}; 