const EDGE_SCHEDULER_SUFFIX = "/functions/v1/push-scheduler";

/**
 * Invokes MemoSpark `push-scheduler` Edge (same payload as pg_cron).
 *
 * Secrets must stay server-only (`CRON_SECRET` ≠ `NEXT_PUBLIC_*`).
 *
 * **Call with `await`** after enqueueing notifications so serverless invocations
 * finish the POST before freezing — `after()` alone can drop pending IO on some hosts.
 *
 * Reads:
 * - `NEXT_PUBLIC_SUPABASE_URL` — project HTTPS origin (already used by server admin client).
 * - `SUPABASE_SERVICE_ROLE_KEY` — same value edge uses for Bearer (opaque `sb_secret_*` OK).
 * - `CRON_SECRET` — duplicate of Supabase Edge Function secret for scheduler auth.
 *
 * Hosted Supabase: `[functions.push-scheduler] verify_jwt = false` in `config.toml`
 * so the gateway accepts Bearer sb_secret_* (see push-deliver comment).
 */
export async function wakePushScheduler(): Promise<void> {
  const rawBase =
    typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string"
      ? process.env.NEXT_PUBLIC_SUPABASE_URL.trim()
      : "";
  const baseUrl = rawBase.replace(/\/+$/, "");
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  const cronSecret = process.env.CRON_SECRET?.trim() ?? "";

  if (!baseUrl || !serviceRole || !cronSecret) {
    console.error(
      "[notifications:wake_scheduler]",
      "missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or CRON_SECRET",
    );
    return;
  }

  const url = `${baseUrl}${EDGE_SCHEDULER_SUFFIX}`;

  try {
    const controller = new AbortController();
    const timeoutId = globalThis.setTimeout(() => controller.abort(), 12_000);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceRole}`,
        "Content-Type": "application/json",
        "x-cron-secret": cronSecret,
      },
      body: "{}",
      signal: controller.signal,
    });

    globalThis.clearTimeout(timeoutId);

    if (!res.ok) {
      const snippet = await res.text().catch(() => "");
      console.error(
        "[notifications:wake_scheduler]",
        String(res.status),
        snippet.slice(0, 500),
      );
    }
  } catch (err: unknown) {
    console.error("[notifications:wake_scheduler]", err);
  }
}
