"use client";

import { useCallback, useEffect, useState } from "react";

type OSType = "ios" | "android" | "windows" | "macos" | "linux" | "unknown";

interface PWAState {
  isOnline: boolean;
  isInstalled: boolean;
  canInstall: boolean;
  hasUpdate: boolean;
  isRegistered: boolean;
  os: OSType;
}

interface PWAActions {
  install: () => Promise<void>;
  update: () => Promise<void>;
  updateServiceWorker: () => Promise<void>;
  registerServiceWorker: () => Promise<void>;
  checkForUpdates: () => Promise<void>;
  getOfflineCapabilities: () => Promise<string[]>;
}

// Global state to prevent duplicate registrations
declare global {
  interface Window {
    _pwaSWListenerAdded?: boolean;
    _pwaRegistrationInProgress?: boolean;
    _pwaRegistrationComplete?: boolean;
  }
}

/** Queues deferred auto-registration at most once per JS runtime (covers multiple usePWA() callers + React StrictMode). */
let _memoSparkPwaDeferredAutoRegisterQueued = false;
function logPWAInfo(...params: Parameters<typeof console.log>): void {
  if (process.env.NODE_ENV === "development") {
    console.log(...params);
  }
}

const getOperatingSystem = (): OSType => {
  if (typeof window === "undefined") return "unknown";
  const userAgent = window.navigator.userAgent;

  if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream)
    return "ios";
  if (/android/i.test(userAgent)) return "android";
  if (/Win/i.test(userAgent)) return "windows";
  if (/Mac/i.test(userAgent)) return "macos";
  if (/Linux/i.test(userAgent)) return "linux";

  return "unknown";
};

