"use client";

import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Bell, X } from "lucide-react";
import { useEffect, useState } from "react";

const DISMISSED_KEY = "notif_prompt_dismissed";

export function NotificationPrompt() {
  const { isSupported, permission, isSubscribed, isLoading, subscribe } =
    usePushNotifications();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isSupported) return;
    const dismissed = sessionStorage.getItem(DISMISSED_KEY);
    if (!dismissed && permission === "default" && !isSubscribed) {
      const t = window.setTimeout(() => setVisible(true), 3000);
      return () => window.clearTimeout(t);
    }
  }, [isSupported, permission, isSubscribed]);

  if (!visible) return null;

  const handleSubscribe = async (): Promise<void> => {
    const success = await subscribe();
    if (success) setVisible(false);
  };

  const handleDismiss = (): void => {
    sessionStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Enable notifications"
      className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-sm animate-in slide-in-from-bottom-4 rounded-2xl border border-border bg-background/95 p-4 shadow-xl backdrop-blur"
    >
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
      <div className="flex gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Bell size={18} className="text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">
            Never miss a deadline
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Stu will remind you even when MemoSpark is closed.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => void handleSubscribe()}
              disabled={isLoading}
              className="flex-1 rounded-lg bg-primary py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
            >
              {isLoading ? "Enabling…" : "Turn on"}
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
