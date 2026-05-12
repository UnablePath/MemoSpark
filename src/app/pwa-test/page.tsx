'use client';

import PWADebug from '@/components/pwa/PWADebug';
import { PushNotificationManager } from '@/components/pwa/PushNotificationManager';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useEffect, useState } from 'react';

interface ReachabilityProbe {
  name: string;
  url: string;
  status: 'pending' | 'success' | 'error';
  message?: string;
}

export default function PWATestPage() {
  const { isSupported, permission, isSubscribed } = usePushNotifications();

  const [probes, setProbes] = useState<ReachabilityProbe[]>([
    {
      name: 'Service worker (/sw.js)',
      url: `${typeof window !== 'undefined' ? window.location.origin : ''}/sw.js`,
      status: 'pending',
    },
    {
      name: 'Google fonts',
      url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400&display=swap',
      status: 'pending',
    },
  ]);

  const [runningProbes, setRunningProbes] = useState(false);

  useEffect(() => {
    setProbes((prev) =>
      prev.map((p) =>
        p.name.startsWith('Service worker')
          ? {
              ...p,
              url: `${window.location.origin}/sw.js`,
            }
          : p,
      ),
    );
  }, []);

  const runProbes = async (): Promise<void> => {
    setRunningProbes(true);
    let index = 0;
    const snapshot = probes;
    for (const probe of snapshot) {
      const i = index;
      index++;
      try {
        const ctrl = new AbortController();
        const to = window.setTimeout(() => ctrl.abort(), 8000);
        const firstTry = await fetch(probe.url, {
          method: 'HEAD',
          mode: 'no-cors',
          signal: ctrl.signal,
        }).catch(() => null);
        if (firstTry == null) {
          await fetch(probe.url, { mode: 'no-cors', cache: 'no-store' });
        }
        window.clearTimeout(to);
        setProbes((prev) =>
          prev.map((row, idx) =>
            idx === i
              ? { ...row, status: 'success', message: 'Reachable (opaque)' }
              : row,
          ),
        );
      } catch (err) {
        setProbes((prev) =>
          prev.map((row, idx) =>
            idx === i
              ? {
                  ...row,
                  status: 'error',
                  message:
                    err instanceof Error ? err.message : 'Network blocked',
                }
              : row,
          ),
        );
      }
    }
    setRunningProbes(false);
  };

  return (
    <div className="container mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold">PWA diagnostics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Web Push uses{' '}
          <code>VAPID</code>,{' '}
          <code>/sw.js</code>, and the Supabase notifications queue — not a
          third-party SaaS shim.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Push readiness</CardTitle>
          <CardDescription>
            Mirrors the same signals as Settings ▸ notifications.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Badge variant={isSupported ? 'default' : 'destructive'}>
            {isSupported ? 'Supported' : 'Unsupported'}
          </Badge>
          <Badge variant="secondary">Permission: {permission}</Badge>
          <Badge variant={isSubscribed ? 'default' : 'outline'}>
            Subscribed: {isSubscribed ? 'yes' : 'no'}
          </Badge>
        </CardContent>
      </Card>

      <PushNotificationManager />

      <Card>
        <CardHeader>
          <CardTitle>CDN / asset reachability</CardTitle>
          <CardDescription>
            Quick smoke probe from this tab (opaque responses count as OK).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            {probes.map((p) => (
              <div key={p.name} className="flex items-center gap-3 text-sm">
                <Badge
                  variant={
                    p.status === 'success'
                      ? 'default'
                      : p.status === 'error'
                        ? 'destructive'
                        : 'secondary'
                  }
                >
                  {p.status}
                </Badge>
                <span>{p.name}</span>
                {p.message ? (
                  <span className="text-muted-foreground">{p.message}</span>
                ) : null}
              </div>
            ))}
          </div>
          <Button
            type="button"
            onClick={() => void runProbes()}
            disabled={runningProbes}
          >
            {runningProbes ? 'Running probes…' : 'Run probes'}
          </Button>
        </CardContent>
      </Card>

      <PWADebug />
    </div>
  );
}
