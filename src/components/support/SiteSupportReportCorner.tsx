"use client";

import {
  MEMOSPARK_SUPPORT_EMAIL,
  createMemoSparkReportMailtoHref,
  openMemoSparkSupportMailHref,
} from "@/lib/support/memosparkSupportEmail";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export type SiteSupportReportCornerPlacement = "viewport" | "panel";

interface SiteSupportReportCornerProps {
  /**
   * `viewport`: fixed to the window (used outside /dashboard).
   * `panel`: absolute inside `#main-dashboard-content` tab scroll frame — lower-right above thumb nav chrome.
   */
  placement?: SiteSupportReportCornerPlacement;
}

export function SiteSupportReportCorner({
  placement = "viewport",
}: SiteSupportReportCornerProps) {
  const pathname = usePathname();
  const [panelOpen, setPanelOpen] = useState(false);
  const [reportDraft, setReportDraft] = useState("");

  const isPanelAnchored = placement === "panel";

  useEffect(() => {
    if (!panelOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPanelOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [panelOpen]);

  const handleEmailSupport = () => {
    const trimmed = reportDraft.trim();
    if (!trimmed) return;

    const firstLine =
      trimmed
        .split("\n")
        .map((s) => s.trim())
        .find(Boolean) ?? "Support request";

    const href = createMemoSparkReportMailtoHref({
      subjectDetail: firstLine.slice(0, 140),
      studentWrittenReport: trimmed,
      contextLines: [
        isPanelAnchored
          ? "Report source: Dashboard main panel (? tab)"
          : "Report source: Site edge help tab",
        ...(pathname.length > 0 ? [`App path: ${pathname}`] : []),
      ],
      pageUrl: typeof window !== "undefined" ? window.location.href : undefined,
    });

    try {
      openMemoSparkSupportMailHref(href);
      toast.success("Opening your email app…", {
        description: "Send the message when it looks right to you.",
      });
      setPanelOpen(false);
    } catch (err) {
      console.error("[support:mailto]", err);
      toast.error(
        "Could not open email from here. Try support@memospark.live in your mail app.",
      );
    }
  };

  return (
    <div
      className={cn(
        /** Below app modals (dialog overlay z-[10000]) and popovers (z-[10002+]); above normal page chrome. */
        "pointer-events-none z-40 flex flex-col items-end justify-end gap-1.5 pb-px",
        isPanelAnchored
          ? cn(
              "absolute",
              /** Flush to tab panel bottom + inline end so the lip meets the scroll track (above thumb nav; TabContainer excludes nav). */
              "bottom-0 end-0",
            )
          : cn(
              "fixed",
              "bottom-[max(0.75rem,env(safe-area-inset-bottom,0px))]",
              "end-[max(0.75rem,env(safe-area-inset-right,0px))]",
            ),
      )}
    >
      {panelOpen ? (
        <aside
          className={cn(
            "pointer-events-auto w-[min(100vw-1.25rem,22rem)] border border-border/80 bg-background/95 p-4 shadow-xl backdrop-blur-md",
            "rounded-2xl rounded-ee-xl",
          )}
          aria-labelledby="site-support-report-heading"
          id="ms-site-support-sheet"
        >
          <div className="flex items-start justify-between gap-2">
            <p
              id="site-support-report-heading"
              className="text-sm font-semibold leading-snug text-foreground"
            >
              Something wrong?
            </p>
            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              className="pointer-events-auto -mr-1 -mt-1 flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Close help panel"
            >
              <span
                className="text-lg leading-none text-foreground/80"
                aria-hidden
              >
                ×
              </span>
            </button>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Your mail app opens with a draft to {MEMOSPARK_SUPPORT_EMAIL}.
            Anything you write below goes in that email.
          </p>
          <textarea
            value={reportDraft}
            onChange={(e) => setReportDraft(e.target.value)}
            className="mt-3 min-h-[120px] w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-[15px] leading-normal text-foreground outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
            placeholder='e.g. "My course isn’t listed" or "this screen freezes"'
            maxLength={4000}
            aria-label="Details to include in email to support"
          />
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border px-4 text-sm font-medium text-foreground hover:bg-muted/50"
              onClick={() => setPanelOpen(false)}
            >
              Not now
            </button>
            <button
              type="button"
              className={cn(
                "inline-flex min-h-11 min-w-[11rem] items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground",
                !reportDraft.trim() && "pointer-events-none opacity-50",
              )}
              disabled={!reportDraft.trim()}
              onClick={handleEmailSupport}
            >
              Email support
            </button>
          </div>
        </aside>
      ) : (
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          className={cn(
            /** 44px hit target / thumb-safe; lip ~60% footprint of older 52×48 chip. */
            "group pointer-events-auto grid h-11 w-11 shrink-0 place-items-end bg-transparent p-0",
            "rounded-none outline-none ring-offset-background touch-manipulation",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          )}
          aria-expanded={false}
          aria-haspopup="dialog"
          aria-label="Help and email support"
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
            <span className="text-[12px] font-semibold tabular-nums leading-none tracking-tight text-foreground drop-shadow-[0_1px_0_hsl(var(--background)/0.45)]">
              ?
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
