/**
 * Safe localStorage access for Next.js and Node environments.
 * Use this instead of global localStorage to avoid crashes when:
 * - Running on the server (SSR) where window/localStorage may be undefined
 * - Node is run with --localstorage-file (or similar) and exposes a broken Storage object
 */
export function getSafeStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    const s = window.localStorage;
    if (!s || typeof s.getItem !== 'function' || typeof s.setItem !== 'function') return null;
    return s;
  } catch {
    return null;
  }
}
