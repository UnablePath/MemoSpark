"use client";

import { cn } from "@/lib/utils";
import { Waveform } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "framer-motion";
import type React from "react";

/**
 * Placeholder activity feed while the real event stream is offline.
 * Styled as a tactical "STANDBY" panel with a live cursor blink.
 */
export const ActivityFeed: React.FC = () => {
  const reduceMotion = useReducedMotion();

  return (
    <section
      className={cn(
        "relative border border-border/70 bg-card/60",
        "shadow-[inset_0_1px_0_hsl(var(--foreground)/0.04)]",
      )}
    >
      <div className="flex items-center gap-2 border-b border-border/50 px-3 py-2 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground sm:px-4">
        <span aria-hidden>[</span>
        <Waveform className="h-3 w-3" weight="bold" />
        <span>FEED</span>
        <span aria-hidden>/</span>
        <span className="text-primary">STANDBY</span>
        <span aria-hidden>]</span>
        <span
          aria-hidden
          className="ml-auto flex-1 border-t border-dashed border-border/50"
        />
        <span className="tabular-nums">REV 2.6</span>
      </div>

      <div className="grid grid-cols-1 gap-0 sm:grid-cols-[auto_1fr]">
        <div className="hidden border-r border-border/40 p-4 sm:block">
          <div className="flex h-full flex-col justify-between">
            {Array.from({ length: 6 }).map((_, i) => (
              <span
                key={`scan-${
                  // biome-ignore lint/suspicious/noArrayIndexKey: decorative
                  i
                }`}
                aria-hidden
                className="block h-px w-6 bg-border/70"
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 px-4 py-8 sm:py-10">
          <div>
            <p className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-foreground/80">
              &lt; NO SIGNAL /&gt;
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Activity stream is offline. Check back once your connections start
              posting wins.
            </p>
          </div>

          <motion.span
            aria-hidden
            className="h-4 w-2 bg-primary"
            animate={reduceMotion ? undefined : { opacity: [1, 0.1, 1] }}
            transition={
              reduceMotion
                ? undefined
                : { duration: 1.1, repeat: Number.POSITIVE_INFINITY }
            }
          />
        </div>
      </div>
    </section>
  );
};
