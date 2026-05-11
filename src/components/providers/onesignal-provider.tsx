"use client";

import { useDebouncedAchievementTrigger } from "@/hooks/useDebouncedAchievementTrigger";
import { getOneSignalPageSdk } from "@/lib/notifications/onesignal-page-sdk";
import { useUser } from "@clerk/nextjs";
import type React from "react";
import { createContext, useContext, useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    OneSignalDeferred?: Array<(oneSignalSdk: unknown) => void | Promise<void>>;
  }
}

interface OneSignalContextType {
  isInitialized: boolean;
  isSubscribed: boolean;
  playerId?: string;
  error?: string;
  shouldPromptUser: boolean;
  isSyncing: boolean;
  isOperating: boolean;

  // iOS-specific features
  isIOS: boolean;
  iosPermissionStatus?: string;
  iosIssues: string[];
  iosSuggestions: string[];

  subscribe: (force?: boolean) => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  promptUser: () => Promise<boolean>;

  // iOS-specific methods
  checkIOSPermissions: () => Promise<void>;
  testIOSDelivery: () => Promise<boolean>;
  debugIOSConfiguration: () => Promise<Record<string, any>>;
}

const OneSignalContext = createContext<OneSignalContextType | null>(null);

export const useOneSignal = () => {
  const context = useContext(OneSignalContext);
  if (!context) {
    throw new Error("useOneSignal must be used within OneSignalProvider");
  }
  return context;
};

interface OneSignalProviderProps {
  children: React.ReactNode;
}

