'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getSafeStorage } from '@/lib/safe-storage';

export interface AssignedVariant {
  key: string;
  name: string;
  config?: Record<string, unknown>;
}

interface AssignmentResponse {
  success: boolean;
  assignment?: {
    experimentKey: string;
    variant: AssignedVariant | null;
    subjectKey: string;
    assignmentId?: string;
    source?: string;
  };
}

const EXPERIMENT_CACHE_PREFIX = 'memospark_experiment_assignment';

function cacheKey(experimentKey: string): string {
  return `${EXPERIMENT_CACHE_PREFIX}:${experimentKey}`;
}

function loadCachedAssignment(experimentKey: string): AssignedVariant | null {
  const storage = getSafeStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(cacheKey(experimentKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { variant?: AssignedVariant };
    return parsed.variant || null;
  } catch {
    return null;
  }
}

function saveCachedAssignment(experimentKey: string, variant: AssignedVariant | null) {
  const storage = getSafeStorage();
  if (!storage) return;
  storage.setItem(cacheKey(experimentKey), JSON.stringify({ variant, savedAt: Date.now() }));
}

export function useExperiment(experimentKey: string) {
  const [variant, setVariant] = useState<AssignedVariant | null>(() => loadCachedAssignment(experimentKey));
  const [ready, setReady] = useState<boolean>(variant !== null);

  useEffect(() => {
    let cancelled = false;

    const assign = async () => {
      try {
        const response = await fetch('/api/analytics/experiments/assign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            experimentKey,
            context: {
              page: window.location.pathname,
              userAgent: navigator.userAgent,
            },
          }),
        });

        const data = (await response.json()) as AssignmentResponse;
        if (cancelled) return;

        const assignedVariant = data.assignment?.variant || null;
        setVariant(assignedVariant);
        setReady(true);
        saveCachedAssignment(experimentKey, assignedVariant);
      } catch (error) {
        console.warn('Experiment assignment request failed:', error);
        setReady(true);
      }
    };

    assign();
    return () => {
      cancelled = true;
    };
  }, [experimentKey]);

  const trackExposure = useCallback(
    async (page: string, metadata?: Record<string, unknown>) => {
      if (!variant) return;
      const exposureKey = `${experimentKey}:${variant.key}:${page}`;
      try {
        await fetch('/api/analytics/experiments/exposure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            experimentKey,
            variantKey: variant.key,
            exposureKey,
            page,
            metadata: metadata || {},
          }),
        });
      } catch (error) {
        console.warn('Exposure tracking failed:', error);
      }
    },
    [experimentKey, variant]
  );

  const trackConversion = useCallback(
    async (conversionType: string, options?: { value?: number; currency?: string; metadata?: Record<string, unknown> }) => {
      if (!variant) return;
      try {
        await fetch('/api/analytics/experiments/conversion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            experimentKey,
            variantKey: variant.key,
            conversionType,
            value: options?.value,
            currency: options?.currency,
            metadata: options?.metadata || {},
          }),
        });
      } catch (error) {
        console.warn('Experiment conversion tracking failed:', error);
      }
    },
    [experimentKey, variant]
  );

  const config = useMemo(() => variant?.config || {}, [variant]);

  return {
    ready,
    variant,
    config,
    trackExposure,
    trackConversion,
  };
}
