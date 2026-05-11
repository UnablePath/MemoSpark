/**
 * OneSignal Web SDK v16+ Page SDK resolves through `window.OneSignalDeferred`.
 * MemoSpark must enqueue a callback instead of polling `window.OneSignal` —
 * documented in OneSignal Web SDK reference (Page SDK lifecycle).
 */

declare global {
  interface Window {
    OneSignalDeferred?: Array<(oneSignalSdk: unknown) => void | Promise<void>>;
    /** Present on some builds after init completes — used when callbacks ran before React subscribed. */
    OneSignal?: unknown;
  }
}

function tryReadMountedOneSignalPageSdk(): unknown | undefined {
  const sdk = window.OneSignal;
  if (!sdk || typeof sdk !== "object") return undefined;
  const o = sdk as Record<string, unknown>;
  return "User" in o && "Notifications" in o ? sdk : undefined;
}

/** Default matches provider + service timeouts (slow networks). */
const DEFAULT_SDK_TIMEOUT_MS = 20_000;

let memoSparkOneSignalPageSdkSingleton: Promise<unknown> | null = null;

export function resetOneSignalPageSdkSingleton(): void {
  memoSparkOneSignalPageSdkSingleton = null;
}

/**
 * Resolve the deferred Page SDK instance once per page lifecycle.
 * On timeout, clears the singleton so a later retry can enqueue again (e.g. flaky CDN).
 */
export function getOneSignalPageSdk(
  timeoutMs = DEFAULT_SDK_TIMEOUT_MS,
): Promise<unknown> {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("OneSignal Page SDK is unavailable in non-browser contexts"),
    );
  }

  const alreadyMounted = tryReadMountedOneSignalPageSdk();
  if (alreadyMounted != null) {
    return Promise.resolve(alreadyMounted);
  }

  memoSparkOneSignalPageSdkSingleton ??= new Promise((resolve, reject) => {
    let settled = false;

    const fail = (message: string) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutHandle);
      window.clearInterval(pollHandle);
      memoSparkOneSignalPageSdkSingleton = null;
      reject(new Error(message));
    };

    const succeed = (oneSignalSdk: unknown) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutHandle);
      window.clearInterval(pollHandle);
      resolve(oneSignalSdk);
    };

    const timeoutHandle = window.setTimeout(() => {
      fail(`OneSignal Page SDK did not resolve within ${timeoutMs}ms`);
    }, timeoutMs);

    const pollHandle = window.setInterval(() => {
      const mounted = tryReadMountedOneSignalPageSdk();
      if (mounted != null) {
        succeed(mounted);
      }
    }, 50);

    window.OneSignalDeferred = window.OneSignalDeferred ?? [];
    window.OneSignalDeferred.push(async function memoSparkAwaitOneSignalPageSdk(
      oneSignalSdk: unknown,
    ) {
      succeed(oneSignalSdk);
    });
  });

  return memoSparkOneSignalPageSdkSingleton as Promise<unknown>;
}
