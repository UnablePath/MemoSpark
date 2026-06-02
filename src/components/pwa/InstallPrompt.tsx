"use client";

import { Button } from "@/components/ui/button";
import { usePWA } from "@/hooks/usePWA";
import { cn } from "@/lib/utils";
import {
  ArrowDownToLine,
  Bell,
  ChevronDown,
  Smartphone,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import type React from "react";
import { useCallback, useEffect, useState } from "react";

const INSTALL_CORNER_PREF_KEY = "ms-pwa-install-prefer-corner";
const IOS_INSTALL_DELAY_MS = 15000;
const CHROMIUM_INSTALL_DELAY_MS = 20000;

const IOSSafariShareIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
  >
    <rect
      x="3"
      y="11"
      width="18"
      height="10"
      rx="2"
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

const AddToHomeIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
  >
    <rect
      x="5"
      y="2"
      width="14"
      height="20"
      rx="2"
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

interface InstallSheetShellProps {
  onClose: () => void;
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

function InstallSheetShell({
  onClose,
  title,
  description,
  children,
  footer,
}: InstallSheetShellProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/65 backdrop-blur-md sm:items-center sm:justify-center sm:p-6"
      role="presentation"
    >
      <motion.button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Dismiss install prompt"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      <motion.div
        role="region"
        aria-labelledby="install-prompt-title"
        aria-describedby="install-prompt-description"
        initial={{ y: "100%", opacity: 0.6 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 36 }}
        className={cn(
          "relative z-10 w-full max-w-lg overflow-hidden",
          "rounded-t-2xl border border-white/10 bg-[#0c0e13]/95 shadow-2xl",
          "pb-[max(1rem,env(safe-area-inset-bottom,0px))]",
          "sm:rounded-2xl sm:pb-0",
        )}
      >
        <div
          className="mx-auto mt-2 mb-1 h-1 w-10 rounded-full bg-white/20 sm:hidden"
          aria-hidden
        />
        <div className="border-b border-white/8 px-5 pb-4 pt-3 sm:px-6 sm:pt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
                <Smartphone className="h-6 w-6 text-primary" aria-hidden />
              </div>
              <h2
                id="install-prompt-title"
                className="text-lg font-semibold tracking-tight text-white sm:text-xl"
              >
                {title}
              </h2>
              <p
                id="install-prompt-description"
                className="mt-1.5 max-w-prose text-sm leading-relaxed text-white/65"
              >
                {description}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-11 w-11 shrink-0 rounded-full text-white/55 hover:bg-white/8 hover:text-white"
              aria-label="Close install prompt"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <div className="space-y-4 px-5 py-4 sm:px-6 sm:py-5">{children}</div>
        {footer ? (
          <div className="border-t border-white/8 px-5 py-4 sm:px-6">{footer}</div>
        ) : null}
        <motion.div
          className="pointer-events-none absolute -bottom-1 left-1/2 hidden -translate-x-1/2 sm:flex"
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          aria-hidden
        >
          <ChevronDown className="h-5 w-5 text-primary/80" />
        </motion.div>
      </motion.div>
    </div>
  );
}

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

const installFeatures = [
  { icon: Zap, label: "Faster loading" },
  { icon: Bell, label: "Push notifications" },
  { icon: Wifi, label: "Works offline" },
  { icon: Smartphone, label: "Home screen access" },
] as const;

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
    }, IOS_INSTALL_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [os]);

  useEffect(() => {
    if (!hydrated) return;
    if (os === "ios") {
      setShowPrompt(false);
      return;
    }
    if (!canInstall || preferCorner || isInstalled) {
      setShowPrompt(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setShowPrompt(true);
    }, CHROMIUM_INSTALL_DELAY_MS);

    return () => window.clearTimeout(timer);
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

  return (
    <>
      <AnimatePresence>
        {showIOSHint ? (
          <InstallSheetShell
            key="ios-install"
            onClose={handleCloseIOSHint}
            title="Install MemoSpark"
            description="Add MemoSpark to your home screen for the full app experience on iPhone."
            footer={
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseIOSHint}
                  className="h-11 border-white/15 bg-transparent text-white/80 hover:bg-white/8 hover:text-white"
                >
                  Maybe later
                </Button>
                <Button
                  type="button"
                  onClick={handleCloseIOSHint}
                  className="h-11 bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  Got it
                </Button>
              </div>
            }
          >
            <ul className="grid grid-cols-2 gap-2">
              {installFeatures.map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/[0.04] px-3 py-2.5 text-xs text-white/75"
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                  {label}
                </li>
              ))}
            </ul>

            <p className="text-xs font-medium uppercase tracking-wider text-white/45">
              Two steps
            </p>

            <ol className="space-y-3">
              <li className="rounded-xl border border-primary/25 bg-primary/[0.08] p-3.5">
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    1
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white">Tap Share in Safari</p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/60">
                      Bottom toolbar
                      <span className="inline-flex rounded-md border border-white/15 bg-white/5 p-1.5 text-white">
                        <IOSSafariShareIcon />
                      </span>
                    </p>
                  </div>
                </div>
              </li>
              <li className="rounded-xl border border-white/10 bg-white/[0.04] p-3.5">
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-bold text-white">
                    2
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white">Add to Home Screen</p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/60">
                      In the share menu
                      <span className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2 py-1 text-white">
                        <AddToHomeIcon />
                        <span className="font-medium">Add to Home Screen</span>
                      </span>
                    </p>
                  </div>
                </div>
              </li>
            </ol>

            <p className="text-center text-xs text-white/50">
              The share button is usually in Safari&apos;s bottom toolbar.
            </p>
          </InstallSheetShell>
        ) : null}

        {showPrompt ? (
          <InstallSheetShell
            key="chromium-install"
            onClose={handleDismissToCorner}
            title="Install MemoSpark"
            description="Install the app for faster access, offline support, and notifications."
            footer={
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  onClick={handleInstallClick}
                  className="h-12 w-full bg-primary text-base font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  <ArrowDownToLine className="mr-2 h-4 w-4" aria-hidden />
                  Install app
                </Button>
                <button
                  type="button"
                  onClick={handleDismissToCorner}
                  className="text-center text-xs text-white/45 underline-offset-4 hover:text-white/65 hover:underline"
                >
                  Minimize to corner
                </button>
              </div>
            }
          >
            <ul className="grid grid-cols-2 gap-2">
              {installFeatures.map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/[0.04] px-3 py-2.5 text-sm text-white/75"
                >
                  <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  {label}
                </li>
              ))}
            </ul>
          </InstallSheetShell>
        ) : null}
      </AnimatePresence>

      {showHomeInstallChip ? (
        <InstallPWACornerChip
          onExpand={handleExpandFromCorner}
          label="Show install MemoSpark"
        />
      ) : null}
    </>
  );
};
