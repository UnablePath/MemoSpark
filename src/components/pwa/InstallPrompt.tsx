"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { usePWA } from "@/hooks/usePWA";
import { cn } from "@/lib/utils";
import { ArrowDownToLine, Bell, Smartphone, Wifi, X, Zap } from "lucide-react";
import { usePathname } from "next/navigation";
import type React from "react";
import { useCallback, useEffect, useState } from "react";

const INSTALL_CORNER_PREF_KEY = "ms-pwa-install-prefer-corner";

// More accurate iOS Safari Share icon
const IOSSafariShareIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect
      x="3"
      y="11"
      width="18"
      height="10"
      rx="2"
      ry="2"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
    />
    <circle cx="12" cy="11" r="1" fill="currentColor" />
    <path
      d="M12 5L12 11M12 5L9 8M12 5L15 8"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Add to Home Screen icon
const AddToHomeIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect
      x="5"
      y="2"
      width="14"
      height="20"
      rx="2"
      ry="2"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
    />
    <path
      d="M12 8L12 16M8 12L16 12"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** Viewport chip: same lip affordance as SiteSupportReportCorner (stacked above it on the homepage). */
function InstallPWACornerChip({
  onExpand,
  label = "Install app",
}: {
  onExpand: () => void;
  label?: string;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none z-40 flex flex-col items-end justify-end gap-1.5",
        "fixed",
        /** Above SiteSupportReportCorner (~44px hit + gap + safe area) */
        "bottom-[calc(max(0.75rem,env(safe-area-inset-bottom,0px))+3.5rem)]",
        "end-[max(0.75rem,env(safe-area-inset-right,0px))]",
      )}
    >
      <button
        type="button"
        onClick={onExpand}
        className={cn(
          "group pointer-events-auto grid h-11 w-11 shrink-0 place-items-end bg-transparent p-0",
          "rounded-none outline-none ring-offset-background touch-manipulation",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        )}
        aria-haspopup="dialog"
        aria-label={label}
      >
        <span
          className={cn(
            "flex h-[29px] w-[31px] items-center justify-center",
            "border-y border-l border-border/55",
            "bg-muted/25 text-foreground backdrop-blur-md backdrop-saturate-150 supports-[backdrop-filter]:bg-muted/18",
            "shadow-[inset_-1px_0_0_0_hsl(var(--border)/0.35)]",
            "rounded-s-[10px] rounded-ee-none",
            "transition-[color,background-color,box-shadow,filter,border-color] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)]",
            "motion-reduce:transition-none motion-reduce:duration-75",
            "group-hover:border-border/80 group-hover:bg-muted/32",
            "group-active:bg-muted/35",
          )}
        >
          <ArrowDownToLine
            className="h-[15px] w-[15px] shrink-0 text-foreground drop-shadow-[0_1px_0_hsl(var(--background)/0.45)]"
            strokeWidth={2.25}
            aria-hidden
          />
        </span>
      </button>
    </div>
  );
}