export function usePWA(): PWAState & PWAActions {
  const [isOnline, setIsOnline] = useState(true);
  const [isInstalled, setIsInstalled] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [os, setOs] = useState<OSType>("unknown");

  useEffect(() => {
    setOs(getOperatingSystem());
  }, []);

  // Check if PWA is installed
  useEffect(() => {
    const checkInstallation = () => {
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window as any).navigator?.standalone === true;
      setIsInstalled(isStandalone);
    };

    checkInstallation();

    // Listen for display mode changes
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const handleChange = () => checkInstallation();

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
    // Fallback for older browsers
    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    updateOnlineStatus();

    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  // Listen for install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setCanInstall(false);
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  // Install PWA
  const install = useCallback(async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        logPWAInfo(`User response to the install prompt: ${outcome}`);
        setDeferredPrompt(null);
        setCanInstall(false);
        if (outcome === "accepted") {
          setIsInstalled(true);
        }
      } catch (error) {
        console.error("Error during PWA installation:", error);
      }
    }
  }, [deferredPrompt]);

  // Update PWA (reload to activate waiting service worker)
  const update = useCallback(async () => {
    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration("/");
        if (registration?.waiting) {
          logPWAInfo("[PWA] Updating service worker...");

          // Track if we've already handled the update to prevent infinite loops
          let controllerChangeHandled = false;
          let timeoutHandled = false;

          // Function to handle the actual reload
          const performReload = (reason: string) => {
            if (controllerChangeHandled || timeoutHandled) return;

            logPWAInfo(`[PWA] ${reason}, reloading...`);
            controllerChangeHandled = true;
            timeoutHandled = true;

            // Clear hasUpdate state before reload
            setHasUpdate(false);

            // Small delay to ensure state is updated
            setTimeout(() => {
              window.location.reload();
            }, 100);
          };

          // Listen for the controlling service worker to change
          const handleControllerChange = () => {
            if (controllerChangeHandled) return;
            performReload("Service worker controller changed");
          };

          // Add controller change listener with cleanup
          navigator.serviceWorker.addEventListener(
            "controllerchange",
            handleControllerChange,
            { once: true },
          );

          // Timeout fallback - if controllerchange doesn't fire within 5 seconds
          const timeoutId = setTimeout(() => {
            if (timeoutHandled || controllerChangeHandled) return;

            console.warn("[PWA] Controller change timeout, forcing reload...");
            timeoutHandled = true;

            // Remove the controller change listener since we're handling manually
            navigator.serviceWorker.removeEventListener(
              "controllerchange",
              handleControllerChange,
            );

            // Clear hasUpdate and reload
            setHasUpdate(false);
            setTimeout(() => {
              window.location.reload();
            }, 100);
          }, 5000); // 5 second timeout as specified

          // Send a message to the waiting service worker to skip waiting
          try {
            registration.waiting.postMessage({ type: "SKIP_WAITING" });
            logPWAInfo("[PWA] SKIP_WAITING message sent to service worker");
          } catch (error) {
            console.error("[PWA] Failed to send SKIP_WAITING message:", error);
            // Clean up timeout and listener
            clearTimeout(timeoutId);
            navigator.serviceWorker.removeEventListener(
              "controllerchange",
              handleControllerChange,
            );
            throw error;
          }

          // Clean up timeout if controller change happens first
          const originalControllerChange = handleControllerChange;
          const wrappedControllerChange = () => {
            clearTimeout(timeoutId);
            originalControllerChange();
          };

          // Replace the listener with the wrapped version
          navigator.serviceWorker.removeEventListener(
            "controllerchange",
            handleControllerChange,
          );
          navigator.serviceWorker.addEventListener(
            "controllerchange",
            wrappedControllerChange,
            { once: true },
          );
        } else {
          logPWAInfo("[PWA] No waiting service worker found");
          // Reset hasUpdate if there's no waiting worker
          setHasUpdate(false);
        }
      } catch (error) {
        console.error("Error updating PWA:", error);
        // Reset hasUpdate on error so user can try again
        setHasUpdate(false);
        throw error; // Re-throw so ServiceWorkerUpdater can handle it
      }
    } else {
      logPWAInfo("[PWA] Service Worker not supported");
      setHasUpdate(false);
    }
  }, []);

  // Clean up conflicting service worker registrations - only when no active registration
  const cleanupServiceWorkers = useCallback(async () => {
    if (!("serviceWorker" in navigator)) return;

    try {
      logPWAInfo("[PWA] Cleaning up service worker registrations...");
      const registrations = await navigator.serviceWorker.getRegistrations();

      for (const registration of registrations) {
        const scope = registration.scope;
        const worker =
          registration.active ?? registration.waiting ?? registration.installing;
        const scriptURL = worker?.scriptURL ?? '';

        logPWAInfo('[PWA] Found registration:', { scope, scriptURL });

        if (!scriptURL.trim()) {
          continue;
        }

        let pathname = '';
        try {
          pathname = new URL(scriptURL, window.location.origin).pathname;
        } catch {
          pathname = '';
        }

        const expectedScope = `${window.location.origin.replace(/\/$/, '')}/`;
        const canonicalScopeMatches =
          scope === expectedScope ||
          scope.replace(/\/$/, '') === window.location.origin;
        const isMemoSparkCanonical =
          pathname.endsWith('/sw.js') && canonicalScopeMatches;

        if (isMemoSparkCanonical) {
          logPWAInfo(
            '[PWA] Keeping primary MemoSpark service worker:',
            scope,
          );
          continue;
        }

        logPWAInfo('[PWA] Unregistering non-canonical worker:', scope);
        try {
          await registration.unregister();
        } catch (error) {
          console.warn('[PWA] Failed to unregister:', error);
        }
      }

      logPWAInfo("[PWA] Service worker cleanup completed");
    } catch (error) {
      console.error("[PWA] Error during service worker cleanup:", error);
    }
  }, []);

  // Register service worker with proper duplicate prevention
  const registerServiceWorker = useCallback(async () => {
    if (!("serviceWorker" in navigator) || typeof window === "undefined") {
      logPWAInfo("[PWA] Service Worker not supported");
      return;
    }

    // Prevent multiple simultaneous registrations
    if (window._pwaRegistrationInProgress) {
      logPWAInfo("[PWA] Registration already in progress, skipping...");
      return;
    }

    // Check if already registered and complete
    if (window._pwaRegistrationComplete) {
      logPWAInfo("[PWA] Service Worker already registered and complete");
      const registration = await navigator.serviceWorker.getRegistration("/");
      if (registration) {
        setIsRegistered(true);
        return;
      }
      // Reset flag if registration was somehow lost
      window._pwaRegistrationComplete = false;
    }

    try {
      window._pwaRegistrationInProgress = true;
      logPWAInfo("[PWA] Starting service worker registration...");

      // Check for existing main registration first
      let registration = await navigator.serviceWorker.getRegistration("/");

      if (registration?.active) {
        logPWAInfo(
          "[PWA] MemoSpark Service Worker already registered and active:",
          registration.scope,
        );
        setIsRegistered(true);
        window._pwaRegistrationComplete = true;

        // Check if there's a waiting worker
        if (registration.waiting) {
          logPWAInfo("[PWA] Service Worker waiting for activation");
          setHasUpdate(true);
        }

        // Try to update existing registration
        try {
          await registration.update();
          logPWAInfo("[PWA] Service worker update check completed");
        } catch (updateError) {
          console.warn("[PWA] Service worker update failed:", updateError);
        }

        return; // Exit early if already registered
      }

      // Only cleanup if no active main service worker exists
      if (!registration || !registration.active) {
        await cleanupServiceWorkers();

        // Wait a bit for cleanup to complete
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      // Register the new service worker
      logPWAInfo("[PWA] Registering new MemoSpark service worker...");
      registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      });
      logPWAInfo(
        "[PWA] MemoSpark Service Worker registered successfully:",
        registration.scope,
      );

      setIsRegistered(true);
      window._pwaRegistrationComplete = true;

      // Handle service worker state changes
      const handleServiceWorkerState = (worker: ServiceWorker) => {
        worker.addEventListener("statechange", () => {
          logPWAInfo("[PWA] Service Worker state changed:", worker.state);
          if (
            worker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            logPWAInfo("[PWA] New service worker installed, update available");
            setHasUpdate(true);
          }
          if (
            worker.state === "activated" &&
            !navigator.serviceWorker.controller
          ) {
            logPWAInfo("[PWA] Service worker activated for the first time");
          }
        });
      };

      // Check for updates
      registration.addEventListener("updatefound", () => {
        logPWAInfo("[PWA] Service Worker update found");
        const newWorker = registration.installing;
        if (newWorker) {
          handleServiceWorkerState(newWorker);
        }
      });

      // Handle initial installation
      if (registration.installing) {
        logPWAInfo("[PWA] Service worker installing...");
        handleServiceWorkerState(registration.installing);
      }

      // Check if there's already a waiting worker
      if (registration.waiting) {
        logPWAInfo("[PWA] Service Worker waiting for activation");
        setHasUpdate(true);
      }

      // Handle active service worker
      if (registration.active) {
        logPWAInfo("[PWA] Service worker is active");

        // Check version to see if we need to show update prompt
        try {
          const messageChannel = new MessageChannel();
          messageChannel.port1.onmessage = (event) => {
            const { version, app } = event.data;
            logPWAInfo(
              "[PWA] Current service worker version:",
              version,
              "for app:",
              app,
            );
          };

          registration.active.postMessage({ type: "GET_VERSION" }, [
            messageChannel.port2,
          ]);
        } catch (error) {
          logPWAInfo("[PWA] Could not check service worker version:", error);
        }
      }

      // Handle controller changes and messages - only set up once globally
      if (!window._pwaSWListenerAdded) {
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          logPWAInfo("[PWA] Service Worker controller changed");
          setHasUpdate(false);
          // Don't auto-reload here - let the user decide
        });

        // Listen for messages from service worker - only set up once
        navigator.serviceWorker.addEventListener("message", (event) => {
          const { data } = event;
          if (data && data.type === "SW_UPDATED") {
            logPWAInfo("[PWA] Service worker reports it has been updated");
            setHasUpdate(true);
          } else if (data && data.type === "SW_ACTIVATED") {
            logPWAInfo("[PWA] Service worker activated:", data);
            setIsRegistered(true);
          }
        });

        window._pwaSWListenerAdded = true;
        logPWAInfo("[PWA] Global service worker event listeners set up");
      }
    } catch (error) {
      console.error("[PWA] Service Worker registration failed:", error);
      setIsRegistered(false);
      window._pwaRegistrationComplete = false;
    } finally {
      window._pwaRegistrationInProgress = false;
    }
  }, [cleanupServiceWorkers]);

  // Check for updates
  const checkForUpdates = useCallback(async () => {
    if ("serviceWorker" in navigator) {
      try {
        logPWAInfo("[PWA] Checking for service worker updates...");
        const registration = await navigator.serviceWorker.getRegistration("/");
        if (registration) {
          await registration.update();
          logPWAInfo("[PWA] Update check completed");
        }
      } catch (error) {
        console.error("[PWA] Failed to check for updates:", error);
      }
    }
  }, []);

  // Get offline capabilities
  const getOfflineCapabilities = useCallback(async (): Promise<string[]> => {
    const capabilities: string[] = [];

    // Check cache API support
    if ("caches" in window) {
      capabilities.push("Static resource caching");

      try {
        const cacheNames = await caches.keys();
        if (cacheNames.length > 0) {
          capabilities.push("Cached content available");
        }
      } catch (error) {
        console.error("Error checking cache:", error);
      }
    }

    // Check IndexedDB support
    if ("indexedDB" in window) {
      capabilities.push("Local data storage");
    }

    // Check background sync support
    if (
      "serviceWorker" in navigator &&
      "sync" in window.ServiceWorkerRegistration.prototype
    ) {
      capabilities.push("Background synchronization");
    }

    // Check push notification support
    if ("serviceWorker" in navigator && "PushManager" in window) {
      capabilities.push("Push notifications");
    }

    // Check Web Share API
    if ("share" in navigator) {
      capabilities.push("Native sharing");
    }

    // Check fullscreen support
    if (document.fullscreenEnabled) {
      capabilities.push("Fullscreen mode");
    }

    return capabilities;
  }, []);

  // Auto-register service worker once per page load. Several components call usePWA().
  // Omit clearTimeout cleanup so React StrictMode's mount→unmount→remount cycle still completes registration once.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (
      _memoSparkPwaDeferredAutoRegisterQueued ||
      window._pwaRegistrationComplete
    ) {
      return;
    }

    _memoSparkPwaDeferredAutoRegisterQueued = true;

    window.setTimeout(() => {
      void registerServiceWorker();
    }, 800);
  }, [registerServiceWorker]);

  // Update isRegistered state based on actual registration status
  useEffect(() => {
    const checkRegistrationStatus = async () => {
      if ("serviceWorker" in navigator) {
        try {
          const registration =
            await navigator.serviceWorker.getRegistration("/");
          setIsRegistered(!!registration?.active);
        } catch (error) {
          console.warn("[PWA] Could not check registration status:", error);
          setIsRegistered(false);
        }
      }
    };

    // Check status on mount
    if (typeof window !== "undefined") {
      checkRegistrationStatus();
    }
  }, []);

  return {
    // State
    isOnline,
    isInstalled,
    canInstall,
    hasUpdate,
    isRegistered,
    os,

    // Actions
    install,
    update,
    registerServiceWorker,
    checkForUpdates,
    getOfflineCapabilities,
    updateServiceWorker: update,
  };
}