export const OneSignalProvider: React.FC<OneSignalProviderProps> = ({
  children,
}) => {
  const { user } = useUser();
  const { triggerAchievement } = useDebouncedAchievementTrigger();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [playerId, setPlayerId] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasShownPrompt, setHasShownPrompt] = useState(false);
  const [shouldPromptUser, setShouldPromptUser] = useState(false);
  const [isOperating, setIsOperating] = useState(false);
  const [lastOperationTime, setLastOperationTime] = useState(0);

  const userRef = useRef(user);
  userRef.current = user;

  const hasShownPromptRef = useRef(false);
  hasShownPromptRef.current = hasShownPrompt;

  /** Attach Slidedown / subscription listeners once — effect re-runs on user change via login/out only. */
  const listenersAttachedRef = useRef(false);

  // iOS-specific state
  const [isIOS, setIsIOS] = useState(false);
  const [iosPermissionStatus, setIOSPermissionStatus] = useState<
    string | undefined
  >();
  const [iosIssues, setIOSIssues] = useState<string[]>([]);
  const [iosSuggestions, setIOSSuggestions] = useState<string[]>([]);

  useEffect(() => {
    let active = true;

    void (async () => {
      if (typeof window === "undefined") return;

      const isIOSDevice =
        typeof navigator !== "undefined" &&
        /iPad|iPhone|iPod/.test(navigator.userAgent);
      setIsIOS(isIOSDevice);

      try {
        const OneSignal = (await getOneSignalPageSdk()) as Record<string, any>;

        if (!active) return;

        console.log("OneSignal: Provider initialization successful");

        const clerkId = user?.id;

        if (clerkId) {
          console.log("🔐 Setting up OneSignal with user:", clerkId);
          await OneSignal.login(clerkId);
        } else if (typeof OneSignal.logout === "function") {
          await OneSignal.logout();
        }

        const permission = OneSignal.Notifications.permission;
        const optedIn = OneSignal.User.PushSubscription.optedIn;
        console.log("🔍 OneSignal status:", { permission, optedIn });
        setIsSubscribed(Boolean(permission && optedIn));

        let currentPlayerId: string | undefined;
        try {
          const id = OneSignal.User.PushSubscription.id;
          currentPlayerId = id || undefined;
          console.log("🔍 OneSignal player ID detected:", currentPlayerId);
          setPlayerId(currentPlayerId);
        } catch (e) {
          console.log("🔍 Error getting player ID:", e);
        }

        if (isIOSDevice) {
          await checkIOSPermissions();
        }

        if (clerkId && !permission && !hasShownPromptRef.current) {
          console.log("🔔 User should be prompted for notifications");
          setShouldPromptUser(true);
        }

        if (clerkId) {
          await syncSubscriptionStatus(
            clerkId,
            currentPlayerId,
            Boolean(permission && optedIn),
          );
        }

        if (!listenersAttachedRef.current) {
          listenersAttachedRef.current = true;

          OneSignal.User.PushSubscription.addEventListener(
            "change",
            async (event: { current: { optedIn: boolean; id?: string } }) => {
              console.log("🔄 OneSignal subscription changed:", event);
              const uid = userRef.current?.id;
              const newSubscribed = Boolean(
                event.current.optedIn && OneSignal.Notifications.permission,
              );
              setIsSubscribed(newSubscribed);
              const newPlayerId = event.current.id || undefined;
              setPlayerId(newPlayerId);

              if (isIOSDevice) {
                await checkIOSPermissions();
              }

              if (uid) {
                await syncSubscriptionStatus(uid, newPlayerId, newSubscribed);
              }
            },
          );

          OneSignal.Slidedown.addEventListener("slidedownShown", () => {
            console.log("🔔 Slidedown prompt shown");
            setHasShownPrompt(true);
            setShouldPromptUser(false);
            OneSignal.Session.sendOutcome("notification_prompt_shown");
          });

          OneSignal.Notifications.addEventListener(
            "click",
            (event: { notification?: { data?: { type?: string } } }) => {
              console.log("🔔 Notification clicked:", event);
              OneSignal.Session.sendOutcome("notification_clicked");
              if (event.notification?.data?.type) {
                OneSignal.Session.sendOutcome(
                  `notification_${event.notification.data.type}_clicked`,
                );
              }
            },
          );
        }

        setError(undefined);
        setIsInitialized(true);
        console.log("✅ OneSignal initialized with user:", clerkId);
      } catch (err) {
        console.error("[onesignal:provider]", err);
        if (!active) return;
        setError(
          err instanceof Error ? err.message : "OneSignal SDK not loaded",
        );
        setIsInitialized(true);
      }
    })();

    return () => {
      active = false;
    };
  }, [user?.id]);

  // Function to sync OneSignal subscription status with our database
  const syncSubscriptionStatus = async (
    userId: string,
    playerId: string | undefined,
    isActive: boolean,
  ) => {
    // Prevent duplicate sync requests
    if (isSyncing) {
      console.log("🔄 Sync already in progress, skipping...");
      return;
    }

    try {
      setIsSyncing(true);
      console.log("🔄 Starting sync request:", { userId, playerId, isActive });

      if (isActive && playerId) {
        // User is subscribed - sync to database
        const response = await fetch("/api/notifications/sync-subscription", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId,
            playerId,
            deviceType: "web",
          }),
        });

        const result = await response.json();
        console.log("🔄 Sync response:", { status: response.status, result });

        if (response.ok) {
          console.log("✅ Subscription synced to database");
        } else {
          console.error("❌ Failed to sync subscription to database:", result);
        }
      } else {
        // User is not subscribed - update database to mark as inactive
        const response = await fetch("/api/notifications/unsubscribe", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId,
          }),
        });

        const result = await response.json();
        console.log("🔄 Unsubscribe response:", {
          status: response.status,
          result,
        });

        if (response.ok) {
          console.log("✅ Unsubscription synced to database");
        } else {
          console.error(
            "❌ Failed to sync unsubscription to database:",
            result,
          );
        }
      }
    } catch (error) {
      console.error("❌ Error syncing subscription status to database:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const subscribe = async (force = false): Promise<boolean> => {
    console.log("🔔 Subscribe called", { force, isOperating });

    // Debouncing - prevent multiple operations within 3 seconds
    const now = Date.now();
    if (now - lastOperationTime < 3000) {
      console.log("🔔 Operation debounced, too soon since last operation");
      return false;
    }
    setLastOperationTime(now);

    // Prevent multiple simultaneous operations
    if (isOperating) {
      console.log("🔔 Already processing operation, skipping...");
      return false;
    }

    try {
      setIsOperating(true);

      let OneSignal: Record<string, any>;
      try {
        OneSignal = (await getOneSignalPageSdk()) as Record<string, any>;
      } catch {
        setError("OneSignal not available");
        return false;
      }

      // First, ensure user is logged in to OneSignal
      if (user?.id) {
        console.log("🔐 Logging user into OneSignal:", user.id);
        await OneSignal.login(user.id);
      }

      // Check current subscription status before proceeding
      const currentOptedIn = OneSignal.User.PushSubscription.optedIn;
      if (currentOptedIn) {
        console.log("🔔 User is already subscribed");
        return true;
      }

      console.log("🔔 Showing slidedown prompt with force:", force);

      // Use the slidedown prompt. OneSignal handles the logic of whether to show it.
      // The `force` parameter overrides the "cool down" period if the user previously dismissed it.
      // This is ideal when the action is initiated by a user click.
      await OneSignal.Slidedown.promptPush({ force });

      // Wait longer for user interaction and SDK to update
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Check the final status
      const newOptedIn = OneSignal.User.PushSubscription.optedIn;
      const newPlayerId = OneSignal.User.PushSubscription.id;

      console.log("🔔 Subscribe result:", { newOptedIn, newPlayerId });

      if (newOptedIn) {
        console.log("✅ Successfully subscribed to notifications");
        triggerAchievement("notifications_enabled");

        // Force state update in case the listener didn't fire
        setIsSubscribed(true);
        setPlayerId(newPlayerId || undefined);

        // Ensure database sync
        if (user?.id) {
          await syncSubscriptionStatus(user.id, newPlayerId, true);
        }
      } else {
        console.log("❌ User declined or subscription failed");
      }

      return !!newOptedIn;
    } catch (err) {
      console.error("❌ Subscribe error:", err);
      setError(err instanceof Error ? err.message : "Failed to subscribe");
      return false;
    } finally {
      setIsOperating(false);
    }
  };

  const unsubscribe = async (): Promise<boolean> => {
    console.log("🔕 Unsubscribe called", { isOperating });

    // Debouncing - prevent multiple operations within 3 seconds
    const now = Date.now();
    if (now - lastOperationTime < 3000) {
      console.log("🔕 Operation debounced, too soon since last operation");
      return false;
    }
    setLastOperationTime(now);

    // Prevent multiple simultaneous operations
    if (isOperating) {
      console.log("🔕 Already processing operation, skipping...");
      return false;
    }

    try {
      setIsOperating(true);

      let OneSignal: Record<string, any>;
      try {
        OneSignal = (await getOneSignalPageSdk()) as Record<string, any>;
      } catch {
        setError("OneSignal not available");
        return false;
      }

      // Check if already unsubscribed
      const currentOptedIn = OneSignal.User.PushSubscription.optedIn;
      if (!currentOptedIn) {
        console.log("🔕 User is already unsubscribed");
        return true;
      }

      console.log("🔕 Opting out of push notifications...");

      // The SDK handles the case where the user is already opted out.
      await OneSignal.User.PushSubscription.optOut();

      // Wait for the change to take effect
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Verify the change
      const newOptedIn = OneSignal.User.PushSubscription.optedIn;
      console.log("🔕 Unsubscribe result:", { newOptedIn });

      if (!newOptedIn) {
        console.log("✅ Successfully unsubscribed from notifications");

        // Force state update in case the listener didn't fire
        setIsSubscribed(false);
        setPlayerId(undefined);

        // Ensure database sync
        if (user?.id) {
          await syncSubscriptionStatus(user.id, undefined, false);
        }
      }

      // The event listener will handle the state change and DB sync.
      console.log("✅ Unsubscribe command completed.");
      return !newOptedIn;
    } catch (err) {
      console.error("❌ Unsubscribe error:", err);
      setError(err instanceof Error ? err.message : "Failed to unsubscribe");
      return false;
    } finally {
      setIsOperating(false);
    }
  };

  // iOS-specific methods
  const checkIOSPermissions = async (): Promise<void> => {
    try {
      const onIOSDevice =
        typeof navigator !== "undefined" &&
        /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (!onIOSDevice) {
        setIOSIssues(["Not running on iOS device"]);
        return;
      }

      const issues: string[] = [];
      const suggestions: string[] = [];

      // Check Safari version
      const safariMatch = navigator.userAgent.match(/Version\/(\d+\.\d+)/);
      const safariVersion = safariMatch ? Number.parseFloat(safariMatch[1]) : 0;

      if (safariVersion < 11.3) {
        issues.push(
          `Safari ${safariVersion} detected. iOS 11.3+ required for PWA notifications`,
        );
        suggestions.push("Update iOS to version 11.3 or later");
      }

      // Check if app is installed as PWA
      const isIOSPWA = window.navigator.standalone;
      if (!isIOSPWA) {
        issues.push("App not installed as PWA");
        suggestions.push("Install app to Home Screen for notification support");
        suggestions.push('Use Safari Share button → "Add to Home Screen"');
      }

      // Check OneSignal permission status (Web v16 Page SDK)
      try {
        const OneSignal = (await getOneSignalPageSdk(12_000)) as Record<
          string,
          any
        >;
        const permission = OneSignal.Notifications.permission;
        setIOSPermissionStatus(permission ? "granted" : "default");

        if (!permission) {
          suggestions.push('Tap "Allow" when prompted for notifications');
        }
      } catch {
        issues.push("OneSignal not loaded");
        setIOSPermissionStatus("unknown");
      }

      // Check for notification API support
      if (!("Notification" in window)) {
        issues.push("Notification API not supported");
      }

      setIOSIssues(issues);
      setIOSSuggestions(suggestions);
    } catch (error) {
      console.error("Error checking iOS permissions:", error);
      setIOSIssues(["Error checking permissions"]);
    }
  };

  const testIOSDelivery = async (): Promise<boolean> => {
    try {
      if (!isIOS || !playerId) {
        console.log("Cannot test iOS delivery: not iOS or no player ID");
        return false;
      }

      // Use the OneSignal service for iOS testing
      const { OneSignalService } = await import(
        "@/lib/notifications/OneSignalService"
      );
      const oneSignalService = OneSignalService.getInstance();

      const result =
        await oneSignalService.testiOSNotificationDelivery(playerId);
      return result.success;
    } catch (error) {
      console.error("Error testing iOS delivery:", error);
      return false;
    }
  };

  const debugIOSConfiguration = async (): Promise<Record<string, any>> => {
    let oneSignalLoaded = false;
    const debug: Record<string, any> = {
      isIOS,
      isIOSPWA: window.navigator.standalone,
      safariVersion: "unknown",
      notificationAPISupported: "Notification" in window,
      oneSignalLoaded,
      permission: iosPermissionStatus || "unknown",
      playerId: playerId || "none",
      issues: iosIssues,
      suggestions: iosSuggestions,
      timestamp: new Date().toISOString(),
    };

    // Get Safari version
    const safariMatch = navigator.userAgent.match(/Version\/(\d+\.\d+)/);
    if (safariMatch) {
      debug.safariVersion = safariMatch[1];
    }

    try {
      const OneSignal = (await getOneSignalPageSdk(12_000)) as Record<
        string,
        any
      >;
      oneSignalLoaded = true;
      debug.oneSignalLoaded = true;
      debug.oneSignalDetails = {
        permission: OneSignal.Notifications.permission,
        optedIn: OneSignal.User.PushSubscription.optedIn,
        playerId: OneSignal.User.PushSubscription.id,
      };
    } catch (e) {
      debug.oneSignalError = e instanceof Error ? e.message : "Unknown error";
    }

    return debug;
  };

  // Function to prompt user for notifications (can be called from anywhere)
  const promptUser = async (): Promise<boolean> => {
    console.log("🔔 Actively prompting user for notifications");
    // We call subscribe with `force: true` because this function is meant
    // to be called by an explicit user action, like clicking a button.
    return await subscribe(true);
  };

  const value: OneSignalContextType = {
    isInitialized,
    isSubscribed,
    playerId,
    error,
    shouldPromptUser,
    isSyncing,
    isOperating,

    // iOS-specific properties
    isIOS,
    iosPermissionStatus,
    iosIssues,
    iosSuggestions,

    subscribe,
    unsubscribe,
    promptUser,

    // iOS-specific methods
    checkIOSPermissions,
    testIOSDelivery,
    debugIOSConfiguration,
  };

  return (
    <OneSignalContext.Provider value={value}>
      {children}
    </OneSignalContext.Provider>
  );
};
