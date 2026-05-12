/**
 * Typed result for enqueueing a social-category push via `/api/push/event`.
 */

export type SocialPushEnqueueOk = { ok: true };

export type SocialPushEnqueueErr = {
  ok: false;
  /** HTTP status, or `0` for network/client abort (no HTTP response). */
  status: number;
  /** MemoSpark-facing copy suitable for toast or inline UI — never raw API internals. */
  message: string;
};

export type SocialPushEnqueueResult =
  | SocialPushEnqueueOk
  | SocialPushEnqueueErr;

function extractErrorFromPushEventBody(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return undefined;
    }
    const err = (parsed as { error?: unknown }).error;
    return typeof err === "string" && err.trim().length > 0
      ? err.trim()
      : undefined;
  } catch {
    return undefined;
  }
}

function fallbackSocialPushMessage(status: number): string {
  if (status === 401) {
    return "Message couldn't send. Sign in again and try once more.";
  }
  if (status === 403) {
    return "Message couldn't send. Connect with them or share a private study group first.";
  }
  if (status === 429) {
    return "Too many notification requests right now. Wait a moment and try again.";
  }
  if (status === 413) {
    return "That notification payload is too large. Shorten it and try again.";
  }
  if (status >= 500 && status <= 599) {
    return "Couldn't queue notification. Try again in a moment.";
  }
  if (status > 0) {
    return "Message couldn't send. Check your connection.";
  }
  return "Message couldn't send. Check your connection.";
}

function resolveSocialPushFailureMessage(
  status: number,
  bodyText: string,
): string {
  return (
    extractErrorFromPushEventBody(bodyText) ?? fallbackSocialPushMessage(status)
  );
}

/**
 * Enqueues a push notification for `category: "social"` (same-origin, Clerk cookie).
 *
 * Inspect `result.ok`; on failure show `result.message` (toast or banner).
 */
export async function enqueueSocialPushNotification(payload: {
  recipientUserId: string;
  title: string;
  body: string;
  url?: string;
  sourceType?: string;
}): Promise<SocialPushEnqueueResult> {
  try {
    const res = await fetch("/api/push/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        recipientUserId: payload.recipientUserId,
        category: "social",
        title: payload.title,
        body: payload.body,
        url: payload.url ?? "/home",
        sourceType: payload.sourceType ?? "social",
      }),
    });

    const bodyText = await res.text();
    const status = res.status;

    if (res.ok) {
      return { ok: true };
    }

    const message = resolveSocialPushFailureMessage(status, bodyText);

    console.error("[social:enqueue_push]", {
      status,
      message,
      snippet: bodyText.slice(0, 200),
    });

    return { ok: false, status, message };
  } catch (err: unknown) {
    console.error("[social:enqueue_push]", err);
    const message =
      "Message couldn't send. Check your connection and try again.";
    return { ok: false, status: 0, message };
  }
}
