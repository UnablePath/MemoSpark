"use client";

import {
  HOMEPAGE_CTA_EXPERIMENT_KEY,
  HOMEPAGE_CTA_VARIANT_COOKIE,
} from "@/lib/analytics/experimentRuntime";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef } from "react";

const EXPERIMENT_CACHE_PREFIX = "memospark_experiment_assignment";
const SIGNUP_COMPLETED_SESSION_KEY =
  "memospark_experiment_signup_completed_fired";

function readVariantKeyFromCookie(): string | undefined {
  if (typeof document === "undefined") {
    return;
  }
  const raw = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${HOMEPAGE_CTA_VARIANT_COOKIE}=`));
  if (!raw) {
    return;
  }
  const value = raw.slice(HOMEPAGE_CTA_VARIANT_COOKIE.length + 1);
  const decoded = decodeURIComponent(value).trim();
  return decoded.length > 0 ? decoded : undefined;
}

/**
 * After Clerk sign-up, attribute `sign_up_completed` to the same A/B variant the student
 * saw on the homepage. Uses localStorage from `useExperiment`, then the `ms_ab_hp_cta` cookie
 * set by `/api/analytics/experiments/assign` so attribution survives cleared storage.
 */
export function ExperimentSignupConversionBridge() {
  const { userId, isLoaded } = useAuth();
  const firedRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || !userId || firedRef.current) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    try {
      if (sessionStorage.getItem(SIGNUP_COMPLETED_SESSION_KEY) === "1") {
        return;
      }
    } catch {
      return;
    }

    let variantKey: string | undefined;
    try {
      const raw = localStorage.getItem(
        `${EXPERIMENT_CACHE_PREFIX}:${HOMEPAGE_CTA_EXPERIMENT_KEY}`,
      );
      if (raw) {
        const parsed = JSON.parse(raw) as { variant?: { key?: string } };
        variantKey = parsed.variant?.key;
      }
    } catch (err) {
      console.warn(
        "[analytics:experiment_signup_bridge] Could not read cached assignment",
        err,
      );
    }

    if (!variantKey) {
      variantKey = readVariantKeyFromCookie();
    }

    if (!variantKey) {
      return;
    }

    firedRef.current = true;

    void fetch("/api/analytics/experiments/conversion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        experimentKey: HOMEPAGE_CTA_EXPERIMENT_KEY,
        variantKey,
        conversionType: "sign_up_completed",
        metadata: { source: "experiment_signup_bridge" },
      }),
    })
      .then((res) => {
        if (res.ok) {
          try {
            sessionStorage.setItem(SIGNUP_COMPLETED_SESSION_KEY, "1");
          } catch {
            /* ignore quota */
          }
        }
      })
      .catch((err) => {
        console.error("[analytics:experiment_signup_bridge]", err);
        firedRef.current = false;
      });
  }, [isLoaded, userId]);

  return null;
}
