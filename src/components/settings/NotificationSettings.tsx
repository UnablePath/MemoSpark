"use client";

import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, BellOff } from "lucide-react";

const CATEGORIES = [
  {
    key: "task_reminders",
    label: "Task reminders",
    desc: "When assignments are due",
  },
  {
    key: "streak_alerts",
    label: "Streak alerts",
    desc: "Keep your streak alive",
  },
  {
    key: "social_activity",
    label: "Social activity",
    desc: "Messages and connections",
  },
  {
    key: "achievements",
    label: "Achievements",
    desc: "Badges and rewards",
  },
  {
    key: "system_notices",
    label: "System notices",
    desc: "App updates and info",
  },
] as const;

export function NotificationSettings() {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    preferences,
    subscribe,
    unsubscribe,
    updatePreferences,
  } = usePushNotifications();

  if (!isSupported) {
    return (
      <p className="text-sm text-muted-foreground">
        Push notifications aren&apos;t supported in this browser.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-primary/10 p-2">
            {isSubscribed ? (
              <Bell size={18} className="text-primary" />
            ) : (
              <BellOff size={18} className="text-muted-foreground" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold">Push notifications</p>
            <p className="text-xs text-muted-foreground">
              {permission === "denied"
                ? "Blocked — enable in browser settings"
                : isSubscribed
                  ? "Active on this device"
                  : "Tap to enable"}
            </p>
          </div>
        </div>
        <Switch
          checked={isSubscribed}
          onCheckedChange={() =>
            void (isSubscribed ? unsubscribe() : subscribe())
          }
          disabled={isLoading || permission === "denied"}
        />
      </div>

      {isSubscribed && (
        <div className="divide-y divide-border rounded-xl border border-border bg-card">
          {CATEGORIES.map(({ key, label, desc }) => (
            <div
              key={key}
              className="flex items-center justify-between px-4 py-3"
            >
              <div>
                <Label className="text-sm font-medium">{label}</Label>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <Switch
                checked={(preferences[key] ?? true) as boolean}
                onCheckedChange={(checked) =>
                  void updatePreferences({
                    [key]: checked,
                  })
                }
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
