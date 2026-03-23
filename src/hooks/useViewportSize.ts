'use client';

import { useState, useEffect, useLayoutEffect, useCallback } from 'react';

export interface ViewportSize {
  width: number;
  height: number;
}

/**
 * Live window / visual viewport dimensions (updates on resize + orientation).
 * Uses `visualViewport` when present so mobile browser chrome is reflected more accurately.
 */
export function useViewportSize(): ViewportSize & { ready: boolean } {
  const readSize = useCallback((): ViewportSize => {
    if (typeof window === 'undefined') {
      return { width: 0, height: 0 };
    }
    const vv = window.visualViewport;
    if (vv) {
      return { width: Math.round(vv.width), height: Math.round(vv.height) };
    }
    return { width: window.innerWidth, height: window.innerHeight };
  }, []);

  const [size, setSize] = useState<ViewportSize>({ width: 0, height: 0 });
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    setSize(readSize());
    setReady(true);
  }, [readSize]);

  useEffect(() => {
    const update = () => setSize(readSize());

    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);

    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', update);
      vv.addEventListener('scroll', update);
    }

    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      if (vv) {
        vv.removeEventListener('resize', update);
        vv.removeEventListener('scroll', update);
      }
    };
  }, [readSize]);

  return { ...size, ready };
}

/** Minimum size before embedding another app route in an iframe (tablet+; phones use full-page CTA). */
export const HUB_EMBED_MIN_WIDTH = 640;
export const HUB_EMBED_MIN_HEIGHT = 440;

export function shouldEmbedHubRoute(width: number, height: number): boolean {
  if (width <= 0 || height <= 0) return false;
  return width >= HUB_EMBED_MIN_WIDTH && height >= HUB_EMBED_MIN_HEIGHT;
}
