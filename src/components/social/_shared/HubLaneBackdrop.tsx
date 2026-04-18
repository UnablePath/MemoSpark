"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type React from "react";

type Lane = "discover" | "connect" | "groups";

/**
 * Lane-aware ambient backdrop for the Connections hub.
 *
 * - `connect`  → CRT brutalist scanlines + dot grid + hazard vignette
 * - `groups`   → Soft Structural diffused primary glow
 * - `discover` → nothing (card stack owns the surface)
 *
 * Rendered as a `fixed` overlay so it stays put during inner scroll,
 * with `pointer-events-none` so it never intercepts input.
 * Disabled under `prefers-reduced-motion` transitions (still renders, just no fade).
 */
export const HubLaneBackdrop: React.FC<{ lane: Lane }> = ({ lane }) => {
  const reduceMotion = useReducedMotion();
  const fade = reduceMotion
    ? { initial: false as const, animate: { opacity: 1 }, exit: { opacity: 1 } }
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      };

  return (
    <AnimatePresence mode="wait">
      {lane === "connect" ? (
        <motion.div
          key="connect-crt"
          aria-hidden
          className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
          {...fade}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `repeating-linear-gradient(
                0deg,
                transparent 0px,
                transparent 2px,
                hsl(var(--foreground) / 0.04) 2px,
                hsl(var(--foreground) / 0.04) 3px
              )`,
              mixBlendMode: "overlay",
            }}
          />
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: `radial-gradient(
                circle at 1px 1px,
                hsl(var(--foreground)) 1px,
                transparent 0
              )`,
              backgroundSize: "24px 24px",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(
                ellipse 80% 55% at 50% 0%,
                hsl(var(--destructive) / 0.05),
                transparent 60%
              )`,
            }}
          />
        </motion.div>
      ) : null}

      {lane === "groups" ? (
        <motion.div
          key="groups-glow"
          aria-hidden
          className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
          {...fade}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: `
                radial-gradient(ellipse 65% 50% at 18% 12%, hsl(var(--primary) / 0.10), transparent 60%),
                radial-gradient(ellipse 55% 45% at 85% 90%, hsl(var(--primary) / 0.06), transparent 60%)
              `,
            }}
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};
