"use client";

import { useCallback, useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const buf = new Uint8Array(new ArrayBuffer(rawData.length));
  for (let i = 0; i < rawData.length; i++) {
    buf[i] = rawData.charCodeAt(i);
  }
  return buf;
}

export type PushPermission = "unsupported" | "default" | "granted" | "denied";

export interface NotificationPreferenceState {
  task_reminders?: boolean;
  streak_alerts?: boolean;
  social_activity?: boolean;
  achievements?: boolean;
  system_notices?: boolean;
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
  timezone?: string;
}

export function usePushNotifications() {
  const [permission, setPermission] =
    useState<PushPermission>("unsupported");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [preferences, setPreferences] =
    useState<NotificationPreferenceState>({});

  const isSupported =
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window;

  useEffect(() => {
    if (!isSupported) return;

    setPermission(Notification.permission as PushPermission);

    navigator.serviceWorker.ready
      .then(async (registration) => {
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(Boolean(subscription));
      })
      .catch((err: unknown) => {
        console.error("[push:notifications]", err);
      });

    fetch("/api/push/preferences")
      .then(async (response) => {
        if (!response.ok) return;
        const data =
          await response.json() as NotificationPreferenceState;
        setPreferences(data);
      })
      .catch(() => {});

    const handler = (event: MessageEvent) => {
      if (
        typeof event.data === "object" &&
        event.data != null &&
        (event.data as { type?: string }).type === "NOTIFICATION_CLICK"
      ) {
        window.dispatchEvent(
          new CustomEvent("notification:click", { detail: event.data }),
        );
      }
    };

    navigator.serviceWorker.addEventListener("message", handler);
    return () =>
      navigator.serviceWorker.removeEventListener("message", handler);
  }, [isSupported]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
    if (!vapidPublic || vapidPublic === "your_generated_public_key") {
      console.error(
        "[push:notifications]",
        new Error("NEXT_PUBLIC_VAPID_PUBLIC_KEY is not configured."),
      );
      return false;
    }

    setIsLoading(true);

    try {
      const notifyPermission = await Notification.requestPermission();
      setPermission(notifyPermission as PushPermission);

      if (notifyPermission !== "granted") {
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      if (existing) {
        await existing.unsubscribe();
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublic),
      });

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });

      if (response.ok) {
        setIsSubscribed(true);
        return true;
      }

      return false;
    } catch (error: unknown) {
      console.error("[push:notifications:subscribe]", error);
      setPermission(Notification.permission as PushPermission);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const current = await registration.pushManager.getSubscription();
      await current?.unsubscribe();
      await fetch("/api/push/subscribe", { method: "DELETE" });
      setIsSubscribed(false);
      setPermission(
        Notification.permission as PushPermission,
      );
      return true;
    } catch (error: unknown) {
      console.error("[push:notifications:unsubscribe]", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updatePreferences = useCallback(
    async (
      prefs: Partial<NotificationPreferenceState>,
    ): Promise<boolean> => {
      const optimistic = { ...preferences, ...prefs };
      setPreferences(optimistic);
      try {
        const response = await fetch("/api/push/preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(prefs),
        });
        if (!response.ok) {
          setPreferences(preferences);
          return false;
        }
        return true;
      } catch (error: unknown) {
        console.error("[push:notifications:prefs]", error);
        setPreferences(preferences);
        return false;
      }
    },
    [preferences],
  );

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    preferences,
    subscribe,
    unsubscribe,
    updatePreferences,
  };
}
