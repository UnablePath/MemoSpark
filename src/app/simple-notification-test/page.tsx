"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getOneSignalPageSdk } from "@/lib/notifications/onesignal-page-sdk";
import { useEffect, useState } from "react";

export default function SimpleNotificationTest() {
  const [status, setStatus] = useState("");
  const [permission, setPermission] = useState("");
  const [oneSignalPageSdkReady, setOneSignalPageSdkReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getOneSignalPageSdk()
      .then(() => {
        if (!cancelled) setOneSignalPageSdkReady(true);
      })
      .catch(() => {
        if (!cancelled) setOneSignalPageSdkReady(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const checkBrowserSupport = () => {
    const supported = "Notification" in window;
    const currentPermission = supported
      ? Notification.permission
      : "not supported";
    setStatus(
      `Browser support: ${supported}, Permission: ${currentPermission}`,
    );
    setPermission(currentPermission);
  };

  const requestBrowserPermission = async () => {
    try {
      setStatus("Requesting browser permission...");
      const result = await Notification.requestPermission();
      setStatus(`Browser permission result: ${result}`);
      setPermission(result);

      if (result === "granted") {
        // Test basic browser notification
        const notification = new Notification("Test!", {
          body: "Browser notifications working!",
          icon: "/icon-192x192.png",
        });
        setTimeout(() => notification.close(), 3000);
      }
    } catch (error) {
      setStatus(`Error: ${error}`);
    }
  };

  const testOneSignal = async () => {
    try {
      setStatus("Testing OneSignal...");
      const OneSignal = (await getOneSignalPageSdk()) as Record<string, any>;
      setStatus("OneSignal Page SDK resolved. Attempting subscription...");

      await OneSignal.Slidedown.promptPush();

      const playerId = OneSignal.User.PushSubscription.id;
      setStatus(`OneSignal player ID: ${playerId || "No ID yet"}`);

      const oneSignalPermission = OneSignal.Notifications.permission;
      setStatus(
        (prev) => `${prev} | OneSignal permission: ${oneSignalPermission}`,
      );
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
              disabled={permission === "denied"}
            >
              2. Request Browser Permission
            </Button>

            <Button onClick={testOneSignal} disabled={permission !== "granted"}>
              3. Test OneSignal
            </Button>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm font-mono">
              {status || "Click buttons above to test..."}
            </p>
          </div>

          <div className="text-xs text-muted-foreground">
            <p>
              Current permission: <strong>{permission}</strong>
            </p>
            <p>
              OneSignal Page SDK (v16 deferred):{" "}
              <strong>{oneSignalPageSdkReady ? "Resolved" : "Not yet"}</strong>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
