/**
 * True for Safari (macOS/iOS), excluding Chromium-based browsers that include "Safari" in UA.
 */
export function isSafariBrowser(userAgent: string, platform?: string, maxTouchPoints?: number): boolean {
  const isIOS =
    /iPad|iPhone|iPod/i.test(userAgent) ||
    (platform === 'MacIntel' && (maxTouchPoints ?? 0) > 1);

  const isSafariUA =
    /Safari/i.test(userAgent) &&
    !/Chrome|Chromium|CriOS|FxiOS|EdgiOS|Edg|OPR|Android/i.test(userAgent);

  const isWebKitIOS =
    isIOS && !/CriOS|FxiOS|EdgiOS/i.test(userAgent);

  return isSafariUA || isWebKitIOS;
}

export function isSafariBrowserClient(): boolean {
  if (typeof navigator === 'undefined') return false;
  return isSafariBrowser(
    navigator.userAgent,
    navigator.platform,
    navigator.maxTouchPoints,
  );
}