export const InstallPrompt: React.FC = () => {
  const pathname = usePathname();
  const { os, canInstall, install, isInstalled } = usePWA();
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIOSHint, setShowIOSHint] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [preferCorner, setPreferCorner] = useState(false);

  const isHome = pathname === "/" || pathname === "";

  useEffect(() => {
    setPreferCorner(localStorage.getItem(INSTALL_CORNER_PREF_KEY) === "1");
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (isInstalled) {
      localStorage.removeItem(INSTALL_CORNER_PREF_KEY);
      setPreferCorner(false);
    }
  }, [isInstalled]);

  // iOS: delayed hint (unchanged logic)
  useEffect(() => {
    if (os !== "ios") return;
    if (typeof window === "undefined") return;
    const standalone = (
      window.navigator as Navigator & { standalone?: boolean }
    ).standalone;
    if (standalone) return;

    const timer = window.setTimeout(() => {
      const hasSeenHint = localStorage.getItem("hasSeenIOSInstallHint");
      if (!hasSeenHint) {
        setShowIOSHint(true);
      }
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [os]);

  // Chromium install card: show full card when installable and user has not chosen corner mode
  useEffect(() => {
    if (!hydrated) return;
    if (os === "ios") {
      setShowPrompt(false);
      return;
    }
    if (canInstall && !preferCorner && !isInstalled) {
      setShowPrompt(true);
    } else {
      setShowPrompt(false);
    }
  }, [hydrated, os, canInstall, preferCorner, isInstalled]);

  const handleDismissToCorner = useCallback(() => {
    try {
      localStorage.setItem(INSTALL_CORNER_PREF_KEY, "1");
    } catch {
      console.error(
        "[pwa:install-dismiss]",
        new Error("Could not persist install preference"),
      );
    }
    setPreferCorner(true);
    setShowPrompt(false);
  }, []);

  const handleExpandFromCorner = useCallback(() => {
    try {
      localStorage.removeItem(INSTALL_CORNER_PREF_KEY);
    } catch {
      console.error(
        "[pwa:install-expand]",
        new Error("Could not clear install preference"),
      );
    }
    setPreferCorner(false);
  }, []);

  const handleCloseIOSHint = () => {
    localStorage.setItem("hasSeenIOSInstallHint", "true");
    setShowIOSHint(false);
  };

  const handleInstallClick = async () => {
    await install();
    setShowPrompt(false);
  };

  const showHomeInstallChip =
    hydrated &&
    isHome &&
    os !== "ios" &&
    canInstall &&
    !isInstalled &&
    preferCorner;

  if (showIOSHint) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm sm:items-center">
        <div className="max-h-[90vh] w-full max-w-md overflow-y-auto sm:max-h-[80vh]">
          <Card className="mx-auto border-0 bg-white shadow-2xl">
            <CardHeader className="relative pb-4 text-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCloseIOSHint}
                className="absolute top-2 right-2 z-10 text-gray-400 hover:text-gray-600"
                aria-label="Close install instructions"
              >
                <X className="h-5 w-5" />
              </Button>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600">
                <Smartphone className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="pr-8 text-xl font-bold text-gray-900">
                Install MemoSpark App
              </CardTitle>
              <CardDescription className="mt-2 text-gray-600">
                Get the full app experience on your iPhone!
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 pb-6">
              <div className="rounded-lg bg-blue-50 p-3">
                <h4 className="mb-2 text-sm font-semibold text-blue-900">
                  Why install the app?
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center space-x-1 text-blue-800">
                    <Zap className="h-3 w-3" />
                    <span>Faster loading</span>
                  </div>
                  <div className="flex items-center space-x-1 text-blue-800">
                    <Bell className="h-3 w-3" />
                    <span>Push notifications</span>
                  </div>
                  <div className="flex items-center space-x-1 text-blue-800">
                    <Wifi className="h-3 w-3" />
                    <span>Works offline</span>
                  </div>
                  <div className="flex items-center space-x-1 text-blue-800">
                    <Smartphone className="h-3 w-3" />
                    <span>Home screen access</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-center text-sm font-semibold text-gray-900">
                  Easy Installation in 2 Steps:
                </h4>

                <div className="rounded-lg border border-green-200 bg-gradient-to-r from-green-50 to-green-100 p-3">
                  <div className="flex items-start space-x-2">
                    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-green-500 text-xs font-bold text-white">
                      1
                    </div>
                    <div className="flex-1">
                      <p className="mb-1 text-sm font-medium text-green-900">
                        Tap the Share button
                      </p>
                      <div className="flex items-center space-x-1 text-green-800">
                        <span className="text-xs">
                          Look for this icon at the bottom of Safari:
                        </span>
                        <div className="rounded border border-green-300 bg-white p-1">
                          <IOSSafariShareIcon />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-purple-200 bg-gradient-to-r from-purple-50 to-purple-100 p-3">
                  <div className="flex items-start space-x-2">
                    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-purple-500 text-xs font-bold text-white">
                      2
                    </div>
                    <div className="flex-1">
                      <p className="mb-1 text-sm font-medium text-purple-900">
                        Select &quot;Add to Home Screen&quot;
                      </p>
                      <div className="flex flex-wrap items-center space-x-1 text-purple-800">
                        <span className="text-xs">
                          Scroll down and look for:
                        </span>
                        <div className="flex items-center space-x-1 rounded border border-purple-300 bg-white p-1">
                          <AddToHomeIcon />
                          <span className="text-xs font-medium">
                            Add to Home Screen
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-2">
                <div className="flex items-center space-x-2 text-amber-800">
                  <div className="h-4 w-4 text-amber-500">💡</div>
                  <p className="text-xs font-medium">
                    Tip: The share button is usually in the bottom toolbar of
                    Safari
                  </p>
                </div>
              </div>

              <div className="flex space-x-2 pt-2">
                <Button
                  variant="outline"
                  onClick={handleCloseIOSHint}
                  className="flex-1 text-sm"
                  size="sm"
                >
                  Maybe Later
                </Button>
                <Button
                  onClick={handleCloseIOSHint}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-sm hover:from-blue-600 hover:to-purple-700"
                  size="sm"
                >
                  Got It!
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <>
      {showPrompt && (
        <div className="fixed right-4 bottom-4 z-50 max-w-[calc(100vw-2rem)]">
          <Card className="max-w-sm border-border bg-background/90 shadow-lg backdrop-blur-sm">
            <CardHeader className="relative gap-1 pr-10">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleDismissToCorner}
                className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
                aria-label="Close install prompt"
              >
                <X className="h-5 w-5" />
              </Button>
              <CardTitle>Install MemoSpark</CardTitle>
              <CardDescription>Get the full app experience.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleInstallClick} className="w-full">
                <ArrowDownToLine className="mr-2 h-4 w-4" />
                Install App
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
      {showHomeInstallChip ? (
        <InstallPWACornerChip
          onExpand={handleExpandFromCorner}
          label="Show install MemoSpark"
        />
      ) : null}
    </>
  );
};
