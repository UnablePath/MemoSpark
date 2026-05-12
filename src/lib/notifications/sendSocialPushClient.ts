export async function enqueueSocialPushNotification(payload: {
  recipientUserId: string;
  title: string;
  body: string;
  url?: string;
  sourceType?: string;
}): Promise<void> {
  try {
    await fetch("/api/push/event", {
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
  } catch (err: unknown) {
    console.error("[social:enqueue_push]", err);
  }
}
